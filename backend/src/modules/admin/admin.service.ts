import type { RestaurantStatus, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '@config/database';
import { ApiError } from '@utils/ApiError';
import { paginate, toSkipTake, type PaginationInput } from '@utils/pagination';
import type { AuthUser } from '@shared/types';
import { authService } from '@modules/auth/auth.service';
import { notificationService } from '@modules/notifications/notification.service';
import { restaurantCardSelect } from '@modules/restaurants/restaurant.repository';

const countBy = <K extends string>(rows: { key: K; _count: { _all: number } }[]) =>
  Object.fromEntries(rows.map((r) => [r.key, r._count._all])) as Partial<Record<K, number>>;

export const adminService = {
  async stats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [users, restaurants, orders, gmv, today, daily] = await Promise.all([
      prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      prisma.restaurant.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.aggregate({ where: { status: 'DELIVERED' }, _sum: { total: true } }),
      prisma.order.count({ where: { placedAt: { gte: startOfToday } } }),
      prisma.$queryRaw<{ day: Date; orders: bigint; delivered_value: bigint | null }[]>`
        SELECT date_trunc('day', "placedAt" AT TIME ZONE 'Asia/Kolkata') AS day,
               count(*) AS orders,
               sum(total) FILTER (WHERE status = 'DELIVERED') AS delivered_value
        FROM orders
        WHERE "placedAt" > now() - interval '7 days'
        GROUP BY 1 ORDER BY 1`,
    ]);
    return {
      usersByRole: countBy(users.map((u) => ({ key: u.role, _count: u._count }))),
      restaurantsByStatus: countBy(restaurants.map((r) => ({ key: r.status, _count: r._count }))),
      ordersByStatus: countBy(orders.map((o) => ({ key: o.status, _count: o._count }))),
      deliveredValue: gmv._sum.total ?? 0,
      ordersToday: today,
      last7Days: daily.map((d) => ({ day: d.day.toISOString().slice(0, 10), orders: Number(d.orders), deliveredValue: Number(d.delivered_value ?? 0) })),
    };
  },

  async listRestaurants(status: RestaurantStatus | undefined, page: PaginationInput) {
    const where = status ? { status } : {};
    const [rows, total] = await prisma.$transaction([
      prisma.restaurant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { ...restaurantCardSelect, address: true, phone: true, createdAt: true, owner: { select: { name: true, email: true } } },
        ...toSkipTake(page),
      }),
      prisma.restaurant.count({ where }),
    ]);
    return paginate(rows, total, page);
  },

  async setRestaurantStatus(id: string, status: Exclude<RestaurantStatus, 'PENDING'>) {
    const restaurant = await prisma.restaurant.update({ where: { id }, data: { status }, select: { ...restaurantCardSelect, ownerId: true } });
    const message = { ACTIVE: 'is now live on Azure', REJECTED: 'was not approved', SUSPENDED: 'has been suspended' }[status];
    await notificationService.notify(restaurant.ownerId, `${restaurant.name} ${message}`, 'Open your dashboard for details.');
    const { ownerId: _ownerId, ...rest } = restaurant;
    return rest;
  },

  async listUsers(filters: { role?: UserRole; q?: string }, page: PaginationInput) {
    const where = {
      ...(filters.role && { role: filters.role }),
      ...(filters.q && {
        OR: [
          { name: { contains: filters.q, mode: 'insensitive' as const } },
          { email: { contains: filters.q, mode: 'insensitive' as const } },
        ],
      }),
    };
    const [rows, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, phone: true, role: true, status: true, createdAt: true },
        ...toSkipTake(page),
      }),
      prisma.user.count({ where }),
    ]);
    return paginate(rows, total, page);
  },

  /** Suspending a user also ends all their sessions, so it takes effect immediately. */
  async setUserStatus(admin: AuthUser, userId: string, status: UserStatus) {
    if (admin.id === userId) throw ApiError.badRequest('You cannot change your own status');
    const user = await prisma.user.update({ where: { id: userId }, data: { status }, select: { id: true, name: true, status: true } });
    if (status === 'SUSPENDED') await authService.revokeAllSessions(userId);
    return user;
  },
};
