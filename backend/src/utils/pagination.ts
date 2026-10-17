import { z } from 'zod';
import type { Paginated } from '@shared/types';

export const MAX_LIMIT = 50;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(12),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/** Offset pagination for Prisma. */
export const toSkipTake = ({ page, limit }: PaginationInput) => ({ skip: (page - 1) * limit, take: limit });

export const paginate = <T>(data: T[], total: number, { page, limit }: PaginationInput): Paginated<T> => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    data,
    meta: { total, page, limit, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
  };
};
