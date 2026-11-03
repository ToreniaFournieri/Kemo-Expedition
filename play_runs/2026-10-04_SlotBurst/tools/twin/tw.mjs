import fs from 'node:fs';
// Offline twin helpers on the exact exported save (repo engine bundled by play_runs/ai_play_tools/twin/build.mjs).
import * as T from '../../../ai_play_tools/twin/twin.mjs';
export { T };
const realCrypto = globalThis.crypto;
export function seedCrypto(seed) {
  let v = (seed >>> 0) || 0x9e3779b9;
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues(a) { for (let i = 0; i < a.length; i++) { v ^= v << 13; v >>>= 0; v ^= v >>> 17; v ^= v << 5; v >>>= 0; a[i] = v; } return a; }, randomUUID: () => realCrypto.randomUUID(), subtle: realCrypto.subtle } });
}
export const GATE_K = { 1: 7, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1 };
export const expRuns = (p, k) => p <= 0 ? 1e300 : p >= 1 ? k : (Math.pow(p, -k) - 1) / (1 - p);
// Configure party for stage f of dungeon d: f=1..5 floor gate, 6 boss-entry gate, 7 boss clear.
export function stageParty(p, d, f) {
  const q = { ...p, selectedDungeonId: d, clearGateStatus: { ...p.clearGateStatus }, clearGateProgress: { ...p.clearGateProgress } };
  for (let g = 1; g < Math.min(f, 6); g++) q.clearGateStatus[d * 1000 + g * 10 + 4] = true;
  for (let g = f; g <= 5; g++) delete q.clearGateStatus[d * 1000 + g * 10 + 4];
  if (f === 7) { for (let g = 1; g <= 5; g++) q.clearGateStatus[d * 1000 + g * 10 + 4] = true; q.clearGateStatus[d * 1000 + 604] = true; }
  else delete q.clearGateStatus[d * 1000 + 604];
  q.expeditionDepthLimit = f <= 5 ? `${f}f-3` : f === 6 ? 'beforeBoss' : 'all';
  q.expeditionDifficultyOffset = 0;
  return q;
}
export async function stageSim(state, party, d, f, n, seed) {
  seedCrypto(seed);
  const st = { ...state, parties: [stageParty(party, d, f), ...state.parties.slice(1)] };
  const r = await T.simulateExpeditionRuns(st, 0, 'mode.normal', n);
  const succ = f <= 6 ? (r.Clear + r.Return) / n : r.Clear / n;
  return { succ, r };
}
export function loadSave(file) { return T.loadSave(file); }
// Full runs through the sortie engine with battle logs: boss arrival, mean damage fraction dealt to the boss, kills.
let langReady = false;
export async function bossDamage(state, party, d, n, seed) {
  if (!langReady) { await T.ensureLanguageLoaded('en'); langReady = true; }
  const st = { ...state, parties: [stageParty(party, d, 7), ...state.parties.slice(1)] };
  let v = (seed >>> 0) || 3; const rnd = () => { v ^= v << 13; v >>>= 0; v ^= v >>> 17; v ^= v << 5; v >>>= 0; return v / 4294967296; }; let b = 0n;
  let arr = 0, frac = 0, kills = 0;
  T.withBattleSeedSourceForTesting(() => (BigInt(seed) << 32n) | b++, () => T.withGameplayRandomSourceForTesting(rnd, () => {
    for (let i = 0; i < n; i++) {
      const out = T.simulateApiSortieBatchForTesting(st, 0, 1, 'mode.normal', 1790000000000 + i, 0);
      const bd = T.buildBattleLogData(out.runs[0].log, 1, 'x').battleLog;
      const br = bd.rooms.find(r => r.roomType === 'battle_Boss');
      if (br) { if(process.env.BOSSLOG && arr===0)fs.writeFileSync(process.env.BOSSLOG,JSON.stringify(bd,null,1)); arr++; if (br.outcome === 'victory') { kills++; frac += 1; } else frac += Math.min(1, br.damageDealt / br.enemyMaximumHp); }
    }
  }));
  return { reach: arr / n, frac: arr ? frac / arr : 0, kills: kills / n };
}
// Progress through stage f measured on battle logs: mean (rooms cleared + damage fraction of the stopping room) / target rooms.
export async function wallProgress(state, party, d, f, n, seed) {
  if (!langReady) { await T.ensureLanguageLoaded('en'); langReady = true; }
  const st = { ...state, parties: [stageParty(party, d, f), ...state.parties.slice(1)] };
  const target = f <= 5 ? (f - 1) * 4 + 3 : f === 6 ? 23 : 24;
  let v = (seed >>> 0) || 3; const rnd = () => { v ^= v << 13; v >>>= 0; v ^= v >>> 17; v ^= v << 5; v >>>= 0; return v / 4294967296; }; let b = 0n;
  let prog = 0;
  T.withBattleSeedSourceForTesting(() => (BigInt(seed) << 32n) | b++, () => T.withGameplayRandomSourceForTesting(rnd, () => {
    for (let i = 0; i < n; i++) {
      const out = T.simulateApiSortieBatchForTesting(st, 0, 1, 'mode.normal', 1790000000000 + i, 0);
      const rooms = T.buildBattleLogData(out.runs[0].log, 1, 'x').battleLog.rooms;
      let cleared = 0, frac = 0;
      for (const r of rooms) { if (r.outcome === 'victory' || !r.enemyMaximumHp) cleared++; else { frac = Math.min(1, (r.damageDealt || 0) / r.enemyMaximumHp); break; } }
      prog += Math.min(1, (cleared + frac) / target);
    }
  }));
  return prog / n;
}
