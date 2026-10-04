// node sortie.mjs MAX [nextDest]  -> fire up to MAX sorties; stop on Defeat; on Clear, optionally move to nextDest.
import fs from 'node:fs';
import { Client } from './client.mjs';
const c = new Client();
const max = Number(process.argv[2] ?? 1), next = process.argv[3] ? Number(process.argv[3]) : null;
const out = [];
for (let i = 0; i < max; i++) {
  let r;
  try { r = await c.commit('expedition/1/sortie', {}, 'sortie'); } catch (e) { console.log('sortie refused', e.message); break; }
  out.push(r.outcome);
  fs.appendFileSync('/tmp/bk/sorties.jsonl', JSON.stringify({ n: c.s.calls, t: c.s.inGameTime, outcome: r.outcome, logId: r.logId, diary: r.diaryEntryId, rewards: r.rewards }) + '\n');
  if (r.outcome === 'Clear') {
    console.log('CLEAR', r.logId, c.s.inGameTime);
    if (next) await c.commit('expedition/1/changeExpedition', { destination: next, destinationMode: 'fixed', depthLimit: 'all', difficultyOffset: 0 }, 'advance');
    break;
  }
  if (r.outcome === 'Defeat') break;
}
console.log('outcomes', out.join(','), 'calls', c.s.calls);
