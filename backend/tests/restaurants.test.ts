import request from 'supertest';
import { api, app, createMenuItem, createRestaurant, loginAs, prisma, resetDb } from './helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

const newRestaurant = {
  name: 'Namma Dosa Corner',
  cuisines: ['South Indian'],
  area: 'Jayanagar',
  city: 'Bengaluru',
  address: '45, 9th Main, Jayanagar',
  phone: '9876501234',
  latitude: 12.925,
  longitude: 77.593,
  priceForTwo: 25000,
};

describe('restaurant listing', () => {
  it('shows only ACTIVE restaurants, with filters and pagination metadata', async () => {
    const { user } = await loginAs('RESTAURANT_OWNER');
    await createRestaurant(user.id, { name: 'Veg Place', isPureVeg: true, ratingAvg: 4.5 });
    await createRestaurant(user.id, { name: 'Kebab Place', ratingAvg: 4.1 });
    await createRestaurant(user.id, { name: 'Hidden Place', status: 'PENDING' });

    const all = await request(app).get(`${api}/restaurants`);
    expect(all.status).toBe(200);
    expect(all.body.data.map((r: { name: string }) => r.name)).toEqual(['Veg Place', 'Kebab Place']); // sorted by rating
    expect(all.body.meta).toMatchObject({ total: 2, page: 1, totalPages: 1 });

    const veg = await request(app).get(`${api}/restaurants?veg=true`);
    expect(veg.body.data).toHaveLength(1);

    const page2 = await request(app).get(`${api}/restaurants?limit=1&page=2`);
    expect(page2.body.data[0].name).toBe('Kebab Place');
    expect(page2.body.meta).toMatchObject({ hasPreviousPage: true, hasNextPage: false });
  });

  it('returns the menu grouped by category, with bestsellers as "Recommended"', async () => {
    const { user } = await loginAs('RESTAURANT_OWNER');
    const r = await createRestaurant(user.id);
    await createMenuItem(r.id, { name: 'Mutton Biryani' });
    await prisma.menuItem.updateMany({ where: { restaurantId: r.id }, data: { isBestseller: true } });
    await createMenuItem(r.id, { name: 'Raita', category: 'Sides', price: 4900, foodType: 'VEG' });

    const res = await request(app).get(`${api}/restaurants/${r.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.menu.map((s: { category: string }) => s.category)).toEqual(['Recommended', 'Biryani', 'Sides']);
    expect(res.body.data.ownerId).toBeUndefined();
  });

  it('hides unapproved restaurants from the public but not from their owner', async () => {
    const owner = await loginAs('RESTAURANT_OWNER');
    const r = await createRestaurant(owner.user.id, { status: 'PENDING' });
    expect((await request(app).get(`${api}/restaurants/${r.id}`)).status).toBe(404);
    expect((await owner.agent.get(`${api}/restaurants/${r.id}`)).status).toBe(200);
  });
});

describe('role-based access control', () => {
  it('lets only restaurant owners create restaurants, which start PENDING', async () => {
    const customer = await loginAs('CUSTOMER');
    expect((await customer.agent.post(`${api}/restaurants`).send(newRestaurant)).status).toBe(403);
    expect((await request(app).post(`${api}/restaurants`).send(newRestaurant)).status).toBe(401);

    const owner = await loginAs('RESTAURANT_OWNER');
    const created = await owner.agent.post(`${api}/restaurants`).send(newRestaurant);
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('PENDING');
  });

  it("stops owners editing someone else's restaurant or menu", async () => {
    const alice = await loginAs('RESTAURANT_OWNER', 'alice');
    const bob = await loginAs('RESTAURANT_OWNER', 'bob');
    const r = await createRestaurant(alice.user.id);
    const item = await createMenuItem(r.id);

    expect((await bob.agent.patch(`${api}/restaurants/${r.id}`).send({ name: 'Hijacked' })).status).toBe(403);
    expect((await bob.agent.patch(`${api}/restaurants/${r.id}/menu-items/${item.id}`).send({ price: 100 })).status).toBe(403);
    expect((await alice.agent.patch(`${api}/restaurants/${r.id}/menu-items/${item.id}`).send({ price: 31900 })).body.data.price).toBe(31900);
  });

  it('archives menu items instead of deleting them', async () => {
    const owner = await loginAs('RESTAURANT_OWNER');
    const r = await createRestaurant(owner.user.id);
    const item = await createMenuItem(r.id);
    expect((await owner.agent.delete(`${api}/restaurants/${r.id}/menu-items/${item.id}`)).status).toBe(204);
    expect(await prisma.menuItem.findUnique({ where: { id: item.id } })).toMatchObject({ isArchived: true });
    const menu = (await request(app).get(`${api}/restaurants/${r.id}`)).body.data.menu;
    expect(menu).toHaveLength(0);
  });

  it('lets admins approve restaurants, which then become public', async () => {
    const owner = await loginAs('RESTAURANT_OWNER');
    const admin = await loginAs('ADMIN');
    const r = await createRestaurant(owner.user.id, { status: 'PENDING' });
    expect((await owner.agent.patch(`${api}/admin/restaurants/${r.id}/status`).send({ status: 'ACTIVE' })).status).toBe(403);
    expect((await admin.agent.patch(`${api}/admin/restaurants/${r.id}/status`).send({ status: 'ACTIVE' })).status).toBe(200);
    expect((await request(app).get(`${api}/restaurants`)).body.data).toHaveLength(1);
    expect(await prisma.notification.count({ where: { userId: owner.user.id } })).toBe(1);
  });

  it('suspending a user ends all their sessions immediately', async () => {
    const admin = await loginAs('ADMIN');
    const customer = await loginAs('CUSTOMER');
    await admin.agent.patch(`${api}/admin/users/${customer.user.id}/status`).send({ status: 'SUSPENDED' });
    expect(await prisma.session.count({ where: { userId: customer.user.id, revokedAt: null } })).toBe(0);
  });
});

describe('search', () => {
  beforeEach(async () => {
    const { user } = await loginAs('RESTAURANT_OWNER');
    const biryani = await createRestaurant(user.id, { name: 'Paradise Biryani House' });
    await createMenuItem(biryani.id, { name: 'Chicken Dum Biryani', description: 'Hyderabadi style with saffron' });
    await createMenuItem(biryani.id, { name: 'Paneer Tikka', category: 'Starters', foodType: 'VEG', description: 'Char-grilled cottage cheese' });
    const chinese = await createRestaurant(user.id, { name: 'Dragon Wok', cuisines: ['Chinese'], description: 'Indo-Chinese' });
    await createMenuItem(chinese.id, { name: 'Veg Hakka Noodles', category: 'Noodles', foodType: 'VEG', description: 'Wok-tossed noodles' });
    const hidden = await createRestaurant(user.id, { name: 'Biryani Ghost Kitchen', status: 'SUSPENDED' });
    await createMenuItem(hidden.id, { name: 'Ghost Biryani' });
  });

  const search = (q: string) => request(app).get(`${api}/search`).query({ q });

  it('finds restaurants and dishes by full-text match, ranking name matches first', async () => {
    const res = await search('biryani');
    expect(res.body.data.matchType).toBe('fulltext');
    expect(res.body.data.restaurants[0].name).toBe('Paradise Biryani House');
    expect(res.body.data.dishes.map((d: { name: string }) => d.name)).toEqual(['Chicken Dum Biryani']); // not the suspended one
  });

  it('matches words still being typed (prefix) and stemmed words', async () => {
    expect((await search('biry')).body.data.dishes[0].name).toBe('Chicken Dum Biryani');
    expect((await search('noodle')).body.data.dishes[0].name).toBe('Veg Hakka Noodles');
    expect((await search('saffron')).body.data.dishes[0].name).toBe('Chicken Dum Biryani'); // description
  });

  it('falls back to fuzzy matching for typos', async () => {
    const res = await search('biriyani');
    expect(res.body.data.matchType).toBe('fuzzy');
    expect(res.body.data.dishes[0].name).toBe('Chicken Dum Biryani');
    expect((await search('panner')).body.data.dishes[0].name).toBe('Paneer Tikka');
  });

  it('treats hostile input as plain text', async () => {
    const res = await search("'; DROP TABLE users; -- & | !");
    expect(res.status).toBe(200);
    expect(await prisma.user.count()).toBeGreaterThan(0);
  });

  it('validates the query', async () => {
    expect((await search('')).status).toBe(422);
  });
});
