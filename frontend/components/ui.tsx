'use client';

import { Loader2, Star } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/format';
import type { FoodType } from '@/lib/types';

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; loading?: boolean }) {
  const styles = {
    primary: 'bg-brand text-brand-ink hover:opacity-90',
    secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
    ghost: 'text-ink-2 hover:bg-surface-2',
    danger: 'border border-line bg-surface text-bad hover:bg-surface-2',
  }[variant];
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-3 text-base' }[size];
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', styles, sizes, className)}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** The Indian veg / non-veg mark: a square with a dot (green) or triangle (red). */
export function FoodMark({ type }: { type: FoodType }) {
  const veg = type === 'VEG';
  const color = veg ? 'border-veg text-veg' : type === 'EGG' ? 'border-warn text-warn' : 'border-nonveg text-nonveg';
  return (
    <span className={cx('inline-grid size-4 shrink-0 place-items-center rounded-[3px] border-[1.5px]', color)} title={veg ? 'Veg' : type === 'EGG' ? 'Contains egg' : 'Non-veg'}>
      {veg ? <span className="size-2 rounded-full bg-current" /> : <span className="size-0 border-x-[4px] border-b-[7px] border-x-transparent border-b-current" />}
    </span>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <span className="inline-flex items-center gap-0.5 rounded-md bg-good px-1.5 py-0.5 text-xs text-white">
        {value.toFixed(1)} <Star className="size-3 fill-current" aria-hidden />
      </span>
      {count !== undefined && <span className="font-normal text-muted">({count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count})</span>}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
      <Loader2 className="size-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ErrorNote({ error }: { error?: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2 text-sm text-bad">
      {error}
    </p>
  );
}

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
