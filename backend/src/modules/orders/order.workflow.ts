import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma, type Tx } from '@config/database';
import { SOCKET_EVENTS } from '@shared/socket-events';
import { realtime } from '@socket/realtime';
import { notificationService } from '@modules/notifications/notification.service';
import { STATUS_LABELS, sourcesFor, type OrderActor } from './order.state';

export interface TransitionRequest {
  to: OrderStatus;
  actor: OrderActor;
  actorId?: string;
  note?: string;
  /** Extra guard conditions, e.g. "and nobody has claimed it yet". */
  where?: Prisma.OrderWhereInput;
  /** Extra fields to set together with the status. */
  data?: Prisma.OrderUncheckedUpdateManyInput;
}

/**
 * Applies a status change inside a transaction. The UPDATE's WHERE clause contains the
 * allowed source statuses, so the check and the change are one atomic step: if two
 * requests race (two riders claiming one order, a payment arriving as the order expires),
 * exactly one succeeds and the other updates 0 rows. Returns false when nothing changed.
 */
export const applyTransition = async (tx: Tx, orderId: string, req: TransitionRequest): Promise<boolean> => {
  const from = sourcesFor(req.to, req.actor);
  if (!from.length) return false;
  const { count } = await tx.order.updateMany({
    where: { id: orderId, status: { in: from }, ...req.where },
    data: { ...req.data, status: req.to },
  });
  if (count === 0) return false;
  await tx.orderEvent.create({ data: { orderId, status: req.to, actorId: req.actorId, note: req.note } });
  return true;
};

/** Live updates and notifications. Called only after the transaction has committed. */
export const publishTransition = async (orderId: string, to: OrderStatus, note?: string): Promise<void> => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      restaurantId: true,
      total: true,
      paymentMethod: true,
      placedAt: true,
      deliveryAddress: true,
      restaurant: { select: { name: true, ownerId: true, area: true, address: true, latitude: true, longitude: true } },
      deliveryPartner: { select: { name: true } },
      items: { select: { name: true, quantity: true } },
    },
  });
  if (!order) return;

  const payload = { orderId: order.id, orderNumber: order.orderNumber, status: to, note: note ?? null, at: new Date().toISOString() };
  realtime.orderStatus(payload, order.customerId);
  realtime.toRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_STATUS, payload);

  const ref = `#${order.orderNumber}`;
  const notifyCustomer = (body: string) => notificationService.notify(order.customerId, `${STATUS_LABELS[to]} · ${ref}`, body, order.id);

  switch (to) {
    case 'CONFIRMED':
      realtime.toRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_NEW, { ...payload, total: order.total, items: order.items });
      await Promise.all([
        notifyCustomer(`${order.restaurant.name} has received your order.`),
        notificationService.notify(order.restaurant.ownerId, `New order ${ref}`, `${order.items.length} item(s) · please start preparing.`, order.id),
      ]);
      break;
    case 'PREPARING':
      await notifyCustomer(`${order.restaurant.name} is preparing your food.`);
      break;
    case 'READY':
      realtime.toRiders(SOCKET_EVENTS.ORDER_READY, {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        paymentMethod: order.paymentMethod,
        restaurant: order.restaurant,
        deliveryAddress: order.deliveryAddress,
      });
      await notifyCustomer('Your order is packed and waiting for a delivery partner.');
      break;
    case 'OUT_FOR_DELIVERY':
      realtime.toRiders(SOCKET_EVENTS.ORDER_CLAIMED, { orderId: order.id });
      await notifyCustomer(`${order.deliveryPartner?.name ?? 'Your delivery partner'} has picked up your order.`);
      break;
    case 'DELIVERED':
      await notifyCustomer('Enjoy your meal! Tap to rate your order.');
      break;
    case 'CANCELLED':
      realtime.toRiders(SOCKET_EVENTS.ORDER_CLAIMED, { orderId: order.id });
      await notifyCustomer(note ? `Reason: ${note}` : 'Your order was cancelled.');
      break;
    default:
      break;
  }
};

/** Transition + publish, for callers that don't need to combine it with other writes. */
export const transitionOrder = async (orderId: string, req: TransitionRequest): Promise<boolean> => {
  const changed = await prisma.$transaction((tx) => applyTransition(tx, orderId, req));
  if (changed) await publishTransition(orderId, req.to, req.note);
  return changed;
};
