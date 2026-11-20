// The payment gateway, end to end, against the stand-in in test/mock-duitku.mjs.
//   node test/duitku.test.mjs <worker base> <mock base> <merchant code> <api key>
// Most checks are an attempt to get an order marked paid without paying.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const [BASE, MOCK, CODE, KEY] = process.argv.slice(2);
const md5 = (t) => createHash('md5').update(t).digest('hex');
const sql = (command) => execSync(`npx wrangler d1 execute nexura-staging --local --command "${command}"`, { cwd: new URL('..', import.meta.url), stdio: 'pipe', env: { ...process.env, CI: '1' } });
let failed = 0; let passed = 0;
const check = (name, ok, detail = '') => { if (ok) { passed += 1; console.log(`  ok    ${name}`); } else { failed += 1; console.log(`  FAIL  ${name} ${detail}`); } };

function browser() {
  const jar = new Map();
  return async (method, path, body) => {
    const res = await fetch(BASE + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }, body: body !== undefined ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie()) { const [pair] = c.split(';'); const i = pair.indexOf('='); if (pair.slice(i + 1) === '') jar.delete(pair.slice(0, i)); else jar.set(pair.slice(0, i), pair.slice(i + 1)); }
    let data = null; try { data = await res.json(); } catch { /* none */ }
    return { status: res.status, data };
  };
}
const mock = async (path, body) => (await fetch(MOCK + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();
const callback = async (fields) => { // what anyone on the internet can send to our callback address
  const res = await fetch(`${BASE}/api/payments/duitku/callback`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) });
  let data = null; try { data = await res.json(); } catch { /* none */ }
  return { status: res.status, data };
};

const stamp = Date.now();
const mail = `gita.${stamp}@example.com`;
const addr = { name: 'Gita Permata', phone: '081234567890', street: 'Jl. Melati No. 5', city: 'Tangerang', postal: '15334' };
const cart = (variant, qty = 1) => ({ items: [{ id: 'reflex', variant, qty }], courier: 'hemat', insured: false, pay: 'qris', address: addr });
const gita = browser(); const other = browser(); const guest = browser();
await gita('POST', '/api/auth/signup', { name: 'Gita Permata', email: mail, phone: '081234567890', password: 'rahasia-gita-1' });
await other('POST', '/api/auth/signup', { name: 'Orang Lain', email: `lain.${stamp}@example.com`, password: 'rahasia-lain-1' });
sql(`UPDATE users SET is_admin = 1 WHERE email = '${mail}'`);
await gita('PUT', '/api/admin/stock', { items: ['kuning', 'hijau', 'biru'].map((variant) => ({ product: 'reflex', variant, qty: 10 })) });
const qty = async (variant) => (await gita('GET', '/api/admin/stock')).data.stock.find((x) => x.product === 'reflex' && x.variant === variant).qty;
const statusOf = async (who, id) => (await who('GET', `/api/orders/${id}`)).data.order.status;
const adminOrder = async (id) => (await gita('GET', '/api/admin/orders')).data.orders.find((o) => o.id === id);
const order = async (who, variant, n = 1) => { const r = await who('POST', '/api/orders', cart(variant, n)); if (r.status !== 201) throw new Error(`order failed: ${r.status} ${JSON.stringify(r.data)}`); return r.data.order; };

console.log('Making the payment');
let r = await gita('GET', '/api/catalog');
check('the pages are told a gateway is connected, and only QRIS is offered', r.data.gateway === true && JSON.stringify(r.data.payments) === '["qris"]', JSON.stringify(r.data.payments));
let o = await order(gita, 'kuning');
let seen = (await mock('/__seen')).filter((s) => s.orderId === o.id).pop();
check('an order comes back with its own QR text', typeof o.qr === 'string' && o.qr.includes(o.id));
check('the gateway was asked for exactly the order total', seen.amount === o.totals.total, `${seen.amount} vs ${o.totals.total}`);
check('...for our payment window, reporting back to our callback address', seen.expiry === 15 && seen.callbackUrl === `${BASE}/api/payments/duitku/callback`, JSON.stringify(seen));
check('...with the buyer\'s email', seen.email === mail);
const og = await order(guest, 'kuning');
seen = (await mock('/__seen')).filter((s) => s.orderId === og.id).pop();
check('a guest (no email at checkout) is sent under the shop\'s address', seen.email === 'order@nexuragear.com', seen.email);
r = await other('GET', `/api/orders/${o.id}`);
check('nobody else can fetch the QR', r.status === 404);

console.log('Forged payment reports');
const total = String(o.totals.total);
r = await callback({ merchantCode: CODE, amount: total, merchantOrderId: o.id, resultCode: '00', reference: 'X', signature: '' });
check('no signature: refused', r.status === 400 && await statusOf(gita, o.id) === 'pending', String(r.status));
r = await callback({ merchantCode: CODE, amount: total, merchantOrderId: o.id, resultCode: '00', reference: 'X', signature: md5(CODE + total + o.id + 'tebak-kunci') });
check('signed with a guessed key: refused', r.status === 400 && await statusOf(gita, o.id) === 'pending', String(r.status));
r = await callback({ merchantCode: 'ORANGLAIN', amount: total, merchantOrderId: o.id, resultCode: '00', reference: 'X', signature: md5('ORANGLAIN' + total + o.id + KEY) });
check('another merchant\'s code: refused', r.status === 400);
r = await mock('/__pay', { merchantOrderId: o.id, paid: false, callback: true, amount: 1 });
check('a correctly signed report for Rp1 instead of the total: refused', r.callback.status === 400 && await statusOf(gita, o.id) === 'pending', JSON.stringify(r.callback));
r = await mock('/__pay', { merchantOrderId: o.id, paid: false, callback: true });
check('a correctly signed report the gateway itself does not confirm: refused', r.callback.status === 409 && await statusOf(gita, o.id) === 'pending', JSON.stringify(r.callback));
r = await mock('/__pay', { merchantOrderId: o.id, paid: false, callback: true, resultCode: '01' });
check('a report that the payment failed leaves the order waiting', r.callback.status === 200 && await statusOf(gita, o.id) === 'pending');
r = await gita('POST', `/api/orders/${o.id}/check`, {});
check('Cek Status on an unpaid order: still waiting', r.status === 200 && r.data.order.status === 'pending');

