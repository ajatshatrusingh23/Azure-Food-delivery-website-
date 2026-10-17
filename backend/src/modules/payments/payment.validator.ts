import { z } from 'zod';

export const checkoutSchema = z.object({ orderId: z.uuid() });

/** Exactly what Razorpay Checkout's success handler returns to the browser. */
export const verifySchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[0-9a-f]{64}$/i, 'Malformed signature'),
});

export const simulateSchema = z.object({
  providerOrderId: z.string().min(1).max(100),
  outcome: z.enum(['success', 'failure']),
});

/** The parts of a Razorpay webhook we use. */
export const webhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z
      .object({
        entity: z.object({
          id: z.string(),
          order_id: z.string().nullable().optional(),
          amount: z.number().int(),
          status: z.string(),
          error_description: z.string().nullable().optional(),
        }),
      })
      .optional(),
  }),
});

export type VerifyInput = z.infer<typeof verifySchema>;
