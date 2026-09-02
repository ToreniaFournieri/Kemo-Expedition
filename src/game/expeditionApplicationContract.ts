import type { GameMode } from '../theme/theme.ts';
import type {
  ExpeditionLog,
  ExpeditionLogEntry,
  GameState,
  Party,
} from '../types/index.ts';
import type { CommittedExpeditionStateProjection } from './expeditionStateInstallation.ts';
import type { ComputedPartyStatus } from './partyComputation.ts';

export type ExpeditionResolutionMode = 'full' | 'forecast';

export interface ExpeditionPartyStatusAuthority {
  readonly party: Party;
  readonly computed: ComputedPartyStatus;
}

/** Stable command data shared by online, AFK, forecast, and API callers. */
export interface RunExpeditionApplicationCommand {
  readonly partyIndex: number;
  readonly simulatedAt?: number;
  readonly gameMode?: GameMode;
  readonly triggerGodsBattle?: boolean;
  readonly isAfkSimulation?: boolean;
  readonly chunkPartyStatus?: ExpeditionPartyStatusAuthority;
  readonly authoritativePartyStatus?: ExpeditionPartyStatusAuthority;
  readonly battleOutputMode?: 'full' | 'result-only';
  readonly compactBattleResultOutput?: boolean;
  readonly resolutionMode?: ExpeditionResolutionMode;
}

/** Explicit caller-owned authorities for a future application command runner. */
export interface RunExpeditionApplicationAuthorities {
  readonly random: () => number;
  readonly getCommittedAt: () => number;
}

export interface ExpeditionForecastBattleDiagnostic {
  readonly enemyId: number | undefined;
  readonly outcome: ExpeditionLogEntry['outcome'];
  readonly remainingPartyHP: number;
  readonly replayMetadata: ExpeditionLogEntry['replayMetadata'];
}

export interface ExpeditionForecastResolution {
  readonly outcome: ExpeditionLog['finalOutcome'];
  readonly completedRooms: number;
  readonly finalHp: number;
  readonly terminalBattleOutcome: ExpeditionLogEntry['outcome'] | null;
  readonly battleDiagnostics: ExpeditionForecastBattleDiagnostic[];
}

/**
 * Result data deliberately excludes diagnostic recording, forecast registry
 * mutation, and reducer publication so those authorities cannot become hidden.
 */
export type RunExpeditionApplicationResult =
  | {
      readonly kind: 'unchanged';
      readonly reason: 'dungeon-unavailable';
    }
  | {
      readonly kind: 'unchanged';
      readonly reason: 'party-hp-ineligible';
      readonly statusAuthoritySupplied: boolean;
    }
  | {
      readonly kind: 'forecast';
      readonly state: GameState;
      readonly resolution: ExpeditionForecastResolution;
      readonly statusAuthoritySupplied: boolean;
    }
  | {
      readonly kind: 'committed';
      readonly projection: CommittedExpeditionStateProjection;
      readonly statusAuthoritySupplied: boolean;
    };

/** Pure projection used by forecast registration and full/forecast parity tests. */
export function createExpeditionForecastResolution(
  log: ExpeditionLog,
): ExpeditionForecastResolution {
  return {
    outcome: log.finalOutcome,
    completedRooms: log.completedRooms,
    finalHp: log.remainingPartyHP,
    terminalBattleOutcome: log.entries[log.entries.length - 1]?.outcome ?? null,
    battleDiagnostics: log.entries.map((entry) => ({
      enemyId: entry.enemyId,
      outcome: entry.outcome,
      remainingPartyHP: entry.remainingPartyHP,
      replayMetadata: entry.replayMetadata,
    })),
  };
}
