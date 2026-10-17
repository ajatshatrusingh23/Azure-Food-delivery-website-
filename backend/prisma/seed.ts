/**
 * Demo data: Bengaluru restaurants with real dishes, demo accounts for every role, and some
 * delivered orders with reviews. Deterministic (seeded random), so every run is identical.
 *
 *   npm run db:seed                         ~120 restaurants
 *   SEED_RESTAURANTS=4000 npm run db:seed   large dataset for the search benchmark
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type OrderStatus, type Prisma } from '@prisma/client';
import { computePricing } from '../src/modules/orders/order.pricing';
import { AREAS, CUISINES, NAME_FIRST, NAME_SECOND } from './seed-data';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env['DATABASE_URL']! }) });
const RESTAURANTS = Number(process.env['SEED_RESTAURANTS'] ?? 120);
export const DEMO_PASSWORD = 'Azure@123';

// Small deterministic PRNG (mulberry32).
let state = 20260417;
const rand = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(items: T[]): T => items[Math.floor(rand() * items.length)]!;
const chance = (p: number) => rand() < p;
/** ₹287 -> 28900 paise (menu prices end in 9, like real menus). */
const menuPrice = (rupees: number) => (Math.max(3, Math.round((rupees * (0.9 + rand() * 0.2)) / 10)) * 10 - 1) * 100;

