import rateLimit from 'express-rate-limit';
import { env } from '@config/env';

/** Slows down password guessing and signup spam: 20 attempts per IP per 10 minutes. */
export const authRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});
