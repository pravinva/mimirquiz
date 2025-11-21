import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { overruleEvents, playerAnswers, gameSessions, auditLogs } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { getClientIp } from '@/lib/request-utils';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const overruleSchema = z.object({
  questionId: z.number(),
  originalAnswerId: z.number(),
  challengerId: z.number(),
  challengerName: z.string(),
  claimType: z.string(),
  originalResult: z.enum(['correct', 'incorrect', 'passed', 'timeout']),
  newResult: z.enum(['correct', 'incorrect', 'passed', 'timeout']),
  pointsAdjustment: z.number(),
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
    const validatedData = overruleSchema.parse(body);

    const session = await db.query.gameSessions.findFirst({
      where: eq(gameSessions.id, sessionId),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Game session not found' },
        { status: 404 }
      );
    }

    // Verify the user is the host of the session
    if (session.hostId !== parseInt(user.id)) {
      return NextResponse.json(
        { error: 'Only the game host can record overrules' },
        { status: 403 }
      );
    }

    const [overrule] = await db.insert(overruleEvents).values({
      sessionId,
      questionId: validatedData.questionId,
      originalAnswerId: validatedData.originalAnswerId,
      challengerId: validatedData.challengerId,
      challengerName: validatedData.challengerName,
      claimType: validatedData.claimType,
      originalResult: validatedData.originalResult,
      newResult: validatedData.newResult,
      pointsAdjustment: validatedData.pointsAdjustment,
    }).returning();

    await db.update(playerAnswers)
      .set({ wasOverruled: true })
      .where(eq(playerAnswers.id, validatedData.originalAnswerId));

    await db.insert(auditLogs).values({
      sessionId,
      action: 'overrule',
      entityType: 'overrule_event',
      entityId: overrule.id,
      ipAddress: getClientIp(req),
      details: {
        questionId: validatedData.questionId,
        challengerName: validatedData.challengerName,
        claimType: validatedData.claimType,
        pointsAdjustment: validatedData.pointsAdjustment,
      },
    });

    return NextResponse.json({ overrule });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Overrule error:', error);
    return NextResponse.json(
      { error: 'Failed to record overrule' },
      { status: 500 }
    );
  }
}
