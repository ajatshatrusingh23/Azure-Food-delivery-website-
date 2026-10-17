'use client';

import { CreditCard, ShieldCheck } from 'lucide-react';
import { useCallback, useState } from 'react';
import { api, errorMessage } from '@/lib/api';
import { inr } from '@/lib/format';
import { payWithRazorpay, verifyPayment, type Checkout, type PaymentProof } from '@/lib/payment';
import { Button } from './ui';

/**
 * Pays an online order: create/reuse the gateway order on the server, collect payment
 * (Razorpay Checkout, or the built-in test screen when no Razorpay keys are configured),
 * then have the server verify the signature. Resolves true once the order is confirmed.
 */
export function usePayment() {
  const [testCheckout, setTestCheckout] = useState<{ checkout: Checkout; resolve: (proof: PaymentProof | null) => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const pay = useCallback(async (orderId: string): Promise<boolean> => {
    setPaying(true);
    setError(null);
    try {
      const checkout = await api.post<Checkout>('/payments/checkout', { orderId });
      const proof =
        checkout.provider === 'razorpay'
          ? await payWithRazorpay(checkout)
          : await new Promise<PaymentProof | null>((resolve) => setTestCheckout({ checkout, resolve }));
      if (!proof) throw new Error('Payment was not completed. You can try again.');
      await verifyPayment(proof);
      return true;
    } catch (err) {
      setError(errorMessage(err));
      return false;
    } finally {
      setPaying(false);
      setTestCheckout(null);
    }
  }, []);

  const modal = testCheckout && (
    <TestPaymentModal
      checkout={testCheckout.checkout}
      onDone={async (outcome) => {
        const { checkout, resolve } = testCheckout;
        if (outcome === 'cancel') return resolve(null);
        const result = await api.post<Partial<PaymentProof> & { outcome: string }>('/payments/test/simulate', { providerOrderId: checkout.providerOrderId, outcome });
        resolve(outcome === 'success' ? (result as PaymentProof) : null);
      }}
    />
  );

  return { pay, paying, error, modal };
}

function TestPaymentModal({ checkout, onDone }: { checkout: Checkout; onDone: (outcome: 'success' | 'failure' | 'cancel') => void }) {
  const [busy, setBusy] = useState(false);
  const act = (outcome: 'success' | 'failure' | 'cancel') => {
    setBusy(true);
    onDone(outcome);
  };
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="test-pay-title" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="bg-brand px-6 py-5 text-brand-ink">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-80">Test payment · no real money</p>
          <h2 id="test-pay-title" className="mt-1 text-2xl font-black tabular">{inr(checkout.amount)}</h2>
          <p className="text-sm opacity-90">{checkout.description}</p>
        </div>
        <div className="space-y-3 p-6">
          <p className="flex items-start gap-2 text-sm text-ink-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
            Razorpay keys aren't configured, so this stands in for Razorpay Checkout. The server still verifies an HMAC signature exactly as with Razorpay.
          </p>
          <Button className="w-full" loading={busy} onClick={() => act('success')}>
            <CreditCard className="size-4" aria-hidden /> Pay {inr(checkout.amount)}
          </Button>
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => act('failure')}>
            Simulate a declined payment
          </Button>
          <Button variant="ghost" className="w-full" disabled={busy} onClick={() => act('cancel')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
