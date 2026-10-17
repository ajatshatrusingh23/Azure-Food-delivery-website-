import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import { prisma } from '@config/database';
import { env } from '@config/env';
import { actorFor } from '@modules/orders/order.access';
import { ROOMS, SOCKET_EVENTS, type OrderLocationPayload } from '@shared/socket-events';
import type { AuthUser } from '@shared/types';
import { verifySocketToken } from '@utils/tokens';
import { attachRealtime } from './realtime';

type Ack = (response: { ok: boolean; error?: string; [key: string]: unknown }) => void;

const LOCATION_INTERVAL_MS = 1_000; // a rider may publish at most one position per second
const ASSIGNMENT_CACHE_MS = 30_000;

const locationSchema = z.object({
  orderId: z.uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * Last known rider position per order, so a customer who opens the tracking page mid-ride
 * sees the rider immediately. In memory: fine for one server; with several instances this
 * (and room broadcasting) would move to Redis via the Socket.IO Redis adapter.
 */
const lastLocation = new Map<string, OrderLocationPayload>();

const userOf = (socket: Socket) => socket.data.user as AuthUser;
const ackOrNoop = (ack: unknown): Ack => (typeof ack === 'function' ? (ack as Ack) : () => undefined);

export const createSocketServer = (httpServer: HttpServer): Server => {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // Handshake auth: the client sends the 60-second token from GET /auth/socket-token.
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof token !== 'string') return next(new Error('unauthorized'));
    try {
      const claims = verifySocketToken(token);
      socket.data.user = { id: claims.sub, email: claims.email, role: claims.role } satisfies AuthUser;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const user = userOf(socket);

    /** Live tracking: only parties to the order may join its room. */
    socket.on(SOCKET_EVENTS.ORDER_SUBSCRIBE, async (orderId: unknown, rawAck: unknown) => {
      const ack = ackOrNoop(rawAck);
      const parsed = z.uuid().safeParse(orderId);
      if (!parsed.success) return ack({ ok: false, error: 'invalid_order' });
      const order = await prisma.order.findUnique({
        where: { id: parsed.data },
        select: { id: true, status: true, customerId: true, deliveryPartnerId: true, restaurant: { select: { ownerId: true } } },
      });
      if (!order || !actorFor(user, order)) return ack({ ok: false, error: 'not_found' });
      await socket.join(ROOMS.order(order.id));
      ack({ ok: true, status: order.status, location: lastLocation.get(order.id) ?? null });
    });

    socket.on(SOCKET_EVENTS.ORDER_UNSUBSCRIBE, async (orderId: unknown) => {
      if (typeof orderId === 'string') await socket.leave(ROOMS.order(orderId));
    });

    // Rider GPS updates: verified, throttled, then relayed to everyone tracking the order.
    const assignments = new Map<string, number>(); // orderId -> verified until (ms)
    let lastSentAt = 0;
    socket.on(SOCKET_EVENTS.RIDER_LOCATION, async (raw: unknown, rawAck: unknown) => {
      const ack = ackOrNoop(rawAck);
      if (user.role !== 'DELIVERY_PARTNER') return ack({ ok: false, error: 'forbidden' });
      const parsed = locationSchema.safeParse(raw);
      if (!parsed.success) return ack({ ok: false, error: 'invalid_location' });
      const now = Date.now();
      if (now - lastSentAt < LOCATION_INTERVAL_MS) return ack({ ok: false, error: 'too_frequent' });

      const { orderId, latitude, longitude } = parsed.data;
      if ((assignments.get(orderId) ?? 0) < now) {
        const assigned = await prisma.order.count({ where: { id: orderId, deliveryPartnerId: user.id, status: 'OUT_FOR_DELIVERY' } });
        if (!assigned) return ack({ ok: false, error: 'not_your_delivery' });
        assignments.set(orderId, now + ASSIGNMENT_CACHE_MS);
      }
      lastSentAt = now;
      const payload: OrderLocationPayload = { orderId, latitude, longitude, at: new Date(now).toISOString() };
      lastLocation.set(orderId, payload);
      io.to(ROOMS.order(orderId)).emit(SOCKET_EVENTS.ORDER_LOCATION, payload);
      ack({ ok: true });
    });

    // Join role rooms after the handlers are registered, so no early event is missed.
    await socket.join(ROOMS.user(user.id));
    if (user.role === 'RESTAURANT_OWNER') {
      const owned = await prisma.restaurant.findMany({ where: { ownerId: user.id }, select: { id: true } });
      await socket.join(owned.map((r) => ROOMS.restaurant(r.id)));
    }
    if (user.role === 'DELIVERY_PARTNER') await socket.join(ROOMS.riders);
    if (user.role === 'ADMIN') await socket.join(ROOMS.admins);
    socket.emit('ready');
  });

  attachRealtime(io);
  return io;
};
