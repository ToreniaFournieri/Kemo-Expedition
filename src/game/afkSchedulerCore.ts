const DEFAULT_BATCH_BUDGET_MS = 16;
const MOBILE_BATCH_BUDGET_MS = 10;
const CONSTRAINED_BATCH_BUDGET_MS = 6;
const MAX_BATCH_BUDGET_MS = 20;
const MAX_OPERATIONS_PER_BATCH = 64;
const HOUR_MS = 60 * 60 * 1000;

export const AFK_MAX_REAL_ELAPSED_MS = 162 * HOUR_MS;
export const AFK_MAX_EFFECTIVE_ELAPSED_MS = 45 * HOUR_MS;

const AFK_EFFICIENCY_BANDS = [
  { endHour: 9, speed: 1 },
  { endHour: 18, speed: 2 / 3 },
  { endHour: 30, speed: 1 / 2 },
  { endHour: 48, speed: 1 / 3 },
  { endHour: 72, speed: 1 / 4 },
  { endHour: 108, speed: 1 / 6 },
  { endHour: 162, speed: 1 / 9 },
] as const;

export function getEffectiveAfkElapsedMs(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;

  const cappedElapsedMs = Math.min(elapsedMs, AFK_MAX_REAL_ELAPSED_MS);
  let previousEndMs = 0;
  let effectiveMs = 0;

  for (const band of AFK_EFFICIENCY_BANDS) {
    const bandEndMs = band.endHour * HOUR_MS;
    const elapsedInBandMs = Math.max(0, Math.min(cappedElapsedMs, bandEndMs) - previousEndMs);
    effectiveMs += elapsedInBandMs * band.speed;
    if (cappedElapsedMs <= bandEndMs) break;
    previousEndMs = bandEndMs;
  }

  return Math.min(AFK_MAX_EFFECTIVE_ELAPSED_MS, Math.floor(effectiveMs));
}

export interface AfkChunkPlan {
  elapsedMs: number;
  simulatedEndAt: number;
  cycleDurationScale: number;
  cycleDurationByParty: number[];
  operationCount: number;
}

export interface PersistedAfkChunkCursor extends AfkChunkPlan {
  operationCursor: number;
}

export interface AfkSimulationBatchSlice {
  cycleDurationByParty: number[];
  operationStart: number;
  operationCount: number;
  finalizeChunk: boolean;
}

export interface AfkCyclePartyOperation {
  runIndex: number;
  partyIndex: number;
  partyCycleDurationMs: number;
}

export interface AfkRecoveryBacklogObservation {
  hasObservedActiveRecovery: boolean;
  didCompleteRecovery: boolean;
}

export interface AfkOnlineProgressLockState {
  isHydrating: boolean;
  pendingAfkMs: number;
  hasChunkCursor: boolean;
  shouldRebuildAfterRecovery: boolean;
}

export function getAfkRecoveryCompletedMs(
  totalMs: number,
  remainingMsByParty: Record<number, number>,
  fallbackRemainingMs: number,
): number {
  const total = Math.max(0, totalMs);
  if (total === 0) return 0;

  const remaining = Object.values(remainingMsByParty)
    .filter(Number.isFinite)
    .map((value) => Math.max(0, Math.min(total, value)));
  const averageRemaining = remaining.length > 0
    ? remaining.reduce((sum, value) => sum + value, 0) / remaining.length
    : Math.max(0, Math.min(total, fallbackRemainingMs));

  return Math.max(0, Math.min(total, total - averageRemaining));
}

export interface AfkSchedulerProfile {
  startedAt: number;
  completedAt: number | null;
  totalRecoveryDurationMs: number;
  recoveredElapsedMs: number;
  activePartyCount: number;
  batches: number;
  cyclePartyOperations: number;
  totalBatchDurationMs: number;
  longestBatchDurationMs: number;
  longestEventLoopDelayMs: number;
  reactCommitCount: number;
  totalReactRenderDurationMs: number;
  longestReactCommitDurationMs: number;
}

export function observeAfkRecoveryBacklog(
  pendingAfkMs: number,
  hasPreviouslyObservedActiveRecovery: boolean,
): AfkRecoveryBacklogObservation {
  if (pendingAfkMs > 0) {
    return {
      hasObservedActiveRecovery: true,
      didCompleteRecovery: false,
    };
  }

  return {
    hasObservedActiveRecovery: false,
    didCompleteRecovery: hasPreviouslyObservedActiveRecovery,
  };
}

export function shouldPauseOnlineProgressForAfk({
  isHydrating,
  pendingAfkMs,
  hasChunkCursor,
  shouldRebuildAfterRecovery,
}: AfkOnlineProgressLockState): boolean {
  return isHydrating
    || pendingAfkMs > 0
    || hasChunkCursor
    || shouldRebuildAfterRecovery;
}

