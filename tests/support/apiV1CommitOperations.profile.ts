import assert from 'node:assert/strict';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { createFreshGameState } from '../../src/hooks/useGameState';
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

// 4. Purchase results report the exact drawn variants and the net currency delta; the request is atomic. A slot's ID is its
// 1-based position in the lineup, and the transaction's own clock (not the wall clock) decides which lineup that is.
{
  const { getShopFacts, shopLineupInputOf } = await import('../../src/game/shopFacts');
  const richState: GameState = { ...seed, global: { ...seed.global, gold: 1_000_000 } };
  const simulatedAt = Date.parse('2026-01-01T00:00:00.000Z');
  const facts = getShopFacts(shopLineupInputOf(richState), new Date(simulatedAt));
  assert.deepEqual(facts.entries.map((entry) => entry.shopItemId), [1, 2, 3, 4, 5], 'a slot is its 1-based position');
  const entry = facts.entries[0];
  const bought = applyApiV1Commit('commit/base/purchaseShopItems', richState, { items: [{ shopItemId: entry.shopItemId }] }, baseContext({ simulatedAt }));
  const data = bought.data as { items: { item: string; quantity: number }[]; goldDelta: number; pranaDelta: number };
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].quantity, 1);
  assert.match(data.items[0].item, new RegExp(`^0/${entry.itemId}/[0-6]/[0-9]+$`));
  assert.equal(data.goldDelta, bought.state.global.gold - richState.global.gold);
  assert.ok(data.goldDelta <= 0 && data.goldDelta >= -entry.price, 'the price is charged, minus any auto-sell proceeds');
  // The slot is sold out afterwards, at the same transaction time.
  const after = getShopFacts(shopLineupInputOf(bought.state), new Date(simulatedAt));
  assert.equal(after.entries.find((candidate) => candidate.stockEntryId === entry.stockEntryId)?.soldOut, true);

  const attempt = (state: GameState, items: unknown) => { try { applyApiV1Commit('commit/base/purchaseShopItems', state, { items }, baseContext({ simulatedAt })); return ''; } catch (error) { return String(error); } };
  assert.ok(attempt(richState, [{ shopItemId: 1 }, { shopItemId: 1 }]).includes('invalid_request'), 'a duplicate slot is invalid');
  assert.ok(attempt(richState, [{ shopItemId: 0 }]).includes('invalid_request'));
  assert.ok(attempt(richState, []).includes('invalid_request'));
  assert.ok(attempt(richState, [{ shopItemId: 1 }, { shopItemId: 99 }]).includes('not_found'), 'an unknown slot rejects the whole request');
  assert.ok(attempt({ ...richState, global: { ...richState.global, gold: 0 } }, [{ shopItemId: 1 }]).includes('illegal_action:insufficient_gold'));
  assert.ok(attempt(bought.state, [{ shopItemId: 1 }]).includes('illegal_action:sold_out'), 'a sold slot cannot be bought again');
  // Atomic: the total must be affordable, and nothing is bought when it is not.
  const twoPrices = facts.entries[0].price + facts.entries[1].price;
  const short = { ...richState, global: { ...richState.global, gold: twoPrices - 1 } } as GameState;
  assert.ok(attempt(short, [{ shopItemId: 1 }, { shopItemId: 2 }]).includes('insufficient_gold'));
  const two = applyApiV1Commit('commit/base/purchaseShopItems', { ...richState, global: { ...richState.global, gold: twoPrices } } as GameState, { items: [{ shopItemId: 1 }, { shopItemId: 2 }] }, baseContext({ simulatedAt }));
  assert.equal((two.data as { items: { quantity: number }[] }).items.reduce((sum, row) => sum + row.quantity, 0), 2);
}

