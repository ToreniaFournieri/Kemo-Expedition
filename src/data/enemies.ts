import { EnemyDef, EnemyType, EnemyClassId, ElementalOffense, ElementalResistance, ItemDef, AbilityId, EnemyAbility, Bonus, MagicStyle } from '../types';
import { getItemById } from './items';
import { MASTER_EXPEDITION_ENEMIES_PACKED } from './masterSpecData';
import { getEnemyCyborgizationAdjustment, resolveEnemyPassiveAbilities } from '../game/enemyPassiveAbilities';
import { buildEnemyClassMasterStats } from './enemyClasses';
import { t } from '../i18n';

// ============================================================
// EnemyTemplate type - compact format for defining enemies
// ============================================================
type EnemyTemplate = {
  name: string;
  nameKey?: string;
  hpMod: number;
  attackType: 'melee' | 'ranged' | 'magical' | 'mixed';
  attackMod: number;
  defenseMod: number;
  element?: ElementalOffense;
  resistances?: Partial<Record<ElementalResistance, number>>;
};

function normalizeEnemyElementalBonusValue(value: number): number {
  return value > 1 ? value / 100 : value;
}

function getEnemyElementalOffenseProfile(
  enemyType: string,
  templateElement?: ElementalOffense,
): { elementalOffense: ElementalOffense; elementalOffenseValue: number } {
  const bonuses = getEnemyTypeBonuses(enemyType);
  const elementalBonusTotals: Record<Exclude<ElementalOffense, 'none'>, number> = {
    fire: 0,
    ice: 0,
    thunder: 0,
  };

  for (const bonus of bonuses) {
    if (bonus.type === 'fire_offense') elementalBonusTotals.fire += normalizeEnemyElementalBonusValue(bonus.value);
    if (bonus.type === 'ice_offense') elementalBonusTotals.ice += normalizeEnemyElementalBonusValue(bonus.value);
    if (bonus.type === 'thunder_offense') elementalBonusTotals.thunder += normalizeEnemyElementalBonusValue(bonus.value);
  }

  const elementalPriority: Array<Exclude<ElementalOffense, 'none'>> = ['thunder', 'ice', 'fire'];
  let selectedElement: ElementalOffense = 'none';
  let selectedBonus = 0;
  for (const element of elementalPriority) {
    const total = elementalBonusTotals[element];
    if (total > selectedBonus) {
      selectedBonus = total;
      selectedElement = element;
    }
  }

  if (selectedElement !== 'none') {
    return {
      elementalOffense: selectedElement,
      elementalOffenseValue: 1 + selectedBonus,
    };
  }

  return {
    elementalOffense: templateElement ?? 'none',
    elementalOffenseValue: 1.0,
  };
}

type EnemyTypeSpec = {
  ability1: EnemyAbility[];
  ability30?: EnemyAbility[];
  bonuses: Bonus[];
  bonus30?: Bonus[];
};

