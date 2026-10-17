import request from 'supertest';
import { api, app, loginAs, prisma, resetDb } from './helpers';

const cookieValue = (res: request.Response, name: string) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${name}=`))?.split(';')[0]?.split('=')[1];

const register = (body: Record<string, unknown>) =>
  request(app).post(`${api}/auth/register`).send({ name: 'Riya Sharma', email: 'riya@test.dev', password: 'Secret123', ...body });

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('register & login', () => {
  it('registers a customer and sets httpOnly cookies', async () => {
    const res = await register({});
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'riya@test.dev', role: 'CUSTOMER' });
    expect(res.body.data.user.passwordHash).toBeUndefined();
    const cookies = ([] as string[]).concat(res.headers['set-cookie']);
    expect(cookies.find((c) => c.startsWith('access_token='))).toMatch(/HttpOnly/);
    expect(cookies.find((c) => c.startsWith('refresh_token='))).toMatch(/Path=\/api\/v1\/auth/);
  });

  it('never lets anyone sign up as ADMIN', async () => {
    const res = await register({ role: 'ADMIN' });
    expect(res.status).toBe(422);
  });

  it('rejects duplicate emails and weak passwords', async () => {
    await register({});
    expect((await register({})).status).toBe(409);
    expect((await register({ email: 'x@test.dev', password: 'password' })).status).toBe(422);
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    await register({});
    const wrongPassword = await request(app).post(`${api}/auth/login`).send({ email: 'riya@test.dev', password: 'nope12345' });
    const unknownUser = await request(app).post(`${api}/auth/login`).send({ email: 'ghost@test.dev', password: 'nope12345' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownUser.body.message);
  });

  it('protects routes and accepts both cookie and Bearer auth', async () => {
    expect((await request(app).get(`${api}/auth/me`)).status).toBe(401);
    const { agent, accessToken } = await loginAs('CUSTOMER');
    expect((await agent.get(`${api}/auth/me`)).status).toBe(200);
    expect((await request(app).get(`${api}/auth/me`).set('Authorization', `Bearer ${accessToken}`)).status).toBe(200);
    expect((await request(app).get(`${api}/auth/me`).set('Authorization', 'Bearer forged.token.value')).status).toBe(401);
  });
});

describe('refresh token rotation', () => {
  it('rotates the refresh token on every use', async () => {
    const reg = await register({});
    const first = cookieValue(reg, 'refresh_token')!;
    const res = await request(app).post(`${api}/auth/refresh`).set('Cookie', `refresh_token=${first}`);
    expect(res.status).toBe(200);
    const second = cookieValue(res, 'refresh_token');
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });

  it('treats reuse of an old token as theft and revokes the whole session family', async () => {
    const reg = await register({});
    const stolen = cookieValue(reg, 'refresh_token')!;
    const rotated = cookieValue(await request(app).post(`${api}/auth/refresh`).set('Cookie', `refresh_token=${stolen}`), 'refresh_token')!;

    // Move the rotation outside the 10-second "two tabs" grace window.
    await prisma.session.updateMany({ where: { revokedAt: { not: null } }, data: { revokedAt: new Date(Date.now() - 60_000) } });

    const replay = await request(app).post(`${api}/auth/refresh`).set('Cookie', `refresh_token=${stolen}`);
    expect(replay.status).toBe(401);
    // The legitimate user's newer token is now dead too: the attacker can't keep a session.
    const legit = await request(app).post(`${api}/auth/refresh`).set('Cookie', `refresh_token=${rotated}`);
    expect(legit.status).toBe(401);
    expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(0);
  });

  it('tolerates two tabs refreshing at the same moment', async () => {
    const reg = await register({});
    const token = cookieValue(reg, 'refresh_token')!;
    const [a, b] = await Promise.all([
      request(app).post(`${api}/auth/refresh`).set('Cookie', `refresh_token=${token}`),
      request(app).post(`${api}/auth/refresh`).set('Cookie', `refresh_token=${token}`),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    // No family revocation for a benign race: one session is still active.
    expect(await prisma.session.count({ where: { revokedAt: null } })).toBe(1);
  });

  it('logs out by revoking the session and clearing cookies', async () => {
    const reg = await register({});
    const token = cookieValue(reg, 'refresh_token')!;
    const out = await request(app).post(`${api}/auth/logout`).set('Cookie', `refresh_token=${token}`);
    expect(out.status).toBe(200);
    expect((await request(app).post(`${api}/auth/refresh`).set('Cookie', `refresh_token=${token}`)).status).toBe(401);
  });

  it('blocks suspended users from logging in', async () => {
    const { user } = await loginAs('CUSTOMER');
    await prisma.user.update({ where: { id: user.id }, data: { status: 'SUSPENDED' } });
    const res = await request(app).post(`${api}/auth/login`).send({ email: user.email, password: 'Passw0rd!' });
    expect(res.status).toBe(403);
  });
});
