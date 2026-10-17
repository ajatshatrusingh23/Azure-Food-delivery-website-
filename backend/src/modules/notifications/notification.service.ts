import { prisma } from '@config/database';
import { logger } from '@config/logger';
import { SOCKET_EVENTS } from '@shared/socket-events';
import { realtime } from '@socket/realtime';
import { paginate, toSkipTake, type PaginationInput } from '@utils/pagination';

export const notificationService = {
  /** Stores the notification and pushes it live. Never fails the caller's operation. */
  async notify(userId: string, title: string, body: string, orderId?: string): Promise<void> {
    try {
      const notification = await prisma.notification.create({ data: { userId, title, body, orderId } });
      realtime.toUser(userId, SOCKET_EVENTS.NOTIFICATION_NEW, notification);
    } catch (err) {
      logger.warn(`Could not create notification for ${userId}: ${(err as Error).message}`);
    }
  },

  async list(userId: string, page: PaginationInput) {
    const [rows, total, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, ...toSkipTake(page) }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { ...paginate(rows, total, page), unread };
  },

  async markRead(userId: string, id: string): Promise<void> {
    // Scoped by userId: marking someone else's notification simply affects nothing.
    await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  },

  async markAllRead(userId: string): Promise<number> {
    const { count } = await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return count;
  },
};
