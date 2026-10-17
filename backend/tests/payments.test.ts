import request from 'supertest';
import { TestGateway } from '@modules/payments/gateway';
import { orderService } from '@modules/orders/order.service';
import { api, app, loginAs, orderBody, prisma, resetDb, setupRestaurant } from './helpers';

const gateway = new TestGateway('test-gateway-secret'); // same secret as tests/setup-env.ts

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const placeOnline = async () => {
  const setup = await setupRestaurant();
  const customer = await loginAs('CUSTOMER');
  const order = (await customer.agent.post(`${api}/orders`).send(orderBody(setup.restaurant.id, [{ menuItemId: setup.biryani.id, quantity: 2 }], 'ONLINE'))).body.data;
  const checkout = (await customer.agent.post(`${api}/payments/checkout`).send({ orderId: order.id })).body.data;
  return { ...setup, customer, order, checkout };
};

const webhook = (event: string, providerOrderId: string, paymentId: string, amount: number, eventId: string) => {
  const raw = JSON.stringify({ event, payload: { payment: { entity: { id: paymentId, order_id: providerOrderId, amount, status: 'captured' } } } });
  return request(app)
    .post(`${api}/payments/webhook`)
    .set('Content-Type', 'application/json')
    .set('X-Razorpay-Signature', gateway.signWebhook(raw))
    .set('X-Razorpay-Event-Id', eventId)
    .send(raw);
};

describe('online payment (Razorpay flow)', () => {
  it('keeps online orders PENDING until paid and reuses the gateway order on retry', async () => {
    const { customer, order, checkout } = await placeOnline();
    expect(order.status).toBe('PENDING');
    expect(checkout).toMatchObject({ provider: 'test', amount: order.total, currency: 'INR' });
    const again = (await customer.agent.post(`${api}/payments/checkout`).send({ orderId: order.id })).body.data;
    expect(again.providerOrderId).toBe(checkout.providerOrderId);
    expect(await prisma.payment.count()).toBe(1);
  });

  it('confirms the order only after a valid HMAC signature', async () => {
    const { customer, order, checkout } = await placeOnline();
    const paid = gateway.simulateSuccess(checkout.providerOrderId);

    const forged = await customer.agent.post(`${api}/payments/verify`).send({ ...paid, razorpay_signature: 'a'.repeat(64) });
    expect(forged.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING');

    const ok = await customer.agent.post(`${api}/payments/verify`).send(paid);
    expect(ok.status).toBe(200);
    expect(ok.body.data).toMatchObject({ status: 'CONFIRMED', paymentStatus: 'PAID' });
  });

  it("won't let a customer verify someone else's payment", async () => {
    const { checkout } = await placeOnline();
    const stranger = await loginAs('CUSTOMER', 'stranger');
    const res = await stranger.agent.post(`${api}/payments/verify`).send(gateway.simulateSuccess(checkout.providerOrderId));
    expect(res.status).toBe(404);
  });

  it('records a payment exactly once when the browser and the webhook race', async () => {
    const { customer, order, checkout } = await placeOnline();
    const paid = gateway.simulateSuccess(checkout.providerOrderId);
    const results = await Promise.all([
      customer.agent.post(`${api}/payments/verify`).send(paid),
      webhook('payment.captured', checkout.providerOrderId, paid.razorpay_payment_id, order.total, 'evt_1'),
      customer.agent.post(`${api}/payments/verify`).send(paid),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    const events = await prisma.orderEvent.findMany({ where: { orderId: order.id, status: 'CONFIRMED' } });
    expect(events).toHaveLength(1); // confirmed once, restaurant notified once
  });

  it('rejects unsigned webhooks and processes each event id once', async () => {
    const { order, checkout } = await placeOnline();
    const raw = JSON.stringify({ event: 'payment.captured', payload: {} });
    const unsigned = await request(app).post(`${api}/payments/webhook`).set('Content-Type', 'application/json').set('X-Razorpay-Signature', 'bad').send(raw);
    expect(unsigned.status).toBe(400);

    expect((await webhook('payment.captured', checkout.providerOrderId, 'pay_1', order.total, 'evt_9')).body.data.duplicate).toBe(false);
    expect((await webhook('payment.captured', checkout.providerOrderId, 'pay_1', order.total, 'evt_9')).body.data.duplicate).toBe(true);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('CONFIRMED');
  });

  it('rejects a webhook whose amount does not match the order', async () => {
    const { order, checkout } = await placeOnline();
    const res = await webhook('payment.captured', checkout.providerOrderId, 'pay_2', order.total - 100, 'evt_2');
    expect(res.status).toBe(400);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('PENDING');
  });

  it('marks failed payments and lets the customer retry the same order', async () => {
    const { customer, order, checkout } = await placeOnline();
    await customer.agent.post(`${api}/payments/test/simulate`).send({ providerOrderId: checkout.providerOrderId, outcome: 'failure' });
    expect((await prisma.payment.findFirst())?.status).toBe('FAILED');
    const retry = await customer.agent.post(`${api}/payments/verify`).send(gateway.simulateSuccess(checkout.providerOrderId));
    expect(retry.body.data.status).toBe('CONFIRMED');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.paymentStatus).toBe('PAID');
  });
});

describe('refunds and expiry', () => {
  it('refunds a paid order cancelled before preparation', async () => {
    const { customer, order, checkout } = await placeOnline();
    await customer.agent.post(`${api}/payments/verify`).send(gateway.simulateSuccess(checkout.providerOrderId));
    const res = await customer.agent.post(`${api}/orders/${order.id}/cancel`).send({ reason: 'Ordered by mistake' });
    expect(res.body.data).toMatchObject({ status: 'CANCELLED', paymentStatus: 'REFUNDED' });
    expect((await prisma.payment.findFirst())?.status).toBe('REFUNDED');
  });

  it('cancels unpaid orders after the payment window', async () => {
    const { order } = await placeOnline();
    await prisma.order.update({ where: { id: order.id }, data: { placedAt: new Date(Date.now() - 20 * 60_000) } });
    expect(await orderService.expireUnpaid(15)).toBe(1);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe('CANCELLED');
  });

  it('automatically refunds a payment that completes after the order expired', async () => {
    const { order, checkout } = await placeOnline();
    await prisma.order.update({ where: { id: order.id }, data: { placedAt: new Date(Date.now() - 20 * 60_000) } });
    await orderService.expireUnpaid(15);

    const late = await webhook('payment.captured', checkout.providerOrderId, 'pay_late', order.total, 'evt_late');
    expect(late.status).toBe(200);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))).toMatchObject({ status: 'CANCELLED', paymentStatus: 'REFUNDED' });
  });
});
