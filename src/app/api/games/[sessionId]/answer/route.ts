import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { playerAnswers, gameSessions, auditLogs } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const answerSchema = z.object({
  questionId: z.number(),
  playerId: z.number(),
  playerName: z.string(),
  spokenAnswer: z.string(),
  result: z.enum(['correct', 'incorrect', 'passed', 'timeout']),
  isAddressed: z.boolean(),
  timeTaken: z.number(),
  attemptOrder: z.number(),
  pointsAwarded: z.number(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionId = parseInt(params.sessionId);
    const body = await req.json();
    const validatedData = answerSchema.parse(body);

    const session = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, sessionId),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Game session not found' },
        { status: 404 }
      );
    }

    const [answer] = await db.insert(playerAnswers).values({
      sessionId,
      questionId: validatedData.questionId,
      playerId: validatedData.playerId,
      playerName: validatedData.playerName,
      spokenAnswer: validatedData.spokenAnswer,
      result: validatedData.result,
      isAddressed: validatedData.isAddressed,
      timeTaken: validatedData.timeTaken,
      attemptOrder: validatedData.attemptOrder,
      pointsAwarded: validatedData.pointsAwarded,
    }).returning();

    await db.insert(auditLogs).values({
      sessionId,
      action: 'submit_answer',
      entityType: 'player_answer',
      entityId: answer.id,
      details: {
        questionId: validatedData.questionId,
        playerName: validatedData.playerName,
        result: validatedData.result,
        pointsAwarded: validatedData.pointsAwarded,
      },
    });

    return NextResponse.json({ answer });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Submit answer error:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
