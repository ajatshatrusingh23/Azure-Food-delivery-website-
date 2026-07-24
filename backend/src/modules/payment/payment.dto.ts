import { z } from 'zod';
import { PaymentMethod } from './payment.types';

// ─── Initiate Payment ─────────────────────────────────────────────────────────

export const InitiatePaymentSchema = z.object({
  orderId: z.string().uuid(),
  method: z.nativeEnum(PaymentMethod),
});

export type InitiatePaymentDto = z.infer<typeof InitiatePaymentSchema>;

// ─── Verify Payment ───────────────────────────────────────────────────────────

export const VerifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export type VerifyPaymentDto = z.infer<typeof VerifyPaymentSchema>;
