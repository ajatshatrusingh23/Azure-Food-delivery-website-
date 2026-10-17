import type { Request, Response } from 'express';
import { currentUser } from '@middlewares/auth.middleware';
import { ApiResponse } from '@utils/ApiResponse';
import { paymentService } from './payment.service';
import { checkoutSchema, simulateSchema, verifySchema } from './payment.validator';

export const paymentController = {
  async checkout(req: Request, res: Response) {
    const { orderId } = checkoutSchema.parse(req.body);
    ApiResponse.ok(res, await paymentService.checkout(currentUser(req), orderId));
  },

  async verify(req: Request, res: Response) {
    ApiResponse.ok(res, await paymentService.verify(currentUser(req), verifySchema.parse(req.body)), 'Payment successful');
  },

  async webhook(req: Request, res: Response) {
    const result = await paymentService.handleWebhook(req.rawBody, req.get('x-razorpay-signature'), req.get('x-razorpay-event-id'));
    ApiResponse.ok(res, result);
  },

  async simulate(req: Request, res: Response) {
    const { providerOrderId, outcome } = simulateSchema.parse(req.body);
    ApiResponse.ok(res, await paymentService.simulate(currentUser(req), providerOrderId, outcome));
  },
};
