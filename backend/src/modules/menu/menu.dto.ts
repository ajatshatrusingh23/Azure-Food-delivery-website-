import { z } from 'zod';
import { FoodCategory } from './menu.types';

// ─── Create Menu Item ─────────────────────────────────────────────────────────

export const CreateMenuItemSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  category: z.nativeEnum(FoodCategory),
  restaurantId: z.string().uuid(),
});

export type CreateMenuItemDto = z.infer<typeof CreateMenuItemSchema>;

// ─── Update Menu Item ─────────────────────────────────────────────────────────

export const UpdateMenuItemSchema = CreateMenuItemSchema.partial();

export type UpdateMenuItemDto = z.infer<typeof UpdateMenuItemSchema>;
