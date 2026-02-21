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
import { getBaseMultiplier } from './baseMultiplier';

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
  equipSlotBonusTotal: number;
  uniqueCAdditiveBonusNames: Set<string>;
  multipliers: Map<BonusType, number[]>;
  statBonuses: BaseStats;
  grit: number;
  caster: number;
  penet: number;
  pursuit: number;
  accuracy: number;
  evasion: number;
  upgradeV: number;
  abilities: Map<AbilityId, number>;
  uniqueEvasionBonusNames: Set<string>;
  cAccuracyBonusCounts: Map<string, number>;
  meleeAttackCBonus: number;
  rangedAttackCBonus: number;
  magicalAttackCBonus: number;
  physicalAttackCBonus: number;
  physicalOffenseMultiplier: number;
  magicalOffenseMultiplier: number;
  physicalDefenseMultiplier: number;
  magicalDefenseMultiplier: number;
  elementalDefenseMultipliers: {
    fire: number;
    thunder: number;
    ice: number;
  };
  offenseCBonusNames: Set<string>;
  antagonism: boolean;
}

function formatCBonusValue(value: number): string {
  return (Math.round(value * 1000000) / 1000000).toString();
}

function getUniqueCBonusSum(
  items: Item[],
  kind: 'physical_defense' | 'magical_defense'
): number {
  const appliedBonusNames = new Set<string>();
  let bonusSum = 0;

  for (const item of items) {
    const baseMultiplier = item.baseMultiplier ?? 1;
    if (baseMultiplier === 1) continue;
    if (kind === 'physical_defense' && !item.physicalDefense) continue;
    if (kind === 'magical_defense' && !item.magicalDefense) continue;

    const percent = Math.round((baseMultiplier - 1) * 1000) / 10;
    const bonusName = `c.${kind}+${percent}`;
    if (appliedBonusNames.has(bonusName)) continue;
    appliedBonusNames.add(bonusName);
    bonusSum += baseMultiplier - 1;
  }

  return bonusSum;
}

const SUBCLASS_ALLOWED_ABILITY_IDS = new Set<AbilityId>(['unlock']);

function filterSubclassMainSubBonuses(bonuses: Bonus[]): Bonus[] {
  return bonuses.filter((bonus) => {
    if (bonus.type !== 'ability') return true;
    if (!bonus.abilityId) return false;
    return SUBCLASS_ALLOWED_ABILITY_IDS.has(bonus.abilityId);
  });
}

