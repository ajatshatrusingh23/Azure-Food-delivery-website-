import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { ReviewRepository } from './review.repository';
import type { Review } from './review.types';
import type { CreateReviewDto, UpdateReviewDto } from './review.dto';

// ─── Review Service ───────────────────────────────────────────────────────────

export class ReviewService implements IBaseService<Review, CreateReviewDto, UpdateReviewDto> {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  async getById(id: string): Promise<Review> {
    void id;
    return Promise.resolve({} as Review);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<Review>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: CreateReviewDto): Promise<Review> {
    void dto;
    return Promise.resolve({} as Review);
  }

  async update(id: string, dto: UpdateReviewDto): Promise<Review> {
    void id;
    void dto;
    return Promise.resolve({} as Review);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }
}
