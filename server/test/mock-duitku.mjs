// A stand-in for Duitku, for the tests: the same three endpoints, the same signatures.
//   node test/mock-duitku.mjs <port> <merchant code> <api key> <worker base url>
// Control endpoints (tests only):
//   POST /__pay    {merchantOrderId, callback?: true, amount?, resultCode?, signature?}   mark paid, optionally send the callback
//   POST /__mode   {down?: bool, only?: 'NQ'}                                           refuse inquiries / accept one channel only
//   GET  /__seen                                                                       what inquiries arrived
import http from 'node:http';
import { createHash } from 'node:crypto';

const [port, CODE, KEY, WORKER] = process.argv.slice(2);
const md5 = (t) => createHash('md5').update(t).digest('hex');
const tx = new Map(); // merchantOrderId -> { amount, reference, paid, callbackUrl }
const seen = [];
let mode = { down: false, only: null };
// A QRIS-shaped text: merchant name in field 59, NMID in field 51 / 02.
const field = (id, v) => id + String(v.length).padStart(2, '0') + v;
const qrFor = (orderId, amount) => field('00', '01') + field('01', '12')
  + field('51', field('00', 'ID.CO.QRIS.WWW') + field('02', 'ID1026123456789') + field('03', 'UMI'))
  + field('53', '360') + field('54', String(amount)) + field('58', 'ID') + field('59', 'NEXURA GEAR TEST') + field('60', 'TANGERANG')
  + field('62', field('05', orderId)) + '6304ABCD';

const read = (req) => new Promise((res) => { let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => res(b)); });
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

http.createServer(async (req, res) => {
  const raw = await read(req);
  let body = {};
  try { body = raw ? JSON.parse(raw) : {}; } catch { /* left empty */ }

  if (req.url === '/webapi/api/merchant/v2/inquiry') {
    seen.push({ method: body.paymentMethod, orderId: body.merchantOrderId, amount: body.paymentAmount, email: body.email, expiry: body.expiryPeriod, callbackUrl: body.callbackUrl });
    if (mode.down) return send(res, 500, { Message: 'down' });
    if (body.merchantCode !== CODE || body.signature !== md5(CODE + body.merchantOrderId + body.paymentAmount + KEY)) return send(res, 401, { Message: 'Wrong signature' });
    if (mode.only && body.paymentMethod !== mode.only) return send(res, 400, { Message: 'Payment channel not available' });
    if (!Number.isInteger(body.paymentAmount) || !body.email || !body.callbackUrl) return send(res, 400, { Message: 'Bad request' });
    const reference = 'DTEST' + Math.random().toString(36).slice(2, 12).toUpperCase();
    tx.set(body.merchantOrderId, { amount: body.paymentAmount, reference, paid: false, callbackUrl: body.callbackUrl });
    return send(res, 200, { merchantCode: CODE, reference, paymentUrl: 'http://localhost/pay', vaNumber: '', qrString: qrFor(body.merchantOrderId, body.paymentAmount), amount: String(body.paymentAmount), statusCode: '00', statusMessage: 'SUCCESS' });
  }
  if (req.url === '/webapi/api/merchant/transactionStatus') {
    if (mode.down) return send(res, 500, { Message: 'down' });
    if (body.signature !== md5(CODE + body.merchantOrderId + KEY)) return send(res, 401, { Message: 'Wrong signature' });
    const t = tx.get(body.merchantOrderId);
    if (!t) return send(res, 400, { Message: 'Transaction not found' });
    return send(res, 200, { merchantOrderId: body.merchantOrderId, reference: t.reference, amount: String(t.amount), statusCode: t.paid ? '00' : '01', statusMessage: t.paid ? 'SUCCESS' : 'PROCESS' });
  }
  if (req.url === '/__pay') {
    const t = tx.get(body.merchantOrderId);
    if (!t) return send(res, 404, {});
    if (body.paid !== false) t.paid = true;
    let callback = null;
    if (body.callback) {
      const amount = String(body.amount ?? t.amount);
      const form = new URLSearchParams({
        merchantCode: CODE, amount, merchantOrderId: body.merchantOrderId, productDetail: 'x', additionalParam: '', paymentCode: 'SP',
        resultCode: body.resultCode ?? '00', merchantUserId: '', reference: t.reference,
        signature: body.signature ?? md5(CODE + amount + body.merchantOrderId + KEY),
      });
      const r = await fetch(`${WORKER}/api/payments/duitku/callback`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
      callback = { status: r.status, body: await r.text() };
    }
    return send(res, 200, { ok: true, callback });
  }
  if (req.url === '/__mode') { mode = { down: false, only: null, ...body }; return send(res, 200, mode); }
  if (req.url === '/__seen') return send(res, 200, seen);
  send(res, 404, {});
}).listen(Number(port), () => console.log('mock duitku on', port));
