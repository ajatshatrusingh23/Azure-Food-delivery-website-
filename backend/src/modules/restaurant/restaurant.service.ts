import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { RestaurantRepository } from './restaurant.repository';
import type { Restaurant } from './restaurant.types';
import type { CreateRestaurantDto, UpdateRestaurantDto } from './restaurant.dto';

// ─── Restaurant Service ───────────────────────────────────────────────────────

export class RestaurantService
  implements IBaseService<Restaurant, CreateRestaurantDto, UpdateRestaurantDto>
{
  constructor(private readonly restaurantRepository: RestaurantRepository) {}

  async getById(id: string): Promise<Restaurant> {
    void id;
    return Promise.resolve({} as Restaurant);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<Restaurant>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: CreateRestaurantDto): Promise<Restaurant> {
    void dto;
    return Promise.resolve({} as Restaurant);
  }

  async update(id: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
    void id;
    void dto;
    return Promise.resolve({} as Restaurant);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }
}
