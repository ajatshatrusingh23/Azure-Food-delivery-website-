import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

import { env } from '@config/env';
import { logger } from '@config/logger';
import { API_PREFIX } from '@utils/constants';
import { errorMiddleware } from '@middlewares/error.middleware';
import { notFoundMiddleware } from '@middlewares/notFound.middleware';
import apiRouter from '@routes/index';

// ─── Application Factory ──────────────────────────────────────────────────────

const createApp = (): Application => {
  const app = express();

  // ── Security ────────────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Body Parsing ────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Cookie Parser ───────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── HTTP Request Logger ─────────────────────────────────────────────────────
  app.use(
    morgan(env.isDevelopment ? 'dev' : 'combined', {
      stream: {
        write: (message: string) => {
          logger.http(message.trim());
        },
      },
    }),
  );

  // ── API Routes ──────────────────────────────────────────────────────────────
  app.use(API_PREFIX, apiRouter);

  // ── 404 Handler ─────────────────────────────────────────────────────────────
  app.use(notFoundMiddleware);

  // ── Global Error Handler ────────────────────────────────────────────────────
  app.use(errorMiddleware);

  return app;
};

export default createApp;
