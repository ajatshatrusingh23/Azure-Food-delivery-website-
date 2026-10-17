import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@config/database';
import { logger } from '@config/logger';
import type { AuthUser } from '@shared/types';
import { ApiError } from '@utils/ApiError';
import { notificationService } from '@modules/notifications/notification.service';
import { applyTransition, publishTransition } from '@modules/orders/order.workflow';
import { gateway, TestGateway } from './gateway';
import { webhookSchema, type VerifyInput } from './payment.validator';

const rupees = (paise: number) => `₹${(paise / 100).toFixed(2)}`;

export interface MarkPaidResult {
  orderId: string;
  /** false when this payment had already been recorded (retry, duplicate webhook, race). */
  applied: boolean;
}

export const paymentService = {
  /**
   * Step 1 of online payment: create (or reuse) the gateway order the browser checkout pays.
   * Reusing it makes the call idempotent: a double click or a retry after a failed attempt
   * pays the same Razorpay order instead of creating a second one.
   */
  async checkout(user: AuthUser, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true, customer: { select: { name: true, email: true, phone: true } }, restaurant: { select: { name: true } } },
    });
    if (!order || order.customerId !== user.id) throw ApiError.notFound('Order');
    if (order.paymentMethod !== 'ONLINE') throw ApiError.conflict('This order is cash on delivery');
    if (order.status !== 'PENDING') throw ApiError.conflict(`This order is already ${order.status.toLowerCase()}`, 'not_payable');

    let payment = order.payment;
    if (payment && payment.status === 'PAID') throw ApiError.conflict('This order is already paid', 'not_payable');
    if (!payment) {
      const remote = await gateway.createOrder({ amount: order.total, receipt: `AZ-${order.orderNumber}`, notes: { orderId: order.id } });
      try {
        payment = await prisma.payment.create({
          data: { orderId: order.id, provider: gateway.provider, providerOrderId: remote.id, amount: order.total },
        });
      } catch (err) {
        // Two checkout calls raced: use the payment the other one created.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: order.id } });
        } else throw err;
      }
    }

    return {
      provider: gateway.provider,
      keyId: gateway.keyId,
      providerOrderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      orderNumber: order.orderNumber,
      description: `${order.restaurant.name} · Order #${order.orderNumber}`,
      prefill: { name: order.customer.name, email: order.customer.email, contact: order.customer.phone ?? undefined },
    };
  },

  /** Step 2: the browser reports success; trust it only if the HMAC signature is valid. */
  async verify(user: AuthUser, input: VerifyInput) {
    const payment = await prisma.payment.findUnique({
      where: { providerOrderId: input.razorpay_order_id },
      select: { order: { select: { id: true, customerId: true } } },
    });
    if (!payment || payment.order.customerId !== user.id) throw ApiError.notFound('Payment');

    const valid = gateway.verifyPaymentSignature({
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
    });
    if (!valid) {
      logger.warn(`Invalid payment signature for ${input.razorpay_order_id} from user ${user.id}`);
      throw ApiError.badRequest('Payment verification failed', 'invalid_signature');
    }
    await this.markPaid(input.razorpay_order_id, input.razorpay_payment_id);
    return prisma.order.findUniqueOrThrow({
      where: { id: payment.order.id },
      select: { id: true, orderNumber: true, status: true, paymentStatus: true },
    });
  },

  /**
   * Records a successful payment exactly once. Reached from the browser (verify) and from
   * Razorpay's webhook, possibly at the same moment and possibly more than once:
   *  - the payment row is updated only if it is not PAID yet (compare-and-set);
   *  - the order moves PENDING → CONFIRMED in the same transaction;
   *  - if the order was already cancelled (payment completed after it expired), the money
   *    is refunded automatically instead of being kept for an order nobody will cook.
   */
  async markPaid(providerOrderId: string, providerPaymentId: string, reportedAmount?: number): Promise<MarkPaidResult> {
    const outcome = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { providerOrderId } });
      if (!payment) throw ApiError.notFound('Payment');
      if (reportedAmount !== undefined && reportedAmount !== payment.amount) {
        throw ApiError.badRequest(`Amount mismatch: expected ${payment.amount}, got ${reportedAmount}`, 'amount_mismatch');
      }
      const { count } = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'PAID', providerPaymentId, paidAt: new Date(), failureReason: null },
      });
      if (count === 0) {
        if (payment.providerPaymentId && payment.providerPaymentId !== providerPaymentId) {
          logger.warn(`Second payment ${providerPaymentId} for already-paid ${providerOrderId} needs manual review`);
        }
        return { orderId: payment.orderId, applied: false, confirmed: false };
      }
      const confirmed = await applyTransition(tx, payment.orderId, {
        to: 'CONFIRMED',
        actor: 'SYSTEM',
        note: 'Payment received',
        data: { paymentStatus: 'PAID' },
      });
      if (!confirmed) await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID' } });
      return { orderId: payment.orderId, applied: true, confirmed };
    });

    if (outcome.confirmed) await publishTransition(outcome.orderId, 'CONFIRMED', 'Payment received');
    else if (outcome.applied) {
      logger.warn(`Payment ${providerPaymentId} arrived for order ${outcome.orderId} that is no longer pending; refunding`);
      await this.refundForOrder(outcome.orderId, 'Payment completed after the order was cancelled');
    }
    return { orderId: outcome.orderId, applied: outcome.applied };
  },

  async markFailed(providerOrderId: string, reason: string): Promise<void> {
    // The order stays PENDING: the customer can retry with the same gateway order.
    await prisma.payment.updateMany({ where: { providerOrderId, status: 'PENDING' }, data: { status: 'FAILED', failureReason: reason.slice(0, 200) } });
  },

  /** Refunds a paid order in full. Safe to call twice: only a PAID payment is refunded. */
  async refundForOrder(orderId: string, reason: string): Promise<boolean> {
    const payment = await prisma.payment.findUnique({ where: { orderId }, include: { order: { select: { customerId: true, orderNumber: true } } } });
    if (!payment || payment.status !== 'PAID' || !payment.providerPaymentId) return false;
    try {
      await gateway.refund(payment.providerPaymentId, payment.amount, { orderId, reason });
    } catch (err) {
      logger.error(`Refund failed for order ${orderId}: ${(err as Error).message}`);
      return false; // stays PAID; visible to admins for a manual retry
    }
    await prisma.$transaction([
      prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED', refundedAt: new Date() } }),
      prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'REFUNDED' } }),
    ]);
    await notificationService.notify(
      payment.order.customerId,
      `Refund initiated · #${payment.order.orderNumber}`,
      `${rupees(payment.amount)} will be credited to your original payment method in 5-7 working days.`,
      orderId,
    );
    return true;
  },

  /**
   * Razorpay webhooks: signature over the raw body, then de-duplicated by event id
   * (providers deliver at least once). Processing is idempotent too, so a retry after a
   * crash halfway through is harmless.
   */
  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined, eventIdHeader: string | undefined) {
    if (!rawBody || !gateway.verifyWebhookSignature(rawBody, signature)) {
      throw ApiError.badRequest('Invalid webhook signature', 'invalid_signature');
    }
    const eventId = eventIdHeader ?? createHash('sha256').update(rawBody).digest('hex');
    if (await prisma.webhookEvent.findUnique({ where: { id: eventId } })) return { duplicate: true };

    const body = webhookSchema.parse(JSON.parse(rawBody.toString('utf8')));
    const entity = body.payload.payment?.entity;
    if (entity?.order_id) {
      if (body.event === 'payment.captured' || body.event === 'order.paid') {
        await this.markPaid(entity.order_id, entity.id, entity.amount);
      } else if (body.event === 'payment.failed') {
        await this.markFailed(entity.order_id, entity.error_description ?? 'Payment failed');
      }
    }
    await prisma.webhookEvent
      .create({ data: { id: eventId, provider: gateway.provider, type: body.event } })
      .catch((err) => {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      });
    return { duplicate: false };
  },

  /** Test gateway only: stands in for the Razorpay Checkout popup. */
  async simulate(user: AuthUser, providerOrderId: string, outcome: 'success' | 'failure') {
    if (!(gateway instanceof TestGateway)) throw ApiError.notFound('Route');
    const payment = await prisma.payment.findUnique({ where: { providerOrderId }, select: { order: { select: { customerId: true } } } });
    if (!payment || payment.order.customerId !== user.id) throw ApiError.notFound('Payment');
    if (outcome === 'failure') {
      await this.markFailed(providerOrderId, 'Payment declined by the bank (simulated)');
      return { outcome };
    }
    return { outcome, ...gateway.simulateSuccess(providerOrderId) };
  },
};