const ENEMY_TYPE_SPECS: Record<string, EnemyTypeSpec> = {
  Beast: {
    ability1: [{ id: 'howl', level: 1 }],
    ability30: [{ id: 'predator_sense', level: 1 }],
    bonuses: [
      { type: 'growth_xV', value: 1.1 },
      { type: 'fire_defense_multiplier_xV', value: 1.3 },
      { type: 'thunder_defense_multiplier_xV', value: 2 / 3 },
    ],
  },
  Slime_Colony: {
    ability1: [{ id: 'slow', level: 1 }, { id: 'corrode', level: 1 }],
    ability30: [{ id: 'life_drain', level: 3 }],
    bonuses: [{ type: 'ice_defense_multiplier_xV', value: 1.3 }],
  },
  Plant_Fungal: {
    ability1: [{ id: 'no_offense', level: 1 }, { id: 'magical_counter', level: 1 }, { id: 'counter', level: 1 }],
    ability30: [{ id: 'decompose', level: 1 }],
    bonuses: [
      { type: 'fire_defense_multiplier_xV', value: 1.3 },
      { type: 'thunder_defense_multiplier_xV', value: 2 / 3 },
      { type: 'ice_defense_multiplier_xV', value: 2 / 3 },
      { type: 'grit', value: 1 },
      { type: 'caster', value: 1 },
    ],
  },
  Insect_Swarm: {
    ability1: [{ id: 'swarm', level: 1 }, { id: 'pursuit', level: 1 }, { id: 'thunder_protect_breaker', level: 1 }],
    ability30: [{ id: 'death_touch', level: 1 }],
    bonuses: [
      { type: 'thunder_offense', value: 20 },
      { type: 'fire_defense_multiplier_xV', value: 1.3 },
      { type: 'thunder_defense_multiplier_xV', value: 2 / 3 },
    ],
  },
  Aerial: {
    ability1: [{ id: 'flying', level: 1 }, { id: 'vine_cutter', level: 1 }],
    ability30: [{ id: 'free', level: 1 }],
    bonuses: [{ type: 'evasion', value: 0.045 }, { type: 'growth_xV', value: 0.7 }],
  },
  Frost: {
    ability1: [{ id: 'frostbite', level: 1 }, { id: 'null_burn', level: 1 }, { id: 'ice_protect_breaker', level: 1 }],
    ability30: [{ id: 'ice_reflect', level: 1 }, { id: 'ice_protect_breaker', level: 1 }],
    bonuses: [
      { type: 'ice_offense', value: 20 },
      { type: 'fire_defense_multiplier_xV', value: 1.3 },
      { type: 'ice_defense_multiplier_xV', value: 1 / 5 },
    ],
  },
  Fruit: {
    ability1: [{ id: 'bind', level: 1 }, { id: 'null_antagonism', level: 1 }],
    ability30: [{ id: 'execution', level: 1 }],
    bonuses: [{ type: 'thunder_defense_multiplier_xV', value: 1.3 }, { type: 'equip_slot', value: 1 }],
  },
  Dragon: {
    ability1: [{ id: 'burn', level: 1 }, { id: 'command', level: 1 }],
    ability30: [{ id: 'fire_reflect', level: 1 }],
    bonuses: [
      { type: 'fire_offense', value: 25 },
      { type: 'fire_defense_multiplier_xV', value: 1 / 2 },
      { type: 'ice_defense_multiplier_xV', value: 1.3 },
      { type: 'equip_slot', value: 2 },
    ],
  },
  Voidspawn: {
    ability1: [{ id: 'null_counter', level: 1 }, { id: 'equation_breaker', level: 1 }],
    ability30: [{ id: 'oblivion', level: 1 }],
    bonuses: [
      { type: 'fire_defense_multiplier_xV', value: 2 / 3 },
      { type: 'ice_defense_multiplier_xV', value: 2 / 3 },
      { type: 'thunder_defense_multiplier_xV', value: 1.3 },
    ],
  },
  Spirit: {
    ability1: [{ id: 'soul_reap', level: 1 }],
    ability30: [{ id: 'mutual_magic_amplify', level: 1 }],
    bonuses: [
      { type: 'ice_offense', value: 20 },
      { type: 'fire_defense_multiplier_xV', value: 1.5 },
      { type: 'ice_defense_multiplier_xV', value: 2 / 3 },
      { type: 'thunder_defense_multiplier_xV', value: 4 / 5 },
      { type: 'physical_defense_multiplier_xV', value: 3 / 5 },
    ],
  },
  Ghost: {
    ability1: [{ id: 'ranged_confusion', level: 1 }, { id: 'rage_breaker', level: 1 }],
    ability30: [{ id: 'self_destruct', level: 1 }],
    bonuses: [
      { type: 'evasion', value: 0.02 },
      { type: 'physical_defense_multiplier_xV', value: 3 / 5 },
      { type: 'ice_defense_multiplier_xV', value: 1.5 },
    ],
  },
  Undead: {
    ability1: [{ id: 'slow', level: 1 }, { id: 'oblivion', level: 1 }],
    ability30: [{ id: 'reanimate', level: 3 }],
    bonuses: [
      { type: 'physical_defense_multiplier_xV', value: 1 / 2 },
      { type: 'fire_defense_multiplier_xV', value: 1.5 },
      { type: 'ice_defense_multiplier_xV', value: 2 / 3 },
      { type: 'equip_slot', value: 1 },
    ],
  },
  Golem: {
    ability1: [{ id: 'auriferous', level: 1 }, { id: 'defender', level: 1 }],
    ability30: [{ id: 'magic_seal', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.3 }, { type: 'thunder_defense_multiplier_xV', value: 1.3 }, { type: 'equip_slot', value: 1 }],
  },
  Shadowfang: {
    ability1: [{ id: 'ambush', level: 1 }, { id: 'm_barrier_breaker', level: 1 }],
    ability30: [{ id: 'mimic', level: 1 }],
    bonuses: [
      { type: 'fire_offense', value: 20 },
      { type: 'fire_defense_multiplier_xV', value: 1.3 },
      { type: 'ice_defense_multiplier_xV', value: 2 / 3 },
    ],
  },
  Mech: {
    ability1: [{ id: 'shock', level: 1 }],
    ability30: [{ id: 'mutual_physical_amplify', level: 2 }],
    bonuses: [
      { type: 'physical_defense_multiplier_xV', value: 3 / 5 },
      { type: 'thunder_defense_multiplier_xV', value: 1.5 },
    ],
  },
  Chiropteran: {
    ability1: [{ id: 'bulwark_breaker', level: 1 }, { id: 'output_stabilizer', level: 1 }],
    ability30: [{ id: 'mutual_physical_amplify', level: 1 }],
    bonuses: [
      { type: 'growth_xV', value: 1.1 },
      { type: 'thunder_defense_multiplier_xV', value: 1.2 },
    ],
  },
  Chimera: {
    ability1: [{ id: 'unstable_core', level: 1 }, { id: 'domain_breaker', level: 1 }, { id: 'momentum_breaker', level: 1 }],
    ability30: [{ id: 'mutual_magic_restraint', level: 1 }],
    bonuses: [
      { type: 'thunder_offense', value: 30 },
      { type: 'grit', value: 1 },
      { type: 'pursuit', value: 1 },
      { type: 'caster', value: 1 },
      { type: 'growth_xV', value: 1.7 },
    ],
  },
  Titan: {
    ability1: [{ id: 'colossal', level: 1 }, { id: 'siege', level: 1 }],
    ability30: [{ id: 'mutual_physical_restraint', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.5 }, { type: 'equip_slot', value: 2 }],
  },
  Pony: {
    ability1: [{ id: 'illusion_breaker', level: 1 }, { id: 'resonance', level: 1 }],
    ability30: [{ id: 'mutual_magic_amplify', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.2 }],
  },
  Origami: {
    ability1: [{ id: 'thunder_null', level: 1 }, { id: 'null_death_touch', level: 1 }],
    ability30: [],
    bonuses: [
      { type: 'growth_xV', value: 0.7 },
      { type: 'fire_defense_multiplier_xV', value: 1.5 },
    ],
    bonus30: [{ type: 'evasion', value: 0.1 }],
  },
  Jinma: {
    ability1: [{ id: 'upgrade_all_abilities', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.3 }],
  },
  Orcinian: {
    ability1: [{ id: 'execution', level: 1 }],
    ability30: [{ id: 'overwatch', level: 1 }],
    bonuses: [],
  },
  Kemono: {
    ability1: [],
    bonuses: [],
  },
  Caninian: {
    ability1: [{ id: 'seeker', level: 1 }],
    ability30: [{ id: 'resurrect', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.1 }],
  },
  Lupinian: {
    ability1: [{ id: 'rage', level: 1 }],
    ability30: [{ id: 're_counter', level: 1 }],
    bonuses: [
      { type: 'ice_offense', value: 5 },
      { type: 'ice_defense_multiplier_xV', value: 2 / 3 },
    ],
  },
  Vulpinian: {
    ability1: [{ id: 'momentum', level: 1 }],
    ability30: [{ id: 'cunning', level: 1 }],
    bonuses: [{ type: 'thunder_offense', value: 5 }],
  },
  Felidian: {
    ability1: [{ id: 'first_strike', level: 1 }],
    ability30: [{ id: 'covering_fire', level: 1 }],
    bonuses: [
      { type: 'fire_offense', value: 5 },
      { type: 'fire_defense_multiplier_xV', value: 2 / 3 },
    ],
  },
  Ursan: {
    ability1: [{ id: 'bulwark', level: 1 }],
    ability30: [{ id: 'cyborgization', level: 1 }],
    bonuses: [{ type: 'fire_offense', value: 20 }],
  },
  Procyonian: {
    ability1: [{ id: 'resonance', level: 1 }],
    ability30: [{ id: 'illusion', level: 1 }],
    bonuses: [
      { type: 'thunder_offense', value: 20 },
      { type: 'thunder_defense_multiplier_xV', value: 2 / 3 },
    ],
  },
  Leporian: {
    ability1: [{ id: 'composure', level: 1 }],
    ability30: [{ id: 'magical_counter', level: 1 }],
    bonuses: [{ type: 'ice_offense', value: 20 }],
  },
  Cervin: {
    ability1: [{ id: 'focus', level: 1 }],
    ability30: [{ id: 'prophecy', level: 1 }],
    bonuses: [],
  },
  Murid: {
    ability1: [{ id: 'stealth', level: 1 }],
    bonuses: [{ type: 'penet', value: 0.1 }],
  },
};

