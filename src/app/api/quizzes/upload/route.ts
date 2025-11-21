import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { quizFiles, quizQuestions, auditLogs } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { parseXLSX, validateXLSXStructure } from '@/lib/xlsx-parser';
import { sanitizeQuizMetadata } from '@/lib/sanitization';
import { getClientIp } from '@/lib/request-utils';
import { z } from 'zod';
import { rateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const metadataSchema = z.object({
  author: z.string().min(1, 'Author is required'),
  topic: z.string().min(1, 'Topic is required'),
  league: z.string().min(1, 'League is required'),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // Apply rate limiting: 10 uploads per hour
  const rateLimitResponse = await rateLimit(req, RATE_LIMIT_CONFIGS.UPLOAD);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'league_admin') {
      return NextResponse.json(
        { error: 'Only admins can upload quiz files' },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.xlsx', '.xls', '.tsv', '.csv', '.numbers'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return NextResponse.json(
        { error: 'Invalid file format. Supported formats: .xlsx, .xls, .tsv, .csv, .numbers' },
        { status: 400 }
      );
    }

    const validatedMetadata = metadataSchema.parse(metadata);

    // Sanitize metadata to prevent XSS
    const sanitizedMetadata = sanitizeQuizMetadata(validatedMetadata);

    const fileBuffer = await file.arrayBuffer();

    const validation = validateXLSXStructure(fileBuffer);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid file structure', details: validation.errors },
        { status: 400 }
      );
    }

    const parsedData = parseXLSX(fileBuffer);

    if (parsedData.totalQuestions === 0) {
      return NextResponse.json(
        { error: 'No valid questions found in the file' },
        { status: 400 }
      );
    }

    const blob = await put(
      `quizzes/${Date.now()}-${file.name}`,
      file,
      { access: 'public' }
    );

    const [quizFile] = await db.insert(quizFiles).values({
      fileName: file.name,
      fileUrl: blob.url,
      author: sanitizedMetadata.author,
      topic: sanitizedMetadata.topic,
      league: sanitizedMetadata.league,
      description: sanitizedMetadata.description,
      uploadedBy: parseInt(user.id),
      totalQuestions: parsedData.totalQuestions,
      totalRounds: parsedData.totalRounds,
    }).returning();

    const questionsToInsert = parsedData.questions.map(q => ({
      quizFileId: quizFile.id,
      roundNumber: q.roundNumber,
      playerNumber: q.playerNumber,
      question: q.question,
      questionImageUrl: q.questionImageUrl,
      answer: q.answer,
      answerImageUrl: q.answerImageUrl,
      orderIndex: q.orderIndex,
    }));

    await db.insert(quizQuestions).values(questionsToInsert);

    await db.insert(auditLogs).values({
      userId: parseInt(user.id),
      action: 'upload_quiz',
      entityType: 'quiz_file',
      entityId: quizFile.id,
      ipAddress: getClientIp(req),
      details: {
        fileName: file.name,
        totalQuestions: parsedData.totalQuestions,
        totalRounds: parsedData.totalRounds,
        author: sanitizedMetadata.author,
        topic: sanitizedMetadata.topic,
        league: sanitizedMetadata.league,
      },
    });

    return NextResponse.json({
      success: true,
      quizFile: {
        id: quizFile.id,
        fileName: quizFile.fileName,
        author: quizFile.author,
        topic: quizFile.topic,
        league: quizFile.league,
        totalQuestions: quizFile.totalQuestions,
        totalRounds: quizFile.totalRounds,
      },
      warnings: parsedData.warnings.length > 0 ? parsedData.warnings : undefined,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid metadata', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Quiz upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload quiz file' },
      { status: 500 }
    );
  }
}
