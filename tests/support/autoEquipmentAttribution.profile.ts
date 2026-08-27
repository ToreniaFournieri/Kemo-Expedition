import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  createAutoEquipmentAttributionCollector,
  createAutoEquipmentProfileState,
  createAutoEquipmentReducerAttribution,
  type AutoEquipmentProfileAction,
} from '../../src/game/autoEquipmentAttribution.ts';
import { hydrateGameState, serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import {
  computePartyMaxHp,
  computePartyStats,
  createPartyMaxHpLedger,
  updatePartyMaxHpLedger,
} from '../../src/game/partyComputation.ts';
import { JEWELS_BY_ITEM_CATEGORY } from '../../src/game/jewel.ts';
import {
  applyAutoEquipmentProfileActions,
  applyAutoEquipmentProfileActionsSequentially,
} from '../../src/hooks/useGameState.ts';
import type { GameState } from '../../src/types.ts';

function loadFixture(): GameState {
  const envelope = JSON.parse(readFileSync(
    resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'),
    'utf8',
  )) as { saveDataCompressed: string };
  return hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
}

test('automatic-equipment attribution workloads are isolated deterministic fixture variants', () => {
  const fixture = loadFixture();
  const originalMode = fixture.parties[0].characters[0].autoEquipmentMode;
  const noOp = createAutoEquipmentProfileState(fixture, 'no_op');
  const maxInventory = createAutoEquipmentProfileState(fixture, 'max_inventory');

  assert.ok(noOp.parties.every((party) => party.characters.every((character) => character.autoEquipmentMode === 0)));
  assert.ok(Object.keys(maxInventory.global.inventory).length > Object.keys(fixture.global.inventory).length);
  assert.notEqual(noOp, fixture);
  assert.equal(fixture.parties[0].characters[0].autoEquipmentMode, originalMode);
});

test('HP-only party computation is exact for every save-backed party', () => {
  const state = loadFixture();
  for (const party of state.parties) {
    assert.equal(computePartyMaxHp(party), computePartyStats(party).partyStats.hp);
  }
});

test('incremental HP ledger rebuilds on party-wide HP input changes', () => {
  const previousParty = structuredClone(loadFixture().parties[0]);
  const nextParty = { ...previousParty, level: previousParty.level + 1 };
  const changedCharacterId = previousParty.characters[0].id;
  const update = updatePartyMaxHpLedger(
    createPartyMaxHpLedger(previousParty),
    previousParty,
    nextParty,
    changedCharacterId,
  );
  assert.equal(update.rebuilt, true);
  assert.equal(update.ledger.maxHp, computePartyStats(nextParty).partyStats.hp);
});

test('batched automatic-equipment reducer is byte-identical to sequential actions', () => {
  const state = createAutoEquipmentProfileState(loadFixture(), 'full_rebuild');
  const actions: AutoEquipmentProfileAction[] = [];
  state.parties.forEach((party, partyIndex) => {
    party.characters.forEach((character) => {
      character.equipment.forEach((item, slotIndex) => {
        if (!item) return;
        actions.push({ type: 'EQUIP_ITEM', characterId: character.id, slotIndex, itemKey: null, partyIndex });
      });
    });
  });

  const sequential = applyAutoEquipmentProfileActionsSequentially(state, actions);
  const expected = JSON.stringify(serializeGameState(sequential));
  for (const strategy of ['legacy_full_party', 'whole_party_max_hp', 'incremental_hp'] as const) {
    const batched = applyAutoEquipmentProfileActions(state, actions, undefined, strategy);
    assert.equal(JSON.stringify(serializeGameState(batched)), expected);
  }
});

test('batched reducer preserves mixed inventory, upgrade, and Jewel action semantics', () => {
  const state = createAutoEquipmentProfileState(loadFixture(), 'max_inventory');
  const serializedSource = JSON.stringify(serializeGameState(state));
  const partyIndex = 0;
  const character = state.parties[partyIndex].characters[0];
  const swordEntry = Object.entries(state.global.inventory).find(([, variant]) => (
    variant.status === 'owned' && variant.count > 0 && variant.item.category === 'sword'
  ));
  assert.ok(swordEntry);
  state.global.jewels['might:1'] = Math.max(2, state.global.jewels['might:1'] ?? 0);
  const actions: AutoEquipmentProfileAction[] = [
    { type: 'EQUIP_ITEM', characterId: character.id, slotIndex: 0, itemKey: swordEntry[0], partyIndex },
    { type: 'ATTACH_JEWEL', characterId: character.id, slotIndex: 0, jewelKey: 'might', rank: 1, partyIndex },
    { type: 'EQUIP_ITEM', characterId: character.id, slotIndex: 0, itemKey: null, partyIndex },
  ];
  const reducerAttribution = createAutoEquipmentReducerAttribution();

  const batched = applyAutoEquipmentProfileActions(state, actions, reducerAttribution);
  const eagerCloneAttribution = createAutoEquipmentReducerAttribution();
  const eagerCloneCandidate = applyAutoEquipmentProfileActions(
    state,
    actions,
    eagerCloneAttribution,
    'incremental_hp',
    'legacy_eager_clone',
  );
  const copyOnceAttribution = createAutoEquipmentReducerAttribution();
  const copyOnceCandidate = applyAutoEquipmentProfileActions(
    state,
    actions,
    copyOnceAttribution,
    'incremental_hp',
    'copy_once_transaction',
  );
  const sequential = applyAutoEquipmentProfileActionsSequentially(state, actions);

  assert.equal(JSON.stringify(serializeGameState(batched)), JSON.stringify(serializeGameState(sequential)));
  assert.equal(JSON.stringify(serializeGameState(eagerCloneCandidate)), JSON.stringify(serializeGameState(sequential)));
  assert.equal(JSON.stringify(serializeGameState(copyOnceCandidate)), JSON.stringify(serializeGameState(sequential)));
  assert.equal(JSON.stringify(serializeGameState(state)), serializedSource);
  assert.equal(reducerAttribution.partyStatsCalls, 0);
  assert.equal(reducerAttribution.partyMaxHpCalls, 0);
  assert.equal(reducerAttribution.hpLedgerInitializations, 1);
  assert.equal(reducerAttribution.hpLedgerUpdates, actions.length);
  assert.equal(reducerAttribution.hpLedgerRebuilds, 0);
  assert.equal(reducerAttribution.characterHpContributionCalls, state.parties[partyIndex].characters.length + actions.length);
  assert.equal(reducerAttribution.eagerInventoryRecordClones, 0);
  assert.equal(reducerAttribution.eagerJewelRecordClones, 0);
  assert.equal(reducerAttribution.transactionInventoryRecordClones, 1);
  assert.equal(reducerAttribution.transactionJewelRecordClones, 1);
  assert.equal(reducerAttribution.inventoryMutationRecordClones, 0);
  assert.equal(reducerAttribution.jewelMutationRecordClones, 0);
  assert.equal(reducerAttribution.appliedEquipmentActions, 2);
  assert.equal(reducerAttribution.appliedJewelActions, 1);
  assert.equal(eagerCloneAttribution.eagerInventoryRecordClones, 2);
  assert.equal(eagerCloneAttribution.eagerJewelRecordClones, 2);
  assert.equal(copyOnceAttribution.transactionInventoryRecordClones, 1);
  assert.equal(copyOnceAttribution.transactionJewelRecordClones, 1);
  assert.equal(copyOnceAttribution.inventoryMutationRecordClones, 0);
  assert.equal(copyOnceAttribution.jewelMutationRecordClones, 0);
  assert.ok(reducerAttribution.partyStatsMs >= 0);
  assert.ok(reducerAttribution.inventoryPreparationMs >= 0);
  assert.ok(reducerAttribution.inventoryMutationMs >= 0);
  assert.ok(reducerAttribution.jewelMutationMs >= 0);
  assert.ok(reducerAttribution.structuralAndControlMs >= 0);
});

test('HP strategies preserve every damaged-party intermediate state', () => {
  const state = createAutoEquipmentProfileState(loadFixture(), 'max_inventory');
  const partyIndex = 0;
  const character = state.parties[partyIndex].characters.find((candidate) => candidate.equipment.some(Boolean));
  assert.ok(character);
  const slotIndex = character.equipment.findIndex(Boolean);
  const item = character.equipment[slotIndex];
  assert.ok(item);
  const jewelKey = JEWELS_BY_ITEM_CATEGORY[item.category].find((key) => key !== 'might');
  assert.ok(jewelKey);
  state.parties[partyIndex].currentHp = 1;
  state.global.jewels[`${jewelKey}:8`] = Math.max(2, state.global.jewels[`${jewelKey}:8`] ?? 0);
  const actions: AutoEquipmentProfileAction[] = [
    { type: 'ATTACH_JEWEL', characterId: character.id, slotIndex, jewelKey, rank: 8, partyIndex },
    { type: 'EQUIP_ITEM', characterId: character.id, slotIndex, itemKey: null, partyIndex },
  ];

  for (let actionCount = 1; actionCount <= actions.length; actionCount += 1) {
    const prefix = actions.slice(0, actionCount);
    const sequential = applyAutoEquipmentProfileActionsSequentially(state, prefix);
    const expected = JSON.stringify(serializeGameState(sequential));
    for (const strategy of ['legacy_full_party', 'whole_party_max_hp', 'incremental_hp'] as const) {
      const candidate = applyAutoEquipmentProfileActions(state, prefix, undefined, strategy);
      assert.equal(JSON.stringify(serializeGameState(candidate)), expected);
    }
    const eagerCloneCandidate = applyAutoEquipmentProfileActions(
      state,
      prefix,
      undefined,
      'incremental_hp',
      'legacy_eager_clone',
    );
    assert.equal(JSON.stringify(serializeGameState(eagerCloneCandidate)), expected);
    const copyOnceCandidate = applyAutoEquipmentProfileActions(
      state,
      prefix,
      undefined,
      'incremental_hp',
      'copy_once_transaction',
    );
    assert.equal(JSON.stringify(serializeGameState(copyOnceCandidate)), expected);
  }
});

test('empty automatic-equipment batches perform no reducer allocation work', () => {
  const state = loadFixture();
  const attribution = createAutoEquipmentReducerAttribution();
  const result = applyAutoEquipmentProfileActions(state, [], attribution);

  assert.equal(result, state);
  assert.equal(attribution.eagerInventoryRecordClones, 0);
  assert.equal(attribution.eagerJewelRecordClones, 0);
  assert.equal(attribution.transactionInventoryRecordClones, 0);
  assert.equal(attribution.transactionJewelRecordClones, 0);
  assert.equal(attribution.inventoryMutationRecordClones, 0);
  assert.equal(attribution.jewelMutationRecordClones, 0);
  assert.equal(attribution.appliedEquipmentActions, 0);
  assert.equal(attribution.appliedJewelActions, 0);
});

test('automatic-equipment attribution records bounded phase and workload counters', () => {
  const collector = createAutoEquipmentAttributionCollector();
  collector.measure('inventoryScan', () => 1);
  collector.addInventoryEntries(12);
  collector.addRankingCandidates(3);
  collector.addDispatchedAction();
  const result = collector.finish(10);

  assert.equal(result.inventoryEntriesVisited, 12);
  assert.equal(result.rankingCandidates, 3);
  assert.equal(result.dispatchedActions, 1);
  assert.ok(result.phasesMs.inventoryScan >= 0);
  assert.ok(result.unclassifiedMs >= 0 && result.unclassifiedMs <= result.totalMs);
});
