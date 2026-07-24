import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { ChatRepository } from './chat.repository';
import type { Chat } from './chat.types';
import type { CreateChatDto, SendMessageDto } from './chat.dto';

// ─── Chat Service ─────────────────────────────────────────────────────────────

export class ChatService implements IBaseService<Chat, CreateChatDto, SendMessageDto> {
  constructor(private readonly chatRepository: ChatRepository) {}

  async getById(id: string): Promise<Chat> {
    void id;
    return Promise.resolve({} as Chat);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<Chat>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: CreateChatDto): Promise<Chat> {
    void dto;
    return Promise.resolve({} as Chat);
  }

  async update(id: string, dto: SendMessageDto): Promise<Chat> {
    void id;
    void dto;
    return Promise.resolve({} as Chat);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }
}
