import { z } from 'zod';
import { UserStatus } from '@modules/user/user.types';
import { RestaurantStatus } from '@modules/restaurant/restaurant.types';

// ─── Update User Status ───────────────────────────────────────────────────────

export const UpdateUserStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.nativeEnum(UserStatus),
});

export type UpdateUserStatusDto = z.infer<typeof UpdateUserStatusSchema>;

// ─── Update Restaurant Status ─────────────────────────────────────────────────

export const UpdateRestaurantStatusSchema = z.object({
  restaurantId: z.string().uuid(),
  status: z.nativeEnum(RestaurantStatus),
});

export type UpdateRestaurantStatusDto = z.infer<typeof UpdateRestaurantStatusSchema>;
