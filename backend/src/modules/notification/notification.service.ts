import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { NotificationRepository } from './notification.repository';
import type { Notification } from './notification.types';
import type { CreateNotificationDto, MarkReadDto } from './notification.dto';

// ─── Notification Service ─────────────────────────────────────────────────────

export class NotificationService
  implements IBaseService<Notification, CreateNotificationDto, MarkReadDto>
{
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async getById(id: string): Promise<Notification> {
    void id;
    return Promise.resolve({} as Notification);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<Notification>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    void dto;
    return Promise.resolve({} as Notification);
  }

  async update(id: string, dto: MarkReadDto): Promise<Notification> {
    void id;
    void dto;
    return Promise.resolve({} as Notification);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }
}