// 4b. The paid refresh charges the displayed price at the transaction time and replaces the lineup; an unaffordable refresh
// is refused instead of being silently ignored.
{
  const { getShopFacts, shopLineupInputOf } = await import('../../src/game/shopFacts');
  const at = Date.parse('2026-01-01T03:00:00.000Z');
  const rich: GameState = { ...seed, global: { ...seed.global, gold: 10_000 } };
  const before = getShopFacts(shopLineupInputOf(rich), new Date(at));
  const refreshed = applyApiV1Commit('commit/base/paidShopRefresh', rich, {}, baseContext({ simulatedAt: at }));
  const data = refreshed.data as { lineupId: string; goldDelta: number; paidRefreshPrice: number };
  assert.equal(data.goldDelta, -before.paidRefreshPrice, 'the displayed price is charged');
  assert.notEqual(data.lineupId, before.lineupId, 'the lineup is replaced');
  assert.equal(data.paidRefreshPrice, before.paidRefreshPrice * 2, 'the next refresh in the same period costs double');
  assert.equal(refreshed.state.global.shopIntimacy, Math.min(99, before.intimacy + 2), 'a paid refresh raises intimacy by 2');
  const poor = { ...seed, global: { ...seed.global, gold: before.paidRefreshPrice - 1 } } as GameState;
  assert.throws(() => applyApiV1Commit('commit/base/paidShopRefresh', poor, {}, baseContext({ simulatedAt: at })), /illegal_action:insufficient_gold/);
  // Two refreshes in a row, at one transaction time, go through the same period's count.
  const twice = applyApiV1Commit('commit/base/paidShopRefresh', refreshed.state, {}, baseContext({ simulatedAt: at }));
  assert.equal((twice.data as { goldDelta: number }).goldDelta, -before.paidRefreshPrice * 2);
}

// 4c. The shop reads describe the same shop: shared facts, spec compact strings, and a refresh price by refresh count.
{
  const { buildApiV1ReadData } = await import('../../src/api/v1/readModels');
  const at = Date.parse('2026-01-01T03:00:00.000Z');
  const read = (operation: string, state: GameState = seed) => buildApiV1ReadData(operation, state, {}, { environment: 'dev', gameMode: 'mode.normal', enemyLevelOffset: 0, revision: 1, inGameTime: at } as never) as Promise<any>;
  const info = await read('read/base/shopInfo');
  assert.equal(info.paidRefreshPrice, 200, 'the first refresh of the period costs 200G, not a price derived from intimacy');
  assert.equal(info.dialogue.key, 'home.shop.dialogue.default');
  assert.ok(info.paidRefreshCountdown >= 1 && info.paidRefreshCountdown <= 8 * 3600);
  const list = await read('read/base/shopItemsList');
  assert.equal(list.current.items.length, 5);
  assert.match(list.current.items[0], /^1\/\d+\/\d+\/(true|false)$/);
  assert.deepEqual(list.validOptions.items, list.current.entries.filter((entry: { available: boolean }) => entry.available).map((entry: { shopItemId: number }) => entry.shopItemId));
  const base = await read('read/observation/base');
  assert.deepEqual(base.baseInfo.shop.entries, list.current.entries);
  assert.equal(base.baseInfo.shop.paidRefreshPrice, info.paidRefreshPrice);
  const loved = await read('read/base/shopInfo', { ...seed, global: { ...seed.global, shopIntimacy: 90, shopIntimacyLastDecayAt: at } } as GameState);
  assert.equal(loved.dialogue.key, 'home.shop.dialogue.intimacy80');
}

