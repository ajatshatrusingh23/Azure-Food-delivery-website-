import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@config/database';
import { toSkipTake, type PaginationInput } from '@utils/pagination';
import { ACTIVE_STATUSES, TERMINAL_STATUSES } from './order.state';

export type Scope = 'active' | 'past' | 'all';

const scopeFilter = (scope: Scope): Prisma.OrderWhereInput =>
  scope === 'active' ? { status: { in: ACTIVE_STATUSES } } : scope === 'past' ? { status: { in: TERMINAL_STATUSES } } : {};

export const orderDetailInclude = {
  items: { select: { id: true, menuItemId: true, name: true, price: true, quantity: true } },
  events: { orderBy: { createdAt: 'asc' }, select: { id: true, status: true, note: true, createdAt: true } },
  restaurant: {
    select: { id: true, name: true, slug: true, area: true, address: true, phone: true, latitude: true, longitude: true, imageHue: true, ownerId: true },
  },
  customer: { select: { id: true, name: true, phone: true } },
  deliveryPartner: { select: { id: true, name: true, phone: true } },
  payment: { select: { status: true, provider: true, providerOrderId: true, amount: true, paidAt: true, refundedAt: true } },
  review: { select: { rating: true, comment: true, createdAt: true } },
} satisfies Prisma.OrderInclude;

export const orderListSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  total: true,
  placedAt: true,
  deliveredAt: true,
  deliveryAddress: true,
  restaurant: { select: { id: true, name: true, slug: true, area: true, imageHue: true } },
  items: { select: { name: true, quantity: true } },
  review: { select: { rating: true } },
} satisfies Prisma.OrderSelect;

export const orderRepository = {
  findDetail: (id: string) => prisma.order.findUnique({ where: { id }, include: orderDetailInclude }),

  /** Just enough to decide who may see or change the order. */
  findForAccess: (id: string) =>
    prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        customerId: true,
        deliveryPartnerId: true,
        paymentMethod: true,
        paymentStatus: true,
        restaurantId: true,
        restaurant: { select: { ownerId: true } },
      },
    }),

  findByIdempotencyKey: (customerId: string, idempotencyKey: string) =>
    prisma.order.findUnique({ where: { customerId_idempotencyKey: { customerId, idempotencyKey } }, include: orderDetailInclude }),

  menuItemsForCart: (restaurantId: string, ids: string[]) =>
    prisma.menuItem.findMany({
      where: { id: { in: ids }, restaurantId, isArchived: false },
      select: { id: true, name: true, price: true, isAvailable: true, foodType: true },
    }),

  restaurantForOrdering: (id: string) =>
    prisma.restaurant.findUnique({
      where: { id },
      select: { id: true, name: true, status: true, isOpen: true, latitude: true, longitude: true, ownerId: true },
    }),

  async listForCustomer(customerId: string, scope: Scope, page: PaginationInput) {
    const where = { customerId, ...scopeFilter(scope) };
    const [rows, total] = await prisma.$transaction([
      prisma.order.findMany({ where, select: orderListSelect, orderBy: { placedAt: 'desc' }, ...toSkipTake(page) }),
      prisma.order.count({ where }),
    ]);
    return { rows, total };
  },

  async listForOwner(ownerId: string, scope: Scope, page: PaginationInput, restaurantId?: string) {
    const where: Prisma.OrderWhereInput = {
      restaurant: { ownerId },
      ...(restaurantId && { restaurantId }),
      // Unpaid online orders are not the restaurant's business yet.
      ...(scope === 'active' ? { status: { in: ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } } : scopeFilter(scope)),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        select: { ...orderListSelect, notes: true, customer: { select: { name: true } }, deliveryPartner: { select: { name: true } } },
        orderBy: { placedAt: scope === 'active' ? 'asc' : 'desc' },
        ...toSkipTake(page),
      }),
      prisma.order.count({ where }),
    ]);
    return { rows, total };
  },

  /** Pickups waiting for a delivery partner, oldest first. */
  listAvailableForRiders: (limit = 30) =>
    prisma.order.findMany({
      where: { status: 'READY', deliveryPartnerId: null },
      orderBy: { placedAt: 'asc' },
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        total: true,
        paymentMethod: true,
        placedAt: true,
        deliveryAddress: true,
        deliveryLatitude: true,
        deliveryLongitude: true,
        restaurant: { select: { name: true, area: true, address: true, latitude: true, longitude: true } },
        items: { select: { quantity: true } },
      },
    }),

  async listForRider(riderId: string, scope: Scope, page: PaginationInput) {
    const where = { deliveryPartnerId: riderId, ...scopeFilter(scope) };
    const [rows, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        orderBy: { placedAt: 'desc' },
        ...toSkipTake(page),
        select: {
          ...orderListSelect,
          deliveryLatitude: true,
          deliveryLongitude: true,
          customer: { select: { name: true, phone: true } },
          restaurant: { select: { id: true, name: true, slug: true, area: true, imageHue: true, address: true, latitude: true, longitude: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);
    return { rows, total };
  },

  hasActiveDelivery: async (riderId: string) =>
    (await prisma.order.count({ where: { deliveryPartnerId: riderId, status: 'OUT_FOR_DELIVERY' } })) > 0,

  /** Online orders whose payment never completed in time. */
  expiredPendingIds: async (cutoff: Date) =>
    (
      await prisma.order.findMany({
        where: { status: 'PENDING' satisfies OrderStatus, paymentMethod: 'ONLINE', placedAt: { lt: cutoff } },
        select: { id: true },
        take: 100,
      })
    ).map((o) => o.id),
};
