import { Router } from 'express';
import { z } from 'zod';
import { authenticate, currentUser } from '@middlewares/auth.middleware';
import { ApiResponse } from '@utils/ApiResponse';
import { paginationSchema } from '@utils/pagination';
import { notificationService } from './notification.service';

export const notificationRouter = Router();
notificationRouter.use(authenticate);

notificationRouter.get('/', async (req, res) => {
  const result = await notificationService.list(currentUser(req).id, paginationSchema.parse(req.query));
  ApiResponse.ok(res, { items: result.data, unread: result.unread }, 'Notifications', result.meta);
});

notificationRouter.patch('/:id/read', async (req, res) => {
  const { id } = z.object({ id: z.uuid() }).parse(req.params);
  await notificationService.markRead(currentUser(req).id, id);
  ApiResponse.noContent(res);
});

notificationRouter.post('/read-all', async (req, res) => {
  const updated = await notificationService.markAllRead(currentUser(req).id);
  ApiResponse.ok(res, { updated });
});
