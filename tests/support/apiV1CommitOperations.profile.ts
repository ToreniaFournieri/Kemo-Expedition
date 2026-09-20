import assert from 'node:assert/strict';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { createFreshGameState } from '../../src/hooks/useGameState';
import type { GameState, SavedEquipmentSet } from '../../src/types';

// SpecRef: 9.1 | Desktop distribution | Application API
// Isolated, transport-neutral behavioral coverage for the extracted commit-operation module: no React, no
// Electron, no HTTP. This is the first slice of the cross-adapter fixture work described for later milestones.

function baseContext(overrides: Partial<ApiV1CommitContext> = {}): ApiV1CommitContext {
  return {
    simulatedAt: Date.parse('2026-01-01T00:00:00.000Z'),
    gameMode: 'mode.normal',
    enemyLevelOffset: 0,
    settings: {},
    equipmentHistory: {},
    uploadedFiles: {},
    canonicalFiles: {},
    applyAutoEquipment: (state) => state,
    createDeliveryId: () => 'delivery-fixed-id',
    now: () => Date.parse('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const seed: GameState = createFreshGameState('ja', Date.parse('2026-01-01T00:00:00.000Z'));

// 1. A simple successful mutation returns updated data without mutating the input state.
// createFreshGameState defaults jewelAutoEquipPriorityPartyId to 1, so dispatch 'none' to
// actually change it (and prove the resulting reference is fresh, not a no-op passthrough).
{
  assert.equal(seed.global.jewelAutoEquipPriorityPartyId, 1, 'fresh game state defaults jewel priority to PT1');
  const outcome = applyApiV1Commit('commit/base/changeJewelPriorityParty', seed, { partyNumber: 'none' }, baseContext());
  assert.equal(outcome.data && (outcome.data as { current: { partyNumber: string } }).current.partyNumber, 'none');
  assert.equal(outcome.state.global.jewelAutoEquipPriorityPartyId, null);
  assert.notEqual(outcome.state, seed, 'the input snapshot must not be mutated in place');
  assert.equal(seed.global.jewelAutoEquipPriorityPartyId, 1, 'the original snapshot must remain untouched');
}

// 2. not_found is thrown (and preserved as the exact message marker) for an unresolved party lookup.
{
  let threw = false;
  try {
    applyApiV1Commit('commit/diary/99/diarySetting', seed, {}, baseContext());
  } catch (error) {
    threw = true;
    assert.ok(String(error).includes('not_found'), String(error));
  }
  assert.ok(threw, 'expected a not_found error for an unknown party number');
}

// 3. commit/setting/modeSelect: matching mode/offset is accepted, and the (possibly mutated) settings bag passed in
// via context is the exact object echoed back for the caller to persist.
// Use 'ja' rather than 'en' here: SET_LANGUAGE synchronously requires its dictionary to already be
// loaded, and only 'ja' ships as the eagerly-bundled fallback outside the real lazy-loading UI runtime.
{
  const settings: Record<string, unknown> = {};
  const outcome = applyApiV1Commit('commit/setting/modeSelect', seed, { language: 'ja' }, baseContext({ settings }));
  assert.equal(outcome.state.global.language, 'ja');
  assert.equal((outcome.data.current as { language: string }).language, 'ja');
  assert.equal(outcome.settings, settings, 'the exact injected settings object is echoed back, not a copy');
  assert.equal((outcome.settings.modeSelect as { language: string }).language, 'ja');
}

// 4. commit/setting/modeSelect: a mismatched mode is illegal_action, not silently accepted.
{
  let code = '';
  try {
    applyApiV1Commit('commit/setting/modeSelect', seed, { mode: 'mode.orca' }, baseContext({ gameMode: 'mode.normal' }));
  } catch (error) {
    code = String(error);
  }
  assert.ok(code.includes('illegal_action'), code);
}

// 5. Debug-gated commit/setting/debug rejects with illegal_action outside dev/beta (Node test env resolves to `prod`).
{
  let code = '';
  try {
    applyApiV1Commit('commit/setting/debug', seed, { colosseumMode: true }, baseContext());
  } catch (error) {
    code = String(error);
  }
  assert.ok(code.includes('illegal_action'), code);
}

// 6. commit/setting/backup/reset produces a fresh state and signals the caller to invalidate popups/confirmations.
{
  const outcome = applyApiV1Commit('commit/setting/backup/reset', seed, {}, baseContext());
  assert.equal(outcome.resetControlEvents, true);
  assert.deepEqual(outcome.data, {});
  assert.notEqual(outcome.state, seed);
}

// 7. commit/progress/progressReport creates a queued delivery record using the injected id/clock, not real randomness.
{
  const outcome = applyApiV1Commit('commit/progress/progressReport', seed, {}, baseContext());
  assert.deepEqual(outcome.data, { deliveryId: 'delivery-fixed-id', status: 'queued' });
  assert.ok(outcome.delivery);
  assert.equal(outcome.delivery!.deliveryId, 'delivery-fixed-id');
  assert.equal(outcome.delivery!.createdAt, new Date(Date.parse('2026-01-01T00:00:00.000Z')).toISOString());
}

// 8. commit/progress/elapsed advances the returned simulatedAt by exactly the accepted seconds.
{
  const outcome = applyApiV1Commit('commit/progress/elapsed', seed, { elapsedSeconds: 120 }, baseContext());
  assert.equal(outcome.simulatedAt, Date.parse('2026-01-01T00:00:00.000Z') + 120_000);
  assert.equal((outcome.data as { elapsedSeconds: number }).elapsedSeconds, 120);
}

// 9. commit/progress/elapsed rejects an out-of-range value as invalid_request (not silently clamped).
{
  let code = '';
  try {
    applyApiV1Commit('commit/progress/elapsed', seed, { elapsedSeconds: 1 }, baseContext());
  } catch (error) {
    code = String(error);
  }
  assert.ok(code.includes('invalid_elapsed'), code);
}

// 10. Character equipment history: saveEquipmentSet does NOT itself touch the equipped loadout, so it is
// deliberately excluded from undo/redo recording (see the `recordsEquipmentHistory` exclusion list in
// commitOperations.ts). A real mutating action (removeAllEquipment) records the undo snapshot instead, and
// undoEquipment restores it while pushing a redo snapshot; the history bag is threaded through the injected
// context object across all three calls.
{
  const characterId = seed.parties[0].characters[0].id;
  const equippedBefore = seed.parties[0].characters[0].equipment.filter((item): item is NonNullable<typeof item> => item !== null).length;
  assert.ok(equippedBefore > 0, 'the seed character starts with at least one equipped item');

  const history: ApiV1CommitContext['equipmentHistory'] = {};
  const saveOutcome = applyApiV1Commit(`commit/build/character/${characterId}/saveEquipmentSet`, seed, { equipmentSet: { name: 'Test set' } }, baseContext({ equipmentHistory: history }));
  assert.ok(typeof saveOutcome.data.equipmentSetId === 'number');
  assert.equal(history[String(characterId)]?.undo.length ?? 0, 0, 'saving an equipment set does not itself record an undo snapshot');
  const savedSet = saveOutcome.state.global.savedEquipmentSets.find((entry: SavedEquipmentSet) => entry.slot === saveOutcome.data.equipmentSetId);
  assert.ok(savedSet, 'the saved equipment set is present in the returned state');

  const removeOutcome = applyApiV1Commit(`commit/build/character/${characterId}/removeAllEquipment`, saveOutcome.state, {}, baseContext({ equipmentHistory: history }));
  assert.equal(history[String(characterId)]?.undo.length, 1, 'a real equipment mutation records one undo snapshot');
  assert.equal((removeOutcome.data.current as { equipment: unknown[] }).equipment.every((slot) => slot === 0), true, 'every slot is empty after removeAllEquipment');

  const undoOutcome = applyApiV1Commit(`commit/build/character/${characterId}/undoEquipment`, removeOutcome.state, {}, baseContext({ equipmentHistory: history }));
  assert.equal(history[String(characterId)]?.undo.length, 0, 'undo consumes the recorded snapshot');
  assert.equal(history[String(characterId)]?.redo.length, 1, 'undo pushes a redo snapshot');
  const restoredCount = (undoOutcome.data.current as { equipment: unknown[] }).equipment.filter((slot) => slot !== 0).length;
  assert.equal(restoredCount, equippedBefore, 'undo restores the pre-removal equipped item count');
}

// 11. An unrecognized operation is a stable invalid_request, not a silent no-op.
{
  let code = '';
  try {
    applyApiV1Commit('commit/does/not/exist', seed, {}, baseContext());
  } catch (error) {
    code = String(error);
  }
  assert.ok(code.includes('invalid_request'), code);
}

console.log('apiV1CommitOperations profile ok');
