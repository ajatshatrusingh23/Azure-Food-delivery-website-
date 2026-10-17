import { canTransition, sourcesFor } from '@modules/orders/order.state';
import { computePricing } from '@modules/orders/order.pricing';
import { parseSearch } from '@modules/search/search.query';
import { TestGateway } from '@modules/payments/gateway';
import { safeEqual } from '@utils/crypto';
import { signAccessToken, signSocketToken, verifyAccessToken, verifySocketToken, hashToken } from '@utils/tokens';

describe('order state machine', () => {
  it('follows the happy path with the right actor at each step', () => {
    expect(canTransition('PENDING', 'CONFIRMED', 'SYSTEM')).toBe(true);
    expect(canTransition('CONFIRMED', 'PREPARING', 'RESTAURANT')).toBe(true);
    expect(canTransition('PREPARING', 'READY', 'RESTAURANT')).toBe(true);
    expect(canTransition('READY', 'OUT_FOR_DELIVERY', 'RIDER')).toBe(true);
    expect(canTransition('OUT_FOR_DELIVERY', 'DELIVERED', 'RIDER')).toBe(true);
  });

  it('rejects skipped steps and the wrong actor', () => {
    expect(canTransition('CONFIRMED', 'READY', 'RESTAURANT')).toBe(false); // skips PREPARING
    expect(canTransition('PENDING', 'CONFIRMED', 'CUSTOMER')).toBe(false); // only a payment confirms
    expect(canTransition('PREPARING', 'READY', 'RIDER')).toBe(false);
    expect(canTransition('READY', 'OUT_FOR_DELIVERY', 'RESTAURANT')).toBe(false);
  });

  it('lets customers cancel only before the kitchen starts', () => {
    expect(canTransition('PENDING', 'CANCELLED', 'CUSTOMER')).toBe(true);
    expect(canTransition('CONFIRMED', 'CANCELLED', 'CUSTOMER')).toBe(true);
    expect(canTransition('PREPARING', 'CANCELLED', 'CUSTOMER')).toBe(false);
  });

  it('treats DELIVERED and CANCELLED as final', () => {
    expect(sourcesFor('PREPARING', 'ADMIN')).toEqual(['CONFIRMED']);
    for (const actor of ['CUSTOMER', 'RESTAURANT', 'RIDER', 'ADMIN', 'SYSTEM'] as const) {
      expect(canTransition('DELIVERED', 'CANCELLED', actor)).toBe(false);
      expect(canTransition('CANCELLED', 'CONFIRMED', actor)).toBe(false);
    }
  });
});

describe('pricing (integer paise)', () => {
  it('charges delivery below ₹499 and adds 5% GST', () => {
    expect(computePricing([{ price: 29900, quantity: 1 }])).toEqual({ itemsTotal: 29900, deliveryFee: 4000, taxes: 1495, total: 35395 });
  });

  it('gives free delivery from ₹499', () => {
    expect(computePricing([{ price: 24950, quantity: 2 }]).deliveryFee).toBe(0);
  });

  it('rounds tax half-up to the paisa without floating-point drift', () => {
    expect(computePricing([{ price: 10, quantity: 1 }]).taxes).toBe(1); // 0.5 paise -> 1
    expect(computePricing([{ price: 9, quantity: 1 }]).taxes).toBe(0); // 0.45 paise -> 0
    const p = computePricing([{ price: 12345, quantity: 3 }, { price: 999, quantity: 7 }]);
    expect(p.total).toBe(p.itemsTotal + p.deliveryFee + p.taxes);
  });
});

describe('search query parsing', () => {
  it('splits finished words from the word still being typed', () => {
    expect(parseSearch('Chicken  Biry')).toEqual({ text: 'chicken biry', head: 'chicken', last: 'biry' });
  });

  it('strips everything that could be a tsquery operator', () => {
    expect(parseSearch("paneer' | !tikka & (x)")).toEqual({ text: 'paneer tikka x', head: 'paneer & tikka', last: 'x' });
    expect(parseSearch("'; drop table users; --")).toEqual({ text: 'drop table users', head: 'drop & table', last: 'users' });
    expect(parseSearch('  !!  ')).toBeNull();
  });
});

describe('signatures and tokens', () => {
  const gateway = new TestGateway('secret');

  it('accepts a genuine checkout signature and rejects a tampered one', () => {
    const paid = gateway.simulateSuccess('order_1');
    const ok = { orderId: paid.razorpay_order_id, paymentId: paid.razorpay_payment_id, signature: paid.razorpay_signature };
    expect(gateway.verifyPaymentSignature(ok)).toBe(true);
    expect(gateway.verifyPaymentSignature({ ...ok, paymentId: 'pay_someone_else' })).toBe(false);
    expect(gateway.verifyPaymentSignature({ ...ok, signature: ok.signature.replace(/.$/, (c) => (c === '0' ? '1' : '0')) })).toBe(false);
  });

  it('verifies webhooks over the exact raw bytes', () => {
    const body = Buffer.from('{"event":"payment.captured"}');
    expect(gateway.verifyWebhookSignature(body, gateway.signWebhook(body))).toBe(true);
    expect(gateway.verifyWebhookSignature(Buffer.from('{"event": "payment.captured"}'), gateway.signWebhook(body))).toBe(false);
    expect(gateway.verifyWebhookSignature(body, undefined)).toBe(false);
  });

  it('compares in constant time and handles different lengths', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });

  it('keeps socket tokens and API tokens apart (different audiences)', () => {
    const user = { id: '00000000-0000-0000-0000-000000000001', email: 'a@b.c', role: 'CUSTOMER' as const };
    expect(verifyAccessToken(signAccessToken(user)).sub).toBe(user.id);
    expect(verifySocketToken(signSocketToken(user)).sub).toBe(user.id);
    expect(() => verifyAccessToken(signSocketToken(user))).toThrow();
    expect(() => verifySocketToken(signAccessToken(user))).toThrow();
  });

  it('stores refresh tokens only as a SHA-256 hash', () => {
    expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken('abc')).not.toContain('abc');
  });
});
