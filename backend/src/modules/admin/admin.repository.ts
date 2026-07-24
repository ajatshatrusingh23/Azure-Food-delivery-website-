import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { AdminDashboardStats } from './admin.types';
import type { UpdateUserStatusDto, UpdateRestaurantStatusDto } from './admin.dto';

// ─── Admin Repository ─────────────────────────────────────────────────────────

export class AdminRepository
  implements IBaseRepository<AdminDashboardStats, UpdateUserStatusDto, UpdateRestaurantStatusDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<AdminDashboardStats | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<AdminDashboardStats>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: UpdateUserStatusDto): Promise<AdminDashboardStats> {
    void data;
    return Promise.resolve({} as AdminDashboardStats);
  }

  async update(id: string, data: UpdateRestaurantStatusDto): Promise<AdminDashboardStats> {
    void id;
    void data;
    return Promise.resolve({} as AdminDashboardStats);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    return Promise.resolve({ totalUsers: 0, totalRestaurants: 0, totalOrders: 0, totalRevenue: 0 });
  }
}
