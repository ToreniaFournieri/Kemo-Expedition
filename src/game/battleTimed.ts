import type { AttackType, ElementalOffense, TerrainEffectKey } from '../types/index.ts';
import { BATTLE_TERRAIN_IDS } from './generated/battleProtocol.generated.ts';
import { runNormalActionKernel } from './battleKernel.ts';

const phaseId = (phase: AttackType | 'start' | 'end'): number => (
  phase === 'ranged' ? 0 : phase === 'magical' ? 1 : phase === 'melee' ? 2 : phase === 'start' ? 3 : 4
);

export function selectTimedIndex(
  count: number,
  random: () => number = Math.random,
): { index: number | null; randomConsumed: number } {
  const normalized = Math.max(0, Math.trunc(count));
  const values = Array(64).fill(0);
  values[0] = 10;
  values[33] = normalized;
  const rolls = normalized > 0 ? [random()] : [];
  const output = runNormalActionKernel(values, rolls);
  return { index: output[6] > 0 ? output[6]! - 1 : null, randomConsumed: output[4]! };
}

export function resolveTimedConfusion(input: {
  attackType: AttackType;
  level: number;
  targetCount: number;
  fixedTarget?: boolean;
  random?: () => number;
}): { timing: number | null; targetIndex: number | null; success: boolean; chance: number; randomConsumed: number } {
  const count = Math.max(0, Math.trunc(input.targetCount));
  const random = input.random ?? Math.random;
  const rolls = input.level > 0 && count > 0
    ? input.fixedTarget ? [random()] : [random(), random()]
    : [];
  const values = Array(64).fill(0);
  values[0] = 11;
  values[1] = input.fixedTarget ? 1 : 0;
  values[2] = phaseId(input.attackType);
  values[33] = count;
  values[43] = input.level;
  const output = runNormalActionKernel(values, rolls);
  return {
    timing: input.level > 0 ? output[9]! : null,
    targetIndex: output[6] > 0 ? output[6]! - 1 : null,
    success: output[5] === 1,
    chance: output[7]!,
    randomConsumed: output[4]!,
  };
}

export type TimedFormulaKind =
  | 'predator-sense' | 'regeneration' | 'flying' | 'decompose'
  | 'unstable-core' | 'soul-reap' | 'howl' | 'free' | 'self-destruct';

const formulaIds: Record<TimedFormulaKind, number> = {
  'predator-sense': 1,
  regeneration: 2,
  flying: 3,
  decompose: 4,
  'unstable-core': 5,
  'soul-reap': 6,
  howl: 7,
  free: 8,
  'self-destruct': 9,
};

export function resolveTimedFormula(input: {
  kind: TimedFormulaKind;
  level: number;
  currentHp?: number;
  maxHp?: number;
  damageTaken?: number;
  targetDefense?: number;
  targetDefenseAmplifier?: number;
}): { value: number; amount: number; triggered: boolean } {
  const values = Array(64).fill(0);
  values[0] = 12;
  values[5] = input.damageTaken ?? 0;
  values[6] = input.targetDefense ?? 0;
  values[11] = input.targetDefenseAmplifier ?? 1;
  values[20] = input.maxHp ?? 0;
  values[31] = input.currentHp ?? 0;
  values[43] = input.level;
  values[44] = formulaIds[input.kind];
  const output = runNormalActionKernel(values);
  return { value: output[8]!, amount: output[1]!, triggered: output[5] === 1 };
}

export type TimedSlotEvent =
  | 'oblivion' | 'memory-mimic' | 'party-effects' | 'start-effects'
  | 'howl' | 'predator-sense' | 'regeneration' | 'flying'
  | 'decompose' | 'self-destruct' | 'unstable-core' | 'soul-reap';

const eventIds: Record<TimedSlotEvent, number> = {
  oblivion: 1,
  'memory-mimic': 2,
  'party-effects': 3,
  'start-effects': 4,
  howl: 5,
  'predator-sense': 6,
  regeneration: 7,
  flying: 8,
  decompose: 9,
  'self-destruct': 10,
  'unstable-core': 11,
  'soul-reap': 12,
};

export function isTimedTriggerSlot(
  event: TimedSlotEvent,
  phase: AttackType | 'start' | 'end',
  timing: number,
): boolean {
  const values = Array(64).fill(0);
  values[0] = 13;
  values[2] = phaseId(phase);
  values[3] = timing;
  values[43] = eventIds[event];
  return runNormalActionKernel(values)[5] === 1;
}

export function resolveTimedTerrainEffect(input: {
  terrainEffect?: TerrainEffectKey | null;
  attackType: AttackType;
  elementalOffense: ElementalOffense;
  currentHp: number;
  maxHp: number;
  totalDamage: number;
  hasVineCutter?: boolean;
  hasManaWard?: boolean;
  sacredJudgementEligible?: boolean;
  sacredJudgementConsumed?: boolean;
}): { effect: 'vine-snare' | 'crystal-zone' | 'conduction' | 'mana-burn' | 'sacred-judgement' | null; damage: number; chainDamage: number } {
  const values = Array(64).fill(0);
  values[0] = 14;
  values[1] = (input.hasVineCutter ? 1 : 0)
    | (input.hasManaWard ? 2 : 0)
    | (input.sacredJudgementEligible ? 4 : 0)
    | (input.sacredJudgementConsumed ? 8 : 0);
  values[2] = phaseId(input.attackType);
  values[5] = input.totalDamage;
  values[20] = input.maxHp;
  values[31] = input.currentHp;
  values[38] = input.elementalOffense === 'fire' ? 1 : input.elementalOffense === 'thunder' ? 2 : input.elementalOffense === 'ice' ? 3 : 0;
  values[41] = input.terrainEffect ? BATTLE_TERRAIN_IDS[input.terrainEffect as keyof typeof BATTLE_TERRAIN_IDS] : 0;
  const output = runNormalActionKernel(values);
  const effects = [null, 'vine-snare', 'crystal-zone', 'conduction', 'mana-burn', 'sacred-judgement'] as const;
  return { effect: effects[output[5]!] ?? null, damage: output[1]!, chainDamage: output[2]! };
}

export function resolvePeriodicDeityHpEffectKernel(input: {
  deity: 'restoration' | 'attrition' | null;
  isEliteFourthRoom: boolean;
  isGehenna: boolean;
  isRotwood: boolean;
  currentHp: number;
  maxHp: number;
  deityRank: number;
}): { hp: number; healAmount: number; attritionAmount: number } {
  const values = Array(64).fill(0);
  values[0] = 15;
  values[1] = (input.isEliteFourthRoom ? 1 : 0) | (input.isGehenna ? 2 : 0) | (input.isRotwood ? 4 : 0);
  values[20] = input.maxHp;
  values[31] = input.currentHp;
  values[43] = input.deity === 'restoration' ? 1 : input.deity === 'attrition' ? 2 : 0;
  values[44] = input.deityRank;
  const output = runNormalActionKernel(values);
  return { hp: output[9]!, healAmount: output[1]!, attritionAmount: output[2]! };
}
