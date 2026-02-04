import {
  Character,
  ComputedCharacterStats,
  BaseStats,
  Bonus,
  BonusType,
  Ability,
  AbilityId,
  Item,
  ItemCategory,
  ElementalOffense,
  LEVEL_EQUIP_SLOTS,
} from '../types';
import { getRaceById } from '../data/races';
import { getClassById } from '../data/classes';
import { getPredispositionById } from '../data/predispositions';
import { getLineageById } from '../data/lineages';

// Map item category to multiplier bonus type
const CATEGORY_TO_MULTIPLIER: Record<ItemCategory, BonusType | null> = {
  sword: 'sword_multiplier',
  katana: 'katana_multiplier',
  archery: 'archery_multiplier',
  armor: 'armor_multiplier',
  gauntlet: 'gauntlet_multiplier',
  wand: 'wand_multiplier',
  robe: 'robe_multiplier',
  amulet: 'amulet_multiplier',
  arrow: null,
};

interface BonusCollection {
  equipSlots: Set<number>;
  multipliers: Map<BonusType, number[]>;
  statBonuses: BaseStats;
  grit: number;
  caster: number;
  penet: number;
  abilities: Map<AbilityId, number>;
}

function collectBonuses(bonuses: Bonus[], collection: BonusCollection): void {
  for (const bonus of bonuses) {
    switch (bonus.type) {
      case 'equip_slot':
        collection.equipSlots.add(bonus.value);
        break;
      case 'sword_multiplier':
      case 'katana_multiplier':
      case 'archery_multiplier':
      case 'armor_multiplier':
      case 'gauntlet_multiplier':
      case 'wand_multiplier':
      case 'robe_multiplier':
      case 'amulet_multiplier':
        if (!collection.multipliers.has(bonus.type)) {
          collection.multipliers.set(bonus.type, []);
        }
        collection.multipliers.get(bonus.type)!.push(bonus.value);
        break;
      case 'vitality':
        collection.statBonuses.vitality += bonus.value;
        break;
      case 'strength':
        collection.statBonuses.strength += bonus.value;
        break;
      case 'intelligence':
        collection.statBonuses.intelligence += bonus.value;
        break;
      case 'mind':
        collection.statBonuses.mind += bonus.value;
        break;
      case 'grit':
        collection.grit = Math.max(collection.grit, bonus.value);
        break;
      case 'caster':
        collection.caster = Math.max(collection.caster, bonus.value);
        break;
      case 'penet':
        collection.penet += bonus.value;
        break;
      case 'ability':
        if (bonus.abilityId) {
          const currentLevel = collection.abilities.get(bonus.abilityId) ?? 0;
          collection.abilities.set(bonus.abilityId, Math.max(currentLevel, bonus.abilityLevel ?? 1));
        }
        break;
    }
  }
}

