import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@middlewares/auth.middleware';
import { RestaurantRepository } from './restaurant.repository';
import { RestaurantService } from './restaurant.service';
import { RestaurantController } from './restaurant.controller';

// ─── Restaurant Router ────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const restaurantRepository = new RestaurantRepository(prisma);
const restaurantService = new RestaurantService(restaurantRepository);
const restaurantController = new RestaurantController(restaurantService);

const router = Router();

router.get('/', restaurantController.getAll);
router.get('/:id', restaurantController.getById);
router.post('/', authenticate, restaurantController.create);
router.patch('/:id', authenticate, restaurantController.update);
router.delete('/:id', authenticate, restaurantController.remove);

export { router as restaurantRouter };
