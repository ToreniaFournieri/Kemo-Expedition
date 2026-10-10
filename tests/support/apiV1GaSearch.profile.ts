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

// ---------------- considerItemsScope ----------------
// SpecRef: 9.1.3 | 2-3-2 gaSearch `considerItemsScope` | `normal`, `withinTargets`, `global`; locked equipment is never changed or taken.
{
  assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets }).considerItemsScope, 'normal');
  for (const scope of ['normal', 'withinTargets', 'global']) assert.equal(parseGaSearchRequest(base, 0, { targets: equipmentTargets, considerItemsScope: scope }).considerItemsScope, scope);
  rejects({ targets: equipmentTargets, considerItemsScope: 'onlyInventory' }, 'invalid_request:considerItemsScope');
  rejects({ targets: equipmentTargets, considerItemsScope: 1 }, 'invalid_request:considerItemsScope');

  // A geared party: the search result applied to the stripped save, with the leftover items still in the Inventory.
  const geared = applyApiV1Commit(path, base, { gaResultId: stored.gaResultId, simulation: false }, context()).state;
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
    if (entries.length > 0) applyApiV1Commit(path, geared, { gaResultId: result.stored.gaResultId, simulation: false, confirmation: 'yes' }, context(result.stored));
  }

  // `withinTargets` and `global`: every result applies as written; `withinTargets` never touches characters outside `targets`.
  for (const scope of ['withinTargets', 'global']) {
    const result = await run(geared, scope);
    const entries = (result.data as { changeSummary: { endpoint: string }[] }).changeSummary;
    if (scope === 'withinTargets') for (const entry of entries) assert.ok([first, second].includes(characterOf(entry)), `withinTargets changes only targets: ${entry.endpoint}`);
    if (entries.length > 0) applyApiV1Commit(path, geared, { gaResultId: result.stored.gaResultId, simulation: false, confirmation: 'yes' }, context(result.stored));
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
    const applied = applyApiV1Commit(path, donorState, { gaResultId: result.stored.gaResultId, simulation: false, confirmation: 'yes' }, context(result.stored)).state;
    assert.equal(ids.reduce((sum, id) => sum + wornKeys(applied, id).length, 0), equips.length);
    assert.equal(donorIds.reduce((sum, id) => sum + wornKeys(applied, id).length, 0), donorIds.reduce((sum, id) => sum + wornKeys(donorState, id).length, 0) - taken);
    // The stored result goes stale when a donor's equipment changes.
    const tampered: GameState = { ...donorState, parties: [donorState.parties[0], gameReducer(donorState, { type: 'REMOVE_ALL_EQUIPMENT', partyIndex: 1, characterId: characterOf(removals[0]) }).parties[1]] };
    let message = '';
    try { applyApiV1Commit(path, tampered, { gaResultId: result.stored.gaResultId, simulation: true }, context(result.stored)); } catch (error) { message = String(error); }
    assert.ok(message.includes('illegal_action:ga_result_stale'), message);
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
      ? applyApiV1Commit(path, locked, { gaResultId: result.stored.gaResultId, simulation: false, confirmation: 'yes' }, context(result.stored)).state
      : locked;
    for (const characterId of [first, third]) {
      const slot = lockedSlot(characterId);
      const after = applied.parties[0].characters.find((entry) => entry.id === characterId)!.equipment[slot];
      assert.equal(after?.id, before(characterId)[slot]?.id, `locked slot ${slot} of ${characterId} is unchanged`);
      assert.equal(after?.isLocked, true);
    }
  }
}

console.log('gaSearch profile ok');
