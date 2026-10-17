/**
 * Search benchmark. Run against a large seeded database, e.g.:
 *   DATABASE_URL=.../azure_bench SEED_RESTAURANTS=5000 npm run db:seed
 *   DATABASE_URL=.../azure_bench npm run bench:search
 * Compares the GIN-indexed full-text search with a naive ILIKE '%term%' query. The ILIKE
 * baseline is ordered (like real results must be), otherwise LIMIT lets it stop early.
 */
import 'dotenv/config';
import { prisma } from '../src/config/database';
import { searchService } from '../src/modules/search/search.service';

const QUERIES = ['biryani', 'paneer', 'dosa', 'chicken tikka', 'noodles', 'pizza', 'butter', 'masala dosa', 'kebab', 'brownie', 'fried rice', 'lassi'];
const ROUNDS = 25;

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!;
const summarize = (samples: number[]) => {
  const s = [...samples].sort((a, b) => a - b);
  return { p50: +percentile(s, 50).toFixed(2), p95: +percentile(s, 95).toFixed(2), max: +s[s.length - 1]!.toFixed(2) };
};

async function main() {
  const [items, restaurants] = await Promise.all([prisma.menuItem.count(), prisma.restaurant.count()]);
  console.log(`Dataset: ${restaurants.toLocaleString('en-IN')} restaurants, ${items.toLocaleString('en-IN')} menu items\n`);

  // Warm-up (connection pool, plan cache)
  for (const q of QUERIES) await searchService.search(q);

  const indexed: number[] = [];
  for (let r = 0; r < ROUNDS; r++) {
    for (const q of QUERIES) {
      const t = performance.now();
      await searchService.search(q);
      indexed.push(performance.now() - t);
    }
  }

  const naive: number[] = [];
  for (let r = 0; r < 5; r++) {
    for (const q of QUERIES) {
      const pattern = `%${q}%`;
      const t = performance.now();
      await prisma.$queryRaw`
        SELECT m.id FROM menu_items m JOIN restaurants r ON r.id = m."restaurantId"
        WHERE r.status = 'ACTIVE' AND (m.name ILIKE ${pattern} OR m.description ILIKE ${pattern} OR m.category ILIKE ${pattern})
        ORDER BY r."ratingAvg" DESC
        LIMIT 24`;
      naive.push(performance.now() - t);
    }
  }

  const plan = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
    `EXPLAIN ANALYZE SELECT id FROM menu_items WHERE "searchVector" @@ (to_tsquery('english', 'chicken') && to_tsquery('simple', 'tikka:*'))`,
  );
  const usesIndex = plan.some((row) => row['QUERY PLAN'].includes('menu_items_searchVector_idx'));

  const searchStats = summarize(indexed);
  const scanStats = summarize(naive);
  console.log(`Full-text search (GIN index), end to end through the service, ${indexed.length} queries:`);
  console.log(`  p50 ${searchStats.p50} ms · p95 ${searchStats.p95} ms · max ${searchStats.max} ms`);
  console.log(`Naive ILIKE '%term%' (dishes only, ordered by rating so it must scan every match), ${naive.length} queries:`);
  console.log(`  p50 ${scanStats.p50} ms · p95 ${scanStats.p95} ms`);
  console.log(`\nQuery plan uses the GIN index: ${usesIndex ? 'yes' : 'NO'}`);
  console.log(plan.map((r) => `  ${r['QUERY PLAN']}`).slice(0, 6).join('\n'));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
