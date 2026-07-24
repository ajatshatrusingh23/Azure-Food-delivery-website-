import { z } from 'zod';
import { NotificationType } from './notification.types';

// ─── Create Notification ──────────────────────────────────────────────────────

export const CreateNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(1000),
  data: z.record(z.unknown()).optional(),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;

// ─── Mark Read ────────────────────────────────────────────────────────────────

export const MarkReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).min(1),
});

export type MarkReadDto = z.infer<typeof MarkReadSchema>;
