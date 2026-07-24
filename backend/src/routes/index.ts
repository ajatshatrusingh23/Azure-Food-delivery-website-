import { Router } from 'express';
import { authRouter } from '@modules/auth';
import { userRouter } from '@modules/user';
import { restaurantRouter } from '@modules/restaurant';
import { menuRouter } from '@modules/menu';
import { orderRouter } from '@modules/order';
import { reviewRouter } from '@modules/review';
import { paymentRouter } from '@modules/payment';
import { notificationRouter } from '@modules/notification';
import { chatRouter } from '@modules/chat';
import { adminRouter } from '@modules/admin';

const router = Router();

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy', timestamp: new Date() });
});

// ── Feature routes ────────────────────────────────────────────────────────────
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/restaurants', restaurantRouter);
router.use('/menus', menuRouter);
router.use('/orders', orderRouter);
router.use('/reviews', reviewRouter);
router.use('/payments', paymentRouter);
router.use('/notifications', notificationRouter);
router.use('/chats', chatRouter);
router.use('/admin', adminRouter);

export default router;
