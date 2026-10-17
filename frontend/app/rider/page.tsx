'use client';

import { Navigation, Play, Square } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { LiveMap } from '@/components/LiveMap';
import { Button, Empty, ErrorNote, Spinner } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ago, inr } from '@/lib/format';
import { useSocket, useSocketEvent } from '@/lib/socket';
import type { OrderListItem } from '@/lib/types';

interface Pickup {
  id: string;
  orderNumber: number;
  total: number;
  paymentMethod: 'ONLINE' | 'COD';
  placedAt: string;
  deliveryAddress: string;
  restaurant: { name: string; area: string; address: string };
  items: { quantity: number }[];
}

type Point = { latitude: number; longitude: number };

/** Sends the rider's position every 1.5 s: real GPS, or a simulated ride from restaurant to customer. */
function useLocationSharing(orderId: string | undefined, from: Point | null, to: Point | null) {
  const { socket } = useSocket();
  const [mode, setMode] = useState<'off' | 'simulate' | 'gps'>('off');
  const [position, setPosition] = useState<Point | null>(null);
  const [error, setError] = useState<string | null>(null);
  const step = useRef(0);

  useEffect(() => {
    if (mode === 'off' || !socket || !orderId) return;
    const send = (p: Point) => {
      setPosition(p);
      socket.emit('rider:location', { orderId, ...p }, (res: { ok: boolean; error?: string }) => {
        if (!res.ok && res.error !== 'too_frequent') setError(res.error ?? 'Location update rejected');
      });
    };
    if (mode === 'gps') {
      const watch = navigator.geolocation.watchPosition(
        (pos) => send({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => setError(err.message),
        { enableHighAccuracy: true, maximumAge: 1000 },
      );
      return () => navigator.geolocation.clearWatch(watch);
    }
    if (!from || !to) return;
    const timer = setInterval(() => {
      const t = Math.min(1, step.current / 30);
      step.current += 1;
      // Straight-line interpolation with a little wobble so it looks like a real ride.
      send({
        latitude: from.latitude + (to.latitude - from.latitude) * t + Math.sin(step.current) * 0.0003,
        longitude: from.longitude + (to.longitude - from.longitude) * t,
      });
      if (t >= 1) setMode('off');
    }, 1500);
    return () => clearInterval(timer);
  }, [mode, socket, orderId, from, to]);

  return { mode, setMode, position, error };
}

export default function RiderPage() {
  const { user, loading } = useAuth();
  const isRider = user?.role === 'DELIVERY_PARTNER';
  const { data: pickups, mutate: refreshPickups } = useSWR(isRider ? '/orders/available' : null, (p: string) => api.get<Pickup[]>(p));
  const { data: active, mutate: refreshActive } = useSWR(isRider ? '/orders/deliveries?scope=active' : null, (p: string) => api.page<OrderListItem>(p));
  const { data: past } = useSWR(isRider ? '/orders/deliveries?scope=past&limit=5' : null, (p: string) => api.page<OrderListItem>(p));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New pickups appear, and ones taken by other riders disappear, in real time.
  useSocketEvent('order:ready', useCallback(() => void refreshPickups(), [refreshPickups]));
  useSocketEvent('order:claimed', useCallback(() => void refreshPickups(), [refreshPickups]));

  const current = active?.data[0];
  const from = current?.restaurant.latitude !== undefined ? { latitude: current.restaurant.latitude, longitude: current.restaurant.longitude! } : null;
  const to = current?.deliveryLatitude !== undefined ? { latitude: current.deliveryLatitude, longitude: current.deliveryLongitude! } : null;
  const sharing = useLocationSharing(current?.id, from, to);

  if (loading) return <Spinner />;
  if (!isRider) return <Empty title="Delivery partners only"><Link href="/login" className="font-semibold text-brand">Log in as a delivery partner</Link></Empty>;

  const act = async (id: string, path: 'claim' | 'deliver') => {
    setBusy(id);
    setError(null);
    try {
      await api.post(`/orders/${id}/${path}`);
      if (path === 'deliver') sharing.setMode('off');
      await Promise.all([refreshPickups(), refreshActive()]);
    } catch (err) {
      setError(errorMessage(err));
      await refreshPickups();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <ErrorNote error={error ?? sharing.error} />
        {current ? (
          <section className="rounded-2xl border border-brand bg-surface p-5">
            <p className="text-xs font-semibold tracking-wide text-brand uppercase">Current delivery · #{current.orderNumber}</p>
            <h1 className="mt-1 text-xl font-black">{current.restaurant.name} → {current.customer?.name}</h1>
            <p className="mt-1 text-sm text-ink-2">Pick up: {current.restaurant.address}</p>
            <p className="text-sm text-ink-2">Drop: {current.deliveryAddress}</p>
            <p className="mt-1 text-sm font-semibold">{current.paymentMethod === 'COD' ? `Collect ${inr(current.total)} in cash` : 'Already paid online'}</p>
            {from && to && <div className="mt-4"><LiveMap restaurant={from} home={to} rider={sharing.position} /></div>}
            <div className="mt-4 flex flex-wrap gap-2">
              {sharing.mode === 'off' ? (
                <>
                  <Button variant="secondary" onClick={() => sharing.setMode('simulate')}><Play className="size-4" aria-hidden /> Simulate ride</Button>
                  <Button variant="secondary" onClick={() => sharing.setMode('gps')}><Navigation className="size-4" aria-hidden /> Share my GPS</Button>
                </>
              ) : (
                <Button variant="secondary" onClick={() => sharing.setMode('off')}><Square className="size-4" aria-hidden /> Stop sharing location</Button>
              )}
              <Button loading={busy === current.id} onClick={() => act(current.id, 'deliver')}>Mark delivered</Button>
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 text-lg font-bold">Pickups near you {pickups && <span className="font-normal text-muted">({pickups.length})</span>}</h2>
          {!pickups ? (
            <Spinner />
          ) : pickups.length ? (
            <ul className="space-y-3">
              {pickups.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-bold">{p.restaurant.name} <span className="font-normal text-muted">· {p.restaurant.area}</span></p>
                    <p className="truncate text-ink-2">To: {p.deliveryAddress}</p>
                    <p className="text-xs text-muted">#{p.orderNumber} · {p.items.reduce((n, i) => n + i.quantity, 0)} items · {inr(p.total)} · ready {ago(p.placedAt)}</p>
                  </div>
                  <Button disabled={!!current} loading={busy === p.id} onClick={() => act(p.id, 'claim')}>
                    {current ? 'Finish current first' : 'Accept'}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No pickups right now">New orders appear here the moment a restaurant marks them ready.</Empty>
          )}
        </section>
      </div>

      <aside>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-bold">Recent deliveries</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {past?.data.map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span className="truncate">#{o.orderNumber} · {o.restaurant.name}</span>
                <span className={o.status === 'DELIVERED' ? 'text-good' : 'text-bad'}>{o.status === 'DELIVERED' ? 'Delivered' : 'Cancelled'}</span>
              </li>
            ))}
            {!past?.data.length && <li className="text-muted">None yet</li>}
          </ul>
        </div>
      </aside>
    </div>
  );
}
