import * as XLSX from 'xlsx';

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
  let maxRound = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];

    if (!row || row.length === 0) continue;

    const roundNum = parseInt(String(row[columnIndices.round] || '0'));
    const playerNum = parseInt(String(row[columnIndices.player] || '0'));
    const question = String(row[columnIndices.question] || '').trim();
    const answer = String(row[columnIndices.answer] || '').trim();

    if (!question || !answer || !roundNum || !playerNum) {
      continue;
    }

    maxRound = Math.max(maxRound, roundNum);

    questions.push({
      roundNumber: roundNum,
      playerNumber: playerNum,
      question,
      questionImageUrl: columnIndices.questionImage !== -1
        ? String(row[columnIndices.questionImage] || '').trim() || undefined
        : undefined,
      answer,
      answerImageUrl: columnIndices.answerImage !== -1
        ? String(row[columnIndices.answerImage] || '').trim() || undefined
        : undefined,
      orderIndex: questions.length,
    });
  }

  return {
    questions,
    totalRounds: maxRound,
    totalQuestions: questions.length,
  };
}
