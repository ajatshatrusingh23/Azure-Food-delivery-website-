'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ErrorNote, Field, inputClass } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';
import { cx } from '@/lib/format';
import type { Role } from '@/lib/types';

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: 'CUSTOMER', label: 'Order food', hint: 'Customer' },
  { value: 'RESTAURANT_OWNER', label: 'List my restaurant', hint: 'Restaurant partner' },
  { value: 'DELIVERY_PARTNER', label: 'Deliver orders', hint: 'Delivery partner' },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'CUSTOMER' as Role });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await register({ ...form, phone: form.phone || undefined });
      router.push(homeFor(user.role));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-8">
      <h1 className="text-2xl font-black">Create your account</h1>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Account type">
          {ROLES.map((r) => (
            <button
              type="button"
              role="radio"
              aria-checked={form.role === r.value}
              key={r.value}
              onClick={() => setForm((f) => ({ ...f, role: r.value }))}
              className={cx('rounded-xl border p-3 text-left text-sm', form.role === r.value ? 'border-brand bg-brand-soft' : 'border-line')}
            >
              <span className="block font-semibold">{r.label}</span>
              <span className="text-xs text-muted">{r.hint}</span>
            </button>
          ))}
        </div>
        <Field label="Full name">
          <input className={inputClass} required autoComplete="name" value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" required autoComplete="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Mobile (optional)">
          <input className={inputClass} inputMode="numeric" autoComplete="tel-national" value={form.phone} onChange={set('phone')} placeholder="98765 43210" />
        </Field>
        <Field label="Password" hint="At least 8 characters, with a letter and a number">
          <input className={inputClass} type="password" required autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <ErrorNote error={error} />
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
        <p className="text-center text-sm text-ink-2">
          Already have an account? <Link href="/login" className="font-semibold text-brand">Log in</Link>
        </p>
      </form>
    </div>
  );
}
