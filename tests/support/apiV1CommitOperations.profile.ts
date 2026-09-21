import assert from 'node:assert/strict';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { buildShopLineup } from '../../src/game/shop';
import { getVariantKey, type GameState, type SavedEquipmentSet } from '../../src/types';

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
  assert.equal((removeOutcome.data.current as { equipment: unknown[] }).equipment.every((slot) => slot === '0'), true, 'every slot is empty after removeAllEquipment');

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

// 3. Sell results report the exact stacks and currency deltas; a bad entry sells nothing (atomic validation).
{
  const stack = Object.values(seed.global.inventory).find((variant) => variant.status === 'owned' && variant.count > 0)!;
  const format = `0/${stack.item.id}/${stack.item.enhancement}/${stack.item.superRare}`;
  const sold = applyApiV1Commit('commit/base/sellInventoryItems', seed, { items: [format] }, baseContext());
  const data = sold.data as { items: { item: string; quantity: number }[]; goldDelta: number; pranaDelta: number };
  assert.deepEqual(data.items, [{ item: format, quantity: stack.count }]);
  assert.equal(data.goldDelta, sold.state.global.gold - seed.global.gold);
  assert.equal(data.pranaDelta, sold.state.global.prana - seed.global.prana);
  assert.equal(sold.state.global.inventory[getVariantKey(stack.item)].status, 'sold');
  assert.equal(seed.global.inventory[getVariantKey(stack.item)].status, 'owned', 'the input snapshot is not mutated');

  const failure = (items: string[]) => { try { applyApiV1Commit('commit/base/sellInventoryItems', seed, { items }, baseContext()); return ''; } catch (error) { return String(error); } };
  assert.ok(failure([format, format]).includes('invalid_request'), 'duplicate variants are invalid');
  assert.ok(failure([format, '0/999999/0/0']).includes('not_found'), 'an unknown variant rejects the whole request');
  assert.ok(failure([`0/${stack.item.id}/${stack.item.enhancement}/x`]).includes('invalid_request'));
  const alreadySold = applyApiV1Commit('commit/base/sellInventoryItems', seed, { items: [format] }, baseContext()).state;
  let again = '';
  try { applyApiV1Commit('commit/base/sellInventoryItems', alreadySold, { items: [format] }, baseContext()); } catch (error) { again = String(error); }
  assert.ok(again.includes('illegal_action'), 'a sold variant cannot be sold again');
}

// 4. Purchase results report the exact drawn variants and the net currency delta; the request is atomic.
{
  const richState: GameState = { ...seed, global: { ...seed.global, gold: 1_000_000 } };
  const simulatedAt = Date.parse('2026-01-01T00:00:00.000Z');
  const lineup = buildShopLineup({ parties: richState.parties, gold: richState.global.gold, shopPurchases: richState.global.shopPurchases, shopRefreshCounts: richState.global.shopRefreshCounts, shopIntimacy: richState.global.shopIntimacy, shopIntimacyLastDecayAt: richState.global.shopIntimacyLastDecayAt }, new Date(simulatedAt));
  const entry = lineup.entries.find((candidate) => !candidate.soldOut)!;
  const bought = applyApiV1Commit('commit/base/purchaseShopItems', richState, { items: [{ shopItemId: entry.stockEntryId }] }, baseContext({ simulatedAt }));
  const data = bought.data as { items: { item: string; quantity: number }[]; goldDelta: number; pranaDelta: number };
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].quantity, 1);
  assert.match(data.items[0].item, new RegExp(`^0/${entry.itemId}/[0-6]/[0-9]+$`));
  assert.equal(data.goldDelta, bought.state.global.gold - richState.global.gold);
  assert.ok(data.goldDelta <= 0 && data.goldDelta >= -entry.price, 'the price is charged, minus any auto-sell proceeds');

  let duplicate = '';
  try { applyApiV1Commit('commit/base/purchaseShopItems', richState, { items: [{ shopItemId: entry.stockEntryId }, { shopItemId: entry.stockEntryId }] }, baseContext({ simulatedAt })); } catch (error) { duplicate = String(error); }
  assert.ok(duplicate.includes('invalid_items'), duplicate);
  let poor = '';
  try { applyApiV1Commit('commit/base/purchaseShopItems', { ...richState, global: { ...richState.global, gold: 0 } }, { items: [{ shopItemId: entry.stockEntryId }] }, baseContext({ simulatedAt })); } catch (error) { poor = String(error); }
  assert.ok(poor.includes('illegal_action'), poor);
}

console.log('apiV1CommitOperations profile ok');
