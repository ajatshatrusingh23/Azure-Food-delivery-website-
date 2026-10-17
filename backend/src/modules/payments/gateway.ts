import { randomBytes } from 'crypto';
import Razorpay from 'razorpay';
import { env } from '@config/env';
import { hmacSha256Hex, safeEqual } from '@utils/crypto';

export interface GatewayOrder {
  id: string;
  amount: number;
  currency: string;
}

/**
 * What the app needs from a payment provider. Razorpay implements it for real; the test
 * gateway implements the identical signature scheme so the whole flow (checkout, signature
 * verification, webhooks, refunds) runs and is tested without network access or API keys.
 */
export interface PaymentGateway {
  readonly provider: 'razorpay' | 'test';
  readonly keyId: string; // public key the browser checkout needs
  createOrder(input: { amount: number; receipt: string; notes: Record<string, string> }): Promise<GatewayOrder>;
  /** Checkout success callback: HMAC_SHA256(key_secret, `${order_id}|${payment_id}`). */
  verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string }): boolean;
  /** Webhooks: HMAC_SHA256(webhook_secret, raw request body). */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean;
  refund(paymentId: string, amount: number, notes: Record<string, string>): Promise<{ id: string }>;
}

const checkoutSignature = (secret: string, orderId: string, paymentId: string) => hmacSha256Hex(secret, `${orderId}|${paymentId}`);

class RazorpayGateway implements PaymentGateway {
  readonly provider = 'razorpay' as const;
  private readonly client: Razorpay;

  constructor(
    readonly keyId: string,
    private readonly keySecret: string,
    private readonly webhookSecret: string,
  ) {
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(input: { amount: number; receipt: string; notes: Record<string, string> }) {
    const order = await this.client.orders.create({ amount: input.amount, currency: 'INR', receipt: input.receipt, notes: input.notes });
    return { id: order.id, amount: Number(order.amount), currency: order.currency };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) {
    return safeEqual(checkoutSignature(this.keySecret, orderId, paymentId), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    if (!signature || !this.webhookSecret) return false;
    return safeEqual(hmacSha256Hex(this.webhookSecret, rawBody), signature);
  }

  async refund(paymentId: string, amount: number, notes: Record<string, string>) {
    const refund = await this.client.payments.refund(paymentId, { amount, speed: 'normal', notes });
    return { id: refund.id };
  }
}

/** Behaves like Razorpay test mode, signed with a local secret. Never used when keys are set. */
export class TestGateway implements PaymentGateway {
  readonly provider = 'test' as const;
  readonly keyId = 'rzp_test_local';

  constructor(private readonly secret: string) {}

  async createOrder(input: { amount: number }) {
    return { id: `order_test_${randomBytes(7).toString('hex')}`, amount: input.amount, currency: 'INR' };
  }

  verifyPaymentSignature({ orderId, paymentId, signature }: { orderId: string; paymentId: string; signature: string }) {
    return safeEqual(checkoutSignature(this.secret, orderId, paymentId), signature);
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined) {
    return Boolean(signature) && safeEqual(hmacSha256Hex(this.secret, rawBody), signature!);
  }

  async refund() {
    return { id: `rfnd_test_${randomBytes(7).toString('hex')}` };
  }

  /** What Razorpay Checkout hands the browser after a successful payment. */
  simulateSuccess(orderId: string) {
    const paymentId = `pay_test_${randomBytes(7).toString('hex')}`;
    return { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: checkoutSignature(this.secret, orderId, paymentId) };
  }

  signWebhook(rawBody: string | Buffer) {
    return hmacSha256Hex(this.secret, rawBody);
  }
}

export const gateway: PaymentGateway =
  env.payments.provider === 'razorpay'
    ? new RazorpayGateway(env.payments.razorpay.keyId, env.payments.razorpay.keySecret, env.payments.razorpay.webhookSecret)
    : new TestGateway(env.payments.testGatewaySecret);
