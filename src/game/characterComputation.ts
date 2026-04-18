import {
  Character,
  ComputedCharacterStats,
  BaseStats,
  Bonus,
  BonusType,
  Ability,
  AbilityId,
  RaceId,
  Item,
  ItemCategory,
  ElementalOffense,
  LEVEL_EQUIP_SLOTS,
} from '../types';
import { getRaceById } from '../data/races';
import { getClassById } from '../data/classes';
import { getPredispositionById } from '../data/predispositions';
import { getLineageById } from '../data/lineages';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES, getSuperRareBonuses } from '../data/items';
import { getBaseMultiplier } from './baseMultiplier';
import { getJewelCBonusValue, getJewelDRankBonus, JEWEL_DEFS } from './jewel';
import { ABILITY_BASE_NAMES } from '../data/abilityNames';

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
  canEquipMelee: boolean;
  canEquipMagic: boolean;
  penet: number;
  canEquipRanged: boolean;
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
  physicalDefenseCBonuses: Map<string, number>;
  magicalDefenseCBonuses: Map<string, number>;
  elementalDefenseMultipliers: {
    fire: number;
    thunder: number;
    ice: number;
  };
  elementalOffenseBonuses: {
    fire: number;
    thunder: number;
    ice: number;
  };
  offenseCBonusNames: Set<string>;
  unlockedRaceAbilities: Set<RaceId>;
  antagonism: boolean;
}

function formatCBonusValue(value: number): string {
  return (Math.round(value * 1000000) / 1000000).toString();
}

function formatDefenseBonusPercent(value: number): string {
  const percent = Math.round(value * 1000) / 10;
  return Number.isInteger(percent) ? `${percent}` : `${percent.toFixed(1)}`;
}

function getUniqueCBonusSum(
  items: Item[],
  kind: 'physical_defense' | 'magical_defense',
  additionalBonuses?: Map<string, number>
): number {
  const appliedBonusNames = new Set<string>();
  let bonusSum = 0;

  for (const item of items) {
    const baseMultiplier = item.baseMultiplier ?? 1;
    if (baseMultiplier === 1) continue;
    if (kind === 'physical_defense' && !item.physicalDefense) continue;
    if (kind === 'magical_defense' && !item.magicalDefense) continue;

    const percent = formatDefenseBonusPercent(baseMultiplier - 1);
    const bonusName = `c.${kind}+${percent}`;
    if (appliedBonusNames.has(bonusName)) continue;
    appliedBonusNames.add(bonusName);
    bonusSum += baseMultiplier - 1;
  }

  if (additionalBonuses) {
    for (const [bonusName, value] of additionalBonuses) {
      if (appliedBonusNames.has(bonusName)) continue;
      appliedBonusNames.add(bonusName);
      bonusSum += value;
    }
  }

  return bonusSum;
}


export const RACE_UNLOCK_ABILITY_IDS: Partial<Record<RaceId, AbilityId>> = {
  caninian: 'resurrect',
  lupinian: 're_counter',
  vulpinian: 'cunning',
  ursan: 'cyborgization',
  felidian: 'covering_fire',
  mustelid: 'peddler',
  leporian: 'magical_counter',
  cervin: 'prophecy',
  procyonian: 'resonance',
};

export const RACE_UNLOCK_BONUS_BY_RACE: Partial<Record<RaceId, BonusType>> = {
  caninian: 'unlock_caninian_ability',
  lupinian: 'unlock_lupinian_ability',
  vulpinian: 'unlock_vulpinian_ability',
  ursan: 'unlock_ursan_ability',
  felidian: 'unlock_felidian_ability',
  mustelid: 'unlock_mustelid_ability',
  leporian: 'unlock_leporian_ability',
  cervin: 'unlock_cervin_ability',
  murid: 'unlock_murid_ability',
  procyonian: 'unlock_procyonian_ability',
};

const BONUS_UNLOCK_RACE_BY_TYPE = Object.fromEntries(
  Object.entries(RACE_UNLOCK_BONUS_BY_RACE).map(([raceId, bonusType]) => [bonusType, raceId]),
) as Partial<Record<BonusType, RaceId>>;

// SpecRef: 2.1.1.2 | Multiplier and Functions | getUnlockedRaceAbilitiesFromBonuses
export function getUnlockedRaceAbilitiesFromBonuses(bonuses: Bonus[]): Set<RaceId> {
  const unlockedRaceAbilities = new Set<RaceId>();

  for (const bonus of bonuses) {
    const raceId = BONUS_UNLOCK_RACE_BY_TYPE[bonus.type];
    if (raceId) {
      unlockedRaceAbilities.add(raceId);
    }
  }

  return unlockedRaceAbilities;
}

