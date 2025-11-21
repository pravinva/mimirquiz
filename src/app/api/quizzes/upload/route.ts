import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { db } from '@/db';
import { quizFiles, quizQuestions, auditLogs } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { parseXLSX, validateXLSXStructure } from '@/lib/xlsx-parser';
import { z } from 'zod';

const metadataSchema = z.object({
  author: z.string().min(1, 'Author is required'),
  topic: z.string().min(1, 'Topic is required'),
  league: z.string().min(1, 'League is required'),
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
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

    const validatedMetadata = metadataSchema.parse(metadata);

    const fileBuffer = await file.arrayBuffer();

    const validation = validateXLSXStructure(fileBuffer);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Invalid XLSX file structure', details: validation.errors },
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
      author: validatedMetadata.author,
      topic: validatedMetadata.topic,
      league: validatedMetadata.league,
      description: validatedMetadata.description,
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
      details: {
        fileName: file.name,
        totalQuestions: parsedData.totalQuestions,
        totalRounds: parsedData.totalRounds,
        author: validatedMetadata.author,
        topic: validatedMetadata.topic,
        league: validatedMetadata.league,
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
