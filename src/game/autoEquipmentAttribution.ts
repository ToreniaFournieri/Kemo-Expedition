import { ITEMS } from '../data/items';
import { type GameState, getVariantKey, type Item, type JewelKey } from '../types';

export type AutoEquipmentProfileWorkload =
  | 'no_op'
  | 'upgrade_heavy'
  | 'full_rebuild'
  | 'locked_equipment'
  | 'jewel_priority'
  | 'max_inventory';

export type AutoEquipmentProfileScope = 'all_parties' | 'party_1' | 'character_1';

/** Keeps deterministic workload hashes stable across metadata-only application build increments. */
export const AUTO_EQUIPMENT_PROFILE_HASH_BUILD_NUMBER = 56;

export type AutoEquipmentAttributionPhase =
  | 'inventoryClone'
  | 'inventoryIndexBuild'
  | 'inventoryScan'
  | 'nativeRanking'
  | 'statComputation'
  | 'jewelPlanning'
  | 'notificationPlanning'
  | 'actionDispatch'
  | 'reducerApplication';

export type AutoEquipmentProfileAction =
  | { type: 'EQUIP_ITEM'; characterId: number; slotIndex: number; itemKey: string | null; partyIndex: number }
  | { type: 'ATTACH_JEWEL'; characterId: number; slotIndex: number; jewelKey: JewelKey; rank: number; partyIndex: number }
  | { type: 'STAMP_FULL_AUTO_EQUIPMENT'; partyIndex: number; equipmentRevision: number; jewelRevision: number };

export interface AutoEquipmentAttributionResult {
  totalMs: number;
  unclassifiedMs: number;
  phasesMs: Record<AutoEquipmentAttributionPhase, number>;
  inventoryEntriesVisited: number;
  inventoryIndexEntries: number;
  rankingCandidates: number;
  dispatchedActions: number;
  itemFactComputations: number;
  itemFactCacheHits: number;
  characterCategoryMultiplierComputations: number;
  characterCategoryMultiplierCacheHits: number;
}

export interface AutoEquipmentReducerAttribution {
  partyStatsMs: number;
  inventoryPreparationMs: number;
  inventoryMutationMs: number;
  jewelMutationMs: number;
  structuralAndControlMs: number;
  partyStatsCalls: number;
  partyMaxHpCalls: number;
  characterStatsCalls: number;
  characterHpContributionCalls: number;
  hpLedgerInitializations: number;
  hpLedgerUpdates: number;
  hpLedgerRebuilds: number;
  eagerInventoryRecordClones: number;
  eagerJewelRecordClones: number;
  transactionInventoryRecordClones: number;
  transactionJewelRecordClones: number;
  inventoryMutationRecordClones: number;
  jewelMutationRecordClones: number;
  appliedEquipmentActions: number;
  appliedJewelActions: number;
}

export type AutoEquipmentHpStrategy = 'legacy_full_party' | 'whole_party_max_hp' | 'incremental_hp';
export type AutoEquipmentStateStrategy = 'legacy_eager_clone' | 'reuse_immutable_inputs' | 'copy_once_transaction';

export function createAutoEquipmentReducerAttribution(): AutoEquipmentReducerAttribution {
  return {
    partyStatsMs: 0,
    inventoryPreparationMs: 0,
    inventoryMutationMs: 0,
    jewelMutationMs: 0,
    structuralAndControlMs: 0,
    partyStatsCalls: 0,
    partyMaxHpCalls: 0,
    characterStatsCalls: 0,
    characterHpContributionCalls: 0,
    hpLedgerInitializations: 0,
    hpLedgerUpdates: 0,
    hpLedgerRebuilds: 0,
    eagerInventoryRecordClones: 0,
    eagerJewelRecordClones: 0,
    transactionInventoryRecordClones: 0,
    transactionJewelRecordClones: 0,
    inventoryMutationRecordClones: 0,
    jewelMutationRecordClones: 0,
    appliedEquipmentActions: 0,
    appliedJewelActions: 0,
  };
}

export interface AutoEquipmentAttributionCollector {
  measure<T>(phase: AutoEquipmentAttributionPhase, operation: () => T): T;
  addInventoryEntries(count: number): void;
  addInventoryIndexEntries(count: number): void;
  addRankingCandidates(count: number): void;
  addDispatchedAction(): void;
  addItemFactComputation(): void;
  addItemFactCacheHit(): void;
  addCharacterCategoryMultiplierComputation(): void;
  addCharacterCategoryMultiplierCacheHit(): void;
  finish(totalMs: number): AutoEquipmentAttributionResult;
}

