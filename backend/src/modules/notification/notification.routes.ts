import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@middlewares/auth.middleware';
import { NotificationRepository } from './notification.repository';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';

// ─── Notification Router ──────────────────────────────────────────────────────

const prisma = new PrismaClient();
const notificationRepository = new NotificationRepository(prisma);
const notificationService = new NotificationService(notificationRepository);
const notificationController = new NotificationController(notificationService);

const router = Router();

router.get('/', authenticate, notificationController.getAll);
router.get('/:id', authenticate, notificationController.getById);
router.post('/', authenticate, notificationController.create);
router.patch('/:id', authenticate, notificationController.update);
router.delete('/:id', authenticate, notificationController.remove);

export { router as notificationRouter };