// 9. uiPreferences: a closed, typed catalog stored in the save; unknown or invalid changes reject the whole update.
{
  const { buildApiV1ReadData } = await import('../../src/api/v1/readModels');
  const characterId = seed.parties[0].characters[0].id;
  const key = `party.equipCategory.${characterId}`;
  const commit = (state: GameState, changes: unknown) => applyApiV1Commit('commit/setting/uiPreferences', state, { changes }, baseContext());
  const set = commit(seed, [{ key, value: 'wand' }]);
  assert.deepEqual((set.data as { uiPreferences: unknown }).uiPreferences, [{ key, value: 'wand' }]);
  assert.equal(set.state.global.uiPreferences?.[key], 'wand', 'the preference lives in the save');
  assert.equal(seed.global.uiPreferences, undefined, 'the input snapshot is untouched');
  assert.equal(commit(set.state, [{ key, value: 'wand' }]).state, set.state, 'an unchanged value keeps the state identity (valid no-op)');
  const read = await buildApiV1ReadData('read/observation/setting', set.state, {}, { environment: 'dev', gameMode: 'mode.normal', enemyLevelOffset: 0 } as never) as { settingInfo: { uiPreferences: unknown; uiPreferenceCatalog: Array<{ family: string; options: string[]; defaultValue: string }> } };
  assert.deepEqual(read.settingInfo.uiPreferences, [{ key, value: 'wand' }]);
  assert.equal(read.settingInfo.uiPreferenceCatalog[0].family, 'party.equipCategory');
  assert.equal(read.settingInfo.uiPreferenceCatalog[0].defaultValue, 'armor');
  assert.ok(read.settingInfo.uiPreferenceCatalog[0].options.includes('katana'));

  const rejects = (changes: unknown, expected: string) => assert.throws(() => commit(seed, changes), new RegExp(expected));
  rejects([{ key: 'party.equipCategory.999999', value: 'wand' }], 'invalid_request:key');
  rejects([{ key: 'party.equipCategory.abc', value: 'wand' }], 'invalid_request:key');
  rejects([{ key: 'settingPanelExpanded', value: true }], 'invalid_request:key');
  rejects([{ key, value: 'jewel' }], 'invalid_request:value');
  rejects([{ key, value: 3 }], 'invalid_request:value');
  rejects([{ key, value: 'wand' }, { key, value: 'bolt' }], 'invalid_request:duplicate_key');
  rejects([], 'invalid_request:changes');
  // Atomic: one bad entry applies nothing.
  assert.throws(() => commit(seed, [{ key, value: 'wand' }, { key: 'nope', value: 'x' }]));
}

