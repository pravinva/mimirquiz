import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { gameSessions, quizFiles, quizQuestions, auditLogs } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { getClientIp } from '@/lib/request-utils';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { rateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

const createGameSchema = z.object({
  quizFileId: z.number(),
  playerNames: z.array(z.string().min(1)).min(2).max(8),
});

export async function POST(req: NextRequest) {
  // Apply rate limiting: 20 game creations per hour
  const rateLimitResponse = await rateLimit(req, RATE_LIMIT_CONFIGS.GAME_CREATE);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = createGameSchema.parse(body);

    const quizFile = await db.query.quizFiles.findFirst({
      where: eq(quizFiles.id, validatedData.quizFileId),
    });

    if (!quizFile) {
      return NextResponse.json(
        { error: 'Quiz file not found' },
        { status: 404 }
      );
    }

    const questions = await db.query.quizQuestions.findMany({
      where: eq(quizQuestions.quizFileId, quizFile.id),
      orderBy: (questions, { asc }) => [asc(questions.orderIndex)],
    });

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'Quiz file has no questions' },
        { status: 400 }
      );
    }

    const initialScores: Record<string, number> = {};
    validatedData.playerNames.forEach(name => {
      initialScores[name] = 0;
    });

    const [session] = await db.insert(gameSessions).values({
      quizFileId: quizFile.id,
      hostId: parseInt(user.id),
      league: quizFile.league,
      topic: quizFile.topic,
      status: 'setup',
      playerIds: [],
      playerNames: validatedData.playerNames,
      scores: initialScores,
    }).returning();

    await db.insert(auditLogs).values({
      userId: parseInt(user.id),
      sessionId: session.id,
      action: 'create_game',
      entityType: 'game_session',
      entityId: session.id,
      ipAddress: getClientIp(req),
      details: {
        quizFileId: quizFile.id,
        playerCount: validatedData.playerNames.length,
        league: quizFile.league,
        topic: quizFile.topic,
      },
    });

    return NextResponse.json({
      session: {
        id: session.id,
        quizFileId: session.quizFileId,
        league: session.league,
        topic: session.topic,
        playerNames: session.playerNames,
        status: session.status,
      },
      questions: questions.map(q => ({
        id: q.id,
        roundNumber: q.roundNumber,
        playerNumber: q.playerNumber,
        question: q.question,
        questionImageUrl: q.questionImageUrl,
        answer: q.answer,
        answerImageUrl: q.answerImageUrl,
        orderIndex: q.orderIndex,
      })),
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create game error:', error);
    return NextResponse.json(
      { error: 'Failed to create game session' },
      { status: 500 }
    );
  }
}
