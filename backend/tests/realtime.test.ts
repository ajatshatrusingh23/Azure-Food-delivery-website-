import http from 'http';
import type { AddressInfo } from 'net';
import { io as connect, type Socket } from 'socket.io-client';
import { createSocketServer } from '@socket/server';
import { SOCKET_EVENTS } from '@shared/socket-events';
import { api, app, loginAs, orderBody, prisma, resetDb, setupRestaurant, type Agent } from './helpers';

let server: http.Server;
let url: string;
const sockets: Socket[] = [];

beforeAll(async () => {
  server = http.createServer(app);
  createSocketServer(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  url = `http://localhost:${(server.address() as AddressInfo).port}`;
});
afterEach(() => sockets.splice(0).forEach((s) => s.disconnect()));
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
});
beforeEach(resetDb);

/** Connects the way the frontend does: fetch a 60-second socket token, then hand it to the handshake. */
const connectAs = async (agent: Agent): Promise<Socket> => {
  const token = (await agent.get(`${api}/auth/socket-token`)).body.data.token as string;
  const socket = connect(url, { auth: { token }, transports: ['websocket'], forceNew: true });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('ready', resolve);
    socket.once('connect_error', reject);
  });
  return socket;
};

const next = <T>(socket: Socket, event: string) => new Promise<T>((resolve) => socket.once(event, resolve));
const emitAck = <T>(socket: Socket, event: string, payload: unknown) =>
  new Promise<T>((resolve) => socket.emit(event, payload, (res: T) => resolve(res)));

const placeCodOrder = async () => {
  const setup = await setupRestaurant();
  const customer = await loginAs('CUSTOMER');
  const order = (await customer.agent.post(`${api}/orders`).send(orderBody(setup.restaurant.id, [{ menuItemId: setup.biryani.id, quantity: 1 }]))).body.data;
  return { ...setup, customer, order };
};

describe('socket authentication', () => {
  it('rejects connections without a valid socket token', async () => {
    const { accessToken } = await loginAs('CUSTOMER');
    for (const auth of [{}, { token: 'garbage' }, { token: accessToken }]) {
      const socket = connect(url, { auth, transports: ['websocket'], forceNew: true });
      sockets.push(socket);
      await expect(next<Error>(socket, 'connect_error')).resolves.toMatchObject({ message: 'unauthorized' });
    }
  });
});

describe('live order tracking', () => {
  it('pushes every status change to the customer tracking the order', async () => {
    const { owner, customer, order } = await placeCodOrder();
    const socket = await connectAs(customer.agent);
    expect(await emitAck(socket, SOCKET_EVENTS.ORDER_SUBSCRIBE, order.id)).toMatchObject({ ok: true, status: 'CONFIRMED' });

    const update = next<{ status: string; orderId: string }>(socket, SOCKET_EVENTS.ORDER_STATUS);
    await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'PREPARING' });
    expect(await update).toMatchObject({ orderId: order.id, status: 'PREPARING' });
  });

  it("doesn't let strangers subscribe to someone else's order", async () => {
    const { order } = await placeCodOrder();
    const stranger = await loginAs('CUSTOMER', 'stranger');
    const socket = await connectAs(stranger.agent);
    expect(await emitAck(socket, SOCKET_EVENTS.ORDER_SUBSCRIBE, order.id)).toEqual({ ok: false, error: 'not_found' });
  });

  it('alerts the restaurant about new orders the moment they are placed', async () => {
    const setup = await setupRestaurant();
    const ownerSocket = await connectAs(setup.owner.agent);
    const alert = next<{ orderNumber: number }>(ownerSocket, SOCKET_EVENTS.ORDER_NEW);
    const customer = await loginAs('CUSTOMER');
    await customer.agent.post(`${api}/orders`).send(orderBody(setup.restaurant.id, [{ menuItemId: setup.biryani.id, quantity: 1 }]));
    expect(await alert).toMatchObject({ orderNumber: expect.any(Number) });
  });

  it('relays the assigned rider’s location, and only theirs, at most once per second', async () => {
    const { owner, customer, order } = await placeCodOrder();
    await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'PREPARING' });
    await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'READY' });
    const rider = await loginAs('DELIVERY_PARTNER');
    const otherRider = await loginAs('DELIVERY_PARTNER', 'other');
    await rider.agent.post(`${api}/orders/${order.id}/claim`);

    const customerSocket = await connectAs(customer.agent);
    await emitAck(customerSocket, SOCKET_EVENTS.ORDER_SUBSCRIBE, order.id);
    const riderSocket = await connectAs(rider.agent);
    const otherSocket = await connectAs(otherRider.agent);

    const position = next<{ latitude: number }>(customerSocket, SOCKET_EVENTS.ORDER_LOCATION);
    expect(await emitAck(riderSocket, SOCKET_EVENTS.RIDER_LOCATION, { orderId: order.id, latitude: 12.94, longitude: 77.63 })).toEqual({ ok: true });
    expect(await position).toMatchObject({ latitude: 12.94 });

    expect(await emitAck(riderSocket, SOCKET_EVENTS.RIDER_LOCATION, { orderId: order.id, latitude: 12.95, longitude: 77.63 })).toEqual({ ok: false, error: 'too_frequent' });
    expect(await emitAck(otherSocket, SOCKET_EVENTS.RIDER_LOCATION, { orderId: order.id, latitude: 1, longitude: 1 })).toEqual({ ok: false, error: 'not_your_delivery' });
  });
});
