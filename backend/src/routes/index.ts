import { Router } from 'express';
import { prisma } from '@config/database';
import { env } from '@config/env';
import { adminRouter } from '@modules/admin/admin.routes';
import { authRouter } from '@modules/auth/auth.routes';
import { notificationRouter } from '@modules/notifications/notification.routes';
import { orderRouter } from '@modules/orders/order.routes';
import { paymentRouter } from '@modules/payments/payment.routes';
import { restaurantRouter } from '@modules/restaurants/restaurant.routes';
import { searchRouter } from '@modules/search/search.routes';

export const apiRouter = Router();

/** Liveness + readiness: also checks the database is reachable. */
apiRouter.get('/health', async (_req, res) => {
  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', database: 'ok', dbLatencyMs: Date.now() - started, paymentProvider: env.payments.provider });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/restaurants', restaurantRouter);
apiRouter.use('/search', searchRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/payments', paymentRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/admin', adminRouter);
