// Fails when any business detail in src/config/site.ts is still null, so the
// public legal pages can't be deployed with "[… not yet provided]" placeholders.
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/config/site.ts', import.meta.url), 'utf8');
const block = source.match(/export const business = \{([\s\S]*?)\n\};/);
if (!block) {
  console.error('check-business-info: could not find `business` in src/config/site.ts');
  process.exit(1);
}
const missing = [...block[1].matchAll(/^\s*(\w+):\s*null\b/gm)].map((m) => m[1]);
if (missing.length) {
  console.error(`Business details missing in src/config/site.ts: ${missing.join(', ')}`);
  console.error('Fill them in before deploying the public pages.');
  process.exit(1);
}
console.log('Business details are complete.');
