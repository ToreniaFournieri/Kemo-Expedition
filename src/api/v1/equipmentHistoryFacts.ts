import { computeCharacterStats } from '../../game/characterComputation';
import { createEquipmentSetSnapshot, evaluateEquipmentSet } from '../../game/equipmentSets';
import type { GameState, SavedEquipmentSet } from '../../types';

// SpecRef: 8.2.4 | Equipment management | Undo and Redo
// SpecRef: 9.1.4.14 | Parameter and payload schema conventions | Action availability
// One availability computation shared by the equipment commit responses and the equipment read model.

export interface EquipmentHistoryBag { undo: SavedEquipmentSet[]; redo: SavedEquipmentSet[] }
export interface ActionAvailability { available: boolean; unavailableReason: string | null }

/** The comparable snapshot of one character's equipment (exact items, slots, Jewels, and locks). */
export function snapshotCharacterEquipment(equipment: Parameters<typeof createEquipmentSetSnapshot>[0], createdAt: number): SavedEquipmentSet {
  return { ...createEquipmentSetSnapshot(equipment), name: 'API history', createdAt };
}

export function sameEquipmentSnapshot(left: SavedEquipmentSet, right: SavedEquipmentSet): boolean {
  return JSON.stringify(left.equipment) === JSON.stringify(right.equipment);
}

export function describeEquipmentHistory(
  state: GameState,
  characterId: number,
  histories: Record<string, EquipmentHistoryBag> | undefined,
): { undoEquipment: ActionAvailability; redoEquipment: ActionAvailability } {
  const party = state.parties.find((candidate) => candidate.characters.some((character) => character.id === characterId));
  const character = party?.characters.find((candidate) => candidate.id === characterId);
  if (!party || !character) throw new Error('not_found');
  const history = histories?.[String(characterId)] ?? { undo: [], redo: [] };
  const current = snapshotCharacterEquipment(character.equipment, 0);
  const maxSlots = computeCharacterStats(character, party.level).maxEquipSlots;
  const describe = (target: SavedEquipmentSet | undefined): ActionAvailability => {
    if (!target) return { available: false, unavailableReason: 'noHistory' };
    if (sameEquipmentSnapshot(target, current)) return { available: false, unavailableReason: 'noChange' };
    if (!evaluateEquipmentSet(target, character, state.global.inventory, maxSlots, state.global.jewels).allAvailable) return { available: false, unavailableReason: 'itemsUnavailable' };
    return { available: true, unavailableReason: null };
  };
  return { undoEquipment: describe(history.undo.at(-1)), redoEquipment: describe(history.redo.at(-1)) };
}
