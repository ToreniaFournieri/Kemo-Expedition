import type { Party } from '../types/index.ts';
import { executeBattleWithSeed } from './battle.ts';
import type { DeferredExpeditionBattleNarration } from './expeditionPresentation.ts';
import type { ComputedPartyStatus } from './partyComputation.ts';

export interface ReplayDeferredExpeditionNarrationsInput {
  readonly narrations: readonly DeferredExpeditionBattleNarration[];
  readonly party: Party;
  readonly partyStatus: ComputedPartyStatus;
}

/**
 * Reconstruct full narration from result-only battles without touching the
 * gameplay RNG stream. The caller owns the retention decision and invocation
 * timing; this adapter validates and installs only the requested replays.
 */
export function replayDeferredExpeditionNarrations(
  input: ReplayDeferredExpeditionNarrationsInput,
): void {
  for (const deferred of input.narrations) {
    const replay = deferred.entry.replayMetadata;
    if (!replay) throw new Error('Deferred AFK narration is missing replay metadata');
    const replayed = executeBattleWithSeed(
      input.party,
      deferred.enemy,
      deferred.bags,
      BigInt(`0x${replay.seedHex}`),
      replay.rngVersion,
      deferred.initialPartyHp,
      { terrainEffect: deferred.terrainEffect, partyStatus: input.partyStatus },
    );
    if (
      replayed.outcome !== deferred.entry.outcome
      || replayed.partyHp !== deferred.entry.postBattlePartyHP
      || replayed.replayMetadata.randomDrawCount !== replay.randomDrawCount
    ) {
      throw new Error('Deferred AFK narration replay diverged from its result-only battle');
    }
    deferred.entry.details = [...replayed.log, ...deferred.entry.details];
  }
}
