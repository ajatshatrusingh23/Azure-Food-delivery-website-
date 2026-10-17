import type { Server } from 'socket.io';
import { ROOMS, SOCKET_EVENTS, type OrderStatusPayload } from '@shared/socket-events';

/**
 * Thin facade over Socket.IO so business logic can publish events without depending on
 * the socket server (and so it is a no-op until the server is attached, e.g. in scripts).
 */
let io: Server | undefined;

export const attachRealtime = (server: Server): void => {
  io = server;
};

export const realtime = {
  toUser(userId: string, event: string, payload: unknown) {
    io?.to(ROOMS.user(userId)).emit(event, payload);
  },
  toRestaurant(restaurantId: string, event: string, payload: unknown) {
    io?.to(ROOMS.restaurant(restaurantId)).emit(event, payload);
  },
  toRiders(event: string, payload: unknown) {
    io?.to(ROOMS.riders).emit(event, payload);
  },
  /** Everyone watching the order (customer, restaurant, rider, admins) gets every status change. */
  orderStatus(payload: OrderStatusPayload, customerId: string) {
    io?.to([ROOMS.order(payload.orderId), ROOMS.user(customerId)]).emit(SOCKET_EVENTS.ORDER_STATUS, payload);
  },
};
