import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { MenuRepository } from './menu.repository';
import type { MenuItem } from './menu.types';
import type { CreateMenuItemDto, UpdateMenuItemDto } from './menu.dto';

// ─── Menu Service ─────────────────────────────────────────────────────────────

export class MenuService implements IBaseService<MenuItem, CreateMenuItemDto, UpdateMenuItemDto> {
  constructor(private readonly menuRepository: MenuRepository) {}

  async getById(id: string): Promise<MenuItem> {
    void id;
    return Promise.resolve({} as MenuItem);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<MenuItem>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: CreateMenuItemDto): Promise<MenuItem> {
    void dto;
    return Promise.resolve({} as MenuItem);
  }

  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    void id;
    void dto;
    return Promise.resolve({} as MenuItem);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }
}