// 10. Sortie (Spec 9.1.3, 3-2-2): the same refusals and reducer sequence as pressing the Sortie button, and a party-cycle reset
// returned as a write for the runtime to apply after the durable commit.
{
  const at = Date.parse('2026-01-01T00:00:00.000Z');
  const withParty = (state: GameState, changes: Record<string, unknown>) => ({ ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, ...changes } : party) }) as GameState;
  const charged = withParty(seed, { instantExpeditionStock: 3, instantExpeditionChargeStartedAt: null });
  const cycles: Record<number, { state: string; isCurrentExpeditionGodsBattle?: boolean }> = {};
  const context = (overrides: Partial<ApiV1CommitContext> = {}) => baseContext({
    simulatedAt: at, partyCycle: (index) => cycles[index], restDurationMs: () => 12_345, chargeDurationScale: 1, now: () => 777, ...overrides,
  });
  const sortie = (state: GameState, ctx: ApiV1CommitContext = context(), operation = 'commit/expedition/1/sortie') => applyApiV1Commit(operation, state, {}, ctx);
  const refuses = (state: GameState, marker: string, operation = 'commit/expedition/1/sortie', ctx: ApiV1CommitContext = context()) => assert.throws(() => sortie(state, ctx, operation), new RegExp(`illegal_action:${marker}`), marker);

  // A legal sortie consumes exactly one stock, restores HP, and resets the cycle to the beginning of rest.
  const ok = sortie(charged);
  assert.equal(ok.state.parties[0].instantExpeditionStock, 2, 'one stock is consumed');
  assert.deepEqual(ok.partyCycleWrites, [{ partyIndex: 0, cycle: { state: 'rest', stateStartedAt: 777, durationMs: 12_345, restInitialTotalSteps: 1, isCurrentExpeditionGodsBattle: false } }]);
  assert.match(String((ok.data as { logId: string }).logId), /^(latest|diary:.+)$/);
  assert.ok(['Clear', 'Return', 'Draw', 'Retreat', 'Defeat'].includes(String((ok.data as { outcome: string }).outcome)));
  assert.equal(charged.parties[0].instantExpeditionStock, 3, 'the input snapshot is untouched');

  // No charge, no expedition (the button refuses too).
  refuses(withParty(seed, { instantExpeditionStock: 0, instantExpeditionChargeStartedAt: at }), 'charge_insufficient');
  // The consumption follows the current Speed of Time: a 20x speed-up charges a slower clock the same way the UI passes its scale.
  const scaled = sortie(charged, context({ chargeDurationScale: 0.05 }));
  assert.equal(scaled.state.parties[0].instantExpeditionStock, 2);
  // A destination whose entry gate is locked refuses (the button is disabled), except for the Colosseum.
  refuses(withParty(charged, { selectedDungeonId: 2 }), 'entry_gate_locked');
  // An exhausted party refuses; the Colosseum needs neither HP nor charge.
  refuses(withParty(charged, { currentHp: 0 }), 'party_exhausted');
  const colosseum = sortie(withParty(seed, { selectedDungeonId: 99, currentHp: 0, instantExpeditionStock: 0, instantExpeditionChargeStartedAt: at }));
  assert.ok(colosseum.state.parties[0].lastExpeditionLog, 'the Colosseum sortie ran');
  // A Gods Battle needs its gate.
  refuses(charged, 'gods_battle_unavailable', 'commit/expedition/1/godsBattle');
  // Exploring: the current exploration is finalized first (its pending Diary entry is settled), then the cycle is reset.
  cycles[0] = { state: 'explore' };
  const exploring = sortie(charged);
  assert.equal(exploring.state.parties[0].pendingDiaryLog, null, 'the pending Diary entry is finalized');
  assert.equal(exploring.partyCycleWrites?.[0].cycle.state, 'rest');
  // Gods Battle: available once the boss was defeated and the gate is filled; it cancels the party's side quest, and a party
  // already moving to a Gods Battle refuses a second one.
  {
    const { getGodsBattleProgressKey } = await import('../../src/game/clearGateCore');
    const ready = withParty(charged, {
      defeatedBossExpeditions: { 1: true },
      clearGateProgress: { ...charged.parties[0].clearGateProgress, [getGodsBattleProgressKey(1)]: 3 },
      selectedDungeonId: 1,
      sideQuest: { id: 1, type: 'q.exercise', target: 5, progress: 0, deadline: at + 1e9, startedAt: at, reward: { jewelRank: 1 } },
    });
    cycles[0] = { state: 'move', isCurrentExpeditionGodsBattle: true };
    refuses(ready, 'already_moving_to_gods_battle', 'commit/expedition/1/godsBattle');
    cycles[0] = { state: 'move', isCurrentExpeditionGodsBattle: false };
    const god = sortie(ready, context(), 'commit/expedition/1/godsBattle');
    assert.equal(god.state.parties[0].sideQuest, null, 'a Gods Battle cancels the side quest');
    assert.equal(god.state.parties[0].instantExpeditionStock, 2);
    assert.equal(god.partyCycleWrites?.[0].cycle.isCurrentExpeditionGodsBattle, false);
    // A plain sortie leaves the side quest alone.
    assert.ok(sortie(ready).state.parties[0].sideQuest, 'a normal sortie keeps the side quest');
    delete cycles[0];
  }
  // Without a runtime (an API account), nothing is read and no write is returned.
  const accountContext = baseContext({ simulatedAt: at, chargeDurationScale: 1 });
  const account = sortie(charged, accountContext);
  assert.deepEqual(account.partyCycleWrites, [], 'an API account has no live cycle to reset');
  assert.equal(account.state.parties[0].instantExpeditionStock, 2);
}

