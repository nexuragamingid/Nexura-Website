// Writes seed SQL for the catalogue from the site's own assets/js/data.js, so the server
// prices orders from the same figures the pages show.   node scripts/seed.mjs > out/seed.sql
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = readFileSync(new URL('../../assets/js/data.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(src, { window });
const { products, checkout, sensi } = window.NEXURA;

const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const row = (table, cols, vals) => `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${vals.map(q).join(', ')});`;
const out = ['DELETE FROM variants;', 'DELETE FROM products;', 'DELETE FROM couriers;'];

for (const p of products) {
  out.push(row('products', ['id', 'name', 'category', 'price', 'stock', 'phone_model'], [p.id, p.name, p.category, p.price, p.stock, p.phoneModel ? 1 : 0]));
  for (const c of p.colors || []) out.push(row('variants', ['product_id', 'id', 'label', 'price'], [p.id, c.id, c.label, c.price ?? null]));
}
checkout.couriers.forEach((c, i) => out.push(row('couriers', ['id', 'label', 'price', 'days_min', 'days_max', 'position'], [c.id, c.label, c.price, c.days[0], c.days[1], i])));
for (const [code, p] of Object.entries(checkout.promos)) out.push(row('promos', ['code', 'label', 'off'], [code.toUpperCase(), p.label, p.off]));
out.push(row('settings', ['key', 'value'], ['insurance', JSON.stringify(checkout.insurance)]));
out.push(row('settings', ['key', 'value'], ['qrisMinutes', JSON.stringify(checkout.qrisMinutes)]));
out.push(row('settings', ['key', 'value'], ['payments', JSON.stringify(checkout.payments.map((p) => p.id))]));
for (const p of sensi.players) out.push(row('sensi_players', ['id', 'name', 'role', 'image', 'settings'], [p.id, p.name, p.role, p.image, JSON.stringify(p.settings)]));

console.log(out.join('\n'));