function collectBonuses(bonuses: Bonus[], collection: BonusCollection): void {
  for (const bonus of bonuses) {
    switch (bonus.type) {
      case 'equip_slot':
        {
          const bonusName = `c.equip_slot+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueCAdditiveBonusNames.has(bonusName)) {
            collection.uniqueCAdditiveBonusNames.add(bonusName);
            collection.equipSlotBonusTotal += bonus.value;
          }
        }
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
        {
          const bonusName = `c.grit+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueCAdditiveBonusNames.has(bonusName)) {
            collection.uniqueCAdditiveBonusNames.add(bonusName);
            collection.grit += bonus.value;
          }
        }
        break;
      case 'caster':
        {
          const bonusName = `c.caster+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueCAdditiveBonusNames.has(bonusName)) {
            collection.uniqueCAdditiveBonusNames.add(bonusName);
            collection.caster += bonus.value;
          }
        }
        break;
      case 'penet':
        {
          const bonusName = `c.penet+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueCAdditiveBonusNames.has(bonusName)) {
            collection.uniqueCAdditiveBonusNames.add(bonusName);
            collection.penet += bonus.value;
          }
        }
        break;
      case 'pursuit':
        {
          const bonusName = `c.pursuit+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueCAdditiveBonusNames.has(bonusName)) {
            collection.uniqueCAdditiveBonusNames.add(bonusName);
            collection.pursuit += bonus.value;
          }
        }
        break;
      case 'antagonism':
        {
          const bonusName = `c.antagonism+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueCAdditiveBonusNames.has(bonusName)) {
            collection.uniqueCAdditiveBonusNames.add(bonusName);
            collection.antagonism = true;
          }
        }
        break;
      case 'accuracy':
        {
          const bonusName = `c.accuracy+${formatCBonusValue(bonus.value)}`;
          const appliedCount = collection.cAccuracyBonusCounts.get(bonusName) ?? 0;
          if (appliedCount < 1) {
            collection.cAccuracyBonusCounts.set(bonusName, appliedCount + 1);
            collection.accuracy += bonus.value;
          }
        }
        break;
      case 'evasion':
        {
          // c.evasion is unique by name, but penalty-side d.evasion values are stackable.
          if (bonus.value < 0) {
            collection.evasion += bonus.value;
            break;
          }

          const bonusName = `c.evasion+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueEvasionBonusNames.has(bonusName)) {
            collection.uniqueEvasionBonusNames.add(bonusName);
            collection.evasion += bonus.value;
          }
        }
        break;
      case 'ability':
        if (bonus.abilityId) {
          const currentLevel = collection.abilities.get(bonus.abilityId) ?? 0;
          collection.abilities.set(bonus.abilityId, Math.max(currentLevel, bonus.abilityLevel ?? 1));
        }
        break;
      case 'upgrade_V':
        {
          const bonusName = `c.upgrade_V+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueCAdditiveBonusNames.has(bonusName)) {
            collection.uniqueCAdditiveBonusNames.add(bonusName);
            collection.upgradeV += bonus.value;
          }
        }
        break;
      case 'melee_attack':
      case 'ranged_attack':
      case 'magical_attack':
      case 'physical_attack':
        {
          const bonusName = `c.${bonus.type}+${formatCBonusValue(bonus.value)}`;
          if (collection.offenseCBonusNames.has(bonusName)) break;
          collection.offenseCBonusNames.add(bonusName);
          if (bonus.type === 'melee_attack') collection.meleeAttackCBonus += bonus.value;
          if (bonus.type === 'ranged_attack') collection.rangedAttackCBonus += bonus.value;
          if (bonus.type === 'magical_attack') collection.magicalAttackCBonus += bonus.value;
          if (bonus.type === 'physical_attack') collection.physicalAttackCBonus += bonus.value;
        }
        break;
      case 'physical_offense_multiplier_xV':
      case 'magical_offense_multiplier_xV':
        {
          const bonusName = `c.${bonus.type}_${formatCBonusValue(bonus.value)}`;
          if (collection.offenseCBonusNames.has(bonusName)) break;
          collection.offenseCBonusNames.add(bonusName);
          if (bonus.type === 'physical_offense_multiplier_xV') {
            collection.physicalOffenseMultiplier *= bonus.value;
          } else {
            collection.magicalOffenseMultiplier *= bonus.value;
          }
        }
        break;
      case 'physical_defense_multiplier_xV':
      case 'magical_defense_multiplier_xV':
      case 'fire_defense_multiplier_xV':
      case 'ice_defense_multiplier_xV':
      case 'thunder_defense_multiplier_xV':
        {
          const bonusName = `c.${bonus.type}_${formatCBonusValue(bonus.value)}`;
          if (collection.offenseCBonusNames.has(bonusName)) break;
          collection.offenseCBonusNames.add(bonusName);
          if (bonus.type === 'physical_defense_multiplier_xV') {
            collection.physicalDefenseMultiplier *= bonus.value;
          } else if (bonus.type === 'magical_defense_multiplier_xV') {
            collection.magicalDefenseMultiplier *= bonus.value;
          } else if (bonus.type === 'fire_defense_multiplier_xV') {
            collection.elementalDefenseMultipliers.fire *= bonus.value;
          } else if (bonus.type === 'ice_defense_multiplier_xV') {
            collection.elementalDefenseMultipliers.ice *= bonus.value;
          } else {
            collection.elementalDefenseMultipliers.thunder *= bonus.value;
          }
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
    equipSlotBonusTotal: 0,
    uniqueCAdditiveBonusNames: new Set<string>(),
    multipliers: new Map(),
    statBonuses: { vitality: 0, strength: 0, intelligence: 0, mind: 0 },
    grit: 0,
    caster: 0,
    penet: 0,
    pursuit: 0,
    accuracy: 0,
    evasion: 0,
    upgradeV: 0,
    abilities: new Map(),
    uniqueEvasionBonusNames: new Set<string>(),
    cAccuracyBonusCounts: new Map<string, number>(),
    meleeAttackCBonus: 0,
    rangedAttackCBonus: 0,
    magicalAttackCBonus: 0,
    physicalAttackCBonus: 0,
    physicalOffenseMultiplier: 1,
    magicalOffenseMultiplier: 1,
    physicalDefenseMultiplier: 1,
    magicalDefenseMultiplier: 1,
    elementalDefenseMultipliers: {
      fire: 1,
      thunder: 1,
      ice: 1,
    },
    offenseCBonusNames: new Set<string>(),
    antagonism: false,
  };

  // Collect bonuses from all sources
  collectBonuses(race.bonuses, collection);
  collectBonuses(mainClass.mainSubBonuses, collection);
  if (isMasterClass) {
    collectBonuses(mainClass.masterBonuses, collection);
  } else {
    collectBonuses(mainClass.mainBonuses, collection);
    collectBonuses(filterSubclassMainSubBonuses(subClass.mainSubBonuses), collection);
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
  const equipSlotBonus = collection.equipSlotBonusTotal;
  const maxEquipSlots = baseSlots + equipSlotBonus;

  // Calculate multipliers for each category (product of all unique multipliers)
  const getMultiplier = (category: ItemCategory): number => {
    const bonusType = CATEGORY_TO_MULTIPLIER[category];
    if (!bonusType) return 1;
    const values = collection.multipliers.get(bonusType);
    if (!values || values.length === 0) return 1;
    return values.reduce((prod, v) => prod * v, 1);
  };

  const seekerLevel = collection.abilities.get('seeker') ?? 0;
  const seekerPerLevelBonus = seekerLevel >= 2 ? 0.0035 : seekerLevel >= 1 ? 0.0025 : 0;
  const seekerMultiplier = seekerLevel > 0 ? 1 + (partyLevel * seekerPerLevelBonus) : 1;

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
  const evasionBonusNames = new Set<string>(collection.uniqueEvasionBonusNames);
  let accuracyBonus = collection.accuracy;
  let evasionBonus = collection.evasion;
  let elementalOffense: ElementalOffense = 'none';
  let elementalOffenseValue = 1.0;
  const elementalOffenseTotals: Record<ElementalOffense, number> = {
    none: 0,
    fire: 0,
    ice: 0,
    thunder: 0,
  };

  // Process equipment (limited to maxEquipSlots)
  const equippedItems = character.equipment.slice(0, maxEquipSlots).filter((item): item is Item => item != null);

  for (const item of equippedItems) {
    if (item.vitalityBonus) baseStats.vitality += item.vitalityBonus;
    if (item.strengthBonus) baseStats.strength += item.strengthBonus;
    if (item.intelligenceBonus) baseStats.intelligence += item.intelligenceBonus;
    if (item.mindBonus) baseStats.mind += item.mindBonus;

    const categoryMult = getMultiplier(item.category);
    const seekerCategoryMultiplier = item.category === 'grimoire'
      ? categoryMult * seekerMultiplier
      : categoryMult;
    const enhanceMult = getItemEnhancementMultiplier(item);
    const baseMult = item.baseMultiplier ?? 1;
    const multiplier = seekerCategoryMultiplier * enhanceMult * baseMult;

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
    if (item.meleeNoABonus) {
      if (item.meleeNoABonus < 0) {
        meleeNoA += item.meleeNoABonus;
      } else {
        meleeNoAFixedBonuses.add(item.meleeNoABonus);
      }
    }
    if (item.rangedNoABonus) {
      if (item.rangedNoABonus < 0) {
        rangedNoA += item.rangedNoABonus;
      } else {
        rangedNoAFixedBonuses.add(item.rangedNoABonus);
      }
    }
    if (item.magicalNoABonus) {
      if (item.magicalNoABonus < 0) {
        magicalNoA += item.magicalNoABonus;
      } else {
        magicalNoAFixedBonuses.add(item.magicalNoABonus);
      }
    }
    if (item.accuracyBonus) {
      const bonusName = `c.accuracy+${formatCBonusValue(item.accuracyBonus)}`;
      const appliedCount = collection.cAccuracyBonusCounts.get(bonusName) ?? 0;
      if (appliedCount < 1) {
        collection.cAccuracyBonusCounts.set(bonusName, appliedCount + 1);
        accuracyBonus += item.accuracyBonus;
      }
    }
    if (item.evasionBonus) {
      // Positive c.evasion bonuses are unique by name.
      // Negative d.evasion penalties are stackable.
      if (item.evasionBonus < 0) {
        evasionBonus += item.evasionBonus;
      } else {
        const bonusName = `c.evasion+${formatCBonusValue(item.evasionBonus)}`;
        if (!evasionBonusNames.has(bonusName)) {
          evasionBonusNames.add(bonusName);
          evasionBonus += item.evasionBonus;
        }
      }
    }
    if (item.penetBonus) collection.penet += item.penetBonus;

    if (item.elementalOffense && item.elementalOffense !== 'none') {
      elementalOffenseTotals[item.elementalOffense] += item.elementalOffenseBonus ?? 0;
    }
  }

  const elementalPriority: ElementalOffense[] = ['thunder', 'ice', 'fire'];
  let selectedElement: ElementalOffense = 'none';
  let selectedElementBonus = 0;

  for (const element of elementalPriority) {
    const total = elementalOffenseTotals[element];
    if (total > selectedElementBonus) {
      selectedElement = element;
      selectedElementBonus = total;
    }
  }

  elementalOffense = selectedElement;
  elementalOffenseValue = 1 + selectedElementBonus;

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
    rangedNoA = rangedNoA / 2;
    meleeNoA = meleeNoA / 2;
    // Physical attack damage amplification is applied during battle
  }

  // Round NoA values up (ceil per spec)
  rangedNoA = Math.ceil(rangedNoA);
  magicalNoA = Math.ceil(magicalNoA);
  meleeNoA = Math.ceil(meleeNoA);

  // Calculate individual defense stats
  // d.physical_defense = Item Bonuses of Physical defense x enhancement multiplier x super rare multiplier x c.multiplier
  // d.magical_defense = Item Bonuses of Magical defense x enhancement multiplier x super rare multiplier x c.multiplier
  let physicalDefense = 0;
  let magicalDefense = 0;
  let physicalDefenseAmplifier = 1.0;
  let magicalDefenseAmplifier = 1.0;
  let physicalDefenseBonus = 0;
  let magicalDefenseBonus = 0;

  for (const item of equippedItems) {
    const categoryMult = getMultiplier(item.category);
    const seekerCategoryMultiplier = item.category === 'grimoire'
      ? categoryMult * seekerMultiplier
      : categoryMult;
    const enhanceMult = getItemEnhancementMultiplier(item);
    const baseMult = item.baseMultiplier ?? 1;
    const multiplier = seekerCategoryMultiplier * enhanceMult * baseMult;
    if (item.physicalDefense) {
      physicalDefense += item.physicalDefense * multiplier;
    }
    if (item.magicalDefense) {
      magicalDefense += item.magicalDefense * multiplier;
    }
  }

  physicalDefenseBonus = getUniqueCBonusSum(equippedItems, 'physical_defense');
  magicalDefenseBonus = getUniqueCBonusSum(equippedItems, 'magical_defense');

  const vitalityDefenseScale = getBaseMultiplier(baseStats.vitality, 'defense');
  const mindDefenseScale = getBaseMultiplier(baseStats.mind, 'defense');
  physicalDefenseAmplifier = Math.max(
    0.01,
    (1 - physicalDefenseBonus) * collection.physicalDefenseMultiplier * vitalityDefenseScale
  );
  magicalDefenseAmplifier = Math.max(
    0.01,
    (1 - magicalDefenseBonus) * collection.magicalDefenseMultiplier * mindDefenseScale
  );

  // Build abilities list
  const upgradeTier = Math.max(0, Math.floor(collection.upgradeV));
  const abilities: Ability[] = [];
  for (const [id, level] of collection.abilities) {
    const upgradedLevel = level + upgradeTier;
    abilities.push({
      id,
      name: getAbilityName(id, upgradedLevel),
      level: upgradedLevel,
      description: getAbilityDescription(id, upgradedLevel),
    });
  }

  // Calculate accuracy potency based on row position (for accuracy_amplifier)
  // Normal decay: 15% per step (1.0 * 0.85^(row-1))
  // Hunter1 decay: 10% per step (1.0 * 0.90^(row-1))
  // Hunter2 decay: 7% per step (1.0 * 0.93^(row-1))
  // Hunter3 decay: 5% per step (1.0 * 0.95^(row-1))
  const hunterLevel = collection.abilities.get('hunter');
  let decayRate = 0.85; // Normal: 15% decay
  if (hunterLevel === 3) {
    decayRate = 0.95; // Hunter3: 5% decay
  } else if (hunterLevel === 2) {
    decayRate = 0.93; // Hunter2: 7% decay
  } else if (hunterLevel === 1) {
    decayRate = 0.90; // Hunter1: 10% decay
  }
  const composureLevel = collection.abilities.get('composure') ?? 0;
  const composureBonus = composureLevel >= 2 ? 0.13 : composureLevel >= 1 ? 0.10 : 0;
  const accuracyPotency = Math.min(1, Math.pow(decayRate, row - 1) + composureBonus);

  const cyborgizationLevel = collection.abilities.get('cyborgization') ?? 0;
  if (cyborgizationLevel >= 1) {
    accuracyBonus += cyborgizationLevel >= 2 ? 0.04 : 0.03;
    evasionBonus += cyborgizationLevel >= 2 ? -0.015 : -0.02;
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
    meleeAttackCBonus: collection.meleeAttackCBonus,
    rangedAttackCBonus: collection.rangedAttackCBonus,
    magicalAttackCBonus: collection.magicalAttackCBonus,
    physicalAttackCBonus: collection.physicalAttackCBonus,
    physicalOffenseMultiplier: collection.physicalOffenseMultiplier,
    magicalOffenseMultiplier: collection.magicalOffenseMultiplier,
    physicalDefenseMultiplier: collection.physicalDefenseMultiplier,
    magicalDefenseMultiplier: collection.magicalDefenseMultiplier,
    elementalDefenseMultipliers: collection.elementalDefenseMultipliers,
    offenseCBonusNames: Array.from(collection.offenseCBonusNames),
    deityOffenseAmplifierBonus: 0,
    deityDefenseAmplifierBonus: {
      physical: 0,
      magical: 0,
    },
    hasAntagonism: collection.antagonism,
  };
}

