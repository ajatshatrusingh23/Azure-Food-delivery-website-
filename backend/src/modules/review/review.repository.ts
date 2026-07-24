import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { Review } from './review.types';
import type { CreateReviewDto, UpdateReviewDto } from './review.dto';

// ─── Review Repository ────────────────────────────────────────────────────────

export class ReviewRepository
  implements IBaseRepository<Review, CreateReviewDto, UpdateReviewDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Review | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<Review>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: CreateReviewDto): Promise<Review> {
    void data;
    return Promise.resolve({} as Review);
  }

  async update(id: string, data: UpdateReviewDto): Promise<Review> {
    void id;
    void data;
    return Promise.resolve({} as Review);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async findByRestaurant(restaurantId: string, pagination: PaginationQuery): Promise<PaginatedResult<Review>> {
    void restaurantId;
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }
}
