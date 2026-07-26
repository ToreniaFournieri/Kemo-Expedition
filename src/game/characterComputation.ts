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
import { t } from '../i18n';
import { ENEMIES } from '../data/enemies';

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


const RACE_UNLOCK_ABILITY_IDS: Partial<Record<RaceId, AbilityId>> = {
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

const RACE_UNLOCK_BONUS_BY_RACE: Partial<Record<RaceId, BonusType>> = {
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
          const bonusName = `c.equip_slot${bonus.value >= 0 ? '+' : ''}${formatCBonusValue(bonus.value)}`;
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
  if (character.raceId !== 'mimorian') {
    collectRaceBonuses(race.id, race.bonuses, collection);
  }
  collectBonuses(mainClass.mainSubBonuses, collection);
  if (isMasterClass) {
    collectBonuses(mainClass.masterBonuses, collection);
  } else {
    collectBonuses(mainClass.mainBonuses, collection);
    collectBonuses(filterSubclassMainSubBonuses(subClass.mainSubBonuses), collection);
  }
  // SpecRef: 8.2.3 | Character Edit Mode (selected member): | Exception — Mimorian characters
  if (character.raceId === 'mimorian') {
    const copiedEnemy = ENEMIES.find((enemy) => enemy.id === character.mimorianEnemyId);
    if (copiedEnemy) {
      collectBonuses(copiedEnemy.bonuses ?? [], collection);
      collectBonuses(copiedEnemy.abilities.map((ability) => ({
        type: 'ability' as const,
        value: ability.level,
        abilityId: ability.id,
      })), collection);
    }
    // The copied form supplements the Mimorian rather than replacing its
    // intrinsic penalty. Apply the race bonuses after the copied enemy so the
    // Mimorian's own modifiers are always retained.
    collectRaceBonuses(race.id, race.bonuses, collection);
  } else {
    collectBonuses(predisposition.bonuses, collection);
    collectBonuses(lineage.bonuses, collection);
  }

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
      physical: 1,
      magical: 1,
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
  // SpecRef: 8.1 | UI_FOUNDATIONS | Localization lookup
  void level;
  return t(`ability.${id}.description`);
}
