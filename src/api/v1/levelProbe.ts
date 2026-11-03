import { DUNGEONS } from '../../data/dungeons.ts';
import { hasDefeatedDungeonBoss } from '../../game/clearGate.ts';
import { getExpeditionGoals } from '../../game/expeditionGoals.ts';
import { getXpToNextLevel } from '../../game/partyLevel.ts';
import { LEVEL_EQUIP_SLOTS, MAX_LEVEL, type Party } from '../../types/index.ts';

// SpecRef: 9.1.3 | 2-3-2 gaSearch `levelProbe` | whether a higher party level lets the result build reach a goal.
// The request, the goal, the expected-runs math, and the probed levels. The simulations run in `gaSearch.ts`.

export const LEVEL_PROBE_MODES = ['auto', 'always', 'off'] as const;
export const LEVEL_PROBE_PURPOSES = ['conquest', 'farming'] as const;
export const LEVEL_PROBE_STEPS = ['slot', 'level'] as const;
// SpecRef: 9.1.3 | 2-3-2 `levelProbe.fill` | how a probed level's build gets its newly opened slots: two greedy fills, or a
// short search of the probed build at that level.
export const LEVEL_PROBE_FILLS = ['greedy', 'search'] as const;
export type LevelProbeFill = typeof LEVEL_PROBE_FILLS[number];
export type LevelProbeMode = typeof LEVEL_PROBE_MODES[number];
export type LevelProbePurpose = typeof LEVEL_PROBE_PURPOSES[number];
export type LevelProbeSteps = typeof LEVEL_PROBE_STEPS[number];

export interface LevelProbeRequest {
  mode: LevelProbeMode;
  purpose: LevelProbePurpose;
  /** `conquest`: the largest acceptable expected number of runs to the goal. */
  runBudget: number;
  /** `farming`: the largest acceptable defeat rate, in %. */
  maxDefeat: number;
  steps: LevelProbeSteps;
  count: number;
  fill: LevelProbeFill;
}

const FIELDS = ['mode', 'purpose', 'runBudget', 'maxDefeat', 'steps', 'count', 'fill'] as const;

function invalid(field: string): never { throw new Error(`invalid_request:${field}`); }

/** Validates the `levelProbe` request member (Spec 9.1.3, 2-3-2); absent gives the defaults. */
export function parseLevelProbe(raw: unknown): LevelProbeRequest {
  const source = raw === undefined ? {} : raw;
  if (!source || typeof source !== 'object' || Array.isArray(source)) invalid('levelProbe');
  const record = source as Record<string, unknown>;
  const unknown = Object.keys(record).find((key) => !(FIELDS as readonly string[]).includes(key));
  if (unknown !== undefined) invalid(`levelProbe.${unknown}.unknown_member`);
  const pick = <T extends string>(key: string, values: readonly T[], fallback: T): T => {
    const value = record[key] === undefined ? fallback : record[key];
    if (typeof value !== 'string' || !(values as readonly string[]).includes(value)) invalid(`levelProbe.${key}`);
    return value as T;
  };
  const number = (key: string, minimum: number, maximum: number, fallback: number, integer = false): number => {
    const value = record[key] === undefined ? fallback : record[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum || (integer && !Number.isInteger(value))) invalid(`levelProbe.${key}`);
    return value;
  };
  const steps = pick('steps', LEVEL_PROBE_STEPS, 'slot');
  return {
    mode: pick('mode', LEVEL_PROBE_MODES, 'auto'),
    purpose: pick('purpose', LEVEL_PROBE_PURPOSES, 'conquest'),
    runBudget: number('runBudget', 7, 100, 10),
    maxDefeat: number('maxDefeat', 0, 100, 10),
    steps,
    count: number('count', 1, 10, steps === 'slot' ? 1 : 5, true),
    fill: pick('fill', LEVEL_PROBE_FILLS, 'greedy'),
  };
}

