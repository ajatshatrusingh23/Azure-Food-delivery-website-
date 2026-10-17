import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { ApiError } from '@utils/ApiError';

const fieldErrors = (error: ZodError): Record<string, string[]> => {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
};

/**
 * One place turns every error into the same JSON shape. Express 5 forwards rejected
 * promises from async handlers here automatically, so handlers need no try/catch.
 */
export const errorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  if (err instanceof ZodError) {
    res.status(422).json({ success: false, message: 'Validation failed', errors: fieldErrors(err) });
    return;
  }
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.code && { code: err.code }),
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A record with these details already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Resource not found' });
      return;
    }
  }
  // Malformed JSON body (thrown by express.json()).
  if (typeof err === 'object' && err !== null && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ success: false, message: 'Request body is not valid JSON' });
    return;
  }

  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err instanceof Error ? err : { err });
  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    ...(!env.isProduction && err instanceof Error && { detail: err.message }),
  });
};

export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
};
