import { Party, Character, Race } from '../types';
import { RACES } from '../constants/gameData';

export const createCharacter = (
  id: number,
  name: string,
  race: Race = 'Lupinian',
  mainClass: string = 'Fighter',
  subClass: string = 'Fighter',
  predisposition: string = 'Sturdy',
  lineage: string = 'SteelOath'
): Character => {
  const raceData = RACES[race];
  return {
    id,
    name,
    race,
    mainClass: mainClass as any,
    subClass: subClass as any,
    predisposition: predisposition as any,
    lineage: lineage as any,
    baseVitality: raceData.baseStats.vitality,
    baseStrength: raceData.baseStats.strength,
    baseIntelligence: raceData.baseStats.intelligence,
    baseMind: raceData.baseStats.mind,
    equipmentSlots: [],
    maximumEquippedItem: 3, // Will be calculated based on level
  };
};

export const initializeParty = (): Party => {
  return {
    number: 1,
    deityName: 'God of Restoration',
    level: 1,
    experience: 0,
    hp: 950 + 1 * 50, // 950 + (level x 50)
    maxHp: 950 + 1 * 50,
    physicalDefense: 10,
    magicalDefense: 10,
    quiverSlots: [],
    characters: [
      createCharacter(1, 'Fighter1', 'Lupinian', 'Fighter', 'Fighter', 'Sturdy', 'SteelOath'),
      createCharacter(2, 'Ranger1', 'Leporian', 'Ranger', 'Ranger', 'Dexterous', 'FarSight'),
      createCharacter(3, 'Wizard1', 'Cervin', 'Wizard', 'Wizard', 'Brilliant', 'GuidingThought'),
      createCharacter(4, 'Sage1', 'Felidian', 'Sage', 'Sage', 'Pursuing', 'HiddenPrinciples'),
    ],
  };
};
