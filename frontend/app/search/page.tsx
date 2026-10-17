'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import useSWR from 'swr';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBox } from '@/components/SearchBox';
import { Empty, FoodMark, Rating, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { inr } from '@/lib/format';
import type { FoodType, RestaurantCard as Restaurant } from '@/lib/types';

interface SearchResult {
  matchType: 'fulltext' | 'fuzzy' | 'none';
  tookMs: number;
  restaurants: (Restaurant & { score: number })[];
  dishes: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    foodType: FoodType;
    isBestseller: boolean;
    restaurantName: string;
    restaurantSlug: string;
    restaurantArea: string;
    restaurantRating: number;
  }[];
}

function Results() {
  const q = useSearchParams().get('q') ?? '';
  const { data, isLoading } = useSWR(q ? `/search?q=${encodeURIComponent(q)}&limit=12` : null, (p: string) => api.get<SearchResult>(p));

  return (
    <>
      <div className="mb-8 max-w-2xl">
        <SearchBox initial={q} key={q} />
      </div>
      {isLoading && <Spinner label="Searching…" />}
      {data && (
        <>
          <p className="mb-6 text-sm text-ink-2">
            {data.matchType === 'fuzzy' && <>No exact match for “{q}”. Showing similar names. </>}
            {data.matchType === 'none' && <>Nothing found for “{q}”. </>}
            <span className="text-muted">({data.tookMs} ms)</span>
          </p>
          {data.restaurants.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-xl font-bold">Restaurants</h2>
              <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {data.restaurants.map((r) => (
                  <RestaurantCard key={r.id} r={r} />
                ))}
              </div>
            </section>
          )}
          {data.dishes.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Dishes</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {data.dishes.map((d) => (
                  <li key={d.id}>
                    <Link href={`/restaurants/${d.restaurantSlug}`} className="flex h-full gap-3 rounded-2xl border border-line bg-surface p-4 hover:border-brand">
                      <FoodMark type={d.foodType} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold">{d.name}</span>
                          <span className="shrink-0 font-semibold tabular">{inr(d.price)}</span>
                        </div>
                        {d.description && <p className="mt-0.5 line-clamp-1 text-sm text-ink-2">{d.description}</p>}
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                          <Rating value={d.restaurantRating} /> {d.restaurantName} · {d.restaurantArea}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.matchType === 'none' && <Empty title="No results">Try “biryani”, “dosa” or “pizza”.</Empty>}
        </>
      )}
    </>
  );
}

export default function SearchPage() {
  // useSearchParams needs a Suspense boundary so the rest of the page can be prerendered.
  return (
    <Suspense fallback={<Spinner />}>
      <Results />
    </Suspense>
  );
}
