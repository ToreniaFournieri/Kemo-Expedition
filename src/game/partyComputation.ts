import {
  Party,
  ComputedPartyStats,
  ComputedCharacterStats,
  Ability,
  AbilityId,
  ElementalResistance,
  ItemCategory,
  BonusType,
  Item,
} from '../types';
import { computeCharacterStats } from './characterComputation';
import { getRaceById } from '../data/races';
import { getClassById } from '../data/classes';
import { getPredispositionById } from '../data/predispositions';
import { getLineageById } from '../data/lineages';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES, getSuperRareBonuses } from '../data/items';
import { applyDeityCharacterModifiers, getDeityElementalResistanceModifier, getDeityPartyHpMultiplier } from './deity';
import { getJewelDRankBonus } from './jewel';
import { ABILITY_BASE_NAMES } from '../data/abilityNames';

// Get enhancement and super rare multiplier for an item
function getItemEnhancementMultiplier(item: Item): number {
  const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  return enhMult * srMult;
}

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

function formatCBonusValue(value: number): string {
  return (Math.round(value * 1000000) / 1000000).toString();
}

function getCharacterMultiplier(
  character: { raceId: string; mainClassId: string; subClassId: string; predispositionId: string; lineageId: string; equipment: (Item | null)[] },
  category: ItemCategory
): number {
  const bonusType = CATEGORY_TO_MULTIPLIER[category];
  if (!bonusType) return 1;

  const race = getRaceById(character.raceId);
  const mainClass = getClassById(character.mainClassId);
  const subClass = getClassById(character.subClassId);
  const predisposition = getPredispositionById(character.predispositionId);
  const lineage = getLineageById(character.lineageId);

  if (!race || !mainClass || !subClass || !predisposition || !lineage) return 1;

  const isMasterClass = character.mainClassId === character.subClassId;

  const allBonuses = [
    ...race.bonuses,
    ...mainClass.mainSubBonuses,
    ...(isMasterClass ? mainClass.masterBonuses : [...mainClass.mainBonuses, ...subClass.mainSubBonuses]),
    ...predisposition.bonuses,
    ...lineage.bonuses,
    ...character.equipment.flatMap((item) => (item ? getSuperRareBonuses(item.superRare) : [])),
  ];

  const appliedBonusNames = new Set<string>();
  const multipliers = allBonuses
    .filter(b => b.type === bonusType)
    .filter((b) => {
      const bonusName = `c.${bonusType}+${formatCBonusValue(b.value)}`;
      if (appliedBonusNames.has(bonusName)) return false;
      appliedBonusNames.add(bonusName);
      return true;
    })
    .map(b => b.value);

  return multipliers.reduce((prod, v) => prod * v, 1);
}

function getCharacterBaseStats(character: { raceId: string; predispositionId: string; lineageId: string; equipment: (Item | null)[] }) {
  const race = getRaceById(character.raceId);
  const predisposition = getPredispositionById(character.predispositionId);
  const lineage = getLineageById(character.lineageId);

  if (!race || !predisposition || !lineage) {
    return { vitality: 10, strength: 10, intelligence: 10, mind: 10 };
  }

  let vitality = race.stats.vitality;
  let strength = race.stats.strength;
  let intelligence = race.stats.intelligence;
  let mind = race.stats.mind;

  for (const bonus of [...predisposition.bonuses, ...lineage.bonuses]) {
    switch (bonus.type) {
      case 'vitality': vitality += bonus.value; break;
      case 'strength': strength += bonus.value; break;
      case 'intelligence': intelligence += bonus.value; break;
      case 'mind': mind += bonus.value; break;
    }
  }

  for (const item of character.equipment) {
    if (!item) continue;
    for (const bonus of getSuperRareBonuses(item.superRare)) {
      if (bonus.type === 'vitality') vitality += bonus.value;
      if (bonus.type === 'strength') strength += bonus.value;
      if (bonus.type === 'intelligence') intelligence += bonus.value;
      if (bonus.type === 'mind') mind += bonus.value;
    }
    if (item.vitalityBonus) vitality += item.vitalityBonus;
    if (item.strengthBonus) strength += item.strengthBonus;
    if (item.intelligenceBonus) intelligence += item.intelligenceBonus;
    if (item.mindBonus) mind += item.mindBonus;
  }

  return { vitality, strength, intelligence, mind };
}

