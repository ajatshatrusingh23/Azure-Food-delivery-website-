import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@middlewares/auth.middleware';
import { PaymentRepository } from './payment.repository';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

// ─── Payment Router ───────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const paymentRepository = new PaymentRepository(prisma);
const paymentService = new PaymentService(paymentRepository);
const paymentController = new PaymentController(paymentService);

const router = Router();

router.get('/', authenticate, paymentController.getAll);
router.get('/:id', authenticate, paymentController.getById);
router.post('/', authenticate, paymentController.create);
router.patch('/:id', authenticate, paymentController.update);
router.delete('/:id', authenticate, paymentController.remove);

export { router as paymentRouter };