export function getEnemyTypeBonuses(enemyType: string, enemyTypeLevel = 1): Bonus[] {
  const enemyTypeSpec = ENEMY_TYPE_SPECS[enemyType];
  return [
    ...(enemyTypeSpec?.bonuses ?? []),
    ...(enemyTypeLevel >= 30 ? (enemyTypeSpec?.bonus30 ?? []) : []),
  ];
}

export function getEnemyTypeAbilities(enemyType: string, enemyTypeLevel = 1): EnemyAbility[] {
  // SpecRef: 4.2.2 | Enemy | ability1 / ability30
  const enemyTypeSpec = ENEMY_TYPE_SPECS[enemyType];
  return [
    ...(enemyTypeSpec?.ability1 ?? []),
    ...(enemyTypeLevel >= 30 ? (enemyTypeSpec?.ability30 ?? []) : []),
  ];
}

function mergeEnemyAbilities(...sets: EnemyAbility[][]): EnemyAbility[] {
  const merged = new Map<AbilityId, EnemyAbility>();
  for (const abilities of sets) {
    for (const ability of abilities) {
      const existing = merged.get(ability.id);
      if (!existing || existing.level < ability.level) {
        merged.set(ability.id, { ...ability });
      }
    }
  }
  return Array.from(merged.values());
}

