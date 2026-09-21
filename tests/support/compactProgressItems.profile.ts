import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createFreshGameState } from '../../src/hooks/useGameState.ts';
import { getCompactProgressItems, getSideQuestDisplay } from '../../src/components/home/homeShared.tsx';
import { getBossGateKey, getEliteGateKey, getGodsBattleProgressKey } from '../../src/game/clearGateCore.ts';
import { setLanguage } from '../../src/i18n/index.ts';
import type { Party } from '../../src/types/index.ts';

// SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
// Characterization of the compact progress items the Expedition pane prints, frozen before the goal selection moved out of the
// UI helper into `src/game/expeditionGoals.ts`. The output must stay byte-identical.
setLanguage('ja');
const base = createFreshGameState('ja', Date.UTC(2026, 8, 21)).parties[0];
const at = Date.UTC(2026, 8, 21, 12);
const quest = (type: string, target: number, progress: number, expiresIn: number | null): NonNullable<Party['sideQuest']> => ({
  id: 1, type, shortText: 'x', target, progress, rolledTier: 1, assignedAt: at - 3_600_000, expiresAt: expiresIn === null ? Number.MAX_SAFE_INTEGER : at + expiresIn,
});
const scenarios: Array<[string, Party, string | undefined]> = [];
for (const dungeonId of [1, 2, 5, 8, 99]) {
  for (const defeated of [[], [dungeonId], [dungeonId - 1], [dungeonId - 1, dungeonId]]) {
    for (const stage of ['fresh', 'elite1', 'elitesDone', 'allGates']) {
      const progress: Record<string, number> = {}; const status: Record<number, boolean> = {};
      if (stage === 'elite1') progress[String(getEliteGateKey(dungeonId, 1))] = 2;
      if (stage === 'elitesDone' || stage === 'allGates') for (let floor = 1; floor <= 5; floor += 1) status[getEliteGateKey(dungeonId, floor)] = true;
      if (stage === 'allGates') status[getBossGateKey(dungeonId)] = true;
      for (const god of [0, 2, 3]) {
        const party = { ...base, selectedDungeonId: dungeonId, defeatedBossExpeditions: Object.fromEntries(defeated.map((id) => [id, true])), clearGateProgress: { ...progress, [getGodsBattleProgressKey(dungeonId)]: god }, clearGateStatus: status } as Party;
        scenarios.push([`d${dungeonId}/defeated${defeated.join('+')}/${stage}/god${god}`, party, undefined]);
      }
    }
  }
}
// A pending Clear-Gate snapshot is what the pane shows until the return completes; a cleared final boss delays the next goal while exploring.
scenarios.push(['pending snapshot', { ...base, selectedDungeonId: 1, expeditionRewardsPending: true, clearGateProgress: { [String(getEliteGateKey(1, 1))]: 3 }, pendingClearGateSnapshot: { progress: { [String(getEliteGateKey(1, 1))]: 1 }, status: {}, defeatedBossExpeditions: {} } } as Party, 'return']);
scenarios.push(['boss clear exploring', { ...base, selectedDungeonId: 1, defeatedBossExpeditions: { 1: true }, lastExpeditionLog: { finalOutcome: 'Clear', entries: [{ room: 24, roomType: 'battle_Boss', godsBattle: true, enemyName: 'g' }] } as never } as Party, 'explore']);
scenarios.push(['boss clear resting', { ...base, selectedDungeonId: 1, defeatedBossExpeditions: { 1: true }, lastExpeditionLog: { finalOutcome: 'Clear', entries: [{ room: 24, roomType: 'battle_Boss', godsBattle: true, enemyName: 'g' }] } as never } as Party, 'rest']);
for (const [type, target, progress, expiresIn] of [['q.squander', 400, 100, 7_200_000], ['q.exercise', 900, 300, 30_000_000], ['q.healing', 1200, 1200, null], ['q.treasure-super-rare', 1, 0, 3_600_000], ['q.losers', 1, 0, 10_000], ['q.consecutive-wins', 8, 3, 90_000_000], ['q.unknown', 5, 2, 5_000]] as const) {
  scenarios.push([`quest ${type}`, { ...base, selectedDungeonId: 1, sideQuest: quest(type, target, progress, expiresIn) } as Party, undefined]);
}
const results: Record<string, unknown> = {};
for (const [name, party, cycleState] of scenarios) {
  results[name] = {
    items: getCompactProgressItems(party, 1, at, cycleState as never),
    scaled: getCompactProgressItems(party, 0.05, at, cycleState as never),
    quest: getSideQuestDisplay(party, 1, at),
  };
}
const fixturePath = path.resolve('tests/fixtures/compactProgressItems.v1.json');
if (process.env.UPDATE_COMPACT_PROGRESS_FIXTURE === '1') {
  fs.writeFileSync(fixturePath, JSON.stringify(results, null, 1));
  console.log(`compactProgressItems fixture written: ${Object.keys(results).length} scenarios`);
} else {
  assert.deepEqual(JSON.parse(JSON.stringify(results)), JSON.parse(fs.readFileSync(fixturePath, 'utf8')), 'the compact progress items changed');
  console.log(`compactProgressItems ok: ${Object.keys(results).length} scenarios`);
}
