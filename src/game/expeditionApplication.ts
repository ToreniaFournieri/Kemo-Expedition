import type {
  DiarySettings,
  Dungeon,
  EnemyDef,
  GameBags,
  GameState,
  InventoryRecord,
  Item,
  Party,
  TerrainEffectKey,
} from '../types/index.ts';
import {
  createExpeditionForecastResolution,
  type RunExpeditionApplicationAuthorities,
  type RunExpeditionApplicationCommand,
  type RunExpeditionApplicationResult,
} from './expeditionApplicationContract.ts';
import { planExpeditionCommit } from './expeditionCommit.ts';
import { completeExpeditionPresentation } from './expeditionCompletion.ts';
import {
  ExpeditionInventoryCoordinator,
  type ExpeditionInventoryInstallationResult,
  type ExpeditionInventoryOverlay,
} from './expeditionInventory.ts';
import { planExpeditionPostService } from './expeditionPostService.ts';
import { prepareExpeditionRun } from './expeditionPreparation.ts';
import type { ExpeditionRewardPresentation } from './expeditionPresentation.ts';
import { runExpeditionService } from './expeditionService.ts';
import { planForecastExpeditionState } from './expeditionStateInstallation.ts';

export interface ExpeditionApplicationAdapters {
  readonly normalizeBags: (bags: Party['bags']) => GameBags;
  readonly getDungeon: (dungeonId: number) => Dungeon | undefined;
  readonly getTerrainOverride: (dungeon: Dungeon) => TerrainEffectKey | undefined;
  readonly isGodsBattleAvailable: (party: Party, dungeonId: number) => boolean;
  readonly installRecoveredItems: (input: {
    readonly recoveredItems: readonly Item[];
    readonly inventory: InventoryRecord;
    readonly gold: number;
    readonly autoSellMultiplier: number;
    readonly mutateInventory: boolean;
  }) => ExpeditionInventoryInstallationResult<ExpeditionRewardPresentation>;
  readonly refillBag: Parameters<typeof runExpeditionService>[0]['refillBag'];
  readonly enemyDefinitions: readonly Pick<EnemyDef, 'id' | 'enemyType'>[];
  readonly getDiarySettings: (settings: Partial<DiarySettings> | undefined) => DiarySettings;
  readonly defaultUnlockedDeities: readonly string[];
  readonly inventoryOverlay?: ExpeditionInventoryOverlay;
  readonly encounterCache?: Map<string, EnemyDef>;
}

export interface RunExpeditionApplicationInput {
  readonly state: GameState;
  readonly command: RunExpeditionApplicationCommand;
  readonly authorities: RunExpeditionApplicationAuthorities;
  readonly adapters: ExpeditionApplicationAdapters;
  readonly attribution?: ExpeditionApplicationAttribution;
}

export interface ExpeditionApplicationAttribution {
  preparationMs: number;
  inventoryCoordinatorMs: number;
  serviceMs: number;
  postServiceMs: number;
  inventoryCompletionMs: number;
  presentationCompletionMs: number;
  commitProjectionMs: number;
  expeditionCount: number;
  expeditionRoomCount: number;
  expeditionRetainedNarrationCount: number;
  expeditionReplayedBattleCount: number;
}

const EXPEDITION_PROFILE_ENABLED = typeof __AFK_LIVE_PROFILE_ENABLED__ !== 'undefined'
  && __AFK_LIVE_PROFILE_ENABLED__;

function beginExpeditionPhase(attribution: ExpeditionApplicationAttribution | undefined): number {
  return EXPEDITION_PROFILE_ENABLED && attribution ? performance.now() : 0;
}

function endExpeditionPhase(
  attribution: ExpeditionApplicationAttribution | undefined,
  phase: keyof ExpeditionApplicationAttribution,
  startedAt: number,
): void {
  if (EXPEDITION_PROFILE_ENABLED && attribution) {
    attribution[phase] += Math.max(0, performance.now() - startedAt);
  }
}

/**
 * Complete application workflow for one expedition command. The caller still
 * owns diagnostics, forecast registration, unchanged identity, and publication.
 */
