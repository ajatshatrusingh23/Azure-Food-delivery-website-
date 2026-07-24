import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@utils/ApiError';

/**
 * Catch-all 404 handler.
 * Must be registered AFTER all application routes.
 */
export const notFoundMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
