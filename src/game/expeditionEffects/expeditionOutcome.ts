import type { Item } from '../../types/index.ts';
import {
  addRecoveredBossRaresToGodsBattleProgress,
  applyClearGateOutcome,
  getGodsBattleProgressKey,
  isClearGateUnlocked,
  type ClearGateOutcome,
} from '../clearGateCore.ts';

export type RuntimeExpeditionOutcome = 'Clear' | 'Return' | 'Defeat' | 'Retreat';

export interface ResolveExpeditionOutcomeInput {
  readonly finalOutcome: RuntimeExpeditionOutcome;
  readonly endedWithDrawRetreat: boolean;
  readonly deepestClearedPosition: number;
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
  if (finalOutcome === 'Return') return 'Return';
  if (finalOutcome === 'Defeat') return 'Defeat';
  return endedWithDrawRetreat ? 'Draw' : 'Retreat';
}

export function resolveExpeditionOutcome(input: ResolveExpeditionOutcomeInput): ExpeditionOutcomeResult {
  const canonicalGateOutcome = getCanonicalClearGateOutcome(
    input.finalOutcome,
    input.endedWithDrawRetreat,
  );
  // SpecRef: 8.3 | Gods Battle | Boss Rare items count only after the dungeon boss has been defeated at least once
  // (before this run, or by this run's Clear; a Gods Battle implies it); earlier Elite-room Boss Rares do not count.
  const bossDefeated = input.isGodsBattle
    || input.finalOutcome === 'Clear'
    || input.defeatedBossExpeditions[input.dungeonId] === true;
  const progressWithRecoveredBossRares = input.finalOutcome === 'Defeat' || !bossDefeated
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
        input.deepestClearedPosition,
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
