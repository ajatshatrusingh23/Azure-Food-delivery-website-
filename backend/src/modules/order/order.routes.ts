import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@middlewares/auth.middleware';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';

// ─── Order Router ─────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const orderRepository = new OrderRepository(prisma);
const orderService = new OrderService(orderRepository);
const orderController = new OrderController(orderService);

const router = Router();

router.get('/', authenticate, orderController.getAll);
router.get('/:id', authenticate, orderController.getById);
router.post('/', authenticate, orderController.create);
router.patch('/:id', authenticate, orderController.update);
router.delete('/:id', authenticate, orderController.remove);

export { router as orderRouter };
