import type { PaginationQuery, PaginatedResult } from '@types/common.types';

/**
 * Base repository interface that all feature repositories must extend.
 * Enforces a consistent data-access contract across the application.
 */
export interface IBaseRepository<TEntity, TCreateInput, TUpdateInput> {
  findById(id: string): Promise<TEntity | null>;
  findAll(pagination: PaginationQuery): Promise<PaginatedResult<TEntity>>;
  create(data: TCreateInput): Promise<TEntity>;
  update(id: string, data: TUpdateInput): Promise<TEntity>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
