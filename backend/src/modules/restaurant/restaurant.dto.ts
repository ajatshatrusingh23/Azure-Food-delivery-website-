import { z } from 'zod';
import { CuisineType } from './restaurant.types';

// ─── Create Restaurant ────────────────────────────────────────────────────────

export const CreateRestaurantSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  address: z.string().min(5).max(500),
  city: z.string().min(2).max(100),
  cuisineType: z.nativeEnum(CuisineType),
  phone: z.string().min(10).max(15),
  email: z.string().email(),
});

export type CreateRestaurantDto = z.infer<typeof CreateRestaurantSchema>;

// ─── Update Restaurant ────────────────────────────────────────────────────────

export const UpdateRestaurantSchema = CreateRestaurantSchema.partial();

export type UpdateRestaurantDto = z.infer<typeof UpdateRestaurantSchema>;
