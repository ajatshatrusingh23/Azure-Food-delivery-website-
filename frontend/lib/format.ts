import type { OrderStatus } from './types';

/** 29900 paise -> "₹299" (paise shown only when present). */
export const inr = (paise: number) => {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Waiting for payment',
  CONFIRMED: 'Order confirmed',
  PREPARING: 'Being prepared',
  READY: 'Ready for pickup',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const LIFECYCLE: OrderStatus[] = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const dateOf = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const ago = (iso: string) => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return dateOf(iso);
};

export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

/** Stable restaurant artwork: a two-tone gradient from the restaurant's hue. */
export const heroGradient = (hue: number) =>
  `linear-gradient(135deg, hsl(${hue} 70% 62%) 0%, hsl(${(hue + 35) % 360} 65% 42%) 100%)`;

export const statusTone = (status: string) =>
  status === 'DELIVERED' ? 'bg-good/10 text-good' : status === 'CANCELLED' ? 'bg-bad/10 text-bad' : 'bg-brand-soft text-brand';
