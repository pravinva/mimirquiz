import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { rateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limiter';

// Public registration schema - role is NOT allowed for security
// Admin and league_admin users must be created by existing admins or via database
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

export async function POST(req: NextRequest) {
  // Apply rate limiting: 3 registration attempts per hour
  const rateLimitResponse = await rateLimit(req, RATE_LIMIT_CONFIGS.REGISTER);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(validatedData.password, 10);

    // Always assign 'player' role for public registration
    // Admin role assignment requires database access or protected admin endpoint
    const [newUser] = await db.insert(users).values({
      email: validatedData.email.toLowerCase(),
      name: validatedData.name,
      passwordHash,
      role: 'player',
    }).returning();

    return NextResponse.json(
      {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
