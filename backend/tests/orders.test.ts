import { api, loginAs, orderBody, prisma, resetDb, setupRestaurant } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('placing orders', () => {
  it('prices the order on the server from database prices', async () => {
    const { restaurant, biryani, raita } = await setupRestaurant();
    const customer = await loginAs('CUSTOMER');
    const res = await customer.agent
      .post(`${api}/orders`)
      // A client trying to set its own price/total/status is simply ignored.
      .send({ ...orderBody(restaurant.id, [{ menuItemId: biryani.id, quantity: 2 }, { menuItemId: raita.id, quantity: 1 }]), total: 1, status: 'DELIVERED' });
    expect(res.status).toBe(201);
    // 2 × ₹299 + ₹59 = ₹657 (free delivery above ₹499) + 5% GST
    expect(res.body.data).toMatchObject({ itemsTotal: 65700, deliveryFee: 0, taxes: 3285, total: 68985, status: 'CONFIRMED' });
    expect(res.body.data.items.map((i: { price: number }) => i.price).sort((a: number, b: number) => a - b)).toEqual([5900, 29900]);
  });

  it('merges duplicate cart lines', async () => {
    const { restaurant, biryani } = await setupRestaurant();
    const customer = await loginAs('CUSTOMER');
    const res = await customer.agent.post(`${api}/orders/quote`).send({
      restaurantId: restaurant.id,
      items: [{ menuItemId: biryani.id, quantity: 1 }, { menuItemId: biryani.id, quantity: 2 }],
    });
    expect(res.body.data.lines).toEqual([expect.objectContaining({ menuItemId: biryani.id, quantity: 3 })]);
  });

  it("rejects items from another restaurant, sold-out items and closed restaurants", async () => {
    const a = await setupRestaurant();
    const b = await setupRestaurant();
    const customer = await loginAs('CUSTOMER');
    const mixed = await customer.agent.post(`${api}/orders`).send(orderBody(a.restaurant.id, [{ menuItemId: b.biryani.id, quantity: 1 }]));
    expect(mixed.status).toBe(422);

    await prisma.menuItem.update({ where: { id: a.raita.id }, data: { isAvailable: false } });
    const soldOut = await customer.agent.post(`${api}/orders`).send(orderBody(a.restaurant.id, [{ menuItemId: a.raita.id, quantity: 1 }]));
    expect(soldOut.status).toBe(422);
    expect(soldOut.body.errors.items[0]).toMatch(/sold out/);

    await prisma.restaurant.update({ where: { id: a.restaurant.id }, data: { isOpen: false } });
    const closed = await customer.agent.post(`${api}/orders`).send(orderBody(a.restaurant.id, [{ menuItemId: a.biryani.id, quantity: 1 }]));
    expect(closed.status).toBe(409);
  });

  it('returns the same order for a retried request with the same Idempotency-Key', async () => {
    const { restaurant, biryani } = await setupRestaurant();
    const customer = await loginAs('CUSTOMER');
    const body = orderBody(restaurant.id, [{ menuItemId: biryani.id, quantity: 1 }]);
    const [first, second, third] = await Promise.all(
      [1, 2, 3].map(() => customer.agent.post(`${api}/orders`).set('Idempotency-Key', 'checkout-abc-123').send(body)),
    );
    const ids = new Set([first!.body.data.id, second!.body.data.id, third!.body.data.id]);
    expect(ids.size).toBe(1);
    expect(await prisma.order.count()).toBe(1);
  });

  it('only shows an order to the people involved in it', async () => {
    const { owner, restaurant, biryani } = await setupRestaurant();
    const customer = await loginAs('CUSTOMER');
    const stranger = await loginAs('CUSTOMER', 'stranger');
    const otherOwner = await loginAs('RESTAURANT_OWNER', 'other');
    const order = (await customer.agent.post(`${api}/orders`).send(orderBody(restaurant.id, [{ menuItemId: biryani.id, quantity: 1 }]))).body.data;
    expect((await customer.agent.get(`${api}/orders/${order.id}`)).status).toBe(200);
    expect((await owner.agent.get(`${api}/orders/${order.id}`)).status).toBe(200);
    expect((await stranger.agent.get(`${api}/orders/${order.id}`)).status).toBe(404);
    expect((await otherOwner.agent.get(`${api}/orders/${order.id}`)).status).toBe(404);
  });
});