// ============================================================
// Generate enemy from template
// ============================================================
function createEnemyFromTemplate(
  id: number,
  template: EnemyTemplate,
  tier: number,
  type: EnemyType,
  poolId: number,
  enemyClass: EnemyClassId,
  enemySubClass: EnemyClassId | 'none',
  enemyType: string,
  spawnPool: number,
  itemIds: readonly number[] = [],
  extraAbilities: EnemyAbility[] = [],
  enemyTypeLevel = 1,
): EnemyDef {
  // SpecRef: 4.1.4 | Base data structure (enemy) | Calculation of master value
  const classBase = buildEnemyClassMasterStats(enemyClass, enemySubClass);
  const enemyTypeAbilities = getEnemyTypeAbilities(enemyType, enemyTypeLevel);
  const enemyAbilities = resolveEnemyPassiveAbilities(mergeEnemyAbilities(classBase.abilities, extraAbilities, enemyTypeAbilities));
  const cyborgizationAdjustment = getEnemyCyborgizationAdjustment(
    enemyAbilities.find((ability) => ability.id === 'cyborgization')?.level ?? 0,
  );
  const accuracyBonus = classBase.accuracyBonus + cyborgizationAdjustment.accuracyBonus;
  const evasionBonus = classBase.evasionBonus + cyborgizationAdjustment.evasionBonus;

  // Master enemy data (before runtime expedition/god scaling)
  const hp = Math.floor(classBase.hp * template.hpMod);
  const attackScale = template.attackMod;
  const defenseScale = template.defenseMod;
  const elementalOffenseProfile = getEnemyElementalOffenseProfile(enemyType, template.element);

  const enemyNameKey = template.nameKey;
  const enemyName = enemyNameKey ? t(enemyNameKey) : template.name;

  return {
    id,
    type,
    enemyType,
    spawnTier: tier,
    spawnPool,
    poolId,
    get name() {
      // SpecRef: 8.1 | UI_FOUNDATIONS | Localization lookup
      return enemyNameKey ? t(enemyNameKey) : enemyName;
    },
    ...(enemyNameKey ? { nameKey: enemyNameKey } : {}),
    enemyClass,
    enemySubClass,
    abilities: enemyAbilities,
    bonuses: getEnemyTypeBonuses(enemyType),
    accuracyBonus,
    evasionBonus,
    hp,
    rangedAttack: Math.floor(classBase.rangedAttack * attackScale),
    rangedNoA: classBase.rangedNoA,
    magicalAttack: Math.floor(classBase.magicalAttack * attackScale),
    magicalNoA: classBase.magicalNoA,
    meleeAttack: Math.floor(classBase.meleeAttack * attackScale),
    meleeNoA: classBase.meleeNoA,
    // f.offense_amplifier scales only through runtime expedition/god multipliers.
    rangedAttackAmplifier: classBase.rangedAttackAmplifier,
    magicalAttackAmplifier: classBase.magicalAttackAmplifier,
    meleeAttackAmplifier: classBase.meleeAttackAmplifier,
    physicalDefense: Math.floor(classBase.physicalDefense * defenseScale),
    magicalDefense: Math.floor(classBase.magicalDefense * defenseScale),
    elementalOffense: elementalOffenseProfile.elementalOffense,
    elementalOffenseValue: elementalOffenseProfile.elementalOffenseValue,
    elementalResistance: {
      fire: template.resistances?.fire ?? 1.0,
      thunder: template.resistances?.thunder ?? 1.0,
      ice: template.resistances?.ice ?? 1.0,
    },
    physicalDefenseAmplifier: 1.0,
    magicalDefenseAmplifier: 1.0,
    experience: Math.floor(classBase.experience * template.hpMod),
    itemIds,
  };
}

