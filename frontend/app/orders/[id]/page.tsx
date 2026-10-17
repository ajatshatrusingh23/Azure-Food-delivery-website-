'use client';

import { Check, Phone, Star } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { LiveMap } from '@/components/LiveMap';
import { usePayment } from '@/components/PaymentFlow';
import { Button, Empty, ErrorNote, Spinner, inputClass } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { cx, inr, LIFECYCLE, STATUS_LABEL, statusTone, timeOf } from '@/lib/format';
import { useSocket, useSocketEvent } from '@/lib/socket';
import type { OrderDetail } from '@/lib/types';

interface Location {
  orderId: string;
  latitude: number;
  longitude: number;
  at: string;
}

function Stepper({ order }: { order: OrderDetail }) {
  const reachedAt = new Map(order.events.map((e) => [e.status, e.createdAt]));
  const current = LIFECYCLE.indexOf(order.status);
  return (
    <ol className="space-y-0">
      {LIFECYCLE.map((status, i) => {
        const done = i <= current;
        return (
          <li key={status} className="relative flex gap-3 pb-5 last:pb-0">
            {i < LIFECYCLE.length - 1 && <span className={cx('absolute top-6 left-[11px] h-full w-0.5', i < current ? 'bg-good' : 'bg-line')} aria-hidden />}
            <span className={cx('relative z-10 grid size-6 shrink-0 place-items-center rounded-full', done ? 'bg-good text-white' : 'border-2 border-line bg-surface')}>
              {done && <Check className="size-3.5" aria-hidden />}
            </span>
            <div className={cx('text-sm', !done && 'text-muted')}>
              <p className={cx('font-semibold', i === current && 'text-good')}>{STATUS_LABEL[status]}</p>
              {reachedAt.get(status) && <p className="text-xs text-muted">{timeOf(reachedAt.get(status)!)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function ReviewForm({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="font-bold">How was your food?</h2>
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)}>
            <Star className={cx('size-8', n <= rating ? 'fill-warn text-warn' : 'text-line')} />
          </button>
        ))}
      </div>
      <textarea className={cx(inputClass, 'mt-3')} rows={2} placeholder="Tell others about it (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
      <ErrorNote error={error} />
      <Button
        className="mt-3"
        disabled={!rating}
        loading={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api.post(`/orders/${orderId}/review`, { rating, comment: comment || undefined });
            onDone();
          } catch (err) {
            setError(errorMessage(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        Submit rating
      </Button>
    </div>
  );
}

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const { data: order, error, isLoading, mutate } = useSWR(user ? `/orders/${id}` : null, (p: string) => api.get<OrderDetail>(p));
  const [rider, setRider] = useState<Location | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const payment = usePayment();

  // Join this order's live room (again after every reconnect) and pick up the rider's last position.
  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('order:subscribe', id, (res: { ok: boolean; location?: Location | null }) => {
      if (res.ok && res.location) setRider(res.location);
    });
    return () => {
      socket.emit('order:unsubscribe', id);
    };
  }, [socket, connected, id]);

  useSocketEvent<{ orderId: string }>('order:status', useCallback((p) => p.orderId === id && void mutate(), [id, mutate]));
  useSocketEvent<Location>('order:location', useCallback((p) => p.orderId === id && setRider(p), [id]));

  if (isLoading || !user) return <Spinner />;
  if (error || !order) return <Empty title="Order not found" />;

  const isCustomer = user.id === order.customer.id;
  const canCancel = isCustomer && (order.status === 'PENDING' || order.status === 'CONFIRMED');
  const awaitingPayment = isCustomer && order.status === 'PENDING' && order.paymentMethod === 'ONLINE';

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Order #{order.orderNumber}</p>
            <h1 className="text-2xl font-black">{order.restaurant.name}</h1>
          </div>
          <span className={cx('rounded-full px-3 py-1 text-sm font-semibold', statusTone(order.status))}>{STATUS_LABEL[order.status]}</span>
        </header>

        {awaitingPayment && (
          <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
            <p className="font-semibold">Complete your payment to send this order to the restaurant.</p>
            <p className="text-sm text-ink-2">Unpaid orders are cancelled automatically after 15 minutes.</p>
            <ErrorNote error={payment.error} />
            <Button className="mt-3" loading={payment.paying} onClick={async () => (await payment.pay(order.id)) && mutate()}>
              Pay {inr(order.total)}
            </Button>
          </div>
        )}
        {order.status === 'CANCELLED' && (
          <div className="rounded-2xl bg-bad/10 p-4 text-sm text-bad">
            Cancelled{order.cancelReason ? `: ${order.cancelReason}` : ''}.
            {order.paymentStatus === 'REFUNDED' && ' Your refund has been initiated.'}
          </div>
        )}

        <LiveMap
          restaurant={order.restaurant}
          home={{ latitude: order.deliveryLatitude, longitude: order.deliveryLongitude }}
          rider={order.status === 'OUT_FOR_DELIVERY' ? rider : null}
        />
        {order.status === 'OUT_FOR_DELIVERY' && (
          <p className="-mt-3 text-sm text-ink-2">
            {order.deliveryPartner?.name} is on the way{rider ? ` · location updated ${timeOf(rider.at)}` : ' · waiting for the first location update'}.
            {!connected && ' Reconnecting to live updates…'}
          </p>
        )}

        {order.status === 'DELIVERED' && isCustomer && !order.review && <ReviewForm orderId={order.id} onDone={() => void mutate()} />}
        {order.review && (
          <p className="text-sm text-ink-2">
            You rated this order <strong>{order.review.rating}★</strong>{order.review.comment && ` · “${order.review.comment}”`}
          </p>
        )}

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-bold">Bill</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3"><span>{i.quantity} × {i.name}</span><span className="tabular">{inr(i.price * i.quantity)}</span></li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-ink-2">Item total</dt><dd className="tabular">{inr(order.itemsTotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">Delivery fee</dt><dd className="tabular">{order.deliveryFee ? inr(order.deliveryFee) : 'FREE'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-2">GST</dt><dd className="tabular">{inr(order.taxes)}</dd></div>
            <div className="flex justify-between font-bold"><dt>Total</dt><dd className="tabular">{inr(order.total)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-muted">
            {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Paid online'} · payment {order.paymentStatus.toLowerCase()} · deliver to {order.deliveryAddress}
          </p>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="mb-4 font-bold">Order status</h2>
          {order.status === 'PENDING' ? <p className="text-sm text-ink-2">Waiting for payment.</p> : <Stepper order={order} />}
        </div>
        <div className="space-y-2 rounded-2xl border border-line bg-surface p-5 text-sm">
          <p><Link href={`/restaurants/${order.restaurant.slug}`} className="font-semibold text-brand">{order.restaurant.name}</Link> · {order.restaurant.area}</p>
          {order.deliveryPartner && (
            <p className="flex items-center gap-2 text-ink-2"><Phone className="size-4" aria-hidden /> {order.deliveryPartner.name}{order.deliveryPartner.phone && ` · ${order.deliveryPartner.phone}`}</p>
          )}
        </div>
        {canCancel && (
          <>
            <ErrorNote error={actionError} />
            <Button
              variant="danger"
              className="w-full"
              loading={cancelling}
              onClick={async () => {
                if (!confirm('Cancel this order?')) return;
                setCancelling(true);
                try {
                  await api.post(`/orders/${order.id}/cancel`, {});
                  await mutate();
                } catch (err) {
                  setActionError(errorMessage(err));
                } finally {
                  setCancelling(false);
                }
              }}
            >
              Cancel order
            </Button>
          </>
        )}
      </aside>
      {payment.modal}
    </div>
  );
}
