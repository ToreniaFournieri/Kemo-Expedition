// Offline post-run check: trace every simulation a stagedEquipmentTuning makes (runs, seed, character loadout, score).
// node tunetrace.mjs <save.kemoz> <cid> <objective> <seed> [extra-json]
import { readFileSync } from 'node:fs';
import { hydrateGameState } from '../../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../../src/game/storageCompression.ts';
import { simulateExpeditionRuns } from '../../../src/hooks/useGameState.ts';
import { parseStagedTuningRequest, runStagedEquipmentTuning } from '../../../src/api/v1/stagedEquipmentTuning.ts';
const [file, cidArg, objective = 'success', seedArg = '1', extra = '{}'] = process.argv.slice(2);
const state: any = hydrateGameState(JSON.parse(decodePersistedState(readFileSync(file, 'utf8'))));
const cid = Number(cidArg); const seed = Number(seedArg);
const now = Date.now();
const score = (r: any) => objective === 'bossDamage' ? (r.boss?.damageShare ?? 0) / r.total : objective === 'minDefeat' ? r.Defeat / r.total : (r.Clear + r.Return) / r.total;
const loadout = (st: any) => st.parties.flatMap((p: any) => p.characters).find((c: any) => c.id === cid).equipment.map((i: any) => i ? `${i.id}/${i.enhancement}${i.jewel ? '+' + i.jewel.key + i.jewel.rank : ''}` : '-').join(',');
const deps: any = {
  simulate: async (t: any, i: number, n: number, s: number) => {
    const r: any = await simulateExpeditionRuns(t, i, 'mode.normal', n, undefined, 0, s);
    console.log('SIM', n, s, score(r).toFixed(4), t === state ? 'STATE' : '', loadout(t));
    return r;
  },
  now: () => Date.now(), createSeed: () => seed, createOpaqueId: () => 'x', revision: 1,
  commitContext: { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, applyAutoEquipment: (s: any) => s, now: () => now },
};
(async () => {
  const out: any = await runStagedEquipmentTuning(state, parseStagedTuningRequest(state, { characterId: cid, objective, seed, ...JSON.parse(extra) }), deps);
  const d = out.data;
  console.log(JSON.stringify({ accepted: d.accepted, improvement: d.improvement, gain: d.gain, se: d.standardError, bottleneck: d.bottleneckRoom, before: d.before, after: d.after, final: d.steps.finalTuning, runs: d.simulationRuns }));
})();
