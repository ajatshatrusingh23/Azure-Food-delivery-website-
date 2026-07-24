import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { AuthUser } from './auth.types';
import type { RegisterDto } from './auth.dto';

// ─── Auth Repository ──────────────────────────────────────────────────────────

export class AuthRepository
  implements IBaseRepository<AuthUser, RegisterDto, Partial<RegisterDto>>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<AuthUser | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<AuthUser>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: RegisterDto): Promise<AuthUser> {
    void data;
    return Promise.resolve({} as AuthUser);
  }

  async update(id: string, data: Partial<RegisterDto>): Promise<AuthUser> {
    void id;
    void data;
    return Promise.resolve({} as AuthUser);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    void email;
    return Promise.resolve(null);
  }
}
