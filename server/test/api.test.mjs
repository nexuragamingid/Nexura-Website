// End-to-end checks against a local `wrangler dev`.   node test/api.test.mjs <base url> <sensi code> <second code>
// Each check is something an attacker or a bug would try; the run fails loudly if one gets through.
import { execSync } from 'node:child_process';

const [BASE = 'http://localhost:8787', CODE_A, CODE_B, SHARED] = process.argv.slice(2);
// Stands in for things only the owner or the payment gateway can do: a direct change in the database.
const sql = (command) => execSync(`npx wrangler d1 execute nexura --local --command "${command}"`, { cwd: new URL('..', import.meta.url), stdio: 'pipe', env: { ...process.env, CI: '1' } });
let failed = 0;
let passed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed += 1; console.log(`  ok    ${name}`); } else { failed += 1; console.log(`  FAIL  ${name} ${detail}`); }
}

// A browser: keeps its own cookies.
function browser() {
  const jar = new Map();
  return async function call(method, path, body, headers = {}) {
    const res = await fetch(BASE + path, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...headers },
      body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const [k, v] = [pair.slice(0, i), pair.slice(i + 1)];
      if (v === '') jar.delete(k); else jar.set(k, v);
      call.lastCookies = (call.lastCookies || []).concat(c);
    }
    let data = null;
    try { data = await res.json(); } catch { /* no body */ }
    return { status: res.status, data, raw: res };
  };
}

const stamp = Date.now();
const mailA = `ani.${stamp}@example.com`;
const mailB = `budi.${stamp}@example.com`;
const addr = { name: 'Ani Wijaya', phone: '081234567890', street: 'Jl. Kemang Raya No. 12', city: 'Jakarta Selatan', postal: '12730' };
const cartOk = { items: [{ id: 'iceglow', variant: 'ungu', qty: 2 }, { id: 'vortex', variant: 'merah', qty: 1 }], courier: 'reguler', insured: true, pay: 'qris', address: addr };

const ani = browser();
const budi = browser();
const guest = browser();
const stranger = browser();
const guest2 = browser();

console.log('Accounts');
let r = await ani('POST', '/api/auth/signup', { name: 'Ani Wijaya', email: mailA, phone: '081234567890', password: 'rahasia-ani-1' });
check('sign up works', r.status === 201 && r.data.user.email === mailA, JSON.stringify(r.data));
check('the reply never carries a hash or salt', !/pw_|hash|salt/i.test(JSON.stringify(r.data)));
check('session cookie is HttpOnly and SameSite', (ani.lastCookies || []).some((c) => c.startsWith('nx_session=') && /HttpOnly/.test(c) && /SameSite=Lax/.test(c)));
r = await budi('POST', '/api/auth/signup', { name: 'Budi Santoso', email: mailB, phone: '081298765432', password: 'rahasia-budi-1' });
check('second account works', r.status === 201);
r = await stranger('POST', '/api/auth/signup', { name: 'Ani Palsu', email: mailA.toUpperCase(), phone: '081234567890', password: 'apa-saja-123' });
check('same email (any case) is refused', r.status === 409 && r.data.error === 'email_exists', JSON.stringify(r.data));
r = await stranger('POST', '/api/auth/signup', { name: 'X', email: 'bukan-email', phone: '1', password: 'pendek' });
check('bad sign-up data is refused', r.status === 400);
r = await ani('GET', '/api/me');
check('signed-in user sees own profile', r.data.user?.email === mailA);
r = await stranger('GET', '/api/me');
check('a visitor is nobody', r.data.user === null);
r = await stranger('GET', '/api/me/addresses');
check('addresses need a sign-in', r.status === 401);

console.log('Cross-site requests');
r = await ani('POST', '/api/auth/logout', {}, { Origin: 'https://evil.example' });
check('a POST from another site is refused', r.status === 403);
r = await ani('GET', '/api/me');
check('...and did nothing', r.data.user?.email === mailA);
r = await ani('POST', '/api/me/password', 'current=x&next=y', { 'Content-Type': 'application/x-www-form-urlencoded' });
check('form posts are refused (JSON only)', r.status === 415);