// changeExpedition validates the whole request against the shared choices (Spec 9.1.3, 3-2-1) and applies nothing on rejection.
{
  const { buildApiV1ReadData } = await import('../../src/api/v1/readModels');
  const change = (state: GameState, parameters: Record<string, unknown>, context = baseContext()) => applyApiV1Commit('commit/expedition/1/changeExpedition', state, parameters, context);
  const rejects = (state: GameState, parameters: Record<string, unknown>, marker: string, context = baseContext()) => assert.throws(() => change(state, parameters, context), new RegExp(marker), JSON.stringify(parameters));
  const defeated = { ...seed, parties: seed.parties.map((party, index) => index === 0 ? { ...party, defeatedBossExpeditions: { 1: true } } : party) } as GameState;

  // Only the first destination is unlocked in a fresh game; the second opens once the first boss was defeated.
  rejects(seed, { destination: 2 }, 'illegal_action:destination_locked');
  rejects(seed, { destination: 999 }, 'invalid_destination');
  rejects(seed, { destination: 99 }, 'illegal_action:destination_locked');
  assert.equal(change(defeated, { destination: 2 }).state.parties[0].selectedDungeonId, 2);
  // The Colosseum needs its Debug setting: the runtime's for the player, the API debug settings for an account.
  assert.equal(change(seed, { destination: 99 }, baseContext({ colosseumEnabled: true })).state.parties[0].selectedDungeonId, 99);
  assert.equal(change(seed, { destination: 99 }, baseContext({ settings: { debug: { colosseumMode: true } } })).state.parties[0].selectedDungeonId, 99);
  rejects(seed, { destination: 99 }, 'illegal_action:destination_locked', baseContext({ colosseumEnabled: false, settings: { debug: { colosseumMode: true } } }));

  // Depth limits are the fixed list; the difficulty offset is an even step, and only after the destination's boss was defeated.
  rejects(seed, { depthLimit: '7f-1' }, 'invalid_depth_limit');
  assert.equal(change(seed, { depthLimit: '3f-4' }).state.parties[0].expeditionDepthLimit, '3f-4');
  rejects(seed, { difficultyOffset: 3 }, 'invalid_difficulty_offset');
  rejects(seed, { difficultyOffset: -2 }, 'invalid_difficulty_offset');
  rejects(seed, { difficultyOffset: 2 }, 'illegal_action:difficulty_offset_unavailable');
  assert.equal(change(defeated, { difficultyOffset: 6 }).state.parties[0].expeditionDifficultyOffset, 6);
  rejects(defeated, { difficultyOffset: 998 }, 'illegal_action:difficulty_offset_unavailable');
  // A destination and its offset are one request: the offset is checked against the destination the change leaves the party at.
  rejects(defeated, { destination: 2, difficultyOffset: 2 }, 'illegal_action:difficulty_offset_unavailable');
  // Atomic: one invalid member rejects the valid ones too.
  rejects(defeated, { depthLimit: '3f-4', difficultyOffset: 1 }, 'invalid_difficulty_offset');
  assert.equal(defeated.parties[0].expeditionDepthLimit, seed.parties[0].expeditionDepthLimit, 'nothing was applied');

  // The setting projection offers exactly what the commit accepts.
  const read = async (state: GameState, extra: Record<string, unknown> = {}) => (await buildApiV1ReadData('read/expedition/1/setting', state, {}, { environment: 'dev', gameMode: 'mode.normal', enemyLevelOffset: 0, revision: 1, inGameTime: 0, ...extra } as never) as { validOptions: { destination: number[]; depthLimit: string[]; difficultyOffset: { min: number; max: number; step: number } } }).validOptions;
  const fresh = await read(seed);
  assert.deepEqual(fresh.destination, [1]);
  assert.deepEqual(fresh.difficultyOffset, { min: 0, max: 0, step: 2 }, 'no difficulty until the boss is defeated');
  const opened = await read(defeated);
  assert.deepEqual(opened.destination, [1, 2]);
  assert.ok(opened.difficultyOffset.max > 0 && opened.difficultyOffset.max % 2 === 0);
  assert.ok((await read(seed, { colosseumEnabled: true })).destination.includes(99));
  for (const destination of opened.destination) assert.doesNotThrow(() => change(defeated, { destination }), `offered destination ${destination} is accepted`);
  for (const depthLimit of opened.depthLimit) assert.doesNotThrow(() => change(defeated, { depthLimit }), depthLimit);
  assert.doesNotThrow(() => change(defeated, { difficultyOffset: opened.difficultyOffset.max }), 'the offered maximum is accepted');
}

