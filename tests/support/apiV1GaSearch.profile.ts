import assert from 'node:assert/strict';
import { createFreshGameState, gameReducer, simulateExpeditionRuns } from '../../src/hooks/useGameState';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { assignPartyDeity, buildBasis, compareGuarded, deriveSeed, describeDeityTaken, GA_EFFORT_PRESETS, isRareSuccess, measure, measureSecondObjective, parseGaSearchRequest, planGaChangeSummary, rateGaResult, runGaSearch, summarizeVerification, type GaChangeEntry, type GaSearchDependencies, type GaSearchOutcome } from '../../src/api/v1/gaSearch';
import { forecastScope, measureObjective, objectiveSimulationOptions, prepareObjectiveState, routeRoomCount } from '../../src/api/v1/objectiveMeasure';
import { buildApiV1ReadData } from '../../src/api/v1/readModels';
import { buildSimulationRunData } from '../../src/api/v1/simulationView';
import { getVariantKey, type ExpeditionSimulationResult, type Item } from '../../src/types';
import { getDeityId } from '../../src/game/deity';
import type { GameState } from '../../src/types';
import { baseSlotsAt, conquestGoal, expectedRunsToGoal, experienceToLevel, parseLevelProbe, probedLevels, requiredRateForBudget } from '../../src/api/v1/levelProbe';
import { getXpToNextLevel } from '../../src/game/partyLevel';
import { CLASSES } from '../../src/data/classes';
import { parseDirectedBuildRequest } from '../../src/api/v1/directedBuild';
import { validUniqueSelections } from '../../src/api/v1/buildChange';

// SpecRef: 9.1.3 | Read | 2-3-2 party/{p}/gaSearch
// SpecRef: 9.1.3 | Commit | 3-3-2 party/{p}/applyBuildChanges
// SpecRef: 9.1.4.9 | Operation-specific completion rules | gaSearch and applyBuildChanges

const now = Date.parse('2026-01-01T00:00:00.000Z');
/** `gateDamage` on the boss room (the last gate), and its forecast options. */
const BOSS = { gateRoom: { floorNumber: 6, roomInFloor: 4 }, startHp: null };
const bossOptions = (startHpShare?: number) => ({ onlyRoom: BOSS.gateRoom, ...(startHpShare === undefined ? {} : { startHpShare }) });

/** A fresh party with every item back in the inventory and a shallow depth, so better gear is easy to find and verify. */
function strippedSave(): GameState {
  let state = createFreshGameState('ja', now);
  for (const character of state.parties[0].characters) state = gameReducer(state, { type: 'REMOVE_ALL_EQUIPMENT', partyIndex: 0, characterId: character.id });
  state.parties[0] = { ...state.parties[0], expeditionDepthLimit: '1f-3' };
  return state;
}
const base = strippedSave();
const baseBefore = structuredClone(base);
const ids = base.parties[0].characters.map((character) => character.id);
const equipmentTargets = ids.map((characterId) => ({ characterId, changeableComponents: { equipment: true } }));
const small = { seed: 8, populationSize: 8, generations: 3, quickRuns: 10, confirmRuns: 50, verifyRuns: 100, eliteCount: 2 };

function dependencies(): GaSearchDependencies {
  return {
    simulate: (target, index, count, seed, options) => simulateExpeditionRuns(target, index, 'mode.normal', count, undefined, 0, seed, options),
    now: () => now, createSeed: () => 99, revision: 4,
    commitContext: { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, applyAutoEquipment: (s) => s, now: () => now },
  };
}
const search = (state: GameState, raw: Record<string, unknown>) => runGaSearch(state, 0, parseGaSearchRequest(state, 0, raw), dependencies());

// A fixed forecast seed repeats every run, battles included (their seeds otherwise come from Web Crypto).
{
  const first = await simulateExpeditionRuns(base, 0, 'mode.normal', 30, undefined, 0, 9);
  const second = await simulateExpeditionRuns(base, 0, 'mode.normal', 30, undefined, 0, 9);
  assert.deepEqual(first, second);
}

// Request validation (Spec 9.1.3, 2-3-2).
function rejects(raw: Record<string, unknown>, marker: string): void {
  let message = '';
  try { parseGaSearchRequest(base, 0, raw); } catch (error) { message = String(error); }
  assert.ok(message.includes(marker), `${JSON.stringify(raw)} expected ${marker}, got ${message}`);
}
rejects({}, 'invalid_request:targets');
rejects({ targets: [] }, 'invalid_request:targets');
rejects({ targets: [{ characterId: 999999 }] }, 'invalid_request:targets.characterId.not_in_party');
rejects({ targets: [{ characterId: ids[0] }, { characterId: ids[0] }] }, 'invalid_request:targets.characterId.duplicate');
rejects({ targets: equipmentTargets, objective: 'speed' }, 'invalid_request:objective');
rejects({ targets: equipmentTargets, gaParameters: { effort: 'maximum' } }, 'invalid_request:gaParameters.effort');
rejects({ targets: equipmentTargets, gaParameters: { populationSize: 8, eliteCount: 3 } }, 'invalid_request:gaParameters.eliteCount');
rejects({ targets: equipmentTargets, gaParameters: { quickRuns: 5 } }, 'invalid_request:gaParameters.quickRuns');
rejects({ targets: equipmentTargets, unknownMember: true }, 'invalid_request:unknownMember.unknown_member');
{
  // Defaults: `low` effort, the preset values, `success`, and no order or deity change.
  const parsed = parseGaSearchRequest(base, 0, { targets: equipmentTargets });
  assert.equal(parsed.objective, 'success');
  assert.equal(parsed.parameters.effort, 'low');
  assert.deepEqual({ populationSize: parsed.parameters.populationSize, generations: parsed.parameters.generations, quickRuns: parsed.parameters.quickRuns, confirmRuns: parsed.parameters.confirmRuns, timeBudgetSeconds: parsed.parameters.timeBudgetSeconds }, GA_EFFORT_PRESETS.low);
  assert.equal(parsed.parameters.verifyRuns, 500);
  assert.equal(parsed.considerOrderChange, false);
  // A component a unique character cannot change is ignored, not rejected.
  const unique = base.parties[0].characters.find((character) => character.isUnique)!;
  const uniqueRequest = parseGaSearchRequest(base, 0, { targets: [{ characterId: unique.id, changeableComponents: { raceGender: true, lineage: true, mainClass: true } }] });
  assert.deepEqual([uniqueRequest.targets[0].components.raceGender, uniqueRequest.targets[0].components.lineage, uniqueRequest.targets[0].components.mainClass], [false, false, true]);
}

// The search improves a stripped party, verifies it on a fresh seed, and repeats exactly for the same seed.
const outcome = await search(base, { targets: equipmentTargets, gaParameters: small });
{
  const data = outcome.data as { verdict: string; changeSummary: { endpoint: string; parameters: Record<string, unknown> }[]; forecast: { before: string; after: string }; verification: { scoredBy: string; before: number; after: number } };
  assert.ok(data.verdict === 'veryGood' || data.verdict === 'good', `verdict ${data.verdict}`);
  assert.ok(data.verification.after > data.verification.before);
  assert.equal(data.verification.scoredBy, 'success', 'a build that succeeds is judged on its success rate');
  assert.ok(data.changeSummary.length > 0);
  assert.ok(data.changeSummary.every((entry) => entry.endpoint.startsWith('commit/build/character/') && entry.endpoint.endsWith('/equip')), 'only equip calls for an empty party');
  assert.match(data.forecast.before, /^Success [0-9.]+% \/ Draw/);
  assert.deepEqual((await search(base, { targets: equipmentTargets, gaParameters: small })).data, outcome.data, 'a fixed seed repeats the whole search');
  // `maxChanges` caps the number of `changeSummary` entries.
  const capped = await search(base, { targets: equipmentTargets, gaParameters: { ...small, maxChanges: 2 } });
  assert.ok((capped.data.changeSummary as unknown[]).length <= 2);
  // The search never changes the state it read.
  assert.deepEqual(base, baseBefore);
}

// `verdict` rules: 10 percentage points (20% for `experience`) and 2 standard errors.
assert.equal(rateGaResult('success', { rate: 0.4, variance: 0.24 }, { rate: 0.6, variance: 0.24 }, 500, true).verdict, 'veryGood');
assert.equal(rateGaResult('success', { rate: 0.4, variance: 0.24 }, { rate: 0.47, variance: 0.2491 }, 500, true).verdict, 'good');
assert.equal(rateGaResult('success', { rate: 0.4, variance: 0.24 }, { rate: 0.41, variance: 0.24 }, 500, true).verdict, 'noisy');
assert.equal(rateGaResult('success', { rate: 0.4, variance: 0.24 }, { rate: 0.39, variance: 0.24 }, 500, true).verdict, 'noisy');
assert.equal(rateGaResult('success', { rate: 0.4, variance: 0.24 }, { rate: 0.3, variance: 0.21 }, 500, true).verdict, 'worse');
assert.equal(rateGaResult('minDefeat', { rate: 0.3, variance: 0.21 }, { rate: 0.1, variance: 0.09 }, 500, true).verdict, 'veryGood');
assert.equal(rateGaResult('experience', { rate: 100, variance: 400 }, { rate: 115, variance: 400 }, 500, true).verdict, 'good');
assert.equal(rateGaResult('experience', { rate: 100, variance: 400 }, { rate: 125, variance: 400 }, 500, true).verdict, 'veryGood');
assert.equal(rateGaResult('success', { rate: 0.4, variance: 0.24 }, { rate: 0.4, variance: 0.24 }, 500, false).verdict, 'noChange');
// `progress` is rated like `success`: percentage points of the route, 10 of them for `veryGood`.
assert.equal(rateGaResult('progress', { rate: 0.5, variance: 0.01 }, { rate: 0.62, variance: 0.01 }, 500, true).verdict, 'veryGood');
assert.equal(rateGaResult('progress', { rate: 0.5, variance: 0.01 }, { rate: 0.55, variance: 0.01 }, 500, true).verdict, 'good');
assert.equal(rateGaResult('progress', { rate: 0.5, variance: 0.01 }, { rate: 0.4, variance: 0.01 }, 500, true).verdict, 'worse');
assert.equal(rateGaResult('success', { rate: 0, variance: 0 }, { rate: 0, variance: 0 }, 500, true).verdict, 'noisy', 'two zero success rates tell nothing');

// ---------------- levelProbe (Spec 9.1.3, 2-3-2) ----------------

