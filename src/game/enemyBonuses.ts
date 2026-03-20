import type { Bonus, ElementalOffense, EnemyAbility, EnemyDef } from '../types';

export type EnemyTypeSpec = {
  ability1: EnemyAbility[];
  ability30?: EnemyAbility[];
  bonuses: Bonus[];
};

export const ENEMY_TYPE_SPECS: Record<string, EnemyTypeSpec> = {
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
      { type: 'thunder_offense', value: 0.2 },
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
      { type: 'ice_offense', value: 0.2 },
      { type: 'fire_defense_multiplier_xV', value: 1.3 },
      { type: 'ice_defense_multiplier_xV', value: 1 / 5 },
    ],
  },
  Marine: {
    ability1: [{ id: 'bind', level: 1 }],
    ability30: [{ id: 'regeneration', level: 3 }],
    bonuses: [{ type: 'thunder_defense_multiplier_xV', value: 1.3 }],
  },
  Dragon: {
    ability1: [{ id: 'burn', level: 1 }],
    ability30: [{ id: 'fire_reflect', level: 1 }],
    bonuses: [
      { type: 'fire_offense', value: 0.4 },
      { type: 'fire_defense_multiplier_xV', value: 1 / 2 },
      { type: 'ice_defense_multiplier_xV', value: 1.3 },
    ],
  },
  Spirit: {
    ability1: [{ id: 'soul_reap', level: 1 }],
    ability30: [{ id: 'mutual_magic_amplify', level: 1 }],
    bonuses: [
      { type: 'ice_offense', value: 0.2 },
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
      { type: 'ice_offense', value: 0.4 },
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
  Chimera: {
    ability1: [{ id: 'unstable_core', level: 1 }],
    ability30: [{ id: 'magical_reflect', level: 1 }],
    bonuses: [
      { type: 'thunder_offense', value: 0.3 },
      { type: 'grit', value: 1 },
      { type: 'pursuit', value: 1 },
      { type: 'caster', value: 1 },
      { type: 'growth_xV', value: 1.7 },
    ],
  },
  Titan: {
    ability1: [{ id: 'colossal', level: 1 }],
    ability30: [{ id: 'mutual_magic_restraint', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 1.5 }],
  },
  Jinma: {
    ability1: [{ id: 'upgrade_all_abilities', level: 1 }],
    bonuses: [{ type: 'growth_xV', value: 2.0 }],
  },
};

export function getEnemyTypeSpec(enemyType: string): EnemyTypeSpec | undefined {
  return ENEMY_TYPE_SPECS[enemyType];
}

export function applyEnemyBonusesToRuntimeEnemy(enemy: EnemyDef): EnemyDef {
  const bonuses = enemy.bonuses ?? [];
  if (bonuses.length === 0) {
    return {
      ...enemy,
      elementalOffenseValue: enemy.elementalOffenseValue ?? 1.0,
    };
  }

  let hpMultiplier = 1;
  let rangedNoABonus = 0;
  let magicalNoABonus = 0;
  let meleeNoABonus = 0;
  let accuracyBonus = enemy.accuracyBonus;
  let evasionBonus = enemy.evasionBonus;
  let physicalDefenseAmplifier = enemy.physicalDefenseAmplifier;
  let magicalDefenseAmplifier = enemy.magicalDefenseAmplifier;
  const elementalResistance = { ...enemy.elementalResistance };
  const elementalOffenseBonuses: Record<'fire' | 'ice' | 'thunder', number> = {
    fire: enemy.elementalOffense === 'fire' ? Math.max(0, (enemy.elementalOffenseValue ?? 1) - 1) : 0,
    ice: enemy.elementalOffense === 'ice' ? Math.max(0, (enemy.elementalOffenseValue ?? 1) - 1) : 0,
    thunder: enemy.elementalOffense === 'thunder' ? Math.max(0, (enemy.elementalOffenseValue ?? 1) - 1) : 0,
  };

  for (const bonus of bonuses) {
    switch (bonus.type) {
      case 'growth_xV':
        hpMultiplier *= bonus.value;
        break;
      case 'grit':
        meleeNoABonus += bonus.value;
        break;
      case 'caster':
        magicalNoABonus += bonus.value;
        break;
      case 'pursuit':
        rangedNoABonus += bonus.value;
        break;
      case 'accuracy':
        accuracyBonus += bonus.value;
        break;
      case 'evasion':
        evasionBonus += bonus.value;
        break;
      case 'physical_defense_multiplier_xV':
        physicalDefenseAmplifier *= bonus.value;
        break;
      case 'magical_defense_multiplier_xV':
        magicalDefenseAmplifier *= bonus.value;
        break;
      case 'fire_defense_multiplier_xV':
        elementalResistance.fire *= bonus.value;
        break;
      case 'ice_defense_multiplier_xV':
        elementalResistance.ice *= bonus.value;
        break;
      case 'thunder_defense_multiplier_xV':
        elementalResistance.thunder *= bonus.value;
        break;
      case 'fire_offense':
        elementalOffenseBonuses.fire += bonus.value;
        break;
      case 'ice_offense':
        elementalOffenseBonuses.ice += bonus.value;
        break;
      case 'thunder_offense':
        elementalOffenseBonuses.thunder += bonus.value;
        break;
      default:
        break;
    }
  }

  const elementalOrder: Array<'fire' | 'ice' | 'thunder'> = ['fire', 'ice', 'thunder'];
  let selectedElement: ElementalOffense = enemy.elementalOffense ?? 'none';
  let selectedBonus = selectedElement === 'none' ? 0 : Math.max(0, (enemy.elementalOffenseValue ?? 1) - 1);
  for (const element of elementalOrder) {
    if (elementalOffenseBonuses[element] > selectedBonus) {
      selectedElement = element;
      selectedBonus = elementalOffenseBonuses[element];
    }
  }

  return {
    ...enemy,
    accuracyBonus,
    evasionBonus,
    hp: Math.max(1, Math.floor(enemy.hp * hpMultiplier)),
    rangedNoA: Math.max(0, enemy.rangedNoA + rangedNoABonus),
    magicalNoA: Math.max(0, enemy.magicalNoA + magicalNoABonus),
    meleeNoA: Math.max(0, enemy.meleeNoA + meleeNoABonus),
    elementalOffense: selectedBonus > 0 ? selectedElement : enemy.elementalOffense,
    elementalOffenseValue: selectedBonus > 0 ? 1 + selectedBonus : (enemy.elementalOffenseValue ?? 1.0),
    elementalResistance,
    physicalDefenseAmplifier,
    magicalDefenseAmplifier,
  };
}
