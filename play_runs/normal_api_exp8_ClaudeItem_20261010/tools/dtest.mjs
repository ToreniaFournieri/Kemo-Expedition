// dtest.mjs save target_dungeon policyJSON seeds  -> time/calls until boss of target dungeon is beaten (moves destination after each boss)
import { Emu, A } from './emu.mjs';
const [,, file, tdS, polS, seedsS, t0S] = process.argv;
const T0x = t0S ? Date.parse(t0S) : null;
const pol = JSON.parse(polS); const td = +tdS;
// pol: {steps: {phaseKey: [stepSec, k]}}; phase = 'boss' when boss gate unlocked, 'gate' otherwise ; default key 'd'
const out = [];
for (const seed of seedsS.split(',').map(Number)) {
  const st0 = A.loadSave(file); const T0 = T0x ?? Math.max(Date.parse('2026-10-09T05:10:03.712Z'), ...st0.parties.flatMap(q => (q.diaryLogs||[]).map(x => x.createdAt||0))); const e = new Emu(st0, T0, seed); const start = e.t; let d = e.p().selectedDungeonId; let ms = [];
  let guard = 0;
  while (guard++ < 3000 && e.t - start < (+process.env.MAXD||20) * 86400000) {
    if (e.boss(d)) { ms.push(`D${d}@${((e.t-start)/86400000).toFixed(2)}/c${e.calls}/L${e.p().level}`); if (d >= td) break; const r = e.commit('commit/expedition/1/changeExpedition', { destination: d + 1, destinationMode: 'fixed' }); if (r.error) { await e.elapsed(60); continue; } d = d + 1; }
    const bossOpen = !!e.p().clearGateStatus?.[d * 1000 + 604];
    if (bossOpen && !ms.some(x=>x.startsWith('G'+d))) ms.push(`G${d}@${((e.t-start)/86400000).toFixed(2)}/c${e.calls}/L${e.p().level}`);
    const key = (bossOpen && pol['boss']) ? 'boss' : (pol['D' + d] ? 'D' + d : 'd');
    const [sec, k] = pol[key];
    await e.elapsed(sec);
    if (k > 0) { const st = e.stock(); if (st > 0) e.sortie(Math.min(k, st)); else e.calls++; }
  }
  out.push(ms.join(' ') + ` | end ${((e.t-start)/86400000).toFixed(2)}d c${e.calls}`);
}
console.log(polS); for (const o of out) console.log('  ', o);
