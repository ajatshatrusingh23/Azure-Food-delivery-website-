import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@middlewares/auth.middleware';
import { ReviewRepository } from './review.repository';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';

// ─── Review Router ────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const reviewRepository = new ReviewRepository(prisma);
const reviewService = new ReviewService(reviewRepository);
const reviewController = new ReviewController(reviewService);

const router = Router();

router.get('/', reviewController.getAll);
router.get('/:id', reviewController.getById);
router.post('/', authenticate, reviewController.create);
router.patch('/:id', authenticate, reviewController.update);
router.delete('/:id', authenticate, reviewController.remove);

export { router as reviewRouter };
