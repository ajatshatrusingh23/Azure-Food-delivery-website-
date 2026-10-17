'use client';

import { ChevronLeft, ChevronRight, Leaf } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { RestaurantCard } from '@/components/RestaurantCard';
import { SearchBox } from '@/components/SearchBox';
import { Button, Empty, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { cx } from '@/lib/format';
import type { RestaurantCard as Restaurant } from '@/lib/types';

const SORTS = [
  { value: 'rating', label: 'Top rated' },
  { value: 'delivery_time', label: 'Fastest delivery' },
  { value: 'price_low', label: 'Cost: low to high' },
  { value: 'price_high', label: 'Cost: high to low' },
];

export default function HomePage() {
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [veg, setVeg] = useState(false);
  const [sort, setSort] = useState('rating');
  const [page, setPage] = useState(1);

  const { data: facets } = useSWR('/restaurants/facets', (p: string) => api.get<{ cuisines: { value: string; count: number }[] }>(p));
  const params = new URLSearchParams({ page: String(page), limit: '12', sort, ...(cuisine && { cuisine }), ...(veg && { veg: 'true' }) });
  const { data, isLoading, isValidating } = useSWR(`/restaurants?${params}`, (p: string) => api.page<Restaurant>(p), { keepPreviousData: true });

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <>
      <section className="mb-10 rounded-3xl bg-gradient-to-br from-brand to-sky-700 px-6 py-12 text-white sm:px-12">
        <p className="text-sm font-semibold tracking-wide uppercase opacity-80">Delivering in Bengaluru</p>
        <h1 className="mt-2 max-w-xl text-3xl font-black tracking-tight sm:text-5xl">Hungry? Your favourite food, tracked to your door.</h1>
        <div className="mt-6 max-w-2xl text-ink">
          <SearchBox large />
        </div>
      </section>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(facets?.cuisines ?? []).slice(0, 14).map((c) => (
          <button
            key={c.value}
            onClick={() => reset(() => setCuisine(cuisine === c.value ? null : c.value))}
            className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium', cuisine === c.value ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink-2 hover:bg-surface-2')}
          >
            {c.value}
          </button>
        ))}
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">
          {cuisine ? `${cuisine} restaurants` : 'Restaurants near you'}
          {data && <span className="ml-2 text-base font-normal text-muted">{data.meta.total}</span>}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => reset(() => setVeg(!veg))}
            aria-pressed={veg}
            className={cx('inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium', veg ? 'border-veg bg-veg/10 text-veg' : 'border-line bg-surface text-ink-2')}
          >
            <Leaf className="size-4" aria-hidden /> Pure veg
          </button>
          <select aria-label="Sort restaurants" value={sort} onChange={(e) => reset(() => setSort(e.target.value))} className="rounded-xl border border-line bg-surface px-3 py-2 text-sm">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : data?.data.length ? (
        <div className={cx('grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3', isValidating && 'opacity-60 transition-opacity')}>
          {data.data.map((r) => (
            <RestaurantCard key={r.id} r={r} />
          ))}
        </div>
      ) : (
        <Empty title="No restaurants match these filters">Try another cuisine or turn off Pure veg.</Empty>
      )}

      {data && data.meta.totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Pagination">
          <Button variant="secondary" disabled={!data.meta.hasPreviousPage} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="size-4" aria-hidden /> Previous
          </Button>
          <span className="text-sm text-ink-2 tabular">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button variant="secondary" disabled={!data.meta.hasNextPage} onClick={() => setPage(page + 1)}>
            Next <ChevronRight className="size-4" aria-hidden />
          </Button>
        </nav>
      )}
    </>
  );
}
