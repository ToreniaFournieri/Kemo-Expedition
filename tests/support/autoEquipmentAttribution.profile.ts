import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  createAutoEquipmentAttributionCollector,
  createAutoEquipmentProfileState,
  type AutoEquipmentProfileAction,
} from '../../src/game/autoEquipmentAttribution.ts';
import { hydrateGameState, serializeGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
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

  const batched = applyAutoEquipmentProfileActions(state, actions);
  const sequential = applyAutoEquipmentProfileActionsSequentially(state, actions);
  assert.equal(JSON.stringify(serializeGameState(batched)), JSON.stringify(serializeGameState(sequential)));
});

test('batched reducer preserves mixed inventory, upgrade, and Jewel action semantics', () => {
  const state = createAutoEquipmentProfileState(loadFixture(), 'max_inventory');
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
  const reducerAttribution = {
    partyStatsMs: 0,
    inventoryMutationMs: 0,
    structuralAndControlMs: 0,
    partyStatsCalls: 0,
  };

  const batched = applyAutoEquipmentProfileActions(state, actions, reducerAttribution);
  const sequential = applyAutoEquipmentProfileActionsSequentially(state, actions);

  assert.equal(JSON.stringify(serializeGameState(batched)), JSON.stringify(serializeGameState(sequential)));
  assert.ok(reducerAttribution.partyStatsCalls >= actions.length);
  assert.ok(reducerAttribution.partyStatsMs >= 0);
  assert.ok(reducerAttribution.inventoryMutationMs >= 0);
  assert.ok(reducerAttribution.structuralAndControlMs >= 0);
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
