import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { UserProfile } from './user.types';
import type { UpdateUserDto } from './user.dto';

// ─── User Repository ──────────────────────────────────────────────────────────

export class UserRepository
  implements IBaseRepository<UserProfile, UserProfile, UpdateUserDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<UserProfile | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<UserProfile>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: UserProfile): Promise<UserProfile> {
    void data;
    return Promise.resolve({} as UserProfile);
  }

  async update(id: string, data: UpdateUserDto): Promise<UserProfile> {
    void id;
    void data;
    return Promise.resolve({} as UserProfile);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async findByEmail(email: string): Promise<UserProfile | null> {
    void email;
    return Promise.resolve(null);
  }
}
