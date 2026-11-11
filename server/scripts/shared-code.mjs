// SQL for a shared sensi code (the QR that is the same on every pack).
//   SENSI_PEPPER=... node scripts/shared-code.mjs <code as the QR carries it> <label> [player id]
// Without a player id the code opens every player.
import { createHmac } from 'node:crypto';
const [code, label, player] = process.argv.slice(2);
const pepper = process.env.SENSI_PEPPER;
if (!code || !label || !pepper) { console.error('usage: SENSI_PEPPER=... node scripts/shared-code.mjs <code> <label> [player id]'); process.exit(1); }
const norm = code.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
console.log(`INSERT OR REPLACE INTO sensi_shared (code_hash, player_id, label) VALUES (${q(createHmac('sha256', pepper).update(`shared:${norm}`).digest('hex'))}, ${player ? q(player) : 'NULL'}, ${q(label)});`);
