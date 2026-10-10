import assert from 'node:assert/strict';
import { createFreshGameState, gameReducer, simulateExpeditionRuns } from '../../src/hooks/useGameState';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { GA_EFFORT_PRESETS, parseGaSearchRequest, rateGaResult, runGaSearch, type GaSearchDependencies, type StoredGaResult } from '../../src/api/v1/gaSearch';
import type { GameState } from '../../src/types';

// SpecRef: 9.1.3 | Read | 2-3-2 party/{p}/gaSearch
// SpecRef: 9.1.3 | Commit | 3-3-2 party/{p}/applyGaResult
// SpecRef: 9.1.4.9 | Operation-specific completion rules | gaSearch and applyGaResult

const now = Date.parse('2026-01-01T00:00:00.000Z');

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
const small = { seed: 7, populationSize: 8, generations: 3, quickRuns: 10, confirmRuns: 50, verifyRuns: 100, eliteCount: 2 };

function dependencies(): GaSearchDependencies {
  return {
    simulate: (target, index, count, seed) => simulateExpeditionRuns(target, index, 'mode.normal', count, undefined, 0, seed),
    now: () => now, createSeed: () => 99, createOpaqueId: () => 'ga-result-1', revision: 4,
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
rejects({ targets: equipmentTargets, gaParameters: { effort: 'max' } }, 'invalid_request:gaParameters.effort');
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
  const data = outcome.data as { verdict: string; changeSummary: { endpoint: string; parameters: Record<string, unknown> }[]; forecast: { before: string; after: string }; verification: { before: number; after: number } };
  assert.ok(data.verdict === 'veryGood' || data.verdict === 'good', `verdict ${data.verdict}`);
  assert.ok(data.verification.after > data.verification.before);
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

// ---------------- applyGaResult ----------------

const stored: StoredGaResult = outcome.stored;
const path = 'commit/build/party/1/applyGaResult';
function context(result: StoredGaResult | null = stored, equipmentHistory: ApiV1CommitContext['equipmentHistory'] = {}): ApiV1CommitContext {
  return { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory, uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment: (s) => s, createDeliveryId: () => 'd', now: () => now, gaResult: () => result ?? undefined };
}
function fails(parameters: Record<string, unknown>, marker: string, state: GameState = base, result: StoredGaResult | null = stored): void {
  let message = '';
  try { applyApiV1Commit(path, state, parameters, context(result)); } catch (error) { message = String(error); }
  assert.ok(message.includes(marker), `${JSON.stringify(parameters)} expected ${marker}, got ${message}`);
}
fails({ gaResultId: stored.gaResultId }, 'invalid_request:simulation');
fails({ gaResultId: stored.gaResultId, simulation: false, autoEquipmentMode: 'FULL' }, 'invalid_request:autoEquipmentMode');
fails({ gaResultId: stored.gaResultId, simulation: true, confirmation: 'yes' }, 'invalid_request:confirmation_with_simulation');
fails({ gaResultId: 'another-result', simulation: false }, 'illegal_action:ga_result_unavailable');
fails({ gaResultId: stored.gaResultId, simulation: false }, 'illegal_action:ga_result_unavailable', base, null);
fails({ gaResultId: stored.gaResultId, simulation: false }, 'illegal_action:ga_result_no_change', base, { ...stored, verdict: 'noChange' });
{
  // Build-relevant state changed after the search: the party order here.
  const reordered = gameReducer(base, { type: 'REORDER_PARTY_CHARACTER', partyIndex: 0, fromIndex: 0, toIndex: 1 });
  fails({ gaResultId: stored.gaResultId, simulation: false }, 'illegal_action:ga_result_stale', reordered);
  // Progression that leaves the build alone (time, gold) does not invalidate the result.
  const richer: GameState = { ...base, global: { ...base.global, gold: base.global.gold + 1000 } };
  applyApiV1Commit(path, richer, { gaResultId: stored.gaResultId, simulation: true }, context());
}
{
  // `noisy` and `worse` need `confirmation: "yes"`; `no` cancels without a change.
  const noisy: StoredGaResult = { ...stored, verdict: 'noisy' };
  fails({ gaResultId: stored.gaResultId, simulation: false }, 'invalid_request:confirmation_required', base, noisy);
  const cancelled = applyApiV1Commit(path, base, { gaResultId: stored.gaResultId, simulation: false, confirmation: 'no' }, context(noisy));
  assert.equal(cancelled.state, base);
  assert.deepEqual(cancelled.data.applied, []);
  assert.equal(cancelled.data.confirmationRequired, true);
  assert.equal((cancelled.data.warnings as unknown[]).length, 1);
}
{
  // `simulation: true` reports the changes and the resulting status without committing.
  const preview = applyApiV1Commit(path, base, { gaResultId: stored.gaResultId, simulation: true }, context());
  assert.equal(preview.state, base);
  assert.deepEqual(preview.data.applied, stored.changeSummary);
  assert.equal(preview.data.confirmationRequired, false);
  assert.ok((preview.data.calculatedStatus as unknown[]).length > 0);
}
{
  // The commit applies every entry, sets the requested mode, and records exactly one Undo step per changed character.
  const history: ApiV1CommitContext['equipmentHistory'] = {};
  const applied = applyApiV1Commit(path, base, { gaResultId: stored.gaResultId, simulation: false, autoEquipmentMode: 'OFF' }, context(stored, history));
  const changed = [...new Set(stored.changeSummary.map((entry) => Number(entry.endpoint.split('/')[3])))];
  for (const characterId of changed) {
    const character = applied.state.parties[0].characters.find((entry) => entry.id === characterId)!;
    assert.equal(character.autoEquipmentMode, 0);
    assert.ok(character.equipment.some(Boolean));
    assert.equal(history[String(characterId)].undo.length, 1, 'one Undo step, not one per internal call');
  }
  assert.equal(Object.keys(history).length, changed.length);
  // Undo restores that character's equipment state from before the operation.
  const undone = applyApiV1Commit(`commit/build/character/${changed[0]}/undoEquipment`, applied.state, {}, context(stored, history));
  assert.ok(undone.state.parties[0].characters.find((entry) => entry.id === changed[0])!.equipment.every((item) => !item));
  // The applied result no longer matches the build it was searched for.
  fails({ gaResultId: stored.gaResultId, simulation: false }, 'illegal_action:ga_result_stale', applied.state);
}

console.log('gaSearch profile ok');
