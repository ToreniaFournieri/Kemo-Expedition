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
  | { type: 'ATTACH_JEWEL'; characterId: number; slotIndex: number; jewelKey: JewelKey; rank: number; partyIndex: number };

export interface AutoEquipmentAttributionResult {
  totalMs: number;
  unclassifiedMs: number;
  phasesMs: Record<AutoEquipmentAttributionPhase, number>;
  inventoryEntriesVisited: number;
  inventoryIndexEntries: number;
  rankingCandidates: number;
  dispatchedActions: number;
}

export interface AutoEquipmentReducerAttribution {
  partyStatsMs: number;
  inventoryMutationMs: number;
  structuralAndControlMs: number;
  partyStatsCalls: number;
}

export interface AutoEquipmentAttributionCollector {
  measure<T>(phase: AutoEquipmentAttributionPhase, operation: () => T): T;
  addInventoryEntries(count: number): void;
  addInventoryIndexEntries(count: number): void;
  addRankingCandidates(count: number): void;
  addDispatchedAction(): void;
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
