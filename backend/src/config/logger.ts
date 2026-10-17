import winston from 'winston';
import { env } from './env';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${String(ts)}] ${level}: ${String(message)}${stack ? `\n${String(stack)}` : ''}${extra}`;
  }),
);

/** Logs go to stdout only (12-factor): the platform collects them. JSON in production. */
export const logger = winston.createLogger({
  level: env.logLevel,
  format: env.isProduction ? combine(timestamp(), errors({ stack: true }), json()) : devFormat,
  defaultMeta: env.isProduction ? { service: 'azure-backend' } : undefined,
  transports: [new winston.transports.Console()],
});
