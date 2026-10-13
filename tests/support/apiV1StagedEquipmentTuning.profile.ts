import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createFreshGameState, gameReducer, simulateExpeditionRuns } from '../../src/hooks/useGameState';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { deriveSeed, type GaSearchDependencies, type StoredBuildResult } from '../../src/api/v1/gaSearch';
import { measureObjective, prepareObjectiveState } from '../../src/api/v1/objectiveMeasure';
import { buildSimulationRunData } from '../../src/api/v1/simulationView';
import { bottleneckCounterRows, counterItemSources, countersBottleneck, parseStagedTuningRequest, runStagedEquipmentTuning, tuningImprovement, tuningLuckCheck } from '../../src/api/v1/stagedEquipmentTuning';
import { getDungeonById } from '../../src/data/dungeons';
import { hydrateGameState } from '../../src/game/saveCodec';
import { decodePersistedState } from '../../src/game/storageCompression';
import type { GameState } from '../../src/types';

// SpecRef: 7.1.5 | Staged Equipment Tuning
// SpecRef: 9.1.3 | Read | 2-3-7 character/stagedEquipmentTuning
// SpecRef: 9.1.4.9 | Operation-specific completion rules | stagedEquipmentTuning

const now = Date.parse('2026-01-01T00:00:00.000Z');
const seed = 5;

function dependencies(): GaSearchDependencies {
  return {
    simulate: (target, index, count, simulationSeed, options) => simulateExpeditionRuns(target, index, 'mode.normal', count, undefined, 0, simulationSeed, options),
    now: () => now, createSeed: () => seed, createOpaqueId: () => 'tuning-result-1', revision: 3,
    commitContext: { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, applyAutoEquipment: (s) => s, now: () => now },
  };
}
const tune = (state: GameState, raw: Record<string, unknown>) => runStagedEquipmentTuning(state, parseStagedTuningRequest(state, raw), dependencies());
interface TuningData {
  accepted: boolean; scoredBy: string; before: string; after: string; improvement: number; gain: number; standardError: number; bottleneckRoom: string | null;
  destination: number; level: number;
  bottleneckCounters: { ability: string; answers: string[]; status: string; freeGain: number | null; freeStandardError: number | null; sources: ReturnType<typeof counterItemSources> }[];
  candidatesTried: Record<'offenseElement' | 'defenseElement' | 'ability', number>;
  triedCandidates: Record<'offenseElement' | 'defenseElement' | 'ability', { improvement: number; changes: string[]; recorded: boolean; element?: string; resistance?: string[]; abilities?: string[] }[]>;
  steps: Record<'offenseElement' | 'defenseElement' | 'ability', { improvement: number; changes: string[]; element?: string }[]> & { finalTuning: { step: string; index: number; improvement: number; changes: string[] }[] };
  changeSummary: { endpoint: string; parameters: Record<string, unknown> }[]; simulationRuns: number; seed: number; buildResultId?: string;
}
type Equipment = GameState['parties'][number]['characters'][number]['equipment'];
const jewelOf = (item: Equipment[number]) => (item?.jewel ? `${item.jewel.key}:${item.jewel.rank}` : null);
/** No character may hold two Jewels of one type and rank (7.1.2.2 step 8-2). */
const assertDistinctJewels = (equipment: Equipment, label: string) => {
  const jewels = equipment.map(jewelOf).filter((jewel): jewel is string => jewel !== null);
  assert.equal(new Set(jewels).size, jewels.length, `${label}: a Jewel type and rank appears twice in ${JSON.stringify(jewels)}`);
};
const characterIn = (state: GameState, characterId: number) => state.parties.flatMap((party) => party.characters).find((character) => character.id === characterId)!;
function commitContext(stored: StoredBuildResult | null, history: ApiV1CommitContext['equipmentHistory'] = {}): ApiV1CommitContext {
  return {
    simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: history, uploadedFiles: {}, canonicalFiles: {},
    applyAutoEquipment: (s) => s, createDeliveryId: () => 'd', now: () => now, buildResult: () => stored ?? undefined,
  };
}

// ---------------- Request validation (Spec 9.1.3, 2-3-7) ----------------

