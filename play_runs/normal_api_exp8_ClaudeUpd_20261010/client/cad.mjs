// cad.mjs save hours "S:k:hpf" ... -> runs, top-tier drops, xp, calls per 12h using the exact API emulator (elapsed carry, sortie wipes carry)
import { Emu, A } from '/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeUpd_20261010/tools/emu.mjs';
const [,, file, hS, ...pols] = process.argv; const T0 = Date.parse(process.env.T0); const H = +hS * 3600000; const TOP = +(process.env.TOP || 5); const DEPTH = process.env.DEPTH;
const tc = (s) => { let c = 0; for (const v of Object.values(s.global.inventory)) if (v.status === 'owned' && Math.floor(v.item.id / 1000) === TOP) c += v.count; return c; };
for (const pol of pols) {
  const [S, k, hpf] = pol.split(':').map(Number); let agg = { runs: 0, top: 0, calls: 0, xp: 0, df: 0 };
  for (const seed of [1, 2, 3]) {
    const s0 = A.loadSave(file); if (DEPTH) s0.parties[0].expeditionDepthLimit = DEPTH; if (process.env.GATES) { const q = s0.parties[0]; for (const g of process.env.GATES.split(',')) q.clearGateStatus[q.selectedDungeonId * 1000 + (+g) * 10 + 4] = true; }
    const e = new Emu(s0, T0, seed); const st0 = e.stats(); const t0 = tc(e.state); const lv0 = e.p().level, x0 = e.p().experience;
    while (e.t - T0 < H) {
      await e.elapsed(S);
      const p = e.p(); const max = A.computePartyStats(p).partyStats.hp;
      if (k > 0) { if (e.stock() > 0 && p.currentHp > 0 && p.currentHp >= hpf * max) e.sortie(Math.min(k, e.stock())); }
    }
    const st1 = e.stats(); agg.ret = (agg.ret||0) + st1[1]-st0[1]; agg.rt = (agg.rt||0) + st1[3]-st0[3]; agg.runs += st1.reduce((a, b) => a + b, 0) - st0.reduce((a, b) => a + b, 0); agg.df += st1[4] - st0[4]; agg.top += tc(e.state) - t0; agg.calls += e.calls;
    agg.xp += (e.p().level - lv0) * 1e6 + e.p().experience - x0;
  }
  const f = 12 * 3600000 / H / 3;
  console.log(pol.padEnd(12), 'runs/12h', (agg.runs * f).toFixed(1), 'tier' + TOP + '/12h', Math.round(agg.top * f), 'calls/12h', Math.round(agg.calls * f), 'defeat%', (100 * agg.df / agg.runs).toFixed(0), 'return%', (100*agg.ret/agg.runs).toFixed(1), 'retreat%', (100*agg.rt/agg.runs).toFixed(0));
}
