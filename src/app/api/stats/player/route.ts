import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { gameSessions, playerAnswers } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(user.id);

    // Query sessions where user is a participant
    // Using jsonb_array_elements to safely check array membership
    // The userId is parameterized to prevent SQL injection
    const sessions = await db
      .select({
        id: gameSessions.id,
        quizFileId: gameSessions.quizFileId,
        league: gameSessions.league,
        topic: gameSessions.topic,
        status: gameSessions.status,
        playerNames: gameSessions.playerNames,
        scores: gameSessions.scores,
        startedAt: gameSessions.startedAt,
        completedAt: gameSessions.completedAt,
      })
      .from(gameSessions)
      .where(
        sql`${gameSessions.playerIds}::jsonb @> ${sql`${JSON.stringify([userId])}`}::jsonb`
      );

    const answers = await db
      .select()
      .from(playerAnswers)
      .where(eq(playerAnswers.playerId, userId));

    const stats = {
      totalGames: sessions.length,
      totalAnswers: answers.length,
      correctAnswers: answers.filter((a) => a.result === 'correct').length,
      totalPoints: answers.reduce((sum, a) => sum + a.pointsAwarded, 0),
      averagePoints:
        sessions.length > 0
          ? answers.reduce((sum, a) => sum + a.pointsAwarded, 0) / sessions.length
          : 0,
    };

    return NextResponse.json({
      stats,
      recentSessions: sessions.slice(0, 10),
    });
  } catch (error) {
    console.error('Get player stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player stats' },
      { status: 500 }
    );
  }
}
