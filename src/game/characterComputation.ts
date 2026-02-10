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
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';

// Get enhancement and super rare multiplier for an item
function getItemEnhancementMultiplier(item: Item): number {
  const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  return enhMult * srMult;
}

// Map item category to multiplier bonus type
const CATEGORY_TO_MULTIPLIER: Record<ItemCategory, BonusType | null> = {
  sword: 'sword_multiplier',
  katana: 'katana_multiplier',
  archery: 'archery_multiplier',
  armor: 'armor_multiplier',
  gauntlet: 'gauntlet_multiplier',
  wand: 'wand_multiplier',
  robe: 'robe_multiplier',
  shield: 'shield_multiplier',
  bolt: 'bolt_multiplier',
  grimoire: 'grimoire_multiplier',
  catalyst: 'catalyst_multiplier',
  arrow: 'arrow_multiplier',
};

interface BonusCollection {
  equipSlots: Set<number>;
  multipliers: Map<BonusType, number[]>;
  statBonuses: BaseStats;
  grit: number;
  caster: number;
  penet: number;
  pursuit: number;
  accuracy: number;
  evasion: number;
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
      case 'shield_multiplier':
      case 'bolt_multiplier':
      case 'grimoire_multiplier':
      case 'catalyst_multiplier':
      case 'arrow_multiplier':
        if (!collection.multipliers.has(bonus.type)) {
          collection.multipliers.set(bonus.type, []);
        }
        // Only add if this value is not already present (deduplicate)
        if (!collection.multipliers.get(bonus.type)!.includes(bonus.value)) {
          collection.multipliers.get(bonus.type)!.push(bonus.value);
        }
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
      case 'pursuit':
        collection.pursuit += bonus.value;
        break;
      case 'accuracy':
        collection.accuracy += bonus.value;
        break;
      case 'evasion':
        collection.evasion += bonus.value;
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
    pursuit: 0,
    accuracy: 0,
    evasion: 0,
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
  let magicalNoA = 0;
  let meleeNoA = 0;
  const rangedNoAFixedBonuses = new Set<number>();
  const magicalNoAFixedBonuses = new Set<number>();
  const meleeNoAFixedBonuses = new Set<number>();
  let accuracyBonus = collection.accuracy;
  let evasionBonus = collection.evasion;
  let elementalOffense: ElementalOffense = 'none';
  let elementalOffenseValue = 1.0;

  // Process equipment (limited to maxEquipSlots)
  const equippedItems = character.equipment.slice(0, maxEquipSlots).filter((item): item is Item => item !== null);

