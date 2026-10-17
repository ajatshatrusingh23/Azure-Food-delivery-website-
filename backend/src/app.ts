import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from '@config/env';
import { logger } from '@config/logger';
import { errorMiddleware, notFoundMiddleware } from '@middlewares/error.middleware';
import { paymentWebhookHandler } from '@modules/payments/payment.routes';
import { API_PREFIX } from '@utils/constants';
import { apiRouter } from './routes';

export const createApp = (): Application => {
  const app = express();

  // Behind one reverse proxy (Next.js rewrites, Nginx, Render) req.ip is the real client IP,
  // which the login rate limiter depends on.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));

  // Must come before express.json(): the signature is computed over the raw bytes.
  app.post(`${API_PREFIX}/payments/webhook`, ...paymentWebhookHandler);

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: { write: (line) => logger.http(line.trim()) } }));
  }

  app.use(API_PREFIX, apiRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
};
