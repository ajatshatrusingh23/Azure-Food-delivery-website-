import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '@config/env';
import type { AccessTokenClaims } from '@shared/types';

const ISSUER = 'azure-api';
const SOCKET_AUDIENCE = 'azure-socket';
const API_AUDIENCE = 'azure-api';

/** Short-lived JWT for API calls (15 minutes by default). Stateless: no DB lookup per request. */
export const signAccessToken = (user: { id: string; email: string; role: UserRole }): string =>
  jwt.sign({ email: user.email, role: user.role }, env.jwt.secret, {
    subject: user.id,
    issuer: ISSUER,
    audience: API_AUDIENCE,
    expiresIn: env.jwt.accessTtlSeconds,
  });

export const verifyAccessToken = (token: string): AccessTokenClaims =>
  jwt.verify(token, env.jwt.secret, { issuer: ISSUER, audience: API_AUDIENCE }) as AccessTokenClaims;

/**
 * A 60-second token used only for the Socket.IO handshake. The browser can't read the
 * httpOnly access cookie, and the socket may live on another origin, so it asks the API
 * for this throwaway token instead. A different audience stops it being used as an API token.
 */
export const signSocketToken = (user: { id: string; email: string; role: UserRole }): string =>
  jwt.sign({ email: user.email, role: user.role }, env.jwt.secret, {
    subject: user.id,
    issuer: ISSUER,
    audience: SOCKET_AUDIENCE,
    expiresIn: 60,
  });

export const verifySocketToken = (token: string): AccessTokenClaims =>
  jwt.verify(token, env.jwt.secret, { issuer: ISSUER, audience: SOCKET_AUDIENCE }) as AccessTokenClaims;

/** Refresh tokens are random and opaque (not JWTs) so they can be revoked server-side. */
export const generateRefreshToken = (): string => randomBytes(32).toString('base64url');

/** Only this hash is stored, so a leaked database can't be used to log in. */
export const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');
