import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { OrderRepository } from './order.repository';
import type { Order } from './order.types';
import type { CreateOrderDto, UpdateOrderStatusDto } from './order.dto';

// ─── Order Service ────────────────────────────────────────────────────────────

export class OrderService implements IBaseService<Order, CreateOrderDto, UpdateOrderStatusDto> {
  constructor(private readonly orderRepository: OrderRepository) {}

  async getById(id: string): Promise<Order> {
    void id;
    return Promise.resolve({} as Order);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<Order>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    void dto;
    return Promise.resolve({} as Order);
  }

  async update(id: string, dto: UpdateOrderStatusDto): Promise<Order> {
    void id;
    void dto;
    return Promise.resolve({} as Order);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }
}
