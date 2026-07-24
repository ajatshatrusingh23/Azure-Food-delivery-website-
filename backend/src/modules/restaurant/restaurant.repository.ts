import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { Restaurant } from './restaurant.types';
import type { CreateRestaurantDto, UpdateRestaurantDto } from './restaurant.dto';

// ─── Restaurant Repository ────────────────────────────────────────────────────

export class RestaurantRepository
  implements IBaseRepository<Restaurant, CreateRestaurantDto, UpdateRestaurantDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Restaurant | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<Restaurant>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: CreateRestaurantDto): Promise<Restaurant> {
    void data;
    return Promise.resolve({} as Restaurant);
  }

  async update(id: string, data: UpdateRestaurantDto): Promise<Restaurant> {
    void id;
    void data;
    return Promise.resolve({} as Restaurant);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }
}
