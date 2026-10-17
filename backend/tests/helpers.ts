import { randomUUID } from 'crypto';
import request from 'supertest';
import type { FoodType, UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '@config/database';
import { hashPassword } from '@utils/password';

export const app = createApp();
export const api = '/api/v1';
export const PASSWORD = 'Passw0rd!';

export const resetDb = () =>
  prisma.$executeRawUnsafe(
    'TRUNCATE notifications, reviews, webhook_events, payments, order_events, order_items, orders, menu_items, restaurants, sessions, users RESTART IDENTITY CASCADE',
  );

export type Agent = ReturnType<typeof request.agent>;

/** Creates a user directly in the DB and returns a logged-in agent (it keeps the cookies). */
export const loginAs = async (role: UserRole, name = role.toLowerCase()) => {
  const email = `${name}-${randomUUID().slice(0, 8)}@test.dev`;
  const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(PASSWORD), role } });
  const agent = request.agent(app);
  const res = await agent.post(`${api}/auth/login`).send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user, accessToken: res.body.data.accessToken as string };
};

export const createRestaurant = async (ownerId: string, overrides: Record<string, unknown> = {}) =>
  prisma.restaurant.create({
    data: {
      ownerId,
      name: 'Test Biryani House',
      slug: `test-${randomUUID().slice(0, 8)}`,
      description: 'Hyderabadi dum biryani and kebabs',
      cuisines: ['Biryani', 'Hyderabadi'],
      area: 'Koramangala',
      city: 'Bengaluru',
      address: '12, 5th Cross, Koramangala',
      phone: '9876543210',
      latitude: 12.93,
      longitude: 77.62,
      priceForTwo: 50000,
      status: 'ACTIVE',
      ...overrides,
    },
  });

export const createMenuItem = async (restaurantId: string, overrides: { name?: string; price?: number; foodType?: FoodType; isAvailable?: boolean; category?: string; description?: string } = {}) =>
  prisma.menuItem.create({
    data: { restaurantId, name: 'Chicken Dum Biryani', category: 'Biryani', price: 29900, foodType: 'NON_VEG', description: 'Slow-cooked with saffron', ...overrides },
  });

/** A restaurant owned by a fresh owner, with two dishes. */
export const setupRestaurant = async () => {
  const owner = await loginAs('RESTAURANT_OWNER', 'owner');
  const restaurant = await createRestaurant(owner.user.id);
  const biryani = await createMenuItem(restaurant.id);
  const raita = await createMenuItem(restaurant.id, { name: 'Burani Raita', category: 'Sides', price: 5900, foodType: 'VEG' });
  return { owner, restaurant, biryani, raita };
};

export const orderBody = (restaurantId: string, items: { menuItemId: string; quantity: number }[], paymentMethod: 'ONLINE' | 'COD' = 'COD') => ({
  restaurantId,
  items,
  deliveryAddress: 'Flat 402, Lakeview Apartments, HSR Layout',
  paymentMethod,
});

export { prisma };
