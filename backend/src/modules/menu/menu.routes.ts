import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '@middlewares/auth.middleware';
import { MenuRepository } from './menu.repository';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';

// ─── Menu Router ──────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const menuRepository = new MenuRepository(prisma);
const menuService = new MenuService(menuRepository);
const menuController = new MenuController(menuService);

const router = Router();

router.get('/', menuController.getAll);
router.get('/:id', menuController.getById);
router.post('/', authenticate, menuController.create);
router.patch('/:id', authenticate, menuController.update);
router.delete('/:id', authenticate, menuController.remove);

export { router as menuRouter };