const fresh = createFreshGameState('ja', now);
const firstId = fresh.parties[0].characters[0].id;
function rejects(raw: Record<string, unknown>, marker: string): void {
  let message = '';
  try { parseStagedTuningRequest(fresh, raw); } catch (error) { message = String(error); }
  assert.ok(message.includes(marker), `${JSON.stringify(raw)} expected ${marker}, got ${message}`);
}
rejects({}, 'invalid_request:characterId');
rejects({ characterId: 'one' }, 'invalid_request:characterId');
rejects({ characterId: 999999 }, 'not_found');
rejects({ characterId: firstId, baselineRuns: 500 }, 'invalid_request:baselineRuns');
rejects({ characterId: firstId, quickRuns: 5 }, 'invalid_request:quickRuns');
rejects({ characterId: firstId, finalTuningRuns: 2000 }, 'invalid_request:finalTuningRuns');
rejects({ characterId: firstId, offenseElementTrialRuns: 11 }, 'invalid_request:offenseElementTrialRuns');
rejects({ characterId: firstId, abilityCandidateCount: 0 }, 'invalid_request:abilityCandidateCount');
rejects({ characterId: firstId, minImprovement: -0.1 }, 'invalid_request:minImprovement');
rejects({ characterId: firstId, offenseElementRequest: 'e.wind' }, 'invalid_request:offenseElementRequest');
rejects({ characterId: firstId, objective: 'experience' }, 'invalid_request:objective');
rejects({ characterId: firstId, seed: 1.5 }, 'invalid_request:seed');
rejects({ characterId: firstId, seed: '7' }, 'invalid_request:seed');
{
  const parsed = parseStagedTuningRequest(fresh, { characterId: firstId, baselineRuns: 1000 });
  assert.deepEqual(
    { ...parsed },
    {
      characterId: firstId, partyIndex: 0, objective: 'success', offenseElementRequest: null, seed: null,
      quickRuns: 300, finalTuningRuns: 500, offenseElementTrialRuns: 3, offenseElementCandidateCount: 2, defenseElementTrialRuns: 5,
      defenseElementCandidateCount: 2, abilityTrialRuns: 20, abilityCandidateCount: 2, minImprovement: 0.07, minGateImprovement: 0.07,
    },
    'the 9.1.3 defaults',
  );
  assert.equal(parseStagedTuningRequest(fresh, { characterId: firstId, offenseElementRequest: 'e.none' }).offenseElementRequest, 'none');
  assert.equal(parseStagedTuningRequest(fresh, { characterId: firstId, seed: -42 }).seed, -42);
}

// ---------------- Improvement and the luck check (Spec 7.1.5 General rules) ----------------

