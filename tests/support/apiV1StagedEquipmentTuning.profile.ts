import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createFreshGameState, gameReducer, simulateExpeditionRuns } from '../../src/hooks/useGameState';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { deriveSeed, type GaSearchDependencies, type StoredGaResult } from '../../src/api/v1/gaSearch';
import { buildSimulationRunData } from '../../src/api/v1/simulationView';
import { parseStagedTuningRequest, runStagedEquipmentTuning, tuningImprovement, tuningLuckCheck } from '../../src/api/v1/stagedEquipmentTuning';
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
    simulate: (target, index, count, simulationSeed) => simulateExpeditionRuns(target, index, 'mode.normal', count, undefined, 0, simulationSeed),
    now: () => now, createSeed: () => seed, createOpaqueId: () => 'tuning-result-1', revision: 3,
    commitContext: { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, applyAutoEquipment: (s) => s, now: () => now },
  };
}
const tune = (state: GameState, raw: Record<string, unknown>) => runStagedEquipmentTuning(state, parseStagedTuningRequest(state, raw), dependencies());
interface TuningData {
  accepted: boolean; before: string; after: string; improvement: number; gain: number; standardError: number; bottleneckRoom: string | null;
  steps: Record<'offenseElement' | 'defenseElement' | 'ability', { improvement: number; changes: string[]; element?: string }[]> & { finalTuning: { step: string; index: number; changes: string[] }[] };
  changeSummary: { endpoint: string; parameters: Record<string, unknown> }[]; simulationRuns: number; gaResultId?: string;
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
rejects({ characterId: firstId, seed: 1 }, 'invalid_request:seed.unknown_member');
{
  const parsed = parseStagedTuningRequest(fresh, { characterId: firstId, baselineRuns: 1000 });
  assert.deepEqual(
    { ...parsed },
    {
      characterId: firstId, partyIndex: 0, objective: 'success', offenseElementRequest: null,
      quickRuns: 100, finalTuningRuns: 500, offenseElementTrialRuns: 3, offenseElementCandidateCount: 2, defenseElementTrialRuns: 5,
      defenseElementCandidateCount: 2, abilityTrialRuns: 20, abilityCandidateCount: 2, minImprovement: 0.07, minGateImprovement: 0.07,
    },
    'the 9.1.3 defaults',
  );
  assert.equal(parseStagedTuningRequest(fresh, { characterId: firstId, offenseElementRequest: 'e.none' }).offenseElementRequest, 'none');
}

// ---------------- Improvement and the luck check (Spec 7.1.5 General rules) ----------------

assert.ok(Math.abs(tuningImprovement('success', 0.5, 0.535) - 0.07) < 1e-9);
assert.ok(Math.abs(tuningImprovement('bossDamage', 0.4, 0.3) + 0.25) < 1e-9);
assert.ok(Math.abs(tuningImprovement('minDefeat', 0.2, 0.1) - 1) < 1e-9, 'a lower defeat rate is an improvement');
assert.ok(Math.abs(tuningImprovement('success', 0, 0.01) - 9) < 1e-9, 'a zero denominator counts as 0.001');
assert.ok(Math.abs(tuningImprovement('minDefeat', 0.1, 0) - 99) < 1e-9);
assert.equal(tuningImprovement('success', 0, 0), 0, 'two zero scores are no change');
{
  const luck = tuningLuckCheck('success', 0.4, 0.5, 1000);
  assert.ok(Math.abs(luck.standardError - Math.sqrt(0.24 / 1000 + 0.25 / 1000)) < 1e-12);
  assert.ok(luck.passed);
  assert.equal(tuningLuckCheck('success', 0.4, 0.43, 1000).passed, false, 'three points on 1000 runs may be luck');
  assert.ok(Math.abs(tuningLuckCheck('minDefeat', 0.3, 0.2, 1000).gain - 0.1) < 1e-12, 'minDefeat gains when defeats fall');
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
  assert.deepEqual(data.changeSummary, []);
  assert.equal(data.gaResultId, undefined);
  assert.equal(outcome.stored, null);
  assert.deepEqual([data.steps.offenseElement, data.steps.defenseElement, data.steps.ability, data.steps.finalTuning], [[], [], [], []]);
  // Empty slots are not filled for their own sake: the tuned build is the current one, so the two forecasts match.
  assert.equal(data.after, data.before);
  assert.equal(data.simulationRuns, 2 * 1000 + 100, 'baseline, the quick reference, and the final check');
  assert.match(String(data.bottleneckRoom), /^[1-6]f-[1-4]$/);
  assert.deepEqual(state, before, 'the tuning never changes the state it read');
  assert.deepEqual((await tune(state, { characterId: firstId })).data, outcome.data, 'one seed repeats the whole tuning');
  const off = (await tune(state, { characterId: firstId, offenseElementTrialRuns: 0, defenseElementTrialRuns: 0, abilityTrialRuns: 0 })).data as unknown as TuningData;
  assert.equal(off.simulationRuns, 2 * 1000, 'a step with 0 trials is skipped');
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
  assert.equal(data.gaResultId, 'tuning-result-1');
  assert.ok(outcome.stored && ['good', 'veryGood'].includes(outcome.stored.verdict));
  // Each step records at most max(2, floor(trials / 5)) qualifying candidates, best first.
  for (const [step, trials] of [['offenseElement', 3], ['defenseElement', 5], ['ability', 20]] as const) {
    const recorded = data.steps[step];
    assert.ok(recorded.length <= Math.max(2, Math.floor(trials / 5)), `${step} records too many`);
    assert.ok(recorded.every((candidate, index) => candidate.improvement >= 0.07 && (index === 0 || recorded[index - 1].improvement >= candidate.improvement)), `${step} order`);
  }
  assert.ok(data.steps.finalTuning.length > 0 && data.steps.finalTuning.every((entry) => entry.index >= 0 && entry.changes.length > 0));
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
  // `applyGaResult` applies the result as one Undo step, and the applied build is exactly the one the final check measured.
  const history: ApiV1CommitContext['equipmentHistory'] = {};
  const context: ApiV1CommitContext = {
    simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: history, uploadedFiles: {}, canonicalFiles: {},
    applyAutoEquipment: (s) => s, createDeliveryId: () => 'd', now: () => now, gaResult: () => outcome.stored as StoredGaResult,
  };
  const applied = applyApiV1Commit(`commit/build/party/${locked.parties[partyIndex].id}/applyGaResult`, locked, { gaResultId: data.gaResultId, simulation: false }, context).state;
  assert.equal(history[String(ninja.id)].undo.length, 1);
  const after = applied.parties[partyIndex].characters.find((character) => character.id === ninja.id)!;
  assert.deepEqual({ ...after.equipment[lockedSlot], isNew: undefined }, { ...lockedItem, isNew: undefined }, 'the locked item and its Jewel stay');
  const forecast = await simulateExpeditionRuns(applied, partyIndex, 'mode.normal', 1000, undefined, 0, deriveSeed(seed, 3));
  assert.equal(buildSimulationRunData(forecast, 0, 'check').overview, data.after);
}
{
  // `offenseElementRequest` tries only the requested element.
  const fire = (await tune(sample, { characterId: ninja.id, offenseElementRequest: 'e.fire', defenseElementTrialRuns: 0, abilityTrialRuns: 0, minImprovement: 0 })).data as unknown as TuningData;
  assert.ok(fire.steps.offenseElement.length > 0 && fire.steps.offenseElement.every((candidate) => candidate.element === 'e.fire'));
  assert.deepEqual([fire.steps.defenseElement, fire.steps.ability], [[], []]);
}

console.log('stagedEquipmentTuning profile ok');
