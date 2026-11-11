/*
 * Nexura API (Cloudflare Worker + D1).
 *
 * Rules this file keeps:
 *   - The browser never decides a price, a total, or whether an order is paid.
 *   - Every read of an order, address or sensi is filtered by who is asking.
 *   - Passwords, session tokens and sensi codes are stored only as hashes.
 *   - Anything guessable (passwords, codes) sits behind an attempt limit.
 */

const SESSION_COOKIE = 'nx_session';
const GUEST_COOKIE = 'nx_guest';
const SESSION_DAYS = 30;
const PBKDF2_ITERATIONS = 100000; // the most the Workers runtime allows
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MAX_BODY = 20 * 1024;
const MAX_QTY = 99;
const MAX_LINES = 30;
const MAX_ADDRESSES = 10;
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/* ------------------------------ small helpers ------------------------------ */

class HttpError extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; }
}
const bad = (code, extra) => new HttpError(400, code, extra);

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const randomHex = (bytes) => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const enc = new TextEncoder();
const sha256 = async (text) => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));

// Compares without stopping at the first difference, so timing says nothing about the hash.
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hashPassword(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations }, key, 256);
  return hex(bits);
}

async function hmac(secret, text) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

function cookies(request) {
  const out = {};
  for (const part of (request.headers.get('Cookie') || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function setCookie(ctx, name, value, maxAgeSeconds) {
  const secure = ctx.url.protocol === 'https:' ? '; Secure' : '';
  ctx.setCookies.push(`${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`);
}

function json(ctx, status, body) {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  for (const c of ctx.setCookies) headers.append('Set-Cookie', c);
  return new Response(JSON.stringify(body), { status, headers });
}

async function readBody(request) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) throw new HttpError(415, 'json_only');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'too_large');
  let body;
  try { body = JSON.parse(text); } catch { throw bad('invalid_json'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('invalid_json');
  return body;
}

/* ------------------------------ validation ------------------------------ */

const str = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');
function text(v, field, min, max) {
  const s = str(v);
  if (s.length < min || s.length > max) throw bad('invalid_field', { field });
  return s;
}
function email(v) {
  const s = str(v).toLowerCase();
  if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw bad('invalid_field', { field: 'email' });
  return s;
}
function phone(v, field = 'phone') {
  const s = str(v).replace(/[\s-]/g, '');
  if (!/^\+?\d{9,15}$/.test(s)) throw bad('invalid_field', { field });
  return s;
}
function password(v, field = 'password') {
  if (typeof v !== 'string' || v.length < 8 || v.length > 200) throw bad('invalid_field', { field });
  return v;
}
function address(v) {
  if (!v || typeof v !== 'object') throw bad('invalid_field', { field: 'address' });
  const postal = str(v.postal);
  if (!/^\d{5}$/.test(postal)) throw bad('invalid_field', { field: 'postal' });
  return {
    name: text(v.name, 'address.name', 2, 80),
    phone: phone(v.phone, 'address.phone'),
    street: text(v.street, 'address.street', 5, 200),
    city: text(v.city, 'address.city', 2, 80),
    postal,
  };
}

/* ------------------------------ rate limits ------------------------------ */

async function attempts(db, bucket, windowMs) {
  const row = await db.prepare('SELECT COUNT(*) AS n FROM rate_events WHERE bucket = ? AND at > ?').bind(bucket, Date.now() - windowMs).first();
  return row.n;
}
const record = (db, bucket) => db.prepare('INSERT INTO rate_events (bucket, at) VALUES (?, ?)').bind(bucket, Date.now()).run();
async function limit(db, bucket, max, windowMs) {
  if (await attempts(db, bucket, windowMs) >= max) throw new HttpError(429, 'too_many_attempts');
}

/* ------------------------------ who is asking ------------------------------ */

async function currentUser(ctx) {
  const token = cookies(ctx.request)[SESSION_COOKIE];
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await ctx.db.prepare(
    `SELECT u.id, u.email, u.name, u.phone, u.created_at, u.pw_changed, s.token_hash
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(await sha256(token), Date.now()).first();
  return row || null;
}
async function requireUser(ctx) {
  const user = await currentUser(ctx);
  if (!user) throw new HttpError(401, 'sign_in_required');
  return user;
}
const publicUser = (u) => ({ email: u.email, name: u.name, phone: u.phone, created: u.created_at, pwChanged: u.pw_changed || null });

const guestId = (ctx) => {
  const id = cookies(ctx.request)[GUEST_COOKIE];
  return id && /^[0-9a-f]{32}$/.test(id) ? id : null;
};
// 'u:<id>' when signed in, else this browser's guest id (made on first need).
async function holderOf(ctx, { create = false } = {}) {
  const user = await currentUser(ctx);
  if (user) return `u:${user.id}`;
  let id = guestId(ctx);
  if (!id && create) { id = randomHex(16); setCookie(ctx, GUEST_COOKIE, id, 365 * 24 * 3600); }
  return id ? `g:${id}` : null;
}

async function startSession(ctx, userId) {
  const token = randomHex(32);
  const now = Date.now();
  await ctx.db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .bind(await sha256(token), userId, now, now + SESSION_DAYS * DAY).run();
  setCookie(ctx, SESSION_COOKIE, token, SESSION_DAYS * 24 * 3600);
  // What this browser did as a guest (orders, opened sensi) moves into the account.
  const guest = guestId(ctx);
  if (guest) {
    await ctx.db.batch([
      ctx.db.prepare('UPDATE orders SET holder = ? WHERE holder = ?').bind(`u:${userId}`, `g:${guest}`),
      ctx.db.prepare('UPDATE sensi_codes SET holder = ? WHERE holder = ?').bind(`u:${userId}`, `g:${guest}`),
    ]);
    setCookie(ctx, GUEST_COOKIE, '', 0);
  }
}

/* ------------------------------ accounts ------------------------------ */

async function signUp(ctx) {
  const body = await readBody(ctx.request);
  const data = { name: text(body.name, 'name', 2, 80), email: email(body.email), phone: phone(body.phone), password: password(body.password) };
  await limit(ctx.db, `signup:${ctx.ip}`, 10, HOUR);
  await record(ctx.db, `signup:${ctx.ip}`);
  const salt = randomHex(16);
  const id = randomHex(16);
  try {
    await ctx.db.prepare('INSERT INTO users (id, email, name, phone, pw_hash, pw_salt, pw_iter, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, data.email, data.name, data.phone, await hashPassword(data.password, salt, PBKDF2_ITERATIONS), salt, PBKDF2_ITERATIONS, Date.now()).run();
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'email_exists');
    throw e;
  }
  await startSession(ctx, id);
  return json(ctx, 201, { user: publicUser({ ...data, created_at: Date.now() }) });
}

// The same work is done for an unknown email as for a wrong password, so the two can't be told apart.
const DUMMY_SALT = '00000000000000000000000000000000';
async function signIn(ctx) {
  const body = await readBody(ctx.request);
  const mail = email(body.email);
  const pw = typeof body.password === 'string' ? body.password.slice(0, 200) : '';
  await limit(ctx.db, `login:mail:${mail}`, 5, 15 * MIN);
  await limit(ctx.db, `login:ip:${ctx.ip}`, 30, 15 * MIN);
  const user = await ctx.db.prepare('SELECT * FROM users WHERE email = ?').bind(mail).first();
  const hash = await hashPassword(pw, user ? user.pw_salt : DUMMY_SALT, user ? user.pw_iter : PBKDF2_ITERATIONS);
  if (!user || !safeEqual(hash, user.pw_hash)) {
    await ctx.db.batch([
      ctx.db.prepare('INSERT INTO rate_events (bucket, at) VALUES (?, ?)').bind(`login:mail:${mail}`, Date.now()),
      ctx.db.prepare('INSERT INTO rate_events (bucket, at) VALUES (?, ?)').bind(`login:ip:${ctx.ip}`, Date.now()),
    ]);
    throw new HttpError(401, 'wrong_email_or_password');
  }
  await startSession(ctx, user.id);
  return json(ctx, 200, { user: publicUser(user) });
}

async function signOut(ctx) {
  const token = cookies(ctx.request)[SESSION_COOKIE];
  if (token) await ctx.db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  setCookie(ctx, SESSION_COOKIE, '', 0);
  return json(ctx, 200, { ok: true });
}

async function updateMe(ctx) {
  const user = await requireUser(ctx);
  const body = await readBody(ctx.request);
  const name = body.name === undefined ? user.name : text(body.name, 'name', 2, 80);
  const tel = body.phone === undefined ? user.phone : phone(body.phone);
  await ctx.db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').bind(name, tel, user.id).run();
  return json(ctx, 200, { user: publicUser({ ...user, name, phone: tel }) });
}

async function changePassword(ctx) {
  const user = await requireUser(ctx);
  const body = await readBody(ctx.request);
  const next = password(body.next, 'next');
  await limit(ctx.db, `pw:${user.id}`, 5, 15 * MIN);
  const row = await ctx.db.prepare('SELECT pw_hash, pw_salt, pw_iter FROM users WHERE id = ?').bind(user.id).first();
  const current = typeof body.current === 'string' ? body.current.slice(0, 200) : '';
  if (!safeEqual(await hashPassword(current, row.pw_salt, row.pw_iter), row.pw_hash)) {
    await record(ctx.db, `pw:${user.id}`);
    throw new HttpError(401, 'wrong_password');
  }
  const salt = randomHex(16);
  const now = Date.now();
  await ctx.db.batch([
    ctx.db.prepare('UPDATE users SET pw_hash = ?, pw_salt = ?, pw_iter = ?, pw_changed = ? WHERE id = ?')
      .bind(await hashPassword(next, salt, PBKDF2_ITERATIONS), salt, PBKDF2_ITERATIONS, now, user.id),
    // every other device is signed out
    ctx.db.prepare('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?').bind(user.id, user.token_hash),
  ]);
  return json(ctx, 200, { ok: true, pwChanged: now });
}

async function getAddresses(ctx) {
  const user = await requireUser(ctx);
  const { results } = await ctx.db.prepare('SELECT id, name, phone, street, city, postal FROM addresses WHERE user_id = ? ORDER BY position').bind(user.id).all();
  return json(ctx, 200, { addresses: results });
}
async function putAddresses(ctx) {
  const user = await requireUser(ctx);
  const body = await readBody(ctx.request);
  if (!Array.isArray(body.addresses) || body.addresses.length > MAX_ADDRESSES) throw bad('invalid_field', { field: 'addresses' });
  const list = body.addresses.map(address);
  await ctx.db.batch([
    ctx.db.prepare('DELETE FROM addresses WHERE user_id = ?').bind(user.id),
    ...list.map((a, i) => ctx.db.prepare('INSERT INTO addresses (id, user_id, position, name, phone, street, city, postal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(randomHex(8), user.id, i, a.name, a.phone, a.street, a.city, a.postal)),
  ]);
  return getAddresses(ctx);
}

/* ------------------------------ catalogue and orders ------------------------------ */

async function loadShop(db) {
  const [products, variants, couriers, promos, settings] = await db.batch([
    db.prepare('SELECT * FROM products'),
    db.prepare('SELECT * FROM variants'),
    db.prepare('SELECT * FROM couriers ORDER BY position'),
    db.prepare('SELECT * FROM promos'),
    db.prepare('SELECT * FROM settings'),
  ]);
  const cfg = Object.fromEntries(settings.results.map((r) => [r.key, JSON.parse(r.value)]));
  return { products: products.results, variants: variants.results, couriers: couriers.results, promos: promos.results, cfg };
}

async function catalog(ctx) {
  const shop = await loadShop(ctx.db);
  return json(ctx, 200, {
    products: shop.products.map((p) => ({
      id: p.id, price: p.price, stock: p.stock,
      variants: shop.variants.filter((v) => v.product_id === p.id).map((v) => ({ id: v.id, price: v.price ?? p.price })),
    })),
    couriers: shop.couriers.map((c) => ({ id: c.id, label: c.label, price: c.price, days: [c.days_min, c.days_max] })),
    insurance: shop.cfg.insurance,
    payments: shop.cfg.payments,
  });
}

// Prices an order from the database. The request says what and how many; nothing else.
function priceOrder(shop, body) {
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > MAX_LINES) throw bad('invalid_field', { field: 'items' });
  const lines = body.items.map((it, i) => {
    if (!it || typeof it !== 'object') throw bad('invalid_field', { field: `items.${i}` });
    const product = shop.products.find((p) => p.id === it.id);
    if (!product) throw bad('unknown_product', { item: i });
    if (product.stock === 'out') throw new HttpError(409, 'out_of_stock', { item: i, id: product.id });
    if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > MAX_QTY) throw bad('invalid_field', { field: `items.${i}.qty` });
    const own = shop.variants.filter((v) => v.product_id === product.id);
    let variant = null;
    if (own.length) {
      variant = own.find((v) => v.id === it.variant);
      if (!variant) throw bad('unknown_variant', { item: i });
    }
    const model = product.phone_model ? text(it.phoneModel, `items.${i}.phoneModel`, 2, 60) : null;
    return {
      product_id: product.id, variant_id: variant ? variant.id : null, name: product.name,
      variant: variant ? variant.label : null, phone_model: model, qty: it.qty,
      unit_price: variant && variant.price != null ? variant.price : product.price,
    };
  });
  const courier = shop.couriers.find((c) => c.id === body.courier);
  if (!courier) throw bad('unknown_courier');
  if (!shop.cfg.payments.includes(body.pay)) throw bad('unknown_payment');
  let promo = null;
  if (body.promo) {
    promo = shop.promos.find((p) => p.code === String(body.promo).trim().toUpperCase());
    if (!promo) throw bad('unknown_promo');
  }
  const goods = lines.reduce((sum, l) => sum + l.unit_price * l.qty, 0);
  const { rate, min } = shop.cfg.insurance;
  const insurance = body.insured === true ? Math.max(min, Math.ceil((goods * rate) / 100) * 100) : 0;
  const discount = promo ? Math.min(promo.off, goods) : 0;
  return {
    lines, courier, promo,
    totals: { goods, shipping: courier.price, insurance, discount, total: goods + courier.price + insurance - discount },
  };
}

async function quote(ctx) {
  const priced = priceOrder(await loadShop(ctx.db), await readBody(ctx.request));
  return json(ctx, 200, { totals: priced.totals, items: priced.lines.map((l) => ({ id: l.product_id, variant: l.variant_id, qty: l.qty, price: l.unit_price })) });
}

function orderId() {
  const d = new Date(Date.now() + 7 * HOUR); // WIB
  const pad = (n) => String(n).padStart(2, '0');
  const tail = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => CROCKFORD[b % 32]).join('');
  return `NXR-${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${tail}`;
}

async function createOrder(ctx) {
  const body = await readBody(ctx.request);
  await limit(ctx.db, `order:${ctx.ip}`, 20, HOUR);
  const shop = await loadShop(ctx.db);
  const priced = priceOrder(shop, body);
  const addr = address(body.address);
  const note = str(body.note).slice(0, 200);
  const holder = await holderOf(ctx, { create: true });
  const id = orderId();
  const now = Date.now();
  const t = priced.totals;
  await record(ctx.db, `order:${ctx.ip}`);
  await ctx.db.batch([
    ctx.db.prepare(
      `INSERT INTO orders (id, holder, status, goods, shipping, insurance, discount, total, courier_id, pay_method, promo_code, note,
                           addr_name, addr_phone, addr_street, addr_city, addr_postal, created_at, expires_at)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, holder, t.goods, t.shipping, t.insurance, t.discount, t.total, priced.courier.id, body.pay, priced.promo ? priced.promo.code : null, note,
      addr.name, addr.phone, addr.street, addr.city, addr.postal, now, now + shop.cfg.qrisMinutes * MIN),
    ...priced.lines.map((l, i) => ctx.db.prepare(
      'INSERT INTO order_items (order_id, line, product_id, variant_id, name, variant, phone_model, qty, unit_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ).bind(id, i, l.product_id, l.variant_id, l.name, l.variant, l.phone_model, l.qty, l.unit_price)),
  ]);
  return json(ctx, 201, { order: await readOrder(ctx.db, id, holder) });
}

// Always asked with the holder, so an order id alone opens nothing.
async function readOrder(db, id, holder) {
  const order = await db.prepare('SELECT * FROM orders WHERE id = ? AND holder = ?').bind(id, holder).first();
  if (!order) return null;
  const { results } = await db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY line').bind(id).all();
  const status = order.status === 'pending' && order.expires_at < Date.now() ? 'expired' : order.status;
  return {
    id: order.id, status, created: order.created_at, expires: order.expires_at, paid: order.paid_at,
    pay: order.pay_method, courier: order.courier_id, note: order.note, promo: order.promo_code,
    totals: { goods: order.goods, shipping: order.shipping, insurance: order.insurance, discount: order.discount, total: order.total },
    address: { name: order.addr_name, phone: order.addr_phone, street: order.addr_street, city: order.addr_city, postal: order.addr_postal },
    items: results.map((l) => ({ id: l.product_id, variant: l.variant_id, name: l.name, variantLabel: l.variant, phoneModel: l.phone_model, qty: l.qty, price: l.unit_price })),
  };
}

async function getOrder(ctx, id) {
  const holder = await holderOf(ctx);
  const order = holder && /^NXR-\d{6}-[0-9A-Z]{6}$/.test(id) ? await readOrder(ctx.db, id, holder) : null;
  if (!order) throw new HttpError(404, 'not_found'); // the same answer for "not yours" and "no such order"
  return json(ctx, 200, { order });
}

async function listOrders(ctx) {
  const holder = await holderOf(ctx);
  if (!holder) return json(ctx, 200, { orders: [] });
  const { results } = await ctx.db.prepare('SELECT id FROM orders WHERE holder = ? ORDER BY created_at DESC LIMIT 50').bind(holder).all();
  const orders = [];
  for (const row of results) orders.push(await readOrder(ctx.db, row.id, holder));
  return json(ctx, 200, { orders });
}

/* ------------------------------ sensi ------------------------------ */

// NX-XXXX-XXXX, forgiving of case, dashes and the look-alike letters.
function normalizeCode(v) {
  const s = str(v).toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^NX/, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  return s.length === 8 && [...s].every((ch) => CROCKFORD.includes(ch)) ? s : null;
}

const sensiOf = (row) => ({ player: { id: row.player_id, name: row.name, role: row.role, image: row.image }, settings: JSON.parse(row.settings), claimed: row.claimed_at });

async function claimSensi(ctx) {
  const body = await readBody(ctx.request);
  if (!ctx.env.SENSI_PEPPER) throw new HttpError(503, 'not_configured');
  await limit(ctx.db, `sensi:${ctx.ip}`, 10, 15 * MIN);
  const code = normalizeCode(body.code);
  const hash = code ? await hmac(ctx.env.SENSI_PEPPER, code) : null;
  const holder = await holderOf(ctx, { create: true });
  if (hash) {
    // One statement: the claim only lands if nobody holds the code yet.
    await ctx.db.prepare('UPDATE sensi_codes SET holder = ?, claimed_at = ? WHERE code_hash = ? AND holder IS NULL').bind(holder, Date.now(), hash).run();
  }
  const row = hash && await ctx.db.prepare(
    'SELECT c.holder, c.claimed_at, c.player_id, p.name, p.role, p.image, p.settings FROM sensi_codes c JOIN sensi_players p ON p.id = c.player_id WHERE c.code_hash = ?',
  ).bind(hash).first();
  if (!row) {
    await record(ctx.db, `sensi:${ctx.ip}`);
    throw new HttpError(404, 'unknown_code');
  }
  if (row.holder !== holder) {
    await record(ctx.db, `sensi:${ctx.ip}`);
    throw new HttpError(409, 'code_already_used');
  }
  return json(ctx, 200, { sensi: sensiOf(row) });
}

async function listSensi(ctx) {
  const holder = await holderOf(ctx);
  if (!holder) return json(ctx, 200, { sensi: [] });
  const { results } = await ctx.db.prepare(
    'SELECT c.claimed_at, c.player_id, p.name, p.role, p.image, p.settings FROM sensi_codes c JOIN sensi_players p ON p.id = c.player_id WHERE c.holder = ? ORDER BY c.claimed_at DESC',
  ).bind(holder).all();
  return json(ctx, 200, { sensi: results.map(sensiOf) });
}

/* ------------------------------ routing ------------------------------ */

const routes = [
  ['POST', /^\/api\/auth\/signup$/, signUp],
  ['POST', /^\/api\/auth\/login$/, signIn],
  ['POST', /^\/api\/auth\/logout$/, signOut],
  ['GET', /^\/api\/me$/, async (ctx) => { const u = await currentUser(ctx); return json(ctx, 200, { user: u ? publicUser(u) : null }); }],
  ['PATCH', /^\/api\/me$/, updateMe],
  ['POST', /^\/api\/me\/password$/, changePassword],
  ['GET', /^\/api\/me\/addresses$/, getAddresses],
  ['PUT', /^\/api\/me\/addresses$/, putAddresses],
  ['GET', /^\/api\/catalog$/, catalog],
  ['POST', /^\/api\/orders\/quote$/, quote],
  ['POST', /^\/api\/orders$/, createOrder],
  ['GET', /^\/api\/orders$/, listOrders],
  ['GET', /^\/api\/orders\/([^/]+)$/, getOrder],
  ['POST', /^\/api\/sensi\/claim$/, claimSensi],
  ['GET', /^\/api\/sensi$/, listSensi],
  // Payment gateway callback: not connected yet. Until it is, no order can become 'paid'.
  ['POST', /^\/api\/payments\/duitku\/callback$/, () => { throw new HttpError(501, 'not_connected'); }],
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ctx = { request, env, url, db: env.DB, setCookies: [], ip: request.headers.get('CF-Connecting-IP') || 'local' };
    try {
      if (!url.pathname.startsWith('/api/')) throw new HttpError(404, 'not_found');
      // A request that changes something must come from our own pages, not from another site.
      if (request.method !== 'GET' && !url.pathname.startsWith('/api/payments/')) {
        const origin = request.headers.get('Origin');
        if (origin && origin !== url.origin) throw new HttpError(403, 'wrong_origin');
        if (request.headers.get('Sec-Fetch-Site') === 'cross-site') throw new HttpError(403, 'wrong_origin');
      }
      for (const [method, pattern, handler] of routes) {
        const m = url.pathname.match(pattern);
        if (m && request.method === method) return await handler(ctx, ...m.slice(1).map(decodeURIComponent));
      }
      throw new HttpError(404, 'not_found');
    } catch (e) {
      if (e instanceof HttpError) return json(ctx, e.status, { error: e.code, ...e.extra });
      console.error(e); // details stay in the log; the visitor gets nothing to learn from
      return json(ctx, 500, { error: 'server_error' });
    }
  },

  // Daily: forget finished sessions and old attempt records.
  async scheduled(event, env) {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Date.now()),
      env.DB.prepare('DELETE FROM rate_events WHERE at < ?').bind(Date.now() - DAY),
    ]);
  },
};
