import type { Item } from '../../types/index.ts';
import {
  addRecoveredBossRaresToGodsBattleProgress,
  applyClearGateOutcome,
  getGodsBattleProgressKey,
  isClearGateUnlocked,
  type ClearGateOutcome,
} from '../clearGateCore.ts';

export type RuntimeExpeditionOutcome = 'Clear' | 'Escape' | 'Defeat' | 'Retreat';

export interface ResolveExpeditionOutcomeInput {
  readonly finalOutcome: RuntimeExpeditionOutcome;
  readonly endedWithDrawRetreat: boolean;
  readonly isGodsBattle: boolean;
  readonly dungeonId: number;
  readonly recoveredItems: readonly Item[];
  readonly clearGateProgress: Readonly<Record<string, number>>;
  readonly clearGateStatus: Readonly<Record<number, boolean>>;
  readonly defeatedBossExpeditions: Readonly<Record<number, boolean>>;
}

export interface ExpeditionOutcomeResult {
  readonly canonicalGateOutcome: ClearGateOutcome;
  readonly clearGateProgress: Record<string, number>;
  readonly clearGateStatus: Record<number, boolean>;
  readonly defeatedBossExpeditions: Record<number, boolean>;
  readonly evaluatedGateKey: number | null;
  readonly newlyUnlockedGateKey: number | null;
}

export function getCanonicalClearGateOutcome(
  finalOutcome: RuntimeExpeditionOutcome,
  endedWithDrawRetreat: boolean,
): ClearGateOutcome {
  if (finalOutcome === 'Clear') return 'Clear';
  if (finalOutcome === 'Escape') return 'Turned_Back';
  if (finalOutcome === 'Defeat') return 'Defeat';
  return endedWithDrawRetreat ? 'Draw_Retreat' : 'Wounded_Retreat';
}

export function resolveExpeditionOutcome(input: ResolveExpeditionOutcomeInput): ExpeditionOutcomeResult {
  const canonicalGateOutcome = getCanonicalClearGateOutcome(
    input.finalOutcome,
    input.endedWithDrawRetreat,
  );
  const progressWithRecoveredBossRares = input.finalOutcome === 'Defeat'
    ? { ...input.clearGateProgress }
    : addRecoveredBossRaresToGodsBattleProgress(
        input.clearGateProgress,
        input.dungeonId,
        input.recoveredItems,
      );

  const gateOutcome = input.isGodsBattle
    ? {
        progress: progressWithRecoveredBossRares,
        status: { ...input.clearGateStatus },
        gateKey: null,
      }
    : applyClearGateOutcome(
        {
          clearGateProgress: progressWithRecoveredBossRares,
          clearGateStatus: { ...input.clearGateStatus },
        },
        input.dungeonId,
        canonicalGateOutcome,
      );

  const clearGateProgress = { ...gateOutcome.progress };
  if (input.isGodsBattle && input.finalOutcome === 'Clear') {
    clearGateProgress[getGodsBattleProgressKey(input.dungeonId)] = 0;
  }

  const defeatedBossExpeditions = { ...input.defeatedBossExpeditions };
  if (!input.isGodsBattle && input.finalOutcome === 'Clear') {
    defeatedBossExpeditions[input.dungeonId] = true;
  }

  const evaluatedGateKey = gateOutcome.gateKey;
  const newlyUnlockedGateKey = evaluatedGateKey !== null
    && !isClearGateUnlocked(
      { clearGateProgress: input.clearGateProgress, clearGateStatus: input.clearGateStatus },
      evaluatedGateKey,
    )
    && isClearGateUnlocked(
      { clearGateProgress, clearGateStatus: gateOutcome.status },
      evaluatedGateKey,
    )
    ? evaluatedGateKey
    : null;

  return {
    canonicalGateOutcome,
    clearGateProgress,
    clearGateStatus: gateOutcome.status,
    defeatedBossExpeditions,
    evaluatedGateKey,
    newlyUnlockedGateKey,
  };
}