// ============================================================
// Generate all enemies
// ============================================================
const MASTER_ENEMY_BONUS_ABILITIES: Partial<Record<number, EnemyAbility[]>> = {
  // SpecRef: 4.2.2 | Enemy | additional abilities or bonus
  102: [{ id: 'dryproof', level: 1 }],
  105: [{ id: 'howl', level: 1 }],
  108: [{ id: 'coldproof', level: 1 }],
  111: [{ id: 'null_burn', level: 1 }, { id: 'burn', level: 1 }],
  114: [{ id: 'bind', level: 1 }],
  116: [{ id: 'null_burn', level: 1 }],
  121: [{ id: 'execution', level: 1 }],
  122: [{ id: 'deflection', level: 1 }],
  123: [{ id: 'wind_rider', level: 1 }],
  129: [{ id: 'null_death_touch', level: 1 }, { id: 're_attack', level: 1 }],
  135: [{ id: 'ice_absorb', level: 1 }, { id: 'true_sight', level: 1 }],
  141: [{ id: 'ice_protect_breaker', level: 1 }],
  142: [{ id: 'howl', level: 3 }],
  143: [{ id: 'first_aid', level: 2 }],
  144: [{ id: 'predator_sense', level: 1 }],
  148: [{ id: 'requiem', level: 1 }],
  153: [{ id: 'boost', level: 2 }],
  154: [{ id: 'bulwark', level: 1 }],
  159: [{ id: 'ranged_reflect', level: 1 }],
  160: [{ id: 'melee_confusion', level: 1 }],
  164: [{ id: 'covering_fire', level: 1 }],
  165: [{ id: 'slow', level: 1 }],
  171: [{ id: 'deflection', level: 2 }, { id: 'life_drain', level: 7 }, { id: 'null_life_drain', level: 1 }],
  177: [{ id: 'null_shock', level: 1 }],
  183: [{ id: 'unforgettable', level: 1 }],
  189: [{ id: 're_attack', level: 1 }],
  195: [{ id: 'resurrect', level: 1 }],
  200: [{ id: 'cunning', level: 1 }],
  201: [{ id: 'overwatch', level: 1 }],
  207: [{ id: 'melee_confusion', level: 1 }, { id: 'squander', level: 1 }],
  225: [{ id: 're_attack', level: 1 }],
  229: [{ id: 'reanimate', level: 1 }],
  231: [{ id: 'rage', level: 1 }],
  249: [{ id: 're_attack', level: 1 }],
  255: [{ id: 'illusion', level: 1 }],
  259: [{ id: 'rage', level: 1 }],
  261: [{ id: 'deflection', level: 2 }],
  267: [{ id: 'magic_seal', level: 1 }],
  270: [{ id: 'mimic', level: 1 }],
  273: [{ id: 'boost', level: 1 }],
  279: [{ id: 'fire_reflect', level: 1 }],
  303: [{ id: 'first_strike', level: 1 }],
  309: [{ id: 'ranged_confusion', level: 1 }],
  315: [{ id: 'soul_reap', level: 3 }],
  321: [{ id: 'm_barrier_breaker', level: 1 }],
  325: [{ id: 're_counter', level: 1 }],
  326: [{ id: 'ranged_null', level: 1 }],
  327: [{ id: 'melee_reflect', level: 1 }],
  333: [{ id: 'melee_reflect', level: 1 }],
  351: [{ id: 'melee_reflect', level: 1 }],
  387: [{ id: 'shock', level: 1 }, { id: 'magic_seal', level: 1 }],
};

