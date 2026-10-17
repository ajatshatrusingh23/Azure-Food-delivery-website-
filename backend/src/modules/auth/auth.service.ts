import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { ApiError } from '@utils/ApiError';
import { burnPasswordCheck, hashPassword, verifyPassword } from '@utils/password';
import { generateRefreshToken, hashToken, signAccessToken, signSocketToken } from '@utils/tokens';
import { authRepository, type PublicUser } from './auth.repository';
import type { LoginInput, RegisterInput } from './auth.validator';

export interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/** A rotated token presented again within this window is treated as a harmless race (two tabs). */
const ROTATION_GRACE_MS = 10_000;

const invalidCredentials = () => new ApiError(401, 'Invalid email or password');
const sessionExpired = () => new ApiError(401, 'Session expired. Please log in again.', undefined, 'session_expired');

const refreshExpiry = () => new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);

/** Starts a new session (a new token family) or continues an existing family on rotation. */
const issueTokens = async (user: PublicUser, client: ClientInfo, family: string = randomUUID()) => {
  const refreshToken = generateRefreshToken();
  const session = await authRepository.createSession({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: refreshExpiry(),
    userAgent: client.userAgent?.slice(0, 255),
    ip: client.ip,
  });
  return { accessToken: signAccessToken(user), refreshToken, sessionId: session.id };
};

export const authService = {
  async register(input: RegisterInput, client: ClientInfo): Promise<AuthResult> {
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await authRepository.createUser({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: input.role,
      });
      const { accessToken, refreshToken } = await issueTokens(user, client);
      return { user, accessToken, refreshToken };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const field = String((err.meta as { target?: string[] } | undefined)?.target ?? '').includes('phone') ? 'phone number' : 'email';
        throw ApiError.conflict(`An account with this ${field} already exists`);
      }
      throw err;
    }
  },

  async login(input: LoginInput, client: ClientInfo): Promise<AuthResult> {
    const record = await authRepository.findUserByEmail(input.email);
    if (!record) {
      await burnPasswordCheck(input.password); // same timing as a real check
      throw invalidCredentials();
    }
    if (!(await verifyPassword(input.password, record.passwordHash))) throw invalidCredentials();
    if (record.status === 'SUSPENDED') throw ApiError.forbidden('This account has been suspended');

    const user = (await authRepository.findUserById(record.id))!;
    const { accessToken, refreshToken } = await issueTokens(user, client);
    return { user, accessToken, refreshToken };
  },

  /**
   * Refresh-token rotation with reuse detection:
   *  - every refresh retires the presented token and issues a new one in the same family;
   *  - if an already-retired token is presented again, someone may have stolen it, so the
   *    whole family (every device's session from that login) is revoked.
   */
  async refresh(presentedToken: string | undefined, client: ClientInfo): Promise<AuthResult> {
    if (!presentedToken) throw sessionExpired();
    const session = await authRepository.findSessionByHash(hashToken(presentedToken));
    if (!session) throw sessionExpired();

    if (session.revokedAt) {
      const sinceRevoked = Date.now() - session.revokedAt.getTime();
      if (session.replacedBy && sinceRevoked < ROTATION_GRACE_MS) {
        // Two tabs refreshed at the same moment: the other one already rotated this token.
        throw new ApiError(409, 'Token was just rotated; retry with the new cookie', undefined, 'token_rotated');
      }
      logger.warn(`Refresh token reuse detected for user ${session.userId}; revoking session family ${session.family}`);
      await authRepository.revokeFamily(session.family);
      throw sessionExpired();
    }
    if (session.expiresAt.getTime() <= Date.now()) throw sessionExpired();
    if (session.user.status === 'SUSPENDED') {
      await authRepository.revokeAllForUser(session.userId);
      throw ApiError.forbidden('This account has been suspended');
    }

    const user = (await authRepository.findUserById(session.userId))!;
    const next = await issueTokens(user, client, session.family);
    const { count } = await authRepository.revokeSessionIfActive(session.id, next.sessionId);
    if (count === 0) {
      // Lost a race with a concurrent rotation of the same token: discard what we just issued.
      await authRepository.revokeSessionIfActive(next.sessionId);
      throw new ApiError(409, 'Token was just rotated; retry with the new cookie', undefined, 'token_rotated');
    }
    return { user, accessToken: next.accessToken, refreshToken: next.refreshToken };
  },

  async logout(presentedToken: string | undefined): Promise<void> {
    if (!presentedToken) return;
    const session = await authRepository.findSessionByHash(hashToken(presentedToken));
    if (session) await authRepository.revokeSessionIfActive(session.id);
  },

  async logoutEverywhere(userId: string): Promise<number> {
    const { count } = await authRepository.revokeAllForUser(userId);
    return count;
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw ApiError.notFound('User');
    return user;
  },

  socketToken(user: { id: string; email: string; role: PublicUser['role'] }): string {
    return signSocketToken(user);
  },

  /** Used by admin suspension: also ends every active session immediately. */
  revokeAllSessions: (userId: string) => authRepository.revokeAllForUser(userId),
};
