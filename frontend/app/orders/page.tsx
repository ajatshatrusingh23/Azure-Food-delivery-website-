'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { Button, Empty, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx, dateOf, heroGradient, inr, STATUS_LABEL, statusTone } from '@/lib/format';
import type { OrderListItem } from '@/lib/types';

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSWR(user ? `/orders?page=${page}&limit=10` : null, (p: string) => api.page<OrderListItem>(p));

  if (loading || isLoading) return <Spinner />;
  if (!user) return <Empty title="Log in to see your orders"><Link className="font-semibold text-brand" href="/login">Log in</Link></Empty>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-black">Your orders</h1>
      {!data?.data.length ? (
        <Empty title="No orders yet">Your orders will appear here.</Empty>
      ) : (
        <ul className="space-y-3">
          {data.data.map((o) => (
            <li key={o.id}>
              <Link href={`/orders/${o.id}`} className="flex gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-brand">
                <div className="size-16 shrink-0 rounded-xl" style={{ background: heroGradient(o.restaurant.imageHue) }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">{o.restaurant.name}</p>
                      <p className="text-xs text-muted">#{o.orderNumber} · {dateOf(o.placedAt)} · {o.restaurant.area}</p>
                    </div>
                    <span className={cx('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold', statusTone(o.status))}>{STATUS_LABEL[o.status]}</span>
                  </div>
                  <p className="mt-2 truncate text-sm text-ink-2">{o.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}</p>
                  <p className="mt-1 text-sm font-semibold tabular">{inr(o.total)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {data && data.meta.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" disabled={!data.meta.hasPreviousPage} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="secondary" disabled={!data.meta.hasNextPage} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
