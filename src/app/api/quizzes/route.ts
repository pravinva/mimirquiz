import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { quizFiles } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth-utils';
import { eq, desc, and, or, like } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const league = searchParams.get('league');
    const topic = searchParams.get('topic');
    const author = searchParams.get('author');
    const search = searchParams.get('search');

    let query = db.select().from(quizFiles);

    const conditions = [];

    if (league) {
      conditions.push(eq(quizFiles.league, league));
    }

    if (topic) {
      conditions.push(eq(quizFiles.topic, topic));
    }

    if (author) {
      conditions.push(eq(quizFiles.author, author));
    }

    if (search) {
      conditions.push(
        or(
          like(quizFiles.fileName, `%${search}%`),
          like(quizFiles.topic, `%${search}%`),
          like(quizFiles.author, `%${search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const quizzesList = await query.orderBy(desc(quizFiles.createdAt));

    return NextResponse.json({ quizzes: quizzesList });

  } catch (error) {
    console.error('Get quizzes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}
