// Offline post-run check of stagedEquipmentTuning (not used for play decisions).
// node tunecheck.mjs <save.kemoz> <cid> <objective> <seed> [dest]
// 1) runs the tuning exactly as the API does (same dependencies), prints data
// 2) "identity" control: simulates the current build as `state` and as a copy whose party/character arrays are new
//    objects with the same items, on the same seed -> the scores must be equal.
import { readFileSync } from 'node:fs';
import { hydrateGameState } from '../../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../../src/game/storageCompression.ts';
import { simulateExpeditionRuns } from '../../../src/hooks/useGameState.ts';
import { prepareObjectiveState, deriveSeed } from '../../../src/api/v1/gaSearch.ts';
import { parseStagedTuningRequest, runStagedEquipmentTuning } from '../../../src/api/v1/stagedEquipmentTuning.ts';
const [file, cidArg, objective = 'bossDamage', seedArg = '1', destArg] = process.argv.slice(2);
let state: any = hydrateGameState(JSON.parse(decodePersistedState(readFileSync(file, 'utf8'))));
const cid = Number(cidArg); const seed = Number(seedArg);
const pi = state.parties.findIndex((p: any) => p.characters.some((c: any) => c.id === cid));
if (destArg) { const parties = [...state.parties]; parties[pi] = { ...parties[pi], selectedDungeonId: Number(destArg), expeditionDepthLimit: 'all' }; state = { ...state, parties }; }
const now = Date.now();
const deps: any = {
  simulate: (t: any, i: number, n: number, s: number) => simulateExpeditionRuns(t, i, 'mode.normal', n, undefined, 0, s),
  now: () => Date.now(), createSeed: () => seed, createOpaqueId: () => 'x', revision: 1,
  commitContext: { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, applyAutoEquipment: (s: any) => s, now: () => now },
};
const score = (r: any) => objective === 'bossDamage' ? (r.boss?.damageShare ?? 0) / r.total : objective === 'minDefeat' ? r.Defeat / r.total : (r.Clear + r.Return) / r.total;
const main = async () => {
  const out: any = await runStagedEquipmentTuning(state, parseStagedTuningRequest(state, { characterId: cid, objective, seed }), deps);
  const d = out.data;
  console.log(JSON.stringify({ accepted: d.accepted, improvement: d.improvement, gain: d.gain, se: d.standardError, bottleneck: d.bottleneckRoom, before: d.before, after: d.after, steps: d.steps, runs: d.simulationRuns }, null, 1));
  const quickSeed = deriveSeed(seed, 1);
  const copy = (() => { const parties = [...state.parties]; const p = parties[pi]; parties[pi] = { ...p, characters: p.characters.map((c: any) => (c.id === cid ? { ...c, equipment: [...c.equipment] } : c)) }; return { ...state, parties }; })();
  for (const [label, st] of [['state', state], ['copy', copy]] as const) {
    const r: any = await simulateExpeditionRuns(prepareObjectiveState(st, pi, objective as any), pi, 'mode.normal', 100, undefined, 0, quickSeed);
    console.log('identity', label, 'quick score', score(r).toFixed(6), 'D/T/X', r.Draw, r.Retreat, r.Defeat);
  }
};
main();
