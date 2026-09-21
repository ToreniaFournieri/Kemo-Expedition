import { computeCharacterStats } from '../../game/characterComputation';
import { createEquipmentSetSnapshot, evaluateEquipmentState, getSavedEquipmentSlot } from '../../game/equipmentSets';
import type { GameState, SavedEquipmentSet } from '../../types';

// SpecRef: 8.2.4 | Equipment management | Undo and Redo
// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Action availability
// One availability computation shared by the equipment commit responses and the equipment read model.

export interface EquipmentHistoryBag { undo: SavedEquipmentSet[]; redo: SavedEquipmentSet[] }
export interface ActionAvailability { available: boolean; unavailableReason: string | null }
/** Up to 30 restorable states, most recent first (the order repeated Undo or Redo restores them). */
export interface EquipmentHistoryAction extends ActionAvailability { equipmentStates: string[][] }

/** One state as Equipment Entry strings (`slot/lock/itemId/enhancement/superRare[/jewelType:jewelRank]`) for its equipped slots. */
function formatEquipmentState(state: SavedEquipmentSet): string[] {
  return state.equipment.map((entry, index) =>
    `${getSavedEquipmentSlot(entry, index)}/${entry.isLocked ? 1 : 0}/${entry.item.id}/${entry.item.enhancement}/${entry.item.superRare}${entry.item.jewel ? `/${entry.item.jewel.key}:${entry.item.jewel.rank}` : ''}`);
}

/** The comparable snapshot of one character's equipment: exact items, slots, locks, and Jewel assignment (Spec 9.1.3, 2-3-3). */
export function snapshotCharacterEquipment(equipment: Parameters<typeof createEquipmentSetSnapshot>[0], createdAt: number): SavedEquipmentSet {
  return { ...createEquipmentSetSnapshot(equipment, true), name: 'API history', createdAt };
}

export function sameEquipmentSnapshot(left: SavedEquipmentSet, right: SavedEquipmentSet): boolean {
  return JSON.stringify(left.equipment) === JSON.stringify(right.equipment);
}

export function describeEquipmentHistory(
  state: GameState,
  characterId: number,
  histories: Record<string, EquipmentHistoryBag> | undefined,
): { undoEquipment: EquipmentHistoryAction; redoEquipment: EquipmentHistoryAction } {
  const party = state.parties.find((candidate) => candidate.characters.some((character) => character.id === characterId));
  const character = party?.characters.find((candidate) => candidate.id === characterId);
  if (!party || !character) throw new Error('not_found');
  const history = histories?.[String(characterId)] ?? { undo: [], redo: [] };
  const current = snapshotCharacterEquipment(character.equipment, 0);
  const maxSlots = computeCharacterStats(character, party.level).maxEquipSlots;
  const describe = (states: readonly SavedEquipmentSet[], label: 'undo' | 'redo'): EquipmentHistoryAction => {
    // Stored oldest-first; the next state to restore is the last one.
    const equipmentStates = [...states].reverse().map(formatEquipmentState);
    const next = states.at(-1);
    if (!next) return { equipmentStates, available: false, unavailableReason: `No ${label} history.` };
    if (sameEquipmentSnapshot(next, current)) return { equipmentStates, available: false, unavailableReason: `The ${label} target matches the current equipment.` };
    if (!evaluateEquipmentState(next, character, state.global.inventory, state.global.jewels, maxSlots).allAvailable) {
      return { equipmentStates, available: false, unavailableReason: `The ${label} target contains unavailable items or Jewels.` };
    }
    return { equipmentStates, available: true, unavailableReason: null };
  };
  return { undoEquipment: describe(history.undo, 'undo'), redoEquipment: describe(history.redo, 'redo') };
}
