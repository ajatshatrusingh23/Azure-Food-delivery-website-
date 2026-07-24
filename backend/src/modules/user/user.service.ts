import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { UserRepository } from './user.repository';
import type { UserProfile } from './user.types';
import type { UpdateUserDto, ChangePasswordDto } from './user.dto';

// ─── User Service ─────────────────────────────────────────────────────────────

export class UserService implements IBaseService<UserProfile, UserProfile, UpdateUserDto> {
  constructor(private readonly userRepository: UserRepository) {}

  async getById(id: string): Promise<UserProfile> {
    void id;
    return Promise.resolve({} as UserProfile);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<UserProfile>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: UserProfile): Promise<UserProfile> {
    void dto;
    return Promise.resolve({} as UserProfile);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserProfile> {
    void id;
    void dto;
    return Promise.resolve({} as UserProfile);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    void id;
    void dto;
    return Promise.resolve();
  }
}