// The relative change on the rarer side: the rise of the good outcome or the fall of the bad one, whichever is larger.
const near = (actual: number, expected: number, label: string) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: ${actual} != ${expected}`);
// 7.1.5.1 Counter ability map
assert.ok(countersBottleneck('illusion_breaker', new Set(['illusion']), null), 'a breaker counters its enemy ability');
assert.ok(countersBottleneck('thunder_protect_breaker', new Set(['thunder_absorb']), null), 'a protect breaker covers absorb');
assert.ok(countersBottleneck('null_bind', new Set(['bind']), null), 'the null family counters its enemy ability');
assert.ok(!countersBottleneck('illusion_breaker', new Set(['bulwark']), null), 'no counter without the enemy ability');
assert.ok(countersBottleneck('true_sight', new Set(), 'terrain.fog'), 'a terrain counter applies on its terrain');
assert.ok(!countersBottleneck('true_sight', new Set(), 'terrain.tailwind'), 'a terrain counter does not apply elsewhere');
assert.ok(countersBottleneck('domain_breaker', new Set(), 'terrain.silence-field'), 'domain-breaker counters the silence field');
assert.ok(countersBottleneck('output_stabilizer', new Set(), 'terrain.gravity'), 'output-stabilizer counters a penalty terrain');
assert.ok(!countersBottleneck('output_stabilizer', new Set(), 'terrain.low-gravity'), 'output-stabilizer is no counter on a bonus terrain');
assert.ok(!countersBottleneck('true_sight', new Set(), null), 'no terrain, no terrain counter');
assert.deepEqual(
  bottleneckCounterRows(new Set(['oblivion', 'fire_absorb', 'illusion', 'bulwark_breaker']), 'terrain.deletion'),
  [
    { ability: 'illusion_breaker', answers: ['a.illusion'] },
    { ability: 'fire_protect_breaker', answers: ['a.fire-absorb'] },
    { ability: 'unforgettable', answers: ['a.oblivion', 'terrain.deletion'] },
  ],
  'the counters of a room in map order, one row per counter with everything it answers there',
);
assert.deepEqual(bottleneckCounterRows(new Set(), 'terrain.rotwood'), [], 'rotwood has no counter');
near(tuningImprovement('success', 0.1, 0.12), 0.2, 'near 0 the success side decides (7.1.5 example)');
near(tuningImprovement('success', 0.93, 0.95), 0.4, 'near 1 the failure side decides (7.1.5 example)');
assert.ok(tuningImprovement('success', 0.95, 0.97) >= 0.07, 'a 7% threshold can be met above 93.5%');
near(tuningImprovement('success', 0.5, 0.535), 0.5 / 0.465 - 1, 'the larger of the two ratios');
near(tuningImprovement('progress', 0.8, 0.84), 0.2 / 0.16 - 1, '`progress` is scored like `success`');
near(tuningImprovement('bossDamage', 0.4, 0.3), 0.6 / 0.7 - 1, 'a worse score is a negative improvement');
assert.ok(tuningImprovement('success', 0.6, 0.5) < 0 && tuningImprovement('minDefeat', 0.1, 0.2) < 0, 'worse on both sides is negative');
near(tuningImprovement('minDefeat', 0.2, 0.1), 1, 'a lower defeat rate is an improvement');
near(tuningImprovement('minDefeat', 0.9, 0.85), 0.15 / 0.1 - 1, 'near 1 the non-defeat side decides for `minDefeat`');
near(tuningImprovement('success', 0, 0.01), 9, 'a zero denominator counts as 0.001');
near(tuningImprovement('minDefeat', 0.1, 0), 99, 'a zero denominator counts as 0.001');
assert.equal(tuningImprovement('success', 0, 0), 0, 'two zero scores are no change');
assert.equal(tuningImprovement('success', 1, 1), 0, 'equal scores are no change');
{
  const binary = (rate: number) => ({ rate, variance: rate * (1 - rate) });
  const luck = tuningLuckCheck('success', binary(0.4), binary(0.5), 1000);
  assert.ok(Math.abs(luck.standardError - Math.sqrt(0.24 / 1000 + 0.25 / 1000)) < 1e-12);
  assert.ok(luck.passed);
  assert.equal(tuningLuckCheck('success', binary(0.4), binary(0.43), 1000).passed, false, 'three points on 1000 runs may be luck');
  assert.ok(Math.abs(tuningLuckCheck('minDefeat', binary(0.3), binary(0.2), 1000).gain - 0.1) < 1e-12, 'minDefeat gains when defeats fall');
  // A share's per-run variance is below the Bernoulli bound p(1 - p), so a real share gain is not mistaken for luck.
  const share = tuningLuckCheck('bossDamage', { rate: 0.42, variance: 0.04 }, { rate: 0.463, variance: 0.04 }, 1000);
  assert.ok(Math.abs(share.standardError - Math.sqrt(0.08 / 1000)) < 1e-12);
  assert.ok(share.passed && !tuningLuckCheck('bossDamage', binary(0.42), binary(0.463), 1000).passed);
}

// ---------------- Nothing to try ----------------
{
  // A fresh save has no elemental, resistant, or ability item: no step records a candidate and nothing is accepted.
  let state = gameReducer(fresh, { type: 'REMOVE_ALL_EQUIPMENT', partyIndex: 0, characterId: firstId });
  state = { ...state, parties: [{ ...state.parties[0], expeditionDepthLimit: '1f-4' }, ...state.parties.slice(1)] };
  const before = structuredClone(state);
  const outcome = await tune(state, { characterId: firstId });
  const data = outcome.data as unknown as TuningData;
  assert.equal(data.accepted, false);
  assert.equal(data.scoredBy, 'success', 'a build with successes is scored by its objective');
  assert.deepEqual(data.changeSummary, []);
  assert.equal(data.buildResultId, undefined);
  assert.equal(outcome.stored, null);
  assert.deepEqual([data.steps.offenseElement, data.steps.defenseElement, data.steps.ability, data.steps.finalTuning], [[], [], [], []]);
  assert.deepEqual(data.candidatesTried, { offenseElement: 0, defenseElement: 0, ability: 0 }, 'no step had anything to try');
  assert.ok(data.bottleneckCounters.every((counter) => counter.status !== 'tried'), 'nothing was tried');
  // Empty slots are not filled for their own sake. Step 5 keeps nothing, so there is no change: no Jewel-only result, and
  // step 6 is not simulated again (the tuned build is the current build).
  assert.equal(data.after, data.before);
  assert.deepEqual([data.improvement, data.gain], [0, 0]);
  assert.equal(data.simulationRuns, 1000 + 300, 'the baseline and the quick run of the current build');
  assert.match(String(data.bottleneckRoom), /^[1-6]f-[1-4]$/);
  assert.deepEqual(state, before, 'the tuning never changes the state it read');
  const off = (await tune(state, { characterId: firstId, offenseElementTrialRuns: 0, defenseElementTrialRuns: 0, abilityTrialRuns: 0 })).data as unknown as TuningData;
  assert.equal(off.simulationRuns, 1000, 'a step with 0 trials is skipped');
  // `seed`: the random one is returned, and sending it (or any seed) again repeats the tuning.
  assert.equal(data.seed, seed, 'the random seed chosen is returned');
  assert.deepEqual((await tune(state, { characterId: firstId, seed })).data, outcome.data, 'the returned seed repeats the tuning');
  const seeded = (await tune(state, { characterId: firstId, seed: 123 })).data as unknown as TuningData;
  assert.equal(seeded.seed, 123, 'a requested seed is echoed');
  assert.deepEqual((await tune(state, { characterId: firstId, seed: 123 })).data, seeded);
}

// ---------------- `success` at 0: the tuning scores `progress` (Spec 7.1.5 Score) ----------------
{
  // A fresh party sent to Expedition 8 with every gate open dies in its first rooms: every build ties at 0 successes.
  assert.ok(getDungeonById(8), 'Expedition 8 exists in the test environment');
  let state = gameReducer(fresh, { type: 'REMOVE_ALL_EQUIPMENT', partyIndex: 0, characterId: firstId });
  state = { ...state, parties: [{ ...state.parties[0], selectedDungeonId: 8, defeatedBossExpeditions: { 7: true } }, ...state.parties.slice(1)] };
  state = prepareObjectiveState(state, 0, 'bossDamage');
  const hopeless = (await tune(state, { characterId: firstId, seed: 21 })).data as unknown as TuningData;
  assert.match(hopeless.before, /^Success 0\.0% /);
  assert.equal(hopeless.scoredBy, 'progress');
  const success = (await tune(state, { characterId: firstId, seed: 21, objective: 'minDefeat' })).data as unknown as TuningData;
  assert.equal(success.scoredBy, 'minDefeat', 'only `success` falls back to `progress`');
}

// ---------------- A real, heavy save ----------------
// Party 3 of the sample save fights Expedition 6 with a 17% success rate; tuning its ninja finds a much better build.
const savePath = path.resolve('sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz');
const envelope = JSON.parse(fs.readFileSync(savePath, 'utf8')) as { saveDataCompressed: string };
const sample = hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
(sample.global as { savedEquipmentSets?: unknown[] }).savedEquipmentSets ??= [];
const partyIndex = 2;
const ninja = sample.parties[partyIndex].characters.find((character) => character.mainClassId === 'ninja')!;
// A locked item keeps its slot and Jewel.
const lockedSlot = ninja.equipment.findIndex(Boolean);
const locked: GameState = structuredClone(sample);
locked.parties[partyIndex].characters.find((character) => character.id === ninja.id)!.equipment[lockedSlot]!.isLocked = true;
const lockedItem = structuredClone(locked.parties[partyIndex].characters.find((character) => character.id === ninja.id)!.equipment[lockedSlot]!);

const outcome = await tune(locked, { characterId: ninja.id });
const data = outcome.data as unknown as TuningData;
{
  assert.equal(data.accepted, true, JSON.stringify({ before: data.before, after: data.after, improvement: data.improvement, gain: data.gain }));
  assert.ok(data.improvement >= 0.07 && data.gain > 2 * data.standardError, 'the final check: the gate improvement and more than luck');
  assert.equal(data.buildResultId, 'tuning-result-1');
  assert.equal(outcome.stored?.source, 'stagedEquipmentTuning');
  assert.equal(outcome.stored?.verdict, null, 'a tuning result has no gaSearch verdict');
  // Each step records at most max(2, floor(trials / 5)) qualifying candidates, best first.
  for (const [step, trials] of [['offenseElement', 3], ['defenseElement', 5], ['ability', 20]] as const) {
    const recorded = data.steps[step];
    assert.ok(recorded.length <= Math.max(2, Math.floor(trials / 5)), `${step} records too many`);
    assert.ok(recorded.every((candidate, index) => candidate.improvement >= 0.07 && (index === 0 || recorded[index - 1].improvement >= candidate.improvement)), `${step} order`);
  }
  assert.ok(data.steps.finalTuning.length > 0 && data.steps.finalTuning.every((entry) => entry.index >= 0 && entry.changes.length > 0));
  assert.equal(data.scoredBy, 'success');
  assert.ok(data.steps.finalTuning.filter((entry) => entry.step === 'offenseElement').length <= 1 && data.steps.finalTuning.filter((entry) => entry.step === 'defenseElement').length <= 1);
  // Only the tuned character changes, with items from the Inventory or its own equipment, and its locked slot is untouched.
  const inventory = new Set(Object.values(locked.global.inventory).filter((entry) => entry.status === 'owned' && entry.count > 0).map((entry) => `${entry.item.id}/${entry.item.enhancement}/${entry.item.superRare}`));
  const own = new Set(ninja.equipment.filter(Boolean).map((item) => `${item!.id}/${item!.enhancement}/${item!.superRare}`));
  for (const entry of data.changeSummary) {
    assert.ok(entry.endpoint.startsWith(`commit/build/character/${ninja.id}/`), entry.endpoint);
    const slots = [entry.parameters.targetEquipment, entry.parameters.targetSlot].flat().filter((value) => typeof value === 'number');
    if (!entry.endpoint.endsWith('/equip')) assert.ok(!slots.includes(lockedSlot), `${entry.endpoint} touches the locked slot`);
    if (!entry.endpoint.endsWith('/equip')) continue;
    assert.notEqual(entry.parameters.targetSlot, lockedSlot);
    const key = String(entry.parameters.targetEquipment).split('/').slice(1).join('/');
    assert.ok(inventory.has(key) || own.has(key), `${key} is neither in the Inventory nor the ninja's own`);
  }
}
{
  // `applyBuildResult` applies a tuning result without confirmation, as one Undo step, and the applied build is exactly the
  // one the final check measured.
  const history: ApiV1CommitContext['equipmentHistory'] = {};
  const path = `commit/build/party/${locked.parties[partyIndex].id}/applyBuildResult`;
  const preview = applyApiV1Commit(path, locked, { buildResultId: data.buildResultId, simulation: true }, commitContext(outcome.stored, history));
  assert.deepEqual([preview.data.confirmationRequired, preview.data.warnings, preview.data.verdict], [false, [], null]);
  const result = applyApiV1Commit(path, locked, { buildResultId: data.buildResultId, simulation: false }, commitContext(outcome.stored, history));
  assert.equal(result.data.confirmationRequired, false);
  const applied = result.state;
  assert.equal(history[String(ninja.id)].undo.length, 1);
  const after = characterIn(applied, ninja.id);
  assert.deepEqual({ ...after.equipment[lockedSlot], isNew: undefined }, { ...lockedItem, isNew: undefined }, 'the locked item and its Jewel stay');
  // Only the slots whose item changed get a Jewel; every other slot keeps its item and Jewel.
  const changedSlots = new Set(data.steps.finalTuning.flatMap((entry) => entry.changes.map((change) => Number(change.split('=')[0]))));
  characterIn(locked, ninja.id).equipment.forEach((item, slot) => {
    if (!changedSlots.has(slot)) assert.deepEqual({ ...after.equipment[slot], isNew: undefined }, { ...item, isNew: undefined }, `slot ${slot} is unchanged`);
  });
  assertDistinctJewels(characterIn(locked, ninja.id).equipment, 'the ninja before');
  assertDistinctJewels(after.equipment, 'the tuned ninja');
  const forecast = await simulateExpeditionRuns(applied, partyIndex, 'mode.normal', 1000, undefined, 0, deriveSeed(seed, 3));
  assert.equal(buildSimulationRunData(forecast, 0, 'check').overview, data.after);
  // `finalTuning` improvements are cumulative over the current build on the step 5 seed: the last one is the tuned build's.
  const successOn = async (target: GameState) => {
    const result = await simulateExpeditionRuns(target, partyIndex, 'mode.normal', 500, undefined, 0, deriveSeed(seed, 2));
    return (result.Clear + result.Return) / result.total;
  };
  const last = data.steps.finalTuning[data.steps.finalTuning.length - 1];
  assert.equal(last.improvement, Math.round(tuningImprovement('success', await successOn(locked), await successOn(applied)) * 1e4) / 1e4);
  assert.ok(last.improvement > 0);
  // The old operation name is gone, not an alias.
  assert.throws(() => applyApiV1Commit(`commit/build/party/${locked.parties[partyIndex].id}/applyGaResult`, locked, { gaResultId: data.buildResultId, simulation: true }, commitContext(outcome.stored)), /invalid_request/);
}
{
  // `offenseElementRequest` tries only the requested element, and one `seed` repeats the item draws exactly.
  const request = { characterId: ninja.id, offenseElementRequest: 'e.fire', defenseElementTrialRuns: 0, abilityTrialRuns: 0, minImprovement: 0, seed: 11 };
  const fire = (await tune(sample, request)).data as unknown as TuningData;
  assert.ok(fire.steps.offenseElement.length > 0 && fire.steps.offenseElement.every((candidate) => candidate.element === 'e.fire'));
  assert.deepEqual([fire.steps.defenseElement, fire.steps.ability], [[], []]);
  assert.equal(fire.seed, 11);
  assert.deepEqual((await tune(sample, request)).data, fire, 'the same seed on the same save repeats the result');
}

