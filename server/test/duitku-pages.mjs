// The payment page with the gateway connected, in Chrome.   node test/duitku-pages.mjs <base> <mock base> <screenshot folder>
import puppeteer from 'puppeteer-core';
const [BASE, MOCK, OUT] = process.argv.slice(2);
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name} ${ok ? '' : detail}`); };
const mock = async (path, body) => (await fetch(MOCK + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });
const page = await (await browser.createBrowserContext()).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const go = async (path) => { await page.goto(BASE + path, { waitUntil: 'networkidle0' }); await new Promise((r) => setTimeout(r, 600)); };
const buy = async (variant) => {
  await page.evaluate((v) => {
    localStorage.setItem('nexura-cart-v1', JSON.stringify([{ id: 'vortex', color: v, qty: 1, checked: true, phone: '' }]));
    localStorage.setItem('nexura-address-v1', JSON.stringify({ name: 'Hana Putri', phone: '081234567890', street: 'Jl. Anggrek No. 9', city: 'Tangerang', postal: '15334' }));
  }, variant);
  await go('/checkout/');
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), page.$eval('[data-co-submit]', (b) => b.click())]);
  return page.$eval('[data-pay-id]', (n) => n.textContent.trim());
};

await go('/');
let id = await buy('ungu');
const src = await page.$eval('[data-pay-qr]', (i) => i.getAttribute('src'));
check('the payment page draws the order\'s own QR, not the placeholder', src.startsWith('data:image/png'), src.slice(0, 40));
await page.addScriptTag({ url: `${BASE}/assets/js/vendor/jsQR.min.js` });
const decoded = await page.evaluate(async () => {
  const img = document.querySelector('[data-pay-qr]');
  await img.decode();
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  return jsQR(d.data, d.width, d.height)?.data || null;
});
const expected = await page.evaluate(() => JSON.parse(localStorage.getItem('nexura-order-v1')).qr);
check('a scanner reads back exactly the gateway\'s text', decoded === expected && decoded.includes(id), String(decoded).slice(0, 60));
check('the Simpan QR button saves that same picture', (await page.$eval('[data-pay-save]', (a) => a.getAttribute('href'))) === src);
check('the NMID and merchant name shown are the ones inside the QR', (await page.$eval('[data-pay-nmid]', (n) => n.textContent)) === 'NMID: ID1026123456789' && (await page.$eval('[data-pay-merchant]', (n) => n.textContent)) === 'NEXURA GEAR TEST');
await page.screenshot({ path: `${OUT}/duitku-1-qr.png`, fullPage: true });
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 800));
check('a guest who reloads the payment page still has their order and QR', (await page.$eval('[data-pay-id]', (n) => n.textContent.trim())) === id && (await page.$eval('[data-pay-qr]', (i) => i.getAttribute('src'))).startsWith('data:image/png') && !(await page.$eval('[data-pay-filled]', (n) => n.hidden)));

await mock('/__pay', { merchantOrderId: id, callback: true });
await page.waitForFunction(() => location.pathname.includes('/berhasil/') && document.querySelector('[data-paid-id]')?.textContent.trim(), { timeout: 12000 }).catch(() => {});
check('once the gateway reports the payment, the open page moves on by itself', page.url().includes('/berhasil/') && (await page.$eval('[data-paid-id]', (n) => n.textContent.trim())) === id, page.url());

id = await buy('biru');
await mock('/__pay', { merchantOrderId: id }); // paid, but the report never arrives
await new Promise((r) => setTimeout(r, 6500));
check('paid but unreported: the page waits', !page.url().includes('/berhasil/'));
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 12000 }).catch(() => {}), page.$eval('[data-pay-check]', (b) => b.click())]);
check('...until Cek Status asks the gateway', page.url().includes('/berhasil/'), page.url());

await mock('/__mode', { down: true });
await page.evaluate(() => localStorage.setItem('nexura-cart-v1', JSON.stringify([{ id: 'vortex', color: 'merah', qty: 1, checked: true, phone: '' }])));
await go('/checkout/');
await page.$eval('[data-co-submit]', (b) => b.click());
await page.waitForSelector('.co-trouble:not([hidden])', { timeout: 20000 }).catch(() => {});
const trouble = await page.$eval('.co-trouble', (n) => (n.hidden ? '' : n.textContent));
check('gateway down: checkout says so and stays put', /gangguan/.test(trouble) && page.url().includes('/checkout/'), trouble);
await mock('/__mode', {});

check('no script errors', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall gateway page checks passed');
process.exit(failed ? 1 : 0);
