'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR from 'swr';
import { Button, Empty, ErrorNote, Spinner, inputClass } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx, dateOf, inr } from '@/lib/format';
import type { RestaurantCard, Role } from '@/lib/types';

interface Stats {
  usersByRole: Partial<Record<Role, number>>;
  restaurantsByStatus: Record<string, number>;
  ordersByStatus: Record<string, number>;
  deliveredValue: number;
  ordersToday: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-5 py-4">
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const { data: stats, mutate: refreshStats } = useSWR(isAdmin ? '/admin/stats' : null, (p: string) => api.get<Stats>(p));
  const { data: pending, mutate: refreshPending } = useSWR(isAdmin ? '/admin/restaurants?status=PENDING&limit=20' : null, (p: string) =>
    api.page<RestaurantCard & { address: string; owner: { name: string; email: string }; createdAt: string }>(p),
  );
  const [q, setQ] = useState('');
  const { data: users, mutate: refreshUsers } = useSWR(isAdmin ? `/admin/users?limit=15${q ? `&q=${encodeURIComponent(q)}` : ''}` : null, (p: string) => api.page<AdminUser>(p));
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Spinner />;
  if (!isAdmin) return <Empty title="Admins only"><Link href="/login" className="font-semibold text-brand">Log in as an admin</Link></Empty>;

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await Promise.all([refreshStats(), refreshPending(), refreshUsers()]);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const activeOrders = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].reduce((n, s) => n + (stats?.ordersByStatus[s] ?? 0), 0);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-black">Admin</h1>
      <ErrorNote error={error} />
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Orders today" value={stats.ordersToday} />
          <Stat label="Orders in progress" value={activeOrders} />
          <Stat label="Delivered order value" value={inr(stats.deliveredValue)} />
          <Stat label="Live restaurants" value={stats.restaurantsByStatus['ACTIVE'] ?? 0} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Restaurants waiting for approval {pending && <span className="font-normal text-muted">({pending.meta.total})</span>}</h2>
        {pending?.data.length ? (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {pending.data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-4 p-4 text-sm">
                <div className="min-w-0 flex-1">
                  <Link href={`/restaurants/${r.slug}`} className="font-bold text-brand">{r.name}</Link>
                  <p className="text-ink-2">{r.cuisines.join(', ')} · {r.address}</p>
                  <p className="text-xs text-muted">Owner {r.owner.name} ({r.owner.email}) · submitted {dateOf(r.createdAt)}</p>
                </div>
                <Button size="sm" onClick={() => run(() => api.patch(`/admin/restaurants/${r.id}/status`, { status: 'ACTIVE' }))}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => run(() => api.patch(`/admin/restaurants/${r.id}/status`, { status: 'REJECTED' }))}>Reject</Button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Nothing to review" />
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Users</h2>
          <input className={cx(inputClass, 'max-w-xs')} placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="px-4 py-2.5 font-medium">Name</th><th className="px-4 py-2.5 font-medium">Role</th><th className="px-4 py-2.5 font-medium">Joined</th><th className="px-4 py-2.5" /></tr>
            </thead>
            <tbody>
              {users?.data.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="px-4 py-2.5"><span className="font-medium">{u.name}</span><span className="block text-xs text-muted">{u.email}</span></td>
                  <td className="px-4 py-2.5 text-ink-2">{u.role.replace('_', ' ').toLowerCase()}</td>
                  <td className="px-4 py-2.5 text-ink-2">{dateOf(u.createdAt)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {u.id !== user.id && (
                      <Button
                        size="sm"
                        variant={u.status === 'ACTIVE' ? 'danger' : 'secondary'}
                        onClick={() => run(() => api.patch(`/admin/users/${u.id}/status`, { status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }))}
                      >
                        {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