// ---------------- `bossDamage`: the boss battle alone (Spec 7.1.5 objective) ----------------
{
  const boss = (await tune(sample, { characterId: ninja.id, objective: 'bossDamage', offenseElementTrialRuns: 1, defenseElementTrialRuns: 0, abilityTrialRuns: 0, seed: 3 })).data as unknown as TuningData;
  assert.equal(boss.scoredBy, 'bossDamage');
  assert.equal(boss.bottleneckRoom, '6f-4', 'the bottleneck is always the boss room');
  // The forecast is the boss battle from full HP: every run reaches it, so nothing is left unreached or retreated from.
  const forecast = await simulateExpeditionRuns(sample, partyIndex, 'mode.normal', 1000, undefined, 0, deriveSeed(3, 3), { bossRoomOnly: true });
  assert.equal(buildSimulationRunData(forecast, 0, 'check').overview, boss.before);
  assert.equal(forecast.boss?.reached, 1000);
  assert.deepEqual(forecast.rooms.filter((room) => room.reached > 0).map((room) => room.room), [24], 'only the boss room is fought');
}

// ---------------- Counters of the bottleneck room (Spec 7.1.5.1; 9.1.4.9 `bottleneckCounters`) ----------------
// The Expedition 6 boss room of party 3 has an `a.illusion` enemy on a `terrain.echo-domain` floor. The Inventory holds an
// `a.illusion-breaker` item but no `a.domain-breaker` one.
{
  const guardian = sample.parties[partyIndex].characters.find((character) => character.mainClassId === 'guardian')!;
  const request = { characterId: guardian.id, objective: 'bossDamage', offenseElementTrialRuns: 0, defenseElementTrialRuns: 0, quickRuns: 50, finalTuningRuns: 50, seed: 3 };
  const counters = (data: TuningData) => Object.fromEntries(data.bottleneckCounters.map((counter) => [counter.ability, `${counter.status} ${counter.answers.join(',')}`]));
  const tuned = (await tune(sample, request)).data as unknown as TuningData;
  assert.equal(tuned.bottleneckRoom, '6f-4');
  assert.deepEqual(counters(tuned), { 'a.illusion-breaker': 'tried a.illusion', 'a.domain-breaker': 'noItem terrain.echo-domain' });
  // `sources`: the revealed items granting each counter, with the encountered enemies that drop them and their rooms. The
  // save has met the Expedition 6 floor 2 elite that drops 鉄礫 (6309); 境断 (8406, `a.domain-breaker`) is not revealed.
  const sourcesOf = (data: TuningData) => Object.fromEntries(data.bottleneckCounters.map((counter) => [counter.ability, counter.sources]));
  assert.deepEqual(sourcesOf(tuned), {
    'a.illusion-breaker': [{ itemId: 6309, tier: 6, itemRarity: 'rare', droppedBy: [{ expedition: 6, enemyId: 291, rooms: ['2f-4'] }] }],
    'a.domain-breaker': [],
  });
  // Nothing undisclosed (9.1.4.7): an enemy never encountered is not named, and an unrevealed item is not listed.
  const unmet: GameState = structuredClone(sample);
  unmet.global.enemyBattleStats = { ...unmet.global.enemyBattleStats, 291: { defeats: 0, encounters: 0 } };
  assert.deepEqual(counterItemSources(unmet, 'illusion_breaker', { allItems: false, allEnemies: false }), [{ itemId: 6309, tier: 6, itemRarity: 'rare', droppedBy: [] }]);
  const unrevealed: GameState = structuredClone(sample);
  unrevealed.global.revealedItemCompendiumItemIds = unrevealed.global.revealedItemCompendiumItemIds.filter((id) => id !== 6309);
  assert.deepEqual(counterItemSources(unrevealed, 'illusion_breaker', { allItems: false, allEnemies: false }), []);
  // The Debug "Display all" settings disclose everything: 8406 is listed, and no enemy drops it.
  assert.deepEqual(counterItemSources(sample, 'domain_breaker', { allItems: true, allEnemies: true }), [{ itemId: 8406, tier: 8, itemRarity: 'epic', droppedBy: [] }]);
  // The record a scoreboard needs: where and at what level, every simulated candidate (recorded or not), and what each counter
  // is worth to the character for free, on the quick seed against the current build.
  assert.equal(tuned.destination, sample.parties[partyIndex].selectedDungeonId);
  assert.equal(tuned.level, sample.parties[partyIndex].level);
  for (const step of ['offenseElement', 'defenseElement', 'ability'] as const) {
    assert.equal(tuned.triedCandidates[step].length, tuned.candidatesTried[step], `${step}: one entry per simulated candidate`);
    const strip = ({ recorded: _recorded, ...entry }: TuningData['triedCandidates'][typeof step][number]) => entry;
    assert.deepEqual(tuned.triedCandidates[step].filter((entry) => entry.recorded).map(strip).sort((a, b) => b.improvement - a.improvement), tuned.steps[step]);
  }
  assert.ok(tuned.triedCandidates.ability.some((entry) => !entry.recorded), 'a candidate below the bar is still listed');
  {
    const domain = tuned.bottleneckCounters.find((counter) => counter.ability === 'a.domain-breaker')!;
    const quick = (target: GameState) => simulateExpeditionRuns(prepareObjectiveState(target, partyIndex, 'bossDamage'), partyIndex, 'mode.normal', 50, undefined, 0, deriveSeed(3, 1), { bossRoomOnly: true });
    const share = async (target: GameState) => measureObjective('bossDamage', await quick(target), 1);
    const granted: GameState = structuredClone(sample);
    const holder = granted.parties[partyIndex].characters.find((character) => character.id === guardian.id)!;
    const slot = holder.equipment.findIndex((item) => item !== null);
    holder.equipment[slot] = { ...holder.equipment[slot]!, bonuses: [...(holder.equipment[slot]!.bonuses ?? []), { type: 'ability', value: 1, abilityId: 'domain_breaker', abilityLevel: 1 }] };
    const [before, after] = [await share(sample), await share(granted)];
    assert.equal(domain.freeGain, Math.round((after.rate - before.rate) * 1e4) / 1e4, 'freeGain is the free ability against the current build');
    assert.equal(domain.freeStandardError, Math.round(Math.sqrt(before.variance / 50 + after.variance / 50) * 1e4) / 1e4);
  }
  // Highest tier first: `a.requiem` has a tier-7 sword (7407) and a tier-7 arrow (7408, dropped by the Expedition 7 elite).
  const requiem = counterItemSources(sample, 'requiem', { allItems: true, allEnemies: true });
  assert.deepEqual(requiem.map((source) => source.itemId), [7407, 7408]);
  assert.ok(requiem[1].droppedBy.some((drop) => drop.expedition === 7 && drop.enemyId === 326), JSON.stringify(requiem[1].droppedBy));
  assert.ok(tuned.candidatesTried.ability > 0 && tuned.candidatesTried.ability >= tuned.steps.ability.length, 'every recorded candidate was tried');
  assert.deepEqual([tuned.candidatesTried.offenseElement, tuned.candidatesTried.defenseElement], [0, 0], 'a step with 0 trials tries nothing');
  // With step 4 off, an item that grants the counter is left untried.
  const skipped = (await tune(sample, { ...request, abilityTrialRuns: 0 })).data as unknown as TuningData;
  assert.deepEqual(counters(skipped), { 'a.illusion-breaker': 'notTried a.illusion', 'a.domain-breaker': 'noItem terrain.echo-domain' });
  assert.equal(skipped.candidatesTried.ability, 0);
  // A character that already has the counter does not need it.
  const breaker = Object.values(sample.global.inventory).find((entry) => entry.status === 'owned' && entry.count > 0
    && entry.item.bonuses?.some((bonus) => bonus.type === 'ability' && bonus.abilityId === 'illusion_breaker'))!.item;
  const wearing: GameState = structuredClone(sample);
  const worn = wearing.parties[partyIndex].characters.find((character) => character.id === guardian.id)!;
  worn.equipment = worn.equipment.map((item, slot) => (slot === 0 ? { ...breaker, jewel: null } : item));
  const worn2 = (await tune(wearing, request)).data as unknown as TuningData;
  assert.equal(counters(worn2)['a.illusion-breaker'], 'owned a.illusion');
  assert.deepEqual(worn2.bottleneckCounters.filter((counter) => counter.status === 'owned').map((counter) => [counter.freeGain, counter.freeStandardError]), [[null, null]], 'an owned counter is not re-checked');
}

