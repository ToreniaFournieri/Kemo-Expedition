import type { AbilityId, AttackType, TerrainEffectKey } from '../types/index.ts';
import {
  getBattleProtocolInitiativeRandomCount,
  prepareBattleProtocolInitiative,
  transformBattleProtocolAbilities,
} from './battleKernel.ts';
import {
  encodeBattleProtocolInput,
  type BattleProtocolCombatant,
  type BattleProtocolInput,
} from './battleProtocol.ts';

const INPUT_FLAG_FERTILITY_INITIATIVE = 1 << 0;
const INPUT_FLAG_ABILITIES_PREPARED = 1 << 1;

export type BattleSetupCombatant = Pick<
  BattleProtocolCombatant,
  | 'id'
  | 'kind'
  | 'row'
  | 'rangedAttack'
  | 'magicalAttack'
  | 'meleeAttack'
  | 'rangedNoA'
  | 'magicalNoA'
  | 'meleeNoA'
  | 'abilities'
>;

export type BattleAbilityTransformation = {
  combatantId: number;
  combatantKind: 'character' | 'enemy';
  abilityId: AbilityId;
  previousLevel: number;
  nextLevel: number;
};

export type BattleInitiativeAction = {
  combatantId: number;
  combatantKind: 'character' | 'enemy';
  attackType: AttackType;
  initiative: number;
  order: number;
};

function toProtocolCombatant(combatant: BattleSetupCombatant): BattleProtocolCombatant {
  return {
    ...combatant,
    elementalOffense: 'none',
    hp: 1,
    maxHp: 1,
    physicalDefense: 0,
    magicalDefense: 0,
    accuracyBonus: 0,
    evasionBonus: 0,
    elementalOffenseValue: 1,
  };
}

function buildInput(
  combatants: readonly BattleSetupCombatant[],
  terrainEffect: TerrainEffectKey | null | undefined,
  flags: number,
  randomValues: readonly number[],
): BattleProtocolInput {
  return {
    flags,
    terrainEffect,
    partyHp: 1,
    enemyHp: 1,
    combatants: combatants.map(toProtocolCombatant),
    randomValues,
    physicalThreatBag: [],
    magicalThreatBag: [],
  };
}

export function transformBattleAbilitiesForTerrain(
  combatants: readonly BattleSetupCombatant[],
  terrainEffect: TerrainEffectKey | null | undefined,
): BattleAbilityTransformation[] {
  if (terrainEffect !== 'terrain.transcendence' && terrainEffect !== 'terrain.suppression') return [];
  const output = transformBattleProtocolAbilities(encodeBattleProtocolInput(
    buildInput(combatants, terrainEffect, 0, []),
  ));
  return output.events.map((event) => {
    if (event.opcode !== 'ability_activated' || !event.abilityId) {
      throw new Error(`Unexpected C++ ability-preparation event: ${event.opcode}`);
    }
    return {
      combatantId: event.actorId,
      combatantKind: event.actorKind === 1 ? 'character' : 'enemy',
      abilityId: event.abilityId,
      previousLevel: event.value0,
      nextLevel: event.value1,
    };
  });
}

export function prepareBattleInitiative(
  combatants: readonly BattleSetupCombatant[],
  options: {
    terrainEffect?: TerrainEffectKey | null;
    fertilityInitiative?: boolean;
    random?: () => number;
  } = {},
): { actions: BattleInitiativeAction[]; randomConsumed: number } {
  const flags = INPUT_FLAG_ABILITIES_PREPARED
    | (options.fertilityInitiative ? INPUT_FLAG_FERTILITY_INITIATIVE : 0);
  const inputWithoutRandom = buildInput(combatants, options.terrainEffect, flags, []);
  const randomCount = getBattleProtocolInitiativeRandomCount(encodeBattleProtocolInput(inputWithoutRandom));
  const random = options.random ?? Math.random;
  const randomValues = Array.from({ length: randomCount }, () => random());
  const output = prepareBattleProtocolInitiative(encodeBattleProtocolInput({
    ...inputWithoutRandom,
    randomValues,
  }));
  if (output.randomConsumed !== randomCount) {
    throw new Error(`C++ initiative consumed ${output.randomConsumed} of ${randomCount} supplied random values`);
  }
  return {
    randomConsumed: output.randomConsumed,
    actions: output.events.map((event) => {
      if (event.opcode !== 'initiative' || !event.attackType) {
        throw new Error(`Unexpected C++ initiative event: ${event.opcode}`);
      }
      return {
        combatantId: event.actorId,
        combatantKind: event.actorKind === 1 ? 'character' : 'enemy',
        attackType: event.attackType,
        initiative: event.timing,
        order: event.aux0,
      };
    }),
  };
}
