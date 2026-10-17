import { parseSearch } from './search.query';
import { searchRepository, type DishHit, type RestaurantHit } from './search.repository';

export interface SearchResult {
  query: string;
  /** "fulltext" = ranked text match; "fuzzy" = no exact match, showing similar names (typos). */
  matchType: 'fulltext' | 'fuzzy' | 'none';
  restaurants: RestaurantHit[];
  dishes: DishHit[];
  tookMs: number;
}

const numberify = <T extends { score: unknown }>(rows: T[]) => rows.map((r) => ({ ...r, score: Number(r.score) }));

export const searchService = {
  async search(raw: string, opts: { city?: string; limit?: number } = {}): Promise<SearchResult> {
    const started = performance.now();
    const limit = opts.limit ?? 12;
    const parsed = parseSearch(raw);
    const done = (matchType: SearchResult['matchType'], restaurants: RestaurantHit[], dishes: DishHit[]): SearchResult => ({
      query: raw,
      matchType,
      restaurants: numberify(restaurants),
      dishes: numberify(dishes),
      tookMs: Math.round((performance.now() - started) * 10) / 10,
    });
    if (!parsed) return done('none', [], []);

    const [restaurants, dishes] = await Promise.all([
      searchRepository.fullTextRestaurants(parsed, limit, opts.city),
      searchRepository.fullTextDishes(parsed, limit * 2, opts.city),
    ]);
    if (restaurants.length || dishes.length) return done('fulltext', restaurants, dishes);

    const fuzzy = await searchRepository.fuzzy(parsed, limit, opts.city);
    const found = fuzzy.restaurants.length || fuzzy.dishes.length;
    return done(found ? 'fuzzy' : 'none', fuzzy.restaurants, fuzzy.dishes);
  },

  /** Type-ahead: a few names only, called (debounced) on every keystroke. */
  async suggest(raw: string, city?: string) {
    const result = await this.search(raw, { city, limit: 5 });
    return {
      query: raw,
      matchType: result.matchType,
      suggestions: [
        ...result.restaurants.map((r) => ({ type: 'restaurant' as const, id: r.id, label: r.name, sublabel: `${r.cuisines.slice(0, 2).join(', ')} · ${r.area}`, slug: r.slug })),
        ...result.dishes.slice(0, 5).map((d) => ({ type: 'dish' as const, id: d.id, label: d.name, sublabel: `${d.restaurantName} · ${d.restaurantArea}`, slug: d.restaurantSlug })),
      ],
    };
  },
};
