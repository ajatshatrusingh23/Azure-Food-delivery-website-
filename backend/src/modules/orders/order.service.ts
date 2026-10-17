import { Prisma, type OrderStatus } from '@prisma/client';
import { prisma } from '@config/database';
import type { AuthUser } from '@shared/types';
import { ApiError } from '@utils/ApiError';
import { paginate, type PaginationInput } from '@utils/pagination';
import { paymentService } from '@modules/payments/payment.service';
import { computePricing, type PricedLine } from './order.pricing';
import { orderDetailInclude, orderRepository, type Scope } from './order.repository';
import { actorFor } from './order.access';
import { canTransition } from './order.state';
import { publishTransition, transitionOrder } from './order.workflow';
import type { CartInput, PlaceOrderInput } from './order.validator';

/** Loads the order and the caller's role in it. Unrelated callers get 404, not 403: no existence leak. */
const loadWithActor = async (user: AuthUser, orderId: string) => {
  const order = await orderRepository.findForAccess(orderId);
  const actor = order && actorFor(user, order);
  if (!order || !actor) throw ApiError.notFound('Order');
  return { order, actor };
};

const staleConflict = () => ApiError.conflict('This order was updated by someone else. Refresh and try again.', 'stale_status');

/** Merge duplicate lines and price everything from the database, never from the client. */
const priceCart = async (input: CartInput) => {
  const restaurant = await orderRepository.restaurantForOrdering(input.restaurantId);
  if (!restaurant || restaurant.status !== 'ACTIVE') throw ApiError.notFound('Restaurant');

  const quantities = new Map<string, number>();
  for (const item of input.items) quantities.set(item.menuItemId, (quantities.get(item.menuItemId) ?? 0) + item.quantity);
  if ([...quantities.values()].some((q) => q > 20)) throw ApiError.unprocessable('You can order at most 20 of one item');

  const menu = new Map((await orderRepository.menuItemsForCart(restaurant.id, [...quantities.keys()])).map((m) => [m.id, m]));
  const lines: PricedLine[] = [];
  const unavailable: { menuItemId: string; name?: string; reason: 'not_on_menu' | 'unavailable' }[] = [];
  for (const [menuItemId, quantity] of quantities) {
    const item = menu.get(menuItemId);
    if (!item) unavailable.push({ menuItemId, reason: 'not_on_menu' });
    else if (!item.isAvailable) unavailable.push({ menuItemId, name: item.name, reason: 'unavailable' });
    else lines.push({ menuItemId, name: item.name, price: item.price, quantity });
  }
  return { restaurant, lines, unavailable, pricing: computePricing(lines) };
};

const stripOwner = <T extends { restaurant: { ownerId: string } }>(order: T) => {
  const { ownerId: _ownerId, ...restaurant } = order.restaurant;
  return { ...order, restaurant };
};

