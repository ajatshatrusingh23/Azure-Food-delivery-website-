import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { AdminRepository } from './admin.repository';
import type { AdminDashboardStats } from './admin.types';
import type { UpdateUserStatusDto, UpdateRestaurantStatusDto } from './admin.dto';

// ─── Admin Service ────────────────────────────────────────────────────────────

export class AdminService
  implements IBaseService<AdminDashboardStats, UpdateUserStatusDto, UpdateRestaurantStatusDto>
{
  constructor(private readonly adminRepository: AdminRepository) {}

  async getById(id: string): Promise<AdminDashboardStats> {
    void id;
    return Promise.resolve({} as AdminDashboardStats);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<AdminDashboardStats>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: UpdateUserStatusDto): Promise<AdminDashboardStats> {
    void dto;
    return Promise.resolve({} as AdminDashboardStats);
  }

  async update(id: string, dto: UpdateRestaurantStatusDto): Promise<AdminDashboardStats> {
    void id;
    void dto;
    return Promise.resolve({} as AdminDashboardStats);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async getDashboardStats(): Promise<AdminDashboardStats> {
    return this.adminRepository.getDashboardStats();
  }
}
