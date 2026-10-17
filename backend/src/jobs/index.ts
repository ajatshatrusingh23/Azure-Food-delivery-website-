import { env } from '@config/env';
import { logger } from '@config/logger';
import { orderService } from '@modules/orders/order.service';

/**
 * In-process background jobs. Each run is skipped if the previous one is still going.
 * (With several API instances this would move to a queue such as BullMQ, or take a
 * Postgres advisory lock so only one instance runs it.)
 */
export const startJobs = (): (() => void) => {
  let running = false;
  const expireUnpaid = async () => {
    if (running) return;
    running = true;
    try {
      const cancelled = await orderService.expireUnpaid(env.payments.pendingTtlMinutes);
      if (cancelled) logger.info(`Cancelled ${cancelled} unpaid order(s)`);
    } catch (err) {
      logger.error('expireUnpaid job failed', err as Error);
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void expireUnpaid(), 60_000);
  timer.unref();
  return () => clearInterval(timer);
};