export const orderService = {
  /** Server-computed cart totals for the cart page; flags items that went unavailable. */
  async quote(input: CartInput) {
    const { restaurant, lines, unavailable, pricing } = await priceCart(input);
    return { restaurant: { id: restaurant.id, name: restaurant.name, isOpen: restaurant.isOpen }, lines, unavailable, pricing };
  },

  /**
   * Places an order. With an Idempotency-Key, retries (double click, flaky network) return
   * the same order instead of creating a second one; a unique index on
   * (customerId, idempotencyKey) makes that hold even for simultaneous requests.
   */
  async place(user: AuthUser, input: PlaceOrderInput, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing = await orderRepository.findByIdempotencyKey(user.id, idempotencyKey);
      if (existing) return { order: stripOwner(existing), replayed: true };
    }

    const { restaurant, lines, unavailable, pricing } = await priceCart(input);
    if (!restaurant.isOpen) throw ApiError.conflict(`${restaurant.name} is not accepting orders right now`, 'restaurant_closed');
    if (unavailable.length) {
      throw ApiError.unprocessable('Some items in your cart are no longer available', {
        items: unavailable.map((u) => `${u.name ?? u.menuItemId}: ${u.reason === 'unavailable' ? 'sold out' : 'not on this menu'}`),
      });
    }

    const isCod = input.paymentMethod === 'COD';
    try {
      const order = await prisma.order.create({
        data: {
          customerId: user.id,
          restaurantId: restaurant.id,
          // Cash orders go straight to the kitchen; online orders wait for payment.
          status: isCod ? 'CONFIRMED' : 'PENDING',
          paymentMethod: input.paymentMethod,
          ...pricing,
          deliveryAddress: input.deliveryAddress,
          // A real app geocodes the address; the demo places the customer near the restaurant.
          deliveryLatitude: input.deliveryLatitude ?? restaurant.latitude + 0.012,
          deliveryLongitude: input.deliveryLongitude ?? restaurant.longitude + 0.016,
          notes: input.notes,
          idempotencyKey,
          items: { create: lines.map(({ menuItemId, name, price, quantity }) => ({ menuItemId, name, price, quantity })) },
          events: {
            create: {
              status: isCod ? 'CONFIRMED' : 'PENDING',
              actorId: user.id,
              note: isCod ? 'Order placed · cash on delivery' : 'Order placed · waiting for payment',
            },
          },
        },
        include: orderDetailInclude,
      });
      if (isCod) await publishTransition(order.id, 'CONFIRMED', 'Order placed · cash on delivery');
      return { order: stripOwner(order), replayed: false };
    } catch (err) {
      if (idempotencyKey && err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await orderRepository.findByIdempotencyKey(user.id, idempotencyKey);
        if (existing) return { order: stripOwner(existing), replayed: true };
      }
      throw err;
    }
  },

  async get(user: AuthUser, orderId: string) {
    await loadWithActor(user, orderId);
    const order = await orderRepository.findDetail(orderId);
    if (!order) throw ApiError.notFound('Order');
    return stripOwner(order);
  },

  async listMine(user: AuthUser, scope: Scope, page: PaginationInput) {
    const { rows, total } = await orderRepository.listForCustomer(user.id, scope, page);
    return paginate(rows, total, page);
  },

  async listForRestaurant(user: AuthUser, scope: Scope, page: PaginationInput, restaurantId?: string) {
    const { rows, total } = await orderRepository.listForOwner(user.id, scope, page, restaurantId);
    return paginate(rows, total, page);
  },

  /** Restaurant moves an order along: CONFIRMED → PREPARING → READY. */
  async updateStatus(user: AuthUser, orderId: string, to: Extract<OrderStatus, 'PREPARING' | 'READY'>) {
    const { order, actor } = await loadWithActor(user, orderId);
    if (!canTransition(order.status, to, actor)) {
      throw ApiError.conflict(`An order that is ${order.status.toLowerCase().replace(/_/g, ' ')} can't be marked ${to.toLowerCase()}`, 'invalid_transition');
    }
    if (!(await transitionOrder(orderId, { to, actor, actorId: user.id }))) throw staleConflict();
    return this.get(user, orderId);
  },

  async cancel(user: AuthUser, orderId: string, reason?: string) {
    const { order, actor } = await loadWithActor(user, orderId);
    if (!canTransition(order.status, 'CANCELLED', actor)) {
      const message =
        order.status === 'CANCELLED' || order.status === 'DELIVERED'
          ? `This order is already ${order.status.toLowerCase()}`
          : 'The restaurant has started on this order, so it can no longer be cancelled';
      throw ApiError.conflict(message, 'invalid_transition');
    }
    const note = reason ?? (actor === 'CUSTOMER' ? 'Cancelled by customer' : 'Cancelled by the restaurant');
    if (!(await transitionOrder(orderId, { to: 'CANCELLED', actor, actorId: user.id, note, data: { cancelReason: note } }))) {
      throw staleConflict();
    }
    // Paid online? Give the money back. (If the payment lands after this point, the
    // payment service sees the order is cancelled and refunds it itself.)
    if (order.paymentStatus === 'PAID') await paymentService.refundForOrder(orderId, note);
    return this.get(user, orderId);
  },

  // ── Delivery partners ─────────────────────────────────────────────────────
  available: () => orderRepository.listAvailableForRiders(),

  /**
   * Claim a READY order. Many partners see the same pickup; the guarded UPDATE
   * (status = READY AND deliveryPartnerId IS NULL) lets exactly one of them win.
   */
  async claim(user: AuthUser, orderId: string) {
    if (await orderRepository.hasActiveDelivery(user.id)) {
      throw ApiError.conflict('Finish your current delivery before accepting another one', 'rider_busy');
    }
    const claimed = await transitionOrder(orderId, {
      to: 'OUT_FOR_DELIVERY',
      actor: 'RIDER',
      actorId: user.id,
      note: 'Picked up by delivery partner',
      where: { deliveryPartnerId: null },
      data: { deliveryPartnerId: user.id },
    });
    if (!claimed) {
      if (!(await orderRepository.findForAccess(orderId))) throw ApiError.notFound('Order');
      throw ApiError.conflict('This order has already been picked up by another partner', 'already_claimed');
    }
    return this.get(user, orderId);
  },

  async deliver(user: AuthUser, orderId: string) {
    const { order } = await loadWithActor(user, orderId);
    const delivered = await transitionOrder(orderId, {
      to: 'DELIVERED',
      actor: 'RIDER',
      actorId: user.id,
      note: 'Delivered',
      where: { deliveryPartnerId: user.id },
      // Cash is collected at the door.
      data: { deliveredAt: new Date(), ...(order.paymentMethod === 'COD' && { paymentStatus: 'PAID' as const }) },
    });
    if (!delivered) throw ApiError.conflict('Only an order you are delivering can be marked delivered', 'invalid_transition');
    return this.get(user, orderId);
  },

  async myDeliveries(user: AuthUser, scope: Scope, page: PaginationInput) {
    const { rows, total } = await orderRepository.listForRider(user.id, scope, page);
    return paginate(rows, total, page);
  },

  // ── Reviews ───────────────────────────────────────────────────────────────
  async review(user: AuthUser, orderId: string, rating: number, comment?: string) {
    const order = await orderRepository.findForAccess(orderId);
    if (!order || order.customerId !== user.id) throw ApiError.notFound('Order');
    if (order.status !== 'DELIVERED') throw ApiError.conflict('You can rate an order once it has been delivered');
    try {
      return await prisma.$transaction(async (tx) => {
        const review = await tx.review.create({
          data: { orderId, customerId: user.id, restaurantId: order.restaurantId, rating, comment },
        });
        // Running average updated in one statement, so concurrent reviews can't lose updates.
        await tx.$executeRaw`
          UPDATE restaurants
          SET "ratingAvg" = ROUND((("ratingAvg" * "ratingCount" + ${rating}) / ("ratingCount" + 1))::numeric, 2),
              "ratingCount" = "ratingCount" + 1
          WHERE id = ${order.restaurantId}`;
        return review;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw ApiError.conflict('You have already rated this order');
      }
      throw err;
    }
  },

  // ── Background job ────────────────────────────────────────────────────────
  /** Cancels online orders whose payment was never completed. Returns how many. */
  async expireUnpaid(ttlMinutes: number): Promise<number> {
    const ids = await orderRepository.expiredPendingIds(new Date(Date.now() - ttlMinutes * 60_000));
    let cancelled = 0;
    for (const id of ids) {
      const note = 'Payment was not completed in time';
      if (await transitionOrder(id, { to: 'CANCELLED', actor: 'SYSTEM', note, data: { cancelReason: note } })) cancelled++;
    }
    return cancelled;
  },
};
