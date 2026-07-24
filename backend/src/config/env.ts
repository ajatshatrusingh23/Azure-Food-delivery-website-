import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  OPENAI_API_KEY: z.string().optional(),

  SMTP_HOST: z.string().min(1, 'SMTP_HOST is required'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().min(1, 'SMTP_USER is required'),
  SMTP_PASSWORD: z.string().min(1, 'SMTP_PASSWORD is required'),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
});

const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(_parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = {
  port: parseInt(_parsed.data.PORT, 10),
  nodeEnv: _parsed.data.NODE_ENV,
  isProduction: _parsed.data.NODE_ENV === 'production',
  isDevelopment: _parsed.data.NODE_ENV === 'development',
  isTest: _parsed.data.NODE_ENV === 'test',

  databaseUrl: _parsed.data.DATABASE_URL,

  jwt: {
    secret: _parsed.data.JWT_SECRET,
    refreshSecret: _parsed.data.JWT_REFRESH_SECRET,
    accessExpiresIn: _parsed.data.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: _parsed.data.JWT_REFRESH_EXPIRES_IN,
  },

  clientUrl: _parsed.data.CLIENT_URL,

  redisUrl: _parsed.data.REDIS_URL,

  openaiApiKey: _parsed.data.OPENAI_API_KEY,

  smtp: {
    host: _parsed.data.SMTP_HOST,
    port: parseInt(_parsed.data.SMTP_PORT, 10),
    user: _parsed.data.SMTP_USER,
    password: _parsed.data.SMTP_PASSWORD,
  },

  cloudinary: {
    cloudName: _parsed.data.CLOUDINARY_CLOUD_NAME,
    apiKey: _parsed.data.CLOUDINARY_API_KEY,
    apiSecret: _parsed.data.CLOUDINARY_API_SECRET,
  },

  razorpay: {
    keyId: _parsed.data.RAZORPAY_KEY_ID,
    keySecret: _parsed.data.RAZORPAY_KEY_SECRET,
  },
} as const;
