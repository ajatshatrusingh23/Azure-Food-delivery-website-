'use client';

import { Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { usePayment } from '@/components/PaymentFlow';
import { Button, Empty, ErrorNote, Field, FoodMark, inputClass } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { cx, inr } from '@/lib/format';
import type { OrderDetail } from '@/lib/types';

interface Quote {
  restaurant: { id: string; name: string; isOpen: boolean };
  lines: { menuItemId: string; name: string; price: number; quantity: number }[];
  unavailable: { menuItemId: string; name?: string; reason: string }[];
  pricing: { itemsTotal: number; deliveryFee: number; taxes: number; total: number };
}

const ADDRESS_KEY = 'azure.address';

export default function CartPage() {
  const cart = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const payment = usePayment();
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);
  // One idempotency key per checkout attempt: a double click or network retry can't create two orders.
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  useEffect(() => setAddress(localStorage.getItem(ADDRESS_KEY) ?? ''), []);
  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID(); // a changed cart is a new order
  }, [cart.lines]);

  const body = cart.restaurantId ? { restaurantId: cart.restaurantId, items: cart.lines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })) } : null;
  // Prices shown here come from the server, never from the browser's copy of the menu.
  const { data: quote } = useSWR(body && user?.role === 'CUSTOMER' ? ['/orders/quote', JSON.stringify(body)] : null, ([path]) => api.post<Quote>(path, body), {
    keepPreviousData: true,
  });

  if (!cart.count) {
    return <Empty title="Your cart is empty">Find something tasty on the <Link href="/" className="font-semibold text-brand">home page</Link>.</Empty>;
  }

  const finish = (orderId: string) => {
    cart.clear();
    router.push(`/orders/${orderId}`);
  };

  const placeOrder = async () => {
    if (!user) return router.push('/login');
    setPlacing(true);
    setError(null);
    try {
      localStorage.setItem(ADDRESS_KEY, address);
      const order = await api.post<OrderDetail>(
        '/orders',
        { ...body, deliveryAddress: address, paymentMethod: method, notes: notes || undefined },
        { 'Idempotency-Key': idempotencyKey.current },
      );
      if (method === 'COD') return finish(order.id);
      setPendingOrder(order.id);
      if (await payment.pay(order.id)) finish(order.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPlacing(false);
    }
  };

  const unavailable = new Set(quote?.unavailable.map((u) => u.menuItemId));

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section>
        <h1 className="text-2xl font-black">Checkout</h1>
        <p className="mt-1 text-ink-2">
          From <Link href={`/restaurants/${cart.restaurantSlug}`} className="font-semibold text-brand">{cart.restaurantName}</Link>
        </p>
        <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
          {cart.lines.map((l) => (
            <li key={l.menuItemId} className={cx('flex items-center gap-3 p-4', unavailable.has(l.menuItemId) && 'opacity-50')}>
              <FoodMark type={l.foodType} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{l.name}</span>
                {unavailable.has(l.menuItemId) && <span className="text-xs font-semibold text-bad">No longer available, remove it to continue</span>}
              </span>
              <div className="flex items-center gap-3 rounded-xl border border-line px-2 py-1">
                <button onClick={() => cart.setQuantity(l.menuItemId, l.quantity - 1)} aria-label={`Remove one ${l.name}`}><Minus className="size-4" /></button>
                <span className="w-4 text-center font-semibold tabular">{l.quantity}</span>
                <button onClick={() => cart.setQuantity(l.menuItemId, l.quantity + 1)} aria-label={`Add one ${l.name}`}><Plus className="size-4" /></button>
              </div>
              <span className="w-20 text-right tabular">{inr(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-5">
          <Field label="Delivery address">
            <textarea className={inputClass} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Flat, building, street, area" />
          </Field>
          <Field label="Note for the restaurant (optional)">
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Less spicy, no onions…" maxLength={200} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Payment</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['ONLINE', 'COD'] as const).map((m) => (
                <label key={m} className={cx('cursor-pointer rounded-xl border p-3 text-sm', method === m ? 'border-brand bg-brand-soft' : 'border-line')}>
                  <input type="radio" name="method" className="sr-only" checked={method === m} onChange={() => setMethod(m)} />
                  <span className="block font-semibold">{m === 'ONLINE' ? 'Pay online' : 'Cash on delivery'}</span>
                  <span className="text-xs text-muted">{m === 'ONLINE' ? 'UPI, cards, netbanking via Razorpay' : 'Pay the delivery partner'}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      <aside className="lg:pt-14">
        <div className="sticky top-24 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-bold">Bill details</h2>
          {user?.role === 'CUSTOMER' && quote ? (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Item total</dt><dd className="tabular">{inr(quote.pricing.itemsTotal)}</dd></div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Delivery fee</dt>
                <dd className="tabular">{quote.pricing.deliveryFee ? inr(quote.pricing.deliveryFee) : <span className="font-semibold text-good">FREE</span>}</dd>
              </div>
              <div className="flex justify-between"><dt className="text-ink-2">GST (5%)</dt><dd className="tabular">{inr(quote.pricing.taxes)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>To pay</dt><dd className="tabular">{inr(quote.pricing.total)}</dd></div>
              {!!quote.pricing.deliveryFee && <p className="text-xs text-muted">Free delivery on orders above ₹499.</p>}
            </dl>
          ) : (
            <p className="mt-2 text-sm text-ink-2">{user ? 'Only customer accounts can order.' : 'Log in to see the final bill.'}</p>
          )}
          <div className="mt-4 space-y-3">
            <ErrorNote error={error ?? payment.error} />
            {pendingOrder && payment.error && (
              <Button variant="secondary" className="w-full" onClick={() => router.push(`/orders/${pendingOrder}`)}>
                View order (it stays reserved for 15 minutes)
              </Button>
            )}
            <Button
              size="lg"
              className="w-full"
              loading={placing || payment.paying}
              disabled={user?.role === 'CUSTOMER' && (!quote || unavailable.size > 0 || address.trim().length < 10 || !quote.restaurant.isOpen)}
              onClick={placeOrder}
            >
              {!user ? 'Log in to order' : method === 'ONLINE' ? `Pay ${quote ? inr(quote.pricing.total) : ''}` : 'Place order'}
            </Button>
            {quote && !quote.restaurant.isOpen && <p className="text-center text-xs text-warn">The restaurant is closed right now.</p>}
          </div>
        </div>
      </aside>
      {payment.modal}
    </div>
  );
}
