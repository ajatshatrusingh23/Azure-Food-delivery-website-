import { z } from 'zod';
import { paginationSchema } from '@utils/pagination';

const booleanQuery = z.enum(['true', 'false']).transform((v) => v === 'true');

export const listRestaurantsQuery = paginationSchema.extend({
  city: z.string().trim().min(1).max(60).optional(),
  area: z.string().trim().min(1).max(60).optional(),
  cuisine: z.string().trim().min(1).max(40).optional(),
  veg: booleanQuery.optional(),
  openNow: booleanQuery.optional(),
  sort: z.enum(['rating', 'delivery_time', 'price_low', 'price_high', 'newest']).default('rating'),
});

export const restaurantIdParam = z.object({ id: z.uuid() });
export const restaurantRefParam = z.object({ ref: z.string().min(1).max(120) }); // id or slug
export const menuItemParams = z.object({ id: z.uuid(), itemId: z.uuid() });

const rupeesInPaise = z.number().int().positive().max(10_000_00); // up to ₹10,000

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  cuisines: z.array(z.string().trim().min(2).max(30)).min(1).max(6),
  area: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  address: z.string().trim().min(5).max(200),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  priceForTwo: rupeesInPaise,
  avgDeliveryMins: z.number().int().min(10).max(120).default(30),
  isPureVeg: z.boolean().default(false),
});

export const updateRestaurantSchema = createRestaurantSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Provide at least one field to update',
});

export const setOpenSchema = z.object({ isOpen: z.boolean() });

export const createMenuItemSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).optional(),
  category: z.string().trim().min(2).max(40),
  price: z.number().int().min(100, 'Minimum price is ₹1').max(50_000_00),
  foodType: z.enum(['VEG', 'NON_VEG', 'EGG']).default('VEG'),
  isAvailable: z.boolean().default(true),
  isBestseller: z.boolean().default(false),
});

export const updateMenuItemSchema = createMenuItemSchema.partial().refine((v) => Object.keys(v).length > 0, {
  message: 'Provide at least one field to update',
});

export type ListRestaurantsQuery = z.infer<typeof listRestaurantsQuery>;
export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
