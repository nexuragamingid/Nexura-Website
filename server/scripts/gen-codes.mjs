// Makes sensi codes for one print batch.
//   SENSI_PEPPER=... node scripts/gen-codes.mjs <batch> <player id> <count>
// Writes out/<batch>-<player>.csv  (the codes to print: keep it private, never commit it)
//    and out/<batch>-<player>.sql  (their keyed hashes, for the database)
import { createHmac, randomInt } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const [batch, player, countArg] = process.argv.slice(2);
const count = Number(countArg);
const pepper = process.env.SENSI_PEPPER;
if (!batch || !player || !Number.isInteger(count) || count < 1 || !pepper) {
  console.error('usage: SENSI_PEPPER=... node scripts/gen-codes.mjs <batch> <player id> <count>');
  process.exit(1);
}
if (!/^[a-z0-9-]+$/.test(batch) || !/^[a-z0-9-]+$/.test(player)) { console.error('batch and player: lower-case letters, digits and dashes'); process.exit(1); }
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const codes = new Set();
while (codes.size < count) codes.add(Array.from({ length: 8 }, () => ALPHABET[randomInt(32)]).join(''));
const pretty = (c) => `NX-${c.slice(0, 4)}-${c.slice(4)}`;
const hash = (c) => createHmac('sha256', pepper).update(c).digest('hex');
mkdirSync(new URL('../out/', import.meta.url), { recursive: true });
writeFileSync(new URL(`../out/${batch}-${player}.csv`, import.meta.url), ['code', ...[...codes].map(pretty)].join('\n') + '\n');
writeFileSync(new URL(`../out/${batch}-${player}.sql`, import.meta.url),
  [...codes].map((c) => `INSERT INTO sensi_codes (code_hash, player_id, batch) VALUES ('${hash(c)}', '${player}', '${batch}');`).join('\n') + '\n');
console.log(`${count} codes for ${player}, batch ${batch}`);
