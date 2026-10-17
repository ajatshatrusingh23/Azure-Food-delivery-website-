'use client';

import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { Button, ErrorNote } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { ago, cx, inr } from '@/lib/format';
import { useSocketEvent } from '@/lib/socket';
import type { OrderListItem, OrderStatus } from '@/lib/types';

const COLUMNS: { status: OrderStatus; title: string; action?: { to: 'PREPARING' | 'READY'; label: string } }[] = [
  { status: 'CONFIRMED', title: 'New', action: { to: 'PREPARING', label: 'Start preparing' } },
  { status: 'PREPARING', title: 'Preparing', action: { to: 'READY', label: 'Mark ready' } },
  { status: 'READY', title: 'Waiting for pickup' },
  { status: 'OUT_FOR_DELIVERY', title: 'Out for delivery' },
];

export function OrdersBoard({ restaurantId }: { restaurantId: string }) {
  const key = `/orders/restaurant?restaurantId=${restaurantId}&scope=active&limit=50`;
  const { data, mutate } = useSWR(key, (p: string) => api.page<OrderListItem>(p));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<number>>(new Set());

  // New orders and every status change arrive over the socket: no polling.
  useSocketEvent<{ orderNumber: number }>(
    'order:new',
    useCallback(
      (p) => {
        setFresh((s) => new Set(s).add(p.orderNumber));
        void mutate();
      },
      [mutate],
    ),
  );
  useSocketEvent('order:status', useCallback(() => void mutate(), [mutate]));

  const move = async (orderId: string, to: 'PREPARING' | 'READY') => {
    setBusy(orderId);
    setError(null);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: to });
      await mutate();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const cancel = async (orderId: string) => {
    const reason = prompt('Why are you cancelling? The customer will see this.', 'Item out of stock');
    if (!reason) return;
    try {
      await api.post(`/orders/${orderId}/cancel`, { reason });
      await mutate();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <ErrorNote error={error} />
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const orders = data?.data.filter((o) => o.status === col.status) ?? [];
          return (
            <section key={col.status} className="rounded-2xl bg-surface-2 p-3">
              <h3 className="mb-3 flex items-center justify-between px-1 text-sm font-bold">
                {col.title} <span className="rounded-full bg-surface px-2 text-xs text-muted">{orders.length}</span>
              </h3>
              <ul className="space-y-3">
                {orders.map((o) => (
                  <li key={o.id} className={cx('rounded-xl border bg-surface p-3 text-sm', fresh.has(o.orderNumber) && col.status === 'CONFIRMED' ? 'border-brand ring-2 ring-brand/30' : 'border-line')}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">#{o.orderNumber}</span>
                      <span className="text-xs text-muted">{ago(o.placedAt)}</span>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-ink-2">
                      {o.items.map((i, idx) => <li key={idx}>{i.quantity} × {i.name}</li>)}
                    </ul>
                    {o.notes && <p className="mt-2 rounded-lg bg-warn/10 px-2 py-1 text-xs text-warn">“{o.notes}”</p>}
                    <p className="mt-2 text-xs text-muted">
                      {inr(o.total)} · {o.paymentMethod === 'COD' ? 'Cash' : 'Paid online'} · {o.customer?.name}
                      {o.deliveryPartner && ` · rider ${o.deliveryPartner.name}`}
                    </p>
                    {col.action && (
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" className="flex-1" loading={busy === o.id} onClick={() => move(o.id, col.action!.to)}>
                          {col.action.label}
                        </Button>
                        {col.status === 'CONFIRMED' && (
                          <Button size="sm" variant="ghost" onClick={() => cancel(o.id)}>Reject</Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {!orders.length && <li className="px-1 py-4 text-center text-xs text-muted">No orders</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
