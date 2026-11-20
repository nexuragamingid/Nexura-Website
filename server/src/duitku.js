/*
 * Duitku payment gateway (https://docs.duitku.com/api/id/).
 *
 * The merchant code and API key are Cloudflare secrets (DUITKU_MERCHANT_CODE, DUITKU_API_KEY):
 * they are never in this repository and never sent to the browser. Without them the shop has
 * no gateway, and `configured` is false.
 *
 * Three calls are used:
 *   inquiry             make a payment for one order; for QRIS it answers with the QR's text
 *   callback            Duitku telling us a payment's result (verified in `verifyCallback`)
 *   transactionStatus   asking Duitku directly whether an order is paid
 */

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
// MD5 is what Duitku's signatures are defined with; it is not used for anything of our own.
const md5 = async (text) => hex(await crypto.subtle.digest('MD5', enc.encode(text)));

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const configured = (env) => Boolean(env.DUITKU_MERCHANT_CODE && env.DUITKU_API_KEY);

// Live only when the environment says so in as many words; anything else is the sandbox.
// DUITKU_BASE_URL is for the test suite's stand-in server and is honoured for localhost alone.
function baseUrl(env) {
  if (env.DUITKU_BASE_URL && /^http:\/\/localhost:\d+$/.test(env.DUITKU_BASE_URL)) return env.DUITKU_BASE_URL;
  return env.DUITKU_ENV === 'production' ? 'https://passport.duitku.com' : 'https://sandbox.duitku.com';
}

async function post(env, path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${baseUrl(env)}/webapi/api/merchant/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let data = null;
    try { data = await res.json(); } catch { /* not JSON: treated as a failure by the callers */ }
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  } finally {
    clearTimeout(timer);
  }
}

// Which QRIS channel a merchant has depends on their Duitku account. DUITKU_QRIS_METHOD pins
// one; otherwise the one that worked last is tried first, then the known codes in turn.
export const QRIS_METHODS = ['SP', 'NQ', 'LQ', 'DQ', 'GQ', 'SQ'];

/* Makes a QRIS payment for an order. Answers { reference, qr, method } or null (the gateway
   refused every channel, or could not be reached): the caller must then not create the order. */
export async function createQris(env, { orderId, amount, minutes, name, email, phone, callbackUrl, returnUrl, preferred }) {
  const code = env.DUITKU_MERCHANT_CODE;
  const signature = await md5(code + orderId + amount + env.DUITKU_API_KEY);
  const methods = env.DUITKU_QRIS_METHOD ? [env.DUITKU_QRIS_METHOD] : [...new Set([preferred, ...QRIS_METHODS].filter(Boolean))];
  for (const method of methods) {
    const res = await post(env, 'v2/inquiry', {
      merchantCode: code,
      paymentAmount: amount,
      paymentMethod: method,
      merchantOrderId: orderId,
      productDetails: `Pesanan Nexura ${orderId}`,
      email,
      phoneNumber: phone,
      customerVaName: name.slice(0, 20),
      customerDetail: { firstName: name, email, phoneNumber: phone },
      callbackUrl,
      returnUrl,
      signature,
      expiryPeriod: minutes,
    });
    if (res.status === 0) return null; // unreachable: trying other channels would only wait longer
    const d = res.data;
    if (res.ok && d && d.statusCode === '00' && typeof d.qrString === 'string' && d.qrString.length > 20 && d.reference) {
      return { reference: String(d.reference), qr: d.qrString, method };
    }
  }
  return null;
}

/* Reads Duitku's callback (a form post) and checks it is theirs: the merchant code is ours and
   the signature was made with our API key. Answers the fields, or null. */
export async function verifyCallback(env, request) {
  let form;
  try {
    const type = (request.headers.get('Content-Type') || '').toLowerCase();
    const raw = await request.text();
    if (raw.length > 8192) return null;
    form = type.includes('json') ? JSON.parse(raw) : Object.fromEntries(new URLSearchParams(raw));
  } catch { return null; }
  const f = (k) => (typeof form[k] === 'string' || typeof form[k] === 'number' ? String(form[k]) : '');
  const data = { merchantCode: f('merchantCode'), amount: f('amount'), orderId: f('merchantOrderId'), resultCode: f('resultCode'), reference: f('reference'), signature: f('signature').toLowerCase() };
  if (!data.orderId || !/^\d+$/.test(data.amount) || data.merchantCode !== env.DUITKU_MERCHANT_CODE) return null;
  const expected = await md5(data.merchantCode + data.amount + data.orderId + env.DUITKU_API_KEY);
  return safeEqual(expected, data.signature) ? data : null;
}

/* Asks Duitku about one order. Answers 'paid', 'pending', 'cancelled', or 'unknown' when they
   could not be reached or gave an answer we do not understand. `amount` is what they hold. */
export async function status(env, orderId) {
  const code = env.DUITKU_MERCHANT_CODE;
  const res = await post(env, 'transactionStatus', { merchantCode: code, merchantOrderId: orderId, signature: await md5(code + orderId + env.DUITKU_API_KEY) });
  const d = res.data;
  if (!res.ok || !d || typeof d.statusCode !== 'string') return { state: 'unknown' };
  const state = { '00': 'paid', '01': 'pending', '02': 'cancelled' }[d.statusCode] || 'unknown';
  return { state, amount: Number(d.amount), reference: d.reference ? String(d.reference) : null };
}