{
  // Request defaults and validation.
  assert.deepEqual(parseLevelProbe(undefined), { mode: 'auto', purpose: 'conquest', runBudget: 10, maxDefeat: 10, steps: 'slot', count: 1, fill: 'greedy' });
  assert.equal(parseLevelProbe({ steps: 'level' }).count, 5);
  rejects({ targets: equipmentTargets, levelProbe: { runBudget: 6 } }, 'invalid_request:levelProbe.runBudget');
  rejects({ targets: equipmentTargets, levelProbe: { count: 11 } }, 'invalid_request:levelProbe.count');
  rejects({ targets: equipmentTargets, levelProbe: { mode: 'never' } }, 'invalid_request:levelProbe.mode');
  rejects({ targets: equipmentTargets, levelProbe: { depth: 1 } }, 'invalid_request:levelProbe.depth.unknown_member');

  // Expected runs to a streak: `E(k) - E(c)` with `E(j) = (1 - p^j) / ((1 - p) p^j)`.
  const close = (actual: number | null, expected: number, digits = 6) => assert.ok(actual !== null && Math.abs(actual - expected) < 10 ** -digits, `${actual} vs ${expected}`);
  close(expectedRunsToGoal(0.25, 1, 0), 4);
  close(expectedRunsToGoal(1, 6, 2), 4);
  close(expectedRunsToGoal(0.5, 3, 2), 8, 9);
  close(expectedRunsToGoal(0.5, 2, 0), 6);
  assert.equal(expectedRunsToGoal(0, 2, 0), null);
  assert.equal(expectedRunsToGoal(0.3, 2, 2), 0);
  // The required rates at the default run budget 10 (boss, Boss unlock, 5th to 1st Elite gate).
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((k) => Math.round(requiredRateForBudget(k, 0, 10) * 1000) / 10), [10, 37, 57.6, 71.3, 80.6, 87.1, 91.8]);
  assert.equal(requiredRateForBudget(7, 0, 6), 1);

  // Probed levels: the next base slot unlock levels, or every level, never above the level cap.
  assert.deepEqual(probedLevels(26, 'slot', 1), [30]);
  assert.deepEqual(probedLevels(26, 'slot', 2), [30, 36]);
  assert.deepEqual(probedLevels(66, 'slot', 3), []);
  assert.deepEqual(probedLevels(67, 'level', 5), [68, 69]);
  assert.deepEqual([baseSlotsAt(29), baseSlotsAt(30), baseSlotsAt(1)], [7, 8, 1]);
  assert.equal(experienceToLevel({ level: 5, experience: 100 }, 7), getXpToNextLevel(5) + getXpToNextLevel(6) - 100);
  assert.equal(experienceToLevel({ level: 5, experience: 100 }, 5), 0);

  // The goal is the next closed Clear-Gate of the destination.
  assert.deepEqual(conquestGoal(base.parties[0]), { kind: 'eliteGate', dungeonId: base.parties[0].selectedDungeonId, floor: 1, required: 7, current: 0 });

  type Probe = { build: string; purpose: string; goal: unknown; target: Record<string, number>; fromLevel: number; steps: string; points: { level: number; baseSlots: number; filledSlots: number; rate: number; expectedRuns: number | null; gateRoom: { room: string; share: number; winRate: number } | null }[]; levelNeeded: number | null; truncated: boolean };
  // `always`: the current level first, then the next slot unlock level with its new slots filled from the free items.
  const always = (await search(base, { targets: equipmentTargets, gaParameters: small, levelProbe: { mode: 'always' } })).data.levelProbe as Probe;
  assert.equal(always.purpose, 'conquest');
  assert.equal(always.fromLevel, 1);
  assert.equal(always.target.runBudget, 10);
  assert.equal(always.target.requiredRate, 91.8);
  assert.equal(always.points[0].level, 1);
  assert.equal(always.points[0].filledSlots, 0);
  // This party misses the 7-run streak at Lv1 and meets it at Lv3, where each member's second slot is filled.
  assert.deepEqual(always.points.map((entry) => [entry.level, entry.baseSlots, entry.filledSlots]), [[1, 1, 0], [3, 2, 6]]);
  assert.ok(always.points[0].expectedRuns! > 10 && always.points[1].expectedRuns! <= 10);
  assert.equal(always.levelNeeded, 3);
  // `conquest` also fights the goal's gate room alone at each point: here the 1st Elite gate's room, 1f-4.
  assert.ok(always.points.every((entry) => entry.gateRoom !== null && entry.gateRoom.room === '1f-4'
    && entry.gateRoom.share >= 0 && entry.gateRoom.share <= 1 && entry.gateRoom.winRate >= 0 && entry.gateRoom.winRate <= entry.gateRoom.share + 1e-9), JSON.stringify(always.points));
  assert.deepEqual((await search(base, { targets: equipmentTargets, gaParameters: small, levelProbe: { mode: 'always' } })).data.levelProbe, always, 'a fixed seed repeats the probe');
  assert.deepEqual(base, baseBefore, 'the probe changes no state');
  // `off` returns null; `auto` returns null only when the target is met at the current level.
  assert.equal((await search(base, { targets: equipmentTargets, gaParameters: small, levelProbe: { mode: 'off' } })).data.levelProbe, null);
  const auto = (await search(base, { targets: equipmentTargets, gaParameters: small })).data.levelProbe as Probe | null;
  assert.deepEqual(auto, always, '`auto` runs the probe when the current level misses the target');
  // `farming` measures the defeat rate of the searched route, with no goal.
  const farming = (await search(base, { targets: equipmentTargets, gaParameters: small, levelProbe: { mode: 'always', purpose: 'farming', steps: 'level', count: 2 } })).data.levelProbe as Probe;
  assert.equal(farming.goal, null);
  assert.deepEqual(farming.target, { maxDefeat: 10 });
  assert.ok(farming.points.every((entry) => entry.expectedRuns === null && entry.gateRoom === null), '`farming` has no goal room');
  assert.ok(farming.points.length >= 1 && farming.points.length <= 3);
  assert.equal((await search(base, { targets: equipmentTargets, gaParameters: small, levelProbe: { purpose: 'farming' } })).data.levelProbe, null, '`auto` skips a build that already meets the target');
  // A `gateDamage` search gets the same probe: the route to the goal, not the battle-only share.
  const boss = (await search(base, { targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', gaParameters: small, levelProbe: { mode: 'always' } })).data.levelProbe as Probe;
  assert.equal(boss.points[0].level, 1);
  assert.deepEqual(boss.goal, always.goal);
}

// ---------------- applyBuildChanges ----------------

const path = 'commit/build/party/1/applyBuildChanges';
type SearchData = { changeSummary: GaChangeEntry[]; basis: string; verdict: string };
/** What a client sends back from a search: its `changeSummary` as `changes`, with its `basis` and `verdict`. */
const applyOf = (result: GaSearchOutcome): Record<string, unknown> => {
  const data = result.data as SearchData;
  return { changes: data.changeSummary, basis: data.basis, verdict: data.verdict };
};
const searched = applyOf(outcome);
function context(equipmentHistory: ApiV1CommitContext['equipmentHistory'] = {}): ApiV1CommitContext {
  return { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory, uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment: (s) => s, createDeliveryId: () => 'd', now: () => now };
}
function fails(parameters: Record<string, unknown>, marker: string, state: GameState = base): void {
  let message = '';
  try { applyApiV1Commit(path, state, parameters, context()); } catch (error) { message = String(error); }
  assert.ok(message.includes(marker), `${JSON.stringify(parameters).slice(0, 200)} expected ${marker}, got ${message}`);
}
fails({ ...searched }, 'invalid_request:simulation');
fails({ ...searched, simulation: false, autoEquipmentMode: 'FULL' }, 'invalid_request:autoEquipmentMode');
fails({ ...searched, simulation: true, confirmation: 'yes' }, 'invalid_request:confirmation_with_simulation');
fails({ simulation: false }, 'invalid_request:changes');
fails({ changes: [], simulation: false }, 'invalid_request:changes');
fails({ changes: [{ endpoint: `commit/build/character/${ids[0]}/lockEquipment`, parameters: { targetEquipment: 0 } }], simulation: false }, 'invalid_request:changes[0].endpoint');
fails({ changes: [{ endpoint: 'commit/build/party/1/applyBuildChanges', parameters: {} }], simulation: false }, 'invalid_request:changes[0].endpoint');
fails({ ...searched, verdict: 'great', simulation: false }, 'invalid_request:verdict');
fails({ ...searched, verdict: 'noChange', simulation: false }, 'illegal_action:build_no_change');
fails({ buildResultId: 'old-result', simulation: true }, 'invalid_request:buildResultId.unknown_member');
{
  // `basis` is the digest of the build-relevant state: the party order changed here, so the search result is stale.
  assert.equal(typeof (outcome.data as SearchData).basis, 'string');
  const reordered = gameReducer(base, { type: 'REORDER_PARTY_CHARACTER', partyIndex: 0, fromIndex: 0, toIndex: 1 });
  fails({ ...searched, simulation: false }, 'illegal_action:build_basis_stale', reordered);
  // Without `basis` the state is not compared; each entry is still validated against the current save.
  const { basis: _basis, ...unchecked } = searched;
  applyApiV1Commit(path, reordered, { ...unchecked, simulation: true }, context());
  // Progression that leaves the build alone (time, gold) does not change it.
  const richer: GameState = { ...base, global: { ...base.global, gold: base.global.gold + 1000 } };
  applyApiV1Commit(path, richer, { ...searched, simulation: true }, context());
  // Neither do Inventory or Jewel counts: a new drop of an item the result equips, or a new Jewel, keeps it applicable
  // (each entry is still validated when it is applied).
  const equipEntry = (searched.changes as GaChangeEntry[]).find((entry) => entry.endpoint.endsWith('/equip'))!;
  const [, itemId, enhancement, superRare] = String(equipEntry.parameters.targetEquipment).split('/');
  const dropped = structuredClone(base);
  dropped.global.inventory[`${itemId}-${enhancement}-${superRare}`].count += 1;
  dropped.global.jewels = { ...dropped.global.jewels, 'might:1': (dropped.global.jewels['might:1'] ?? 0) + 1 };
  assert.equal(buildBasis(dropped, 0, searched.changes as GaChangeEntry[]), (outcome.data as SearchData).basis);
  applyApiV1Commit(path, dropped, { ...searched, simulation: true }, context());
}
{
  // SpecRef: 9.1.3 | 3-3-2 `onStale` | `reject` (default) rejects an entry the save no longer allows; `repair` repairs or skips it.
  fails({ ...searched, simulation: true, onStale: 'keep' }, 'invalid_request:onStale');
  const changes = searched.changes as GaChangeEntry[];
  const equipIndex = changes.findIndex((entry) => entry.endpoint.endsWith('/equip'));
  const [, itemId, enhancement, superRare] = String(changes[equipIndex].parameters.targetEquipment).split('/').map(Number);
  const key = `${itemId}-${enhancement}-${superRare}`;
  // The equipped copy is gone, but the same item at another enhancement is owned.
  const other = enhancement === 6 ? 5 : enhancement + 1;
  const moved = structuredClone(base);
  const stack = moved.global.inventory[key];
  moved.global.inventory[`${itemId}-${other}-${superRare}`] = { ...structuredClone(stack), item: { ...stack.item, enhancement: other }, count: 1 };
  delete moved.global.inventory[key];
  fails({ ...searched, simulation: false }, 'illegal_action:item_not_owned', moved);
  const repaired = applyApiV1Commit(path, moved, { ...searched, simulation: false, onStale: 'repair' }, context());
  const repairs = repaired.data.repairs as { index: number; outcome: string; reason: string; parameters: Record<string, unknown> | null }[];
  assert.equal(repaired.data.basisStale, false);
  assert.deepEqual(repairs[0], { index: equipIndex, endpoint: changes[equipIndex].endpoint, outcome: 'substituted', reason: 'item_not_owned', parameters: { ...changes[equipIndex].parameters, targetEquipment: `0/${itemId}/${other}/${superRare}` } });
  assert.ok(repairs.slice(1).every((entry) => entry.outcome === 'skipped' || entry.outcome === 'substituted'), JSON.stringify(repairs));
  const repairedCharacter = repaired.state.parties[0].characters.find((entry) => entry.id === Number(changes[equipIndex].endpoint.split('/')[3]))!;
  assert.equal(repairedCharacter.equipment[changes[equipIndex].parameters.targetSlot as number]?.enhancement, other);
  assert.deepEqual((repaired.data.applied as GaChangeEntry[]).length, changes.length - repairs.filter((entry) => entry.outcome === 'skipped').length);
  // No copy of the item at all: the entry is skipped, and the rest still applies.
  const gone = structuredClone(base);
  delete gone.global.inventory[key];
  const skipped = applyApiV1Commit(path, gone, { ...searched, simulation: true, onStale: 'repair' }, context());
  assert.deepEqual((skipped.data.repairs as { index: number; outcome: string }[])[0], { index: equipIndex, endpoint: changes[equipIndex].endpoint, outcome: 'skipped', reason: 'item_not_owned', parameters: null });
  // A stale `basis` is reported, not rejected; without `basis` it is `null`. A clean apply reports no repairs.
  const reordered = gameReducer(base, { type: 'REORDER_PARTY_CHARACTER', partyIndex: 0, fromIndex: 0, toIndex: 1 });
  assert.equal(applyApiV1Commit(path, reordered, { ...searched, simulation: true, onStale: 'repair' }, context()).data.basisStale, true);
  const { basis: _basis, ...unchecked } = searched;
  const clean = applyApiV1Commit(path, base, { ...unchecked, simulation: true, onStale: 'repair' }, context()).data;
  assert.deepEqual([clean.basisStale, clean.repairs], [null, []]);
  assert.equal(applyApiV1Commit(path, base, { ...searched, simulation: true }, context()).data.repairs, undefined, '`repairs` only with `repair`');
}
{
  // A given `noisy` or `worse` verdict needs `confirmation: "yes"`; `no` cancels without a change. No verdict, no confirmation.
  fails({ ...searched, verdict: 'noisy', simulation: false }, 'invalid_request:confirmation_required');
  const cancelled = applyApiV1Commit(path, base, { ...searched, verdict: 'worse', simulation: false, confirmation: 'no' }, context());
  assert.equal(cancelled.state, base);
  assert.deepEqual(cancelled.data.applied, []);
  assert.equal(cancelled.data.confirmationRequired, true);
  assert.deepEqual(cancelled.data.warnings, [{ key: 'api.warning.applyBuildChanges.unconfirmedImprovement', args: { verdict: 'worse' } }]);
  const { verdict: _verdict, ...withoutVerdict } = searched;
  assert.equal(applyApiV1Commit(path, base, { ...withoutVerdict, simulation: true }, context()).data.confirmationRequired, false);
}
{
  // `simulation: true` reports the changes and the resulting status without committing; `expectedRevision` in an entry is dropped.
  const changes = (searched.changes as GaChangeEntry[]).map((entry) => ({ ...entry, parameters: { ...entry.parameters, expectedRevision: 3 } }));
  const preview = applyApiV1Commit(path, base, { ...searched, changes, simulation: true }, context());
  assert.equal(preview.state, base);
  assert.deepEqual(preview.data.applied, searched.changes);
  assert.equal(preview.data.confirmationRequired, false);
  assert.ok((preview.data.calculatedStatus as unknown[]).length > 0);
}
{
  // An entry the Commit API rejects rejects the whole request with that entry's error, and nothing is committed.
  const changes = [...(searched.changes as GaChangeEntry[]), { endpoint: `commit/build/character/${ids[0]}/equip`, parameters: { targetEquipment: '0/999999/0/0', targetSlot: 0 } }];
  let message = '';
  try { applyApiV1Commit(path, base, { changes, simulation: false }, context()); } catch (error) { message = String(error); }
  assert.ok(message.length > 0 && !message.includes('build_basis_stale'), message);
  assert.deepEqual(base, baseBefore);
}
{
  // The commit applies every entry, sets the requested mode, and records exactly one Undo step per changed character.
  const history: ApiV1CommitContext['equipmentHistory'] = {};
  const applied = applyApiV1Commit(path, base, { ...searched, simulation: false, autoEquipmentMode: 'OFF' }, context(history));
  const changed = [...new Set((searched.changes as GaChangeEntry[]).map((entry) => Number(entry.endpoint.split('/')[3])))];
  for (const characterId of changed) {
    const character = applied.state.parties[0].characters.find((entry) => entry.id === characterId)!;
    assert.equal(character.autoEquipmentMode, 0);
    assert.ok(character.equipment.some(Boolean));
    assert.equal(history[String(characterId)].undo.length, 1, 'one Undo step, not one per internal call');
  }
  assert.equal(Object.keys(history).length, changed.length);
  // Undo restores that character's equipment state from before the operation.
  const undone = applyApiV1Commit(`commit/build/character/${changed[0]}/undoEquipment`, applied.state, {}, context(history));
  assert.ok(undone.state.parties[0].characters.find((entry) => entry.id === changed[0])!.equipment.every((item) => !item));
  // The applied result no longer matches the build it was searched for.
  fails({ ...searched, simulation: false }, 'illegal_action:build_basis_stale', applied.state);
}

// ---------------- considerItemsScope ----------------
// SpecRef: 9.1.3 | 2-3-2 gaSearch `considerItemsScope` | `normal`, `withinTargets`, `global`; locked equipment is never changed or taken.
{
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets }).considerItemsScope, 'normal');
  for (const scope of ['normal', 'withinTargets', 'global']) assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets, considerItemsScope: scope }).considerItemsScope, scope);
  rejects({ targets: equipmentTargets, considerItemsScope: 'onlyInventory' }, 'invalid_request:considerItemsScope');
  rejects({ targets: equipmentTargets, considerItemsScope: 1 }, 'invalid_request:considerItemsScope');

  // A geared party: the search result applied to the stripped save, with the leftover items still in the Inventory.
  const geared = applyApiV1Commit(path, base, { ...searched, simulation: false }, context()).state;
  const wornKeys = (state: GameState, characterId: number) => state.parties.flatMap((party) => party.characters).find((entry) => entry.id === characterId)!.equipment.filter(Boolean).map((item) => `${item!.id}/${item!.enhancement}/${item!.superRare}`);
  const inventoryKeys = (state: GameState) => new Set(Object.values(state.global.inventory).filter((entry) => entry.status === 'owned' && entry.count > 0).map((entry) => `${entry.item.id}/${entry.item.enhancement}/${entry.item.superRare}`));
  const [first, second, third] = ids;
  assert.ok(wornKeys(geared, first).length > 0 && wornKeys(geared, second).length > 0 && wornKeys(geared, third).length > 0);
  const targets = [first, second].map((characterId) => ({ characterId, changeableComponents: { equipment: true } }));
  const run = (state: GameState, scope: string, extraTargets = targets) => search(state, { targets: extraTargets, considerItemsScope: scope, gaParameters: { ...small, generations: 4, seed: 11 } });
  const characterOf = (entry: { endpoint: string }) => Number(entry.endpoint.split('/')[3]);
  const equippedKey = (entry: { parameters: Record<string, unknown> }) => String(entry.parameters.targetEquipment).split('/').slice(1).join('/');

  // `normal`: only the targets change, and an item worn by another target is not taken (own items and the Inventory only).
  {
    const result = await run(geared, 'normal');
    const entries = (result.data as { changeSummary: { endpoint: string; parameters: Record<string, unknown> }[] }).changeSummary;
    const inventory = inventoryKeys(geared);
    for (const entry of entries) {
      assert.ok([first, second].includes(characterOf(entry)), `normal changes only targets: ${entry.endpoint}`);
      if (!entry.endpoint.endsWith('/equip')) continue;
      const key = equippedKey(entry);
      assert.ok(inventory.has(key) || wornKeys(geared, characterOf(entry)).includes(key), `normal: ${key} is neither in the Inventory nor the character's own`);
    }
    // The result applies as written.
    if (entries.length > 0) applyApiV1Commit(path, geared, { ...applyOf(result), simulation: false, confirmation: 'yes' }, context());
  }

  // `withinTargets` and `global`: every result applies as written; `withinTargets` never touches characters outside `targets`.
  for (const scope of ['withinTargets', 'global']) {
    const result = await run(geared, scope);
    const entries = (result.data as { changeSummary: { endpoint: string }[] }).changeSummary;
    if (scope === 'withinTargets') for (const entry of entries) assert.ok([first, second].includes(characterOf(entry)), `withinTargets changes only targets: ${entry.endpoint}`);
    if (entries.length > 0) applyApiV1Commit(path, geared, { ...applyOf(result), simulation: false, confirmation: 'yes' }, context());
  }

  // Only `global` can take items worn outside `targets`, including by another party: with an empty Inventory, a stripped
  // party gets gear only from the donors of party 2 (whose loss does not touch the simulated party).
  {
    const donorParty = { ...geared.parties[0], id: 2, name: 'PT2', characters: geared.parties[0].characters.map((character) => ({ ...character, id: character.id + 100 })) };
    const donorState: GameState = { ...base, parties: [base.parties[0], donorParty], global: { ...base.global, inventory: {} } };
    const donorIds = donorParty.characters.map((character) => character.id);
    for (const scope of ['normal', 'withinTargets']) {
      const none = await run(donorState, scope, equipmentTargets);
      assert.deepEqual((none.data as { changeSummary: unknown[] }).changeSummary, [], `${scope} has nothing to equip`);
    }
    const result = await run(donorState, 'global', equipmentTargets);
    const entries = (result.data as { changeSummary: { endpoint: string; parameters: Record<string, unknown> }[] }).changeSummary;
    const equips = entries.filter((entry) => entry.endpoint.endsWith('/equip'));
    const removals = entries.filter((entry) => entry.endpoint.endsWith('/removeEquipment'));
    assert.ok(equips.length > 0 && equips.every((entry) => ids.includes(characterOf(entry))), 'global equips the party from other parties');
    assert.ok(removals.length > 0 && removals.every((entry) => donorIds.includes(characterOf(entry))), 'donors are emptied');
    assert.ok(entries.slice(0, removals.length).every((entry) => entry.endpoint.endsWith('/removeEquipment')), 'removals come before any equip');
    const taken = removals.reduce((sum, entry) => sum + (entry.parameters.targetEquipment as number[]).length, 0);
    assert.equal(taken, equips.length, 'every taken item is placed and none is created');
    const applied = applyApiV1Commit(path, donorState, { ...applyOf(result), simulation: false, confirmation: 'yes' }, context()).state;
    assert.equal(ids.reduce((sum, id) => sum + wornKeys(applied, id).length, 0), equips.length);
    assert.equal(donorIds.reduce((sum, id) => sum + wornKeys(applied, id).length, 0), donorIds.reduce((sum, id) => sum + wornKeys(donorState, id).length, 0) - taken);
    // `basis` goes stale when a donor's equipment changes.
    const tampered: GameState = { ...donorState, parties: [donorState.parties[0], gameReducer(donorState, { type: 'REMOVE_ALL_EQUIPMENT', partyIndex: 1, characterId: characterOf(removals[0]) }).parties[1]] };
    let message = '';
    try { applyApiV1Commit(path, tampered, { ...applyOf(result), simulation: true }, context()); } catch (error) { message = String(error); }
    assert.ok(message.includes('illegal_action:build_basis_stale'), message);
    // A donor slot the result does not take is not build-relevant (Auto Equipment of a side party, for example).
    const takenSlots = new Map(removals.map((entry) => [characterOf(entry), entry.parameters.targetEquipment as number[]]));
    const kept = donorParty.characters.flatMap((character) => character.equipment.map((item, slot) => (item && takenSlots.has(character.id) && !takenSlots.get(character.id)!.includes(slot) ? [character.id, slot] as const : null))).find(Boolean);
    if (kept) {
      const changedElsewhere = gameReducer(donorState, { type: 'EQUIP_ITEM', partyIndex: 1, characterId: kept[0], slotIndex: kept[1], itemKey: null });
      applyApiV1Commit(path, changedElsewhere, { ...applyOf(result), simulation: true }, context());
    }
  }

  // Locked equipment of a target is never changed, and locked equipment elsewhere is never taken (`global`).
  {
    let locked = geared;
    for (const characterId of [first, third]) {
      const character = locked.parties[0].characters.find((entry) => entry.id === characterId)!;
      const slot = character.equipment.findIndex(Boolean);
      locked = gameReducer(locked, { type: 'UPDATE_CHARACTER', partyIndex: 0, characterId, updates: { autoEquipmentMode: 2 } });
      locked = applyApiV1Commit(`commit/build/character/${characterId}/lockEquipment`, locked, { targetEquipment: slot }, context()).state;
    }
    const before = (characterId: number) => locked.parties[0].characters.find((entry) => entry.id === characterId)!.equipment;
    const lockedSlot = (characterId: number) => before(characterId).findIndex((item) => item?.isLocked);
    const result = await run(locked, 'global');
    const applied = (result.data as { changeSummary: unknown[] }).changeSummary.length > 0
      ? applyApiV1Commit(path, locked, { ...applyOf(result), simulation: false, confirmation: 'yes' }, context()).state
      : locked;
    for (const characterId of [first, third]) {
      const slot = lockedSlot(characterId);
      const after = applied.parties[0].characters.find((entry) => entry.id === characterId)!.equipment[slot];
      assert.equal(after?.id, before(characterId)[slot]?.id, `locked slot ${slot} of ${characterId} is unchanged`);
      assert.equal(after?.isLocked, true);
    }
  }
}

