// Drives keranjang -> checkout -> pembayaran -> berhasil -> Pesanan Saya in Chrome against the
// local server, with practice payments on.   node test/shop-pages.mjs <base url> <screenshot folder>
import puppeteer from 'puppeteer-core';
import { execSync } from 'node:child_process';
const [BASE, OUT] = process.argv.slice(2);
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name} ${ok ? '' : detail}`); };
const sql = (c) => execSync(`npx wrangler d1 execute nexura --local --command "${c}"`, { cwd: new URL('..', import.meta.url), stdio: 'pipe', env: { ...process.env, CI: '1' } });
const mail = `dimas.${Date.now()}@example.com`;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
const errors = [];

async function newPage(context) {
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  return page;
}
const go = async (page, path) => { await page.goto(BASE + path, { waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 700)); await page.waitForNetworkIdle({ idleTime: 300 }).catch(() => {}); };
const text = (page, sel) => page.$eval(sel, (n) => n.textContent.trim());
const inPage = (page, method, path, body) => page.evaluate(async (m, p, b) => { const r = await fetch(p, { method: m, headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }, method, path, body);
const fillCart = (page, items) => page.evaluate((list) => {
  localStorage.setItem('nexura-cart-v1', JSON.stringify(list));
  localStorage.setItem('nexura-address-v1', JSON.stringify({ name: 'Dimas Pratama', phone: '081234567890', street: 'Jl. Pemuda No. 118', city: 'Surabaya', postal: '60271' }));
}, items);

const phone = await browser.createBrowserContext();
const page = await newPage(phone);
await go(page, '/daftar/');
await page.type('#up-name', 'Dimas Pratama');
await page.type('#up-email', mail);
await page.type('#up-password', 'rahasia-dimas-1');
await page.type('#up-password2', 'rahasia-dimas-1');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.$eval('[data-signup-form] [type="submit"]', (b) => b.click())]);

sql(`UPDATE users SET is_admin = 1 WHERE email = '${mail}'`); // so this test can also look at stock and ship the order
const stockOf = async (product, variant) => (await inPage(page, 'GET', '/api/admin/stock')).data.stock.find((x) => x.product === product && x.variant === variant).qty;
const stockBefore = await stockOf('iceglow', 'ungu');

console.log('Checkout');
await fillCart(page, [{ id: 'iceglow', color: 'ungu', qty: 2, checked: true, phone: '' }, { id: 'hydrogel-matte', color: 'fullscreen', qty: 1, checked: true, phone: 'iPhone 15 Pro' }]);
await go(page, '/keranjang/');
await page.screenshot({ path: `${OUT}/toko-1-keranjang.png`, fullPage: true });
await go(page, '/checkout/');
await page.screenshot({ path: `${OUT}/toko-2-checkout.png`, fullPage: true });
// A buyer edits the prices in their own browser before paying.
await page.evaluate(() => { window.NEXURA.products.forEach((p) => { p.price = 1; }); window.NEXURA.checkout.couriers.forEach((c) => { c.price = 0; }); });
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.$eval('[data-co-submit]', (b) => b.click())]);
const EXPECT = 159000 * 2 + 44000 + 8000 + 1500;
check('Bayar Sekarang makes the order and opens Pembayaran', page.url().includes('/pembayaran/'), page.url());
const shown = (await text(page, '[data-pay-total]')).replace(/\D/g, '');
check('the bill is the server\'s figure, whatever the browser was changed to', Number(shown) === EXPECT, `${shown} vs ${EXPECT}`);
const orderId = await text(page, '[data-pay-id]');
check('the order number is the server\'s', /^NXR-\d{6}-[0-9A-Z]{6}$/.test(orderId), orderId);
await page.waitForSelector('[data-pay-demo]');
await page.screenshot({ path: `${OUT}/toko-3-pembayaran.png`, fullPage: true });

console.log('Pembayaran');
await page.$eval('[data-pay-check]', (b) => b.click());
await page.waitForFunction(() => /Belum masuk/.test(document.querySelector('[data-pay-check-text]').textContent), { timeout: 5000 }).catch(() => {});
check('Cek Status on an unpaid order: stays, says not yet', page.url().includes('/pembayaran/') && !page.url().includes('berhasil') && /Belum masuk/.test(await text(page, '[data-pay-check-text]')));
// A buyer tells their own browser the order is paid.
await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('nexura-order-v1')); o.paid = Date.now(); o.status = 'paid'; localStorage.setItem('nexura-order-v1', JSON.stringify(o)); });
let r = await inPage(page, 'GET', `/api/orders/${orderId}`);
check('...which changes nothing on the server', r.data.order.status === 'pending');
await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('nexura-order-v1')); o.paid = 0; o.status = 'pending'; localStorage.setItem('nexura-order-v1', JSON.stringify(o)); });
await go(page, '/pembayaran/');
await page.waitForSelector('[data-pay-demo]');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.$eval('[data-pay-demo]', (b) => b.click())]);
check('paid (practice mode): Pembayaran Berhasil, with the same number and total', page.url().includes('/berhasil/') && (await text(page, '[data-paid-id]')) === orderId && Number((await text(page, '[data-paid-total]')).replace(/\D/g, '')) === EXPECT, page.url());
await page.screenshot({ path: `${OUT}/toko-4-berhasil.png`, fullPage: true });
check('the bought lines left the cart', (await page.evaluate(() => JSON.parse(localStorage.getItem('nexura-cart-v1') || '[]').length)) === 0);

console.log('Pesanan Saya');
await go(page, '/akun/#pesanan');
check('the order is in Pesanan Saya as Dikemas', (await page.$$eval('.acc-order', (n) => n.map((x) => x.textContent))).some((t) => t.includes(orderId) && t.includes('Dikemas')));
check('stock went down by what was bought', await stockOf('iceglow', 'ungu') === stockBefore - 2, `${stockBefore} -> ${await stockOf('iceglow', 'ungu')}`);
r = await inPage(page, 'POST', `/api/admin/orders/${orderId}/ship`, { tracking: 'JNE0098765432' });
if (r.status !== 200) console.log('   ship:', JSON.stringify(r));
await page.reload({ waitUntil: 'networkidle0' }); // the buyer opens Pesanan Saya again
// the page draws from its copy first, then again once the server's list arrives
await page.waitForFunction(() => document.querySelector('.acc-order')?.textContent.includes('Dikirim'), { timeout: 8000 }).catch(() => {});
await page.$eval('[data-acc-track]', (b) => b.click());
const card = await page.$eval('.acc-order', (n) => n.textContent);
check('once the shop enters the resi, the buyer sees Dikirim and the number', card.includes('Dikirim') && card.includes('JNE0098765432'), card.replace(/\s+/g, ' ').slice(0, 200));
await page.screenshot({ path: `${OUT}/toko-5-pesanan-saya.png`, fullPage: true });

console.log('Stok habis');
await inPage(page, 'PUT', '/api/admin/stock', { items: [{ product: 'vortex', variant: 'merah', qty: 1 }] });
await fillCart(page, [{ id: 'vortex', color: 'merah', qty: 3, checked: true, phone: '' }]);
await go(page, '/checkout/');
await page.$eval('[data-co-submit]', (b) => b.click());
await page.waitForSelector('.co-trouble:not([hidden])', { timeout: 5000 }).catch(() => {});
const trouble = await page.$eval('.co-trouble', (n) => (n.hidden ? '' : n.textContent));
check('more than is in stock: refused on the page, naming the product', page.url().includes('/checkout/') && /Vortex/.test(trouble) && /Merah/.test(trouble), trouble);
await new Promise((r) => setTimeout(r, 1200)); // the page scrolls the message into view itself
const box = await page.$eval('.co-trouble', (n) => { const r = n.getBoundingClientRect(); const bar = document.querySelector('[data-pay-dock]').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, barTop: bar.top, h: innerHeight }; });
check('...and the message is on screen, clear of the pay bar', box.top > 60 && box.bottom <= Math.min(box.h, box.barTop > box.bottom ? box.h : box.barTop), JSON.stringify(box));
await page.screenshot({ path: `${OUT}/toko-6-stok-kurang.png` });

console.log('Belum bayar, lalu dari perangkat lain');
await fillCart(page, [{ id: 'reflex', color: 'biru', qty: 1, checked: true, phone: '' }]);
await go(page, '/checkout/');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.$eval('[data-co-submit]', (b) => b.click())]);
const unpaidId = await text(page, '[data-pay-id]');
const laptop = await browser.createBrowserContext();
const other = await newPage(laptop);
await go(other, '/masuk/');
await other.type('#in-email', mail);
await other.type('#in-password', 'rahasia-dimas-1');
await Promise.all([other.waitForNavigation({ waitUntil: 'networkidle0' }), other.$eval('[data-login-form] [type="submit"]', (b) => b.click())]);
await go(other, '/akun/#pesanan');
const cards = await other.$$eval('.acc-order', (n) => n.map((x) => x.textContent));
check('another device shows both orders', cards.some((t) => t.includes(orderId)) && cards.some((t) => t.includes(unpaidId) && t.includes('Belum Bayar')), String(cards.length));
const payLink = await other.$eval('.acc-order a.btn--primary', (a) => a.getAttribute('href'));
await go(other, payLink.replace(BASE, '').startsWith('/') ? payLink.replace(BASE, '') : `/pembayaran/?id=${unpaidId}`);
await other.waitForFunction((id) => document.querySelector('[data-pay-id]')?.textContent.trim() === id && !location.search, {}, unpaidId).catch(() => {});
check('...and Bayar Sekarang there opens that order\'s payment page', (await text(other, '[data-pay-id]')) === unpaidId, await text(other, '[data-pay-id]'));

check('no script errors on any page', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall shop page checks passed');
process.exit(failed ? 1 : 0);
