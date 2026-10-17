'use client';

import { Clock, Leaf, MapPin, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { Button, Empty, FoodMark, Rating, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { cx, heroGradient, inr } from '@/lib/format';
import type { MenuItem, RestaurantDetail } from '@/lib/types';

export default function RestaurantPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: r, error, isLoading } = useSWR(`/restaurants/${slug}`, (p: string) => api.get<RestaurantDetail>(p));
  const cart = useCart();
  const [vegOnly, setVegOnly] = useState(false);
  const [conflict, setConflict] = useState<MenuItem | null>(null);

  if (isLoading) return <Spinner />;
  if (error || !r) return <Empty title="Restaurant not found" />;

  const qty = (id: string) => (cart.restaurantId === r.id ? cart.lines.find((l) => l.menuItemId === id)?.quantity ?? 0 : 0);
  const add = (item: MenuItem, replace = false) => {
    const ok = cart.add({ id: r.id, name: r.name, slug: r.slug }, { menuItemId: item.id, name: item.name, price: item.price, foodType: item.foodType }, replace);
    if (!ok) setConflict(item);
  };
  const sections = r.menu
    .map((s) => ({ ...s, items: vegOnly ? s.items.filter((i) => i.foodType === 'VEG') : s.items }))
    .filter((s) => s.items.length);

  return (
    <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-8">
      <div>
        <header className="mb-6 overflow-hidden rounded-3xl border border-line bg-surface">
          <div className="h-36" style={{ background: heroGradient(r.imageHue) }} />
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-3xl font-black tracking-tight">{r.name}</h1>
                <p className="mt-1 text-ink-2">{r.cuisines.join(' · ')}</p>
              </div>
              <Rating value={r.ratingAvg} count={r.ratingCount} />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
              <span className="inline-flex items-center gap-1"><Clock className="size-4" aria-hidden /> {r.avgDeliveryMins} min</span>
              <span className="inline-flex items-center gap-1"><MapPin className="size-4" aria-hidden /> {r.address}</span>
              <span className="tabular">{inr(r.priceForTwo)} for two</span>
            </div>
            {!r.isOpen && <p className="mt-4 rounded-xl bg-warn/10 px-3 py-2 text-sm font-medium text-warn">This restaurant is closed right now. You can browse the menu.</p>}
            {r.status !== 'ACTIVE' && <p className="mt-4 rounded-xl bg-surface-2 px-3 py-2 text-sm">Preview: this restaurant is {r.status.toLowerCase()} and not visible to customers.</p>}
          </div>
        </header>

        <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} className="size-4 accent-[var(--veg)]" />
          <Leaf className="size-4 text-veg" aria-hidden /> Veg only
        </label>

        {sections.length === 0 && <Empty title="No dishes to show" />}
        {sections.map((section) => (
          <section key={section.category} className="mb-8">
            <h2 className="mb-3 text-lg font-bold">
              {section.category} <span className="font-normal text-muted">({section.items.length})</span>
            </h2>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {section.items.map((item) => (
                <li key={`${section.category}-${item.id}`} className={cx('flex gap-4 p-4', !item.isAvailable && 'opacity-50')}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FoodMark type={item.foodType} />
                      {item.isBestseller && <span className="text-xs font-bold text-warn">★ Bestseller</span>}
                    </div>
                    <h3 className="mt-1 font-semibold">{item.name}</h3>
                    <p className="font-medium tabular">{inr(item.price)}</p>
                    {item.description && <p className="mt-1 text-sm text-ink-2">{item.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center">
                    {!item.isAvailable ? (
                      <span className="text-xs font-semibold text-muted">Sold out</span>
                    ) : qty(item.id) > 0 ? (
                      <div className="flex items-center gap-3 rounded-xl border border-brand px-2 py-1 text-brand">
                        <button onClick={() => cart.setQuantity(item.id, qty(item.id) - 1)} aria-label={`Remove one ${item.name}`}><Minus className="size-4" /></button>
                        <span className="w-4 text-center font-bold tabular">{qty(item.id)}</span>
                        <button onClick={() => add(item)} aria-label={`Add one more ${item.name}`}><Plus className="size-4" /></button>
                      </div>
                    ) : (
                      <Button variant="secondary" size="sm" className="border-brand px-5 text-brand" disabled={!r.isOpen} onClick={() => add(item)}>
                        ADD
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-bold">Your cart</h2>
          {cart.count && cart.restaurantId === r.id ? (
            <>
              <ul className="mt-3 space-y-2 text-sm">
                {cart.lines.map((l) => (
                  <li key={l.menuItemId} className="flex justify-between gap-2">
                    <span className="truncate">{l.quantity} × {l.name}</span>
                    <span className="tabular">{inr(l.price * l.quantity)}</span>
                  </li>
                ))}
              </ul>
              <Link href="/cart" className="mt-4 flex justify-between rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-brand-ink">
                <span>Checkout</span> <span className="tabular">{inr(cart.subtotal)}</span>
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">Add dishes to start an order.</p>
          )}
        </div>
      </aside>

      {cart.count > 0 && cart.restaurantId === r.id && (
        <Link href="/cart" className="fixed inset-x-4 bottom-4 z-20 flex justify-between rounded-2xl bg-brand px-5 py-4 font-semibold text-brand-ink shadow-xl lg:hidden">
          <span>{cart.count} item{cart.count > 1 ? 's' : ''} · View cart</span> <span className="tabular">{inr(cart.subtotal)}</span>
        </Link>
      )}

      {conflict && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6">
            <h2 className="text-lg font-bold">Start a new cart?</h2>
            <p className="mt-2 text-sm text-ink-2">Your cart has dishes from {cart.restaurantName}. An order can only come from one restaurant.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setConflict(null)}>Keep cart</Button>
              <Button
                onClick={() => {
                  add(conflict, true);
                  setConflict(null);
                }}
              >
                Start new cart
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