function getAbilityName(id: AbilityId, level: number): string {
  const names: Record<AbilityId, string> = {
    first_strike: '先制攻撃',
    hunter: '狩人',
    defender: '守護者',
    counter: '反撃',
    re_attack: '連撃',
    iaigiri: '居合斬り',
    resonance: '共鳴',
    command: '指揮',
    m_barrier: '魔法障壁',
    deflection: '矢払い',
    null_counter: '反撃無効化',
    unlock: '解錠',
    squander: '散財',
    tithe: '十分の一税',
    seeker: '探究者',
    resurrect: '再起',
    rage: '闘志',
    re_counter: '再反撃',
    momentum: '気勢',
    cunning: '狡猾',
    bulwark: '壁',
    cyborgization: 'サイボーグ化',
    covering_fire: '援護射撃',
    peddler: '行商',
    composure: '平静',
    magical_counter: '魔法反撃',
    focus: '集中',
    prophecy: '予言',
    stealth: '隠れ蓑',
    illusion: '幻化',
  };
  if (level >= 1) {
    return `${names[id]}${level}`;
  }
  return names[id];
}

function getAbilityDescription(id: AbilityId, level: number): string {
  const descriptions: Record<AbilityId, (level: number) => string> = {
    first_strike: (l) => l >= 3 ? '行動が極めて速くなる' : l === 2 ? '行動がとても速くなる' : '行動が速くなる',
    hunter: (l) => l >= 3
      ? '列による命中率減衰を1列ごと15%→5%に軽減する'
      : l === 2
        ? '列による命中率減衰を1列ごと15%→7%に軽減する'
        : '列による命中率減衰を1列ごと15%→10%に軽減する',
    defender: (l) => `パーティへの物理ダメージ × ${l >= 3 ? '1/2' : l === 2 ? '3/5' : '2/3'}`,
    counter: (l) => l >= 3
      ? '敵の攻撃を受けたとき反撃(攻撃回数半減)'
      : l === 2
        ? '敵の近距離・中距離攻撃を受けたとき反撃(攻撃回数半減)'
        : '敵の近距離攻撃を受けたとき反撃(攻撃回数半減)',
    re_attack: (l) => l >= 3
      ? '攻撃時に追加攻撃を2回行う(攻撃回数は半減しない)'
      : `攻撃時に追加攻撃を${l === 2 ? '2回' : '1回'}行う(攻撃回数半減)`,
    iaigiri: (l) => `物理ダメージをx${l >= 3 ? '3.0' : l === 2 ? '2.5' : '2.0'}倍する。攻撃回数を半減する`,
    resonance: (l) => `魔法攻撃1回毎に、全ヒットのダメージが+${l >= 5 ? 15 : l === 4 ? 13 : l === 3 ? 11 : l === 2 ? 8 : 5}%増加する`,
    command: (l) => `パーティ攻撃力 × ${l >= 3 ? 2.0 : l === 2 ? 1.6 : 1.3}`,
    m_barrier: (l) => `パーティへの魔法ダメージ × ${l >= 3 ? '1/2' : l === 2 ? '3/5' : '2/3'}`,
    deflection: (l) => `敵の遠距離攻撃の命中率を${l >= 2 ? '15' : '10'}%低下させる`,
    null_counter: () => '反撃を無効化する',
    unlock: () => '追加報酬チャンス',
    squander: (l) => `宴会で消費するゴールドが${l >= 2 ? '2' : '1.5'}倍になる`,
    tithe: (l) => `祈り時に寄付額へ探検利益の+${l >= 2 ? '15' : '10'}%を加算`,
    seeker: (l) => `魔導書の効果増加(レベル毎に${l >= 2 ? '0.35' : '0.25'}%)`,
    resurrect: (l) => l >= 2
      ? '自分が受けた致命ダメージをHP1%残して耐える(1回のみ)'
      : '自分が受けた致命ダメージをHP1残して耐える',
    rage: (l) => `物理/魔法攻撃倍率増大(受けたダメージ1%につき${l >= 2 ? '1.2' : '1'}%増)`,
    re_counter: (l) => l >= 2
      ? '敵から反撃に対して、反撃する(攻撃回数半減しない)'
      : '敵から反撃に対して、反撃する(攻撃回数半減)',
    momentum: (l) => `物理/魔法攻撃倍率1.5倍(受けたダメージ1%につき${l >= 2 ? '0.75' : '1'}%減)`,
    cunning: (l) => `自動売却額が${l >= 2 ? '1.3' : '1.2'}倍`,
    bulwark: (l) => l >= 2
      ? '真後ろの味方への遠距離/近距離攻撃を肩代わりする'
      : '真後ろの味方への遠距離攻撃を肩代わりする',
    cyborgization: (l) => l >= 2 ? '命中+40、回避-15' : '命中+30、回避-20',
    covering_fire: (l) => l >= 2
      ? '味方近接攻撃の命中が1回のみなら遠距離射撃(攻撃回数半減しない)'
      : '味方近接攻撃の命中が1回のみなら遠距離射撃(攻撃回数半減)',
    peddler: (l) => `移動時間(移動中/帰還中)が${l >= 2 ? '3/5' : '2/3'}になる`,
    composure: (l) => `物理/魔法命中率+${l >= 2 ? '13' : '10'}%加算`,
    magical_counter: (l) => l >= 2
      ? '魔法には魔法で反撃する(攻撃回数半減しない)'
      : '魔法には魔法で反撃する(攻撃回数半減)',
    focus: (l) => `命中ボーナスの効果が${l >= 2 ? '1.3' : '1.2'}倍になる`,
    prophecy: (l) => l >= 2
      ? '報酬抽選内容が見える、リセット出来るようになる'
      : '報酬抽選内容が見えるようになる',
    stealth: (l) => l >= 2
      ? 'HP29%未満の時、自身へのダメージをすべて回避する'
      : 'HP24%未満の時、自身へのダメージをすべて回避する',
    illusion: (l) => l >= 2
      ? 'パーティーが受ける最初の遠距離攻撃を無効化する'
      : '自分が受ける最初の遠距離攻撃を無効化する',
  };
  return descriptions[id](level);
}
