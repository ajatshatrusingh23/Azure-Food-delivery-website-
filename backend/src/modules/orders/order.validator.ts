import { z } from 'zod';
import { paginationSchema } from '@utils/pagination';

// Note what is NOT accepted: prices, totals or statuses. Those come from the server.
const cartItem = z.object({
  menuItemId: z.uuid(),
  quantity: z.number().int().min(1).max(20),
});

export const cartSchema = z.object({
  restaurantId: z.uuid(),
  items: z.array(cartItem).min(1, 'Your cart is empty').max(30),
});

export const placeOrderSchema = cartSchema.extend({
  deliveryAddress: z.string().trim().min(10, 'Enter a complete delivery address').max(200),
  deliveryLatitude: z.number().min(-90).max(90).optional(),
  deliveryLongitude: z.number().min(-180).max(180).optional(),
  paymentMethod: z.enum(['ONLINE', 'COD']),
  notes: z.string().trim().max(200).optional(),
});

export const idempotencyKeySchema = z.string().trim().min(8).max(100).optional();

export const orderIdParam = z.object({ id: z.uuid() });

export const listOrdersQuery = paginationSchema.extend({
  scope: z.enum(['active', 'past', 'all']).default('all'),
});

export const restaurantOrdersQuery = paginationSchema.extend({
  restaurantId: z.uuid().optional(),
  scope: z.enum(['active', 'past', 'all']).default('active'),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PREPARING', 'READY']),
});

export const cancelSchema = z.object({
  reason: z.string().trim().min(3).max(200).optional(),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export type CartInput = z.infer<typeof cartSchema>;
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
