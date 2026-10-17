'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ErrorNote, Field, inputClass } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { homeFor, useAuth } from '@/lib/auth';

const DEMO = [
  { label: 'Customer', email: 'customer@azure.dev' },
  { label: 'Restaurant', email: 'owner@azure.dev' },
  { label: 'Delivery', email: 'rider@azure.dev' },
  { label: 'Admin', email: 'admin@azure.dev' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent, creds = { email, password }) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(creds.email, creds.password);
      router.push(homeFor(user.role));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm pt-8">
      <h1 className="text-2xl font-black">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-2">Log in to order, manage your restaurant or deliver.</p>
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6">
        <Field label="Email">
          <input className={inputClass} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <input className={inputClass} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <ErrorNote error={error} />
        <Button type="submit" loading={loading} className="w-full">Log in</Button>
        <p className="text-center text-sm text-ink-2">
          New here? <Link href="/register" className="font-semibold text-brand">Create an account</Link>
        </p>
      </form>
      <div className="mt-6 rounded-2xl bg-surface-2 p-4 text-sm">
        <p className="font-semibold">Try a demo account <span className="font-normal text-muted">(password Azure@123)</span></p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO.map((d) => (
            <Button key={d.email} variant="secondary" size="sm" disabled={loading} onClick={(e) => submit(e, { email: d.email, password: 'Azure@123' })}>
              {d.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
