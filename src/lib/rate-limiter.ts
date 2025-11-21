import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter for development
// For production, replace with Redis-based solution (e.g., @upstash/ratelimit)

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private storage: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.storage.entries()) {
      if (entry.resetAt < now) {
        this.storage.delete(key);
      }
    }
  }

  check(identifier: string, limit: number, windowMs: number): {
    success: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.storage.get(identifier);

    if (!entry || entry.resetAt < now) {
      // Create new entry
      this.storage.set(identifier, {
        count: 1,
        resetAt: now + windowMs,
      });

      return {
        success: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
      };
    }

    if (entry.count >= limit) {
      // Rate limit exceeded
      return {
        success: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.storage.set(identifier, entry);

    return {
      success: true,
      remaining: limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Singleton instance
const rateLimiter = new InMemoryRateLimiter();

export interface RateLimitConfig {
  limit: number;      // Max requests
  windowMs: number;   // Time window in milliseconds
}

// Preset configurations
export const RATE_LIMIT_CONFIGS = {
  // Strict limits for auth endpoints
  AUTH: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  REGISTER: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 requests per hour

  // Moderate limits for write operations
  UPLOAD: { limit: 10, windowMs: 60 * 60 * 1000 }, // 10 uploads per hour
  GAME_CREATE: { limit: 20, windowMs: 60 * 60 * 1000 }, // 20 games per hour
  SUBMIT_ANSWER: { limit: 100, windowMs: 60 * 1000 }, // 100 answers per minute

  // Generous limits for read operations
  READ: { limit: 100, windowMs: 60 * 1000 }, // 100 requests per minute
};

/**
 * Rate limiting middleware for API routes
 *
 * @param req - Next.js request object
 * @param config - Rate limit configuration (limit and time window)
 * @returns NextResponse if rate limit exceeded, null if allowed
 *
 * @example
 * ```typescript
 * export async function POST(req: NextRequest) {
 *   const rateLimitResponse = await rateLimit(req, RATE_LIMIT_CONFIGS.AUTH);
 *   if (rateLimitResponse) return rateLimitResponse;
 *
 *   // Process request...
 * }
 * ```
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  // Get identifier (IP address or user ID from session)
  const identifier = getIdentifier(req);

  if (!identifier) {
    // If we can't identify the user, allow the request but log warning
    console.warn('[RATE LIMITER] Unable to identify user for rate limiting');
    return null;
  }

  const result = rateLimiter.check(identifier, config.limit, config.windowMs);

  // Add rate limit headers to all responses
  const headers = {
    'X-RateLimit-Limit': config.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };

  if (!result.success) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      },
      {
        status: 429,
        headers: {
          ...headers,
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  // Rate limit check passed - return null to continue processing
  return null;
}

/**
 * Get unique identifier for rate limiting
 * Prefers user-specific identifier, falls back to IP address
 */
function getIdentifier(req: NextRequest): string | null {
  // Try to get IP address from various headers (works with proxies/load balancers)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback: try to get from connection
  // Note: This may not work in all environments (e.g., serverless)
  const url = new URL(req.url);
  return url.hostname || 'unknown';
}

// Export for cleanup in tests or server shutdown
export const getRateLimiter = () => rateLimiter;
