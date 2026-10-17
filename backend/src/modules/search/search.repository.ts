import { Prisma } from '@prisma/client';
import { prisma } from '@config/database';
import type { ParsedSearch } from './search.query';

export interface RestaurantHit {
  id: string;
  name: string;
  slug: string;
  cuisines: string[];
  area: string;
  city: string;
  priceForTwo: number;
  avgDeliveryMins: number;
  isOpen: boolean;
  isPureVeg: boolean;
  ratingAvg: number;
  ratingCount: number;
  imageHue: number;
  score: number;
}

export interface DishHit {
  id: string;
  name: string;
  description: string | null;
  price: number;
  foodType: 'VEG' | 'NON_VEG' | 'EGG';
  isBestseller: boolean;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  restaurantArea: string;
  restaurantRating: number;
  restaurantIsOpen: boolean;
  score: number;
}

/** The tsquery for a parsed search (see search.query.ts for why it is built this way). */
const tsQuery = (p: ParsedSearch) => Prisma.sql`(
  to_tsquery('english', ${p.head})
  && (to_tsquery('english', ${p.last}) || to_tsquery('simple', ${p.last + ':*'}))
)`;

const cityFilter = (city?: string) => (city ? Prisma.sql`AND lower(r.city) = lower(${city})` : Prisma.empty);

/** Popular places should win ties: weight text relevance by rating (and a little by popularity). */
const restaurantColumns = Prisma.sql`
  r.id, r.name, r.slug, r.cuisines, r.area, r.city, r."priceForTwo", r."avgDeliveryMins",
  r."isOpen", r."isPureVeg", r."ratingAvg", r."ratingCount", r."imageHue"`;

export const searchRepository = {
  /** Full-text match on name (weight A), cuisines/area (B) and description (C), using the GIN index. */
  fullTextRestaurants: (p: ParsedSearch, limit: number, city?: string) =>
    prisma.$queryRaw<RestaurantHit[]>`
      SELECT ${restaurantColumns},
             ts_rank_cd(r."searchVector", q.query) * (1 + r."ratingAvg" / 5) AS score
      FROM restaurants r, (SELECT ${tsQuery(p)} AS query) AS q
      WHERE r.status = 'ACTIVE' AND r."searchVector" @@ q.query ${cityFilter(city)}
      ORDER BY score DESC, r."ratingCount" DESC
      LIMIT ${limit}`,

  fullTextDishes: (p: ParsedSearch, limit: number, city?: string) =>
    prisma.$queryRaw<DishHit[]>`
      SELECT m.id, m.name, m.description, m.price, m."foodType", m."isBestseller",
             r.id AS "restaurantId", r.name AS "restaurantName", r.slug AS "restaurantSlug",
             r.area AS "restaurantArea", r."ratingAvg" AS "restaurantRating", r."isOpen" AS "restaurantIsOpen",
             ts_rank_cd(m."searchVector", q.query) * (1 + r."ratingAvg" / 5) * (CASE WHEN m."isBestseller" THEN 1.2 ELSE 1 END) AS score
      FROM menu_items m
      JOIN restaurants r ON r.id = m."restaurantId", (SELECT ${tsQuery(p)} AS query) AS q
      WHERE m."isArchived" = false AND m."isAvailable" = true AND r.status = 'ACTIVE'
        AND m."searchVector" @@ q.query ${cityFilter(city)}
      ORDER BY score DESC
      LIMIT ${limit}`,

  /**
   * Typo-tolerant fallback using trigram word similarity ("biriyani" ~ "Biryani",
   * "panner" ~ "Paneer"), served by the gin_trgm_ops indexes on name. Both queries run in
   * one transaction so the lowered similarity threshold (pg_trgm's default is 0.6) applies
   * to the same connection that runs them.
   */
  fuzzy: (p: ParsedSearch, limit: number, city?: string) =>
    prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('pg_trgm.word_similarity_threshold', '0.4', true)`;
      const restaurants = await tx.$queryRaw<RestaurantHit[]>`
        SELECT ${restaurantColumns}, word_similarity(${p.text}, r.name) AS score
        FROM restaurants r
        WHERE r.status = 'ACTIVE' AND ${p.text} <% r.name ${cityFilter(city)}
        ORDER BY score DESC, r."ratingAvg" DESC
        LIMIT ${limit}`;
      const dishes = await tx.$queryRaw<DishHit[]>`
        SELECT m.id, m.name, m.description, m.price, m."foodType", m."isBestseller",
               r.id AS "restaurantId", r.name AS "restaurantName", r.slug AS "restaurantSlug",
               r.area AS "restaurantArea", r."ratingAvg" AS "restaurantRating", r."isOpen" AS "restaurantIsOpen",
               word_similarity(${p.text}, m.name) AS score
        FROM menu_items m JOIN restaurants r ON r.id = m."restaurantId"
        WHERE m."isArchived" = false AND m."isAvailable" = true AND r.status = 'ACTIVE'
          AND ${p.text} <% m.name ${cityFilter(city)}
        ORDER BY score DESC, r."ratingAvg" DESC
        LIMIT ${limit}`;
      return { restaurants, dishes };
    }),
};
