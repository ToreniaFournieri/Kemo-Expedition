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
}

/**
 * Complete application workflow for one expedition command. The caller still
 * owns diagnostics, forecast registration, unchanged identity, and publication.
 */
export function runExpeditionApplication(
  input: RunExpeditionApplicationInput,
): RunExpeditionApplicationResult {
  const { state, command, authorities, adapters } = input;
  const currentParty = state.parties[command.partyIndex];
  const preparation = prepareExpeditionRun({
    currentParty,
    global: state.global,
    triggerGodsBattle: command.triggerGodsBattle,
    chunkPartyStatus: command.chunkPartyStatus,
    authoritativePartyStatus: command.authoritativePartyStatus,
    normalizeBags: adapters.normalizeBags,
    getDungeon: adapters.getDungeon,
    getTerrainOverride: adapters.getTerrainOverride,
    isGodsBattleAvailable: adapters.isGodsBattleAvailable,
  });
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
  const transactionResult = serviceResult.transaction;
  const { bags } = transactionResult;
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
  const { inventory: finalInventory } = inventoryCoordinator.complete(
    finalization.shouldRollbackInventory,
  );
  const finalGold = finalization.gold;
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

  return { kind: 'committed', projection, statusAuthoritySupplied };
}
