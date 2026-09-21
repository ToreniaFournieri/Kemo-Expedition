import { getCanonicalClearGateOutcome } from '../../game/expeditionEffects/expeditionOutcome.ts';
import type { ExpeditionLog } from '../../types/index.ts';

// SpecRef: 6.1.5 | Outcome | Consequence
// SpecRef: 9.1.3 | 2-1-1 compact | latestSimulationResult (Clear / Return / Draw / Retreat / Defeat)
// The public wording of an expedition outcome. The runtime keeps its own stored names (`Escape`, `Retreat`) and the
// canonical Clear-Gate names (`Turned_Back`, `Draw_Retreat`, `Wounded_Retreat`); the API speaks only Clear, Return, Draw,
// Retreat, and Defeat, as the Simulation Run and the compact observation do.

export type ApiExpeditionOutcome = 'Clear' | 'Return' | 'Draw' | 'Retreat' | 'Defeat';

const BY_CANONICAL = {
  Clear: 'Clear', Turned_Back: 'Return', Draw_Retreat: 'Draw', Wounded_Retreat: 'Retreat', Defeat: 'Defeat',
} as const satisfies Record<ReturnType<typeof getCanonicalClearGateOutcome>, ApiExpeditionOutcome>;

/** The outcome of a finished expedition; a stored `Retreat` is a Draw when its last room ended in a draw, as in the game. */
export function apiExpeditionOutcome(log: Pick<ExpeditionLog, 'finalOutcome' | 'entries'>): ApiExpeditionOutcome {
  const endedWithDraw = log.entries[log.entries.length - 1]?.outcome === 'draw';
  return BY_CANONICAL[getCanonicalClearGateOutcome(log.finalOutcome, endedWithDraw)];
}

export function apiExpeditionOutcomeOrNull(log: Pick<ExpeditionLog, 'finalOutcome' | 'entries'> | null | undefined): ApiExpeditionOutcome | null {
  return log ? apiExpeditionOutcome(log) : null;
}