const MASTER_ENEMY_BONUS_MODIFIERS: Partial<Record<number, Bonus[]>> = {
  // SpecRef: 4.2.2 | Enemy | additional abilities or bonus
  135: [{ type: 'growth_xV', value: 1.2 }],
  171: [{ type: 'growth_xV', value: 2.0 }],
  207: [{ type: 'growth_xV', value: 1.5 }],
  213: [{ type: 'growth_xV', value: 1.3 }],
  219: [{ type: 'penet', value: 0.4 }],
  230: [{ type: 'growth_xV', value: 1.4 }],
  237: [{ type: 'evasion', value: 0.03 }],
  243: [{ type: 'fire_defense_multiplier_xV', value: 4 / 5 }, { type: 'growth_xV', value: 1.5 }],
  147: [{ type: 'physical_defense_multiplier_xV', value: 1 / 2 }],
  163: [{ type: 'physical_defense_multiplier_xV', value: 2 / 5 }],
  164: [{ type: 'physical_defense_multiplier_xV', value: 3 / 5 }],
  260: [{ type: 'physical_defense_multiplier_xV', value: 1 / 3 }],
  279: [{ type: 'growth_xV', value: 1.3 }],
  285: [{ type: 'growth_xV', value: 1.3 }],
  291: [{ type: 'penet', value: 0.4 }],
  297: [{ type: 'magical_offense_multiplier_xV', value: 1.4 }],
  313: [{ type: 'growth_xV', value: 1.5 }],
  314: [{ type: 'growth_xV', value: 1.5 }],
  315: [{ type: 'growth_xV', value: 1.5 }],
  339: [{ type: 'growth_xV', value: 1.3 }],
  345: [{ type: 'physical_offense_multiplier_xV', value: 1.4 }],
  351: [{ type: 'growth_xV', value: 1.4 }],
};

