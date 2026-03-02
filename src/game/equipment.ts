import { Character, Item } from '../types';

// SpecRef: 8.3.4 | Equipment management | replaceCharacterEquipment
export function replaceCharacterEquipment(
  character: Character,
  slotIndex: number,
  item: Item | null,
): Character {
  const equipment = [...character.equipment];
  equipment[slotIndex] = item;
  return {
    ...character,
    equipment,
  };
}
