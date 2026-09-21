import { getCanonicalClearGateOutcome } from '../../game/expeditionEffects/expeditionOutcome.ts';
import type { ExpeditionLog } from '../../types/index.ts';

// SpecRef: 6.1.5 | Outcome | Consequence
// SpecRef: 9.1.3 | 2-1-1 compact | latestSimulationResult (Clear / Return / Draw / Retreat / Defeat)
// The runtime and the API share one set of outcome names: Clear, Return, Draw, Retreat, and Defeat. A finished log stores
// `Retreat` for both a draw and a retreat; the game (and so the API) tells them apart by whether the last room was a draw.

export type ApiExpeditionOutcome = ReturnType<typeof getCanonicalClearGateOutcome>;

export function apiExpeditionOutcome(log: Pick<ExpeditionLog, 'finalOutcome' | 'entries'>): ApiExpeditionOutcome {
  return getCanonicalClearGateOutcome(log.finalOutcome, log.entries[log.entries.length - 1]?.outcome === 'draw');
}

export function apiExpeditionOutcomeOrNull(log: Pick<ExpeditionLog, 'finalOutcome' | 'entries'> | null | undefined): ApiExpeditionOutcome | null {
  return log ? apiExpeditionOutcome(log) : null;
}
