import type { Party } from '../types';
import type { AfkChunkPlan } from './afkSchedulerCore';
import { getPartyCycleDurationMs, type PartyCycleDurationOptions } from './partyCycleDuration';
export * from './afkSchedulerCore';

// SpecRef: 5.1 | Time-Based Progress Handling | catch-up resolves the Cycle's actual state transitions.
// A catch-up Cycle costs what the online Cycle would: every state's own duration and modifiers (Spec 5.1.1).
export function getApproxAfkCycleDurationMs(party: Party, cycleDurationScale: number, options?: PartyCycleDurationOptions): number {
  return getPartyCycleDurationMs(party, cycleDurationScale, options);
}

export function createAfkChunkPlan(
  parties: Party[],
  elapsedMs: number,
  simulatedEndAt: number,
  cycleDurationScale: number,
): AfkChunkPlan {
  const normalizedElapsedMs = Math.max(0, Math.floor(elapsedMs));
  const normalizedScale = Math.max(0.001, cycleDurationScale);
  const cycleDurationByParty = parties.map((party) => getApproxAfkCycleDurationMs(party, normalizedScale));
  const operationCount = cycleDurationByParty.reduce((total, durationMs) => (
    total + Math.max(0, Math.floor(normalizedElapsedMs / durationMs))
  ), 0);

  return {
    elapsedMs: normalizedElapsedMs,
    simulatedEndAt,
    cycleDurationScale: normalizedScale,
    cycleDurationByParty,
    operationCount,
  };
}