// ---------------- considerDeityChange ----------------
// SpecRef: 9.1.3 | 2-3-2 gaSearch `considerDeityChange` | `none`, `unoccupiedDeities`, `allDeities` (frees a deity another party holds).
{
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets }).considerDeityChange, 'none');
  for (const scope of ['none', 'unoccupiedDeities', 'allDeities']) assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets, considerDeityChange: scope }).considerDeityChange, scope);
  rejects({ targets: equipmentTargets, considerDeityChange: true }, 'invalid_request:considerDeityChange');
  rejects({ targets: equipmentTargets, considerDeityChange: 'occupiedDeities' }, 'invalid_request:considerDeityChange');

  // Party 2 holds Fortification, the only unlocked deity, which the faithless party 1 gains from.
  const fresh = createFreshGameState('ja', now);
  const own = { ...fresh.parties[0], deity: { ...fresh.parties[0].deity, name: 'None' } };
  const holder = { ...fresh.parties[0], id: 2, name: 'PT2', characters: fresh.parties[0].characters.map((character) => ({ ...character, id: character.id + 100 })), deity: { ...fresh.parties[0].deity, name: 'God of Fortification' } };
  const held: GameState = { ...fresh, parties: [own, holder], global: { ...fresh.global, unlockedDeities: ['God of Fortification'] } };
  const deityRun = (scope: string) => search(held, { targets: [{ characterId: own.characters[0].id }], considerDeityChange: scope, gaParameters: small });
  assert.deepEqual((await deityRun('unoccupiedDeities')).data.changeSummary, [], 'unoccupiedDeities never offers a held deity');
  const taken = await deityRun('allDeities');
  assert.deepEqual(taken.data.changeSummary, [
    { endpoint: 'commit/build/party/2', parameters: { deityId: 'none' } },
    { endpoint: 'commit/build/party/1', parameters: { deityId: 'fortification' } },
  ], 'allDeities frees the held deity right before taking it');
  const applied = applyApiV1Commit(path, held, { ...applyOf(taken), simulation: false }, context()).state;
  assert.deepEqual(applied.parties.map((party) => getDeityId(party.deity.name)), ['fortification', 'none']);
  // `basis` goes stale when the holder no longer holds that deity.
  const released = gameReducer(held, { type: 'UPDATE_PARTY_DEITY', partyIndex: 1, deityName: 'None' });
  fails({ ...applyOf(taken), simulation: true }, 'illegal_action:build_basis_stale', released);
  // `deityTaken` names the party, its deity, and what it gets: nothing, as party 1 had no deity to leave.
  assert.deepEqual(taken.data.deityTaken, { partyId: 2, deityId: 'fortification', newDeityId: 'none' });
  assert.equal((await deityRun('unoccupiedDeities')).data.deityTaken, null);

  // SpecRef: 9.1.3 | 2-3-2 `allDeities` | a held deity is swapped: party 1 (Fertility) takes Fortification, party 2 gets Fertility.
  const fertility = getDeityId('Goddess of Fertility');
  const faithful: GameState = { ...held, parties: [{ ...own, deity: { ...own.deity, name: 'Goddess of Fertility' } }, holder], global: { ...held.global, unlockedDeities: ['God of Fortification', 'Goddess of Fertility'] } };
  const swapped = assignPartyDeity(faithful, 0, 'fortification');
  assert.deepEqual(swapped.parties.map((party) => getDeityId(party.deity.name)), ['fortification', fertility]);
  const swapSummary = planGaChangeSummary(faithful, 0, swapped, dependencies().commitContext);
  assert.deepEqual(swapSummary, [
    { endpoint: 'commit/build/party/2', parameters: { deityId: 'none' } },
    { endpoint: 'commit/build/party/1', parameters: { deityId: 'fortification' } },
    { endpoint: 'commit/build/party/2', parameters: { deityId: fertility } },
  ], 'the holder is freed, the party takes the deity, and the holder gets the one the party left');
  assert.deepEqual(describeDeityTaken(faithful, swapped, 0), { partyId: 2, deityId: 'fortification', newDeityId: fertility });
  const swapApplied = applyApiV1Commit(path, faithful, { changes: swapSummary, basis: buildBasis(faithful, 0, swapSummary), simulation: false }, context());
  assert.deepEqual(swapApplied.state.parties.map((party) => getDeityId(party.deity.name)), ['fortification', fertility]);
  assert.deepEqual(swapApplied.data.warnings, [{ key: 'api.warning.applyBuildChanges.deityTaken', args: { partyId: 2, deityId: 'fortification', newDeityId: fertility } }]);
  // Taking the old deity back returns the taken one, so a side party's deity survives a round trip of the main party.
  const back = assignPartyDeity(swapApplied.state, 0, fertility);
  assert.deepEqual(back.parties.map((party) => getDeityId(party.deity.name)), [fertility, 'fortification']);
  // A result that takes no deity has no deity warning.
  assert.deepEqual(applyApiV1Commit(path, base, { ...searched, simulation: true }, context()).data.warnings, []);
}

