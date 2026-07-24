import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import type { JwtPayload } from '@types/common.types';
import type { ITokenPair } from '@interfaces/jwt.interface';

/**
 * Generates a signed access/refresh token pair for a given JWT payload.
 */
export const generateTokens = (payload: JwtPayload): ITokenPair => {
  const { userId, email, role } = payload;
  const basePayload = { userId, email, role };

  const accessToken = jwt.sign(basePayload, env.jwt.secret, {
    expiresIn: env.jwt.accessExpiresIn,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign(basePayload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.secret) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
};
