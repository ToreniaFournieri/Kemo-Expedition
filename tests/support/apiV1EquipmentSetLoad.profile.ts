import assert from 'node:assert/strict';
import { executeApiV1CommitTransaction, type ApiV1CommitAuthorityDependencies, type ApiV1CommitAuthorityInput, type ApiV1ControlMetadata } from '../../src/api/v1/authority';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { getVariantKey, type GameState } from '../../src/types';
import { planEquipmentIntent } from '../../src/api/v1/equipmentIntents';

// SpecRef: 9.1.4.5 | Confirmation protocol | Partial equipment-set load choices
// SpecRef: 9.1.4.9 | Operation-specific completion rules | loadEquipmentSet

const now = Date.parse('2026-01-01T00:00:00.000Z');
const context = (): ApiV1CommitContext => ({ simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: {}, uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment: (state) => state, createDeliveryId: () => 'd', now: () => now });

const base = createFreshGameState('ja', now);
const characterId = base.parties[0].characters[0].id;
const path = (action: string) => `commit/build/character/${characterId}/${action}`;
const character = (state: GameState) => state.parties[0].characters.find((entry) => entry.id === characterId)!;
const equipped = character(base).equipment.filter((item): item is NonNullable<typeof item> => item !== null);
assert.ok(equipped.length >= 2);

// Fixture: save the current set, unequip everything, then destroy every copy of one saved item.
const saved = applyApiV1Commit(path('saveEquipmentSet'), base, { equipmentSet: { name: 'Set A' } }, context());
const setId = saved.data.equipmentSetId as number;
const bare = applyApiV1Commit(path('removeAllEquipment'), saved.state, {}, context()).state;
const lostKey = getVariantKey(equipped[0]);
const inventory = { ...bare.global.inventory };
delete inventory[lostKey];
const partial: GameState = { ...bare, global: { ...bare.global, inventory } };
const full: GameState = bare;

// Jewels are assigned independently every time, so a stored Jewel (even one that no longer exists) never affects availability.
const jeweledEntryIndex = saved.state.global.savedEquipmentSets[0].equipment.findIndex((entry) => entry.item.category === 'armor');
assert.ok(jeweledEntryIndex >= 0, 'fixture set has an armor entry');
const jeweledSet = structuredClone(saved.state.global.savedEquipmentSets[0]);
jeweledSet.equipment[jeweledEntryIndex].item.jewel = { key: 'fort', rank: 2 };
const jewelsWithoutExact = { ...full.global.jewels };
delete jewelsWithoutExact['fort:2'];
const missingExactJewel: GameState = {
  ...full,
  global: { ...full.global, jewels: jewelsWithoutExact, savedEquipmentSets: [jeweledSet] },
};

function control(): ApiV1ControlMetadata { return { revisionHighWater: 0, inGameTime: now, receipts: [], tombstones: [], confirmations: [], popupEvents: [], deliveries: [] }; }
function deps(): ApiV1CommitAuthorityDependencies {
  let counter = 0;
  return { gameMode: 'mode.normal', enemyLevelOffset: 0, cycleDurationScale: 1, applyAutoEquipment: (state) => state, persist: async () => undefined, publish: async () => undefined, createOpaqueId: () => `opaque-${++counter}`, createRandomSeed: () => 1, now: () => now };
}
function request(state: GameState, parameters: Record<string, unknown>, overrides: Partial<ApiV1CommitAuthorityInput> = {}): ApiV1CommitAuthorityInput {
  return { operation: path('loadEquipmentSet'), expectedRevision: 0, idempotencyKey: 'load-set-key-0001', requestId: 'r', parameters, uploadedFiles: {}, state, simulatedAt: now, control: control(), ...overrides };
}

// 1. A load whose every exact item is available needs no confirmation and defaults to equipSet.
{
  const result = await executeApiV1CommitTransaction(request(full, { equipmentSetId: setId }), deps());
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error(result.error.code);
  const report = (result.response.data as { loadReport: { loadMode: string; entries: Array<{ result: string }> } }).loadReport;
  assert.equal(report.loadMode, 'equipSet');
  assert.ok(report.entries.every((entry) => entry.result === 'equipped'));
  assert.equal(character(result.state).equipment.filter(Boolean).length, equipped.length);
}