export function computeCharacterStats(
  character: Character,
  partyLevel: number,
  row: number = 1 // Position 1-6 in party
): ComputedCharacterStats {
  const race = getRaceById(character.raceId);
  const mainClass = getClassById(character.mainClassId);
  const subClass = getClassById(character.subClassId);
  const predisposition = getPredispositionById(character.predispositionId);
  const lineage = getLineageById(character.lineageId);

  if (!race || !mainClass || !subClass || !predisposition || !lineage) {
    throw new Error('Invalid character configuration');
  }

  const isMasterClass = character.mainClassId === character.subClassId;

  // Initialize bonus collection
  const collection: BonusCollection = {
    equipSlots: new Set<number>(),
    multipliers: new Map(),
    statBonuses: { vitality: 0, strength: 0, intelligence: 0, mind: 0 },
    grit: 0,
    caster: 0,
    penet: 0,
    abilities: new Map(),
  };

  // Collect bonuses from all sources
  collectBonuses(race.bonuses, collection);
  collectBonuses(mainClass.mainSubBonuses, collection);
  if (isMasterClass) {
    collectBonuses(mainClass.masterBonuses, collection);
  } else {
    collectBonuses(mainClass.mainBonuses, collection);
    collectBonuses(subClass.mainSubBonuses, collection);
  }
  collectBonuses(predisposition.bonuses, collection);
  collectBonuses(lineage.bonuses, collection);

  // Calculate base stats
  const baseStats: BaseStats = {
    vitality: race.stats.vitality + collection.statBonuses.vitality,
    strength: race.stats.strength + collection.statBonuses.strength,
    intelligence: race.stats.intelligence + collection.statBonuses.intelligence,
    mind: race.stats.mind + collection.statBonuses.mind,
  };

  // Calculate max equipment slots
  let baseSlots = 1;
  for (const [level, slots] of Object.entries(LEVEL_EQUIP_SLOTS)) {
    if (partyLevel >= parseInt(level)) {
      baseSlots = slots;
    }
  }
  const equipSlotBonus = Array.from(collection.equipSlots).reduce((sum, v) => sum + v, 0);
  const maxEquipSlots = baseSlots + equipSlotBonus;

  // Calculate multipliers for each category (product of all unique multipliers)
  const getMultiplier = (category: ItemCategory): number => {
    const bonusType = CATEGORY_TO_MULTIPLIER[category];
    if (!bonusType) return 1;
    const values = collection.multipliers.get(bonusType);
    if (!values || values.length === 0) return 1;
    return values.reduce((prod, v) => prod * v, 1);
  };

  // Calculate stats from equipment
  let rangedAttack = 0;
  let magicalAttack = 0;
  let meleeAttack = 0;
  let rangedNoA = 0;
  let meleeNoA = 0;
  let elementalOffense: ElementalOffense = 'none';
  let elementalOffenseValue = 1.0;

  // Process equipment (limited to maxEquipSlots)
  const equippedItems = character.equipment.slice(0, maxEquipSlots).filter((item): item is Item => item !== null);

  for (const item of equippedItems) {
    const multiplier = getMultiplier(item.category);

    if (item.rangedAttack) {
      rangedAttack += item.rangedAttack * multiplier;
    }
    if (item.rangedNoA) {
      rangedNoA += Math.ceil(item.rangedNoA * multiplier);
    }
    if (item.magicalAttack) {
      magicalAttack += item.magicalAttack * multiplier;
    }
    if (item.meleeAttack) {
      meleeAttack += item.meleeAttack * multiplier;
    }
    if (item.meleeNoA) {
      meleeNoA += Math.ceil(item.meleeNoA * multiplier);
    }

    // Elemental offense from equipment (priority: thunder > ice > fire > none)
    if (item.elementalOffense && item.elementalOffense !== 'none') {
      const priority = { thunder: 3, ice: 2, fire: 1, none: 0 };
      if (priority[item.elementalOffense] > priority[elementalOffense]) {
        elementalOffense = item.elementalOffense;
        elementalOffenseValue = 1.2; // Default elemental bonus
      }
    }
  }

  // Apply base stats scaling
  meleeAttack = meleeAttack * (baseStats.strength / 10);
  magicalAttack = magicalAttack * (baseStats.intelligence / 10);

  // Add caster bonus to magical NoA
  const magicalNoA = collection.caster;

  // Add grit bonus to melee NoA
  meleeNoA += collection.grit;

  // Check for iaigiri ability
  const hasIaigiri = collection.abilities.has('iaigiri');
  if (hasIaigiri) {
    meleeNoA = Math.ceil(meleeNoA / 2);
    // meleeAttack will be amplified during battle
  }

  // Calculate individual defense stats
  // d.physical_defense = Item Bonuses of Physical defense x its c.multiplier x b.vitality / 10
  // d.magical_defense = Item Bonuses of Magical defense x its c.multiplier x b.mind / 10
  let physicalDefense = 0;
  let magicalDefense = 0;

  for (const item of equippedItems) {
    const multiplier = getMultiplier(item.category);
    if (item.physicalDefense) {
      physicalDefense += item.physicalDefense * multiplier;
    }
    if (item.magicalDefense) {
      magicalDefense += item.magicalDefense * multiplier;
    }
  }

  physicalDefense = physicalDefense * (baseStats.vitality / 10);
  magicalDefense = magicalDefense * (baseStats.mind / 10);

  // Build abilities list
  const abilities: Ability[] = [];
  for (const [id, level] of collection.abilities) {
    abilities.push({
      id,
      name: getAbilityName(id),
      level,
      description: getAbilityDescription(id, level),
    });
  }

  return {
    characterId: character.id,
    row,
    baseStats,
    rangedAttack,
    magicalAttack,
    meleeAttack,
    rangedNoA,
    magicalNoA,
    meleeNoA,
    physicalDefense: Math.floor(physicalDefense),
    magicalDefense: Math.floor(magicalDefense),
    maxEquipSlots,
    abilities,
    penetMultiplier: collection.penet,
    elementalOffense,
    elementalOffenseValue,
  };
}

function getAbilityName(id: AbilityId): string {
  const names: Record<AbilityId, string> = {
    first_strike: '先制攻撃',
    hunter: '狩人',
    defender: '守護者',
    counter: 'カウンター',
    re_attack: '連撃',
    iaigiri: '居合斬り',
    leading: '指揮',
    m_barrier: '魔法障壁',
    null_counter: 'カウンター無効',
    unlock: '解錠',
  };
  return names[id];
}

function getAbilityDescription(id: AbilityId, level: number): string {
  const descriptions: Record<AbilityId, (level: number) => string> = {
    first_strike: (l) => l === 2 ? '全フェーズで敵より先に行動' : 'CLOSEフェーズで敵より先に行動',
    hunter: (l) => `戦闘終了時に矢を${l === 3 ? 36 : l === 2 ? 30 : 20}%回収`,
    defender: (l) => `パーティへの物理ダメージ × ${l === 2 ? '3/5' : '2/3'}`,
    counter: (l) => l === 2 ? 'CLOSE/MIDフェーズで反撃' : 'CLOSEフェーズで反撃',
    re_attack: (l) => `攻撃時に${l === 2 ? '2回' : '1回'}追加攻撃`,
    iaigiri: (l) => `物理ダメージ × ${l === 2 ? 2.5 : 2}、攻撃回数 ÷ 2`,
    leading: (l) => `物理ダメージ × ${l === 2 ? 1.6 : 1.3}`,
    m_barrier: (l) => `パーティへの魔法ダメージ × ${l === 2 ? '3/5' : '2/3'}`,
    null_counter: () => '反撃を無効化',
    unlock: () => '追加報酬チャンス',
  };
  return descriptions[id](level);
}
