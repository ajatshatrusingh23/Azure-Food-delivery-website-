import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize, currentUser } from '@middlewares/auth.middleware';
import { ApiResponse } from '@utils/ApiResponse';
import { paginationSchema } from '@utils/pagination';
import { adminService } from './admin.service';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('ADMIN'));

const idParam = z.object({ id: z.uuid() });

adminRouter.get('/stats', async (_req, res) => {
  ApiResponse.ok(res, await adminService.stats());
});

adminRouter.get('/restaurants', async (req, res) => {
  const { status, ...page } = paginationSchema.extend({ status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED']).optional() }).parse(req.query);
  const result = await adminService.listRestaurants(status, page);
  ApiResponse.ok(res, result.data, 'Restaurants', result.meta);
});

adminRouter.patch('/restaurants/:id/status', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { status } = z.object({ status: z.enum(['ACTIVE', 'REJECTED', 'SUSPENDED']) }).parse(req.body);
  ApiResponse.ok(res, await adminService.setRestaurantStatus(id, status));
});

adminRouter.get('/users', async (req, res) => {
  const { role, q, ...page } = paginationSchema
    .extend({ role: z.enum(['CUSTOMER', 'RESTAURANT_OWNER', 'DELIVERY_PARTNER', 'ADMIN']).optional(), q: z.string().trim().max(80).optional() })
    .parse(req.query);
  const result = await adminService.listUsers({ role, q }, page);
  ApiResponse.ok(res, result.data, 'Users', result.meta);
});

adminRouter.patch('/users/:id/status', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { status } = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }).parse(req.body);
  ApiResponse.ok(res, await adminService.setUserStatus(currentUser(req), id, status));
});
