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
import { applyDeityCharacterModifiers } from './deity';

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

export function computePartyStats(party: Party): {
  partyStats: ComputedPartyStats;
  characterStats: ComputedCharacterStats[];
} {
  const baseCharacterStats: ComputedCharacterStats[] = party.characters.map((c, index) =>
    computeCharacterStats(c, party.level, index + 1) // Row is 1-6
  );
  const characterStats = applyDeityCharacterModifiers(party, baseCharacterStats);

  // Calculate party HP
  // Party.d.HP = 100 + (Total sum of individual ((Item Bonuses of HP x its c.multiplier x enhancement + level x b.vitality) x (b.vitality + b.mind) / 20) x c.growth_xV)
  let baseHp = 100;
  let bonusHp = 0;

  for (const character of party.characters) {
    const stats = getCharacterBaseStats(character);
    const statMultiplier = (stats.vitality + stats.mind) / 20;
    const growthMultiplier = getCharacterGrowthMultiplier(character);

    // Sum item HP bonuses with multipliers (category + enhancement)
    let itemHpBonus = 0;
    for (const item of character.equipment) {
      if (item && item.partyHP) {
        const categoryMult = getCharacterMultiplier(character, item.category);
        const enhanceMult = getItemEnhancementMultiplier(item);
        const baseMult = item.baseMultiplier ?? 1;
        itemHpBonus += item.partyHP * categoryMult * enhanceMult * baseMult;
      }
    }

    // Add level x vitality
    const levelBonus = party.level * stats.vitality;

    // Character's HP contribution
    bonusHp += ((itemHpBonus + levelBonus) * statMultiplier) * growthMultiplier;
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

  const getBestMainClassAbilityLevel = (
    classId: 'fighter' | 'lord' | 'sage',
    abilityId: 'defender' | 'command' | 'm_barrier',
  ): number => {
    let bestLevel = 0;
    for (const stats of characterStats) {
      const character = party.characters.find((c) => c.id === stats.characterId);
      if (!character || character.mainClassId !== classId) continue;
      const level = stats.abilities
        .filter((ability) => ability.id === abilityId)
        .reduce((maxLevel, ability) => Math.max(maxLevel, ability.level), 0);
      bestLevel = Math.max(bestLevel, level);
    }
    return bestLevel;
  };

  // Calculate offense amplifier from command ability (main class: lord)
  const commandLevel = getBestMainClassAbilityLevel('lord', 'command');
  const offenseAmplifier = commandLevel >= 3 ? 2.0 : commandLevel === 2 ? 1.6 : commandLevel === 1 ? 1.3 : 1.0;

  // Party-wide damage reduction abilities (main class: fighter/sage)
  const defenderLevel = getBestMainClassAbilityLevel('fighter', 'defender');
  const physicalDefenseAmplifier = defenderLevel >= 3 ? 1 / 2 : defenderLevel === 2 ? 3 / 5 : defenderLevel === 1 ? 2 / 3 : 1.0;

  const mBarrierLevel = getBestMainClassAbilityLevel('sage', 'm_barrier');
  const magicalDefenseAmplifier = mBarrierLevel >= 3 ? 1 / 2 : mBarrierLevel === 2 ? 3 / 5 : mBarrierLevel === 1 ? 2 / 3 : 1.0;

  // Elemental resistance (always 1.0 in current version)
  const elementalResistance: Record<ElementalResistance, number> = {
    fire: 1.0,
    thunder: 1.0,
    ice: 1.0,
  };

  const totalHp = Math.floor(baseHp + bonusHp);

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
    return `${names[id]}${level}`;
  }
  return names[id];
}
