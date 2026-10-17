import express, { Router } from 'express';
import { authenticate, authorize } from '@middlewares/auth.middleware';
import { paymentController as c } from './payment.controller';

export const paymentRouter = Router();

const customer = [authenticate, authorize('CUSTOMER')];

paymentRouter.post('/checkout', ...customer, c.checkout);
paymentRouter.post('/verify', ...customer, c.verify);
paymentRouter.post('/test/simulate', ...customer, c.simulate);

/**
 * The webhook needs the exact bytes Razorpay signed, so it is mounted in app.ts BEFORE the
 * global JSON parser, with this raw-body handler (no auth: the HMAC signature is the auth).
 */
export const paymentWebhookHandler = [
  express.raw({ type: '*/*', limit: '1mb' }),
  (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.rawBody = Buffer.isBuffer(req.body) ? req.body : undefined;
    next();
  },
  c.webhook,
];