function getCharacterGrowthMultiplier(
  character: { raceId: string; mainClassId: string; subClassId: string; predispositionId: string; lineageId: string; equipment: (Item | null)[] }
): number {
  const race = getRaceById(character.raceId);
  const mainClass = getClassById(character.mainClassId);
  const subClass = getClassById(character.subClassId);
  const predisposition = getPredispositionById(character.predispositionId);
  const lineage = getLineageById(character.lineageId);

  if (!race || !mainClass || !subClass || !predisposition || !lineage) return 1;

  const isMasterClass = character.mainClassId === character.subClassId;
  const allBonuses = [
    ...race.bonuses,
    ...mainClass.mainSubBonuses,
    ...(isMasterClass ? mainClass.masterBonuses : [...mainClass.mainBonuses, ...subClass.mainSubBonuses]),
    ...predisposition.bonuses,
    ...lineage.bonuses,
    ...character.equipment.flatMap((item) => (item ? getSuperRareBonuses(item.superRare) : [])),
  ];

  const appliedBonusNames = new Set<string>();
  const growthMultipliers = allBonuses
    .filter((bonus) => bonus.type === 'growth_xV')
    .filter((bonus) => {
      const bonusName = `c.growth_x${formatCBonusValue(bonus.value)}`;
      if (appliedBonusNames.has(bonusName)) return false;
      appliedBonusNames.add(bonusName);
      return true;
    })
    .map((bonus) => bonus.value);

  return growthMultipliers.reduce((prod, value) => prod * value, 1);
}

function getEffectiveLevel(level: number): number {
  // SpecRef: 2.1.2 | Party | L_eff
  const growthTerms = [
    { threshold: 7, multiplier: 1.0 },
    { threshold: 14, multiplier: 1.9 },
    { threshold: 21, multiplier: 1.8 },
    { threshold: 28, multiplier: 1.7 },
    { threshold: 35, multiplier: 1.6 },
    { threshold: 42, multiplier: 1.5 },
    { threshold: 49, multiplier: 1.4 },
    { threshold: 56, multiplier: 1.3 },
  ];

  const scale = 1 + growthTerms.reduce(
    (sum, { threshold, multiplier }) => sum + (Math.max(0, (level - threshold) / 28) * multiplier),
    0,
  );

  return level * scale;
}

export function computeCharacterHpContribution(
  character: Party['characters'][number],
  partyLevel: number,
): {
  itemHpBonus: number;
  baseHpBonus: number;
  totalHpBonus: number;
} {
  const stats = getCharacterBaseStats(character);
  const statMultiplier = (stats.vitality + stats.mind) / 20;
  const growthMultiplier = getCharacterGrowthMultiplier(character);
  const effectiveLevel = getEffectiveLevel(partyLevel);

  let itemHpBonus = 0;
  for (const item of character.equipment) {
    if (item && item.partyHP) {
      const categoryMult = getCharacterMultiplier(character, item.category);
      const enhanceMult = getItemEnhancementMultiplier(item);
      const baseMult = item.baseMultiplier ?? 1;
      itemHpBonus += Math.round(item.partyHP * categoryMult * enhanceMult * baseMult * statMultiplier * growthMultiplier);
    }
    if (item) {
      const jewelPartyHP = getJewelDRankBonus(item.jewel, 'partyHP');
      if (jewelPartyHP) {
        const categoryMult = getCharacterMultiplier(character, item.category);
        const enhanceMult = getItemEnhancementMultiplier(item);
        const baseMult = item.baseMultiplier ?? 1;
        itemHpBonus += Math.round(jewelPartyHP * categoryMult * enhanceMult * baseMult * statMultiplier * growthMultiplier);
      }
    }
  }

  const baseHpBonus = Math.round(
    (3.0 * stats.mind) + (3.0 * stats.vitality) + (effectiveLevel * stats.vitality * statMultiplier * growthMultiplier),
  );

  return {
    itemHpBonus,
    baseHpBonus,
    totalHpBonus: itemHpBonus + baseHpBonus,
  };
}

