/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitize text input by removing/escaping potentially dangerous characters
 * This helps prevent XSS attacks when the data is rendered in the UI
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Limit consecutive whitespace
    .replace(/\s+/g, ' ')
    // Remove potentially dangerous Unicode characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
}

/**
 * Sanitize HTML by escaping special characters
 * Use this for any user input that will be displayed as text
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Validate and sanitize URL
 * Only allows http:// and https:// protocols
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') {
    return null;
  }

  const trimmedUrl = url.trim();

  // Empty URLs are valid (optional fields)
  if (!trimmedUrl) {
    return null;
  }

  try {
    const parsed = new URL(trimmedUrl);

    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize player name with length limits
 */
export function sanitizePlayerName(name: string): string {
  const sanitized = sanitizeText(name);

  // Enforce length limits
  if (sanitized.length < 1 || sanitized.length > 100) {
    throw new Error('Player name must be between 1 and 100 characters');
  }

  return sanitized;
}

/**
 * Sanitize quiz metadata fields
 */
export function sanitizeQuizMetadata(metadata: {
  author: string;
  topic: string;
  league: string;
  description?: string;
}): {
  author: string;
  topic: string;
  league: string;
  description?: string;
} {
  return {
    author: sanitizeText(metadata.author).slice(0, 255),
    topic: sanitizeText(metadata.topic).slice(0, 255),
    league: sanitizeText(metadata.league).slice(0, 255),
    description: metadata.description
      ? sanitizeText(metadata.description).slice(0, 1000)
      : undefined,
  };
}

/**
 * Sanitize spoken answer with length limits
 */
export function sanitizeSpokenAnswer(answer: string): string {
  const sanitized = sanitizeText(answer);

  // Enforce reasonable length limit
  if (sanitized.length > 500) {
    return sanitized.slice(0, 500);
  }

  return sanitized;
}