export function runExpeditionApplication(
  input: RunExpeditionApplicationInput,
): RunExpeditionApplicationResult {
  const { state, command, authorities, adapters } = input;
  const attribution = EXPEDITION_PROFILE_ENABLED ? input.attribution : undefined;
  const currentParty = state.parties[command.partyIndex];
  const preparationStartedAt = beginExpeditionPhase(attribution);
  const preparation = prepareExpeditionRun({
    currentParty,
    global: state.global,
    triggerGodsBattle: command.triggerGodsBattle,
    gameMode: command.gameMode,
    enemyLevelOffset: command.enemyLevelOffset,
    chunkPartyStatus: command.chunkPartyStatus,
    authoritativePartyStatus: command.authoritativePartyStatus,
    normalizeBags: adapters.normalizeBags,
    getDungeon: adapters.getDungeon,
    getTerrainOverride: adapters.getTerrainOverride,
    isGodsBattleAvailable: adapters.isGodsBattleAvailable,
  });
  endExpeditionPhase(attribution, 'preparationMs', preparationStartedAt);
  if (preparation.status === 'dungeon-unavailable') {
    return { kind: 'unchanged', reason: 'dungeon-unavailable' };
  }
  if (preparation.status === 'party-hp-ineligible') {
    return {
      kind: 'unchanged',
      reason: 'party-hp-ineligible',
      statusAuthoritySupplied: preparation.statusAuthoritySupplied,
    };
  }

  const {
    context: expeditionContext,
    dungeon,
    isGodsBattle,
    partyStatus,
    statusAuthoritySupplied,
    statusParty,
    transaction,
  } = preparation;
  const { partyStats } = expeditionContext;
  const rewardContext = expeditionContext.reward;
  const inventoryCoordinatorStartedAt = beginExpeditionPhase(attribution);
  const inventoryCoordinator = new ExpeditionInventoryCoordinator({
    inventory: state.global.inventory,
    gold: state.global.gold,
    ...(adapters.inventoryOverlay ? { overlay: adapters.inventoryOverlay } : {}),
    install: (recoveredItems, inventory, gold, mutateInventory) => (
      adapters.installRecoveredItems({
        recoveredItems,
        inventory,
        gold,
        autoSellMultiplier: rewardContext.autoSellMultiplier,
        mutateInventory,
      })
    ),
  });
  endExpeditionPhase(attribution, 'inventoryCoordinatorMs', inventoryCoordinatorStartedAt);
  const serviceStartedAt = beginExpeditionPhase(attribution);
  const serviceResult = runExpeditionService({
    context: expeditionContext,
    party: currentParty,
    dungeon,
    transaction,
    isGodsBattle,
    random: authorities.random,
    refillBag: adapters.refillBag,
    installRecoveredItems: inventoryCoordinator.installRecoveredItems,
    ...(adapters.encounterCache ? { encounterCache: adapters.encounterCache } : {}),
    ...(command.battleOutputMode === 'result-only'
      ? {
        battleOptions: {
          outputMode: 'result-only' as const,
          compactResultOutput: command.compactBattleResultOutput,
        },
      }
      : {}),
  });
  endExpeditionPhase(attribution, 'serviceMs', serviceStartedAt);
  if (attribution) {
    attribution.expeditionCount += 1;
    attribution.expeditionRoomCount += serviceResult.rooms.length;
  }
  const transactionResult = serviceResult.transaction;
  const { bags } = transactionResult;
  const postServiceStartedAt = beginExpeditionPhase(attribution);
  const {
    finalization,
    presentation: { entries, deferredBattleNarrations },
  } = planExpeditionPostService({
    serviceResult,
    state,
    party: currentParty,
    statusParty,
    dungeon,
    installedGold: inventoryCoordinator.installedGold,
    isGodsBattle,
    maxPartyHp: partyStats.hp,
    enemyDefinitions: adapters.enemyDefinitions,
    deferBattleNarration: command.isAfkSimulation === true
      && command.battleOutputMode === 'result-only',
  });
  endExpeditionPhase(attribution, 'postServiceMs', postServiceStartedAt);
  const inventoryCompletionStartedAt = beginExpeditionPhase(attribution);
  const { inventory: finalInventory } = inventoryCoordinator.complete(
    finalization.shouldRollbackInventory,
  );
  endExpeditionPhase(attribution, 'inventoryCompletionMs', inventoryCompletionStartedAt);
  const finalGold = finalization.gold;
  const presentationStartedAt = beginExpeditionPhase(attribution);
  const { log, diaryTriggers } = completeExpeditionPresentation({
    dungeon,
    difficultyOffset: expeditionContext.difficulty.offset,
    entries,
    transaction: transactionResult,
    finalization,
    maxPartyHp: partyStats.hp,
    autoSellMultiplier: rewardContext.autoSellMultiplier,
    diarySettings: adapters.getDiarySettings(currentParty.diarySettings),
    isGodsBattle,
    deferredBattleNarrations,
    party: statusParty,
    partyStatus,
  });
  endExpeditionPhase(attribution, 'presentationCompletionMs', presentationStartedAt);
  if (attribution && (diaryTriggers.length > 0 || finalization.requiresUnlockNarration)) {
    attribution.expeditionRetainedNarrationCount += 1;
    attribution.expeditionReplayedBattleCount += deferredBattleNarrations.length;
  }

  if (command.resolutionMode === 'forecast') {
    if (diaryTriggers.length > 0) authorities.random();
    const forecastState = planForecastExpeditionState({
      state,
      partyIndex: command.partyIndex,
      party: currentParty,
      bags,
      finalPartyHp: log.remainingPartyHP,
    });
    return {
      kind: 'forecast',
      state: forecastState,
      resolution: createExpeditionForecastResolution(log),
      statusAuthoritySupplied,
    };
  }

  const diaryCreatedAt = command.simulatedAt ?? authorities.getCommittedAt();
  const diaryIdToken = diaryTriggers.length > 0
    ? authorities.random().toString(36).slice(2, 8)
    : null;
  const commitStartedAt = beginExpeditionPhase(attribution);
  const projection = planExpeditionCommit({
    state,
    partyIndex: command.partyIndex,
    party: currentParty,
    bags,
    log,
    diaryTriggers,
    diaryCreatedAt,
    diaryIdToken,
    inventory: finalInventory,
    gold: finalGold,
    transaction: transactionResult,
    finalization,
    defaultUnlockedDeities: adapters.defaultUnlockedDeities,
  });
  endExpeditionPhase(attribution, 'commitProjectionMs', commitStartedAt);

  return { kind: 'committed', projection, statusAuthoritySupplied };
}