export function createAutoEquipmentAttributionCollector(): AutoEquipmentAttributionCollector {
  const phasesMs: Record<AutoEquipmentAttributionPhase, number> = {
    inventoryClone: 0,
    inventoryIndexBuild: 0,
    inventoryScan: 0,
    nativeRanking: 0,
    statComputation: 0,
    jewelPlanning: 0,
    notificationPlanning: 0,
    actionDispatch: 0,
    reducerApplication: 0,
  };
  let inventoryEntriesVisited = 0;
  let inventoryIndexEntries = 0;
  let rankingCandidates = 0;
  let dispatchedActions = 0;
  let itemFactComputations = 0;
  let itemFactCacheHits = 0;
  let characterCategoryMultiplierComputations = 0;
  let characterCategoryMultiplierCacheHits = 0;

  return {
    measure<T>(phase: AutoEquipmentAttributionPhase, operation: () => T): T {
      const startedAt = performance.now();
      try {
        return operation();
      } finally {
        phasesMs[phase] += Math.max(0, performance.now() - startedAt);
      }
    },
    addInventoryEntries(count: number) {
      inventoryEntriesVisited += Math.max(0, Math.floor(count));
    },
    addInventoryIndexEntries(count: number) {
      inventoryIndexEntries += Math.max(0, Math.floor(count));
    },
    addRankingCandidates(count: number) {
      rankingCandidates += Math.max(0, Math.floor(count));
    },
    addDispatchedAction() {
      dispatchedActions += 1;
    },
    addItemFactComputation() {
      itemFactComputations += 1;
    },
    addItemFactCacheHit() {
      itemFactCacheHits += 1;
    },
    addCharacterCategoryMultiplierComputation() {
      characterCategoryMultiplierComputations += 1;
    },
    addCharacterCategoryMultiplierCacheHit() {
      characterCategoryMultiplierCacheHits += 1;
    },
    finish(totalMs: number) {
      const normalizedTotalMs = Math.max(0, totalMs);
      const classifiedMs = Object.values(phasesMs).reduce((sum, value) => sum + value, 0);
      return {
        totalMs: normalizedTotalMs,
        unclassifiedMs: Math.max(0, normalizedTotalMs - classifiedMs),
        phasesMs: { ...phasesMs },
        inventoryEntriesVisited,
        inventoryIndexEntries,
        rankingCandidates,
        dispatchedActions,
        itemFactComputations,
        itemFactCacheHits,
        characterCategoryMultiplierComputations,
        characterCategoryMultiplierCacheHits,
      };
    },
  };
}

const JEWEL_KEYS: JewelKey[] = ['might', 'arcana', 'fort', 'ward', 'shade', 'focus'];

function withCharacterMode(state: GameState, mode: 0 | 1 | 2, locked: boolean | null = null): void {
  state.parties.forEach((party) => {
    party.characters.forEach((character) => {
      character.autoEquipmentMode = mode;
      if (locked === null) return;
      character.equipment = character.equipment.map((item) => (
        item ? { ...item, isLocked: locked } : null
      ));
    });
  });
}

function addUpgradeCandidates(state: GameState): void {
  state.parties.forEach((party) => {
    party.characters.forEach((character) => {
      character.equipment = character.equipment.map((equippedItem) => {
        if (!equippedItem || equippedItem.superRare > 0) return equippedItem;
        const baselineItem: Item = { ...equippedItem, enhancement: 0, jewel: equippedItem.jewel ?? null };
        const upgradeItem: Item = { ...equippedItem, enhancement: 6, jewel: null, isLocked: false };
        state.global.inventory[getVariantKey(upgradeItem)] = {
          item: upgradeItem,
          count: 99,
          status: 'owned',
          isNew: false,
        };
        return baselineItem;
      });
    });
  });
}

function fillMaximumInventory(state: GameState): void {
  ITEMS.forEach((definition) => {
    for (let enhancement = 0; enhancement <= 6; enhancement += 1) {
      const item: Item = { ...definition, enhancement, superRare: 0, jewel: null, isLocked: false };
      state.global.inventory[getVariantKey(item)] = {
        item,
        count: 99,
        status: 'owned',
        isNew: false,
      };
    }
  });
}

export function createAutoEquipmentProfileState(
  source: GameState,
  workload: AutoEquipmentProfileWorkload,
): GameState {
  const state = structuredClone(source);
  state.global.jewelAutoEquipPriorityPartyId = null;

  if (workload === 'no_op') {
    withCharacterMode(state, 0);
  } else if (workload === 'upgrade_heavy') {
    withCharacterMode(state, 1, false);
    addUpgradeCandidates(state);
  } else if (workload === 'full_rebuild') {
    withCharacterMode(state, 2, false);
  } else if (workload === 'locked_equipment') {
    withCharacterMode(state, 2, true);
  } else if (workload === 'jewel_priority') {
    withCharacterMode(state, 0);
    state.global.jewelAutoEquipPriorityPartyId = state.parties[0]?.id ?? null;
    JEWEL_KEYS.forEach((key) => {
      for (let rank = 1; rank <= 8; rank += 1) state.global.jewels[`${key}:${rank}`] = 99;
    });
  } else {
    withCharacterMode(state, 2, false);
    fillMaximumInventory(state);
  }

  return state;
}
