// ─── Socket Event Names ───────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Order events
  ORDER_CREATED: 'order:created',
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status_changed',
  ORDER_CANCELLED: 'order:cancelled',

  // Delivery events
  DELIVERY_LOCATION_UPDATE: 'delivery:location_update',
  DELIVERY_ASSIGNED: 'delivery:assigned',
  DELIVERY_COMPLETED: 'delivery:completed',

  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_READ: 'chat:read',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',

  // Restaurant events
  RESTAURANT_ONLINE: 'restaurant:online',
  RESTAURANT_OFFLINE: 'restaurant:offline',
} as const;

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

// ─── Socket Room Prefixes ─────────────────────────────────────────────────────

export const SOCKET_ROOMS = {
  user: (userId: string) => `user:${userId}`,
  order: (orderId: string) => `order:${orderId}`,
  restaurant: (restaurantId: string) => `restaurant:${restaurantId}`,
  chat: (chatId: string) => `chat:${chatId}`,
  admin: () => 'admin',
} as const;

// ─── Socket Event Payloads ────────────────────────────────────────────────────

export interface OrderStatusPayload {
  orderId: string;
  status: string;
  updatedAt: Date;
}

export interface LocationUpdatePayload {
  orderId: string;
  deliveryPartnerId: string;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface ChatMessagePayload {
  chatId: string;
  senderId: string;
  message: string;
  sentAt: Date;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  createdAt: Date;
}
