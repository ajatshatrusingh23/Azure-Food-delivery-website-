import { z } from 'zod';
import { OrderStatus } from './order.types';

// ─── Order Item ───────────────────────────────────────────────────────────────

const OrderItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

// ─── Create Order ─────────────────────────────────────────────────────────────

export const CreateOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1),
  deliveryAddress: z.string().min(5).max(500),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;

// ─── Update Order Status ──────────────────────────────────────────────────────

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;
