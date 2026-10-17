'use client';

import { api } from './api';

export interface Checkout {
  provider: 'razorpay' | 'test';
  keyId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  orderNumber: number;
  description: string;
  prefill: { name: string; email: string; contact?: string };
}

export interface PaymentProof {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', handler: (resp: { error: { description: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const loadScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Razorpay Checkout'));
    document.body.appendChild(script);
  });

/**
 * Opens Razorpay Checkout. On success Razorpay gives the browser the payment id and an HMAC
 * signature; the server verifies that signature before it trusts the payment.
 */
export const payWithRazorpay = async (checkout: Checkout): Promise<PaymentProof> => {
  await loadScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: checkout.keyId,
      amount: checkout.amount,
      currency: checkout.currency,
      order_id: checkout.providerOrderId,
      name: 'Azure',
      description: checkout.description,
      prefill: checkout.prefill,
      theme: { color: '#0a6ad6' },
      handler: (proof: PaymentProof) => resolve(proof),
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    rzp.on('payment.failed', (resp) => reject(new Error(resp.error.description)));
    rzp.open();
  });
};

export const verifyPayment = (proof: PaymentProof) => api.post<{ id: string; status: string }>('/payments/verify', proof);