const MASTER_ENEMY_MAGIC_STYLES: Partial<Record<number, MagicStyle>> = {
  // SpecRef: 4.2.2 | Enemy | additional abilities or bonus
  363: 'percentage_damage',
};

// SpecRef: 4.2.2 | Enemy | additional abilities or bonus
export function getEnemyIndividualAbilities(enemyId: number): EnemyAbility[] {
  return MASTER_ENEMY_BONUS_ABILITIES[enemyId] ?? [];
}

// SpecRef: 4.2.2 | Enemy | additional abilities or bonus
export function getEnemyIndividualBonuses(enemyId: number): Bonus[] {
  return MASTER_ENEMY_BONUS_MODIFIERS[enemyId] ?? [];
}

// SpecRef: 8.4.5 | Altar (祭壇) | Mimorian Character Edit Mode
// This is the authoritative ability set for both Altar previews and the
// Mimorian form copied into party runtime stats.
export function getMimorianEnemyAbilities(enemy: Pick<EnemyDef, 'id' | 'enemyType'>): EnemyAbility[] {
  const merged = new Map<AbilityId, EnemyAbility>();
  const abilities = [
    ...getEnemyTypeAbilities(enemy.enemyType, Number.MAX_SAFE_INTEGER),
    ...getEnemyIndividualAbilities(enemy.id),
  ];

  abilities.forEach((ability) => {
    const current = merged.get(ability.id);
    if (!current || ability.level > current.level) merged.set(ability.id, ability);
  });

  return Array.from(merged.values(), (ability) => ({ ...ability }));
}

