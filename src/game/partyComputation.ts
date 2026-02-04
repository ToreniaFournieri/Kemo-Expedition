import {
  Party,
  ComputedPartyStats,
  ComputedCharacterStats,
  Ability,
  AbilityId,
  ElementalResistance,
  ItemCategory,
  BonusType,
} from '../types';
import { computeCharacterStats } from './characterComputation';
import { getRaceById } from '../data/races';
import { getClassById } from '../data/classes';
import { getPredispositionById } from '../data/predispositions';
import { getLineageById } from '../data/lineages';

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

function getCharacterBaseStats(character: { raceId: string; predispositionId: string; lineageId: string }) {
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

  return { vitality, strength, intelligence, mind };
}

export function computePartyStats(party: Party): {
  partyStats: ComputedPartyStats;
  characterStats: ComputedCharacterStats[];
} {
  const characterStats: ComputedCharacterStats[] = party.characters.map((c, index) =>
    computeCharacterStats(c, party.level, index + 1) // Row is 1-6
  );

  // Calculate party HP
  // Party.d.HP = 950 + (level x 50) + (Total sum of individual (Item Bonuses of HP x its c.multiplier x (b.vitality + b.mind) / 20))
  let baseHp = 950 + party.level * 50;
  let bonusHp = 0;

  for (const character of party.characters) {
    const stats = getCharacterBaseStats(character);
    const statMultiplier = (stats.vitality + stats.mind) / 20;

    for (const item of character.equipment) {
      if (item && item.partyHP) {
        const multiplier = getCharacterMultiplier(character, item.category);
        bonusHp += item.partyHP * multiplier * statMultiplier;
      }
    }
  }

  // Calculate party physical defense
  // d.physical_defense = (Total sum of individual (Item Bonuses of Physical defense x its c.multiplier x b.vitality / 10))
  let physicalDefense = 0;
  for (const character of party.characters) {
    const stats = getCharacterBaseStats(character);
    const statMultiplier = stats.vitality / 10;

    for (const item of character.equipment) {
      if (item && item.physicalDefense) {
        const multiplier = getCharacterMultiplier(character, item.category);
        physicalDefense += item.physicalDefense * multiplier * statMultiplier;
      }
    }
  }

  // Calculate party magical defense
  // d.magical_defense = (Total sum of individual (Item Bonuses of Magical defense x its c.multiplier x b.mind / 10))
  let magicalDefense = 0;
  for (const character of party.characters) {
    const stats = getCharacterBaseStats(character);
    const statMultiplier = stats.mind / 10;

    for (const item of character.equipment) {
      if (item && item.magicalDefense) {
        const multiplier = getCharacterMultiplier(character, item.category);
        magicalDefense += item.magicalDefense * multiplier * statMultiplier;
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

  // Calculate offense amplifier from leading ability
  let offenseAmplifier = 1.0;
  const leadingAbility = abilities.find(a => a.id === 'leading');
  if (leadingAbility) {
    offenseAmplifier = leadingAbility.level === 2 ? 1.6 : 1.3;
  }

  // Calculate defense amplifiers
  let physicalDefenseAmplifier = 1.0;
  let magicalDefenseAmplifier = 1.0;

  const defenderAbility = abilities.find(a => a.id === 'defender');
  if (defenderAbility) {
    physicalDefenseAmplifier = defenderAbility.level === 2 ? 3 / 5 : 2 / 3;
  }

  const mBarrierAbility = abilities.find(a => a.id === 'm_barrier');
  if (mBarrierAbility) {
    magicalDefenseAmplifier = mBarrierAbility.level === 2 ? 3 / 5 : 2 / 3;
  }

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
    leading: '指揮',
    m_barrier: '魔法障壁',
    null_counter: 'カウンター無効',
    unlock: '解錠',
  };
  return names[id];
}
