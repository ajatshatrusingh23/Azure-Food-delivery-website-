import type { PaginationQuery, PaginatedResult } from '@types/common.types';

/**
 * Base service interface that all feature services must extend.
 */
export interface IBaseService<TEntity, TCreateDto, TUpdateDto> {
  getById(id: string): Promise<TEntity>;
  getAll(pagination: PaginationQuery): Promise<PaginatedResult<TEntity>>;
  create(dto: TCreateDto): Promise<TEntity>;
  update(id: string, dto: TUpdateDto): Promise<TEntity>;
  remove(id: string): Promise<void>;
}
