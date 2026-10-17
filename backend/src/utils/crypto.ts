import { createHmac, timingSafeEqual } from 'crypto';

export const hmacSha256Hex = (secret: string, payload: string | Buffer): string =>
  createHmac('sha256', secret).update(payload).digest('hex');

/**
 * Constant-time comparison: a normal `===` stops at the first different character, which
 * leaks (through timing) how much of a forged signature was correct.
 */
export const safeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
