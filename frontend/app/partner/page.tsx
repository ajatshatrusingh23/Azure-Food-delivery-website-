'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { MenuManager } from '@/components/partner/MenuManager';
import { OrdersBoard } from '@/components/partner/OrdersBoard';
import { Button, Empty, ErrorNote, Field, Spinner, inputClass } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx } from '@/lib/format';
import type { RestaurantCard } from '@/lib/types';

const STATUS_NOTE: Record<RestaurantCard['status'], string> = {
  PENDING: 'Waiting for admin approval. Customers can’t see it yet.',
  ACTIVE: 'Live on Azure',
  REJECTED: 'Not approved',
  SUSPENDED: 'Suspended by an admin',
};

function CreateRestaurant({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', cuisines: '', area: '', address: '', phone: '', priceForTwo: '400' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [k]: value }));
  };
  return (
    <form
      className="max-w-xl space-y-3 rounded-2xl border border-line bg-surface p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
          await api.post('/restaurants', {
            name: form.name,
            cuisines: form.cuisines.split(',').map((c) => c.trim()).filter(Boolean),
            area: form.area,
            city: 'Bengaluru',
            address: form.address,
            phone: form.phone,
            latitude: 12.9716 + (Math.random() - 0.5) * 0.08, // a real form would use a map picker
            longitude: 77.5946 + (Math.random() - 0.5) * 0.08,
            priceForTwo: Number(form.priceForTwo) * 100,
          });
          onCreated();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setSaving(false);
        }
      }}
    >
      <h2 className="text-lg font-bold">List your restaurant</h2>
      <Field label="Restaurant name"><input className={inputClass} required value={form.name} onChange={set('name')} /></Field>
      <Field label="Cuisines" hint="Comma separated, e.g. South Indian, Desserts"><input className={inputClass} required value={form.cuisines} onChange={set('cuisines')} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Area"><input className={inputClass} required placeholder="Koramangala" value={form.area} onChange={set('area')} /></Field>
        <Field label="Phone"><input className={inputClass} required inputMode="numeric" value={form.phone} onChange={set('phone')} /></Field>
      </div>
      <Field label="Address"><input className={inputClass} required value={form.address} onChange={set('address')} /></Field>
      <Field label="Cost for two (₹)"><input className={inputClass} required type="number" min={50} value={form.priceForTwo} onChange={set('priceForTwo')} /></Field>
      <ErrorNote error={error} />
      <Button type="submit" loading={saving}>Submit for approval</Button>
    </form>
  );
}

export default function PartnerPage() {
  const { user, loading } = useAuth();
  const { data: restaurants, mutate, isLoading } = useSWR(user?.role === 'RESTAURANT_OWNER' ? '/restaurants/mine' : null, (p: string) => api.get<RestaurantCard[]>(p));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'orders' | 'menu'>('orders');
  const [adding, setAdding] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && restaurants?.length) setSelectedId(restaurants[0]!.id);
  }, [restaurants, selectedId]);

  if (loading || isLoading) return <Spinner />;
  if (user?.role !== 'RESTAURANT_OWNER') return <Empty title="Restaurant partners only"><Link href="/login" className="font-semibold text-brand">Log in as a restaurant owner</Link></Empty>;
  if (!restaurants?.length || adding) return <CreateRestaurant onCreated={() => { setAdding(false); void mutate(); }} />;

  const selected = restaurants.find((r) => r.id === selectedId) ?? restaurants[0]!;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {restaurants.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            className={cx('rounded-xl border px-3 py-1.5 text-sm font-medium', r.id === selected.id ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink-2')}
          >
            {r.name} <span className="text-xs text-muted">· {r.area}</span>
          </button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>+ New restaurant</Button>
      </div>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <h1 className="text-2xl font-black">{selected.name}</h1>
          <p className={cx('text-sm', selected.status === 'ACTIVE' ? 'text-good' : 'text-warn')}>{STATUS_NOTE[selected.status]}</p>
        </div>
        <div className="flex items-center gap-3">
          <ErrorNote error={toggleError} />
          <button
            role="switch"
            aria-checked={selected.isOpen}
            onClick={async () => {
              try {
                await api.patch(`/restaurants/${selected.id}/open`, { isOpen: !selected.isOpen });
                await mutate();
              } catch (err) {
                setToggleError(errorMessage(err));
              }
            }}
            className={cx('flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold', selected.isOpen ? 'bg-good/10 text-good' : 'bg-surface-2 text-ink-2')}
          >
            <span className={cx('size-2.5 rounded-full', selected.isOpen ? 'bg-good' : 'bg-muted')} />
            {selected.isOpen ? 'Accepting orders' : 'Closed'}
          </button>
          <Link href={`/restaurants/${selected.slug}`} className="text-sm font-medium text-brand">View page</Link>
        </div>
      </header>

      <div className="mb-4 flex gap-1 rounded-xl bg-surface-2 p-1 sm:w-fit" role="tablist">
        {(['orders', 'menu'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('rounded-lg px-4 py-1.5 text-sm font-semibold', tab === t ? 'bg-surface shadow-sm' : 'text-ink-2')}>
            {t === 'orders' ? 'Live orders' : 'Menu'}
          </button>
        ))}
      </div>
      {tab === 'orders' ? <OrdersBoard restaurantId={selected.id} /> : <MenuManager restaurantId={selected.id} />}
    </>
  );
}