function generateEnemies(): EnemyDef[] {
  const enemies: EnemyDef[] = [];

  for (let tier = 1; tier <= 8; tier++) {
    const rows = MASTER_EXPEDITION_ENEMIES_PACKED[tier] ?? [];

    rows.forEach((row, rowIndex) => {
      // SpecRef: 4.2.2 | Enemy | Enemy_ID
      const id = 100 + (tier - 1) * 36 + rowIndex;
      const spawnType = row[3];
      const enemy = createEnemyFromTemplate(
        id,
        { name: row[7], nameKey: `masterData.enemyName.${id}`, hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
        tier,
        spawnType,
        spawnType === 'boss' ? 0 : tier,
        row[5],
        row[8] ?? 'none',
        row[4],
        row[0],
        row[6],
        MASTER_ENEMY_BONUS_ABILITIES[id] ?? [],
        row[2],
      );
      const enemyMagicStyle = MASTER_ENEMY_MAGIC_STYLES[id];
      if (enemyMagicStyle) enemy.magicStyle = enemyMagicStyle;
      const enemyBonusModifiers = MASTER_ENEMY_BONUS_MODIFIERS[id] ?? [];
      if (enemyBonusModifiers.length > 0) {
        enemy.bonuses = [...(enemy.bonuses ?? []), ...enemyBonusModifiers];
      }
      enemies.push(enemy);
    });
  }

  return enemies;
}

const ENEMY_FORM_ONLY_ROWS = [
  { id: 13, enemyType: 'Lupinian', name: 'リップ' },
  { id: 14, enemyType: 'Vulpinian', name: 'アマネ' },
  { id: 15, enemyType: 'Caninian', name: 'ミズ' },
  { id: 16, enemyType: 'Procyonian', name: '茶々' },
  { id: 17, enemyType: 'Leporian', name: 'ミリィ' },
  { id: 18, enemyType: 'Cervin', name: 'ファニア' },
] as const;

function generateEnemyFormOnlyEnemies(): EnemyDef[] {
  return ENEMY_FORM_ONLY_ROWS.map((row) => {
    // SpecRef: 4.2.2 | Enemy | Enemy_ID
    const enemy = createEnemyFromTemplate(
      row.id,
      { name: row.name, nameKey: `masterData.enemyName.${row.id}`, hpMod: 1, attackType: 'mixed', attackMod: 1, defenseMod: 1 },
      1,
      'normal',
      0,
      'duelist',
      'none',
      row.enemyType,
      0,
      [],
      [],
      Number.MAX_SAFE_INTEGER,
    );

    // These records exist only as selectable enemy forms. Their unspecified
    // combat class must not contribute abilities to the copied form.
    enemy.abilities = getEnemyTypeAbilities(row.enemyType, Number.MAX_SAFE_INTEGER);
    return enemy;
  });
}

export const ENEMIES: EnemyDef[] = [...generateEnemyFormOnlyEnemies(), ...generateEnemies()];

const ENEMY_BY_ID = new Map<number, EnemyDef>();
const NORMAL_ENEMIES_BY_POOL = new Map<number, EnemyDef[]>();
const ELITE_ENEMIES_BY_POOL = new Map<number, EnemyDef[]>();
const BOSS_ENEMY_BY_ID = new Map<number, EnemyDef>();
const EMPTY_ENEMY_POOL: readonly EnemyDef[] = Object.freeze([]);

for (const enemy of ENEMIES) {
  if (!ENEMY_BY_ID.has(enemy.id)) ENEMY_BY_ID.set(enemy.id, enemy);
  if (enemy.type === 'boss' && !BOSS_ENEMY_BY_ID.has(enemy.id)) BOSS_ENEMY_BY_ID.set(enemy.id, enemy);
  const poolIndex = enemy.type === 'normal'
    ? NORMAL_ENEMIES_BY_POOL
    : enemy.type === 'elite'
      ? ELITE_ENEMIES_BY_POOL
      : null;
  if (poolIndex) {
    const pool = poolIndex.get(enemy.poolId) ?? [];
    pool.push(enemy);
    poolIndex.set(enemy.poolId, pool);
  }
}

NORMAL_ENEMIES_BY_POOL.forEach((pool) => pool.sort((left, right) => left.id - right.id));
ELITE_ENEMIES_BY_POOL.forEach((pool) => pool.sort((left, right) => left.id - right.id));

/** Stable first-declaration lookup used by expedition room selection. */
export const getEnemyById = (id: number): EnemyDef | undefined => ENEMY_BY_ID.get(id);

/** Immutable, ID-sorted hot-path views; callers must not mutate these arrays. */
export const getSortedEnemiesByPool = (poolId: number): readonly EnemyDef[] =>
  NORMAL_ENEMIES_BY_POOL.get(poolId) ?? EMPTY_ENEMY_POOL;

export const getSortedElitesByPool = (poolId: number): readonly EnemyDef[] =>
  ELITE_ENEMIES_BY_POOL.get(poolId) ?? EMPTY_ENEMY_POOL;

export const getEnemiesByPool = (poolId: number): EnemyDef[] =>
  ENEMIES.filter(e => e.poolId === poolId && e.type === 'normal');

export const getElitesByPool = (poolId: number): EnemyDef[] =>
  ENEMIES.filter(e => e.poolId === poolId && e.type === 'elite');

export const getBossEnemy = (id: number): EnemyDef | undefined =>
  BOSS_ENEMY_BY_ID.get(id);


export function getEnemyDropCandidates(enemy: EnemyDef): ItemDef[] {
  // SpecRef: 4.2.2 | Enemy | x.item_ids
  return enemy.itemIds
    .map((itemId) => getItemById(itemId))
    .filter((item): item is ItemDef => item !== undefined);
}
