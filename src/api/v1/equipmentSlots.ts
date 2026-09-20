import { getJewelOwnedCount, isJewelAllowedForCategory } from '../../game/jewel';
import type { Character, JewelKey } from '../../types';

// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// SpecRef: 3.1.7 | Jewel (結晶) | Item Type → Available Jewel
// Pure, atomic planning for the slot-addressed equipment commands (removeEquipment, lockEquipment, unlockEquipment,
// jewelAttach, jewelRemove). The planner validates the complete request against one snapshot and either throws before
// any state change or returns the ordered reducer actions to apply; the shared UI reducer stays the only mutator.

export type EquipmentSlotAction = 'removeEquipment' | 'lockEquipment' | 'unlockEquipment' | 'jewelAttach' | 'jewelRemove';

export function isEquipmentSlotAction(action: string): action is EquipmentSlotAction {
  return ['removeEquipment', 'lockEquipment', 'unlockEquipment', 'jewelAttach', 'jewelRemove'].includes(action);
}

export type EquipmentSlotReducerAction =
  | { type: 'EQUIP_ITEM'; slotIndex: number; itemKey: null }
  | { type: 'TOGGLE_EQUIPMENT_LOCK'; slotIndex: number }
  | { type: 'ATTACH_JEWEL'; slotIndex: number; jewelKey: JewelKey; rank: number };

const JEWEL_KEYS: readonly JewelKey[] = ['might', 'arcana', 'fort', 'ward', 'shade', 'focus'];
const MAX_JEWEL_RANK = 8;

/** Failure markers: `invalid_request` (shape) and `illegal_action` (legal request that the current state forbids). */
function invalid(reason: string): Error { return new Error(`invalid_request:${reason}`); }
function illegal(reason: string): Error { return new Error(`illegal_action:${reason}`); }

export function parseSlotTargets(character: Character, targetEquipment: unknown): number[] {
  const requested = Array.isArray(targetEquipment) ? targetEquipment : [targetEquipment];
  if (requested.length === 0) throw invalid('targetEquipment');
  const slots = requested.map((value) => typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN);
  if (slots.some((slot) => !Number.isSafeInteger(slot) || slot < 0 || slot >= character.equipment.length)) throw invalid('targetEquipment');
  if (new Set(slots).size !== slots.length) throw invalid('targetEquipment.duplicate');
  return slots;
}

export function parseJewelFormat(value: unknown): { key: JewelKey; rank: number } {
  const match = typeof value === 'string' ? value.match(/^([a-z]+):(\d+)$/) : null;
  const rank = match ? Number(match[2]) : NaN;
  if (!match || !JEWEL_KEYS.includes(match[1] as JewelKey) || !Number.isInteger(rank) || rank < 1 || rank > MAX_JEWEL_RANK) throw invalid('jewelToSet');
  return { key: match[1] as JewelKey, rank };
}

export function planEquipmentSlotOperation(
  action: EquipmentSlotAction,
  character: Character,
  jewels: Record<string, number>,
  parameters: Record<string, unknown>,
): EquipmentSlotReducerAction[] {
  const slots = parseSlotTargets(character, parameters.targetEquipment);

  if (action === 'removeEquipment') {
    if (slots.some((slot) => !character.equipment[slot])) throw illegal('slot_empty');
    return slots.map((slotIndex) => ({ type: 'EQUIP_ITEM', slotIndex, itemKey: null }));
  }

  if (action === 'lockEquipment' || action === 'unlockEquipment') {
    if (character.autoEquipmentMode !== 2) throw illegal('lock_requires_full_mode');
    if (slots.some((slot) => !character.equipment[slot])) throw illegal('slot_empty');
    const wantLocked = action === 'lockEquipment';
    // A slot already in the requested state is a valid no-op; only differing slots are toggled.
    return slots
      .filter((slot) => (character.equipment[slot]!.isLocked === true) !== wantLocked)
      .map((slotIndex) => ({ type: 'TOGGLE_EQUIPMENT_LOCK', slotIndex }));
  }

  if (action === 'jewelRemove') {
    if (slots.some((slot) => !character.equipment[slot]?.jewel)) throw illegal('no_jewel_attached');
    // ATTACH_JEWEL with the attached key/rank is the reducer's remove-and-return-to-inventory toggle.
    return slots.map((slotIndex) => {
      const jewel = character.equipment[slotIndex]!.jewel!;
      return { type: 'ATTACH_JEWEL', slotIndex, jewelKey: jewel.key, rank: jewel.rank };
    });
  }

  // jewelAttach: exactly one slot; replaces any attached jewel.
  if (slots.length !== 1) throw invalid('targetEquipment.single');
  const { key, rank } = parseJewelFormat(parameters.jewelToSet);
  const item = character.equipment[slots[0]];
  if (!item) throw illegal('slot_empty');
  if (!isJewelAllowedForCategory(item.category, key)) throw illegal('jewel_incompatible');
  if (item.jewel?.key === key && item.jewel.rank === rank) return [];
  if (getJewelOwnedCount(jewels, key, rank) <= 0) throw illegal('jewel_not_owned');
  return [{ type: 'ATTACH_JEWEL', slotIndex: slots[0], jewelKey: key, rank }];
}
