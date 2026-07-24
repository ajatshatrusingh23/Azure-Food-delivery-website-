import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { MenuItem } from './menu.types';
import type { CreateMenuItemDto, UpdateMenuItemDto } from './menu.dto';

// ─── Menu Repository ──────────────────────────────────────────────────────────

export class MenuRepository
  implements IBaseRepository<MenuItem, CreateMenuItemDto, UpdateMenuItemDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<MenuItem | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<MenuItem>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: CreateMenuItemDto): Promise<MenuItem> {
    void data;
    return Promise.resolve({} as MenuItem);
  }

  async update(id: string, data: UpdateMenuItemDto): Promise<MenuItem> {
    void id;
    void data;
    return Promise.resolve({} as MenuItem);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async findByRestaurant(restaurantId: string): Promise<MenuItem[]> {
    void restaurantId;
    return Promise.resolve([]);
  }
}
