/** Socket.IO event names shared by server and clients. */
export const SOCKET_EVENTS = {
  // client -> server
  ORDER_SUBSCRIBE: 'order:subscribe',
  ORDER_UNSUBSCRIBE: 'order:unsubscribe',
  RIDER_LOCATION: 'rider:location',
  // server -> client
  ORDER_STATUS: 'order:status',
  ORDER_LOCATION: 'order:location',
  ORDER_NEW: 'order:new', // to the restaurant
  ORDER_READY: 'order:ready', // to delivery partners: a pickup is available
  ORDER_CLAIMED: 'order:claimed', // to delivery partners: remove it from the list
  NOTIFICATION_NEW: 'notification:new',
} as const;

export const ROOMS = {
  user: (userId: string) => `user:${userId}`,
  order: (orderId: string) => `order:${orderId}`,
  restaurant: (restaurantId: string) => `restaurant:${restaurantId}`,
  riders: 'riders',
  admins: 'admins',
} as const;

export interface OrderStatusPayload {
  orderId: string;
  orderNumber: number;
  status: string;
  note: string | null;
  at: string;
}

export interface OrderLocationPayload {
  orderId: string;
  latitude: number;
  longitude: number;
  at: string;
}
