import type { OrderStatus } from '@prisma/client';

/** Who is acting on an order, derived from the caller's role AND their relation to the order. */
export type OrderActor = 'CUSTOMER' | 'RESTAURANT' | 'RIDER' | 'ADMIN' | 'SYSTEM';

/**
 * The order lifecycle as data: for each status, the statuses it may move to and who may
 * make that move. Every status change in the app is checked against this table.
 *
 *   PENDING ─pay─▶ CONFIRMED ─▶ PREPARING ─▶ READY ─▶ OUT_FOR_DELIVERY ─▶ DELIVERED
 *      └──────────────┴────────────┴──────────┴──▶ CANCELLED
 */
export const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, OrderActor[]>>> = {
  PENDING: { CONFIRMED: ['SYSTEM'], CANCELLED: ['CUSTOMER', 'ADMIN', 'SYSTEM'] },
  CONFIRMED: { PREPARING: ['RESTAURANT', 'ADMIN'], CANCELLED: ['CUSTOMER', 'RESTAURANT', 'ADMIN'] },
  PREPARING: { READY: ['RESTAURANT', 'ADMIN'], CANCELLED: ['ADMIN'] },
  READY: { OUT_FOR_DELIVERY: ['RIDER'], CANCELLED: ['ADMIN'] },
  OUT_FOR_DELIVERY: { DELIVERED: ['RIDER', 'ADMIN'] },
  DELIVERED: {},
  CANCELLED: {},
};

export const ACTIVE_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
export const TERMINAL_STATUSES: OrderStatus[] = ['DELIVERED', 'CANCELLED'];

export const isTerminal = (status: OrderStatus): boolean => TERMINAL_STATUSES.includes(status);

export const canTransition = (from: OrderStatus, to: OrderStatus, actor: OrderActor): boolean =>
  TRANSITIONS[from][to]?.includes(actor) ?? false;

/** Statuses from which `actor` may move an order to `to` (used as the WHERE guard of the update). */
export const sourcesFor = (to: OrderStatus, actor: OrderActor): OrderStatus[] =>
  (Object.keys(TRANSITIONS) as OrderStatus[]).filter((from) => canTransition(from, to, actor));

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Waiting for payment',
  CONFIRMED: 'Order confirmed',
  PREPARING: 'Being prepared',
  READY: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};