console.log('Prices come from the server');
r = await ani('POST', '/api/orders/quote', cartOk);
check('quote matches the catalogue', r.status === 200 && r.data.totals.goods === 159000 * 2 + 19500 && r.data.totals.shipping === 12000 && r.data.totals.insurance === 1500
  && r.data.totals.total === 159000 * 2 + 19500 + 12000 + 1500, JSON.stringify(r.data));
r = await ani('POST', '/api/orders', { ...cartOk, items: [{ id: 'iceglow', variant: 'ungu', qty: 1, price: 1, unit_price: 1 }], totals: { total: 1 }, total: 1, status: 'paid' });
check('a price or status sent by the browser is ignored', r.status === 201 && r.data.order.totals.goods === 159000 && r.data.order.status === 'pending', JSON.stringify(r.data));
const orderA = r.data.order.id;
for (const [name, patch] of [
  ['negative quantity', { items: [{ id: 'iceglow', variant: 'ungu', qty: -5 }] }],
  ['fractional quantity', { items: [{ id: 'iceglow', variant: 'ungu', qty: 0.001 }] }],
  ['huge quantity', { items: [{ id: 'iceglow', variant: 'ungu', qty: 100000 }] }],
  ['unknown product', { items: [{ id: 'gratisan', qty: 1 }] }],
  ['unknown variant', { items: [{ id: 'iceglow', variant: 'emas', qty: 1 }] }],
  ['missing phone model', { items: [{ id: 'hydrogel-matte', variant: 'fullscreen', qty: 1 }] }],
  ['unknown courier', { courier: 'gratis' }],
  ['unknown payment', { pay: 'utang' }],
  ['made-up promo', { promo: 'GRATIS100' }],
  ['empty cart', { items: [] }],
  ['bad postal code', { address: { ...addr, postal: '12' } }],
]) {
  r = await ani('POST', '/api/orders', { ...cartOk, ...patch });
  check(`refused: ${name}`, r.status === 400, `${r.status} ${JSON.stringify(r.data)}`);
}
r = await ani('POST', '/api/orders', { ...cartOk, items: [{ id: 'frostbyte', variant: 'ungu', qty: 1 }] });
check('refused: out of stock', r.status === 409 && r.data.error === 'out_of_stock');

console.log('Nobody reads someone else\'s data');
r = await ani('GET', `/api/orders/${orderA}`);
check('owner opens own order', r.status === 200 && r.data.order.address.street === addr.street);
r = await budi('GET', `/api/orders/${orderA}`);
check('another account cannot', r.status === 404);
r = await stranger('GET', `/api/orders/${orderA}`);
check('a visitor cannot', r.status === 404);
r = await budi('GET', '/api/orders');
check('order list holds only your own', r.status === 200 && r.data.orders.length === 0);
await ani('PUT', '/api/me/addresses', { addresses: [addr] });
r = await budi('GET', '/api/me/addresses');
check('address book holds only your own', r.status === 200 && r.data.addresses.length === 0);
r = await ani('GET', "/api/orders/' OR '1'='1");
check('SQL in the address bar opens nothing', r.status === 404);
r = await stranger('POST', '/api/payments/duitku/callback', { merchantOrderId: orderA, resultCode: '00' });
r = await ani('GET', `/api/orders/${orderA}`);
check('nobody can mark an order paid by calling the callback', r.data.order.status === 'pending');

console.log('Guest checkout');
r = await guest('POST', '/api/orders', cartOk);
check('a guest can order', r.status === 201);
const orderG = r.data.order.id;
r = await guest('GET', `/api/orders/${orderG}`);
check('...and see it from the same browser', r.status === 200);
r = await stranger('GET', `/api/orders/${orderG}`);
check('...but another browser cannot', r.status === 404);
r = await guest('POST', '/api/auth/signup', { name: 'Citra Lestari', email: `citra.${stamp}@example.com`, phone: '081211112222', password: 'rahasia-citra-1' });
r = await guest('GET', '/api/orders');
check('the guest order follows them into their new account', r.data.orders.length === 1 && r.data.orders[0].id === orderG);

