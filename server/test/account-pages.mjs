// Drives the real Daftar, Masuk and Akun pages in Chrome against the local server.
//   node test/account-pages.mjs <base url> <screenshot folder>
import puppeteer from 'puppeteer-core';
const [BASE, OUT] = process.argv.slice(2);
let failed = 0;
const check = (name, ok, detail = '') => { if (!ok) failed += 1; console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name} ${ok ? '' : detail}`); };
const mail = `sari.${Date.now()}@example.com`;
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--no-proxy-server'] });

async function open(context, path) {
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.goto(BASE + path, { waitUntil: 'networkidle0' });
  return page;
}
const settle = (page) => page.waitForNetworkIdle({ idleTime: 400 }).catch(() => {});
const submit = (page, form) => page.$eval(`${form} [type="submit"]`, (b) => b.click());
const setValue = async (page, sel, value) => { await page.$eval(sel, (n) => { n.value = ''; }); await page.type(sel, value); };

console.log('Daftar');
const phone = await browser.createBrowserContext();
let page = await open(phone, '/daftar/');
await page.type('#up-name', 'Sari Dewi');
await page.type('#up-email', mail);
await page.type('#up-password', 'rahasia-sari-1');
await page.type('#up-password2', 'rahasia-sari-1');
await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), submit(page, '[data-signup-form]')]);
check('sign-up lands on Akun', page.url().endsWith('/akun/'), page.url());
check('Akun shows the name', (await page.$eval('[data-acc-side-name]', (n) => n.textContent)) === 'Sari Dewi');
const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
check('this browser holds no password, hash or salt', !/rahasia|hash|salt|nexura-users/.test(stored), stored.slice(0, 200));
check('scripts on the page cannot read the session cookie', !(await page.evaluate(() => document.cookie)).includes('nx_session'));
check('...but the browser has it, HttpOnly', (await phone.cookies()).some((c) => c.name === 'nx_session' && c.httpOnly));
await page.screenshot({ path: `${OUT}/akun-after-signup.png` });

console.log('Profil');
await page.goto(`${BASE}/akun/#pengaturan`, { waitUntil: 'networkidle0' });
await setValue(page, '#acc-name', 'Sari Dewi Lestari');
await setValue(page, '#acc-phone', '081234567890');
await page.$eval('#acc-name', (n) => n.form.requestSubmit());
await settle(page);
await page.reload({ waitUntil: 'networkidle0' });
check('profile change survives a reload', (await page.$eval('#acc-name', (n) => n.value)) === 'Sari Dewi Lestari' && (await page.$eval('#acc-phone', (n) => n.value)) === '081234567890');

console.log('Another device');
const laptop = await browser.createBrowserContext();
let other = await open(laptop, '/akun/');
check('signed out, Akun sends you to Masuk', other.url().includes('/masuk/'), other.url());
await other.type('#in-email', mail);
await other.type('#in-password', 'bukan-passwordnya');
await submit(other, '[data-login-form]');
await other.waitForSelector('[data-auth-error]:not([hidden])');
check('wrong password: the page says so and stays', other.url().includes('/masuk/') && /salah/.test(await other.$eval('[data-auth-error]', (n) => n.textContent)));
await setValue(other, '#in-password', 'rahasia-sari-1');
await Promise.all([other.waitForNavigation({ waitUntil: 'networkidle0' }), submit(other, '[data-login-form]')]);
check('right password: in, on a device that never saw the account', other.url().includes('/akun/') && (await other.$eval('[data-acc-side-name]', (n) => n.textContent)) === 'Sari Dewi Lestari', other.url());

console.log('Signing out');
await Promise.all([other.waitForNavigation({ waitUntil: 'networkidle0' }), other.$eval('[data-acc-logout]', (b) => b.click())]);
await other.goto(BASE + '/akun/', { waitUntil: 'networkidle0' });
check('after Keluar, Akun asks to sign in again', other.url().includes('/masuk/'), other.url());
// The session ends on the server while the phone still has the profile copy.
await phone.deleteCookie(...(await phone.cookies()).filter((c) => c.name === 'nx_session'));
await page.goto(BASE + '/akun/', { waitUntil: 'networkidle0' });
await page.waitForFunction(() => location.pathname.includes('/masuk/'), { timeout: 8000 }).catch(() => {});
check('a session ended elsewhere is noticed, not trusted from the copy', page.url().includes('/masuk/'), page.url());

console.log('Daftar again');
const third = await open(await browser.createBrowserContext(), '/daftar/');
await third.type('#up-name', 'Sari Palsu');
await third.type('#up-email', mail.toUpperCase());
await third.type('#up-password', 'apa-saja-123');
await third.type('#up-password2', 'apa-saja-123');
await submit(third, '[data-signup-form]');
await third.waitForSelector('[data-auth-error]:not([hidden])');
check('an email already in use is refused, with the Masuk link', /udah punya akun/.test(await third.$eval('[data-auth-error]', (n) => n.textContent)) && !!(await third.$('[data-auth-error] a')));
await third.screenshot({ path: `${OUT}/daftar-email-terpakai.png` });

const errors = [...page.errors, ...other.errors, ...third.errors];
check('no script errors on any page', errors.length === 0, errors.join(' | '));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall page checks passed');
process.exit(failed ? 1 : 0);
