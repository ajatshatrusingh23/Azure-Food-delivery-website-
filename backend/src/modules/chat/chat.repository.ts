import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { Chat } from './chat.types';
import type { CreateChatDto, SendMessageDto } from './chat.dto';

// ─── Chat Repository ──────────────────────────────────────────────────────────

export class ChatRepository
  implements IBaseRepository<Chat, CreateChatDto, SendMessageDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Chat | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<Chat>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: CreateChatDto): Promise<Chat> {
    void data;
    return Promise.resolve({} as Chat);
  }

  async update(id: string, data: SendMessageDto): Promise<Chat> {
    void id;
    void data;
    return Promise.resolve({} as Chat);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async findByOrder(orderId: string): Promise<Chat | null> {
    void orderId;
    return Promise.resolve(null);
  }
}
