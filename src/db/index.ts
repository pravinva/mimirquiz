import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import { validateOrThrow } from '@/lib/env-validation';

// Validate all required environment variables on startup
validateOrThrow();

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