// ---------------- Empty slots ----------------
// SpecRef: 9.1.4.9 | gaSearch Candidates | an equipment target never keeps an empty slot while a usable item is left.
{
  // One free slot on an otherwise geared party: random `replace` mutations alone used to leave it empty (`noChange`).
  const fresh = createFreshGameState('ja', now);
  const guardian = fresh.parties[0].characters[0];
  const emptied = applyApiV1Commit(`commit/build/character/${guardian.id}/removeEquipment`, fresh, { targetEquipment: [0] }, context()).state;
  const targets = fresh.parties[0].characters.map((character) => ({ characterId: character.id, changeableComponents: { equipment: true } }));
  const fillsGuardian = (entries: { endpoint: string; parameters: Record<string, unknown> }[]) => entries.some((entry) => entry.endpoint === `commit/build/character/${guardian.id}/equip` && entry.parameters.targetSlot === 0);
  const filled = await search(emptied, { targets, gaParameters: small });
  assert.ok(['veryGood', 'good'].includes(String(filled.data.verdict)), `verdict ${filled.data.verdict}`);
  assert.ok(fillsGuardian(filled.data.changeSummary as never), 'the free slot is filled');
  // Filling is not left to the search: even one generation without heuristic seeds returns the current build filled.
  const bare = await search(emptied, { targets, gaParameters: { ...small, generations: 1, seedWithHeuristics: false } });
  assert.ok(fillsGuardian(bare.data.changeSummary as never), 'the fallback result is the current build with its free slot filled');
  // A Jewels-only target keeps its items, free slot included.
  const jewelsOnly = await search(emptied, { targets: [{ characterId: guardian.id, changeableComponents: { jewels: true } }], gaParameters: small });
  assert.ok(!fillsGuardian(jewelsOnly.data.changeSummary as never), 'a Jewels-only target is not filled');
}

// ---------------- Item jars: the highest enhancement first ----------------
// SpecRef: 9.1.4.9 | GA search Candidates | the copies of an item without a Super Rare title are one jar, and each Super
// Rare title of an item is a jar of its own; a slot takes its jar's highest-enhancement copy left.
{
  const jarOf = (id: number, superRare: number) => `${id}/${superRare}`;
  /** Adds `count` owned copies of `item` with the given enhancement and Super Rare title. */
  const stock = (state: GameState, item: Item, enhancement: number, superRare: number, count = 1) => {
    const copy = { ...item, enhancement, superRare, jewel: null, isLocked: false };
    const entry = state.global.inventory[getVariantKey(copy)];
    state.global.inventory[getVariantKey(copy)] = { item: copy, count: (entry?.status === 'owned' ? entry.count : 0) + count, status: 'owned' };
  };
  /** Owned Inventory enhancements per jar, highest first. */
  const inventoryJars = (state: GameState) => {
    const jars = new Map<string, number[]>();
    for (const entry of Object.values(state.global.inventory)) {
      if (entry.status !== 'owned' || entry.count <= 0) continue;
      const jar = jarOf(entry.item.id, entry.item.superRare);
      jars.set(jar, [...(jars.get(jar) ?? []), ...new Array(entry.count).fill(entry.item.enhancement)]);
    }
    for (const list of jars.values()) list.sort((a, b) => b - a);
    return jars;
  };

  // A stripped party: every placed copy comes from the Inventory, so each jar's placed copies are its highest ones.
  const stripped = structuredClone(base);
  const owned = Object.values(base.global.inventory).filter((entry) => entry.status === 'owned' && entry.count > 0 && entry.item.superRare === 0);
  for (const entry of owned) stock(stripped, entry.item, 2, 0);
  stock(stripped, owned[0].item, 0, 1); stock(stripped, owned[0].item, 1, 1);
  const available = inventoryJars(stripped);
  const result = await search(stripped, { targets: equipmentTargets, gaParameters: small });
  const placed = new Map<string, number[]>();
  for (const entry of result.data.changeSummary as GaChangeEntry[]) {
    if (!entry.endpoint.endsWith('/equip')) continue;
    const [, id, enhancement, superRare] = String(entry.parameters.targetEquipment).split('/').map(Number);
    placed.set(jarOf(id, superRare), [...(placed.get(jarOf(id, superRare)) ?? []), enhancement]);
  }
  assert.ok([...placed.values()].flat().includes(2), 'a +2 copy is placed');
  for (const [jar, list] of placed) assert.deepEqual([...list].sort((a, b) => b - a), available.get(jar)!.slice(0, list.length), `jar ${jar} places its highest copies`);

  // A geared party with a +2 copy of every worn item in the Inventory: the result never leaves a worn copy below one still
  // in the Inventory (the current build's own genes upgrade it).
  const geared = createFreshGameState('ja', now);
  for (const character of geared.parties[0].characters) for (const item of character.equipment) if (item && !item.isLocked && item.enhancement < 2) stock(geared, item, 2, item.superRare);
  const targets = geared.parties[0].characters.map((character) => ({ characterId: character.id, changeableComponents: { equipment: true } }));
  const upgraded = await search(geared, { targets, gaParameters: { ...small, generations: 1, seedWithHeuristics: false } });
  let after = geared;
  for (const entry of upgraded.data.changeSummary as GaChangeEntry[]) after = applyApiV1Commit(entry.endpoint, after, entry.parameters, context()).state;
  const left = inventoryJars(after);
  let upgrades = 0;
  for (const character of after.parties[0].characters) {
    for (const item of character.equipment) {
      if (!item || item.isLocked) continue;
      if (item.enhancement === 2) upgrades += 1;
      const higher = left.get(jarOf(item.id, item.superRare))?.[0] ?? -1;
      assert.ok(higher <= item.enhancement, `character ${character.id} wears ${item.id}+${item.enhancement} while +${higher} is in the Inventory`);
    }
  }
  assert.ok(upgrades > 0, 'worn copies are upgraded');
}

// ---------------- Objective measures (Spec 7.1.5 Score and Luck check) ----------------
{
  const result = {
    Clear: 3, Return: 1, Draw: 2, Retreat: 1, Defeat: 3, total: 10, rooms: [],
    gateRoom: { reached: 4, kills: 1, damageShare: 2, damageShareSquareSum: 1.5 }, experienceSquareSum: 1000, totals: { experience: 80, itemDrops: 0, dropSaleValue: 0 },
    progress: { sum: 30, squareSum: 120 },
  } as ExpeditionSimulationResult;
  const close = (actual: { rate: number; variance: number }, expected: { rate: number; variance: number }, label: string) => {
    assert.ok(Math.abs(actual.rate - expected.rate) < 1e-12 && Math.abs(actual.variance - expected.variance) < 1e-12, `${label}: ${JSON.stringify(actual)}`);
  };
  close(measureObjective('success', result, 6), { rate: 0.4, variance: 0.24 }, 'success is Bernoulli');
  close(measureObjective('minDefeat', result, 6), { rate: 0.3, variance: 0.21 }, 'minDefeat is Bernoulli');
  close(measureObjective('gateDamage', result, 6), { rate: 0.2, variance: 0.15 - 0.04 }, 'the per-run share variance, below the 0.16 bound');
  close(measureObjective('experience', result, 6), { rate: 8, variance: 100 - 64 }, 'the per-run EXP variance');
  close(measureObjective('progress', result, 6), { rate: 0.5, variance: (12 - 9) / 36 }, 'progress in rooms over the route rooms');
}

// ---------------- `gateDamage` on the boss: the boss battle alone, from full HP ----------------
{
  const fresh = createFreshGameState('ja', now);
  const prepared = prepareObjectiveState(fresh, 0, 'gateDamage', BOSS);
  const bossOnly = await simulateExpeditionRuns(prepared, 0, 'mode.normal', 40, undefined, 0, 9, bossOptions());
  assert.equal(bossOnly.gateRoom?.reached, 40, 'every run fights the boss');
  assert.deepEqual(bossOnly.rooms.filter((room) => room.reached > 0).map((room) => room.room), [24], 'and nothing else');
  assert.ok(bossOnly.gateRoom!.damageShareSquareSum <= bossOnly.gateRoom!.damageShare + 1e-9, 'a share squared is at most the share');
  const route = await simulateExpeditionRuns(prepared, 0, 'mode.normal', 40, undefined, 0, 9);
  assert.ok(route.progress!.sum >= 0 && route.progress!.sum <= 40 * routeRoomCount(prepared.parties[0]), 'progress counts rooms');
  // The search scores and verifies the same boss-only forecast.
  const targets = fresh.parties[0].characters.map((character) => ({ characterId: character.id, changeableComponents: { equipment: true } }));
  const searched = await runGaSearch(fresh, 0, parseGaSearchRequest(fresh, 0, { targets, objective: 'gateDamage', gateRoom: 'boss', gaParameters: small }), dependencies());
  const verification = searched.data.verification as { before: number; runs: number };
  const verifyBefore = await simulateExpeditionRuns(prepared, 0, 'mode.normal', verification.runs, undefined, 0, deriveSeed(small.seed, 3), bossOptions());
  assert.equal(verification.before, measureObjective('gateDamage', verifyBefore, 0).rate);
  assert.equal((searched.data.forecast as { before: string }).before, buildSimulationRunData(verifyBefore, 0, 'check').overview);
}

