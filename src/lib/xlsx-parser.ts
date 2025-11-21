import * as XLSX from 'xlsx';
import { sanitizeText, sanitizeUrl } from './sanitization';

export interface QuizQuestion {
  roundNumber: number;
  playerNumber: number;
  question: string;
  questionImageUrl?: string;
  answer: string;
  answerImageUrl?: string;
  orderIndex: number;
}

export interface ParsedQuizData {
  questions: QuizQuestion[];
  totalRounds: number;
  totalQuestions: number;
  warnings: string[];
}

export interface QuizMetadata {
  author: string;
  topic: string;
  league: string;
  description?: string;
}

const REQUIRED_COLUMNS = [
  'round',
  'player',
  'question',
  'answer',
];

const COLUMN_MAPPINGS: Record<string, string[]> = {
  round: ['round', 'round number', 'round_number', 'roundnumber'],
  player: ['player', 'player number', 'player_number', 'playernumber'],
  question: ['question', 'q'],
  questionImage: ['question image', 'question_image', 'questionimage', 'question url', 'question_url'],
  answer: ['answer', 'a', 'ans'],
  answerImage: ['answer image', 'answer_image', 'answerimage', 'answer url', 'answer_url'],
};

function normalizeColumnName(column: string): string {
  return column.toLowerCase().trim();
}

function findColumn(headers: string[], possibleNames: string[]): number {
  const normalizedHeaders = headers.map(normalizeColumnName);

  for (const name of possibleNames) {
    const index = normalizedHeaders.indexOf(name);
    if (index !== -1) return index;
  }

  return -1;
}

export function validateXLSXStructure(file: ArrayBuffer): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    const workbook = XLSX.read(file, { type: 'array' });

    if (workbook.SheetNames.length === 0) {
      errors.push('No sheets found in the XLSX file');
      return { valid: false, errors };
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (data.length < 2) {
      errors.push('File must contain at least a header row and one data row');
      return { valid: false, errors };
    }

    const headers = data[0] as string[];

    const columnIndices = {
      round: findColumn(headers, COLUMN_MAPPINGS.round),
      player: findColumn(headers, COLUMN_MAPPINGS.player),
      question: findColumn(headers, COLUMN_MAPPINGS.question),
      answer: findColumn(headers, COLUMN_MAPPINGS.answer),
    };

    const missingColumns = REQUIRED_COLUMNS.filter(
      col => columnIndices[col as keyof typeof columnIndices] === -1
    );

    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    if (errors.length === 0 && data.length === 1) {
      errors.push('No quiz questions found in the file');
    }

  } catch (error) {
    errors.push(`Failed to parse XLSX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function parseXLSX(file: ArrayBuffer): ParsedQuizData {
  const workbook = XLSX.read(file, { type: 'array' });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  const headers = data[0] as string[];

  const columnIndices = {
    round: findColumn(headers, COLUMN_MAPPINGS.round),
    player: findColumn(headers, COLUMN_MAPPINGS.player),
    question: findColumn(headers, COLUMN_MAPPINGS.question),
    questionImage: findColumn(headers, COLUMN_MAPPINGS.questionImage),
    answer: findColumn(headers, COLUMN_MAPPINGS.answer),
    answerImage: findColumn(headers, COLUMN_MAPPINGS.answerImage),
  };

  const questions: QuizQuestion[] = [];
  const warnings: string[] = [];
  let maxRound = 0;
  let skippedRowCount = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 1; // Excel row number (1-indexed, +1 for header)

    if (!row || row.length === 0) {
      skippedRowCount++;
      continue;
    }

    const roundNum = parseInt(String(row[columnIndices.round] || '0'));
    const playerNum = parseInt(String(row[columnIndices.player] || '0'));
    const question = String(row[columnIndices.question] || '').trim();
    const answer = String(row[columnIndices.answer] || '').trim();

    // Track why rows are skipped
    if (!question || !answer || !roundNum || !playerNum) {
      const missing: string[] = [];
      if (!roundNum) missing.push('round');
      if (!playerNum) missing.push('player');
      if (!question) missing.push('question');
      if (!answer) missing.push('answer');

      warnings.push(`Row ${rowNumber}: Skipped due to missing ${missing.join(', ')}`);
      skippedRowCount++;
      continue;
    }

    maxRound = Math.max(maxRound, roundNum);

    // Validate and sanitize image URLs
    let questionImageUrl: string | undefined;
    let answerImageUrl: string | undefined;

    if (columnIndices.questionImage !== -1) {
      const rawQuestionUrl = String(row[columnIndices.questionImage] || '').trim();
      if (rawQuestionUrl) {
        const sanitizedUrl = sanitizeUrl(rawQuestionUrl);
        if (sanitizedUrl) {
          questionImageUrl = sanitizedUrl;
        } else {
          warnings.push(`Row ${rowNumber}: Invalid question image URL "${rawQuestionUrl}"`);
        }
      }
    }

    if (columnIndices.answerImage !== -1) {
      const rawAnswerUrl = String(row[columnIndices.answerImage] || '').trim();
      if (rawAnswerUrl) {
        const sanitizedUrl = sanitizeUrl(rawAnswerUrl);
        if (sanitizedUrl) {
          answerImageUrl = sanitizedUrl;
        } else {
          warnings.push(`Row ${rowNumber}: Invalid answer image URL "${rawAnswerUrl}"`);
        }
      }
    }

    // Sanitize text content
    questions.push({
      roundNumber: roundNum,
      playerNumber: playerNum,
      question: sanitizeText(question).slice(0, 1000),
      questionImageUrl,
      answer: sanitizeText(answer).slice(0, 500),
      answerImageUrl,
      orderIndex: questions.length,
    });
  }

  if (skippedRowCount > 0) {
    warnings.push(`Total rows skipped: ${skippedRowCount}`);
  }

  return {
    questions,
    totalRounds: maxRound,
    totalQuestions: questions.length,
    warnings,
  };
}
