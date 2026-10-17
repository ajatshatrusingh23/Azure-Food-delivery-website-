import 'dotenv/config';
import { z } from 'zod';

const DEV_JWT_SECRET = 'dev-only-access-secret-change-me-0123456789';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5001),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).optional(),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').default(DEV_JWT_SECRET),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  COOKIE_SECURE: z.enum(['true', 'false']).optional(),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  // Razorpay (test mode keys are free from the Razorpay dashboard). Without them the
  // built-in test gateway is used, which follows the exact same signature scheme.
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  TEST_GATEWAY_SECRET: z.string().default('azure-test-gateway-secret'),

  PENDING_PAYMENT_TTL_MINUTES: z.coerce.number().int().positive().default(15),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}
const e = parsed.data;

if (e.NODE_ENV === 'production' && e.JWT_SECRET === DEV_JWT_SECRET) {
  console.error('Refusing to start in production with the development JWT_SECRET.');
  process.exit(1);
}

const razorpayConfigured = Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET);

export const env = {
  nodeEnv: e.NODE_ENV,
  isProduction: e.NODE_ENV === 'production',
  isDevelopment: e.NODE_ENV === 'development',
  isTest: e.NODE_ENV === 'test',
  port: e.PORT,
  logLevel: e.LOG_LEVEL ?? (e.NODE_ENV === 'production' ? 'info' : e.NODE_ENV === 'test' ? 'error' : 'debug'),
  databaseUrl: e.DATABASE_URL,
  jwt: {
    secret: e.JWT_SECRET,
    accessTtlSeconds: e.ACCESS_TOKEN_TTL_SECONDS,
    refreshTtlDays: e.REFRESH_TOKEN_TTL_DAYS,
  },
  bcryptRounds: e.BCRYPT_ROUNDS,
  clientUrl: e.CLIENT_URL,
  cookies: {
    secure: e.COOKIE_SECURE ? e.COOKIE_SECURE === 'true' : e.NODE_ENV === 'production',
    sameSite: e.COOKIE_SAMESITE,
  },
  payments: {
    provider: razorpayConfigured ? ('razorpay' as const) : ('test' as const),
    razorpay: {
      keyId: e.RAZORPAY_KEY_ID ?? '',
      keySecret: e.RAZORPAY_KEY_SECRET ?? '',
      webhookSecret: e.RAZORPAY_WEBHOOK_SECRET ?? '',
    },
    testGatewaySecret: e.TEST_GATEWAY_SECRET,
    pendingTtlMinutes: e.PENDING_PAYMENT_TTL_MINUTES,
  },
} as const;