describe('order lifecycle', () => {
  const placeCod = async () => {
    const setup = await setupRestaurant();
    const customer = await loginAs('CUSTOMER');
    const order = (await customer.agent.post(`${api}/orders`).send(orderBody(setup.restaurant.id, [{ menuItemId: setup.biryani.id, quantity: 1 }]))).body.data;
    return { ...setup, customer, order };
  };

  it('runs CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED with a history entry for each step', async () => {
    const { owner, customer, order } = await placeCod();
    const rider = await loginAs('DELIVERY_PARTNER');

    expect((await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'PREPARING' })).body.data.status).toBe('PREPARING');
    expect((await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'READY' })).body.data.status).toBe('READY');
    expect((await rider.agent.get(`${api}/orders/available`)).body.data.map((o: { id: string }) => o.id)).toEqual([order.id]);
    expect((await rider.agent.post(`${api}/orders/${order.id}/claim`)).body.data.status).toBe('OUT_FOR_DELIVERY');
    const delivered = (await rider.agent.post(`${api}/orders/${order.id}/deliver`)).body.data;
    expect(delivered).toMatchObject({ status: 'DELIVERED', paymentStatus: 'PAID' }); // cash collected
    expect(delivered.events.map((e: { status: string }) => e.status)).toEqual(['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED']);
    expect(await prisma.notification.count({ where: { userId: customer.user.id } })).toBe(5);
  });

  it('refuses illegal moves', async () => {
    const { owner, customer, order } = await placeCod();
    // Skipping PREPARING
    expect((await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'READY' })).status).toBe(409);
    // Customers can't drive the kitchen
    expect((await customer.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'PREPARING' })).status).toBe(403);
    // Once preparing, the customer can no longer cancel
    await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'PREPARING' });
    const cancel = await customer.agent.post(`${api}/orders/${order.id}/cancel`).send({});
    expect(cancel.status).toBe(409);
    expect(cancel.body.message).toMatch(/can no longer be cancelled/);
  });

  it('lets exactly one of several racing delivery partners claim an order', async () => {
    const { owner, order } = await placeCod();
    await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'PREPARING' });
    await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'READY' });
    const riders = await Promise.all([1, 2, 3, 4, 5].map((n) => loginAs('DELIVERY_PARTNER', `rider${n}`)));

    const results = await Promise.all(riders.map((r) => r.agent.post(`${api}/orders/${order.id}/claim`)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.deliveryPartnerId).toBeTruthy();
  });

  it('allows one review per delivered order and keeps the running average correct', async () => {
    const { owner, customer, order, restaurant } = await placeCod();
    expect((await customer.agent.post(`${api}/orders/${order.id}/review`).send({ rating: 5 })).status).toBe(409); // not delivered yet
    const rider = await loginAs('DELIVERY_PARTNER');
    await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'PREPARING' });
    await owner.agent.patch(`${api}/orders/${order.id}/status`).send({ status: 'READY' });
    await rider.agent.post(`${api}/orders/${order.id}/claim`);
    await rider.agent.post(`${api}/orders/${order.id}/deliver`);
    await prisma.restaurant.update({ where: { id: restaurant.id }, data: { ratingAvg: 4, ratingCount: 3 } });

    expect((await customer.agent.post(`${api}/orders/${order.id}/review`).send({ rating: 5, comment: 'Superb' })).status).toBe(201);
    expect((await customer.agent.post(`${api}/orders/${order.id}/review`).send({ rating: 1 })).status).toBe(409);
    expect(await prisma.restaurant.findUnique({ where: { id: restaurant.id } })).toMatchObject({ ratingAvg: 4.25, ratingCount: 4 });
  });
});
