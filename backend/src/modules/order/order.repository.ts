import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { Order } from './order.types';
import type { CreateOrderDto, UpdateOrderStatusDto } from './order.dto';

// ─── Order Repository ─────────────────────────────────────────────────────────

export class OrderRepository
  implements IBaseRepository<Order, CreateOrderDto, UpdateOrderStatusDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Order | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<Order>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: CreateOrderDto): Promise<Order> {
    void data;
    return Promise.resolve({} as Order);
  }

  async update(id: string, data: UpdateOrderStatusDto): Promise<Order> {
    void id;
    void data;
    return Promise.resolve({} as Order);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async findByCustomer(customerId: string, pagination: PaginationQuery): Promise<PaginatedResult<Order>> {
    void customerId;
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }
}
