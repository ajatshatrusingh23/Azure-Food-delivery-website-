import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@utils/generateTokens';
import { ApiError } from '@utils/ApiError';
import { COOKIE_NAMES, ERROR_MESSAGES } from '@utils/constants';
import type { AuthenticatedRequest, UserRole } from '@types/common.types';

/**
 * Verifies the JWT access token from either the Authorization header
 * or the httpOnly cookie. Attaches the decoded payload to req.user.
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN]) {
      token = req.cookies[COOKIE_NAMES.ACCESS_TOKEN] as string;
    }

    if (!token) {
      throw ApiError.unauthorized(ERROR_MESSAGES.UNAUTHORIZED);
    }

    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
      return;
    }
    next(ApiError.unauthorized(ERROR_MESSAGES.TOKEN_INVALID));
  }
};

/**
 * Role-based access control middleware factory.
 * Usage: authorize(UserRole.ADMIN, UserRole.RESTAURANT_OWNER)
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      next(ApiError.unauthorized());
      return;
    }

    if (!roles.includes(user.role)) {
      next(ApiError.forbidden(ERROR_MESSAGES.FORBIDDEN));
      return;
    }

    next();
  };
};
