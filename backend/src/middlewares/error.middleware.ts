import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '@utils/ApiError';
import { HTTP_STATUS } from '@utils/constants';
import { logger } from '@config/logger';
import { env } from '@config/env';
import type { ApiErrorResponse } from '@types/common.types';

/**
 * Global error-handling middleware.
 * Must be registered LAST in the Express middleware chain.
 * Normalises all thrown errors into a consistent JSON response shape.
 */
export const errorMiddleware = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error('Error caught by global handler:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  // ── Zod validation error ──────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    err.errors.forEach((issue) => {
      const path = issue.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    });

    const response: ApiErrorResponse = {
      success: false,
      statusCode: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      message: 'Validation failed',
      errors,
    };
    res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json(response);
    return;
  }

  // ── Operational API error ─────────────────────────────────────────────────
  if (err instanceof ApiError) {
    const response: ApiErrorResponse = {
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
      ...(!env.isProduction && { stack: err.stack }),
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // ── Prisma unique constraint violation ────────────────────────────────────
  if (err.name === 'PrismaClientKnownRequestError') {
    const response: ApiErrorResponse = {
      success: false,
      statusCode: HTTP_STATUS.CONFLICT,
      message: 'A record with this data already exists',
    };
    res.status(HTTP_STATUS.CONFLICT).json(response);
    return;
  }

  // ── Unhandled / programming errors ───────────────────────────────────────
  const response: ApiErrorResponse = {
    success: false,
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: env.isProduction ? 'Internal server error' : err.message,
    ...(!env.isProduction && { stack: err.stack }),
  };
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
};