  for (const item of equippedItems) {
    const categoryMult = getMultiplier(item.category);
    const enhanceMult = getItemEnhancementMultiplier(item);
    const baseMult = item.baseMultiplier ?? 1;
    const multiplier = categoryMult * enhanceMult * baseMult;

    if (item.rangedAttack) {
      rangedAttack += item.rangedAttack * multiplier;
    }
    if (item.rangedNoA) {
      // Positive NoA scales with enhancement; negative penalties stay fixed
      if (item.rangedNoA > 0) {
        rangedNoA += item.rangedNoA * multiplier;
      } else {
        rangedNoA += item.rangedNoA;
      }
    }
    if (item.magicalAttack) {
      magicalAttack += item.magicalAttack * multiplier;
    }
    if (item.magicalNoA) {
      // Catalyst magical_NoA scales with enhancement
      if (item.magicalNoA > 0) {
        magicalNoA += item.magicalNoA * multiplier;
      } else {
        magicalNoA += item.magicalNoA;
      }
    }
    if (item.meleeAttack) {
      meleeAttack += item.meleeAttack * multiplier;
    }
    if (item.meleeNoA) {
      // Positive NoA (gauntlet) scales with enhancement; negative (katana) stays fixed
      if (item.meleeNoA > 0) {
        meleeNoA += item.meleeNoA * multiplier;
      } else {
        meleeNoA += item.meleeNoA;
      }
    }
    if (item.meleeNoABonus) meleeNoAFixedBonuses.add(item.meleeNoABonus);
    if (item.rangedNoABonus) rangedNoAFixedBonuses.add(item.rangedNoABonus);
    if (item.magicalNoABonus) magicalNoAFixedBonuses.add(item.magicalNoABonus);
    if (item.accuracyBonus) accuracyBonus += item.accuracyBonus;
    if (item.evasionBonus) evasionBonus += item.evasionBonus;

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

  // Add pursuit bonus to ranged NoA
  const rangedNoAFixedBonus = Array.from(rangedNoAFixedBonuses).reduce((sum, v) => sum + v, 0);
  rangedNoA += collection.pursuit + rangedNoAFixedBonus;

  // Add caster bonus to magical NoA
  const magicalNoAFixedBonus = Array.from(magicalNoAFixedBonuses).reduce((sum, v) => sum + v, 0);
  magicalNoA += collection.caster + magicalNoAFixedBonus;

  // Add grit bonus to melee NoA
  const meleeNoAFixedBonus = Array.from(meleeNoAFixedBonuses).reduce((sum, v) => sum + v, 0);
  meleeNoA += collection.grit + meleeNoAFixedBonus;

  // Check for iaigiri ability
  const hasIaigiri = collection.abilities.has('iaigiri');
  if (hasIaigiri) {
    meleeNoA = meleeNoA / 2;
    // meleeAttack will be amplified during battle
  }

  // Round NoA values up (ceil per spec)
  rangedNoA = Math.ceil(rangedNoA);
  magicalNoA = Math.ceil(magicalNoA);
  meleeNoA = Math.ceil(meleeNoA);

  // Calculate individual defense stats
  // d.physical_defense = Item Bonuses of Physical defense x its c.multiplier x enhancement x b.vitality / 10
  // d.magical_defense = Item Bonuses of Magical defense x its c.multiplier x enhancement x b.mind / 10
  let physicalDefense = 0;
  let magicalDefense = 0;
  let physicalDefenseAmplifier = 1.0;
  let magicalDefenseAmplifier = 1.0;
  let physicalDefenseBonus = 0;
  let magicalDefenseBonus = 0;

  for (const item of equippedItems) {
    const categoryMult = getMultiplier(item.category);
    const enhanceMult = getItemEnhancementMultiplier(item);
    const baseMult = item.baseMultiplier ?? 1;
    const multiplier = categoryMult * enhanceMult * baseMult;
    if (item.physicalDefense) {
      physicalDefense += item.physicalDefense * multiplier;
      if (item.baseMultiplier) physicalDefenseBonus += item.baseMultiplier - 1;
    }
    if (item.magicalDefense) {
      magicalDefense += item.magicalDefense * multiplier;
      if (item.baseMultiplier) magicalDefenseBonus += item.baseMultiplier - 1;
    }
  }

  physicalDefense = physicalDefense * (baseStats.vitality / 10);
  magicalDefense = magicalDefense * (baseStats.mind / 10);
  physicalDefenseAmplifier = Math.max(0.01, 1 - physicalDefenseBonus);
  magicalDefenseAmplifier = Math.max(0.01, 1 - magicalDefenseBonus);

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

  // Calculate accuracy potency based on row position (for accuracy_amplifier)
  // Normal decay: 15% per step (1.0 * 0.85^(row-1))
  // Hunter1 decay: 10% per step (1.0 * 0.90^(row-1))
  // Hunter2 decay: 7% per step (1.0 * 0.93^(row-1))
  const hunterLevel = collection.abilities.get('hunter');
  let decayRate = 0.85; // Normal: 15% decay
  if (hunterLevel === 2) {
    decayRate = 0.93; // Hunter2: 7% decay
  } else if (hunterLevel === 1) {
    decayRate = 0.90; // Hunter1: 10% decay
  }
  const accuracyPotency = Math.pow(decayRate, row - 1);

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
    physicalDefenseAmplifier,
    magicalDefenseAmplifier,
    maxEquipSlots,
    abilities,
    penetMultiplier: collection.penet,
    elementalOffense,
    elementalOffenseValue,
    accuracyPotency,
    accuracyBonus,
    evasionBonus,
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
    resonance: '共鳴',
    command: '指揮',
    m_barrier: '魔法障壁',
    null_counter: 'カウンター無効',
    unlock: '解錠',
  };
  return names[id];
}

function getAbilityDescription(id: AbilityId, level: number): string {
  const descriptions: Record<AbilityId, (level: number) => string> = {
    first_strike: (l) => l === 2 ? '全フェーズで敵より先に行動' : 'CLOSEフェーズで敵より先に行動',
    hunter: (l) => `攻撃効力 +${l === 3 ? 15 : l === 2 ? 10 : 5}%`,
    defender: (l) => `パーティへの物理ダメージ × ${l === 2 ? '3/5' : '2/3'}`,
    counter: (l) => l === 2 ? 'CLOSE/MIDフェーズで反撃' : 'CLOSEフェーズで反撃',
    re_attack: (l) => `攻撃時に${l === 2 ? '2回' : '1回'}追加攻撃`,
    iaigiri: () => `CLOSEフェーズでダメージ × 2.0、攻撃回数 ÷ 2`,
    resonance: (l) => `魔法ダメージ × ${l === 2 ? 1.5 : 1.25}`,
    command: (l) => `パーティ攻撃力 × ${l === 2 ? 1.3 : 1.15}`,
    m_barrier: (l) => `パーティへの魔法ダメージ × ${l === 2 ? '3/5' : '2/3'}`,
    null_counter: () => '反撃を無効化',
    unlock: () => '追加報酬チャンス',
  };
  return descriptions[id](level);
}
