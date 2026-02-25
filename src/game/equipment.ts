import { Character, Item } from '../types';

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