// SpecRef: 9.1.3 | 2-3-2 `levelProbe` `conquest` | `E(j) = (1 - p^j) / ((1 - p) × p^j)`, `E(0) = 0`.
/** Expected runs to a streak of `j` from a streak of 0 at success probability `p` (0 to 1); Infinity at `p` 0. */
function streakRuns(p: number, j: number): number {
  if (j <= 0) return 0;
  if (p <= 0) return Infinity;
  if (p >= 1) return j;
  return (1 - p ** j) / ((1 - p) * p ** j);
}

/** Expected runs from streak `current` to `required` (`E(k) - E(c)`); null when `p` is 0. */
export function expectedRunsToGoal(p: number, required: number, current: number): number | null {
  if (current >= required) return 0;
  const runs = streakRuns(p, required) - streakRuns(p, current);
  return Number.isFinite(runs) ? runs : null;
}

/** The success probability (0 to 1) at which the expected runs equal `runBudget`; 1 when even `p` 1 needs more runs. */
export function requiredRateForBudget(required: number, current: number, runBudget: number): number {
  if (required - current > runBudget) return 1;
  let low = 0; let high = 1;
  for (let step = 0; step < 60; step += 1) {
    const middle = (low + high) / 2;
    const runs = expectedRunsToGoal(middle, required, current);
    if (runs === null || runs > runBudget) low = middle; else high = middle;
  }
  return high;
}

export interface LevelProbeGoal { kind: 'eliteGate' | 'bossGate' | 'boss'; dungeonId: number; floor: number | null; required: number; current: number }

// SpecRef: 9.1.3 | 2-3-2 `levelProbe` `conquest` | the next closed Clear-Gate, or the boss once every gate is open.
/** The next goal of the party's destination (the Expedition pane's Clear-Gate goals), or null when there is none. */
export function conquestGoal(party: Party): LevelProbeGoal | null {
  const dungeon = DUNGEONS.find((entry) => entry.id === party.selectedDungeonId);
  if (!dungeon || !dungeon.floors || dungeon.id === 99) return null;
  for (const goal of getExpeditionGoals(party)) {
    if (goal.kind === 'eliteGate') return { kind: 'eliteGate', dungeonId: goal.dungeonId, floor: goal.floor, required: goal.required, current: goal.current };
    if (goal.kind === 'bossGate') return { kind: 'bossGate', dungeonId: goal.dungeonId, floor: null, required: goal.required, current: goal.current };
  }
  return hasDefeatedDungeonBoss(party, dungeon.id) ? null : { kind: 'boss', dungeonId: dungeon.id, floor: null, required: 1, current: 0 };
}

/** Base equipment slots at `level` (Spec 2.1.1.1 `f.equipment_slots`). */
export function baseSlotsAt(level: number): number {
  let slots = 1;
  for (const [threshold, count] of Object.entries(LEVEL_EQUIP_SLOTS)) if (level >= Number(threshold)) slots = count;
  return slots;
}

/** The levels to probe above `level`, in ascending order, never above `MAX_LEVEL`. */
export function probedLevels(level: number, steps: LevelProbeSteps, count: number): number[] {
  const candidates = steps === 'slot'
    ? Object.keys(LEVEL_EQUIP_SLOTS).map(Number).filter((threshold) => threshold > level).sort((a, b) => a - b)
    : Array.from({ length: count }, (_, index) => level + index + 1);
  return candidates.filter((candidate) => candidate <= MAX_LEVEL).slice(0, count);
}

/** EXP the party still needs to reach `level` (Spec 2.1.1.1): the rest of its current level, then each level between. */
export function experienceToLevel(party: Pick<Party, 'level' | 'experience'>, level: number): number {
  if (level <= party.level) return 0;
  let total = -party.experience;
  for (let step = party.level; step < level; step += 1) total += getXpToNextLevel(step);
  return Math.max(0, Math.ceil(total));
}
