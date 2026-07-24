import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@middlewares/auth.middleware';
import { ChatRepository } from './chat.repository';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';

// ─── Chat Router ──────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const chatRepository = new ChatRepository(prisma);
const chatService = new ChatService(chatRepository);
const chatController = new ChatController(chatService);

const router = Router();

router.get('/', authenticate, chatController.getAll);
router.get('/:id', authenticate, chatController.getById);
router.post('/', authenticate, chatController.create);
router.patch('/:id', authenticate, chatController.update);
router.delete('/:id', authenticate, chatController.remove);

export { router as chatRouter };