async function main() {
  if (process.env['NODE_ENV'] === 'production') throw new Error('Refusing to seed a production database');
  const started = Date.now();

  await prisma.$executeRawUnsafe(
    'TRUNCATE notifications, reviews, webhook_events, payments, order_events, order_items, orders, menu_items, restaurants, sessions, users RESTART IDENTITY CASCADE',
  );

  // ── Users ─────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const demo = {
    customer: { id: randomUUID(), name: 'Riya Sharma', email: 'customer@azure.dev', phone: '9876500001', role: 'CUSTOMER' as const },
    owner: { id: randomUUID(), name: 'Arjun Rao', email: 'owner@azure.dev', phone: '9876500002', role: 'RESTAURANT_OWNER' as const },
    rider: { id: randomUUID(), name: 'Imran Khan', email: 'rider@azure.dev', phone: '9876500003', role: 'DELIVERY_PARTNER' as const },
    rider2: { id: randomUUID(), name: 'Suresh Kumar', email: 'rider2@azure.dev', phone: '9876500004', role: 'DELIVERY_PARTNER' as const },
    admin: { id: randomUUID(), name: 'Meera Iyer', email: 'admin@azure.dev', phone: '9876500005', role: 'ADMIN' as const },
  };
  const owners = Array.from({ length: 20 }, (_, i) => ({ id: randomUUID(), name: `Owner ${i + 1}`, email: `owner${i + 1}@azure.dev`, role: 'RESTAURANT_OWNER' as const }));
  const customers = Array.from({ length: 30 }, (_, i) => ({ id: randomUUID(), name: `Customer ${i + 1}`, email: `customer${i + 1}@azure.dev`, role: 'CUSTOMER' as const }));
  await prisma.user.createMany({ data: [...Object.values(demo), ...owners, ...customers].map((u) => ({ ...u, passwordHash })) });

  // ── Restaurants & menus ───────────────────────────────────────────────────
  const cuisineKeys = Object.keys(CUISINES);
  const usedNames = new Set<string>();
  const restaurants: (Prisma.RestaurantCreateManyInput & { id: string })[] = [];
  const items: (Prisma.MenuItemCreateManyInput & { id: string })[] = [];

  for (let i = 0; i < RESTAURANTS; i++) {
    const area = AREAS[i % AREAS.length]!;
    const primary = CUISINES[cuisineKeys[i % cuisineKeys.length]!]!;
    const secondary = chance(0.3) ? CUISINES[pick(cuisineKeys)] : undefined;
    let name = `${pick(NAME_FIRST)} ${pick(NAME_SECOND)}`;
    for (let n = 2; usedNames.has(name); n++) name = `${name.replace(/ \d+$/, '')} ${n}`;
    usedNames.add(name);

    const id = randomUUID();
    const isDemoOwner = i < 6;
    restaurants.push({
      id,
      ownerId: isDemoOwner ? demo.owner.id : pick(owners).id,
      name,
      slug: `${name}-${area.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-') + `-${i}`,
      description: `${primary.tags.join(' & ')} favourites in ${area.name}.`,
      cuisines: [...new Set([...primary.tags, ...(secondary && secondary !== primary ? secondary.tags.slice(0, 1) : [])])],
      area: area.name,
      city: 'Bengaluru',
      address: `${between(1, 300)}, ${between(1, 20)}th Cross, ${area.name}, Bengaluru`,
      phone: `98${between(10000000, 99999999)}`,
      latitude: area.lat + (rand() - 0.5) * 0.02,
      longitude: area.lng + (rand() - 0.5) * 0.02,
      priceForTwo: Math.round(between(...primary.priceForTwo) / 50) * 50 * 100,
      avgDeliveryMins: between(4, 10) * 5,
      isOpen: isDemoOwner || chance(0.9),
      isPureVeg: Boolean(primary.pureVeg) && !secondary,
      // The demo owner's 6th restaurant and a few others wait for admin approval.
      status: i === 5 || (i > 5 && i <= 10) ? 'PENDING' : 'ACTIVE',
      ratingAvg: Math.round((3.6 + rand() * 1.2) * 10) / 10,
      ratingCount: between(25, 2400),
      imageHue: between(0, 359),
    });

    const dishes = [...primary.dishes, ...(secondary && secondary !== primary ? secondary.dishes.slice(0, 4) : [])];
    const bestsellers = new Set([pick(dishes)[0], pick(dishes)[0]]);
    for (const [dishName, category, rupees, foodType, description] of dishes) {
      if (primary.pureVeg && !secondary && foodType !== 'VEG') continue;
      items.push({
        id: randomUUID(),
        restaurantId: id,
        name: dishName,
        description,
        category,
        price: menuPrice(rupees),
        foodType,
        isAvailable: chance(0.95),
        isBestseller: bestsellers.has(dishName),
      });
    }
  }

  for (let i = 0; i < restaurants.length; i += 500) await prisma.restaurant.createMany({ data: restaurants.slice(i, i + 500) });
  for (let i = 0; i < items.length; i += 2000) await prisma.menuItem.createMany({ data: items.slice(i, i + 2000) });

  // ── Order history with reviews (for the demo customer and the demo owner's dashboard) ──
  const demoRestaurants = restaurants.filter((r) => r.ownerId === demo.owner.id && r.status === 'ACTIVE');
  const lifecycle: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const comments = ['Hot and fresh, loved it!', 'Generous portions.', 'Delivery was quick.', 'Tasty, will order again.', 'A bit spicy but great.', null];
  let orders = 0;
  for (let n = 0; n < 24; n++) {
    const restaurant = demoRestaurants[n % demoRestaurants.length]!;
    const customer = n < 8 ? demo.customer : pick(customers);
    const menu = items.filter((m) => m.restaurantId === restaurant.id && m.isAvailable);
    const lines = [...new Set(Array.from({ length: between(1, 3) }, () => pick(menu)))].map((m) => ({
      menuItemId: m.id,
      name: m.name,
      price: m.price,
      quantity: between(1, 2),
    }));
    const pricing = computePricing(lines);
    const placedAt = new Date(Date.now() - between(1, 20) * 24 * 3600_000 - between(0, 600) * 60_000);
    const at = (minutes: number) => new Date(placedAt.getTime() + minutes * 60_000);
    const online = chance(0.6);
    const order = await prisma.order.create({
      data: {
        customerId: customer.id,
        restaurantId: restaurant.id,
        deliveryPartnerId: chance(0.5) ? demo.rider.id : demo.rider2.id,
        status: 'DELIVERED',
        paymentMethod: online ? 'ONLINE' : 'COD',
        paymentStatus: 'PAID',
        ...pricing,
        deliveryAddress: `Flat ${between(101, 909)}, ${pick(AREAS).name}, Bengaluru`,
        deliveryLatitude: restaurant.latitude + 0.012,
        deliveryLongitude: restaurant.longitude + 0.016,
        placedAt,
        deliveredAt: at(38),
        items: { create: lines },
        events: { create: lifecycle.map((status, k) => ({ status, createdAt: at([0, 3, 18, 22, 38][k]!) })) },
        ...(online && {
          payment: {
            create: { provider: 'test', providerOrderId: `order_seed_${n}`, providerPaymentId: `pay_seed_${n}`, amount: pricing.total, status: 'PAID', paidAt: placedAt },
          },
        }),
      },
    });
    if (chance(0.8)) {
      await prisma.review.create({
        data: { orderId: order.id, customerId: customer.id, restaurantId: restaurant.id, rating: between(4, 5), comment: pick(comments), createdAt: at(90) },
      });
    }
    orders++;
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Seeded ${restaurants.length} restaurants, ${items.length} menu items, ${orders} past orders in ${seconds}s`);
  console.log(`Demo accounts (password ${DEMO_PASSWORD}): customer@azure.dev, owner@azure.dev, rider@azure.dev, admin@azure.dev`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