console.log('A real payment');
const before = await qty('kuning');
r = await mock('/__pay', { merchantOrderId: o.id, callback: true });
r = await gita('GET', `/api/orders/${o.id}`);
check('paid at the gateway + its signed report: the order is paid', r.data.order.status === 'paid' && !r.data.order.qr, r.data.order.status);
r = await mock('/__pay', { merchantOrderId: o.id, callback: true });
check('the same report again is accepted and changes nothing', r.callback.status === 200 && await statusOf(gita, o.id) === 'paid' && await qty('kuning') === before, JSON.stringify(r.callback));

console.log('When the report goes missing');
o = await order(gita, 'hijau');
await mock('/__pay', { merchantOrderId: o.id });
check('paid at the gateway, no report yet: we do not know', await statusOf(gita, o.id) === 'pending');
r = await other('POST', `/api/orders/${o.id}/check`, {});
check('someone else pressing Cek Status on it gets nothing', r.status === 404);
r = await gita('POST', `/api/orders/${o.id}/check`, {});
check('the buyer pressing Cek Status: the gateway is asked, and it is paid', r.data.order.status === 'paid', r.data.order.status);

console.log('Paying at the last moment, and after');
o = await order(gita, 'biru');
let held = await qty('biru');
sql(`UPDATE orders SET expires_at = ${Date.now() - 60000} WHERE id = '${o.id}'`);
await gita('GET', '/api/catalog');
check('just past the window: the buyer sees it expired, but the stock is still held', await statusOf(gita, o.id) === 'expired' && await qty('biru') === held);
await mock('/__pay', { merchantOrderId: o.id, callback: true });
check('...so a payment reported a minute late still goes through', await statusOf(gita, o.id) === 'paid' && !(await adminOrder(o.id)).flag && await qty('biru') === held);

o = await order(gita, 'biru');
held = await qty('biru');
sql(`UPDATE orders SET expires_at = 1 WHERE id = '${o.id}'`);
await gita('GET', '/api/catalog');
check('long past the window: the stock goes back', await qty('biru') === held + 1);
r = await mock('/__pay', { merchantOrderId: o.id, callback: true });
check('money that arrives anyway is not lost: paid, and the stock taken again', r.callback.status === 200 && await statusOf(gita, o.id) === 'paid' && await qty('biru') === held && !(await adminOrder(o.id)).flag, `${await qty('biru')} vs ${held}`);
await mock('/__pay', { merchantOrderId: o.id, callback: true });
check('...once, even if reported twice', await qty('biru') === held);

await gita('PUT', '/api/admin/stock', { items: [{ product: 'reflex', variant: 'hijau', qty: 1 }] });
o = await order(gita, 'hijau');
sql(`UPDATE orders SET expires_at = 1 WHERE id = '${o.id}'`);
await gita('GET', '/api/catalog');
await gita('PUT', '/api/admin/stock', { items: [{ product: 'reflex', variant: 'hijau', qty: 0 }] }); // sold elsewhere meanwhile
await mock('/__pay', { merchantOrderId: o.id, callback: true });
const flagged = await adminOrder(o.id);
check('late payment with the stock gone: paid, flagged for the shop, stock not below zero', flagged.status === 'paid' && flagged.flag === 'stock_short' && await qty('hijau') === 0, JSON.stringify({ s: flagged.status, f: flagged.flag }));

console.log('When the gateway has trouble');
const count = async () => (await gita('GET', '/api/orders')).data.orders.length;
const [n0, q0] = [await count(), await qty('kuning')];
await mock('/__mode', { down: true });
r = await gita('POST', '/api/orders', cart('kuning'));
check('gateway down: no order is made and no stock is taken', r.status === 502 && r.data.error === 'payment_unavailable' && await count() === n0 && await qty('kuning') === q0, `${r.status} ${JSON.stringify(r.data)}`);
await mock('/__mode', {});
o = await order(gita, 'kuning');
await mock('/__mode', { down: true });
r = await callback({ merchantCode: CODE, amount: String(o.totals.total), merchantOrderId: o.id, resultCode: '00', reference: 'LATE1', signature: md5(CODE + o.totals.total + o.id + KEY) });
check('a signed report is honoured even when the gateway cannot be asked back', r.status === 200 && await statusOf(gita, o.id) === 'paid', String(r.status));

await mock('/__mode', { only: 'NQ' });
sql("DELETE FROM settings WHERE key = 'duitkuQris'");
o = await order(gita, 'kuning');
let tried = (await mock('/__seen')).filter((s) => s.orderId === o.id).map((s) => s.method);
check('the merchant\'s QRIS channel is found by trying them in turn', tried.at(-1) === 'NQ' && tried.length > 1, tried.join(','));
o = await order(gita, 'kuning');
tried = (await mock('/__seen')).filter((s) => s.orderId === o.id).map((s) => s.method);
check('...and remembered for the next order', tried.join(',') === 'NQ', tried.join(','));
await mock('/__mode', {});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
