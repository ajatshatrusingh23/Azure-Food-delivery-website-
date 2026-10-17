'use client';

import { Bell, LogOut, Receipt, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { ago, cx } from '@/lib/format';
import { useSocket, useSocketEvent } from '@/lib/socket';
import type { Notification } from '@/lib/types';

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, mutate } = useSWR('/notifications?limit=8', (p: string) => api.get<{ items: Notification[]; unread: number }>(p));
  const router = useRouter();

  // A new notification pushed over the socket refreshes the list instantly.
  useSocketEvent('notification:new', useCallback(() => void mutate(), [mutate]));

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative rounded-xl p-2 text-ink-2 hover:bg-surface-2" aria-label={`Notifications${data?.unread ? `, ${data.unread} unread` : ''}`}>
        <Bell className="size-5" />
        {!!data?.unread && (
          <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-white">{data.unread}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-line bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {!!data?.unread && (
              <button className="text-xs font-medium text-brand" onClick={async () => { await api.post('/notifications/read-all'); await mutate(); }}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {data?.items.length ? (
              data.items.map((n) => (
                <li key={n.id}>
                  <button
                    className={cx('block w-full px-4 py-3 text-left hover:bg-surface-2', !n.isRead && 'bg-brand-soft/60')}
                    onClick={async () => {
                      setOpen(false);
                      if (!n.isRead) await api.patch(`/notifications/${n.id}/read`).then(() => mutate());
                      if (n.orderId) router.push(`/orders/${n.orderId}`);
                    }}
                  >
                    <span className="block text-sm font-medium">{n.title}</span>
                    <span className="block text-xs text-ink-2">{n.body}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{ago(n.createdAt)}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-sm text-muted">Nothing yet</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

const ROLE_LINKS = {
  CUSTOMER: [{ href: '/orders', label: 'Orders', icon: Receipt }],
  RESTAURANT_OWNER: [{ href: '/partner', label: 'Restaurant dashboard', icon: null }],
  DELIVERY_PARTNER: [{ href: '/rider', label: 'Deliveries', icon: null }],
  ADMIN: [{ href: '/admin', label: 'Admin', icon: null }],
} as const;

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { connected } = useSocket();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-brand">
          <span className="grid size-8 place-items-center rounded-xl bg-brand text-base text-brand-ink">A</span>
          Azure
        </Link>
        <nav className="ml-auto flex items-center gap-1">
          {user &&
            ROLE_LINKS[user.role].map((l) => (
              <Link key={l.href} href={l.href} className={cx('rounded-xl px-3 py-2 text-sm font-medium hover:bg-surface-2', pathname.startsWith(l.href) ? 'text-brand' : 'text-ink-2')}>
                {l.label}
              </Link>
            ))}
          {(!user || user.role === 'CUSTOMER') && (
            <Link href="/cart" className="relative rounded-xl p-2 text-ink-2 hover:bg-surface-2" aria-label={`Cart, ${count} items`}>
              <ShoppingBag className="size-5" />
              {count > 0 && <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-ink">{count}</span>}
            </Link>
          )}
          {user ? (
            <>
              <NotificationBell />
              <span className="hidden items-center gap-1.5 pl-2 text-sm text-ink-2 sm:flex" title={connected ? 'Live updates connected' : 'Connecting…'}>
                <span className={cx('size-2 rounded-full', connected ? 'bg-good' : 'bg-muted')} />
                {user.name.split(' ')[0]}
              </span>
              <button
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
                className="rounded-xl p-2 text-ink-2 hover:bg-surface-2"
                aria-label="Log out"
              >
                <LogOut className="size-5" />
              </button>
            </>
          ) : (
            <Link href="/login" className="ml-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-ink">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
