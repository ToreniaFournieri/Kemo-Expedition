import type { RuntimeGameMode } from './runtimeGameMode.ts';
import type {
  EnemyDef,
  ExpeditionLog,
  ExpeditionLogEntry,
  GameState,
  Item,
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
  readonly gameMode?: RuntimeGameMode;
  readonly enemyLevelOffset?: number;
  readonly triggerGodsBattle?: boolean;
  readonly isAfkSimulation?: boolean;
  readonly chunkPartyStatus?: ExpeditionPartyStatusAuthority;
  readonly authoritativePartyStatus?: ExpeditionPartyStatusAuthority;
  readonly battleOutputMode?: 'full' | 'result-only';
  readonly compactBattleResultOutput?: boolean;
  readonly resolutionMode?: ExpeditionResolutionMode;
  /**
   * Encounter cache shared across repeated forecasts of one party (Simulation Run),
   * so their battles reuse enemy objects and prepared battle inputs.
   */
  readonly forecastEncounterCache?: Map<string, EnemyDef>;
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
  /** Damage the party dealt and the enemy's maximum HP, for the boss-damage share of the GA search (Spec 9.1.3, 2-3-2). */
  readonly damageDealt: number;
  readonly enemyHp: number;
  readonly isBoss: boolean;
}

export interface ExpeditionForecastResolution {
  readonly outcome: ExpeditionLog['finalOutcome'];
  readonly completedRooms: number;
  readonly finalHp: number;
  readonly terminalBattleOutcome: ExpeditionLogEntry['outcome'] | null;
  readonly battleDiagnostics: ExpeditionForecastBattleDiagnostic[];
  /** The run stopped at a closed Clear-Gate: the last entry is the gate's own row, a room the party never entered. */
  readonly endedAtGate: boolean;
  /** Party EXP the run awards (every outcome awards it). */
  readonly experience: number;
  /** Items kept (a Defeat keeps none), and the items auto-sold with their Gold. */
  readonly rewards: readonly Item[];
  readonly autoSellMultiplier: number;
  readonly autoSellCount: number;
  readonly autoSellProfit: number;
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
  const lastEntry = log.entries[log.entries.length - 1];
  return {
    outcome: log.finalOutcome,
    completedRooms: log.completedRooms,
    finalHp: log.remainingPartyHP,
    terminalBattleOutcome: log.entries[log.entries.length - 1]?.outcome ?? null,
    endedAtGate: lastEntry?.gateInfo !== undefined && lastEntry.enemyId === undefined,
    battleDiagnostics: log.entries.map((entry) => ({
      enemyId: entry.enemyId,
      outcome: entry.outcome,
      remainingPartyHP: entry.remainingPartyHP,
      replayMetadata: entry.replayMetadata,
      damageDealt: entry.damageDealt,
      enemyHp: entry.enemyHP,
      isBoss: entry.roomType === 'battle_Boss',
    })),
    experience: log.totalExperience,
    rewards: [...log.rewards],
    autoSellMultiplier: log.autoSellMultiplier ?? 1,
    autoSellCount: log.autoSellCount,
    autoSellProfit: log.autoSellProfit,
  };
}
