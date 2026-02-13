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
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
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

function getCharacterMultiplier(
  character: { raceId: string; mainClassId: string; subClassId: string; predispositionId: string; lineageId: string },
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
  ];

  const multipliers = allBonuses
    .filter(b => b.type === bonusType)
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
    if (item.vitalityBonus) vitality += item.vitalityBonus;
    if (item.strengthBonus) strength += item.strengthBonus;
    if (item.intelligenceBonus) intelligence += item.intelligenceBonus;
    if (item.mindBonus) mind += item.mindBonus;
  }

  return { vitality, strength, intelligence, mind };
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
  // Party.d.HP = 100 + (Total sum of individual ((Item Bonuses of HP x its c.multiplier x enhancement + level x b.vitality) x (b.vitality + b.mind) / 20))
  let baseHp = 100;
  let bonusHp = 0;

  for (const character of party.characters) {
    const stats = getCharacterBaseStats(character);
    const statMultiplier = (stats.vitality + stats.mind) / 20;

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
    bonusHp += (itemHpBonus + levelBonus) * statMultiplier;
  }

  // Calculate party physical defense
  // d.physical_defense = (Total sum of individual (Item Bonuses of Physical defense x its c.multiplier x enhancement x b.vitality / 10))
  let physicalDefense = 0;
  for (const character of party.characters) {
    const stats = getCharacterBaseStats(character);
    const statMultiplier = stats.vitality / 10;

    for (const item of character.equipment) {
      if (item && item.physicalDefense) {
        const categoryMult = getCharacterMultiplier(character, item.category);
        const enhanceMult = getItemEnhancementMultiplier(item);
        const baseMult = item.baseMultiplier ?? 1;
        physicalDefense += item.physicalDefense * categoryMult * enhanceMult * baseMult * statMultiplier;
      }
    }
  }

  // Calculate party magical defense
  // d.magical_defense = (Total sum of individual (Item Bonuses of Magical defense x its c.multiplier x enhancement x b.mind / 10))
  let magicalDefense = 0;
  for (const character of party.characters) {
    const stats = getCharacterBaseStats(character);
    const statMultiplier = stats.mind / 10;

    for (const item of character.equipment) {
      if (item && item.magicalDefense) {
        const categoryMult = getCharacterMultiplier(character, item.category);
        const enhanceMult = getItemEnhancementMultiplier(item);
        const baseMult = item.baseMultiplier ?? 1;
        magicalDefense += item.magicalDefense * categoryMult * enhanceMult * baseMult * statMultiplier;
      }
    }
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
      name: getAbilityName(id),
      level,
      description: '',
    });
  }

  const getBestMainClassAbilityLevel = (classId: 'fighter' | 'lord' | 'sage'): number => {
    let bestLevel = 0;
    for (const character of party.characters) {
      if (character.mainClassId !== classId) continue;
      const level = character.subClassId === classId ? 2 : 1;
      bestLevel = Math.max(bestLevel, level);
    }
    return bestLevel;
  };

  // Calculate offense amplifier from command ability (main class: lord)
  const commandLevel = getBestMainClassAbilityLevel('lord');
  const offenseAmplifier = commandLevel === 2 ? 1.6 : commandLevel === 1 ? 1.3 : 1.0;

  // Party-wide damage reduction abilities (main class: fighter/sage)
  const defenderLevel = getBestMainClassAbilityLevel('fighter');
  const physicalDefenseAmplifier = defenderLevel === 2 ? 3 / 5 : defenderLevel === 1 ? 2 / 3 : 1.0;

  const mBarrierLevel = getBestMainClassAbilityLevel('sage');
  const magicalDefenseAmplifier = mBarrierLevel === 2 ? 3 / 5 : mBarrierLevel === 1 ? 2 / 3 : 1.0;

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
      physicalDefense: Math.floor(physicalDefense),
      magicalDefense: Math.floor(magicalDefense),
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
    squander: '散財',
    tithe: '十分の一税',
  };
  return names[id];
}
