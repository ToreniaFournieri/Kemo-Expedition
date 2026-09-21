import type { Character, GameState, JewelKey } from '../../types';

// SpecRef: 8.2.4 | Equipment management | Interaction Rules
// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// Translates the Party equipment controls into ordered `commit/build/character/{characterId}/*` commands. Planning runs
// against the newest authoritative snapshot, so it never acts on a stale rendered view; validation stays in the handlers.

export type EquipmentIntent =
  | { kind: 'equip'; slotIndex: number; itemKey: string | null }
  | { kind: 'toggleLock'; slotIndex: number }
  | { kind: 'attachJewel'; slotIndex: number; jewelKey: JewelKey; rank: number }
  | { kind: 'removeAll' }
  | { kind: 'setMode'; mode: 0 | 1 | 2 }
  | { kind: 'runAuto' };

export interface EquipmentCommand {
  action: 'removeEquipment' | 'equip' | 'lockEquipment' | 'unlockEquipment' | 'jewelAttach' | 'jewelRemove' | 'removeAllEquipment' | 'autoEquipment';
  parameters: Record<string, unknown>;
}

const MODE_NAMES = ['OFF', 'SEMI', 'FULL'] as const;

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
      const commands: EquipmentCommand[] = [];
      if (intent.slotIndex < character.equipment.length && character.equipment[intent.slotIndex]) {
        commands.push({ action: 'removeEquipment', parameters: { targetEquipment: intent.slotIndex } });
      }
      if (intent.itemKey === null) {
        if (commands.length === 0) throw new Error('illegal_action:slot_empty');
        return commands;
      }
      const variant = state.global.inventory[intent.itemKey];
      if (!variant) throw new Error('not_found');
      const { id, enhancement, superRare, isLocked } = variant.item;
      // `equip` fills empty slots in order; a replacement therefore removes the occupied slot first.
      commands.push({ action: 'equip', parameters: { targetEquipment: `${isLocked === true ? 1 : 0}/${id}/${enhancement}/${superRare}` } });
      return commands;
    }
  }
}
