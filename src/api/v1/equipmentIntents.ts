import { computeCharacterStats } from '../../game/characterComputation';
import { evaluateEquipmentSet, type EquipmentSetLoadMode } from '../../game/equipmentSets';
import type { Character, GameState, JewelKey } from '../../types';

// SpecRef: 8.2.4 | Equipment management | Interaction Rules
// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// Translates the Party equipment controls into ordered `commit/build/character/{characterId}/*` commands. Planning runs
// against the newest authoritative snapshot, so it never acts on a stale rendered view; validation stays in the handlers.
// Every intent is one atomic command; `equip` with `targetSlot` replaces the occupied slot in a single revision.

export type EquipmentIntent =
  | { kind: 'equip'; slotIndex: number; itemKey: string | null }
  | { kind: 'toggleLock'; slotIndex: number }
  | { kind: 'attachJewel'; slotIndex: number; jewelKey: JewelKey; rank: number }
  | { kind: 'removeAll' }
  | { kind: 'setMode'; mode: 0 | 1 | 2 }
  | { kind: 'runAuto' }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'saveSet'; name: string }
  | { kind: 'renameSet'; slot: number; name: string }
  | { kind: 'deleteSet'; slot: number }
  | { kind: 'loadSet'; slot: number; mode: EquipmentSetLoadMode };

export interface EquipmentCommand {
  action: 'removeEquipment' | 'equip' | 'lockEquipment' | 'unlockEquipment' | 'jewelAttach' | 'jewelRemove' | 'removeAllEquipment' | 'autoEquipment'
    | 'undoEquipment' | 'redoEquipment' | 'saveEquipmentSet' | 'renameEquipmentSet' | 'deleteEquipmentSet' | 'loadEquipmentSet';
  parameters: Record<string, unknown>;
  /** The player already made an explicit choice in the UI, so the shared confirmation round trip is answered on their behalf. */
  confirmed?: boolean;
}

const MODE_NAMES = ['OFF', 'SEMI', 'FULL'] as const;

function findParty(state: GameState, characterId: number) {
  const party = state.parties.find((candidate) => candidate.characters.some((character) => character.id === characterId));
  if (!party) throw new Error('not_found');
  return party;
}

function findCharacter(state: GameState, characterId: number): Character {
  for (const party of state.parties) {
    const character = party.characters.find((candidate) => candidate.id === characterId);
    if (character) return character;
  }
  throw new Error('not_found');
}

export function planEquipmentIntent(state: GameState, characterId: number, intent: EquipmentIntent): EquipmentCommand[] {
  const character = findCharacter(state, characterId);
  switch (intent.kind) {
    case 'removeAll':
      return [{ action: 'removeAllEquipment', parameters: {} }];
    case 'setMode':
      return [{ action: 'autoEquipment', parameters: { mode: MODE_NAMES[intent.mode], immediateAutoEquipment: false } }];
    case 'runAuto':
      return [{ action: 'autoEquipment', parameters: { mode: 'FULL', immediateAutoEquipment: true } }];
    case 'undo':
      return [{ action: 'undoEquipment', parameters: {} }];
    case 'redo':
      return [{ action: 'redoEquipment', parameters: {} }];
    case 'saveSet':
      return [{ action: 'saveEquipmentSet', parameters: { equipmentSet: { name: intent.name } } }];
    case 'renameSet': {
      const name = intent.name.trim();
      const set = state.global.savedEquipmentSets.find((candidate) => candidate.slot === intent.slot);
      // Blank or unchanged names (the input's blur fires either way) are not commits.
      if (!set || name.length === 0 || name === set.name) return [];
      return [{ action: 'renameEquipmentSet', parameters: { equipmentSetId: intent.slot, name } }];
    }
    case 'deleteSet':
      return [{ action: 'deleteEquipmentSet', parameters: { equipmentSetId: intent.slot } }];
    case 'loadSet': {
      const set = state.global.savedEquipmentSets.find((candidate) => candidate.slot === intent.slot);
      if (!set) throw new Error('not_found');
      const party = findParty(state, characterId);
      const maxSlots = computeCharacterStats(character, party.level).maxEquipSlots;
      const allAvailable = evaluateEquipmentSet(set, character, state.global.inventory, maxSlots, state.global.jewels).allAvailable;
      // `equipSet` promises every stored item; a partial set needs one of the explicit choices the player already made.
      const loadMode = intent.mode === 'similar' ? 'equipSimilar' : allAvailable ? 'equipSet' : 'equipExactMatchesOnly';
      return [{ action: 'loadEquipmentSet', parameters: { equipmentSetId: intent.slot, loadMode }, confirmed: true }];
    }
    case 'toggleLock': {
      const item = character.equipment[intent.slotIndex];
      if (!item) throw new Error('illegal_action:slot_empty');
      return [{ action: item.isLocked === true ? 'unlockEquipment' : 'lockEquipment', parameters: { targetEquipment: intent.slotIndex } }];
    }
    case 'attachJewel': {
      const attached = character.equipment[intent.slotIndex]?.jewel;
      // Selecting the attached rank again removes it, exactly as the equipment list has always behaved.
      if (attached && attached.key === intent.jewelKey && attached.rank === intent.rank) {
        return [{ action: 'jewelRemove', parameters: { targetEquipment: intent.slotIndex } }];
      }
      return [{ action: 'jewelAttach', parameters: { targetEquipment: intent.slotIndex, jewelToSet: `${intent.jewelKey}:${intent.rank}` } }];
    }
    case 'equip': {
      if (intent.itemKey === null) {
        if (!character.equipment[intent.slotIndex]) throw new Error('illegal_action:slot_empty');
        return [{ action: 'removeEquipment', parameters: { targetEquipment: intent.slotIndex } }];
      }
      const variant = state.global.inventory[intent.itemKey];
      if (!variant) throw new Error('not_found');
      const { id, enhancement, superRare, isLocked } = variant.item;
      // One atomic command: the item goes to the chosen slot, replacing whatever it holds.
      return [{ action: 'equip', parameters: { targetEquipment: `${isLocked === true ? 1 : 0}/${id}/${enhancement}/${superRare}`, targetSlot: intent.slotIndex } }];
    }
  }
}