// resetStatistics restores the party's expedition statistics to their defaults and touches nothing else (Spec 9.1.3, 3-2-4).
{
  const played = { ...seed, parties: seed.parties.map((party, index) => index === 0
    ? { ...party, expeditionStats: { ...party.expeditionStats, Clear: 5, Return: 3, Defeat: 2, donatedGold: 900, savedGold: 400 } as never }
    : party) } as GameState;
  const reset = applyApiV1Commit('commit/expedition/1/resetStatistics', played, {}, baseContext());
  assert.deepEqual(reset.data, {});
  assert.deepEqual(reset.state.parties[0].expeditionStats, seed.parties[0].expeditionStats, 'the statistics are back to their defaults');
  assert.equal(reset.state.parties[0].currentHp, played.parties[0].currentHp);
  assert.equal(reset.state.global, played.global, 'nothing outside the party changes');
  assert.notDeepEqual(played.parties[0].expeditionStats, seed.parties[0].expeditionStats, 'the fixture really differed');
  assert.throws(() => applyApiV1Commit('commit/expedition/9/resetStatistics', played, {}, baseContext()), /not_found/);
}

// A real, freshly resolved expedition (a compact, language-neutral record) renders from the `latestBattleLog` response alone
// exactly as the retained record itself does: names, gate and reward text, the Bestiary snapshot, and the whole narration.
{
  const { buildApiV1ReadData } = await import('../../src/api/v1/readModels');
  const { publicEnemySnapshot } = await import('../../src/api/v1/enemyStatus');
  const { buildExpeditionLogView } = await import('../../src/api/v1/expeditionLogView');
  const { renderExpeditionMetadata, renderDiaryBattle } = await import('../../src/game/compactDiary');
  const at = Date.parse('2026-01-01T00:00:00.000Z');
  const charged = { ...seed, parties: seed.parties.map((party, index) => index === 0 ? { ...party, instantExpeditionStock: 3, instantExpeditionChargeStartedAt: null } : party) } as GameState;
  const played = applyApiV1Commit('commit/expedition/1/sortie', charged, {}, baseContext({ simulatedAt: at, chargeDurationScale: 1 })).state;
  const party = played.parties[0];
  const retained = party.lastExpeditionLog!;
  assert.equal(retained.compactVersion, 1, 'a new expedition is a compact record');
  assert.ok(retained.entries.some((entry) => entry.compactBattle), 'it retains compact battles');
  const response = await buildApiV1ReadData('read/expedition/1/latestBattleLog', played, {}, { environment: 'dev', gameMode: 'mode.normal', enemyLevelOffset: 0, revision: 1, inGameTime: at } as never) as never;
  const view = buildExpeditionLogView(response)!;
  const expected = renderExpeditionMetadata(retained);
  assert.equal(view.entries.length, expected.entries.length);
  expected.entries.forEach((entry, index) => {
    const actual = view.entries[index];
    assert.equal(actual.enemyName, entry.enemyName, `room ${entry.room} name`);
    assert.equal(actual.gateInfo, entry.gateInfo, `room ${entry.room} gate`);
    assert.equal(actual.reward, entry.reward, `room ${entry.room} reward`);
    assert.equal(Boolean(actual.godsBattle), Boolean(entry.godsBattle));
    assert.deepEqual(actual.enemySnapshot ?? null, entry.enemySnapshot ? publicEnemySnapshot(entry.enemySnapshot) : null, `room ${entry.room} snapshot`);
    assert.deepEqual(renderDiaryBattle(actual, party.characters), renderDiaryBattle(entry, party.characters), `room ${entry.room} narration`);
    assert.deepEqual(actual.endEvents ?? [], entry.endEvents ?? [], `room ${entry.room} end events`);
  });
  const text = JSON.stringify(response);
  for (const banned of ['seedHex', 'replayMetadata', 'randomDrawCount']) assert.equal(text.includes(banned), false, `${banned} is not published`);
}

console.log('apiV1CommitOperations profile ok');
