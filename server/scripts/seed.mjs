// Seed SQL for the catalogue, made from the site's own assets/js/data.js, so the server prices
// orders from the same figures the pages show. Used by scripts/build.mjs (the Worker applies it
// itself); run directly to read it:   node scripts/seed.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const src = readFileSync(new URL('../../assets/js/data.js', import.meta.url), 'utf8');
const window = {};
vm.runInNewContext(src, { window });
const { products, checkout, sensi } = window.NEXURA;

const q = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const row = (table, cols, vals) => `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${vals.map(q).join(', ')});`;
const START_QTY = 20;
const out = ['DELETE FROM couriers;'];

for (const p of products) {
  // An upsert, not a replace: replacing a product would take its stock rows with it.
  out.push(`INSERT INTO products (id, name, category, price, phone_model) VALUES (${[p.id, p.name, p.category, p.price, p.phoneModel ? 1 : 0].map(q).join(', ')})
  ON CONFLICT(id) DO UPDATE SET name = excluded.name, category = excluded.category, price = excluded.price, phone_model = excluded.phone_model;`);
  for (const c of p.colors || []) out.push(row('variants', ['product_id', 'id', 'label', 'price'], [p.id, c.id, c.label, c.price ?? null]));
  // Opening allotment for the website: a placeholder until the real figures are entered in admin.
  // INSERT OR IGNORE, so running the seed again never overwrites live stock.
  const qty = p.stock === 'out' ? 0 : START_QTY;
  for (const v of (p.colors?.length ? p.colors.map((c) => c.id) : [''])) out.push(`INSERT OR IGNORE INTO stock (product_id, variant_id, qty) VALUES (${q(p.id)}, ${q(v)}, ${qty});`);
}
checkout.couriers.forEach((c, i) => out.push(row('couriers', ['id', 'label', 'price', 'days_min', 'days_max', 'position'], [c.id, c.label, c.price, c.days[0], c.days[1], i])));
for (const [code, p] of Object.entries(checkout.promos)) out.push(row('promos', ['code', 'label', 'off'], [code.toUpperCase(), p.label, p.off]));
out.push(row('settings', ['key', 'value'], ['insurance', JSON.stringify(checkout.insurance)]));
out.push(row('settings', ['key', 'value'], ['qrisMinutes', JSON.stringify(checkout.qrisMinutes)]));
out.push(row('settings', ['key', 'value'], ['payments', JSON.stringify(checkout.payments.map((p) => p.id))]));
for (const p of sensi.players) out.push(row('sensi_players', ['id', 'name', 'role', 'image', 'settings'], [p.id, p.name, p.role, p.image, JSON.stringify(p.settings)]));

export const seedStatements = out.map((q) => q.replace(/;\s*$/, ''));
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(out.join('\n'));