// SpecRef: 2.1.2 | Party | computePartyStats
export function computePartyStats(party: Party): {
  partyStats: ComputedPartyStats;
  characterStats: ComputedCharacterStats[];
} {
  const baseCharacterStats: ComputedCharacterStats[] = party.characters.map((c, index) =>
    computeCharacterStats(c, party.level, index + 1) // Row is 1-6
  );
  const characterStats = applyDeityCharacterModifiers(party, baseCharacterStats);

  // Calculate party HP
  // Party.d.HP =
  //   Total sum of individual (
  //       Item Bonuses of {((HP x enhancement multiplier x super rare multiplier x its c.multiplier)
  //         x (b.vitality + b.mind) / 20 x c.growth_xV), round off}
  //       + {(3.0 x b.mind + 3.0 x b.vitality + (L_eff x b.vitality x (b.vitality + b.mind) / 20) x c.growth_xV), round off}
  //     )
  let bonusHp = 0;

  for (const character of party.characters) {
    const characterHpContribution = computeCharacterHpContribution(character, party.level);
    bonusHp += characterHpContribution.totalHpBonus;
  }

  // Collect all party abilities
  const partyAbilitiesMap = new Map<AbilityId, number>();
  for (const cs of characterStats) {
    for (const ability of cs.abilities) {
      const current = partyAbilitiesMap.get(ability.id) ?? 0;
      partyAbilitiesMap.set(ability.id, Math.max(current, ability.level));
    }
  }

  const abilities: Ability[] = [];
  for (const [id, level] of partyAbilitiesMap) {
    abilities.push({
      id,
      name: getAbilityName(id, level),
      level,
      description: '',
    });
  }

  const getBestAbilityLevel = (
    abilityId: 'defender' | 'command' | 'm_barrier',
  ): number => {
    let bestLevel = 0;
    for (const stats of characterStats) {
      const level = stats.abilities
        .filter((ability) => ability.id === abilityId)
        .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
      bestLevel = Math.max(bestLevel, level);
    }
    return bestLevel;
  };

  // Calculate offense amplifier from the highest command ability holder in party.
  const commandLevel = getBestAbilityLevel('command');
  const offenseAmplifier = commandLevel >= 3 ? 1.6 : commandLevel === 2 ? 1.5 : commandLevel === 1 ? 1.4 : 1.0;

  // Party-wide damage reduction abilities are determined by highest ability level in party.
  const defenderLevel = getBestAbilityLevel('defender');
  const physicalDefenseAmplifier = defenderLevel >= 3 ? 1 / 2 : defenderLevel === 2 ? 3 / 5 : defenderLevel === 1 ? 2 / 3 : 1.0;

  const mBarrierLevel = getBestAbilityLevel('m_barrier');
  const magicalDefenseAmplifier = mBarrierLevel >= 3 ? 1 / 2 : mBarrierLevel === 2 ? 3 / 5 : mBarrierLevel === 1 ? 2 / 3 : 1.0;

  // Elemental resistance (always 1.0 in current version)
  const deityElementalModifier = getDeityElementalResistanceModifier(party.deity.name);
  const elementalResistance: Record<ElementalResistance, number> = {
    fire: deityElementalModifier.fire,
    thunder: deityElementalModifier.thunder,
    ice: deityElementalModifier.ice,
  };

  const deityHpMultiplier = getDeityPartyHpMultiplier(party.deity.name, party.deityGold ?? 0);
  const totalHp = Math.floor(bonusHp * deityHpMultiplier);

  return {
    partyStats: {
      hp: totalHp,
      currentHp: totalHp,
      elementalResistance,
      abilities,
      offenseAmplifier,
      defenseAmplifiers: {
        physical: physicalDefenseAmplifier,
        magical: magicalDefenseAmplifier,
      },
    },
    characterStats,
  };
}

function getAbilityName(id: AbilityId, level: number): string {
  if (
    (
      id === 'first_strike'
      || id === 'hunter'
      || id === 'defender'
      || id === 'counter'
      || id === 're_attack'
      || id === 'iaigiri'
      || id === 'resonance'
      || id === 'command'
      || id === 'm_barrier'
      || id === 'null_counter'
      || id === 'resurrect'
      || id === 'stealth'
      || id === 'illusion'
    )
    && level >= 1
  ) {
    return `${ABILITY_BASE_NAMES[id]}${level}`;
  }
  return ABILITY_BASE_NAMES[id];
}