console.log('Sensi codes');
if (CODE_A && CODE_B) {
  r = await stranger('POST', '/api/sensi/claim', { code: 'NX-0000-0000' });
  check('a made-up code is refused', r.status === 404);
  r = await ani('POST', '/api/sensi/claim', { code: CODE_A.toLowerCase().replace(/-/g, ' ') });
  check('a real code opens a player (case and spacing forgiven)', r.status === 200 && !!r.data.sensi[0].player.name, JSON.stringify(r.data));
  r = await ani('POST', '/api/sensi/claim', { code: CODE_A });
  check('the owner can open it again', r.status === 200);
  r = await budi('POST', '/api/sensi/claim', { code: CODE_A });
  check('a second person cannot claim the same code', r.status === 409 && !r.data.sensi, JSON.stringify(r.data));
  r = await budi('GET', '/api/sensi');
  check('...and sees nothing of it', r.data.sensi.length === 0);
  const both = await Promise.all([browser()('POST', '/api/sensi/claim', { code: CODE_B }), browser()('POST', '/api/sensi/claim', { code: CODE_B })]);
  check('two claims at the same instant: exactly one wins', both.filter((x) => x.status === 200).length === 1, both.map((x) => x.status).join(','));
  r = await guest2('POST', '/api/sensi/claim', { code: SHARED });
  check('the shared pack QR needs an account', r.status === 401 && r.data.error === 'sign_in_required', JSON.stringify(r.data));
  r = await budi('POST', '/api/sensi/claim', { code: SHARED.toLowerCase() });
  check('...and opens every player for a signed-in user', r.status === 200 && r.data.sensi.length === 6, JSON.stringify(r.data).slice(0, 200));
  await budi('POST', '/api/sensi/claim', { code: SHARED });
  r = await budi('GET', '/api/sensi');
  check('...once each, however often it is scanned', r.data.sensi.length === 6, String(r.data.sensi.length));
  let last;
  for (let i = 0; i < 12; i += 1) last = await stranger('POST', '/api/sensi/claim', { code: `NX-AAAA-AA${String(i).padStart(2, '0')}` });
  check('guessing codes gets cut off', last.status === 429, String(last.status));
} else {
  console.log('  (skipped: no codes given)');
}

console.log('Admin');
r = await budi('GET', '/api/admin/orders');
check('an ordinary account is kept out of admin', r.status === 403);
r = await stranger('GET', '/api/admin/stock');
check('a visitor is kept out of admin', r.status === 401);
r = await budi('PATCH', '/api/me', { name: 'Budi Santoso', is_admin: 1, admin: true });
r = await budi('GET', '/api/admin/stock');
check('nobody can make themselves admin from the site', r.status === 403);
sql(`UPDATE users SET is_admin = 1 WHERE email = '${mailA}'`);
r = await ani('GET', '/api/admin/orders');
check('an admin sees every order', r.status === 200 && r.data.orders.some((o) => o.id === orderG) && r.data.orders.some((o) => o.id === orderA));
r = await ani('POST', `/api/admin/orders/${orderA}/ship`, { tracking: 'JNE123456789' });
check('an unpaid order cannot be shipped', r.status === 409 && r.data.error === 'not_paid');
sql(`UPDATE orders SET status = 'paid', paid_at = 1 WHERE id = '${orderA}'`); // what the gateway callback will do
r = await ani('POST', `/api/admin/orders/${orderA}/ship`, { tracking: 'JNE123456789' });
r = await ani('GET', `/api/orders/${orderA}`);
check('a paid order can, and the buyer sees the tracking number', r.data.order.status === 'shipped' && r.data.order.tracking === 'JNE123456789', JSON.stringify(r.data.order.status));