// ---------------- `success` at 0 on both builds: the verdict is judged on `progress` (Spec 9.1.3, 2-3-2) ----------------
{
  // A fresh party on the whole of Expedition 1, every gate open, never beats the boss: both builds stay at 0 successes, so
  // only `progress` can tell them apart (it used to be `noisy` 0 → 0).
  const fresh = createFreshGameState('ja', now);
  const hopeless = prepareObjectiveState(fresh, 0, 'gateDamage', BOSS);
  const targets = hopeless.parties[0].characters.map((character) => ({ characterId: character.id, changeableComponents: { equipment: true } }));
  const searched = await search(hopeless, { targets, gaParameters: small });
  const verification = searched.data.verification as { objective: string; scoredBy: string; runs: number; before: number; after: number; gain: number; standardError: number };
  assert.deepEqual([verification.objective, verification.scoredBy], ['success', 'progress']);
  const verifyBefore = await simulateExpeditionRuns(hopeless, 0, 'mode.normal', verification.runs, undefined, 0, deriveSeed(small.seed, 3));
  assert.equal(measureObjective('success', verifyBefore, 0).rate, 0);
  assert.equal(verification.before, measureObjective('progress', verifyBefore, routeRoomCount(hopeless.parties[0])).rate, '`before` is the current build\'s progress');
  assert.ok(['veryGood', 'good'].includes(String(searched.data.verdict)), `verdict ${searched.data.verdict}`);
  assert.ok(verification.after > verification.before && verification.gain > 2 * verification.standardError && verification.standardError > 0);
  assert.equal(verification.gain, Math.round((verification.after - verification.before) * 1e4) / 100, 'the gain in percentage points of progress');
}

// ---------------- `simulationRun` `objective` and `seed` (Spec 9.1.3, 2-2-3) ----------------
{
  const fresh = createFreshGameState('ja', now);
  const read = (parameters: Record<string, unknown>) => buildApiV1ReadData('read/expedition/1/simulationRun', fresh, parameters, {
    revision: 1, environment: 'desktop', gameMode: 'mode.normal', enemyLevelOffset: 0, inGameTime: now, createSeed: () => 77,
    simulation: (partyIndex, count, forecast) => simulateExpeditionRuns(forecast?.state ?? fresh, partyIndex, 'mode.normal', count, undefined, 0, forecast?.seed, forecast?.options),
  }) as Promise<Record<string, unknown>>;
  const strip = ({ seedDomain: _domain, ...rest }: Record<string, unknown>) => rest;
  const plain = await read({ numberOfRun: 30 });
  assert.equal(plain.seed, 77, 'the random seed chosen is returned');
  assert.equal('rate' in plain, false, 'no `rate` without an objective');
  assert.deepEqual(strip(await read({ numberOfRun: 30, seed: 77 })), strip(plain), 'the returned seed repeats the forecast');
  const boss = await read({ numberOfRun: 30, objective: 'gateDamage', gateRoom: 'boss', seed: 5 });
  const direct = await simulateExpeditionRuns(prepareObjectiveState(fresh, 0, 'gateDamage', BOSS), 0, 'mode.normal', 30, undefined, 0, 5, bossOptions());
  const measured = measureObjective('gateDamage', direct, 0);
  assert.deepEqual([boss.rate, boss.standardError, boss.seed], [measured.rate, Math.sqrt(measured.variance / 30), 5]);
  assert.equal(boss.overview, buildSimulationRunData(direct, 0, 'check').overview, '`overview` describes the boss battle');
  const progress = await read({ numberOfRun: 30, objective: 'progress', seed: 5 });
  assert.ok(typeof progress.rate === 'number' && progress.rate >= 0 && progress.rate <= 1);
  for (const [parameters, marker] of [[{ objective: 'speed' }, 'invalid_request:objective'], [{ seed: 1.5 }, 'invalid_request:seed']] as const) {
    await assert.rejects(read(parameters), new RegExp(marker));
  }
}

// ---------------- `objectiveGuard`, `verifySeed`, and the 600 s budget: validation (Spec 9.1.3, 2-3-2) ----------------
rejects({ targets: equipmentTargets, objectiveGuard: { success: 0.1 } }, 'invalid_request:objectiveGuard.success.same_as_objective');
rejects({ targets: equipmentTargets, objectiveGuard: { experience: 0.1 } }, 'invalid_request:objectiveGuard.experience.unknown_member');
rejects({ targets: equipmentTargets, objectiveGuard: { gateDamage: 1.5 } }, 'invalid_request:objectiveGuard.gateDamage');
rejects({ targets: equipmentTargets, objectiveGuard: { gateDamage: 0.1, success: 0.1 } }, 'invalid_request:objectiveGuard');
rejects({ targets: equipmentTargets, objectiveGuard: 0.1 }, 'invalid_request:objectiveGuard');
rejects({ targets: equipmentTargets, gaParameters: { verifySeed: 1.5 } }, 'invalid_request:gaParameters.verifySeed');
rejects({ targets: equipmentTargets, gaParameters: { timeBudgetSeconds: 601 } }, 'invalid_request:gaParameters.timeBudgetSeconds');
{
  const parsed = parseGaSearchRequest(base, 0, { targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', objectiveGuard: { success: 0.05 }, gaParameters: { timeBudgetSeconds: 600, verifySeed: -3 } });
  assert.deepEqual(parsed.objectiveGuard, { objective: 'success', minimum: 0.05 });
  assert.deepEqual([parsed.parameters.timeBudgetSeconds, parsed.parameters.verifySeed], [600, -3]);
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets }).objectiveGuard, null);
}