// 2. A partial load is challenged; equipSet is not offered, and a supplied loadMode does not skip the challenge.
let token = '';
let durable: ApiV1ControlMetadata;
{
  const challenged = await executeApiV1CommitTransaction(request(partial, { equipmentSetId: setId, loadMode: 'equipSimilar' }), deps());
  assert.equal(challenged.ok, false);
  if (challenged.ok) throw new Error('expected a challenge');
  assert.equal(challenged.error.code, 'confirmation_required');
  const details = challenged.error.details as { confirmationToken: string; allowedChoices: string[]; choiceField: string };
  assert.deepEqual(details.allowedChoices, ['equipSimilar', 'equipExactMatchesOnly']);
  assert.equal(details.choiceField, 'loadMode');
  token = details.confirmationToken;
  durable = challenged.durableControl!;
  assert.equal(durable.revisionHighWater, 0, 'a challenge never changes the revision');
}

// 3. Confirming with a permitted choice succeeds; the receipt records the complete parameters including the choice.
{
  const confirmed = await executeApiV1CommitTransaction(request(partial, { equipmentSetId: setId, loadMode: 'equipExactMatchesOnly' }, { control: durable, confirmationToken: token }), deps());
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) throw new Error(confirmed.error.code);
  const report = (confirmed.response.data as { loadReport: { entries: Array<{ result: string; reason: string | null }> } }).loadReport;
  assert.equal(report.entries.filter((entry) => entry.result === 'skipped' && entry.reason === 'unavailable').length, 1, 'the destroyed item is reported skipped with a stable reason');
  assert.equal(character(confirmed.state).equipment.filter(Boolean).length, equipped.length - 1);
  assert.ok(confirmed.control.receipts[0].canonical.includes('equipExactMatchesOnly'), 'the selected choice is part of the receipt identity');
  assert.equal(confirmed.control.confirmations?.length ?? 0, 0, 'the reservation is consumed by the successful commit');
}

// 4. The equipSet choice is never accepted for a partial set; a wrong token, or a missing choice fail.
{
  const notOffered = await executeApiV1CommitTransaction(request(partial, { equipmentSetId: setId, loadMode: 'equipSet' }, { control: durable, confirmationToken: token }), deps());
  assert.equal(notOffered.ok === false && notOffered.error.code, 'confirmation_invalid');
  const noChoice = await executeApiV1CommitTransaction(request(partial, { equipmentSetId: setId }, { control: durable, confirmationToken: token }), deps());
  assert.equal(noChoice.ok === false && noChoice.error.code, 'confirmation_invalid');
  const wrongToken = await executeApiV1CommitTransaction(request(partial, { equipmentSetId: setId, loadMode: 'equipSimilar' }, { control: durable, confirmationToken: 'not-the-token' }), deps());
  assert.equal(wrongToken.ok === false && wrongToken.error.code, 'confirmation_invalid');
  const changedBase = await executeApiV1CommitTransaction(request(partial, { equipmentSetId: setId + 1, loadMode: 'equipSimilar' }, { control: durable, confirmationToken: token }), deps());
  assert.equal(changedBase.ok === false && changedBase.error.code, 'not_found', 'an unknown set is reported directly; no token can be spent on it');
}

// 5. An identical unconfirmed retry returns the same reserved challenge instead of issuing a second token.
{
  const again = await executeApiV1CommitTransaction(request(partial, { equipmentSetId: setId }, { control: durable }), deps());
  assert.equal(again.ok, false);
  if (again.ok) throw new Error('expected the same challenge');
  assert.equal((again.error.details as { confirmationToken: string }).confirmationToken, token);
  assert.equal(again.durableControl?.confirmations?.length, 1);
}

// 6. Directly at the commit layer, `equipSet` on a partial set is refused rather than silently degraded.
{
  let message = '';
  try { applyApiV1Commit(path('loadEquipmentSet'), partial, { equipmentSetId: setId, loadMode: 'equipSet' }, context()); } catch (error) { message = String(error); }
  assert.ok(message.includes('illegal_action'), message);
  let missing = '';
  try { applyApiV1Commit(path('loadEquipmentSet'), full, { equipmentSetId: 99 }, context()); } catch (error) { missing = String(error); }
  assert.ok(missing.includes('not_found'), missing);
}

// 7. A missing saved Jewel never makes a set partial: no confirmation, the item is equipped, and Jewels are assigned afresh.
{
  const loaded = await executeApiV1CommitTransaction(request(missingExactJewel, { equipmentSetId: setId }, { idempotencyKey: 'load-set-jewel-001' }), deps());
  assert.equal(loaded.ok, true, 'no confirmation challenge for a missing saved Jewel');
  if (!loaded.ok) throw new Error(loaded.error.code);
  const report = (loaded.response.data as { loadReport: { entries: Array<{ slotIndex: number; result: string }> } }).loadReport;
  const jeweledSlot = jeweledSet.equipment[jeweledEntryIndex].slotIndex ?? jeweledEntryIndex;
  assert.equal(report.entries.find((entry) => entry.slotIndex === jeweledSlot)?.result, 'equipped');
}

