/**
 * Full-flow browser test: a customer, a restaurant owner and a delivery partner, each in an
 * isolated browser context (separate cookies), driven through headless Chrome over the
 * DevTools Protocol. Checks the live Socket.IO updates between them and takes screenshots.
 *
 *   (backend + frontend running, database seeded)
 *   node e2e/full-flow.mjs [restaurant-slug]
 *   CHROME_PATH=/usr/bin/google-chrome BASE_URL=http://localhost:3000 node e2e/full-flow.mjs
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OUT = process.env.OUT_DIR ?? join(import.meta.dirname, 'screenshots');
const PROFILE = join(tmpdir(), `azure-e2e-${Date.now()}`);
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SLUG = process.argv[2] ?? 'nilgiri-bowl-koramangala-0'; // the demo owner's first seeded restaurant
const PORT = 9341;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1366,900', '--no-first-run', 'about:blank',
]);
chrome.stderr.on('data', () => {});

let browser;
for (let i = 0; i < 50 && !browser; i++) {
  try {
    const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    browser = new WebSocket(webSocketDebuggerUrl);
    await new Promise((r) => (browser.onopen = r));
  } catch { browser = undefined; await sleep(200); }
}
let id = 0;
const pending = new Map();
const errors = [];
browser.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const p = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? p.reject(new Error(`${p.method}: ${msg.error.message}`)) : p.resolve(msg.result);
  } else if (msg.method === 'Runtime.exceptionThrown') errors.push(`[${msg.sessionId?.slice(0, 4)}] ${msg.params.exceptionDetails.exception?.description?.split('\n')[0]}`);
  else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(`[console] ${msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 200)}`);
};
const send = (method, params = {}, sessionId) => {
  const i = ++id;
  browser.send(JSON.stringify({ id: i, method, params, ...(sessionId && { sessionId }) }));
  return new Promise((resolve, reject) => pending.set(i, { resolve, reject, method }));
};

/** An isolated browser context = its own cookies, like a separate person on a separate phone. */
async function newUser(name) {
  const { browserContextId } = await send('Target.createBrowserContext');
  const { targetId } = await send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  const page = {
    name,
    eval: async (expression) => {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
      if (r.exceptionDetails) throw new Error(`${name}: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      return r.result.value;
    },
    goto: (url) => send('Page.navigate', { url: BASE + url }, sessionId),
    waitFor: async (expr, label, timeout = 15000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        try { if (await page.eval(expr)) return; } catch {}
        await sleep(200);
      }
      throw new Error(`${name}: timed out waiting for ${label}`);
    },
    click: (text, selector = 'button') => page.eval(`(() => { const el = [...document.querySelectorAll('${selector}')].find(e => e.textContent.trim().includes(${JSON.stringify(text)}) && !e.disabled); if (!el) throw new Error('no ${selector} with text ' + ${JSON.stringify(text)}); el.click(); return true })()`),
    shot: async (file, full = false) => {
      const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full }, sessionId);
      writeFileSync(`${OUT}/${file}.png`, Buffer.from(data, 'base64'));
      console.log(`  📸 ${file}`);
    },
    text: () => page.eval('document.body.innerText'),
  };
  return page;
}

async function login(page, demoLabel, landing) {
  await page.goto('/login');
  await page.waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === '${demoLabel}') && Object.keys(document.querySelector('button')).some(k => k.startsWith('__react'))`, 'login page hydrated');
  await page.click(demoLabel);
  await page.waitFor(`location.pathname === '${landing}'`, `redirect to ${landing}`);
}

const step = (s) => console.log(`▸ ${s}`);
try {
  const customer = await newUser('customer');
  const owner = await newUser('owner');
  const rider = await newUser('rider');

  step('Customer logs in, browses and searches');
  await login(customer, 'Customer', '/');
  await customer.waitFor(`document.querySelectorAll('a[href^="/restaurants/"]').length >= 6`, 'restaurant grid');
  await sleep(500);
  await customer.shot('01-home');
  await customer.eval(`(() => { const i = document.querySelector('input[aria-label="Search restaurants and dishes"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'biriyani'); i.dispatchEvent(new Event('input', { bubbles: true })); i.focus(); return true })()`);
  await customer.waitFor(`document.querySelectorAll('#search-suggestions [role=option]').length > 0`, 'type-ahead suggestions (typo)');
  await customer.shot('02-typeahead-typo');

  step('Owner and rider log in (live dashboards)');
  await login(owner, 'Restaurant', '/partner');
  await owner.waitFor(`document.body.textContent.includes('Live orders')`, 'partner dashboard');
  await login(rider, 'Delivery', '/rider');
  await rider.waitFor(`document.body.textContent.includes('Pickups near you')`, 'rider dashboard');
  await sleep(1500); // sockets connect

  step('Customer adds dishes and pays online');
  await customer.goto(`/restaurants/${SLUG}`);
  await customer.waitFor(`[...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'ADD' && !b.disabled).length >= 2`, 'menu');
  await customer.eval(`(() => { const adds = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'ADD' && !b.disabled); adds[0].click(); return true })()`);
  await sleep(300);
  await customer.eval(`(() => { const adds = [...document.querySelectorAll('button')].filter(b => b.textContent.trim() === 'ADD' && !b.disabled); adds[1].click(); return true })()`);
  await sleep(400);
  await customer.shot('03-restaurant-menu');
  await customer.goto('/cart');
  await customer.waitFor(`document.body.textContent.includes('To pay')`, 'server-priced bill');
  await customer.eval(`(() => { const t = document.querySelector('textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, 'Flat 402, Lakeview Apartments, 5th Main, HSR Layout'); t.dispatchEvent(new Event('input', { bubbles: true })); return true })()`);
  await sleep(300);
  await customer.shot('04-cart');
  await customer.click('Pay ₹');
  await customer.waitFor(`document.body.textContent.includes('Test payment')`, 'payment screen');
  await customer.shot('05-payment');
  await customer.eval(`(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(b => b.textContent.includes('Pay ₹')); b.click(); return true })()`);
  await customer.waitFor(`location.pathname.startsWith('/orders/') && document.body.textContent.includes('Order confirmed')`, 'order page after payment');
  const orderNumber = await customer.eval(`document.body.innerText.match(/Order #(\\d+)/)[1]`);
  console.log(`  order #${orderNumber} confirmed`);

  step('Restaurant sees it instantly and prepares it');
  await owner.waitFor(`document.body.textContent.includes('#${orderNumber}')`, 'new order on board (socket push)', 10000);
  await owner.shot('06-partner-new-order');
  await owner.click('Start preparing');
  await customer.waitFor(`[...document.querySelectorAll('p.font-semibold.text-good')].some(p => p.textContent === 'Being prepared')`, 'customer sees PREPARING live');
  await owner.waitFor(`document.body.textContent.includes('Mark ready')`, 'mark ready button');
  await owner.click('Mark ready');

  step('Rider gets the pickup live, accepts and rides');
  await rider.waitFor(`document.body.textContent.includes('#${orderNumber}')`, 'pickup appears (socket push)', 10000);
  await rider.shot('07-rider-pickups');
  await rider.click('Accept');
  await rider.waitFor(`document.body.textContent.includes('Current delivery')`, 'current delivery');
  await rider.click('Simulate ride');
  await customer.waitFor(`document.querySelector('[aria-label="Delivery partner"]') !== null`, 'rider marker on customer map', 15000);
  await sleep(3500);
  await customer.shot('08-live-tracking');
  await rider.shot('09-rider-riding');

  step('Delivered, customer rates it');
  await rider.click('Mark delivered');
  await customer.waitFor(`document.body.textContent.includes('How was your food?')`, 'review form after delivery');
  await customer.eval(`(() => { document.querySelector('[aria-label="5 stars"]').click(); return true })()`);
  await sleep(200);
  await customer.click('Submit rating');
  await customer.waitFor(`document.body.textContent.includes('You rated this order')`, 'rating saved');
  await customer.shot('10-delivered', true);
  await owner.goto('/partner');
  await owner.waitFor(`document.body.textContent.includes('Live orders')`, 'partner');
  await owner.click('Menu');
  await owner.waitFor(`document.body.textContent.includes('Add a dish')`, 'menu manager');
  await owner.shot('11-partner-menu');

  step('Admin');
  const admin = await newUser('admin');
  await login(admin, 'Admin', '/admin');
  await admin.waitFor(`document.body.textContent.includes('Restaurants waiting for approval')`, 'admin page');
  await sleep(500);
  await admin.shot('12-admin');

  console.log('\nconsole errors:', errors.length ? errors : 'none');
  console.log('PASS');
} catch (err) {
  console.log('FAIL:', err.message);
  console.log('console errors:', errors);
  process.exitCode = 1;
} finally {
  browser?.close();
  chrome.kill('SIGKILL');
  await sleep(300);
  rmSync(PROFILE, { recursive: true, force: true });
}
