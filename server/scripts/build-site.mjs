// Copies the website's pages into server/site, which is what the Worker serves. Everything
// that is not part of the public site (this server folder, saved drafts, git data) stays out.
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const dest = fileURLToPath(new URL('../site/', import.meta.url));
const LEAVE_OUT = new Set(['server', '_saved', '.git', '.gitignore', '.DS_Store', 'node_modules']);
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const name of readdirSync(root)) {
  if (!LEAVE_OUT.has(name)) cpSync(join(root, name), join(dest, name), { recursive: true, filter: (src) => !src.endsWith('.DS_Store') });
}
console.log('site copied to server/site');
