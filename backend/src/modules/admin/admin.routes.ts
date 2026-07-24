import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { UserRole } from '@types/common.types';
import { AdminRepository } from './admin.repository';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

// ─── Admin Router ─────────────────────────────────────────────────────────────

const prisma = new PrismaClient();
const adminRepository = new AdminRepository(prisma);
const adminService = new AdminService(adminRepository);
const adminController = new AdminController(adminService);

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize(UserRole.ADMIN));

router.get('/', adminController.getAll);
router.get('/:id', adminController.getById);
router.post('/', adminController.create);
router.patch('/:id', adminController.update);
router.delete('/:id', adminController.remove);

export { router as adminRouter };
