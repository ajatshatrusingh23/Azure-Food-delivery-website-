import { Prisma } from '@prisma/client';
import { prisma } from '@config/database';
import { toSkipTake, type PaginationInput } from '@utils/pagination';
import type { ListRestaurantsQuery } from './restaurant.validator';

/** Fields shown on restaurant cards (never the search vector, never internal flags). */
export const restaurantCardSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  cuisines: true,
  area: true,
  city: true,
  priceForTwo: true,
  avgDeliveryMins: true,
  isOpen: true,
  isPureVeg: true,
  ratingAvg: true,
  ratingCount: true,
  imageHue: true,
  status: true,
} satisfies Prisma.RestaurantSelect;

export const menuItemSelect = {
  id: true,
  restaurantId: true,
  name: true,
  description: true,
  category: true,
  price: true,
  foodType: true,
  isAvailable: true,
  isBestseller: true,
} satisfies Prisma.MenuItemSelect;

const ORDER_BY: Record<ListRestaurantsQuery['sort'], Prisma.RestaurantOrderByWithRelationInput[]> = {
  rating: [{ ratingAvg: 'desc' }, { ratingCount: 'desc' }],
  delivery_time: [{ avgDeliveryMins: 'asc' }, { ratingAvg: 'desc' }],
  price_low: [{ priceForTwo: 'asc' }],
  price_high: [{ priceForTwo: 'desc' }],
  newest: [{ createdAt: 'desc' }],
};

export const restaurantRepository = {
  async listActive(q: ListRestaurantsQuery) {
    const where: Prisma.RestaurantWhereInput = {
      status: 'ACTIVE',
      ...(q.city && { city: { equals: q.city, mode: 'insensitive' } }),
      ...(q.area && { area: { equals: q.area, mode: 'insensitive' } }),
      ...(q.cuisine && { cuisines: { has: q.cuisine } }),
      ...(q.veg && { isPureVeg: true }),
      ...(q.openNow && { isOpen: true }),
    };
    // id as the final tie-breaker keeps page boundaries stable between requests.
    const orderBy = [...ORDER_BY[q.sort], { id: 'asc' as const }];
    const [rows, total] = await prisma.$transaction([
      prisma.restaurant.findMany({ where, orderBy, select: restaurantCardSelect, ...toSkipTake(q) }),
      prisma.restaurant.count({ where }),
    ]);
    return { rows, total };
  },

  findByRef: (ref: string) =>
    prisma.restaurant.findFirst({
      where: { OR: [{ slug: ref }, ...(isUuid(ref) ? [{ id: ref }] : [])] },
      select: {
        ...restaurantCardSelect,
        ownerId: true,
        address: true,
        phone: true,
        latitude: true,
        longitude: true,
        menuItems: {
          where: { isArchived: false },
          select: menuItemSelect,
          orderBy: [{ category: 'asc' }, { isBestseller: 'desc' }, { name: 'asc' }],
        },
      },
    }),

  findById: (id: string) => prisma.restaurant.findUnique({ where: { id } }),

  listByOwner: (ownerId: string) =>
    prisma.restaurant.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      select: { ...restaurantCardSelect, address: true, phone: true, latitude: true, longitude: true, createdAt: true },
    }),

  create: (data: Prisma.RestaurantUncheckedCreateInput) => prisma.restaurant.create({ data, select: restaurantCardSelect }),

  update: (id: string, data: Prisma.RestaurantUpdateInput) =>
    prisma.restaurant.update({ where: { id }, data, select: restaurantCardSelect }),

  /** Distinct cities and cuisines among active restaurants, for the filter bar. */
  async facets() {
    const [cities, cuisines] = await Promise.all([
      prisma.$queryRaw<{ value: string; count: bigint }[]>`
        SELECT city AS value, count(*) AS count FROM restaurants WHERE status = 'ACTIVE' GROUP BY city ORDER BY count DESC`,
      prisma.$queryRaw<{ value: string; count: bigint }[]>`
        SELECT c AS value, count(*) AS count FROM restaurants, unnest(cuisines) AS c
        WHERE status = 'ACTIVE' GROUP BY c ORDER BY count DESC LIMIT 30`,
    ]);
    const toPlain = (rows: { value: string; count: bigint }[]) => rows.map((r) => ({ value: r.value, count: Number(r.count) }));
    return { cities: toPlain(cities), cuisines: toPlain(cuisines) };
  },

  async listReviews(restaurantId: string, page: PaginationInput) {
    const where = { restaurantId };
    const [rows, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: { id: true, rating: true, comment: true, createdAt: true, customer: { select: { name: true } } },
        ...toSkipTake(page),
      }),
      prisma.review.count({ where }),
    ]);
    return { rows, total };
  },

  // ── Menu ──────────────────────────────────────────────────────────────────
  findMenuItem: (restaurantId: string, itemId: string) =>
    prisma.menuItem.findFirst({ where: { id: itemId, restaurantId, isArchived: false }, select: menuItemSelect }),

  createMenuItem: (data: Prisma.MenuItemUncheckedCreateInput) => prisma.menuItem.create({ data, select: menuItemSelect }),

  updateMenuItem: (itemId: string, data: Prisma.MenuItemUpdateInput) =>
    prisma.menuItem.update({ where: { id: itemId }, data, select: menuItemSelect }),
};

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
