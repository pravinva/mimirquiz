import { NextRequest } from 'next/server';

/**
 * Extract the client IP address from the request
 * Handles various proxy headers used by Vercel and other platforms
 */
export function getClientIp(req: NextRequest): string | null {
  // Try various headers in order of preference
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'true-client-ip', // Cloudflare Enterprise
    'x-client-ip',
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (ip) {
        return ip;
      }
    }
  }

  // Fallback to connection remote address (may not be available in serverless)
  return null;
}