export function getAfkOperationWindow(
  cycleDurationByParty: number[],
  elapsedMs: number,
  operationStart: number,
  operationCount: number,
): AfkCyclePartyOperation[] {
  const runCountByParty = cycleDurationByParty.map((durationMs) => (
    Math.max(0, Math.floor(elapsedMs / Math.max(1, durationMs)))
  ));
  const maximumRunCount = runCountByParty.reduce((maximum, count) => Math.max(maximum, count), 0);
  const start = Math.max(0, Math.floor(operationStart));
  const end = start + Math.max(0, Math.floor(operationCount));
  const operations: AfkCyclePartyOperation[] = [];
  let operationIndex = 0;

  for (let runIndex = 0; runIndex < maximumRunCount && operationIndex < end; runIndex += 1) {
    for (let partyIndex = 0; partyIndex < cycleDurationByParty.length && operationIndex < end; partyIndex += 1) {
      if (runIndex >= (runCountByParty[partyIndex] ?? 0)) continue;
      if (operationIndex >= start) {
        operations.push({
          runIndex,
          partyIndex,
          partyCycleDurationMs: Math.max(1, cycleDurationByParty[partyIndex] ?? 1),
        });
      }
      operationIndex += 1;
    }
  }

  return operations;
}

export function normalizePersistedAfkChunkCursor(
  value: unknown,
  partyCount: number,
): PersistedAfkChunkCursor | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<PersistedAfkChunkCursor>;
  if (!Number.isFinite(raw.elapsedMs) || !Number.isFinite(raw.simulatedEndAt)) return null;
  if (!Number.isFinite(raw.cycleDurationScale) || !Array.isArray(raw.cycleDurationByParty)) return null;
  if (!Number.isFinite(raw.operationCount) || !Number.isFinite(raw.operationCursor)) return null;

  const durations = raw.cycleDurationByParty
    .slice(0, Math.max(0, partyCount))
    .map((duration) => Number.isFinite(duration) ? Math.max(1, Math.floor(Number(duration))) : 1);
  if (durations.length !== partyCount) return null;

  const operationCount = Math.max(0, Math.floor(Number(raw.operationCount)));
  return {
    elapsedMs: Math.max(0, Math.floor(Number(raw.elapsedMs))),
    simulatedEndAt: Number(raw.simulatedEndAt),
    cycleDurationScale: Math.max(0.001, Number(raw.cycleDurationScale)),
    cycleDurationByParty: durations,
    operationCount,
    operationCursor: Math.max(0, Math.min(operationCount, Math.floor(Number(raw.operationCursor)))),
  };
}

export function getAfkBatchBudgetMs(options: {
  isMobile?: boolean;
  hardwareConcurrency?: number;
  saveData?: boolean;
} = {}): number {
  if (options.saveData || (options.hardwareConcurrency ?? 8) <= 2) return CONSTRAINED_BATCH_BUDGET_MS;
  if (options.isMobile || (options.hardwareConcurrency ?? 8) <= 4) return MOBILE_BATCH_BUDGET_MS;
  return DEFAULT_BATCH_BUDGET_MS;
}

export function getAdaptiveAfkOperationCount(
  remainingOperations: number,
  averageOperationDurationMs: number | null,
  batchBudgetMs: number,
): number {
  const remaining = Math.max(0, Math.floor(remainingOperations));
  if (remaining === 0) return 0;
  if (averageOperationDurationMs === null || !Number.isFinite(averageOperationDurationMs)) return 1;
  const safeBudget = Math.max(2, Math.min(MAX_BATCH_BUDGET_MS, batchBudgetMs));
  const conservativeOperationCost = Math.max(0.05, averageOperationDurationMs * 1.25);
  return Math.max(1, Math.min(
    remaining,
    MAX_OPERATIONS_PER_BATCH,
    Math.floor(safeBudget / conservativeOperationCost),
  ));
}

export function createAfkSchedulerProfile(now: number = performance.now()): AfkSchedulerProfile {
  return {
    startedAt: now,
    completedAt: null,
    totalRecoveryDurationMs: 0,
    recoveredElapsedMs: 0,
    activePartyCount: 0,
    batches: 0,
    cyclePartyOperations: 0,
    totalBatchDurationMs: 0,
    longestBatchDurationMs: 0,
    longestEventLoopDelayMs: 0,
    reactCommitCount: 0,
    totalReactRenderDurationMs: 0,
    longestReactCommitDurationMs: 0,
  };
}

export function recordAfkSchedulerBatch(
  profile: AfkSchedulerProfile,
  durationMs: number,
  operationCount: number,
  eventLoopDelayMs: number = 0,
): AfkSchedulerProfile {
  const safeDuration = Math.max(0, durationMs);
  return {
    ...profile,
    batches: profile.batches + 1,
    cyclePartyOperations: profile.cyclePartyOperations + Math.max(0, Math.floor(operationCount)),
    totalBatchDurationMs: profile.totalBatchDurationMs + safeDuration,
    longestBatchDurationMs: Math.max(profile.longestBatchDurationMs, safeDuration),
    longestEventLoopDelayMs: Math.max(profile.longestEventLoopDelayMs, Math.max(0, eventLoopDelayMs)),
  };
}
