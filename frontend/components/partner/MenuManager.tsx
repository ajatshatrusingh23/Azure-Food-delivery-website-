'use client';

import { Archive } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { Button, ErrorNote, Field, FoodMark, inputClass } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { cx } from '@/lib/format';
import type { FoodType, MenuItem, RestaurantDetail } from '@/lib/types';

const emptyItem = { name: '', category: '', price: '', foodType: 'VEG' as FoodType, description: '' };

export function MenuManager({ restaurantId }: { restaurantId: string }) {
  const { data, mutate } = useSWR(`/restaurants/${restaurantId}`, (p: string) => api.get<RestaurantDetail>(p));
  const [form, setForm] = useState(emptyItem);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The detail endpoint puts bestsellers in an extra "Recommended" section; skip it here.
  const sections = data?.menu.filter((s) => s.category !== 'Recommended') ?? [];

  const update = async (item: MenuItem, patch: Partial<Pick<MenuItem, 'price' | 'isAvailable' | 'isBestseller'>>) => {
    setError(null);
    try {
      await api.patch(`/restaurants/${restaurantId}/menu-items/${item.id}`, patch);
      await mutate();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/restaurants/${restaurantId}/menu-items`, {
        name: form.name,
        category: form.category,
        price: Math.round(Number(form.price) * 100),
        foodType: form.foodType,
        description: form.description || undefined,
      });
      setForm(emptyItem);
      await mutate();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <ErrorNote error={error} />
        {sections.map((section) => (
          <section key={section.category}>
            <h3 className="mb-2 font-bold">{section.category}</h3>
            <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
              {section.items.map((item) => (
                <li key={item.id} className={cx('flex flex-wrap items-center gap-3 p-3 text-sm', !item.isAvailable && 'opacity-60')}>
                  <FoodMark type={item.foodType} />
                  <span className="min-w-40 flex-1 font-medium">{item.name}</span>
                  <label className="flex items-center gap-1 text-ink-2">
                    ₹
                    <input
                      aria-label={`Price of ${item.name} in rupees`}
                      defaultValue={item.price / 100}
                      type="number"
                      min={1}
                      className="w-20 rounded-lg border border-line bg-surface px-2 py-1 tabular"
                      onBlur={(e) => {
                        const paise = Math.round(Number(e.target.value) * 100);
                        if (paise > 0 && paise !== item.price) void update(item, { price: paise });
                      }}
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-ink-2">
                    <input type="checkbox" checked={item.isAvailable} onChange={(e) => update(item, { isAvailable: e.target.checked })} />
                    In stock
                  </label>
                  <button
                    className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-bad"
                    aria-label={`Remove ${item.name} from the menu`}
                    onClick={async () => {
                      if (!confirm(`Remove ${item.name} from the menu?`)) return;
                      await api.del(`/restaurants/${restaurantId}/menu-items/${item.id}`);
                      await mutate();
                    }}
                  >
                    <Archive className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!sections.length && <p className="text-sm text-muted">No dishes yet. Add your first one.</p>}
      </div>

      <form onSubmit={add} className="h-fit space-y-3 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-bold">Add a dish</h3>
        <Field label="Name"><input className={inputClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Category"><input className={inputClass} required placeholder="Starters, Main Course…" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)"><input className={inputClass} required type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
          <Field label="Type">
            <select className={inputClass} value={form.foodType} onChange={(e) => setForm({ ...form, foodType: e.target.value as FoodType })}>
              <option value="VEG">Veg</option>
              <option value="NON_VEG">Non-veg</option>
              <option value="EGG">Egg</option>
            </select>
          </Field>
        </div>
        <Field label="Description"><input className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        <Button type="submit" loading={saving} className="w-full">Add dish</Button>
      </form>
    </div>
  );
}
