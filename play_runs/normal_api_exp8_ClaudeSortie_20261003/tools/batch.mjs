// Run a JSON array of {route, parameters} sequentially; stop at the first failure.
import fs from 'node:fs';
import { Client } from './client.mjs';
const c = new Client();
const steps = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const [i, s] of steps.entries()) {
  try { const d = await c.call(s.route, s.parameters ?? {}, { label: s.label || 'batch' }); if (process.env.V) console.log(JSON.stringify(d).slice(0, 400)); }
  catch (e) { console.log('FAILED at step', i, e.message); process.exit(1); }
}
console.log('ok', steps.length, 'calls; total', c.s.calls);