// ---------------- `forecast.scope`, `verification.progress`, and `crossCheck` (Spec 9.1.3, 2-3-2) ----------------
{
  assert.deepEqual(forecastScope(base, 0, 'success'), { from: '1f-1', to: '1f-3', rooms: 3, endsAt: 'depthLimit' });
  assert.deepEqual(forecastScope(base, 0, 'gateDamage', BOSS), { from: '6f-4', to: '6f-4', rooms: 1, endsAt: 'gateRoom' });
  const fresh = createFreshGameState('ja', now);
  const open = forecastScope(fresh, 0, 'success');
  assert.equal(open.rooms, routeRoomCount(fresh.parties[0]), 'the scope is the route `progress` is divided by');
  assert.ok(open.endsAt === 'clearGate' || open.endsAt === 'dungeonEnd' || open.endsAt === 'depthLimit');

  const data = outcome.data as { forecast: { scope: unknown }; verification: { seed: number; verifySeed: number; progress: { before: number; after: number } | null; crossCheck: { objective: string; before: number; after: number; minimum: number | null; reached: unknown } } };
  assert.deepEqual(data.forecast.scope, forecastScope(base, 0, 'success'));
  assert.equal(data.verification.verifySeed, deriveSeed(small.seed, 3), 'the verification seed derives from `seed` by default');
  const verifyBefore = await simulateExpeditionRuns(base, 0, 'mode.normal', small.verifyRuns, undefined, 0, deriveSeed(small.seed, 3));
  assert.equal(data.verification.progress!.before, Math.round(measureObjective('progress', verifyBefore, routeRoomCount(base.parties[0])).rate * 1e4) / 1e4);
  assert.ok(data.verification.progress!.after >= 0 && data.verification.progress!.after <= 1);
  // `success` cross-checks `gateDamage` on the next gate room (`gateRoom: next`, here the closed 1st Elite gate's 1f-4),
  // measured on the same verification seed; no guard, so no minimum.
  const crossBefore = await measureSecondObjective(dependencies(), base, 0, 'gateDamage', small.verifyRuns, deriveSeed(small.seed, 3), { gateRoom: { floorNumber: 1, roomInFloor: 4 }, startHp: null });
  assert.deepEqual([data.verification.crossCheck.objective, data.verification.crossCheck.before, data.verification.crossCheck.minimum, data.verification.crossCheck.reached], ['gateDamage', Math.round(crossBefore.rate * 1e4) / 1e4, null, null]);
  assert.equal((outcome.data as { gateRoom: string }).gateRoom, '1f-4');
  // `crossCheck.winRate`: beside the `gateDamage` share, the share of runs that won the gate room (a win counts 1 in the share,
  // so the win rate never exceeds it).
  const winRate = (data.verification.crossCheck as unknown as { winRate: { before: number; after: number } | null }).winRate!;
  assert.equal(winRate.before, Math.round(crossBefore.winRate! * 1e4) / 1e4);
  assert.ok(winRate.before <= data.verification.crossCheck.before && winRate.after <= data.verification.crossCheck.after);

  // `verifySeed`: two searches with different search seeds measure the current build on the same verification runs.
  const a = (await search(base, { targets: equipmentTargets, gaParameters: { ...small, seed: 1, verifySeed: 42 } })).data as typeof data & { verification: { before: number } };
  const b = (await search(base, { targets: equipmentTargets, gaParameters: { ...small, seed: 2, verifySeed: 42 } })).data as typeof data & { verification: { before: number } };
  assert.deepEqual([a.verification.verifySeed, b.verification.verifySeed, a.verification.seed, b.verification.seed], [42, 42, 1, 2]);
  assert.equal(a.verification.before, b.verification.before);
  assert.deepEqual(a.verification.crossCheck.before, b.verification.crossCheck.before);

  // `gateDamage` reports no `progress` (only the gate room runs) and cross-checks `success`; a guard fills in `minimum` and `reached`.
  const boss = (await search(base, { targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', objectiveGuard: { success: 0.5 }, gaParameters: small })).data as typeof data;
  assert.equal(boss.verification.progress, null);
  assert.equal(boss.forecast.scope && (boss.forecast.scope as { endsAt: string }).endsAt, 'gateRoom');
  const guardBefore = await measureSecondObjective(dependencies(), base, 0, 'success', small.verifyRuns, deriveSeed(small.seed, 3));
  const reached = boss.verification.crossCheck.reached as { before: boolean; after: boolean };
  assert.deepEqual([boss.verification.crossCheck.objective, boss.verification.crossCheck.minimum, reached.before], ['success', 0.5, guardBefore.rate >= 0.5]);
  assert.equal(reached.after, boss.verification.crossCheck.after >= 0.5);
  assert.equal((boss.verification.crossCheck as unknown as { winRate: unknown }).winRate, null, 'no win rate unless the cross-check is gateDamage');
  // SpecRef: 9.1.3 | 2-3-2 `guardReconfirm` | the accepted finalists' guard rates on a fresh seed, in order, until one reaches it.
  type Reconfirm = { runs: number; rates: number[]; chosen: number | null } | null;
  const checkReconfirm = (value: unknown, minimum: number) => {
    const reconfirm = value as Reconfirm;
    if (reconfirm === null) return;
    assert.equal(reconfirm.runs, small.verifyRuns);
    assert.ok(reconfirm.rates.length >= 1 && reconfirm.rates.length <= 3, JSON.stringify(reconfirm));
    if (reconfirm.chosen === null) assert.ok(reconfirm.rates.every((rate) => rate < minimum), JSON.stringify(reconfirm));
    else assert.ok(reconfirm.chosen === reconfirm.rates.length - 1 && reconfirm.rates[reconfirm.chosen] >= minimum && reconfirm.rates.slice(0, -1).every((rate) => rate < minimum), JSON.stringify(reconfirm));
  };
  checkReconfirm((boss as unknown as { guardReconfirm: unknown }).guardReconfirm, 0.5);
  assert.equal(outcome.data.guardReconfirm, null, 'no re-confirmation without a guard');
  for (const minimum of [0.05, 0.3, 0.9]) {
    const guardedSearch = await search(base, { targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', objectiveGuard: { success: minimum }, gaParameters: { ...small, seed: 5 } });
    checkReconfirm(guardedSearch.data.guardReconfirm, minimum);
    const reconfirm = guardedSearch.data.guardReconfirm as Reconfirm;
    // With a re-confirmed guard reached, the result is the chosen finalist and its verdict is not lost to the guard.
    if (reconfirm?.chosen !== null && reconfirm !== null) assert.ok((guardedSearch.data.changeSummary as unknown[]).length > 0);
  }
  assert.equal(guardBefore.winRate, undefined);
}

// ---------------- The guard ranking and the guard verdict (Spec 9.1.3, 2-3-2 `objectiveGuard`) ----------------
{
  const guard = { objective: 'success' as const, minimum: 0.1 };
  assert.ok(compareGuarded({ fitness: 0.1, guard: 0.2 }, { fitness: 0.9, guard: 0.05 }, guard) > 0, 'reaching the guard beats a better objective');
  assert.ok(compareGuarded({ fitness: 0.1, guard: 0.08 }, { fitness: 0.9, guard: 0.02 }, guard) > 0, 'below the guard, the closer one ranks first');
  assert.ok(compareGuarded({ fitness: 0.9, guard: 0.3 }, { fitness: 0.1, guard: 0.6 }, guard) > 0, 'above the guard, the objective decides');
  assert.ok(compareGuarded({ fitness: 0.9, guard: 0.0 }, { fitness: 0.1, guard: 0.6 }, null) > 0, 'no guard: the objective alone');
  // A result that loses a guard the current build reaches is `worse`, whatever its gain.
  const result = await simulateExpeditionRuns(base, 0, 'mode.normal', 100, undefined, 0, 3);
  const weak = { ...measure('gateDamage', result, 3), rate: 0.2, variance: 0.01 };
  const strong = { ...weak, rate: 0.9 };
  const input = {
    objective: 'gateDamage' as const, guard, crossObjective: 'success' as const, verifyRuns: 500, seed: 1, verifySeed: 2, routeRooms: 3,
    before: weak, after: strong, crossBefore: { rate: 0.2, variance: 0.16 }, crossAfter: { rate: 0.0, variance: 0 }, changed: true,
    revision: 1, scope: forecastScope(base, 0, 'gateDamage', BOSS), label: 'check',
  };
  assert.equal(summarizeVerification({ ...input, guard: null }).verdict, 'veryGood');
  assert.equal(summarizeVerification(input).verdict, 'worse');
  assert.equal(summarizeVerification({ ...input, crossAfter: { rate: 0.15, variance: 0.1 } }).verdict, 'veryGood', 'the guard is still reached');
}

// ---------------- Request time limit: the verification fits in `timeBudgetSeconds` (Spec 9.1.3, 2-3-2) ----------------
{
  let clock = now;
  const ticking: GaSearchDependencies = { ...dependencies(), now: () => { clock += 40; return clock; } };
  const timed = await runGaSearch(base, 0, parseGaSearchRequest(base, 0, { targets: equipmentTargets, gaParameters: { ...small, generations: 200, timeBudgetSeconds: 5 } }), ticking);
  assert.ok((timed.data.elapsedSeconds as number) <= 5, `elapsed ${timed.data.elapsedSeconds}`);
  assert.ok(['veryGood', 'good', 'noisy', 'noChange', 'worse'].includes(String(timed.data.verdict)));
}

// ---------------- `progress` as an objective and as a guard (Spec 9.1.3, 2-0) ----------------
{
  const progress = await search(base, { targets: equipmentTargets, objective: 'progress', gaParameters: small });
  const verification = progress.data.verification as { objective: string; scoredBy: string; before: number; after: number; crossCheck: { objective: string } };
  assert.deepEqual([verification.objective, verification.scoredBy, verification.crossCheck.objective], ['progress', 'progress', 'gateDamage']);
  assert.ok(verification.before >= 0 && verification.after <= 1, 'progress is a share of the route');
  const guarded = await search(base, { targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', objectiveGuard: { progress: 0.5 }, gaParameters: small });
  const crossCheck = (guarded.data.verification as { crossCheck: { objective: string; minimum: number; before: number } }).crossCheck;
  assert.deepEqual([crossCheck.objective, crossCheck.minimum], ['progress', 0.5]);
  // The guard's `progress` is divided by the route's rooms, so it is a share like the objective's.
  assert.ok(crossCheck.before >= 0 && crossCheck.before <= 1, `progress guard ${crossCheck.before}`);
}

// ---------------- `effort: max`, the `quickRuns` range, and the stop report (Spec 9.1.3, 2-3-2) ----------------
{
  assert.deepEqual(GA_EFFORT_PRESETS.max, { populationSize: 64, generations: 200, quickRuns: 300, confirmRuns: 600, timeBudgetSeconds: 590 });
  const parsed = parseGaSearchRequest(base, 0, { targets: equipmentTargets, gaParameters: { effort: 'max' } });
  assert.deepEqual({ populationSize: parsed.parameters.populationSize, generations: parsed.parameters.generations, quickRuns: parsed.parameters.quickRuns, confirmRuns: parsed.parameters.confirmRuns, timeBudgetSeconds: parsed.parameters.timeBudgetSeconds }, GA_EFFORT_PRESETS.max);
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets, gaParameters: { effort: 'max', quickRuns: 1000 } }).parameters.quickRuns, 1000);
  rejects({ targets: equipmentTargets, gaParameters: { quickRuns: 1001 } }, 'invalid_request:gaParameters.quickRuns');
  // `max` is `gaSearch` only: `directedBuild` keeps its own presets.
  let message = '';
  try { parseDirectedBuildRequest(base, 0, { direction: 'free', targets: [{ characterId: ids[0] }], tuningParameters: { effort: 'max' } }); } catch (error) { message = String(error); }
  assert.ok(message.includes('invalid_request:tuningParameters.effort'), message);
  // Every generation ran: `generations`. A search the clock stops: `timeBudget`, with fewer generations.
  assert.deepEqual([outcome.data.generationsRun, outcome.data.stopReason], [small.generations, 'generations']);
  assert.equal(outcome.data.seeds, undefined, '`seeds` only when `seedBuilds` is sent');
  let clock = now;
  const ticking: GaSearchDependencies = { ...dependencies(), now: () => { clock += 40; return clock; } };
  const timed = await runGaSearch(base, 0, parseGaSearchRequest(base, 0, { targets: equipmentTargets, gaParameters: { ...small, generations: 200, timeBudgetSeconds: 5 } }), ticking);
  assert.equal(timed.data.stopReason, 'timeBudget');
  assert.ok((timed.data.generationsRun as number) < 200, `generationsRun ${timed.data.generationsRun}`);
}

// ---------------- `seedBuilds` (Spec 9.1.3, 2-3-2; 9.1.4.9 GA search Validation and Seeds) ----------------
{
  const seedRequest = (seedBuilds: unknown) => ({ targets: equipmentTargets, seedBuilds });
  rejects(seedRequest([]), 'invalid_request:seedBuilds');
  rejects(seedRequest(new Array(17).fill({})), 'invalid_request:seedBuilds');
  rejects(seedRequest({}), 'invalid_request:seedBuilds');
  rejects(seedRequest([5]), 'invalid_request:seedBuilds[0]');
  rejects(seedRequest([{}, { equipment: [] }]), 'invalid_request:seedBuilds[1].equipment.unknown_member');
  rejects(seedRequest([{ label: 'x'.repeat(65) }]), 'invalid_request:seedBuilds[0].label');
  rejects(seedRequest([{ characters: {} }]), 'invalid_request:seedBuilds[0].characters');
  rejects(seedRequest([{ characters: [{ characterId: 999999 }] }]), 'invalid_request:seedBuilds[0].characters[0].characterId');
  rejects(seedRequest([{ characters: [{ characterId: ids[0] }, { characterId: ids[0] }] }]), 'invalid_request:seedBuilds[0].characters[1].characterId');
  rejects(seedRequest([{ characters: [{ characterId: ids[0], mainClassId: 3 }] }]), 'invalid_request:seedBuilds[0].characters[0].mainClassId');
  rejects(seedRequest([{ characters: [{ characterId: ids[0], name: 'x' }] }]), 'invalid_request:seedBuilds[0].characters[0].name.unknown_member');
  rejects(seedRequest([{ order: [ids[0]] }]), 'invalid_request:seedBuilds[0].order');
  rejects(seedRequest([{ order: ids.map(() => ids[0]) }]), 'invalid_request:seedBuilds[0].order');
  rejects(seedRequest([{ deityId: 1 }]), 'invalid_request:seedBuilds[0].deityId');
  // A well-formed value the rules refuse is no error.
  assert.equal(parseGaSearchRequest(base, 0, seedRequest([{ characters: [{ characterId: ids[0], lineage: 'nonexistent' }] }])).seedBuilds!.length, 1);

  const party = base.parties[0];
  const plain = party.characters.filter((character) => !character.isUnique);
  const unique = party.characters.find((character) => character.isUnique)!;
  const [first, second] = plain;
  const otherClasses = CLASSES.map((entry) => entry.id).filter((id) => id !== first.mainClassId);
  const otherLineage = ['sandstorm', 'ashen_capital'].find((id) => id !== unique.lineageId)!;
  // `first` may change its main class and equipment; `second` only its equipment; the unique character its lineage (ignored).
  const targets = [
    { characterId: first.id, changeableComponents: { mainClass: true, equipment: true } },
    { characterId: second.id, changeableComponents: { equipment: true } },
    { characterId: unique.id, changeableComponents: { lineage: true, equipment: true } },
  ];
  const seedBuilds = [
    { label: 'A', characters: [{ characterId: first.id, mainClassId: otherClasses[0], lineage: 'nonexistent' }, { characterId: second.id, mainClassId: otherClasses[0] }], order: [...ids].reverse(), deityId: 'nonexistent' },
    { label: 'A again', characters: [{ characterId: first.id, mainClassId: otherClasses[0] }] },
    { label: 'unique lineage', characters: [{ characterId: unique.id, lineage: otherLineage }] },
    { label: 'current', characters: [{ characterId: first.id, mainClassId: first.mainClassId }] },
    { characters: [{ characterId: first.id, mainClassId: otherClasses[1] }] },
    { characters: [{ characterId: first.id, mainClassId: otherClasses[2] }] },
    { characters: [{ characterId: first.id, mainClassId: otherClasses[3] }] },
    { label: 'late', characters: [{ characterId: first.id, mainClassId: otherClasses[4] }] },
  ];
  const raw = { targets, seedBuilds, gaParameters: { ...small, seedWithHeuristics: false } };
  const seeded = await search(base, raw);
  type Report = { label: string | null; status: string; ignored: { field: string; reason: string }[]; quickRate: number | null; quickScore: number | null; usedValues: number; keptValues: number; inBest: boolean };
  const seeds = seeded.data.seeds as Report[];
  assert.equal(seeds.length, seedBuilds.length, 'one report per seed, in request order');
  assert.deepEqual(seeds.map((entry) => entry.label), ['A', 'A again', 'unique lineage', 'current', null, null, null, 'late']);
  assert.deepEqual(seeds.map((entry) => entry.status), ['used', 'ignored', 'ignored', 'ignored', 'used', 'used', 'used', 'ignored']);
  // Ignored values of a used seed: an unknown lineage, a component the request does not open, order and deity changes the request forbids.
  assert.deepEqual(seeds[0].ignored, [
    { field: 'characters[0].lineage', reason: 'invalidValue' },
    { field: 'characters[1].mainClassId', reason: 'notChangeable' },
    { field: 'order', reason: 'notChangeable' },
    { field: 'deityId', reason: 'invalidValue' },
  ]);
  assert.deepEqual(seeds[1].ignored, [{ field: 'seed', reason: 'duplicate' }], 'the same used values as an earlier seed');
  assert.deepEqual(seeds[2].ignored, [{ field: 'characters[0].lineage', reason: 'notAllowed' }], "a unique character's lineage");
  assert.deepEqual(seeds[3].ignored, [{ field: 'seed', reason: 'duplicate' }], 'the current build');
  assert.deepEqual(seeds[7].ignored, [{ field: 'seed', reason: 'populationFull' }], 'at most populationSize / 2 seeds');
  for (const entry of seeds) {
    if (entry.status === 'used') assert.ok(entry.quickRate !== null && entry.quickRate >= 0 && entry.quickRate <= 1, `quickRate ${entry.quickRate}`);
    else assert.deepEqual([entry.quickRate, entry.inBest], [null, false]);
    assert.equal(typeof entry.inBest, 'boolean');
    // `quickScore` is on the score the quick ranking started on; `keptValues` of `usedValues` are in the result build.
    if (entry.status === 'used') assert.ok(entry.quickScore !== null && entry.usedValues > 0, JSON.stringify(entry));
    else assert.deepEqual([entry.quickScore, entry.usedValues, entry.keptValues], [null, 0, 0]);
    assert.ok(entry.keptValues <= entry.usedValues);
    assert.equal(entry.inBest, entry.status === 'used' && entry.keptValues === entry.usedValues);
  }
  // The stripped party starts on the `progress` signal, so `quickScore` is the quick `progress`, beside the current build's.
  assert.equal((seeded.data.quickSignal as { start: string }).start, 'progress');
  const baseline = seeded.data.seedBaseline as { quickRate: number | null; quickScore: number | null };
  assert.ok(baseline.quickRate !== null && baseline.quickScore !== null && baseline.quickScore >= 0 && baseline.quickScore <= 1, JSON.stringify(baseline));
  // `inBest`: the best build has the seed's class exactly when its `changeSummary` changes `first` to it.
  const classChange = (seeded.data.changeSummary as GaChangeEntry[]).find((entry) => entry.endpoint === `commit/build/character/${first.id}/changeBuild`);
  const resultClass = (classChange?.parameters.mainClassId as string | undefined) ?? first.mainClassId;
  for (const [index, entry] of seeds.entries()) {
    if (entry.status === 'used') assert.equal(entry.inBest, seedBuilds[index].characters[0].mainClassId === resultClass, `seed ${index} inBest`);
  }
  assert.deepEqual([seeded.data.generationsRun, seeded.data.stopReason], [small.generations, 'generations']);
  // A fixed seed repeats the seeded search; without `seedBuilds` the search draws exactly as before.
  assert.deepEqual((await search(base, raw)).data, seeded.data, 'a fixed seed repeats the seeded search');
  const unseeded = { targets, gaParameters: { ...small, seedWithHeuristics: false } };
  assert.deepEqual((await search(base, unseeded)).data, (await search(base, unseeded)).data);
  // The seed fills count in `evaluations`: with no generation at all, only the verification and the fills are left.
  const none = await search(base, { targets, gaParameters: { ...small, seedWithHeuristics: false, generations: 1 } });
  const filled = await search(base, { ...raw, gaParameters: { ...small, seedWithHeuristics: false, generations: 1 } });
  assert.ok((filled.data.evaluations as number) >= (none.data.evaluations as number), `${filled.data.evaluations} vs ${none.data.evaluations}`);
  // A deity seed: used when `considerDeityChange` allows it, `notAllowed` when the deity is known but not an option.
  const deitySearch = await search(base, { targets, considerDeityChange: 'unoccupiedDeities', seedBuilds: [{ deityId: 'none' }, { deityId: 'nonexistent' }], gaParameters: { ...small, seedWithHeuristics: false } });
  const deitySeeds = deitySearch.data.seeds as Report[];
  const currentDeity = getDeityId(party.deity.name);
  if (currentDeity === 'none') assert.deepEqual(deitySeeds[0].ignored, [{ field: 'seed', reason: 'duplicate' }], 'no faith is the current deity');
  else assert.equal(deitySeeds[0].status, 'used');
  assert.deepEqual(deitySeeds[1].ignored, [{ field: 'deityId', reason: 'invalidValue' }]);
  // `order` is used only with `considerOrderChange`.
  const ordered = await search(base, { targets, considerOrderChange: true, seedBuilds: [{ order: [...ids].reverse() }], gaParameters: { ...small, seedWithHeuristics: false } });
  assert.deepEqual((ordered.data.seeds as Report[])[0].status, 'used');
}

// ---------------- `successSignal` and `quickSignal` (Spec 9.1.3, 2-3-2; 9.1.4.9 GA search Quick signal) ----------------
{
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets }).successSignal, 'auto', '`auto` by default for `success`');
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets, objective: 'progress' }).successSignal, null);
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets, successSignal: 'progress' }).successSignal, 'progress');
  rejects({ targets: equipmentTargets, successSignal: 'luck' }, 'invalid_request:successSignal');
  rejects({ targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', successSignal: 'success' }, 'invalid_request:successSignal');

  // Rare is a noise level, `p < 20 / (quickRuns + 20)`: the same relative standard error at every `quickRuns`.
  for (const [quickRuns, limit] of [[10, 2 / 3], [30, 0.4], [50, 20 / 70], [100, 1 / 6], [300, 0.0625], [1000, 20 / 1020]]) {
    assert.equal(isRareSuccess(limit - 1e-9, quickRuns), true, `rare below ${limit} at ${quickRuns}`);
    assert.equal(isRareSuccess(limit + 1e-9, quickRuns), false, `not rare above ${limit} at ${quickRuns}`);
  }
  assert.equal(isRareSuccess(0, 1000), true);
  // The stripped party has no success before the search, so `auto` starts on `progress`.
  assert.equal((outcome.data.quickSignal as { start: string }).start, 'progress');
  assert.equal((await search(base, { targets: equipmentTargets, objective: 'progress', gaParameters: small })).data.quickSignal, null);
  // `auto` on a stripped party: rare successes at the start, then a switch once the best confirmed build is no longer rare.
  const wider = { ...small, generations: 6, quickRuns: 40, confirmRuns: 100 };
  const auto = await search(base, { targets: equipmentTargets, gaParameters: wider });
  const signal = auto.data.quickSignal as { start: string; switchedAt: number | null };
  assert.equal(signal.start, 'progress');
  assert.ok(signal.switchedAt !== null && signal.switchedAt >= 2 && signal.switchedAt <= (auto.data.generationsRun as number), `switchedAt ${signal.switchedAt}`);
  assert.deepEqual((await search(base, { targets: equipmentTargets, gaParameters: wider })).data, auto.data, 'a fixed seed repeats the switch');
  // Fixed signals never switch; the verdict is judged on `success` whatever the quick signal.
  const forced = await search(base, { targets: equipmentTargets, successSignal: 'progress', gaParameters: wider });
  assert.deepEqual(forced.data.quickSignal, { start: 'progress', switchedAt: null });
  const plain = await search(base, { targets: equipmentTargets, successSignal: 'success', gaParameters: wider });
  assert.deepEqual(plain.data.quickSignal, { start: 'success', switchedAt: null });
  for (const result of [auto, forced, plain]) assert.equal((result.data.verification as { objective: string }).objective, 'success');
}

// ---------------- Guard on the quick runs, shared runs, and `guardStats` (Spec 9.1.3, 2-0 and 2-3-2 `objectiveGuard`) ----------------
{
  assert.equal(outcome.data.guardStats, null, 'no guard, no `guardStats`');
  // `success` guarded by `progress`: one route forecast serves both, so `crossCheck` is the `progress` of the verification runs.
  const guarded = await search(base, { targets: equipmentTargets, objectiveGuard: { progress: 0.9 }, gaParameters: small });
  const verification = guarded.data.verification as { progress: { before: number; after: number }; crossCheck: { objective: string; before: number; after: number } };
  const progressBefore = await measureSecondObjective(dependencies(), base, 0, 'progress', small.verifyRuns, deriveSeed(small.seed, 3));
  assert.equal(verification.crossCheck.objective, 'progress');
  assert.equal(verification.crossCheck.before, Math.round(progressBefore.rate * 1e4) / 1e4, 'shared runs give the separate forecast\'s value');
  assert.deepEqual([verification.crossCheck.before, verification.crossCheck.after], [verification.progress.before, verification.progress.after]);
  const stats = guarded.data.guardStats as { confirmed: number; reached: number };
  assert.ok(stats.confirmed > 0 && stats.reached >= 0 && stats.reached <= stats.confirmed, JSON.stringify(stats));
  // A guard on a separate forecast (`gateDamage` fights the boss alone; the guard runs the route).
  const unreachable = await search(base, { targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', objectiveGuard: { success: 1 }, gaParameters: small });
  const missed = unreachable.data.guardStats as { confirmed: number; reached: number };
  assert.ok(missed.confirmed > 0 && missed.reached <= missed.confirmed, JSON.stringify(missed));
  assert.deepEqual((await search(base, { targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', objectiveGuard: { success: 1 }, gaParameters: small })).data, unreachable.data, 'a fixed seed repeats a guarded search');
}

// ---------------- `gateDamage` and `gateRoom`: one gate room's battle alone (Spec 9.1.3, 2-0) ----------------
{
  const fresh = createFreshGameState('ja', now);
  const targets = fresh.parties[0].characters.map((character) => ({ characterId: character.id, changeableComponents: { equipment: true } }));
  // `next` (the default) is the first closed Clear-Gate: a fresh party has not opened the 1st Elite gate.
  assert.deepEqual(parseGaSearchRequest(fresh, 0, { targets, objective: 'gateDamage' }).forecast, { gateRoom: { floorNumber: 1, roomInFloor: 4 }, startHp: null });
  assert.deepEqual(parseGaSearchRequest(fresh, 0, { targets, objective: 'gateDamage', gateRoom: 'boss' }).forecast!.gateRoom, { floorNumber: 6, roomInFloor: 4 });
  assert.deepEqual(parseGaSearchRequest(fresh, 0, { targets, objective: 'progress', objectiveGuard: { gateDamage: 0.5 }, gateRoom: '3f-4' }).forecast!.gateRoom, { floorNumber: 3, roomInFloor: 4 });
  rejects({ targets: equipmentTargets, objectiveGuard: { progress: 0.5 }, gateRoom: '1f-4' }, 'invalid_request:gateRoom.not_used');
  rejects({ targets: equipmentTargets, objective: 'gateDamage', gateRoom: '1f-3' }, 'invalid_request:gateRoom');
  rejects({ targets: equipmentTargets, objective: 'gateDamage', objectiveGuard: { gateDamage: 0.5 } }, 'invalid_request:objectiveGuard.gateDamage.same_as_objective');

  // An elite gate room: every gate open, the depth limit at that room, and only that room fought.
  const settings = { gateRoom: { floorNumber: 2, roomInFloor: 4 }, startHp: null };
  const prepared = prepareObjectiveState(fresh, 0, 'gateDamage', settings);
  assert.equal(prepared.parties[0].expeditionDepthLimit, '2f-4');
  const elite = await simulateExpeditionRuns(prepared, 0, 'mode.normal', 40, undefined, 0, 9, objectiveSimulationOptions('gateDamage', settings));
  assert.equal(elite.gateRoom?.reached, 40, 'every run fights the gate room');
  assert.deepEqual(elite.rooms.filter((room) => room.reached > 0).map((room) => room.room), [8], 'and nothing else');
  assert.equal(elite.Clear + elite.Return, elite.gateRoom!.kills, 'a won gate room ends the run as a success');
  const share = measureObjective('gateDamage', elite, 0);
  assert.ok(share.rate >= 0 && share.rate <= 1 && share.variance >= 0);
  assert.deepEqual(forecastScope(fresh, 0, 'gateDamage', settings), { from: '2f-4', to: '2f-4', rooms: 1, endsAt: 'gateRoom' });
  // The boss is the last gate: `boss` and `6f-4` name the same room, and `bossDamage` is no objective any more.
  assert.deepEqual(parseGaSearchRequest(fresh, 0, { targets, objective: 'gateDamage', gateRoom: '6f-4' }).forecast, parseGaSearchRequest(fresh, 0, { targets, objective: 'gateDamage', gateRoom: 'boss' }).forecast);
  rejects({ targets: equipmentTargets, objective: 'bossDamage' }, 'invalid_request:objective');
  rejects({ targets: equipmentTargets, objectiveGuard: { bossDamage: 0.5 } }, 'invalid_request:objectiveGuard.bossDamage.unknown_member');
  assert.equal(prepareObjectiveState(fresh, 0, 'gateDamage', BOSS).parties[0].expeditionDepthLimit, 'all');

  // A search on a gate room reports it, has no route `progress`, and cross-checks `success`; a guard on it is measured alone.
  const searched = (await search(fresh, { targets, objective: 'gateDamage', gateRoom: '2f-4', gaParameters: small })).data as { gateRoom: string; startHp: string; forecast: { scope: unknown }; verification: { before: number; runs: number; progress: unknown; crossCheck: { objective: string } } };
  assert.deepEqual([searched.gateRoom, searched.startHp, searched.verification.progress, searched.verification.crossCheck.objective], ['2f-4', 'full', null, 'success']);
  assert.deepEqual(searched.forecast.scope, { from: '2f-4', to: '2f-4', rooms: 1, endsAt: 'gateRoom' });
  const verifyBefore = await simulateExpeditionRuns(prepared, 0, 'mode.normal', searched.verification.runs, undefined, 0, deriveSeed(small.seed, 3), objectiveSimulationOptions('gateDamage', settings));
  assert.equal(searched.verification.before, measureObjective('gateDamage', verifyBefore, 0).rate);
  const guarded = (await search(fresh, { targets, objective: 'progress', objectiveGuard: { gateDamage: 0.5 }, gateRoom: '2f-4', gaParameters: small })).data as { gateRoom: string; verification: { crossCheck: { objective: string; minimum: number; before: number } } };
  const guardBefore = await measureSecondObjective(dependencies(), fresh, 0, 'gateDamage', small.verifyRuns, deriveSeed(small.seed, 3), settings);
  assert.deepEqual([guarded.gateRoom, guarded.verification.crossCheck.objective, guarded.verification.crossCheck.minimum], ['2f-4', 'gateDamage', 0.5]);
  assert.equal(guarded.verification.crossCheck.before, Math.round(guardBefore.rate * 1e4) / 1e4);
  // `directedBuild` takes the same members.
  assert.deepEqual(parseDirectedBuildRequest(fresh, 0, { direction: 'free', targets: [{ characterId: ids[0] }], objective: 'gateDamage', gateRoom: '4f-4', startHp: 0.4 }).forecast, { gateRoom: { floorNumber: 4, roomInFloor: 4 }, startHp: 0.4 });
}

// ---------------- `startHp`: a room-only forecast from part of the party's HP (Spec 9.1.3, 2-0) ----------------
{
  const fresh = createFreshGameState('ja', now);
  const targets = fresh.parties[0].characters.map((character) => ({ characterId: character.id, changeableComponents: { equipment: true } }));
  rejects({ targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', startHp: 0 }, 'invalid_request:startHp');
  rejects({ targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', startHp: 1.2 }, 'invalid_request:startHp');
  rejects({ targets: equipmentTargets, objective: 'gateDamage', gateRoom: 'boss', startHp: 'half' }, 'invalid_request:startHp');
  // Route objectives start from full HP; only `gateDamage` (as objective, guard, or the default cross-check) uses it.
  rejects({ targets: equipmentTargets, objectiveGuard: { progress: 0.5 }, startHp: 0.5 }, 'invalid_request:startHp.not_used');
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets, objectiveGuard: { progress: 0.5 }, startHp: 'full' }).forecast!.startHp, null, '`full` is never an error');
  assert.equal(parseGaSearchRequest(fresh, 0, { targets, objective: 'gateDamage', gateRoom: 'boss', startHp: 'full' }).forecast!.startHp, null);
  assert.equal(parseGaSearchRequest(fresh, 0, { targets, objective: 'gateDamage', gateRoom: 'boss', startHp: 1 }).forecast!.startHp, null);
  const prepared = prepareObjectiveState(fresh, 0, 'gateDamage', BOSS);
  const low = await simulateExpeditionRuns(prepared, 0, 'mode.normal', 30, undefined, 0, 9, bossOptions(0.3));
  const full = await simulateExpeditionRuns(prepared, 0, 'mode.normal', 30, undefined, 0, 9, bossOptions());
  const maximumHp = full.maximumPartyHp!;
  assert.equal(low.maximumPartyHp, maximumHp);
  assert.equal(full.rooms[23].hpAtEntrySum, 30 * maximumHp, 'the boss room starts at full HP by default');
  assert.equal(low.rooms[23].hpAtEntrySum, 30 * Math.floor(maximumHp * 0.3), 'and at 30% of it with startHp 0.3');
  // A search measures the room-only objective (and reports) from that HP.
  const searched = (await search(fresh, { targets, objective: 'gateDamage', gateRoom: 'boss', startHp: 0.3, gaParameters: small })).data as { startHp: number; verification: { before: number; runs: number } };
  assert.equal(searched.startHp, 0.3);
  const verifyBefore = await simulateExpeditionRuns(prepared, 0, 'mode.normal', searched.verification.runs, undefined, 0, deriveSeed(small.seed, 3), bossOptions(0.3));
  assert.equal(searched.verification.before, measureObjective('gateDamage', verifyBefore, 0).rate);

  // `simulationRun`: `startHp` sets the start of every run (route or room); the rooms report the party HP at their start
  // and after a won battle, in % of `maximumPartyHp`, with the exact sums behind them.
  const read = (parameters: Record<string, unknown>) => buildApiV1ReadData('read/expedition/1/simulationRun', fresh, parameters, {
    revision: 1, environment: 'desktop', gameMode: 'mode.normal', enemyLevelOffset: 0, inGameTime: now, createSeed: () => 77,
    simulation: (partyIndex, count, forecast) => simulateExpeditionRuns(forecast?.state ?? fresh, partyIndex, 'mode.normal', count, undefined, 0, forecast?.seed, forecast?.options),
  }) as Promise<Record<string, unknown>>;
  type Rooms = { columns: string[]; rows: (string | number | null)[][] };
  const column = (rooms: Rooms, name: string) => rooms.columns.indexOf(name);
  const half = await read({ numberOfRun: 20, startHp: 0.5, seed: 4 });
  const halfRooms = half.rooms as Rooms;
  assert.deepEqual([half.startHp, half.maximumPartyHp], [0.5, maximumHp]);
  const first = halfRooms.rows[0];
  assert.equal(first[column(halfRooms, 'hpAtEntrySum')], 20 * Math.floor(maximumHp * 0.5));
  assert.equal(first[column(halfRooms, 'hpAtEntry')], Math.round(Math.floor(maximumHp * 0.5) / maximumHp * 1000) / 10);
  // `detail` ends with the same two averages.
  assert.match(String((half.detail as string[])[0]), new RegExp(`^1f-1/Success .* / Not reached 0\\.0% / HP at entry ${first[column(halfRooms, 'hpAtEntry')]!.toFixed(1)}% / HP after win ([0-9.]+%|-)$`));
  const rested = await read({ numberOfRun: 20, seed: 4 });
  assert.equal((rested.rooms as Rooms).rows[0][column(rested.rooms as Rooms, 'hpAtEntry')], 100, 'a run starts at full HP by default');
  assert.equal(rested.startHp, 'full');
  const gate = await read({ numberOfRun: 20, objective: 'gateDamage', gateRoom: '1f-4', seed: 4 });
  assert.equal(gate.gateRoom, '1f-4');
  assert.ok(typeof gate.rate === 'number' && gate.rate >= 0 && gate.rate <= 1);
  assert.deepEqual((gate.rooms as Rooms).rows.map((row) => row[0]), ['1f-4']);
  await assert.rejects(read({ gateRoom: '1f-4' }), /invalid_request:gateRoom\.not_used/);
  await assert.rejects(read({ startHp: 0 }), /invalid_request:startHp/);
}

// ---------------- Rare successes: the verdict is judged on `progress` (Spec 9.1.3, 2-3-2 `verdict`) ----------------
{
  const result = await simulateExpeditionRuns(base, 0, 'mode.normal', 100, undefined, 0, 3);
  const at = (rate: number, progress: number) => ({ ...measure('success', result, 3), rate, variance: rate * (1 - rate), progress: { rate: progress, variance: 0.01 } });
  const input = {
    objective: 'success' as const, guard: null, crossObjective: 'gateDamage' as const, verifyRuns: 500, seed: 1, verifySeed: 2, routeRooms: 3,
    before: at(0.004, 0.4), after: at(0.002, 0.6), crossBefore: { rate: 0.5, variance: 0.1 }, crossAfter: { rate: 0.5, variance: 0.1 }, changed: true,
    revision: 1, scope: forecastScope(base, 0, 'success'), label: 'check',
  };
  // 0.4% vs 0.2% of 500 runs is noise; 20 points of `progress` is not.
  const rare = summarizeVerification(input);
  assert.deepEqual([rare.verdict, (rare.verification as { scoredBy: string }).scoredBy], ['veryGood', 'progress']);
  // Not rare: judged on `success`, which barely moved.
  const common = summarizeVerification({ ...input, before: at(0.3, 0.4), after: at(0.31, 0.6) });
  assert.deepEqual([common.verdict, (common.verification as { scoredBy: string }).scoredBy], ['noisy', 'success']);
  // Rare, but a result that loses successes by more than 2 standard errors is `worse`, whatever its progress.
  assert.equal(summarizeVerification({ ...input, before: at(0.035, 0.4), after: at(0, 0.6) }).verdict, 'worse');
}

// ---------------- `stallGenerations` and `lastImprovementGeneration` (Spec 9.1.3, 2-3-2) ----------------
{
  rejects({ targets: equipmentTargets, gaParameters: { stallGenerations: 0 } }, 'invalid_request:gaParameters.stallGenerations');
  rejects({ targets: equipmentTargets, gaParameters: { stallGenerations: 201 } }, 'invalid_request:gaParameters.stallGenerations');
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets }).parameters.stallGenerations, null, 'off by default');
  const improved = outcome.data.lastImprovementGeneration as number;
  assert.ok(improved >= 1 && improved <= (outcome.data.generationsRun as number), `lastImprovementGeneration ${improved}`);
  const stalled = (await search(base, { targets: equipmentTargets, gaParameters: { ...small, generations: 40, stallGenerations: 2 } })).data;
  assert.equal(stalled.stopReason, 'stalled');
  assert.equal((stalled.generationsRun as number) - (stalled.lastImprovementGeneration as number), 2, 'stopped two generations after the last change');
  assert.ok((stalled.generationsRun as number) < 40);
}

// ---------------- `levelProbe.fill: search` (Spec 9.1.3, 2-3-2) ----------------
{
  rejects({ targets: equipmentTargets, levelProbe: { fill: 'smart' } }, 'invalid_request:levelProbe.fill');
  type Probe = { fill: string; points: { level: number; filledSlots: number; rate: number }[] };
  const raw = { targets: equipmentTargets, gaParameters: small, levelProbe: { mode: 'always', fill: 'search' } };
  const probed = (await search(base, raw)).data.levelProbe as Probe;
  assert.equal(probed.fill, 'search');
  assert.ok(probed.points.length >= 2, 'the current level and at least one probed level');
  assert.ok(probed.points.slice(1).every((entry) => entry.level > probed.points[0].level && entry.rate >= 0 && entry.rate <= 100));
  assert.deepEqual((await search(base, raw)).data.levelProbe, probed, 'a fixed seed repeats the searched probe');
  assert.equal(((await search(base, { ...raw, levelProbe: { mode: 'always' } })).data.levelProbe as Probe).fill, 'greedy');
}

// ---------------- `uniqueCharacter`: gaSearch may pick unique characters (Spec 9.1.3, 2-3-2) ----------------
{
  // A fresh first party holds both party-1 unique characters; release the second one so it is free to pick.
  const holders = base.parties[0].characters.filter((character) => character.isUnique);
  const freed = applyApiV1Commit(`commit/build/character/${holders[1].id}/changeBuild`, base, { uniqueSelection: 'none', simulation: false }, context()).state;
  const party = freed.parties[0];
  const unique = party.characters.find((character) => character.isUnique)!;
  const [first] = party.characters.filter((character) => !character.isUnique);
  const free = validUniqueSelections(freed, first).filter((value) => value !== 'none');
  assert.deepEqual(free, [holders[1].uniqueCharacterId], 'only the released unique character is free');
  rejects({ targets: [{ characterId: first.id, changeableComponents: { uniqueCharacter: 'yes' } }] }, 'invalid_request:targets.changeableComponents.uniqueCharacter');
  // Off by default; with it, a unique character's identity components are kept as requested (they apply once it is released).
  assert.equal(parseGaSearchRequest(freed, 0, { targets: [{ characterId: first.id }] }).targets[0].components.uniqueCharacter, false);
  const released = parseGaSearchRequest(freed, 0, { targets: [{ characterId: unique.id, changeableComponents: { uniqueCharacter: true, raceGender: true } }] }).targets[0].components;
  assert.deepEqual([released.uniqueCharacter, released.raceGender], [true, true]);

  // Seeds: a unique selection is used, the identity values it fixes are not; a unique another character holds is refused.
  const targets = [{ characterId: first.id, changeableComponents: { uniqueCharacter: true, raceGender: true, mainClass: true, equipment: true } }];
  const seedBuilds = [
    { label: 'free', characters: [{ characterId: first.id, uniqueSelection: free[0], racesAndGender: `${first.raceId}/${first.gender}` }] },
    { label: 'taken', characters: [{ characterId: first.id, uniqueSelection: unique.uniqueCharacterId! }] },
  ];
  const seeded = (await search(freed, { targets, seedBuilds, gaParameters: { ...small, seedWithHeuristics: false } })).data;
  const seeds = seeded.seeds as { status: string; ignored: { field: string; reason: string }[]; quickRate: number | null }[];
  assert.deepEqual([seeds[0].status, seeds[0].ignored], ['used', [{ field: 'characters[0].racesAndGender', reason: 'notAllowed' }]]);
  assert.ok(seeds[0].quickRate !== null);
  assert.deepEqual([seeds[1].status, seeds[1].ignored], ['ignored', [{ field: 'characters[0].uniqueSelection', reason: 'notAllowed' }]]);

  // A search that picks a unique character: its `changeSummary` is accepted by `applyBuildChanges`, and the character
  // becomes that unique character with the identity it fixes.
  let picked: GaSearchOutcome | null = null;
  for (let seed = 1; seed <= 12 && !picked; seed += 1) {
    const result = await search(freed, { targets, gaParameters: { ...small, seed, generations: 4 } });
    const entries = result.data.changeSummary as GaChangeEntry[];
    if (entries.some((entry) => entry.parameters.uniqueSelection !== undefined && entry.parameters.uniqueSelection !== 'none')) picked = result;
  }
  assert.ok(picked, 'some seed picks a unique character');
  const entry = (picked!.data.changeSummary as GaChangeEntry[]).find((change) => change.parameters.uniqueSelection !== undefined)!;
  assert.equal(entry.endpoint, `commit/build/character/${first.id}/changeBuild`);
  assert.equal(entry.parameters.racesAndGender, undefined, 'a new unique selection sends no identity value');
  const applied = applyApiV1Commit(path, freed, { changes: picked!.data.changeSummary, basis: picked!.data.basis, verdict: picked!.data.verdict, simulation: false, confirmation: 'yes', autoEquipmentMode: 'OFF' }, context());
  const after = applied.state.parties[0].characters.find((character) => character.id === first.id)!;
  assert.deepEqual([after.isUnique, after.uniqueCharacterId], [true, entry.parameters.uniqueSelection]);
}

console.log('gaSearch profile ok');
