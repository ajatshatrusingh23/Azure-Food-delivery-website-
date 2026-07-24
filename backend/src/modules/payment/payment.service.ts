import type { IBaseService } from '@interfaces/service.interface';
import type { PaginationQuery, PaginatedResult } from '@types/common.types';
import type { PaymentRepository } from './payment.repository';
import type { Payment } from './payment.types';
import type { InitiatePaymentDto, VerifyPaymentDto } from './payment.dto';

// ─── Payment Service ──────────────────────────────────────────────────────────

export class PaymentService
  implements IBaseService<Payment, InitiatePaymentDto, VerifyPaymentDto>
{
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async getById(id: string): Promise<Payment> {
    void id;
    return Promise.resolve({} as Payment);
  }

  async getAll(pagination: PaginationQuery): Promise<PaginatedResult<Payment>> {
    void pagination;
    return Promise.resolve({
      data: [],
      meta: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
    });
  }

  async create(dto: InitiatePaymentDto): Promise<Payment> {
    void dto;
    return Promise.resolve({} as Payment);
  }

  async update(id: string, dto: VerifyPaymentDto): Promise<Payment> {
    void id;
    void dto;
    return Promise.resolve({} as Payment);
  }

  async remove(id: string): Promise<void> {
    void id;
    return Promise.resolve();
  }
}