console.log('Stock');
const qtyOf = async (product, variant) => (await ani('GET', '/api/admin/stock')).data.stock.find((x) => x.product === product && x.variant === variant).qty;
const stateOf = async (product, variant) => (await stranger('GET', '/api/catalog')).data.products.find((p) => p.id === product).variants.find((v) => v.id === variant).stock;
const reflex = (variant, qty) => ({ ...cartOk, items: [{ id: 'reflex', variant, qty }] });
r = await ani('PUT', '/api/admin/stock', { items: [{ product: 'reflex', variant: 'kuning', qty: 2 }, { product: 'reflex', variant: 'hijau', qty: 1 }, { product: 'reflex', variant: 'biru', qty: 3 }] });
check('admin sets the allotment', r.status === 200 && await qtyOf('reflex', 'kuning') === 2);
r = await ani('PUT', '/api/admin/stock', { items: [{ product: 'reflex', variant: 'kuning', qty: -1 }] });
check('refused: negative stock', r.status === 400);
r = await ani('PUT', '/api/admin/stock', { items: [{ product: 'tidak-ada', variant: '', qty: 5 }] });
check('refused: stock for a product that does not exist', r.status === 400);
r = await budi('POST', '/api/orders', reflex('kuning', 2));
const orderStock = r.data.order?.id;
check('an order takes its units at once', r.status === 201 && await qtyOf('reflex', 'kuning') === 0);
check('...and the pages show the variant as sold out', await stateOf('reflex', 'kuning') === 'out');
r = await stranger('POST', '/api/orders', reflex('kuning', 1));
check('...so the next buyer is refused', r.status === 409 && r.data.error === 'out_of_stock');
sql(`UPDATE orders SET expires_at = 1 WHERE id = '${orderStock}'`); // its 15 minutes are up
check('unpaid past its window: the units come back', await stateOf('reflex', 'kuning') === 'low' && await qtyOf('reflex', 'kuning') === 2);
await stranger('GET', '/api/catalog');
check('...once, not every time someone looks', await qtyOf('reflex', 'kuning') === 2);
r = await budi('GET', `/api/orders/${orderStock}`);
check('...and the order shows as expired', r.data.order.status === 'expired');
const race = await Promise.all([browser()('POST', '/api/orders', reflex('hijau', 1)), browser()('POST', '/api/orders', reflex('hijau', 1))]);
check('two buyers, one unit left, same instant: one order', race.filter((x) => x.status === 201).length === 1 && race.filter((x) => x.status === 409).length === 1, race.map((x) => x.status).join(','));
check('...and stock never goes below zero', await qtyOf('reflex', 'hijau') === 0);
r = await budi('POST', '/api/orders', { ...cartOk, items: [{ id: 'reflex', variant: 'biru', qty: 2 }, { id: 'reflex', variant: 'biru', qty: 2 }] });
check('splitting one variant over two lines does not get past the count', r.status === 409 && await qtyOf('reflex', 'biru') === 3, String(r.status));

console.log('Passwords');
r = await ani('POST', '/api/me/password', { current: 'salah-banget', next: 'rahasia-ani-2' });
check('wrong current password is refused', r.status === 401);
const aniPhone = browser();
await aniPhone('POST', '/api/auth/login', { email: mailA, password: 'rahasia-ani-1' });
r = await ani('POST', '/api/me/password', { current: 'rahasia-ani-1', next: 'rahasia-ani-2' });
check('password change works', r.status === 200);
r = await aniPhone('GET', '/api/me');
check('...and signs out the other device', r.data.user === null);
r = await browser()('POST', '/api/auth/login', { email: mailA, password: 'rahasia-ani-1' });
check('the old password no longer works', r.status === 401);
r = await browser()('POST', '/api/auth/login', { email: mailA, password: 'rahasia-ani-2' });
check('the new one does', r.status === 200);
const a = await browser()('POST', '/api/auth/login', { email: mailB, password: 'tebakan' });
const b = await browser()('POST', '/api/auth/login', { email: `tidak.ada.${stamp}@example.com`, password: 'tebakan' });
check('wrong password and unknown email look the same', a.status === 401 && b.status === 401 && a.data.error === b.data.error);
let guess;
for (let i = 0; i < 6; i += 1) guess = await browser()('POST', '/api/auth/login', { email: mailB, password: `tebakan-${i}` });
check('guessing a password gets cut off', guess.status === 429, String(guess.status));
r = await browser()('POST', '/api/auth/login', { email: mailB, password: 'rahasia-budi-1' });
check('...even with the right one, until the wait is over', r.status === 429);
await ani('POST', '/api/auth/logout', {});
r = await ani('GET', '/api/me');
check('sign out ends the session', r.data.user === null);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
