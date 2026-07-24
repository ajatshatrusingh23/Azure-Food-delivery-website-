import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { Notification } from './notification.types';
import type { CreateNotificationDto, MarkReadDto } from './notification.dto';

// ─── Notification Repository ──────────────────────────────────────────────────

export class NotificationRepository
  implements IBaseRepository<Notification, CreateNotificationDto, MarkReadDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Notification | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<Notification>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: CreateNotificationDto): Promise<Notification> {
    void data;
    return Promise.resolve({} as Notification);
  }

  async update(id: string, data: MarkReadDto): Promise<Notification> {
    void id;
    void data;
    return Promise.resolve({} as Notification);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async findByUser(userId: string, pagination: PaginationQuery): Promise<PaginatedResult<Notification>> {
    void userId;
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }
}
