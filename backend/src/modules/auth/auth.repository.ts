import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '@config/database';

export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export const authRepository = {
  findUserByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findUserById: (id: string) => prisma.user.findUnique({ where: { id }, select: publicUserSelect }),

  createUser: (data: { name: string; email: string; phone?: string; passwordHash: string; role: UserRole }) =>
    prisma.user.create({ data, select: publicUserSelect }),

  createSession: (data: {
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }) => prisma.session.create({ data }),

  findSessionByHash: (tokenHash: string) =>
    prisma.session.findUnique({ where: { tokenHash }, include: { user: { select: { id: true, email: true, role: true, status: true } } } }),

  /**
   * Atomically retires a session. `revokedAt: null` in the WHERE clause makes this a
   * compare-and-set: if two requests race to rotate the same token, only one gets count = 1.
   */
  revokeSessionIfActive: (id: string, replacedBy?: string) =>
    prisma.session.updateMany({ where: { id, revokedAt: null }, data: { revokedAt: new Date(), replacedBy } }),

  revokeFamily: (family: string) =>
    prisma.session.updateMany({ where: { family, revokedAt: null }, data: { revokedAt: new Date() } }),

  revokeAllForUser: (userId: string) =>
    prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
};
