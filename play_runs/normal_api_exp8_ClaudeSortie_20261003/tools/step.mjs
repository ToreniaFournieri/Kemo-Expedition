// node step.mjs N [seconds]  -> N elapsed steps, then one expedition read with a compact summary.
import fs from 'node:fs';
import { Client } from './client.mjs';
const c = new Client();
const n = Number(process.argv[2] ?? 1), sec = Number(process.argv[3] ?? 43200);
for (let i = 0; i < n; i++) await c.commit('progress/elapsed', { elapsedSeconds: sec }, 'step');
if (process.env.NOREAD) process.exit(0);
const d = await c.read('observation/expedition', {}, 'exp');
fs.writeFileSync('/tmp/bk/exp.json', JSON.stringify(d));
const start = Date.parse('2026-10-03T22:20:07.485Z');
console.log('day', ((Date.parse(c.s.inGameTime) - start) / 864e5).toFixed(3), 'calls', c.s.calls);
for (const p of d.expeditionInfo.parties) {
  const g = p.clearGates.map(g => `${g.kind}${g.floor ?? ''}:${g.current}/${g.required}`).join(' ');
  if (p.partyNumber === 1) console.log(`PT1 d${p.destination} ${p.disclosedOutcome}@${p.disclosedFloor} hp${p.currentHp}/${p.maximumHp} stock${p.chargeStock} sortie:${p.controls.sortie.available ? 'ok' : p.controls.sortie.unavailableReason} gates[${g}] sq:${p.sideQuest?.type ?? '-'}`);
  else console.log(`PT${p.partyNumber} d${p.destination} ${p.destinationMode} ${p.disclosedOutcome} hp${p.maximumHp} [${g}]`);
}
