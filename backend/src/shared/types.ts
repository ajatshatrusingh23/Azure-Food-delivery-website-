import type { UserRole } from '@prisma/client';

/** The authenticated caller, attached to req.user by the auth middleware. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: UserRole;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
