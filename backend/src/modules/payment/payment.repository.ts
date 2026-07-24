import { PrismaClient } from '@prisma/client';
import type { IBaseRepository } from '@interfaces/repository.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { Payment } from './payment.types';
import type { InitiatePaymentDto, VerifyPaymentDto } from './payment.dto';

// ─── Payment Repository ───────────────────────────────────────────────────────

export class PaymentRepository
  implements IBaseRepository<Payment, InitiatePaymentDto, VerifyPaymentDto>
{
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Payment | null> {
    void id;
    return Promise.resolve(null);
  }

  async findAll(pagination: PaginationQuery): Promise<PaginatedResult<Payment>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(data: InitiatePaymentDto): Promise<Payment> {
    void data;
    return Promise.resolve({} as Payment);
  }

  async update(id: string, data: VerifyPaymentDto): Promise<Payment> {
    void id;
    void data;
    return Promise.resolve({} as Payment);
  }

  async delete(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }

  async exists(id: string): Promise<boolean> {
    void id;
    return Promise.resolve(false);
  }

  async findByOrder(orderId: string): Promise<Payment | null> {
    void orderId;
    return Promise.resolve(null);
  }
}