function collectRaceBonuses(raceId: RaceId, raceBonuses: Bonus[], collection: BonusCollection): void {
  const unlockAbilityId = RACE_UNLOCK_ABILITY_IDS[raceId];
  const isUnlockAbilityEnabled = collection.unlockedRaceAbilities.has(raceId);

  const applicableBonuses = raceBonuses.filter((bonus) => {
    if (bonus.type !== 'ability') return true;
    if (!unlockAbilityId || bonus.abilityId !== unlockAbilityId) return true;
    return isUnlockAbilityEnabled;
  });

  collectBonuses(applicableBonuses, collection);
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
      case 'equip_melee':
        if (!collection.uniqueCAdditiveBonusNames.has('c.equip_melee')) {
          collection.uniqueCAdditiveBonusNames.add('c.equip_melee');
          collection.canEquipMelee = true;
        }
        break;
      case 'caster':
      case 'equip_magic':
        if (!collection.uniqueCAdditiveBonusNames.has('c.equip_magic')) {
          collection.uniqueCAdditiveBonusNames.add('c.equip_magic');
          collection.canEquipMagic = true;
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
      case 'equip_ranged':
        if (!collection.uniqueCAdditiveBonusNames.has('c.equip_ranged')) {
          collection.uniqueCAdditiveBonusNames.add('c.equip_ranged');
          collection.canEquipRanged = true;
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
      case 'deity_accuracy':
        {
          const bonusPrefix = bonus.type === 'deity_accuracy' ? 'c.deity_accuracy' : 'c.accuracy';
          const bonusName = `${bonusPrefix}+${formatCBonusValue(bonus.value)}`;
          const appliedCount = collection.cAccuracyBonusCounts.get(bonusName) ?? 0;
          if (appliedCount < 1) {
            collection.cAccuracyBonusCounts.set(bonusName, appliedCount + 1);
            collection.accuracy += bonus.value;
          }
        }
        break;
      case 'evasion':
      case 'deity_evasion':
        {
          // c.evasion is unique by name, but penalty-side d.evasion values are stackable.
          if (bonus.value < 0) {
            collection.evasion += bonus.value;
            break;
          }

          const bonusPrefix = bonus.type === 'deity_evasion' ? 'c.deity_evasion' : 'c.evasion';
          const bonusName = `${bonusPrefix}+${formatCBonusValue(bonus.value)}`;
          if (!collection.uniqueEvasionBonusNames.has(bonusName)) {
            collection.uniqueEvasionBonusNames.add(bonusName);
            collection.evasion += bonus.value;
          }
        }
        break;
      case 'unlock_caninian_ability':
        collection.unlockedRaceAbilities.add('caninian');
        break;
      case 'unlock_lupinian_ability':
        collection.unlockedRaceAbilities.add('lupinian');
        break;
      case 'unlock_vulpinian_ability':
        collection.unlockedRaceAbilities.add('vulpinian');
        break;
      case 'unlock_ursan_ability':
        collection.unlockedRaceAbilities.add('ursan');
        break;
      case 'unlock_felidian_ability':
        collection.unlockedRaceAbilities.add('felidian');
        break;
      case 'unlock_mustelid_ability':
        collection.unlockedRaceAbilities.add('mustelid');
        break;
      case 'unlock_leporian_ability':
        collection.unlockedRaceAbilities.add('leporian');
        break;
      case 'unlock_cervin_ability':
        collection.unlockedRaceAbilities.add('cervin');
        break;
      case 'unlock_murid_ability':
        collection.unlockedRaceAbilities.add('murid');
        break;
      case 'unlock_procyonian_ability':
        collection.unlockedRaceAbilities.add('procyonian');
        break;
      case 'ability':
        if (bonus.abilityId) {
          const currentLevel = collection.abilities.get(bonus.abilityId) ?? 0;
          collection.abilities.set(bonus.abilityId, Math.max(currentLevel, bonus.abilityLevel ?? 1));
        }
        break;
      case 'ability_upgrade':
        if (bonus.abilityId) {
          const bonusName = `c.upgrade_${bonus.abilityId}+${formatCBonusValue(bonus.value)}`;
          if (collection.uniqueCAdditiveBonusNames.has(bonusName)) break;
          collection.uniqueCAdditiveBonusNames.add(bonusName);

          const currentLevel = collection.abilities.get(bonus.abilityId) ?? 0;
          if (currentLevel > 0) {
            collection.abilities.set(bonus.abilityId, currentLevel + bonus.value);
          }
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
      case 'physical_defense':
      case 'magical_defense':
        {
          const bonusName = `c.${bonus.type}+${formatDefenseBonusPercent(bonus.value)}`;
          if (collection.uniqueCAdditiveBonusNames.has(bonusName)) break;
          collection.uniqueCAdditiveBonusNames.add(bonusName);
          if (bonus.type === 'physical_defense') {
            collection.physicalDefenseCBonuses.set(bonusName, bonus.value);
          } else {
            collection.magicalDefenseCBonuses.set(bonusName, bonus.value);
          }
        }
        break;
      case 'physical_offense_multiplier_xV':
      case 'magical_offense_multiplier_xV':
      case 'deity_physical_attack_xV':
      case 'deity_magical_attack_xV':
        {
          const bonusName = `c.${bonus.type}_${formatCBonusValue(bonus.value)}`;
          if (collection.offenseCBonusNames.has(bonusName)) break;
          collection.offenseCBonusNames.add(bonusName);
          if (bonus.type === 'physical_offense_multiplier_xV' || bonus.type === 'deity_physical_attack_xV') {
            collection.physicalOffenseMultiplier *= bonus.value;
          } else {
            collection.magicalOffenseMultiplier *= bonus.value;
          }
        }
        break;
      case 'physical_defense_multiplier_xV':
      case 'magical_defense_multiplier_xV':
      case 'deity_physical_defense_x2/3':
      case 'deity_physical_defense_xV':
      case 'deity_pysical_defense_xV':
      case 'deity_magical_defense_x2/3':
      case 'deity_magical_defense_xV':
      case 'fire_defense_multiplier_xV':
      case 'ice_defense_multiplier_xV':
      case 'thunder_defense_multiplier_xV':
      case 'fire_defense':
      case 'ice_defense':
      case 'thunder_defense':
        {
          const bonusName = `c.${bonus.type}_${formatCBonusValue(bonus.value)}`;
          if (collection.offenseCBonusNames.has(bonusName)) break;
          collection.offenseCBonusNames.add(bonusName);
          if (
            bonus.type === 'physical_defense_multiplier_xV'
            || bonus.type === 'deity_physical_defense_x2/3'
            || bonus.type === 'deity_physical_defense_xV'
            || bonus.type === 'deity_pysical_defense_xV'
          ) {
            collection.physicalDefenseMultiplier *= bonus.value;
          } else if (
            bonus.type === 'magical_defense_multiplier_xV'
            || bonus.type === 'deity_magical_defense_x2/3'
            || bonus.type === 'deity_magical_defense_xV'
          ) {
            collection.magicalDefenseMultiplier *= bonus.value;
          } else if (bonus.type === 'fire_defense_multiplier_xV') {
            collection.elementalDefenseMultipliers.fire *= bonus.value;
          } else if (bonus.type === 'ice_defense_multiplier_xV') {
            collection.elementalDefenseMultipliers.ice *= bonus.value;
          } else if (bonus.type === 'fire_defense') {
            collection.elementalDefenseMultipliers.fire *= Math.max(0.01, 1 - (bonus.value / 100));
          } else if (bonus.type === 'ice_defense') {
            collection.elementalDefenseMultipliers.ice *= Math.max(0.01, 1 - (bonus.value / 100));
          } else if (bonus.type === 'thunder_defense') {
            collection.elementalDefenseMultipliers.thunder *= Math.max(0.01, 1 - (bonus.value / 100));
          } else {
            collection.elementalDefenseMultipliers.thunder *= bonus.value;
          }
        }
        break;
      case 'deity_move_first':
        if (bonus.value > 0) {
          const bonusName = `c.deity_move_first+${formatCBonusValue(bonus.value)}`;
          if (collection.uniqueCAdditiveBonusNames.has(bonusName)) break;
          collection.uniqueCAdditiveBonusNames.add(bonusName);

          const currentLevel = collection.abilities.get('first_strike') ?? 0;
          collection.abilities.set('first_strike', currentLevel + bonus.value);
        }
        break;
      case 'fire_offense':
      case 'ice_offense':
      case 'thunder_offense':
        {
          const bonusName = `e.${bonus.type}+${formatCBonusValue(bonus.value)}`;
          if (collection.offenseCBonusNames.has(bonusName)) break;
          collection.offenseCBonusNames.add(bonusName);
          if (bonus.type === 'fire_offense') collection.elementalOffenseBonuses.fire += bonus.value;
          if (bonus.type === 'ice_offense') collection.elementalOffenseBonuses.ice += bonus.value;
          if (bonus.type === 'thunder_offense') collection.elementalOffenseBonuses.thunder += bonus.value;
        }
        break;
    }
  }
}

// SpecRef: 2.1.1.2 | Multiplier and Functions | computeCharacterStats
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
    canEquipMelee: false,
    canEquipMagic: false,
    penet: 0,
    canEquipRanged: false,
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
    physicalDefenseCBonuses: new Map<string, number>(),
    magicalDefenseCBonuses: new Map<string, number>(),
    elementalDefenseMultipliers: {
      fire: 1,
      thunder: 1,
      ice: 1,
    },
    elementalOffenseBonuses: {
      fire: 0,
      thunder: 0,
      ice: 0,
    },
    offenseCBonusNames: new Set<string>(),
    unlockedRaceAbilities: new Set<RaceId>(),
    antagonism: false,
  };

  // Collect bonuses from all sources
  collectRaceBonuses(race.id, race.bonuses, collection);
  collectBonuses(mainClass.mainSubBonuses, collection);
  if (isMasterClass) {
    collectBonuses(mainClass.masterBonuses, collection);
  } else {
    collectBonuses(mainClass.mainBonuses, collection);
    collectBonuses(filterSubclassMainSubBonuses(subClass.mainSubBonuses), collection);
  }
  collectBonuses(predisposition.bonuses, collection);
  collectBonuses(lineage.bonuses, collection);

  // Calculate max equipment slots
  let baseSlots = 1;
  for (const [level, slots] of Object.entries(LEVEL_EQUIP_SLOTS)) {
    if (partyLevel >= parseInt(level)) {
      baseSlots = slots;
    }
  }
  const equipSlotBonus = collection.equipSlotBonusTotal;
  let maxEquipSlots = baseSlots + equipSlotBonus;

  // Collect item-provided unlock bonuses and Super Rare bonuses from currently active slots
  // before deriving b.* stats.
  const initialEquippedItems = character.equipment.slice(0, maxEquipSlots).filter((item): item is Item => item != null);
  for (const item of initialEquippedItems) {
    if (item.bonuses) {
      collectBonuses(item.bonuses, collection);
    }
  }

  if (race.unlockAbility && collection.unlockedRaceAbilities.has(race.id)) {
    collectBonuses(
      race.bonuses.filter((bonus) => bonus.type === 'ability' && bonus.abilityId === RACE_UNLOCK_ABILITY_IDS[race.id]),
      collection,
    );
  }

  for (const item of initialEquippedItems) {
    collectBonuses(getSuperRareBonuses(item.superRare), collection);
  }

  // Calculate base stats (b.*), including Super Rare additive stat bonuses.
  const baseStats: BaseStats = {
    vitality: race.stats.vitality + collection.statBonuses.vitality,
    strength: race.stats.strength + collection.statBonuses.strength,
    intelligence: race.stats.intelligence + collection.statBonuses.intelligence,
    mind: race.stats.mind + collection.statBonuses.mind,
  };

  // Re-evaluate active slots in case a Super Rare bonus affected equip slots.
  maxEquipSlots = baseSlots + collection.equipSlotBonusTotal;

  // Calculate multipliers for each category (product of all unique multipliers)
  const getMultiplier = (category: ItemCategory): number => {
    const bonusType = CATEGORY_TO_MULTIPLIER[category];
    if (!bonusType) return 1;
    const values = collection.multipliers.get(bonusType);
    if (!values || values.length === 0) return 1;
    return values.reduce((prod, v) => prod * v, 1);
  };

  const seekerLevel = collection.abilities.get('seeker') ?? 0;
  const seekerPerLevelBonus = seekerLevel >= 2 ? 0.0075 : seekerLevel >= 1 ? 0.005 : 0;
  const seekerMultiplier = seekerLevel > 0 ? 1 + (partyLevel * seekerPerLevelBonus) : 1;

  // Calculate stats from equipment
  // Process equipment (limited to maxEquipSlots)
  const equippedItems = character.equipment.slice(0, maxEquipSlots).filter((item): item is Item => item != null);

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

  for (const item of equippedItems) {

    if (item.jewel) {
      const cValue = getJewelCBonusValue(item.jewel.key, item.jewel.rank);
      const cDef = JEWEL_DEFS[item.jewel.key];
      if (cDef.cBonusType === 'physical_attack') {
        const name = `c.physical_attack+${Math.round(cValue * 100)}`;
        if (!collection.offenseCBonusNames.has(name)) {
          collection.offenseCBonusNames.add(name);
          collection.physicalAttackCBonus += cValue;
        }
      } else if (cDef.cBonusType === 'magical_attack') {
        const name = `c.magical_attack+${Math.round(cValue * 100)}`;
        if (!collection.offenseCBonusNames.has(name)) {
          collection.offenseCBonusNames.add(name);
          collection.magicalAttackCBonus += cValue;
        }
      } else if (cDef.cBonusType === 'physical_defense') {
        const name = `c.physical_defense+${Math.round(cValue * 100)}`;
        if (!collection.physicalDefenseCBonuses.has(name)) collection.physicalDefenseCBonuses.set(name, cValue);
      } else if (cDef.cBonusType === 'magical_defense') {
        const name = `c.magical_defense+${Math.round(cValue * 100)}`;
        if (!collection.magicalDefenseCBonuses.has(name)) collection.magicalDefenseCBonuses.set(name, cValue);
      } else if (cDef.cBonusType === 'accuracy') {
        const name = `c.accuracy+${Math.round(cValue * 1000)}`;
        const count = collection.cAccuracyBonusCounts.get(name) ?? 0;
        if (count < 1) {
          collection.cAccuracyBonusCounts.set(name, count + 1);
          accuracyBonus += cValue;
        }
      } else if (cDef.cBonusType === 'evasion') {
        const name = `c.evasion+${Math.round(cValue * 1000)}`;
        if (!evasionBonusNames.has(name)) {
          evasionBonusNames.add(name);
          evasionBonus += cValue;
        }
      }

    }
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

    const itemRangedAttack = item.rangedAttack ?? 0;
    const jewelRangedAttack = getJewelDRankBonus(item.jewel, 'rangedAttack');
    if (itemRangedAttack) {
      rangedAttack += Math.round(itemRangedAttack * multiplier);
    }
    if (jewelRangedAttack) {
      rangedAttack += Math.round(jewelRangedAttack * multiplier);
    }
    if (item.rangedNoA) {
      // Round each item contribution individually.
      // Positive NoA scales with enhancement; negative penalties stay fixed.
      const rangedNoAContribution = item.rangedNoA > 0
        ? Math.round(item.rangedNoA * multiplier)
        : item.rangedNoA;
      rangedNoA += rangedNoAContribution;
    }
    const itemMagicalAttack = item.magicalAttack ?? 0;
    const jewelMagicalAttack = getJewelDRankBonus(item.jewel, 'magicalAttack');
    if (itemMagicalAttack) {
      magicalAttack += Math.round(itemMagicalAttack * multiplier);
    }
    if (jewelMagicalAttack) {
      magicalAttack += Math.round(jewelMagicalAttack * multiplier);
    }
    if (item.magicalNoA) {
      // Round each item contribution individually.
      // Catalyst magical_NoA scales with enhancement.
      const magicalNoAContribution = item.magicalNoA > 0
        ? Math.round(item.magicalNoA * multiplier)
        : item.magicalNoA;
      magicalNoA += magicalNoAContribution;
    }
    const itemMeleeAttack = item.meleeAttack ?? 0;
    const jewelMeleeAttack = getJewelDRankBonus(item.jewel, 'meleeAttack');
    if (itemMeleeAttack) {
      meleeAttack += Math.round(itemMeleeAttack * multiplier);
    }
    if (jewelMeleeAttack) {
      meleeAttack += Math.round(jewelMeleeAttack * multiplier);
    }
    if (item.meleeNoA) {
      // Round each item contribution individually.
      // Positive NoA (gauntlet) scales with enhancement; negative (katana) stays fixed.
      const meleeNoAContribution = item.meleeNoA > 0
        ? Math.round(item.meleeNoA * multiplier)
        : item.meleeNoA;
      meleeNoA += meleeNoAContribution;
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
    if (item.penetBonus) {
      const bonusName = `c.penet+${formatCBonusValue(item.penetBonus)}`;
      if (!collection.uniqueCAdditiveBonusNames.has(bonusName)) {
        collection.uniqueCAdditiveBonusNames.add(bonusName);
        collection.penet += item.penetBonus;
      }
    }

    if (item.elementalOffense && item.elementalOffense !== 'none') {
      elementalOffenseTotals[item.elementalOffense] += item.elementalOffenseBonus ?? 0;
    }
  }

  const elementalPriority: Array<Exclude<ElementalOffense, 'none'>> = ['thunder', 'ice', 'fire'];
  let selectedElement: ElementalOffense = 'none';
  let selectedElementBonus = 0;

  for (const element of elementalPriority) {
    const total = elementalOffenseTotals[element] + collection.elementalOffenseBonuses[element];
    if (total > selectedElementBonus) {
      selectedElement = element;
      selectedElementBonus = total;
    }
  }

  elementalOffense = selectedElement;
  elementalOffenseValue = 1 + selectedElementBonus;

  const rangedNoAFixedBonus = Array.from(rangedNoAFixedBonuses).reduce((sum, v) => sum + v, 0);
  rangedNoA += rangedNoAFixedBonus;

  const magicalNoAFixedBonus = Array.from(magicalNoAFixedBonuses).reduce((sum, v) => sum + v, 0);
  magicalNoA += magicalNoAFixedBonus;

  const meleeNoAFixedBonus = Array.from(meleeNoAFixedBonuses).reduce((sum, v) => sum + v, 0);
  meleeNoA += meleeNoAFixedBonus;

  // SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.attack
  // SpecRef: 2.1.1.2 | Multiplier and Functions | character.a.melee-conversion
  const meleeConversionLevel = collection.abilities.get('melee_conversion') ?? 0;
  if (meleeConversionLevel > 0) {
    const conversionRate = meleeConversionLevel >= 2 ? 0.4 : 0.3;
    meleeAttack += Math.round(rangedAttack * conversionRate);
    meleeAttack += Math.round(magicalAttack * conversionRate);
  }

  const originalRangedNoA = Math.ceil(rangedNoA);
  const originalMagicalNoA = Math.ceil(magicalNoA);
  const originalMeleeNoA = Math.ceil(meleeNoA);

  // SpecRef: 2.1.1.2 | Multiplier and Functions | character.f.NoA
  // a.iaigiri: halve physical NoA, round up.
  // a.heavy-strike: halve physical/magical NoA, round up.
  const hasIaigiri = collection.abilities.has('iaigiri');
  const hasHeavyStrike = collection.abilities.has('heavy_strike');
  if (hasIaigiri) {
    rangedNoA = rangedNoA / 2;
    meleeNoA = meleeNoA / 2;
  }
  if (hasHeavyStrike) {
    rangedNoA = rangedNoA / 2;
    magicalNoA = magicalNoA / 2;
    meleeNoA = meleeNoA / 2;
    // Damage amplification and penetration conversion are applied during battle.
  }
  // SpecRef: 2.1.1.2 | Multiplier and Functions | character.a.arc-magic
  // a.arc-magic: reduce magical NoA to 1/3, round up.
  if (collection.abilities.has('arc_magic')) {
    magicalNoA = magicalNoA / 3;
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
    const itemPhysicalDefense = item.physicalDefense ?? 0;
    const jewelPhysicalDefense = getJewelDRankBonus(item.jewel, 'physicalDefense');
    if (itemPhysicalDefense) {
      physicalDefense += Math.round(itemPhysicalDefense * multiplier);
    }
    if (jewelPhysicalDefense) {
      physicalDefense += Math.round(jewelPhysicalDefense * multiplier);
    }
    const itemMagicalDefense = item.magicalDefense ?? 0;
    const jewelMagicalDefense = getJewelDRankBonus(item.jewel, 'magicalDefense');
    if (itemMagicalDefense) {
      magicalDefense += Math.round(itemMagicalDefense * multiplier);
    }
    if (jewelMagicalDefense) {
      magicalDefense += Math.round(jewelMagicalDefense * multiplier);
    }
  }

  physicalDefenseBonus = getUniqueCBonusSum(equippedItems, 'physical_defense', collection.physicalDefenseCBonuses);
  magicalDefenseBonus = getUniqueCBonusSum(equippedItems, 'magical_defense', collection.magicalDefenseCBonuses);

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
    physicalDefense,
    magicalDefense,
    physicalDefenseAmplifier,
    magicalDefenseAmplifier,
    maxEquipSlots,
    abilities,
    penetMultiplier: collection.penet,
    originalRangedNoA,
    originalMagicalNoA,
    originalMeleeNoA,
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

export function getAbilityName(id: AbilityId, level: number): string {
  if (level >= 1) {
    return `${ABILITY_BASE_NAMES[id]}${level}`;
  }
  return ABILITY_BASE_NAMES[id];
}

export function getAbilityDescription(id: AbilityId, level: number): string {
  const descriptions: Record<AbilityId, (level: number) => string> = {
    first_strike: (l) => l >= 3 ? '行動が極めて速くなる' : l === 2 ? '行動がとても速くなる' : '行動が速くなる',
    hunter: (l) => l >= 3
      ? '列による命中率減衰を1列ごと15%→5%に軽減する'
      : l === 2
        ? '列による命中率減衰を1列ごと15%→7%に軽減する'
        : '列による命中率減衰を1列ごと15%→10%に軽減する',
    defender: (l) => `自身より後列の味方への物理ダメージを ${l >= 3 ? '1/2' : l === 2 ? '3/5' : '2/3'}倍`,
    counter: (l) => l >= 3
      ? '敵の近距離攻撃を受けたとき反撃(攻撃回数1.5倍)'
      : l === 2
        ? '敵の近距離攻撃を受けたとき反撃(攻撃回数半減しない)'
        : '敵の近距離攻撃を受けたとき反撃(攻撃回数半減)',
    re_attack: (l) => l >= 3
      ? '攻撃時に追加攻撃を1回行う(攻撃回数は半減しない)'
      : l === 2
        ? '攻撃時に追加攻撃を1回行う(攻撃回数は0.7倍)'
        : '攻撃時に追加攻撃を1回行う(攻撃回数半減)',
    iaigiri: (l) => `物理ダメージをx${l >= 3 ? '2.0' : l === 2 ? '1.8' : '1.6'}倍する。攻撃回数を半減する`,
    heavy_strike: (l) => `物理/魔法ダメージを1.4倍する。攻撃回数を半減し(切り上げ)、減少分を貫通値に変換する(${l >= 2 ? '+1.5' : '+1.0'}%/回)`,
    resonance: (l) => `魔法攻撃1回毎に、全ヒットのダメージが+${l >= 5 ? 15 : l === 4 ? 13 : l === 3 ? 11 : l === 2 ? 8 : 5}%増加する`,
    command: (l) => `自身より後列の味方が与える物理ダメージを ${l >= 3 ? 1.43 : l === 2 ? 1.35 : 1.2}倍`,
    m_barrier: (l) => `自身より後列の味方への魔法ダメージを ${l >= 3 ? '1/2' : l === 2 ? '3/5' : '2/3'}倍`,
    deflection: (l) => `敵の遠距離攻撃の命中率を${l >= 2 ? '15' : '10'}%低下させる`,
    null_counter: (l) => l >= 3
      ? '反撃を無効化する(3回まで)'
      : l === 2
        ? '反撃を無効化する(2回まで)'
        : '反撃を無効化する(1回のみ)',
    unlock: () => '追加報酬チャンス',
    squander: (l) => `宴会で消費するゴールドが${l >= 2 ? '1.5' : '1.3'}倍になる`,
    tithe: (l) => `祈り時に寄付額へ探検利益の+${l >= 2 ? '15' : '10'}%を加算`,
    seeker: (l) => `魔導書の効果増加(レベル毎に${l >= 2 ? '0.75' : '0.50'}%)`,
    resurrect: (l) => l >= 2
      ? '自分が受けた致命ダメージをHP1%残して耐える(1回のみ)'
      : '自分が受けた致命ダメージをHP1残して耐える',
    rage: (l) => `物理/魔法攻撃倍率増大(受けたダメージ1%につき${l >= 2 ? '0.6' : '0.5'}%増)`,
    re_counter: (l) => l >= 2
      ? '敵から反撃に対して、反撃する(攻撃回数半減しない)'
      : '敵から反撃に対して、反撃する(攻撃回数半減)',
    momentum: (l) => `物理/魔法攻撃倍率1.25倍(受けたダメージ1%につき${l >= 2 ? '0.4' : '0.5'}%減)、収益の一部を着服する`,
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
    arcane_stability: (l) => `魔法/物理攻撃の命中率は${l >= 2 ? '60' : '55'}%を下回らない`,
    arc_magic: (l) => `使用する魔法が大魔法になる(魔法攻撃回数1/3・魔法ダメージ${l >= 3 ? '4.2' : l === 2 ? '3.6' : '3'}倍)`,
    melee_conversion: (l) => `遠距離攻撃力の${l >= 2 ? '40' : '30'}%と魔法攻撃力の${l >= 2 ? '40' : '30'}%を近距離攻撃力に加算する`,
    true_sight: () => '灰霞や霧の中でも視認できる(悪影響を受けなくなる)',
    output_stabilizer: () => '地形効果による攻撃回数の変動を受けなくなる',
    equation_breaker: () => '理論武装する(機械理論、静寂領域の地形効果が無効になる)',
    unforgettable: () => 'アビリティは消して忘れることがなくなる(忘却無効)',
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
    howl: (l) => `遠距離2タイミングで発動。相手の次の攻撃回数${l >= 5 ? '1/7' : l === 4 ? '2/7' : l === 3 ? '3/7' : l === 2 ? '4/7' : '5/7'}`,
    predator_sense: (l) => `近接9(開始)タイミングで発動。相手のHPが${l >= 5 ? '50' : l === 4 ? '48' : l === 3 ? '44' : l === 2 ? '38' : '30'}％未満の場合、命中+40`,
    slow: (l) => `自身の行動順番に-${l >= 3 ? '3' : l === 2 ? '2' : '1'}して遅くなる`,
    boost: (l) => `自身の行動順番に+${l >= 3 ? '3' : l === 2 ? '2' : '1'}して速くなる`,
    corrode: (l) => `通常近接攻撃が3回以上命中した相手に対して、攻撃倍率x${l >= 5 ? '2/7' : l === 4 ? '3/7' : l === 3 ? '4/7' : l === 2 ? '5/7' : '6/7'}`,
    life_drain: (l) => `通常近接攻撃で相手に与えたダメージ${l >= 5 ? 'を' : `の${l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'}を`}回復`,
    no_offense: () => '通常行動をしなくなる(反撃などは行う)',
    decompose: (l) => `近接2タイミングで発動。相手の物理防御力を${l >= 5 ? '2/7' : l === 4 ? '3/7' : l === 3 ? '4/7' : l === 2 ? '5/7' : '6/7'}`,
    swarm: () => '失ったHP割合に応じて物理与ダメージ低下・物理被ダメージ増加(HP1%につき0.5%)',
    death_touch: (l) => `通常近接攻撃の命中回数 x ${l >= 5 ? '6/256' : l === 4 ? '5/256' : l === 3 ? '4/256' : l === 2 ? '3/256' : '2/256'}の確率で即死`,
    flying: () => '相手の近接攻撃回数が1/4になる',
    free: (l) => `${l >= 5 ? '魔法2' : l === 4 ? '魔法1' : `近接${l}` }タイミングで発動。戦闘から逃げる(戦闘は引分になる)`,
    first_aid: (l) => `戦闘終了後に、自身のHP増加基礎値とアイテムHP増加値の${l >= 5 ? '6' : l === 4 ? '5' : l === 3 ? '4' : l === 2 ? '3' : '2'}%を回復する`,
    frostbite: () => '相手の行動順番に-1を加えて遅らせる',
    ice_reflect: (l) => `自身が受ける予定の通常攻撃の氷属性ダメージを反射(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して相手に与える(自身もダメージ(${l >= 5 ? '0/10' : l === 4 ? '3/10' : l === 3 ? '5/10' : l === 2 ? '7/10' : '9/10'})を受ける)`,
    ice_absorb: (l) => `自身が受ける予定の通常攻撃の氷属性ダメージを無効化し、一部吸収(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して回復する`,
    ice_null: () => '自身が受ける予定の通常攻撃の氷属性ダメージを無効化する',
    bind: (l) => `近接攻撃の命中回数 x ${l >= 5 ? '6/64' : l === 4 ? '5/64' : l === 3 ? '4/64' : l === 2 ? '3/64' : '2/64'}の確率で相手の行動を封じる`,
    regeneration: (l) => `近接9(開始)タイミングで発動。この戦闘で失ったHPの${l >= 5 ? '24' : l === 4 ? '22' : l === 3 ? '19' : l === 2 ? '15' : '10'}%を回復する。近接フェーズ前までにHPが0となった場合には発動しない`,
    burn: (l) => `近接攻撃を受けた際に、相手に命中回数x 最大HPの${l >= 5 ? '1.5' : l === 4 ? '1.4' : l === 3 ? '1.2' : l === 2 ? '0.9' : '0.5'}%の火属性ダメージを与え返す`,
    fire_reflect: (l) => `自身が受ける予定の通常攻撃の火属性ダメージを反射(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して相手に与える(自身もダメージ(${l >= 5 ? '0/10' : l === 4 ? '3/10' : l === 3 ? '5/10' : l === 2 ? '7/10' : '9/10'})を受ける)`,
    fire_absorb: (l) => `自身が受ける予定の通常攻撃の火属性ダメージを無効化し、一部吸収(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して回復する`,
    fire_null: () => '自身が受ける予定の通常攻撃の火属性ダメージを無効化する',
    thunder_reflect: (l) => `自身が受ける予定の通常攻撃の雷属性ダメージを反射(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して相手に与える(自身もダメージ(${l >= 5 ? '0/10' : l === 4 ? '3/10' : l === 3 ? '5/10' : l === 2 ? '7/10' : '9/10'})を受ける)`,
    thunder_absorb: (l) => `自身が受ける予定の通常攻撃の雷属性ダメージを無効化し、一部吸収(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して回復する`,
    thunder_null: () => '自身が受ける予定の通常攻撃の雷属性ダメージを無効化する',
    soul_reap: (l) => `魔法0(終了)タイミングで発動。相手のHPが${l >= 5 ? '20' : l === 4 ? '19' : l === 3 ? '17' : l === 2 ? '14' : '10'}％未満であった場合、相手は即死する。回避も復活もできない`,
    mutual_magic_amplify: (l) => `双方魔法ダメージ${l >= 5 ? '1.68' : l === 4 ? '1.65' : l === 3 ? '1.6' : l === 2 ? '1.5' : '1.3'}倍`,
    mutual_magic_restraint: (l) => `双方魔法ダメージ${l >= 5 ? '0.59' : l === 4 ? '0.61' : l === 3 ? '0.63' : l === 2 ? '0.67' : '0.77'}倍`,
    ranged_confusion: (l) => `${l <= 2 ? '遠距離1' : '遠距離2'}タイミングで発動。${l >= 5 ? '7/32' : l === 4 ? '5/32' : l >= 2 ? '3/32' : '1/32'}${l >= 2 ? 'の' : ''}確率で遠距離攻撃能力を持つ相手一人を敵対状態とする`,
    magic_confusion: (l) => `${l <= 2 ? '魔法1' : '魔法2'}タイミングで発動。${l >= 5 ? '7/32' : l === 4 ? '5/32' : l >= 2 ? '3/32' : '1/32'}${l >= 2 ? 'の' : ''}確率で魔法攻撃能力を持つ相手一人を敵対状態とする`,
    melee_confusion: (l) => `${l <= 2 ? '近接1' : '近接2'}タイミングで発動。${l >= 5 ? '7/32' : l === 4 ? '5/32' : l >= 2 ? '3/32' : '1/32'}${l >= 2 ? 'の' : ''}確率で近接攻撃能力を持つ相手一人を敵対状態とする`,
    self_destruct: (l) => `近接2タイミングで発動。自爆する。相手に残ダメージの${l >= 5 ? '全て' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'}を与える`,
    oblivion: () => '無作為に選んだ相手のアビリティ1つをこの戦闘中無効にする',
    reanimate: (l) => `自身のHPが0となったタイミングで発動。HP${l >= 5 ? '38' : l === 4 ? '35' : l === 3 ? '31' : l === 2 ? '26' : '20'}%で復活する(戦闘中1回のみ有効)`,
    requiem: () => '即時蘇生が一度発動した相手への攻撃命中時、相手を即死させる',
    auriferous: () => '自身が受ける総攻撃回数10回毎に、自身がドロップするアイテム抽選確率を+1する',
    magic_seal: () => '最初の魔法を無力化する(相手だけでなく自身や味方にもこの制約を受ける)',
    ambush: (l) => `自身の通常行動時点でいずれの相手もまだこの戦闘中に行動していなかった場合、与ダメージ${l >= 5 ? '1.68' : l === 4 ? '1.65' : l === 3 ? '1.6' : l === 2 ? '1.5' : '1.3'}倍`,
    overwatch: (l) => `自身の通常行動時点で味方および相手がまだこの戦闘中に行動していなかった場合、与ダメージ${l >= 5 ? '1.68' : l === 4 ? '1.65' : l === 3 ? '1.6' : l === 2 ? '1.5' : '1.3'}倍`,
    execution: (l) => `相手の残HPが${l >= 2 ? '50' : '40'}%以下のとき、与ダメージ${l >= 2 ? '1.8' : '1.5'}倍`,
    mimic: () => '相手のアビリティ1つを無作為に指定する。指定したアビリティの効果を発動する',
    shock: () => '相手の最初の通常近接攻撃に対して発動。相手の近接攻撃が1回目ヒットした段階で攻撃をやめさせる',
    null_shock: () => '感電しなくなる',
    mutual_physical_amplify: (l) => `双方物理ダメージ${l >= 5 ? '1.68' : l === 4 ? '1.65' : l === 3 ? '1.6' : l === 2 ? '1.5' : '1.3'}倍`,
    mutual_physical_restraint: (l) => `双方物理ダメージ${l >= 5 ? '0.59' : l === 4 ? '0.61' : l === 3 ? '0.63' : l === 2 ? '0.67' : '0.77'}倍`,
    unstable_core: (l) => `遠距離0(終了)タイミングと魔法0(終了)タイミングにそれぞれ発動。残HP${l >= 5 ? '12' : l === 4 ? '15' : l === 3 ? '19' : l === 2 ? '24' : '30'}%の自傷ダメージを受ける`,
    magical_reflect: (l) => `自身が受ける予定の通常攻撃の魔法ダメージを反射(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して相手に与える(自身もダメージ(${l >= 5 ? '0/10' : l === 4 ? '3/10' : l === 3 ? '5/10' : l === 2 ? '7/10' : '9/10'})を受ける)`,
    magical_absorb: (l) => `自身が受ける予定の通常攻撃の魔法ダメージを無効化し、一部吸収(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して回復する`,
    magical_null: () => '自身が受ける予定の通常攻撃の魔法ダメージを無効化する',
    ranged_reflect: (l) => `自身が受ける予定の遠距離攻撃のダメージを反射(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して相手に与える(自身もダメージ(${l >= 5 ? '0/10' : l === 4 ? '3/10' : l === 3 ? '5/10' : l === 2 ? '7/10' : '9/10'})を受ける)`,
    ranged_null: () => '自身が受ける予定の遠距離攻撃のダメージを無効化する',
    melee_reflect: (l) => `自身が受ける予定の近接攻撃のダメージを反射(${l >= 5 ? '全' : l === 4 ? '7/10' : l === 3 ? '5/10' : l === 2 ? '3/10' : '1/10'})して相手に与える(自身もダメージ(${l >= 5 ? '0/10' : l === 4 ? '3/10' : l === 3 ? '5/10' : l === 2 ? '7/10' : '9/10'})を受ける)`,
    melee_null: () => '自身が受ける予定の近接攻撃のダメージを無効化する',
    null_antagonism: () => '敵対の効果が自身に効かなくなる',
    colossal: () => '自身の物理防御力が2倍になり、物理被ダメージ補正がx2.0になる',
    upgrade_all_abilities: (l) => `自身の他のアビリティを${l >= 4 ? '4' : l === 3 ? '3' : l === 2 ? '2' : '1'}段階強化する(上限レベル5)`,
  };
  return descriptions[id](level);
}
