import type { ExpeditionLog, ExpeditionLogEntry, Party } from '../types';
import { REST_HEAL_MAX_HP_RATIO, REST_HEAL_MIN_HP } from './restHealing';

// SpecRef: 5.1 | PROGRESS | Step Progress behavior by state
// SpecRef: 8.3 | UI_EXPEDITION | Sub progress bar
// The progress of a party's current state, as the Expedition pane draws it and as the Application API publishes it. Pure
// functions of the live cycle, the party, its log, and the clock; nothing here reads the DOM or the reducer.

/** One step per room of a full expedition (Spec 5.1.1, `state.explore`). */
export const EXPLORING_PROGRESS_TOTAL_STEPS = 24;

/** `state.rest`, `state.sell`, and `state.explore` advance in whole Steps; every other state fills continuously. */
export const STEP_BASED_STATES: ReadonlySet<string> = new Set(['rest', 'sell', 'explore']);

// SpecRef: 5.1.1 | Party State Machine | state.sell
export function getAutoSellStepCount(party: Pick<Party, 'lastExpeditionLog'>): number {
  const autoSellItemCount = party.lastExpeditionLog?.autoSellItems?.length
    || party.lastExpeditionLog?.autoSellCount
    || 1;
  return Math.max(1, autoSellItemCount);
}

/** Rooms of the running exploration revealed after `elapsedMs` of `durationMs`. */
export function getExplorationVisibleRoomCount(elapsedMs: number, durationMs: number, totalEntries: number): number {
  if (totalEntries <= 0) return 0;
  return Math.min(
    totalEntries,
    Math.max(0, Math.ceil((elapsedMs / Math.max(1, durationMs)) * totalEntries)),
  );
}

/** The party HP at the start of a room, from the recorded value or reconstructed from the room's damage, heal, and attrition. */
export function getEstimatedStartHp(entry: ExpeditionLogEntry): number {
  if (typeof entry.startPartyHP === 'number') {
    return Math.min(entry.maxPartyHP, Math.max(0, entry.startPartyHP));
  }
  const healAmount = Math.max(0, entry.healAmount ?? 0);
  const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
  return Math.min(entry.maxPartyHP, Math.max(0, entry.remainingPartyHP + entry.damageTaken + attritionAmount - healAmount));
}

export interface PartyStateClock {
  state: string;
  stateStartedAt: number;
  durationMs: number;
  restInitialTotalSteps?: number;
}

export interface PartyStateProgress {
  /** `stepBased` fills in whole Steps, `continuous` over the duration, `none` for `state.idle` and `state.reactivate`. */
  kind: 'none' | 'continuous' | 'stepBased';
  /** Whole percent of the main bar as of `nowMs`, 0 to 100. */
  mainPercent: number;
  totalSteps: number | null;
  completedSteps: number | null;
  /** The Step in progress, for the thin sub bar (step-based states only). */
  subProgress: { startedAt: number; endsAt: number } | null;
  /** The next instant at which a step-based bar changes by itself (a room or an item), or `null`. */
  nextChangeAt: number | null;
  /** While exploring: how many rooms of the running log are revealed. */
  revealedRoomCount: number | null;
}

export function getPartyStateProgress(input: {
  clock: PartyStateClock;
  party: Pick<Party, 'currentHp' | 'lastExpeditionLog'>;
  maximumHp: number;
  nowMs: number;
  /** The running exploration's log (the party's newest log). */
  log: ExpeditionLog | null;
}): PartyStateProgress {
  const { clock, party, maximumHp, nowMs, log } = input;
  const elapsedMs = Math.max(0, nowMs - clock.stateStartedAt);
  const duration = Math.max(1, clock.durationMs);
  const none: PartyStateProgress = { kind: 'none', mainPercent: 100, totalSteps: null, completedSteps: null, subProgress: null, nextChangeAt: null, revealedRoomCount: null };
  if (clock.state === 'idle' || clock.state === 'reactivate') return none;

  if (clock.state === 'explore') {
    const entryCount = log?.entries.length ?? 0;
    const revealed = getExplorationVisibleRoomCount(elapsedMs, duration, entryCount);
    const totalStepCount = Math.max(1, entryCount);
    const stepDuration = duration / totalStepCount;
    const completed = Math.floor(elapsedMs / stepDuration);
    const stepStartedAt = clock.stateStartedAt + completed * stepDuration;
    return {
      kind: 'stepBased',
      mainPercent: (Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, revealed) / EXPLORING_PROGRESS_TOTAL_STEPS) * 100,
      totalSteps: EXPLORING_PROGRESS_TOTAL_STEPS,
      completedSteps: Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, revealed),
      subProgress: { startedAt: stepStartedAt, endsAt: stepStartedAt + stepDuration },
      // The room after `revealed` appears once more than `revealed` steps of the exploration have passed.
      nextChangeAt: revealed < entryCount ? Math.ceil(clock.stateStartedAt + (revealed * duration) / entryCount) + 1 : null,
      revealedRoomCount: revealed,
    };
  }

  if (clock.state === 'rest') {
    const totalSteps = Math.max(1, clock.restInitialTotalSteps ?? 1);
    const healPerStep = Math.max(REST_HEAL_MIN_HP, Math.ceil(maximumHp * REST_HEAL_MAX_HP_RATIO));
    const missingHp = Math.max(0, maximumHp - party.currentHp);
    const remainingSteps = missingHp <= 0 ? 0 : Math.ceil(missingHp / healPerStep);
    const completedSteps = Math.max(0, Math.min(totalSteps, totalSteps - remainingSteps));
    // A rest Step lasts the state's whole duration, so the sub bar is the current Step from the state's start.
    const stepStartedAt = clock.stateStartedAt + Math.floor(elapsedMs / duration) * duration;
    return {
      kind: 'stepBased',
      mainPercent: (completedSteps / totalSteps) * 100,
      totalSteps,
      completedSteps,
      subProgress: { startedAt: stepStartedAt, endsAt: stepStartedAt + duration },
      nextChangeAt: null,
      revealedRoomCount: null,
    };
  }

  if (clock.state === 'sell') {
    const totalSteps = getAutoSellStepCount(party);
    const rawProgress = Math.min(1, elapsedMs / duration);
    const completedSteps = Math.min(totalSteps, Math.floor(rawProgress * totalSteps));
    const stepDuration = duration / totalSteps;
    const stepStartedAt = clock.stateStartedAt + Math.floor(elapsedMs / stepDuration) * stepDuration;
    return {
      kind: 'stepBased',
      mainPercent: (completedSteps / totalSteps) * 100,
      totalSteps,
      completedSteps,
      subProgress: { startedAt: stepStartedAt, endsAt: stepStartedAt + stepDuration },
      nextChangeAt: completedSteps < totalSteps ? Math.ceil(clock.stateStartedAt + (completedSteps + 1) * stepDuration) : null,
      revealedRoomCount: null,
    };
  }

  return { kind: 'continuous', mainPercent: Math.min(100, (elapsedMs / duration) * 100), totalSteps: null, completedSteps: null, subProgress: null, nextChangeAt: null, revealedRoomCount: null };
}
