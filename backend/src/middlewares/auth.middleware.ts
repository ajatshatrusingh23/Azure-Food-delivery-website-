import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { ApiError } from '@utils/ApiError';
import { COOKIES } from '@utils/constants';
import { verifyAccessToken } from '@utils/tokens';

const readToken = (req: Request): string | undefined => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return req.cookies?.[COOKIES.ACCESS_TOKEN] as string | undefined;
};

/** Requires a valid access token (httpOnly cookie for browsers, Bearer header for API clients). */
export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const token = readToken(req);
  if (!token) return next(ApiError.unauthorized());
  try {
    const claims = verifyAccessToken(token);
    req.user = { id: claims.sub, email: claims.email, role: claims.role };
    next();
  } catch {
    next(new ApiError(401, 'Access token is invalid or expired', undefined, 'token_expired'));
  }
};

/** Role-based access control: `authorize('ADMIN')`, `authorize('RESTAURANT_OWNER', 'ADMIN')`. */
export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };

/** For handlers behind `authenticate`: returns the caller or throws. */
export const currentUser = (req: Request) => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
};
