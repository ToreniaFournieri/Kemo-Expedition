import { EnemyDef, EnemyType, EnemyClassId, ElementalOffense, ElementalResistance, ItemDef, AbilityId, ItemCategory, EnemyAbility, Bonus } from '../types';
import { MYTHIC_DROP_POOLS } from './dropTables';
import { getItemById, getItemsByTierAndRarity } from './items';
import { MASTER_EXPEDITION_ENEMIES_PACKED } from './masterSpecData';
import { getEnemyCyborgizationAdjustment, resolveEnemyPassiveAbilities } from '../game/enemyPassiveAbilities';
import { buildEnemyClassMasterStats } from './enemyClasses';

// ============================================================
// EnemyTemplate type - compact format for defining enemies
// ============================================================
type EnemyTemplate = {
  name: string;
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

function getBossMythicDropId(tier: number, seed: number): number {
  const categories = MYTHIC_DROP_POOLS[tier] ?? [];
  const bossRareItems = getItemsByTierAndRarity(tier, 'bossRare');
  const options = categories.flatMap(category => bossRareItems.filter(item => item.category === category));

  if (options.length === 0) {
    return bossRareItems[seed % bossRareItems.length]?.id ?? tier * 1000 + 300 + 1;
  }

  return options[seed % options.length].id;
}


type EnemyTypeSpec = {
  ability1: EnemyAbility[];
  ability30?: EnemyAbility[];
  bonuses: Bonus[];
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
    ability1: [{ id: 'swarm', level: 1 }],
    ability30: [{ id: 'death_touch', level: 1 }],
    bonuses: [
      { type: 'thunder_offense', value: 20 },
      { type: 'fire_defense_multiplier_xV', value: 1.3 },
      { type: 'thunder_defense_multiplier_xV', value: 2 / 3 },
    ],
  },
  Aerial: {
    ability1: [{ id: 'flying', level: 1 }],
    ability30: [{ id: 'free', level: 1 }],
    bonuses: [{ type: 'evasion', value: 0.045 }, { type: 'growth_xV', value: 0.7 }],
  },
  Frost: {
    ability1: [{ id: 'frostbite', level: 1 }],
    ability30: [{ id: 'ice_reflect', level: 1 }],
    bonuses: [
      { type: 'ice_offense', value: 20 },
      { type: 'fire_defense_multiplier_xV', value: 1.3 },
      { type: 'ice_defense_multiplier_xV', value: 1 / 5 },
    ],
  },
  Fruit: {
    ability1: [{ id: 'bind', level: 1 }],
    ability30: [{ id: 'execution', level: 1 }],
    bonuses: [{ type: 'thunder_defense_multiplier_xV', value: 1.3 }],
  },
  Dragon: {
    ability1: [{ id: 'burn', level: 1 }],
    ability30: [{ id: 'fire_reflect', level: 1 }],
    bonuses: [
      { type: 'fire_offense', value: 40 },
      { type: 'fire_defense_multiplier_xV', value: 1 / 2 },
      { type: 'ice_defense_multiplier_xV', value: 1.3 },
    ],
  },
  Voidspawn: {
    ability1: [{ id: 'null_counter', level: 1 }],
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
    ability1: [{ id: 'ranged_confusion', level: 1 }],
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
    ],
  },
  Golem: {
    ability1: [{ id: 'auriferous', level: 1 }],
    ability30: [{ id: 'magic_seal', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.3 }, { type: 'thunder_defense_multiplier_xV', value: 1.3 }],
  },
  Shadowfang: {
    ability1: [{ id: 'ambush', level: 1 }],
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
    ability1: [{ id: 'bulwark_breaker', level: 1 }],
    ability30: [{ id: 'mutual_physical_amplify', level: 1 }],
    bonuses: [
      { type: 'growth_xV', value: 1.1 },
      { type: 'thunder_defense_multiplier_xV', value: 1.2 },
    ],
  },
  Chimera: {
    ability1: [{ id: 'unstable_core', level: 1 }],
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
    ability1: [{ id: 'colossal', level: 1 }],
    ability30: [{ id: 'mutual_physical_restraint', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.5 }],
  },
  Pony: {
    ability1: [{ id: 'illusion_breaker', level: 1 }],
    ability30: [{ id: 'mutual_magic_amplify', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.2 }],
  },
  Origami: {
    ability1: [{ id: 'thunder_null', level: 1 }],
    ability30: [],
    bonuses: [
      { type: 'evasion', value: 0.4 },
      { type: 'fire_defense_multiplier_xV', value: 1.5 },
    ],
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

export function getEnemyTypeBonuses(enemyType: string): Bonus[] {
  return ENEMY_TYPE_SPECS[enemyType]?.bonuses ?? [];
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

  // Calculate drop item ID based on enemy type
  // Normal enemies drop uncommon items, elite drop elite eliteRare, boss drop elite eliteRare
  let dropItemId: number;
  if (type === 'normal') {
    // Uncommon items: tier*1000 + 200 + (1..24), 24 per tier
    dropItemId = tier * 1000 + 200 + (id % 24) + 1;
  } else if (type === 'elite') {
    // Rare items: tier*1000 + 300 + (1..12), 12 per tier
    dropItemId = tier * 1000 + 300 + (id % 12) + 1;
  } else {
    // Boss: boss eliteRare items (per boss drop tables)
    dropItemId = getBossMythicDropId(tier, id);
  }

  return {
    id,
    type,
    enemyType,
    spawnTier: tier,
    spawnPool,
    poolId,
    name: template.name,
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
    dropItemId,
  };
}

// ============================================================
// Generate all enemies
// ============================================================
type MasterDropRarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare';

function parseMasterDropToken(token: string): { category: ItemCategory; rarity: MasterDropRarity; variantIndex?: number } | null {
  const match = token.match(/i\.([a-z_]+)`?([A-Z]+)$/);
  if (!match) return null;

  const category = match[1] as ItemCategory;
  const rarityCode = match[2];
  if (rarityCode === 'C') {
    return { category, rarity: 'common', variantIndex: 0 };
  }

  if (rarityCode === 'U') {
    return { category, rarity: 'uncommon', variantIndex: 0 };
  }

  if (rarityCode.startsWith('E')) {
    const sourceCode = rarityCode.slice(1);
    const variantIndex = sourceCode.length > 0
      ? Math.max(0, sourceCode.charCodeAt(0) - 'A'.charCodeAt(0))
      : 0;
    return { category, rarity: 'eliteRare', variantIndex };
  }

  if (rarityCode.startsWith('B')) {
    const sourceCode = rarityCode.slice(1);
    const variantIndex = sourceCode.length > 0
      ? Math.max(0, sourceCode.charCodeAt(0) - 'A'.charCodeAt(0))
      : 0;
    return { category, rarity: 'bossRare', variantIndex };
  }

  return null;
}

function getDropItemIdFromMaster(tier: number, drops: string[]): number {
  for (const drop of drops) {
    const parsed = parseMasterDropToken(drop);
    if (!parsed) continue;
    const pool = getItemsByTierAndRarity(tier, parsed.rarity).filter((item) => item.category === parsed.category);
    if (pool.length > 0) {
      const variantIndex = Math.max(0, parsed.variantIndex ?? 0);
      const isOutOfRangeOrcinianEliteD = drop.endsWith('ED') && variantIndex >= pool.length;
      return (isOutOfRangeOrcinianEliteD ? pool[pool.length - 1] : (pool[variantIndex] ?? pool[0])).id;
    }
  }

  const fallback = getItemsByTierAndRarity(tier, 'uncommon')[0];
  return fallback?.id ?? tier * 1000 + 201;
}

const COMMON_DROP_SET_BY_CLASS: Record<EnemyClassId, [ItemCategory, ItemCategory, ItemCategory]> = {
  duelist: ['sword', 'katana', 'gauntlet'],
  samurai: ['sword', 'katana', 'gauntlet'],
  'sword-saint': ['sword', 'katana', 'gauntlet'],
  ranger: ['arrow', 'bolt', 'archery'],
  striker: ['arrow', 'bolt', 'archery'],
  ninja: ['arrow', 'bolt', 'archery'],
  wizard: ['wand', 'grimoire', 'catalyst'],
  sage: ['wand', 'grimoire', 'catalyst'],
  alchemist: ['wand', 'grimoire', 'catalyst'],
  guardian: ['armor', 'robe', 'shield'],
  pilgrim: ['armor', 'robe', 'shield'],
  lord: ['armor', 'robe', 'shield'],
  // legacy ids for compatibility
  fighter: ['sword', 'katana', 'gauntlet'],
  rogue: ['arrow', 'bolt', 'archery'],
};

function assignCommonDropTokensByClass(dropTokens: string[], enemyClass: EnemyClassId): string[] {
  // SpecRef: 4.2.2 | Enemy | Common item drop
  const commonDropSet = COMMON_DROP_SET_BY_CLASS[enemyClass] ?? COMMON_DROP_SET_BY_CLASS.duelist;
  const nonCommonDrops = dropTokens.filter((token) => !/C$/.test(token.trim()));
  const commonDrops = commonDropSet.map((category) => `i.${category}C`);
  return [...nonCommonDrops, ...commonDrops];
}

const MASTER_BOSS_BONUS_ABILITIES: Partial<Record<number, EnemyAbility[]>> = {
  // SpecRef: 4.2.2 | Enemy | Rare items drop
  2: [{ id: 'deflection', level: 2 }],
  3: [{ id: 'melee_confusion', level: 1 }],
  5: [{ id: 'fire_reflect', level: 1 }],
  6: [{ id: 'soul_reap', level: 3 }],
  7: [{ id: 'melee_reflect', level: 1 }],
  8: [{ id: 'shock', level: 1 }, { id: 'magic_seal', level: 1 }],
};

const MASTER_ENEMY_BONUS_ABILITIES: Partial<Record<number, EnemyAbility[]>> = {
  // SpecRef: 4.2.2 | Enemy | additional abilities or bonus
  105: [{ id: 'howl', level: 1 }],
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
  144: [{ id: 'predator_sense', level: 1 }],
  153: [{ id: 'boost', level: 2 }],
  159: [{ id: 'ranged_reflect', level: 1 }],
  164: [{ id: 'covering_fire', level: 1 }],
  165: [{ id: 'slow', level: 1 }],
  171: [{ id: 'deflection', level: 2 }, { id: 'life_drain', level: 7 }, { id: 'null_life_drain', level: 1 }],
  177: [{ id: 'null_shock', level: 1 }],
  183: [{ id: 'unforgettable', level: 1 }],
  189: [{ id: 're_attack', level: 1 }],
  195: [{ id: 'resurrect', level: 1 }],
  201: [{ id: 'overwatch', level: 1 }],
  225: [{ id: 're_attack', level: 1 }],
  229: [{ id: 'reanimate', level: 1 }],
  230: [{ id: 'stealth', level: 1 }],
  231: [{ id: 'rage', level: 1 }],
  249: [{ id: 're_attack', level: 1 }],
  255: [{ id: 'illusion', level: 1 }],
  259: [{ id: 'rage', level: 1 }],
  261: [{ id: 'deflection', level: 2 }],
  267: [{ id: 'magic_seal', level: 1 }],
  270: [{ id: 'mimic', level: 1 }],
  273: [{ id: 'boost', level: 1 }],
  303: [{ id: 'first_strike', level: 1 }],
  309: [{ id: 'ranged_confusion', level: 1 }],
  321: [{ id: 'm_barrier_breaker', level: 1 }],
  325: [{ id: 're_counter', level: 1 }],
  326: [{ id: 'ranged_null', level: 1 }],
  327: [{ id: 'melee_reflect', level: 1 }],
  333: [{ id: 'melee_reflect', level: 1 }],
};

const MASTER_BOSS_BONUS_MODIFIERS: Partial<Record<number, Bonus[]>> = {
  // SpecRef: 4.2.2 | Enemy | Rare items drop
  4: [{ type: 'fire_defense_multiplier_xV', value: 4 / 5 }, { type: 'growth_xV', value: 1.5 }],
  7: [{ type: 'growth_xV', value: 1.4 }],
};

const MASTER_ENEMY_BONUS_MODIFIERS: Partial<Record<number, Bonus[]>> = {
  // SpecRef: 4.2.2 | Enemy | additional abilities or bonus
  135: [{ type: 'growth_xV', value: 1.2 }],
  171: [{ type: 'growth_xV', value: 2.0 }],
  207: [{ type: 'growth_xV', value: 1.5 }],
  213: [{ type: 'growth_xV', value: 1.3 }],
  219: [{ type: 'penet', value: 0.4 }],
  237: [{ type: 'evasion', value: 0.03 }],
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
};

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
        { name: row[7], hpMod: 1.0, attackType: 'mixed', attackMod: 1.0, defenseMod: 1.0 },
        tier,
        spawnType,
        spawnType === 'boss' ? 0 : tier,
        row[5],
        row[8] ?? 'none',
        row[4],
        row[0],
        mergeEnemyAbilities(
          spawnType === 'boss' ? (MASTER_BOSS_BONUS_ABILITIES[tier] ?? []) : [],
          MASTER_ENEMY_BONUS_ABILITIES[id] ?? [],
        ),
        row[2],
      );
      const masterDropTokens = row[6].split(',').map((token) => token.trim()).filter((token) => token.length > 0);
      enemy.masterDropTokens = assignCommonDropTokensByClass(masterDropTokens, row[5]);
      enemy.dropItemId = getDropItemIdFromMaster(tier, row[6].split(','));
      const enemyBonusModifiers = MASTER_ENEMY_BONUS_MODIFIERS[id] ?? [];
      if (enemyBonusModifiers.length > 0) {
        enemy.bonuses = [...(enemy.bonuses ?? []), ...enemyBonusModifiers];
      }
      if (spawnType === 'boss') {
        const bossBonusModifiers = MASTER_BOSS_BONUS_MODIFIERS[tier] ?? [];
        if (bossBonusModifiers.length > 0) {
          enemy.bonuses = [...(enemy.bonuses ?? []), ...bossBonusModifiers];
        }
      }
      enemies.push(enemy);
    });
  }

  return enemies;
}

export const ENEMIES: EnemyDef[] = generateEnemies();

export const getEnemiesByPool = (poolId: number): EnemyDef[] =>
  ENEMIES.filter(e => e.poolId === poolId && e.type === 'normal');

export const getElitesByPool = (poolId: number): EnemyDef[] =>
  ENEMIES.filter(e => e.poolId === poolId && e.type === 'elite');

export const getBossEnemy = (id: number): EnemyDef | undefined =>
  ENEMIES.find(e => e.id === id && e.type === 'boss');

function getTierFromEnemy(enemyId: number): number {
  if (enemyId >= 100 && enemyId <= 387) return Math.floor((enemyId - 100) / 36) + 1;
  if (enemyId >= 1000) return Math.floor(enemyId / 1000);
  return Math.floor(enemyId / 100);
}

function pickItems(pool: ItemDef[], count: number, seed: number): ItemDef[] {
  if (pool.length === 0) return [];

  const picked: ItemDef[] = [];
  for (let i = 0; i < count; i++) {
    const index = (seed + i * 7) % pool.length;
    picked.push(pool[index]);
  }

  return picked;
}

export function getEnemyDropCandidates(enemy: EnemyDef): ItemDef[] {
  // SpecRef: 4.2 | EXPEDITION_&_ENEMY_MASTER_DATA | x.drop
  // SpecRef: 8.3 | UI_EXPEDITION | Gods Battle (神魔戦)
  // God battle must prioritize mythic drop construction over master drop tokens.
  if (enemy.isGodEnemy && enemy.dropItemId && enemy.dropItemId % 1000 >= 500) {
    const tier = enemy.spawnTier || getTierFromEnemy(enemy.id);
    const common = getItemsByTierAndRarity(tier, 'common');
    const eliteRare = getItemsByTierAndRarity(tier, 'eliteRare');
    const mythicRare = getItemsByTierAndRarity(tier, 'mythicRare');
    const bossMythicByTier: Record<number, ItemCategory[]> = {
      1: ['sword', 'grimoire'],
      2: ['armor', 'arrow'],
      3: ['wand', 'robe'],
      4: ['katana', 'shield'],
      5: ['bolt', 'archery'],
      6: ['armor', 'catalyst'],
      7: ['sword', 'wand'],
      8: ['katana', 'bolt', 'grimoire'],
    };
    const godCats = enemy.godDropItemCategories ?? bossMythicByTier[tier] ?? ['sword', 'grimoire'];
    const pickByCategory = (
      pool: ItemDef[],
      category: ItemCategory,
      seed: number,
      excludeItemIds: number[] = [],
    ): ItemDef | undefined => {
      const candidates = pool.filter(item => item.category === category && !excludeItemIds.includes(item.id));
      if (candidates.length === 0) return undefined;
      return candidates[Math.abs(seed) % candidates.length];
    };
    const pickAny = (pool: ItemDef[], count: number, seed: number, excludeItemIds: number[] = []): ItemDef[] =>
      pickItems(pool.filter(item => !excludeItemIds.includes(item.id)), count, seed);

    const mythicItem = getItemById(enemy.dropItemId);
    if (mythicItem) {
      const drops: ItemDef[] = [mythicItem];
      const mythicExtra = pickByCategory(mythicRare, godCats[1], enemy.id + 1, [mythicItem.id])
        ?? pickByCategory(mythicRare, godCats[0], enemy.id + 2, [mythicItem.id])
        ?? pickAny(mythicRare, 1, enemy.id + 1, [mythicItem.id])[0];
      if (mythicExtra) drops.push(mythicExtra);

      const eliteRareFallback = pickByCategory(eliteRare, godCats[0], enemy.id + 3)
        ?? pickByCategory(eliteRare, godCats[1], enemy.id + 4)
        ?? pickAny(eliteRare, 1, enemy.id + 3)[0];
      if (eliteRareFallback) drops.push(eliteRareFallback);

      drops.push(...pickAny(common, Math.max(0, 5 - drops.length), enemy.id + 5));
      return drops.slice(0, 5);
    }
  }

  if (enemy.masterDropTokens && enemy.masterDropTokens.length > 0) {
    const exactDrops = enemy.masterDropTokens
      .map((token) => parseMasterDropToken(token))
      .filter((parsed): parsed is { category: ItemCategory; rarity: MasterDropRarity; variantIndex?: number } => parsed !== null)
      .map((parsed, index) => {
        const pool = getItemsByTierAndRarity(enemy.spawnTier || getTierFromEnemy(enemy.id), parsed.rarity)
          .filter((item) => item.category === parsed.category);
        if (pool.length === 0) return undefined;
        const variantIndex = Math.max(0, parsed.variantIndex ?? 0);
        const isOutOfRangeEliteD = enemy.masterDropTokens?.[index]?.endsWith('ED') && variantIndex >= pool.length;
        return isOutOfRangeEliteD ? pool[pool.length - 1] : (pool[variantIndex] ?? pool[0]);
      })
      .filter((item): item is ItemDef => item !== undefined);

    if (exactDrops.length > 0) {
      return exactDrops;
    }
  }

  const tier = enemy.spawnTier || getTierFromEnemy(enemy.id);
  const common = getItemsByTierAndRarity(tier, 'common');
  const uncommon = getItemsByTierAndRarity(tier, 'uncommon');
  const eliteRare = getItemsByTierAndRarity(tier, 'eliteRare');
  const bossRare = getItemsByTierAndRarity(tier, 'bossRare');
  const mythicRare = getItemsByTierAndRarity(tier, 'mythicRare');

  const classUncommonCategories: Record<EnemyClassId, [ItemCategory, ItemCategory]> = {
    guardian: ['armor', 'shield'],
    fighter: ['sword', 'gauntlet'],
    'sword-saint': ['sword', 'gauntlet'],
    ranger: ['arrow', 'archery'],
    striker: ['bolt', 'archery'],
    wizard: ['wand', 'catalyst'],
    alchemist: ['grimoire', 'catalyst'],
    pilgrim: ['sword', 'wand'],
    rogue: ['bolt', 'shield'],
    ninja: ['katana', 'armor'],
    samurai: ['katana', 'bolt'],
    sage: ['grimoire', 'robe'],
    duelist: ['sword', 'arrow'],
    lord: ['shield', 'robe'],
  };

  const eliteRareByFloor: Record<number, ItemCategory[]> = {
    1: ['sword', 'armor'],
    2: ['shield', 'robe'],
    3: ['arrow', 'bolt', 'archery'],
    4: ['gauntlet', 'katana'],
    5: ['wand', 'grimoire', 'catalyst'],
  };

  const bossMythicByTier: Record<number, ItemCategory[]> = {
    1: ['sword', 'grimoire'],
    2: ['armor', 'arrow'],
    3: ['wand', 'robe'],
    4: ['katana', 'shield'],
    5: ['bolt', 'archery'],
    6: ['armor', 'catalyst'],
    7: ['sword', 'wand'],
    8: ['katana', 'bolt', 'grimoire'],
  };

  const pickByCategory = (
    pool: ItemDef[],
    category: ItemCategory,
    seed: number,
    excludeItemIds: number[] = [],
  ): ItemDef | undefined => {
    const candidates = pool.filter(item => item.category === category && !excludeItemIds.includes(item.id));
    if (candidates.length === 0) return undefined;
    return candidates[Math.abs(seed) % candidates.length];
  };

  const pickAny = (pool: ItemDef[], count: number, seed: number, excludeItemIds: number[] = []): ItemDef[] =>
    pickItems(pool.filter(item => !excludeItemIds.includes(item.id)), count, seed);

  const pickUncommonVariantByCategory = (
    category: ItemCategory,
    poolGroup: number,
    excludeItemIds: number[] = [],
  ): ItemDef | undefined => {
    const variantIndex = poolGroup <= 3 ? 0 : 1;
    const candidates = uncommon
      .filter(item => item.category === category && !excludeItemIds.includes(item.id))
      .sort((a, b) => a.id - b.id);
    if (candidates.length === 0) return undefined;
    return candidates[Math.min(variantIndex, candidates.length - 1)];
  };

  if (enemy.type === 'normal') {
    const drops: ItemDef[] = [];
    const uncommonCats = classUncommonCategories[enemy.enemyClass] ?? ['sword', 'gauntlet'];
    const uncommon1 = pickUncommonVariantByCategory(uncommonCats[0], enemy.spawnPool)
      ?? pickByCategory(uncommon, uncommonCats[0], enemy.id)
      ?? pickAny(uncommon, 1, enemy.id)[0];
    const uncommon2 = pickUncommonVariantByCategory(
      uncommonCats[1],
      enemy.spawnPool,
      uncommon1 ? [uncommon1.id] : [],
    )
      ?? pickByCategory(uncommon, uncommonCats[1], enemy.id + 1, uncommon1 ? [uncommon1.id] : [])
      ?? pickAny(uncommon, 1, enemy.id + 1, uncommon1 ? [uncommon1.id] : [])[0];
    if (uncommon1) drops.push(uncommon1);
    if (uncommon2) drops.push(uncommon2);

    drops.push(...pickAny(common, 3, enemy.id + 2));
    return drops.slice(0, 5);
  }

  if (enemy.type === 'elite') {
    if (enemy.dropItemId && enemy.dropItemId % 1000 >= 400) {
      const drops: ItemDef[] = [];
      const specifiedBossRare = getItemById(enemy.dropItemId);
      if (specifiedBossRare) {
        drops.push(specifiedBossRare);
      }

      const bossRareCats = bossMythicByTier[tier] ?? ['sword', 'grimoire'];
      const bossRareExtra = pickByCategory(
        bossRare,
        bossRareCats[0],
        enemy.id + 1,
        specifiedBossRare ? [specifiedBossRare.id] : [],
      ) ?? pickAny(bossRare, 1, enemy.id + 1, specifiedBossRare ? [specifiedBossRare.id] : [])[0];
      if (bossRareExtra) drops.push(bossRareExtra);

      const eliteRareFallback = pickByCategory(eliteRare, bossRareCats[0], enemy.id + 2)
        ?? pickAny(eliteRare, 1, enemy.id + 2)[0];
      if (eliteRareFallback) drops.push(eliteRareFallback);

      drops.push(...pickAny(common, Math.max(0, 5 - drops.length), enemy.id + 3));
      return drops.slice(0, 5);
    }

    const drops: ItemDef[] = [];
    const floor = Math.max(1, Math.min(5, (enemy.id % 1000) - 50));
    const eliteRareCats = eliteRareByFloor[floor] ?? ['sword', 'armor'];
    const eliteRarePicks = eliteRareCats
      .map((category, index) => pickByCategory(eliteRare, category, enemy.id + index, drops.map(item => item.id)))
      .filter((item): item is ItemDef => item !== undefined);
    drops.push(...eliteRarePicks);

    const uncommonPick = pickByCategory(uncommon, eliteRareCats[0], enemy.id + 3) ?? pickAny(uncommon, 1, enemy.id + 3)[0];
    if (uncommonPick) drops.push(uncommonPick);

    const commonCount = eliteRarePicks.length >= 3 ? 1 : 2;
    drops.push(...pickAny(common, commonCount, enemy.id + 4));
    return drops.slice(0, 5);
  }

  if (enemy.type === 'boss' && enemy.dropItemId && enemy.dropItemId % 1000 >= 500) {
    const mythicItem = getItemById(enemy.dropItemId);
    if (mythicItem) {
      const drops: ItemDef[] = [mythicItem];
      const mythicCats = bossMythicByTier[tier] ?? ['sword', 'grimoire'];
      const mythicExtra = pickByCategory(mythicRare, mythicCats[0], enemy.id + 1, [mythicItem.id])
        ?? pickAny(mythicRare, 1, enemy.id + 1, [mythicItem.id])[0];
      if (mythicExtra) drops.push(mythicExtra);

      const eliteRareFallback = pickByCategory(eliteRare, mythicCats[0], enemy.id + 2) ?? pickAny(eliteRare, 1, enemy.id + 2)[0];
      if (eliteRareFallback) drops.push(eliteRareFallback);

      drops.push(...pickAny(common, Math.max(0, 5 - drops.length), enemy.id + 3));
      return drops.slice(0, 5);
    }
  }

  const drops: ItemDef[] = [];
  const bossRareCats = bossMythicByTier[tier] ?? ['sword', 'grimoire'];
  const bossRare1 = pickByCategory(bossRare, bossRareCats[0], enemy.id) ?? pickAny(bossRare, 1, enemy.id)[0];
  const bossRare2 = pickByCategory(bossRare, bossRareCats[1] ?? bossRareCats[0], enemy.id + 1, bossRare1 ? [bossRare1.id] : [])
    ?? pickAny(bossRare, 1, enemy.id + 1, bossRare1 ? [bossRare1.id] : [])[0];
  if (bossRare1) drops.push(bossRare1);
  if (bossRare2) drops.push(bossRare2);

  const eliteRare1 = pickByCategory(eliteRare, bossRareCats[0], enemy.id + 2) ?? pickAny(eliteRare, 1, enemy.id + 2)[0];
  const eliteRare2 = pickByCategory(eliteRare, bossRareCats[1] ?? bossRareCats[0], enemy.id + 3, eliteRare1 ? [eliteRare1.id] : [])
    ?? pickAny(eliteRare, 1, enemy.id + 3, eliteRare1 ? [eliteRare1.id] : [])[0];
  if (eliteRare1) drops.push(eliteRare1);
  if (eliteRare2) drops.push(eliteRare2);

  drops.push(...pickAny(common, 1, enemy.id + 4));
  return drops.slice(0, 5);
}