// ---------------- Jewels: only the changed slot ----------------
// With 34 spare Jewel types and ranks in the Inventory, the party 5 samurai's tuning swaps one item: `changeSummary` lists
// only that slot and its Jewel, and every other slot keeps its item and Jewel.
{
  const samurai = sample.parties[4].characters.find((character) => character.mainClassId === 'samurai')!;
  assert.ok(Object.values(sample.global.jewels).filter((count) => count > 0).length > 0, 'the save has spare Jewels');
  const swap = await tune(sample, { characterId: samurai.id });
  const swapped = swap.data as unknown as TuningData;
  assert.equal(swapped.accepted, true, JSON.stringify({ before: swapped.before, after: swapped.after, improvement: swapped.improvement }));
  const changes = swapped.steps.finalTuning.flatMap((entry) => entry.changes);
  assert.equal(changes.length, 1, `one item is swapped: ${JSON.stringify(changes)}`);
  const slot = Number(changes[0].split('=')[0]);
  assert.ok(swapped.changeSummary.length >= 1 && swapped.changeSummary.length <= 3, JSON.stringify(swapped.changeSummary));
  for (const entry of swapped.changeSummary) {
    const action = entry.endpoint.split('/').pop();
    assert.ok(['removeEquipment', 'equip', 'jewelAttach'].includes(String(action)), `${entry.endpoint} is not a one-slot entry`);
    const slots = [entry.parameters.targetSlot ?? entry.parameters.targetEquipment].flat();
    if (action !== 'equip') assert.deepEqual(slots, [slot], `${entry.endpoint} touches another slot`);
    else assert.equal(entry.parameters.targetSlot, slot);
  }
  const before = characterIn(sample, samurai.id).equipment;
  const after = characterIn(applyApiV1Commit(`commit/build/party/${sample.parties[4].id}/applyBuildResult`, sample, { buildResultId: swapped.buildResultId, simulation: false }, commitContext(swap.stored)).state, samurai.id).equipment;
  before.forEach((item, index) => { if (index !== slot) assert.deepEqual({ ...after[index], isNew: undefined }, { ...item, isNew: undefined }, `slot ${index} keeps its item and Jewel`); });
  assert.notEqual(after[slot]?.id, before[slot]?.id);
  assertDistinctJewels(before, 'the samurai before');
  assertDistinctJewels(after, 'the tuned samurai');
}

console.log('stagedEquipmentTuning profile ok');
