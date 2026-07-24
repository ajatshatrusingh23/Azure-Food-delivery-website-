import type { PaginationQuery, PaginationMeta, PaginatedResult } from '@types/common.types';
import type { IPaginationOptions, IPaginationResult } from '@interfaces/pagination.interface';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

/**
 * Converts pagination query params into Prisma-compatible skip/take values.
 */
export const buildPaginationOptions = (options: IPaginationOptions): IPaginationResult => {
  const page = Math.max(1, options.page ?? DEFAULT_PAGE);
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const skip = (page - 1) * limit;

  const orderBy: Record<string, 'asc' | 'desc'> | undefined =
    options.sortBy
      ? { [options.sortBy]: options.sortOrder ?? 'desc' }
      : undefined;

  return { skip, take: limit, orderBy };
};

/**
 * Builds pagination metadata from total count and query params.
 */
export const buildPaginationMeta = (
  total: number,
  query: PaginationQuery,
): PaginationMeta => {
  const page = Math.max(1, query.page ?? DEFAULT_PAGE);
  const limit = Math.min(query.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

/**
 * Wraps data and meta into a standard paginated result envelope.
 */
export const buildPaginatedResult = <T>(
  data: T[],
  total: number,
  query: PaginationQuery,
): PaginatedResult<T> => {
  return {
    data,
    meta: buildPaginationMeta(total, query),
  };
};
