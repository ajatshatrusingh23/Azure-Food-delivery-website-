// ─── Notification Types ───────────────────────────────────────────────────────

export enum NotificationType {
  ORDER = 'ORDER',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
  CHAT = 'CHAT',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}