// The Party set controls map to one command each; the load choice the player made is answered on their behalf.
{
  const modeOf = (state: GameState, mode: 'exact' | 'similar') => {
    const [command] = planEquipmentIntent(state, characterId, { kind: 'loadSet', slot: setId, mode });
    return { action: command.action, loadMode: command.parameters.loadMode, confirmed: command.confirmed };
  };
  assert.deepEqual(modeOf(full, 'exact'), { action: 'loadEquipmentSet', loadMode: 'equipSet', confirmed: true }, 'a fully available set equips exactly');
  assert.equal(modeOf(partial, 'exact').loadMode, 'equipExactMatchesOnly', 'a partial set with the exact-only choice');
  assert.equal(modeOf(partial, 'similar').loadMode, 'equipSimilar');
  assert.equal(modeOf(full, 'similar').loadMode, 'equipSimilar');
  assert.throws(() => planEquipmentIntent(full, characterId, { kind: 'loadSet', slot: 99, mode: 'exact' }), /not_found/);

  // Rename: blank and unchanged names are not commits; a real change is one command.
  assert.deepEqual(planEquipmentIntent(saved.state, characterId, { kind: 'renameSet', slot: setId, name: '   ' }), []);
  assert.deepEqual(planEquipmentIntent(saved.state, characterId, { kind: 'renameSet', slot: setId, name: 'Set A' }), []);
  assert.deepEqual(planEquipmentIntent(saved.state, characterId, { kind: 'renameSet', slot: setId, name: 'Boss build ' }), [{ action: 'renameEquipmentSet', parameters: { equipmentSetId: setId, name: 'Boss build' } }]);
  assert.deepEqual(planEquipmentIntent(saved.state, characterId, { kind: 'renameSet', slot: 99, name: 'x' }), []);
  assert.equal(planEquipmentIntent(base, characterId, { kind: 'saveSet', name: 'N' })[0].action, 'saveEquipmentSet');
  assert.equal(planEquipmentIntent(base, characterId, { kind: 'deleteSet', slot: 1 })[0].action, 'deleteEquipmentSet');
}

// Handler fixes: the created id is the new slot even when it fills a gap; failures are explicit, not silent no-ops.
{
  let state = base;
  const ids: number[] = [];
  for (const name of ['One', 'Two', 'Three']) {
    const outcome = applyApiV1Commit(path('saveEquipmentSet'), state, { equipmentSet: { name } }, context());
    ids.push(outcome.data.equipmentSetId as number);
    state = outcome.state;
  }
  assert.deepEqual(ids, [1, 2, 3]);
  state = applyApiV1Commit(path('deleteEquipmentSet'), state, { equipmentSetId: 2 }, context()).state;
  const gap = applyApiV1Commit(path('saveEquipmentSet'), state, { equipmentSet: { name: 'Gap' } }, context());
  assert.equal(gap.data.equipmentSetId, 2, 'the new set fills the gap; the id is not the last array element');
  const failure = (operation: string, target: GameState, parameters: Record<string, unknown>) => { try { applyApiV1Commit(path(operation), target, parameters, context()); return ''; } catch (error) { return String(error); } };
  assert.ok(failure('deleteEquipmentSet', state, { equipmentSetId: 99 }).includes('not_found'));
  assert.ok(failure('renameEquipmentSet', state, { equipmentSetId: 99, name: 'x' }).includes('not_found'));
  assert.ok(failure('renameEquipmentSet', state, { equipmentSetId: 1, name: '   ' }).includes('invalid_request'));
  assert.ok(failure('saveEquipmentSet', state, { equipmentSet: { name: '' } }).includes('invalid_request'));
  const fullList: GameState = { ...state, global: { ...state.global, savedEquipmentSets: Array.from({ length: 99 }, (_, index) => ({ slot: index + 1, name: `S${index + 1}`, createdAt: 0, equipment: [] })) } };
  assert.ok(failure('saveEquipmentSet', fullList, { equipmentSet: { name: 'over' } }).includes('illegal_action'), 'a full list rejects instead of silently doing nothing');
}

console.log('apiV1EquipmentSetLoad profile ok');
