import { lazy,Profiler,Suspense,useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { CLASSES } from '../data/classes';
import { DEVELOPER_NEWS_ITEMS } from '../data/developerNews';
import { shouldMarkDeveloperNewsReadOnPaneChange } from '../game/developerNewsReadState';
import {
DUNGEONS,
getLocalizedExpeditionFloorConcept
} from '../data/dungeons';
import { getSuperRareBonuses,ITEMS } from '../data/items';
import { LINEAGES } from '../data/lineages';
import { PREDISPOSITIONS } from '../data/predispositions';
import { RACES } from '../data/races';
import { computeCharacterStats } from '../game/characterComputation';
import {
selectBestAutoEquipmentFillCandidate,
selectBestAutoEquipmentUpgradeCandidate,
type EquipmentRankingCandidate,
} from '../game/battleKernel';
import { gameplayRandom } from '../game/gameplayRandom';
import {
isDungeonEntryUnlocked
} from '../game/clearGate';
import { DebugSettings,getDebugSettings,getTimeSpeedScale,isUnlimitedTimeSpeed,saveDebugSettings } from '../game/debugSettings';
import { getDeityDepositMultiplier,getDeityKey,getDeityStateDurationMultiplier,isNoFaithDeity,normalizeDeityName } from '../game/deity';
import { getDesktopNotificationRewardItems } from '../game/desktopNotificationRewards';
import { getDesktopPreferences,getProcessedDiaryIds,saveProcessedDiaryIds } from '../game/desktopNotifications';
import {
createAfkSchedulerProfile,
AFK_MAX_EFFECTIVE_ELAPSED_MS,
getEffectiveAfkElapsedMs,
getApproxAfkCycleDurationMs,
observeAfkRecoveryBacklog,
recordAfkSchedulerBatch,
shouldPauseOnlineProgressForAfk,
type AfkSchedulerProfile,
type PersistedAfkChunkCursor,
} from '../game/afkScheduler';
import {
AFK_CHUNK_CYCLE_COUNT,
compareAfkChunkResults,
getAfkWorkerPoolLimit,
hasPendingPartySettingChanges,
type AfkPartyChunkJob,
type AfkPartyChunkResult,
} from '../game/afkChunkCoordinator';
import { recordAfkWorkerJobTelemetry,terminateAfkWorkers } from '../game/afkWorkerTelemetry';
import { AFK_TRACE_WATCHDOG_INTERVAL_MS,afkRuntimeTrace } from '../game/afkRuntimeTrace';
import { getDifficultyOffsetMax } from '../game/difficultyOffset';
import { createEnvironmentStorageKey,getEnvironmentId,getEnvLabel,isDebugModeEnabled } from '../game/environment';
import { buildExperimentalObservation,deityNameFromId,getDeityAssignmentConflict,getUnlockedDeityKeys,outcomeFromParty } from '../game/experimentalApi';
import { isExperimentalApiCommandType } from '../game/experimentalApiContracts';
import { buildExperimentalBattleLog,buildExperimentalDiaryEntries } from '../game/experimentalApiLogs';
import { getItemCoreConceptValue,getItemDisplayName,getLocalizedItemName } from '../game/gameState';
import { memoryMonitor } from '../game/memoryMonitoring';
import { formatInstantExpeditionChargeDisplay,getInstantExpeditionChargeState } from '../game/instantExpedition';
import { JEWELS_BY_ITEM_CATEGORY,planAutoJewelAssignmentsForCharacter } from '../game/jewel';
import { computePartyStats } from '../game/partyComputation';
import { getXpToNextLevel } from '../game/partyLevel';
import { getFreeActionStepCount } from '../game/partyStateDuration';
import { getShopHourKey,getShopRefreshPrice } from '../game/shop';
import { setLanguage,t } from '../i18n';
import { Bonus,Character,ExpeditionDepthLimit,ExpeditionLogEntry,GameState,getVariantKey,InventoryRecord,Item,ItemCategory,JewelKey,Party,type BattleLogEntry } from '../types';
import { NotificationToast } from './NotificationToast';


import {
AFK_MAX_ELAPSED_MS,
AFK_RUNTIME_STORAGE_KEY,
AfkSummaryStats,
APP_VERSION,
APPROX_CYCLE_STEP_COUNT,
AUTO_EQUIPMENT_PRIORITY_BY_CLASS,
AUTO_EQUIPMENT_STORAGE_KEY,
AutoEquipmentCombatStyle,
AutoEquipmentRunner,
AutoEquipmentRunSummary,
AutoEquipmentTargetCategory,
BASE_STEP_DURATION_MS,
BaseSubTab,
BETA_DISCORD_WEBHOOK_URL,
buildAfkSummaryNotification,
buildStatusTableHtmlFile,
buildStatusTableRows,
CHROME_CONTENT_PADDING_CLASS,
DARK_MODE_STORAGE_KEY,
DarkModeSetting,
DEV_DISCORD_WEBHOOK_URL,
escapeExportHtml,
EXPEDITION_STATS_DISPLAY_STORAGE_KEY,
EXPLORING_PROGRESS_TOTAL_STEPS,
formatBattleLogHitDisplay,
formatDecimal,
formatNumber,
GAME_MODE_STORAGE_KEY,
GameMode,
getAutoSellStepCount,
getCharacterCategoryMultiplier,
getCompactProgressItems,
getElapsedWholeSeconds,
getExpeditionOutcomeLabel,
getExpeditionTierDurationFactor,
getExperimentalDiaryTitle,
getExplorationDurationMs,
getExplorationVisibleRoomCount,
getInitialAutoEquipmentEnabled,
getInitialDarkModeSetting,
getInitialGameMode,
getNextPartyCycleCheckpointDelay,
getItemRarityById,
getNextMissingAutoEquipmentCategory,
getPartyCycleStateLabel,
getRestInitialTotalSteps,
getScaledSideQuestExpiresAt,
getSideQuestAssignMessage,
getSideQuestSuccessMessage,
hasActiveNonGodBattleClearGateCondition,
HomeScreenProps,
IOS_GLASS_BUTTON_CLASS,
IOS_GLASS_TOP_TAB_CLASS,
MAIN_TAB_ORDER,
normalizeAutoEquipmentMode,
normalizeRuntimeSnapshot,
PARTY_CYCLE_TICK_MS,
PARTY_EXPEDITION_SPLIT_MIN_WIDTH,
PartyCycleRuntime,
PartyCycleState,
PersistedRuntimeSnapshot,
PRAY_STEP_COUNT,
preloadRaceIcons,
PROD_DISCORD_WEBHOOK_URL,
REDUCER_CATCHUP_THRESHOLD_MS,
resolveSideQuestShortText,
REST_HEAL_MAX_HP_RATIO,
REST_HEAL_MIN_HP,
rollPercentInclusive,
shouldAutoTriggerGodsBattle,
SOUND_SLEEP_STEP_COUNT,
SPEED_OF_TIME_BONUS_DURATION_MS,
SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY,
STEP_BASED_STATES,
Tab,
TAB_PANEL_WIDTH_PX,
THEME_SYNC_EVENT,
WIDE_MODE_DEFAULT_SECONDARY_TAB,
WideModeSecondaryTab
} from './home/homeShared';

const loadPartyTab = () => import('./home/tabs/PartyTab');
const loadExpeditionTab = () => import('./home/tabs/ExpeditionTab');
const loadBaseTab = () => import('./home/tabs/BaseTab');
const loadDiaryTab = () => import('./home/tabs/DiaryTab');
const loadSettingTab = () => import('./home/tabs/SettingTab');

const PartyTab = lazy(loadPartyTab);
const ExpeditionTab = lazy(loadExpeditionTab);
const BaseTab = lazy(loadBaseTab);
const DiaryTab = lazy(loadDiaryTab);
const SettingTab = lazy(loadSettingTab);

/** Load the initial tab behind the startup screen. */
export function preloadInitialHomeTab() {
  return loadExpeditionTab();
}

/** Fill the browser cache for inactive tabs after the first UI is interactive. */
export function preloadRemainingHomeTabs() {
  return Promise.all([
    loadPartyTab(),
    loadBaseTab(),
    loadDiaryTab(),
    loadSettingTab(),
  ]);
}

export function HomeScreen({
  state,
  actions,
  notifications,
  onDismissNotification,
  onDismissAllNotifications,
}: HomeScreenProps) {
  const renderStartedAt = performance.now();
  const prefersDocumentScroll = false;
  const [activeTab, setActiveTab] = useState<Tab>('expedition');
  const [tabTransitionDirection, setTabTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const [activeWideModeSecondaryTab, setActiveWideModeSecondaryTab] = useState<WideModeSecondaryTab>(WIDE_MODE_DEFAULT_SECONDARY_TAB);
  const [activeBaseSubTab, setActiveBaseSubTab] = useState<BaseSubTab>('shop');
  const [selectedCharacter, setSelectedCharacter] = useState<number>(0);
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);
  const [isAutoRepeatEnabled, setIsAutoRepeatEnabled] = useState(true);
  const [isExpeditionStatsDisplayEnabled, setIsExpeditionStatsDisplayEnabled] = useState(false);
  const [isPartyExpeditionSplitViewEnabled, setIsPartyExpeditionSplitViewEnabled] = useState(
    () => window.innerWidth >= PARTY_EXPEDITION_SPLIT_MIN_WIDTH,
  );
  const [partyCycles, setPartyCycles] = useState<Record<number, PartyCycleRuntime>>({});
  const [expeditionExpandedLogParty, setExpeditionExpandedLogParty] = useState<number | null>(null);
  const [expeditionExpandedRoom, setExpeditionExpandedRoom] = useState<{ partyIndex: number; roomIndex: number; latestRoomToken: string } | null>(null);
  const [diaryExpandedLogs, setDiaryExpandedLogs] = useState<Record<string, boolean>>({});
  const [diaryExpandedRooms, setDiaryExpandedRooms] = useState<Record<string, boolean>>({});
  const [diarySettingsExpanded, setDiarySettingsExpanded] = useState(false);
  const [selectedBestiaryDungeonId, setSelectedBestiaryDungeonId] = useState<number>(1);
  const [expandedBestiaryEnemies, setExpandedBestiaryEnemies] = useState<Record<number, boolean>>({});
  const [bestiaryScrollTop, setBestiaryScrollTop] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>(() => getInitialGameMode());
  const [darkModeSetting, setDarkModeSetting] = useState<DarkModeSetting>(() => getInitialDarkModeSetting());
  const [isSystemDarkMode, setIsSystemDarkMode] = useState(false);
  const [debugSettings, setDebugSettings] = useState<DebugSettings>(() => getDebugSettings());
  const [isAutoEquipmentEnabled] = useState<boolean>(() => getInitialAutoEquipmentEnabled());
  const tabScrollPositionsRef = useRef<Partial<Record<Tab, number>>>({});
  const tabContentRef = useRef<HTMLDivElement | null>(null);
  const primarySplitTabContentRef = useRef<HTMLDivElement | null>(null);
  const secondarySplitTabContentRef = useRef<HTMLDivElement | null>(null);
  const primaryNavPointerStartRef = useRef<{ x: number; y: number; tab: Tab } | null>(null);
  const primaryNavSwipeHandledRef = useRef(false);

  const safeSelectedPartyIndex = useMemo(() => {
    if (state.parties.length === 0) return 0;
    return Math.min(Math.max(state.selectedPartyIndex, 0), state.parties.length - 1);
  }, [state.parties.length, state.selectedPartyIndex]);
  const currentParty = state.parties[safeSelectedPartyIndex] ?? state.parties[0];
  const prevPartyLogsRef = useRef(state.parties.map((party) => party.lastExpeditionLog));
  const prevPartyLevelsRef = useRef(state.parties.map((party) => party.level));
  const prevPartyCountRef = useRef(state.parties.length);
  const prevShopPurchasesRef = useRef(state.global.shopPurchases);
  const prevInventoryRef = useRef(state.global.inventory);
  const notifiedRewardLogRef = useRef<Array<Party['lastExpeditionLog'] | null>>(state.parties.map(() => null));
  const instantSortieRewardNotificationPendingRef = useRef<boolean[]>(state.parties.map(() => false));
  const prevPartyCycleStateRef = useRef<Array<PartyCycleState | null>>(state.parties.map(() => null));
  const prevSideQuestRef = useRef(state.parties.map((party) => party.sideQuest));
  const hasHydratedAfkRef = useRef(false);
  const pendingAfkSimulationRef = useRef(true);
  const lastCheckpointAtRef = useRef(Date.now());
  const latestPartiesRef = useRef(state.parties);
  const autoRepeatEnabledRef = useRef(isAutoRepeatEnabled);
  const autoEquipmentEnabledRef = useRef(isAutoEquipmentEnabled);
  const gameModeRef = useRef(gameMode);
  const [pendingAfkMs, setPendingAfkMs] = useState(0);
  const [afkInteractionPauseVersion, setAfkInteractionPauseVersion] = useState(0);

  const pendingAfkMsRef = useRef(0);
  const afkInteractionPausedRef = useRef(false);
  const afkInteractionPauseTimerRef = useRef<number | null>(null);
  const afkInteractionPauseStartedAtRef = useRef<number | null>(null);
  const afkSimulationAnchorRef = useRef<number | null>(null);
  const afkRecoveryTotalMsRef = useRef(0);
  const afkRecoveryCompletedMsRef = useRef(0);
  const afkChunkCursorRef = useRef<PersistedAfkChunkCursor | null>(null);
  const afkRemainingMsByPartyRef = useRef<Record<number, number>>({});
  const afkActiveChunkJobsRef = useRef(new Map<number, {
    job: Omit<AfkPartyChunkJob, 'baseState'>;
    worker: Worker | null;
    status: 'queued' | 'running' | 'completed';
    startedMonotonicAt: number;
  }>());
  const afkWorkerPoolRef = useRef<Array<{ worker: Worker; jobId: string | null; createdAt: number; completedJobs: number }>>([]);
  const afkCompletedChunkResultsRef = useRef(new Map<string, AfkPartyChunkResult>());
  const afkActiveCommitTransactionRef = useRef<{
    result: AfkPartyChunkResult;
    capturedSettingChanges: boolean;
    startedAt: number;
  } | null>(null);
  const afkWorkerJobSequenceRef = useRef(0);
  const afkHeadOfLineWaitRef = useRef<{ blockerJobId: string; startedAt: number } | null>(null);
  const renderCommitDurationsRef = useRef<number[]>([]);
  const [afkCoordinatorVersion, setAfkCoordinatorVersion] = useState(0);
  const memoryPreviousAfkActiveRef = useRef(false);
  const memoryOnlineStartedRef = useRef(false);
  const afkAverageOperationDurationMsRef = useRef<number | null>(null);
  const afkSchedulerProfileRef = useRef<AfkSchedulerProfile | null>(null);
  const afkBatchMeasurementRef = useRef<{
    startedAt: number;
    scheduledAt: number;
    operationCount: number;
  } | null>(null);
  const afkLastBatchCommittedAtRef = useRef(0);
  const previousPendingAfkMsRef = useRef(0);
  const justCompletedAfkRecoveryRef = useRef(false);
  const hasObservedActiveAfkRecoveryRef = useRef(false);
  const shouldRebuildPartyCyclesAfterAfkRef = useRef(false);
  const processedNativeDiaryIdsRef = useRef<Set<string> | null>(null);
  const nativeAfkRecoveryRef = useRef(false);
  const lastPartyProgressSnapshotHashRef = useRef('');

  useEffect(() => {
    const commits = renderCommitDurationsRef.current;
    commits.push(Math.max(0, performance.now() - renderStartedAt));
    if (commits.length > 240) commits.splice(0, commits.length - 240);
    const ordered = [...commits].sort((left, right) => left - right);
    (window as Window & { __BOKEMO_RENDER_PROFILE__?: { commitCount: number; p95CommitDurationMs: number; longestCommitDurationMs: number } })
      .__BOKEMO_RENDER_PROFILE__ = {
        commitCount: commits.length,
        p95CommitDurationMs: ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * 0.95))] ?? 0,
        longestCommitDurationMs: ordered[ordered.length - 1] ?? 0,
      };
  });
  const partyProgressDisclosedLogsRef = useRef<Array<Party['lastExpeditionLog'] | null>>(
    state.parties.map((party) => party.lastExpeditionLog),
  );
  const [apiControlActive, setApiControlActive] = useState(false);

  useEffect(() => {
    if (!afkRuntimeTrace.isEnabled()) return;
    let expectedAt = performance.now() + AFK_TRACE_WATCHDOG_INTERVAL_MS;
    const watchdogId = window.setInterval(() => {
      afkRuntimeTrace.checkWatchdog(expectedAt);
      expectedAt = performance.now() + AFK_TRACE_WATCHDOG_INTERVAL_MS;
    }, AFK_TRACE_WATCHDOG_INTERVAL_MS);
    const recordVisibility = () => {
      if (!afkRuntimeTrace.isRecoveryActive()) return;
      afkRuntimeTrace.record('visibility_change', {
        data: { visibility: document.visibilityState },
      });
    };
    document.addEventListener('visibilitychange', recordVisibility);
    return () => {
      window.clearInterval(watchdogId);
      document.removeEventListener('visibilitychange', recordVisibility);
    };
  }, []);
  const apiControlActiveRef = useRef(false);
  const apiRevisionRef = useRef(0);
  const apiSimulatedAtRef = useRef(Date.now());
  const apiStateRef = useRef(state);
  const apiStateVersionRef = useRef(0);
  const apiActionsRef = useRef(actions);
  const apiAutoEquipmentRunnerRef = useRef<AutoEquipmentRunner | null>(null);
  const apiAutoRunRef = useRef(isAutoRepeatEnabled);
  const apiCyclesRef = useRef(partyCycles);
  apiStateRef.current = state;
  apiActionsRef.current = actions;
  apiAutoRunRef.current = isAutoRepeatEnabled;
  apiCyclesRef.current = partyCycles;

  useEffect(() => {
    memoryMonitor.start();
    return () => memoryMonitor.stop();
  }, []);

  useEffect(() => {
    if (!isDebugModeEnabled()) return;
    window.__BOKEMO_MEMORY_BENCHMARK__ = {
      switchPanes: async (iterations) => {
        const count = Math.max(0, Math.floor(iterations));
        for (let index = 0; index < count; index += 1) {
          setActiveTab(MAIN_TAB_ORDER[index % MAIN_TAB_ORDER.length]);
          await new Promise<void>((resolve) => window.setTimeout(resolve, 25));
        }
      },
      sample: async () => {
        await memoryMonitor.sample();
        return memoryMonitor.getDiagnosticExport();
      },
    };
    return () => {
      delete window.__BOKEMO_MEMORY_BENCHMARK__;
    };
  }, []);

  useEffect(() => {
    const afkActive = pendingAfkMs > 0;
    const runtimeMode = afkActive ? 'afk' : isAutoRepeatEnabled ? 'online' : 'idle';
    memoryMonitor.setRuntime(runtimeMode, debugSettings.timeSpeed);
    if (isAutoRepeatEnabled && !afkActive && !memoryOnlineStartedRef.current) {
      memoryOnlineStartedRef.current = true;
      void memoryMonitor.recordEvent('online_processing_start');
    }
    if (afkActive && !memoryPreviousAfkActiveRef.current) {
      void memoryMonitor.recordEvent('afk_emulation_start');
    } else if (!afkActive && memoryPreviousAfkActiveRef.current) {
      void memoryMonitor.recordEvent('afk_emulation_complete');
    }
    memoryPreviousAfkActiveRef.current = afkActive;
  }, [debugSettings.timeSpeed, isAutoRepeatEnabled, pendingAfkMs]);

  useEffect(() => {
    apiStateVersionRef.current += 1;
  }, [state]);

  const waitForApiStateUpdate = useCallback((previousVersion: number) => new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (apiStateVersionRef.current > previousVersion) return resolve();
      if (Date.now() - startedAt > 10_000) return reject(new Error('state_update_timeout'));
      window.setTimeout(check, 0);
    };
    check();
  }), []);

  const apiFailure = (status: number, code: string, message: string, retryable = false, details?: object) => ({
    status,
    error: { code, message, retryable, ...(details ? { details } : {}) },
  });

  const buildApiObservation = useCallback(() => buildExperimentalObservation(
    apiStateRef.current,
    apiRevisionRef.current,
    apiAutoRunRef.current,
    apiCyclesRef.current,
    apiSimulatedAtRef.current,
  ), []);

  const handleExperimentalApiRequest = useCallback(async (operation: string, rawPayload: unknown) => {
    const payload = rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload) ? rawPayload as Record<string, unknown> : {};
    if (operation === 'status') return { status: 'ready', revision: apiRevisionRef.current };
    if (operation === 'set-control') {
      const active = payload.active === true;
      apiControlActiveRef.current = active;
      setApiControlActive(active);
      lastCheckpointAtRef.current = Date.now();
      if (!active) await apiActionsRef.current.flushSave();
      return { status: 'ready', revision: apiRevisionRef.current };
    }
    if (operation === 'release') {
      await apiActionsRef.current.flushSave();
      apiControlActiveRef.current = false;
      setApiControlActive(false);
      lastCheckpointAtRef.current = Date.now();
      return { revision: apiRevisionRef.current };
    }
    if (!apiControlActiveRef.current) return apiFailure(409, 'no_active_lease', 'The renderer is not in API-controlled mode.');
    if (operation === 'observation') return { observation: buildApiObservation() };

    // SpecRef: 9.1.3 | Experimental AI API | Retained battle-log read model
    if (operation === 'latest-battle-log') {
      if (Object.keys(payload).some((key) => key !== 'partyId') || !Number.isSafeInteger(payload.partyId)) {
        return apiFailure(400, 'invalid_request', 'partyId must be an integer.');
      }
      const party = apiStateRef.current.parties.find((entry) => entry.id === payload.partyId);
      if (!party) return apiFailure(404, 'party_not_found', 'The target party was not found.');
      if (!party.lastExpeditionLog) return apiFailure(404, 'battle_log_not_found', 'The party has no retained battle log.');
      return buildExperimentalBattleLog(
        apiRevisionRef.current,
        party.id,
        party.lastExpeditionLog,
        { kind: 'latest', diaryEntryId: null },
        getItemDisplayName,
      );
    }

    if (operation === 'diary-entries') {
      if (Object.keys(payload).length > 0) return apiFailure(400, 'invalid_request', 'Diary entry listing accepts no input.');
      return buildExperimentalDiaryEntries(apiStateRef.current.parties, apiRevisionRef.current, getExperimentalDiaryTitle);
    }

    if (operation === 'diary-battle-log') {
      if (Object.keys(payload).some((key) => key !== 'diaryEntryId') || typeof payload.diaryEntryId !== 'string' || payload.diaryEntryId.length < 1 || payload.diaryEntryId.length > 200) {
        return apiFailure(400, 'invalid_request', 'diaryEntryId is invalid.');
      }
      const retainedEntry = apiStateRef.current.parties
        .flatMap((party) => (party.diaryLogs ?? []).map((diaryLog) => ({ party, diaryLog })))
        .find(({ diaryLog }) => diaryLog.id === payload.diaryEntryId);
      if (!retainedEntry) return apiFailure(404, 'diary_entry_not_found', 'The Diary entry is not retained.');
      return buildExperimentalBattleLog(
        apiRevisionRef.current,
        retainedEntry.party.id,
        retainedEntry.diaryLog.expeditionLog,
        { kind: 'diary', diaryEntryId: retainedEntry.diaryLog.id },
        getItemDisplayName,
      );
    }

    if (operation === 'build-options') {
      const allowedKeys = new Set(['revision', 'partyId', 'characterId', 'proposedChanges']);
      if (Object.keys(payload).some((key) => !allowedKeys.has(key)) || !Number.isInteger(payload.revision) || !Number.isInteger(payload.partyId) || !Number.isInteger(payload.characterId)) return apiFailure(400, 'invalid_request', 'The build-options request is invalid.');
      if (payload.revision !== apiRevisionRef.current) return apiFailure(409, 'stale_revision', 'The supplied revision is stale.', true, { currentRevision: apiRevisionRef.current });
      const party = apiStateRef.current.parties.find((entry) => entry.id === payload.partyId);
      if (!party) return apiFailure(404, 'party_not_found', 'The target party was not found.');
      const character = party.characters.find((entry) => entry.id === payload.characterId);
      if (!character) return apiFailure(404, 'character_not_found', 'The target character was not found.');
      const proposed = payload.proposedChanges && typeof payload.proposedChanges === 'object' && !Array.isArray(payload.proposedChanges) ? payload.proposedChanges as Record<string, unknown> : {};
      const currentBuild = { name: character.name, gender: character.gender, raceId: character.raceId, lineageId: character.raceId === 'mimorian' ? null : character.lineageId, predispositionId: character.raceId === 'mimorian' ? null : character.predispositionId, mainClassId: character.mainClassId, subClassId: character.subClassId, mimorianEnemyId: character.raceId === 'mimorian' ? character.mimorianEnemyId ?? null : null };
      const candidateBuild = { ...currentBuild, ...proposed };
      const immutableFields = character.isUnique ? Object.keys(proposed).filter((key) => !['mainClassId', 'subClassId'].includes(key)) : [];
      const violations = immutableFields.map((field) => ({ code: 'immutable_character_field', field }));
      const selectableRaceIds = RACES.map((entry) => entry.id);
      const selectableClassIds = CLASSES.map((entry) => entry.id);
      const selectableLineageIds = LINEAGES.filter((entry) => entry.selectable).map((entry) => entry.id);
      const selectablePredispositionIds = PREDISPOSITIONS.filter((entry) => entry.selectable).map((entry) => entry.id);
      return {
        revision: apiRevisionRef.current,
        partyId: party.id,
        characterId: character.id,
        currentBuild,
        candidateBuild,
        candidateValidation: { valid: violations.length === 0, violations, defaultNameWillBeAssigned: proposed.raceId !== undefined && proposed.raceId !== character.raceId && proposed.name === undefined },
        options: { raceGenderPairs: selectableRaceIds.flatMap((raceId) => ['male', 'female'].map((gender) => ({ raceId, gender }))), lineageIds: selectableLineageIds, predispositionIds: selectablePredispositionIds, mainClassIds: selectableClassIds, subClassIds: selectableClassIds, mimorianEnemyIds: [...apiStateRef.current.global.unlockedMimorianEnemyIds], editableFields: character.isUnique ? ['mainClassId', 'subClassId'] : ['name', 'gender', 'raceId', 'lineageId', 'predispositionId', 'mainClassId', 'subClassId', 'mimorianEnemyId'] },
      };
    }

    if (operation === 'command') {
      if (Object.keys(payload).some((key) => !['expectedRevision', 'command'].includes(key)) || !Number.isInteger(payload.expectedRevision) || !payload.command || typeof payload.command !== 'object' || Array.isArray(payload.command)) return apiFailure(400, 'invalid_request', 'The command request is invalid.');
      if (payload.expectedRevision !== apiRevisionRef.current) return apiFailure(409, 'stale_revision', 'The supplied revision is stale.', true, { currentRevision: apiRevisionRef.current });
      const command = payload.command as Record<string, unknown>;
      const type = command.type;
      if (!isExperimentalApiCommandType(type)) return apiFailure(400, 'unsupported_command', 'The command discriminator is not supported.');
      if (type === 'run_auto_equipment') {
        const allowedKeys = new Set(['type', 'partyId', 'characterId']);
        if (Object.keys(command).some((key) => !allowedKeys.has(key)) || !Number.isInteger(command.partyId) || (command.characterId !== undefined && !Number.isInteger(command.characterId))) {
          return apiFailure(400, 'invalid_request', 'The auto-equipment target is invalid.');
        }
      }
      const current = apiStateRef.current;
      const partyIndex = Number.isInteger(command.partyId) ? current.parties.findIndex((entry) => entry.id === command.partyId) : -1;
      const party = partyIndex >= 0 ? current.parties[partyIndex] : null;
      if (command.partyId !== undefined && !party) return apiFailure(404, 'party_not_found', 'The target party was not found.');
      const character = party && Number.isInteger(command.characterId) ? party.characters.find((entry) => entry.id === command.characterId) : null;
      if (command.characterId !== undefined && !character) return apiFailure(404, 'character_not_found', 'The target character was not found.');
      const previousRevision = apiRevisionRef.current;
      const previousVersion = apiStateVersionRef.current;
      let effects: Record<string, unknown> = {};
      let dispatched = true;
      if (type === 'update_character_build' && character && party) {
        const changes = command.changes && typeof command.changes === 'object' && !Array.isArray(command.changes) ? command.changes as Partial<Character> : null;
        if (!changes || Object.keys(changes).length === 0) return apiFailure(400, 'invalid_request', 'Character changes are required.');
        if (character.isUnique && Object.keys(changes).some((key) => !['mainClassId', 'subClassId'].includes(key))) return apiFailure(422, 'immutable_character_field', 'A unique-character field is immutable.');
        apiActionsRef.current.updateCharacter(character.id, changes, partyIndex);
        effects = { characterId: character.id, changedFields: Object.keys(changes) };
      } else if (type === 'reorder_character' && character && party) {
        const from = party.characters.findIndex((entry) => entry.id === character.id);
        const to = Number(command.targetRow) - 1;
        if (!Number.isInteger(command.targetRow) || to < 0 || to >= party.characters.length) return apiFailure(400, 'invalid_request', 'targetRow is invalid.');
        if (from === to) return apiFailure(409, 'no_change', 'The character is already in that row.');
        apiActionsRef.current.reorderPartyCharacter(from, to, partyIndex);
        effects = { previousRow: from + 1, targetRow: to + 1 };
      } else if (type === 'set_deity' && party) {
        const deityName = typeof command.deityId === 'string' ? deityNameFromId(command.deityId) : null;
        if (!deityName || !getUnlockedDeityKeys(current.global.unlockedDeities).includes(deityName)) {
          return apiFailure(422, 'deity_unavailable', 'This deity is locked. Choose an unlocked deity.', false, {
            reason: 'locked',
            deityId: typeof command.deityId === 'string' ? command.deityId : null,
          });
        }
        if (getDeityKey(party.deity.name) === deityName) return apiFailure(409, 'no_change', 'The party already follows that deity.');
        const assignedParty = getDeityAssignmentConflict(current.parties, party.id, deityName);
        if (assignedParty) {
          const assignedPartySlot = `PT${assignedParty.id}`;
          const assignedPartyName = assignedParty.name || assignedPartySlot;
          const assignedPartyLabel = assignedPartyName === assignedPartySlot ? assignedPartySlot : `${assignedPartySlot}: ${assignedPartyName}`;
          return apiFailure(422, 'deity_unavailable', `This deity is already used by another party (${assignedPartyLabel}). Choose another deity.`, false, {
            reason: 'assigned_to_party',
            deityId: command.deityId,
            assignedPartyId: assignedParty.id,
            assignedPartyName,
          });
        }
        apiActionsRef.current.updatePartyDeity(partyIndex, deityName);
        effects = { deityId: command.deityId };
      } else if (type === 'set_auto_equipment_mode' && character) {
        if (![0, 1, 2].includes(command.mode as number)) return apiFailure(400, 'invalid_request', 'mode is invalid.');
        if ((character.autoEquipmentMode ?? 0) === command.mode) return apiFailure(409, 'no_change', 'The mode is unchanged.');
        apiActionsRef.current.updateCharacter(character.id, { autoEquipmentMode: command.mode as 0 | 1 | 2 }, partyIndex);
        effects = { previousMode: character.autoEquipmentMode ?? 0, mode: command.mode, autoEquipmentTriggered: false };
      } else if (type === 'run_auto_equipment' && party) {
        const runner = apiAutoEquipmentRunnerRef.current;
        if (!runner) return apiFailure(503, 'runtime_unavailable', 'Automatic equipment is unavailable.', true);
        const summary = runner([partyIndex], character ? [character.id] : undefined);
        const changeCount = summary.unequippedCount + summary.equippedCount + summary.upgradedCount + summary.jewelAssignmentCount;
        if (changeCount === 0) return apiFailure(409, 'no_change', 'Automatic equipment produced no effective change.');
        effects = {
          partyId: party.id,
          characterId: character?.id ?? null,
          processedCharacterIds: summary.processedCharacterIds,
          autoEquipmentTriggered: true,
          unequippedCount: summary.unequippedCount,
          equippedCount: summary.equippedCount,
          upgradedCount: summary.upgradedCount,
          jewelAssignmentCount: summary.jewelAssignmentCount,
        };
      } else if (type === 'toggle_equipment_lock' && character) {
        const slot = Number(command.slotIndex);
        if (!Number.isInteger(slot) || !character.equipment[slot]) return apiFailure(404, 'equipment_slot_not_found', 'The equipment slot was not found.');
        if ((character.autoEquipmentMode ?? 0) !== 2) return apiFailure(422, 'equipment_lock_unavailable', 'Equipment locks require FULL mode.');
        apiActionsRef.current.toggleEquipmentLock(character.id, slot, partyIndex);
        effects = { slotIndex: slot, previousLocked: Boolean(character.equipment[slot]?.isLocked), locked: !character.equipment[slot]?.isLocked };
      } else if (type === 'set_jewel_priority_party') {
        const target = command.partyId === null ? null : Number(command.partyId);
        if (target !== null && !current.parties.some((entry) => entry.id === target)) return apiFailure(404, 'party_not_found', 'The target party was not found.');
        if ((current.global.jewelAutoEquipPriorityPartyId ?? null) === target) return apiFailure(409, 'no_change', 'The Jewel Priority Party is unchanged.');
        apiActionsRef.current.setJewelAutoEquipPriorityParty(target);
        effects = { previousPartyId: current.global.jewelAutoEquipPriorityPartyId ?? null, partyId: target, autoJewelEquipmentTriggered: false };
      } else if (type === 'set_expedition_destination' && party) {
        if (command.mode !== 'auto' && command.mode !== 'fixed') return apiFailure(400, 'invalid_request', 'mode is invalid.');
        if (command.mode === 'fixed') {
          if (!Number.isInteger(command.dungeonId) || !DUNGEONS.some((entry) => entry.id === command.dungeonId && isDungeonEntryUnlocked(party, entry.id))) return apiFailure(422, 'illegal_action', 'The dungeon is unavailable.');
          apiActionsRef.current.selectDungeon(partyIndex, command.dungeonId as number);
        }
        apiActionsRef.current.setExpeditionDestinationMode(partyIndex, command.mode);
        effects = { mode: command.mode, dungeonId: command.mode === 'fixed' ? command.dungeonId : party.selectedDungeonId };
      } else if (type === 'set_expedition_depth' && party) {
        const values: ExpeditionDepthLimit[] = ['1f-3', '1f-4', '2f-3', '2f-4', '3f-3', '3f-4', '4f-3', '4f-4', '5f-3', '5f-4', 'beforeBoss', 'all'];
        if (!values.includes(command.depthLimit as ExpeditionDepthLimit)) return apiFailure(400, 'invalid_request', 'depthLimit is invalid.');
        if (party.expeditionDepthLimit === command.depthLimit) return apiFailure(409, 'no_change', 'The depth limit is unchanged.');
        apiActionsRef.current.setExpeditionDepthLimit(partyIndex, command.depthLimit as ExpeditionDepthLimit);
        effects = { previousDepthLimit: party.expeditionDepthLimit, depthLimit: command.depthLimit };
      } else if (type === 'set_expedition_difficulty' && party) {
        const maximum = getDifficultyOffsetMax(DUNGEONS.find((entry) => entry.id === party.selectedDungeonId)?.expLevel ?? 1);
        if (!Number.isInteger(command.difficultyOffset) || Number(command.difficultyOffset) < 0 || Number(command.difficultyOffset) > maximum || Number(command.difficultyOffset) % 2 !== 0) return apiFailure(422, 'difficulty_unavailable', 'The difficulty offset is unavailable.');
        apiActionsRef.current.setExpeditionDifficultyOffset(partyIndex, Number(command.difficultyOffset));
        effects = { dungeonId: party.selectedDungeonId, difficultyOffset: command.difficultyOffset };
      } else if (type === 'set_auto_run') {
        if (typeof command.enabled !== 'boolean') return apiFailure(400, 'invalid_request', 'enabled must be boolean.');
        if (apiAutoRunRef.current === command.enabled) return apiFailure(409, 'no_change', 'Auto-Run is unchanged.');
        setIsAutoRepeatEnabled(command.enabled);
        apiAutoRunRef.current = command.enabled;
        dispatched = false;
        effects = { previousEnabled: !command.enabled, enabled: command.enabled };
      } else if (type === 'god_battle' && party) {
        if (!party.defeatedBossExpeditions[party.selectedDungeonId] || (party.instantExpeditionStock ?? 0) <= 0 || apiAutoRunRef.current) return apiFailure(422, 'god_battle_unavailable', 'Gods Battle is unavailable.');
        apiActionsRef.current.consumeInstantExpeditionStock(partyIndex, apiSimulatedAtRef.current);
        apiActionsRef.current.resolveInstantExpedition(partyIndex, gameModeRef.current, true, apiSimulatedAtRef.current);
        apiSimulatedAtRef.current += APPROX_CYCLE_STEP_COUNT * BASE_STEP_DURATION_MS;
        effects = { partyId: party.id, dungeonId: party.selectedDungeonId };
      }
      if (dispatched) await waitForApiStateUpdate(previousVersion);
      else await new Promise((resolve) => window.setTimeout(resolve, 0));
      apiRevisionRef.current += 1;
      await apiActionsRef.current.flushSave();
      return { command: { type, status: 'applied', previousRevision, revision: apiRevisionRef.current }, effects, observation: buildApiObservation() };
    }

    if (operation === 'sortie') {
      if (Object.keys(payload).some((key) => !['expectedRevision', 'partyId', 'count'].includes(key)) || !Number.isInteger(payload.expectedRevision) || !Number.isInteger(payload.partyId) || !Number.isInteger(payload.count) || Number(payload.count) < 1 || Number(payload.count) > 100) return apiFailure(400, 'invalid_request', 'The sortie request is invalid.');
      if (payload.expectedRevision !== apiRevisionRef.current) return apiFailure(409, 'stale_revision', 'The supplied revision is stale.', true, { currentRevision: apiRevisionRef.current });
      const partyIndex = apiStateRef.current.parties.findIndex((entry) => entry.id === payload.partyId);
      if (partyIndex < 0) return apiFailure(404, 'party_not_found', 'The target party was not found.');
      const initialParty = apiStateRef.current.parties[partyIndex];
      const dungeonId = initialParty.selectedDungeonId;
      if (!DUNGEONS.some((entry) => entry.id === dungeonId) || !isDungeonEntryUnlocked(initialParty, dungeonId)) return apiFailure(422, 'normal_sortie_unavailable', 'The selected expedition is unavailable.');
      if (computePartyStats(initialParty).partyStats.hp <= 0) return apiFailure(422, 'invalid_party', 'The party has no valid maximum HP.');
      const chargeBefore = { stock: initialParty.instantExpeditionStock ?? 0, chargeStartedAt: initialParty.instantExpeditionChargeStartedAt ?? null };
      const previousRevision = apiRevisionRef.current;
      const outcomes = { Clear: 0, Turned_Back: 0, Draw_Retreat: 0, Wounded_Retreat: 0, Defeat: 0 };
      const totals = { experienceGained: 0, goldGained: 0, goldDonated: 0, goldSaved: 0, itemsObtained: 0, itemsByRarity: { common: 0, uncommon: 0, eliteRare: 0, bossRare: 0, mythicRare: 0 }, autoSoldItems: 0, autoSellGold: 0, jewelsGained: 0, pranaGained: 0 };
      const runs: Array<Record<string, unknown>> = [];
      let elapsed = 0;
      const beforeVersion = apiStateVersionRef.current;
      const batch = apiActionsRef.current.runApiSortieBatch(partyIndex, Number(payload.count), gameModeRef.current, apiSimulatedAtRef.current);
      await waitForApiStateUpdate(beforeVersion);
      for (const [zeroBasedIndex, batchRun] of batch.runs.entries()) {
        const index = zeroBasedIndex + 1;
        const beforeState = batchRun.beforeState;
        const beforeParty = beforeState.parties[partyIndex];
        const afterState = batchRun.afterState;
        const afterParty = batchRun.party;
        const log = batchRun.log;
        const outcome = outcomeFromParty(afterParty);
        outcomes[outcome] += 1;
        const cycleElapsed = Math.max(
          APPROX_CYCLE_STEP_COUNT * BASE_STEP_DURATION_MS,
          (log?.totalRooms ?? 1) * BASE_STEP_DURATION_MS,
        );
        const startElapsed = elapsed;
        elapsed += cycleElapsed;
        const xp = Math.max(0, afterParty.experience - beforeParty.experience);
        const gold = Math.max(0, afterState.global.gold - beforeState.global.gold);
        totals.experienceGained += xp;
        totals.goldGained += gold;
        totals.itemsObtained += log?.rewards.length ?? 0;
        totals.autoSoldItems += log?.autoSellCount ?? 0;
        totals.autoSellGold += log?.autoSellProfit ?? 0;
        const latestDisclosedFloor = log?.entries[log.entries.length - 1]?.floor ?? null;
        runs.push({ index, dungeonId, partyElapsedStartMs: startElapsed, partyElapsedEndMs: elapsed, outcome, completedRooms: log?.completedRooms ?? 0, totalRooms: log?.totalRooms ?? 0, latestDisclosedFloor, experienceGained: xp, goldGained: gold, goldDonated: 0, goldSaved: gold, itemsByRarity: { common: log?.rewards.length ?? 0, uncommon: 0, eliteRare: 0, bossRare: 0, mythicRare: 0 }, autoSoldItems: log?.autoSellCount ?? 0, autoSellGold: log?.autoSellProfit ?? 0, jewelsGained: 0, pranaGained: 0, sideQuestEvents: [], unlockedIds: [], endingHp: { current: afterParty.currentHp, maximum: computePartyStats(afterParty).partyStats.hp } });
      }
      const finalParty = batch.state.parties[partyIndex];
      const chargeAfter = { stock: finalParty.instantExpeditionStock ?? 0, chargeStartedAt: finalParty.instantExpeditionChargeStartedAt ?? null };
      apiRevisionRef.current += 1;
      await apiActionsRef.current.flushSave();
      return { sortie: { partyId: Number(payload.partyId), dungeonId, requestedCount: Number(payload.count), completedCount: Number(payload.count), previousRevision, revision: apiRevisionRef.current, partyElapsedStartMs: 0, partyElapsedEndMs: elapsed }, prelude: null, outcomes, totals, charge: { before: chargeBefore, after: chargeAfter }, sideQuests: { assigned: 0, completed: 0, cancelled: 0, expired: 0 }, unlocks: { bossDungeonIds: [], godBattleDungeonIds: [], partyIds: [], deityIds: [], otherIds: [] }, runs, observation: buildApiObservation() };
    }
    return apiFailure(400, 'invalid_request', 'Unsupported renderer operation.');
  }, [buildApiObservation, waitForApiStateUpdate]);

  useEffect(() => {
    const desktop = window.bokemoDesktop;
    if (!desktop?.onExperimentalApiRequest) return;
    return desktop.onExperimentalApiRequest(handleExperimentalApiRequest);
  }, [handleExperimentalApiRequest]);

  if (processedNativeDiaryIdsRef.current === null) {
    const storedIds = getProcessedDiaryIds();
    processedNativeDiaryIdsRef.current = storedIds ?? new Set(
      state.parties.flatMap((party) => party.diaryLogs.map((log) => log.id)),
    );
    if (storedIds === null) saveProcessedDiaryIds(processedNativeDiaryIdsRef.current);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsSystemDarkMode(event.matches);
    };

    setIsSystemDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DARK_MODE_STORAGE_KEY, darkModeSetting);
      window.dispatchEvent(new Event(THEME_SYNC_EVENT));
    } catch (error) {
      console.error('Failed to save dark mode setting:', error);
    }
  }, [darkModeSetting]);

  const isDarkModeEnabled = darkModeSetting === 'on' || (darkModeSetting === 'system' && isSystemDarkMode);

  useEffect(() => {
    document.body.classList.toggle('app-dark', isDarkModeEnabled);
    document.documentElement.classList.toggle('app-dark', isDarkModeEnabled);

    return () => {
      document.body.classList.remove('app-dark');
      document.documentElement.classList.remove('app-dark');
    };
  }, [isDarkModeEnabled]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const lightTint = gameMode === 'm.luna' ? '#f6efe2' : gameMode === 'm.laika' ? '#e6efe7' : '#f3f4f6';
    const darkTint = gameMode === 'm.luna' ? '#2f2620' : gameMode === 'm.laika' ? '#17281f' : '#1f2937';
    const resolvedTint = isDarkModeEnabled ? darkTint : lightTint;

    // iOS Safari sometimes ignores in-place content updates.
    // Replacing the node restores immediate, no-refresh tint switching.
    const existingMeta = document.querySelector('meta[name="theme-color"]');
    const nextMeta = document.createElement('meta');
    nextMeta.setAttribute('name', 'theme-color');
    nextMeta.setAttribute('content', resolvedTint);
    if (existingMeta?.parentNode) {
      existingMeta.parentNode.replaceChild(nextMeta, existingMeta);
    } else {
      document.head.appendChild(nextMeta);
    }
  }, [gameMode, isDarkModeEnabled]);

  useEffect(() => {
    latestPartiesRef.current = state.parties;
  }, [state.parties]);

  useEffect(() => {
    autoRepeatEnabledRef.current = isAutoRepeatEnabled;
  }, [isAutoRepeatEnabled]);

  useEffect(() => {
    const syncPartyExpeditionSplitView = () => {
      setIsPartyExpeditionSplitViewEnabled(window.innerWidth >= PARTY_EXPEDITION_SPLIT_MIN_WIDTH);
    };

    window.addEventListener('resize', syncPartyExpeditionSplitView);
    return () => {
      window.removeEventListener('resize', syncPartyExpeditionSplitView);
    };
  }, []);

  useEffect(() => {
    try {
      const savedExpeditionStatsDisplay = localStorage.getItem(EXPEDITION_STATS_DISPLAY_STORAGE_KEY);
      if (savedExpeditionStatsDisplay === 'on' || savedExpeditionStatsDisplay === 'off') {
        setIsExpeditionStatsDisplayEnabled(savedExpeditionStatsDisplay === 'on');
      }
    } catch (error) {
      console.error('Failed to load expedition stats display setting:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(EXPEDITION_STATS_DISPLAY_STORAGE_KEY, isExpeditionStatsDisplayEnabled ? 'on' : 'off');
    } catch (error) {
      console.error('Failed to persist expedition stats display setting:', error);
    }
  }, [isExpeditionStatsDisplayEnabled]);

  useEffect(() => {
    autoEquipmentEnabledRef.current = isAutoEquipmentEnabled;
  }, [isAutoEquipmentEnabled]);


  const updateDebugSettings = useCallback((updates: Partial<DebugSettings>) => {
    setDebugSettings((prev) => {
      const next = { ...prev, ...updates };
      saveDebugSettings(next);
      return next;
    });
  }, []);
  const [timeSpeedBonusUntilMs, setTimeSpeedBonusUntilMs] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) return null;
      return parsed > Date.now() ? parsed : null;
    } catch (error) {
      console.error('Failed to load Speed of Time bonus duration:', error);
      return null;
    }
  });
  const [timeSpeedNowMs, setTimeSpeedNowMs] = useState(() => Date.now());

  useEffect(() => {
    try {
      if (timeSpeedBonusUntilMs === null) {
        localStorage.removeItem(SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY);
      } else {
        localStorage.setItem(SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY, String(timeSpeedBonusUntilMs));
      }
    } catch (error) {
      console.error('Failed to persist Speed of Time bonus duration:', error);
    }
  }, [timeSpeedBonusUntilMs]);

  useEffect(() => {
    if (timeSpeedBonusUntilMs === null) return;
    const timer = window.setInterval(() => {
      setTimeSpeedNowMs(Date.now());
    }, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [timeSpeedBonusUntilMs]);

  useEffect(() => {
    // SpecRef: 8.1.2 | Header | Speed of Time
    // Keep x1.2 active only while a valid bonus duration exists.
    if (timeSpeedBonusUntilMs === null) {
      setDebugSettings((prev) => {
        if (prev.timeSpeed !== 'x1_2') return prev;
        const next = { ...prev, timeSpeed: 'realtime' as const };
        saveDebugSettings(next);
        return next;
      });
      return;
    }
    if (timeSpeedNowMs < timeSpeedBonusUntilMs) return;
    setTimeSpeedBonusUntilMs(null);
    setDebugSettings((prev) => {
      if (prev.timeSpeed !== 'x1_2') return prev;
      const next = { ...prev, timeSpeed: 'realtime' as const };
      saveDebugSettings(next);
      return next;
    });
  }, [timeSpeedBonusUntilMs, timeSpeedNowMs]);

  const speedOfTimeLabel = useMemo(() => {
    if (debugSettings.timeSpeed === 'unlimited') return '(∞)';
    const isBonusSpeed = debugSettings.timeSpeed === 'x1_2';
    if (!isBonusSpeed) return '';
    const remainingHours = timeSpeedBonusUntilMs === null
      ? 0
      : Math.max(0, Math.ceil((timeSpeedBonusUntilMs - timeSpeedNowMs) / (60 * 60 * 1000)));
    return `(${formatNumber(remainingHours)}h)`;
  }, [debugSettings.timeSpeed, timeSpeedBonusUntilMs, timeSpeedNowMs]);

  const speedOfTimeSymbol = useMemo(() => {
    if (debugSettings.timeSpeed === 'realtime') return '▷';
    return '▶︎';
  }, [debugSettings.timeSpeed]);

  const buildLatestBattleLogHtml = (partyLabel: 'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6'): File | null => {
    const partyIndex = Number(partyLabel.replace('PT', '')) - 1;
    const party = state.parties[partyIndex];
    const latestLog = party?.lastExpeditionLog;
    if (!party || !latestLog) return null;
    const entriesHtml = latestLog.entries.map((entry: ExpeditionLogEntry) => {
      const detailItems = entry.details.map((detail: BattleLogEntry) => {
        const elementalAttributeEmoji: Record<'fire' | 'ice' | 'thunder', string> = { fire: '🔥', ice: '❄', thunder: '⚡' };
        const hitDisplay = formatBattleLogHitDisplay(detail);
        const damageDisplay = typeof detail.damage === 'number' && (detail.damage > 0 || detail.showZeroDamage) ? `(${detail.elementalOffense && detail.elementalOffense !== 'none' ? `${elementalAttributeEmoji[detail.elementalOffense]} ` : ''}${formatNumber(detail.damage)})` : '';
        const noteDisplay = detail.note ? `(${detail.note})` : '';
        return `<li>${escapeExportHtml(`${detail.action}${[hitDisplay, damageDisplay, noteDisplay].filter(Boolean).join(' ') ? ` ${[hitDisplay, damageDisplay, noteDisplay].filter(Boolean).join(' ')}` : ''}`)}</li>`;
      }).join('');
      return `<section><h3>Room ${escapeExportHtml(String(entry.floor ?? '-'))}-${escapeExportHtml(String(entry.roomInFloor ?? entry.room))} / ${escapeExportHtml(entry.enemyName)}</h3><p>Outcome: ${escapeExportHtml(entry.outcome)} / Damage dealt: ${escapeExportHtml(String(entry.damageDealt))} / Damage taken: ${escapeExportHtml(String(entry.damageTaken))}</p><ul>${detailItems || '<li>(No detail)</li>'}</ul></section>`;
    }).join('\n');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>KEMO EXPEDITION Latest Battle Log - ${partyLabel}</title></head><body><h1>KEMO EXPEDITION Latest Battle Log (${partyLabel})</h1><p>Dungeon: ${escapeExportHtml(latestLog.dungeonName)} / Outcome: ${escapeExportHtml(latestLog.finalOutcome)}</p><p>Total rooms: ${escapeExportHtml(String(latestLog.totalRooms))} / Completed: ${escapeExportHtml(String(latestLog.completedRooms))}</p>${entriesHtml || '<p>No entries.</p>'}</body></html>`;
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    return new File([html], `latest-battle-log-${partyLabel}-${timestamp}.html`, { type: 'text/html' });
  };

  const reportProgressForSpeedOfTime = useCallback(async () => {
    // SpecRef: 8.6 | UI_SETTING | Speed of time
    // SpecRef: 8.1.2 | Header | Format of progress data
    const environmentId = getEnvironmentId();
    const webhookUrl = environmentId === 'dev'
      ? DEV_DISCORD_WEBHOOK_URL
      : environmentId === 'beta'
        ? BETA_DISCORD_WEBHOOK_URL
        : PROD_DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      const requiredEnvName = environmentId === 'dev'
        ? 'VITE_DEV_DISCORD_WEBHOOK_URL'
        : environmentId === 'beta'
          ? 'VITE_BETA_DISCORD_WEBHOOK_URL'
          : 'VITE_PROD_DISCORD_WEBHOOK_URL';
      console.warn(`Speed of Time progress report skipped: ${requiredEnvName} is not configured.`);
      return false;
    }
    type ProgressReportPartySnapshot = {
      level: number;
      expProgressPercent: number;
      hp: number;
      attacks: [number, number, number];
    };
    const partySnapshotsKey = createEnvironmentStorageKey('speedOfTimeLastReportedPartySnapshots');
    const storedPartySnapshots = (() => {
      const raw = localStorage.getItem(partySnapshotsKey);
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed as ProgressReportPartySnapshot[] : [];
      } catch {
        return [];
      }
    })();
    const formatSigned = (value: number): string => `${value >= 0 ? '+' : ''}${formatNumber(value)}`;
    const partySnapshots: ProgressReportPartySnapshot[] = [];
    const ptRows = state.parties.map((party, index) => {
      const latestLog = party.lastExpeditionLog;
      const xpToNextLevel = getXpToNextLevel(party.level);
      const expProgressPercent = xpToNextLevel > 0
        ? Math.min(100, Math.max(0, Math.round((party.experience / xpToNextLevel) * 100)))
        : 100;
      const hp = Math.max(0, Math.floor(computePartyStats(party).partyStats.hp));
      const attacks = party.characters.reduce<[number, number, number]>((totals, member, memberIndex) => {
        const computed = computeCharacterStats(member, party.level, memberIndex + 1);
        totals[0] += computed.rangedAttack;
        totals[1] += computed.magicalAttack;
        totals[2] += computed.meleeAttack;
        return totals;
      }, [0, 0, 0]).map((value) => Math.max(0, Math.floor(value))) as [number, number, number];
      const snapshot = { level: party.level, expProgressPercent, hp, attacks };
      partySnapshots.push(snapshot);
      const previous = storedPartySnapshots[index] ?? snapshot;
      const expIncrease = ((party.level - previous.level) * 100)
        + expProgressPercent
        - previous.expProgressPercent;
      const attackIncrease = attacks.map((value, attackIndex) => value - (previous.attacks?.[attackIndex] ?? value));
      return [
        `PT${formatNumber(index + 1)}`,
        `${formatNumber(party.level)}, ${formatNumber(expProgressPercent)}% (${formatSigned(expIncrease)}%)`,
        `${formatNumber(hp)} (${formatSigned(hp - previous.hp)})`,
        `${attacks.map(formatNumber).join('/')} (${attackIncrease.map(formatSigned).join('/')})`,
        latestLog?.dungeonId != null ? formatNumber(latestLog.dungeonId) : '-',
        latestLog?.difficultyOffset != null ? `[${formatSigned(latestLog.difficultyOffset)}]` : '-',
        latestLog?.finalOutcome ?? '-',
        latestLog ? formatNumber(latestLog.completedRooms) : '-',
      ];
    });
    const statusRows = buildStatusTableRows(state.parties);
    const postWebhookWithFiles = async (content: string, files: File[], username: string) => {
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify({ content, username }));
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file, file.name);
      });
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error(`Webhook request failed: ${response.status}`);
    };

    const reportCreatedAtMs = Date.now();
    const now = new Date(reportCreatedAtMs);
    const timestampFormatter = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    });
    const timestampParts = timestampFormatter.formatToParts(now);
    const year = timestampParts.find((part) => part.type === 'year')?.value ?? '0000';
    const month = timestampParts.find((part) => part.type === 'month')?.value ?? '00';
    const day = timestampParts.find((part) => part.type === 'day')?.value ?? '00';
    const hour = timestampParts.find((part) => part.type === 'hour')?.value ?? '00';
    const minute = timestampParts.find((part) => part.type === 'minute')?.value ?? '00';
    const nav = typeof navigator === 'undefined' ? null : navigator;
    const userAgent = nav?.userAgent ?? 'unknown';
    const navWithUaData = nav as Navigator & { userAgentData?: { brands?: Array<{ brand: string; version: string }> } };
    const browserName = nav
      ? (navWithUaData.userAgentData?.brands?.map((brand: { brand: string }) => brand.brand).join(' / ')
      || (userAgent.match(/(Firefox|Edg|OPR|Chrome|Safari)\/[\d.]+/)?.[0] ?? 'unknown'))
      : 'unknown';
    const browserVersion = nav
      ? (userAgent.match(/(?:Firefox|Edg|OPR|Chrome|Version)\/([\d.]+)/)?.[1] ?? 'unknown')
      : 'unknown';
    const platform = nav?.platform ?? '';
    const detectOsVersion = (ua: string): string => {
      const ios = ua.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/i)?.[1];
      if (ios) return `iOS ${ios.replace(/_/g, '.')}`;
      const android = ua.match(/Android ([\d.]+)/i)?.[1];
      if (android) return `Android ${android}`;
      const windows = ua.match(/Windows NT ([\d.]+)/i)?.[1];
      if (windows) return `Windows NT ${windows}`;
      const mac = ua.match(/Mac OS X ([\d_]+)/i)?.[1];
      if (mac) return `macOS ${mac.replace(/_/g, '.')}`;
      return platform || 'unknown';
    };
    const osVersion = detectOsVersion(userAgent);
    const resolution = `${formatNumber(window.innerWidth)} px, ${formatNumber(window.innerHeight)} px`;
    const reportCounterKey = createEnvironmentStorageKey('speedOfTimeReportCount');
    const reportCount = Number.parseInt(localStorage.getItem(reportCounterKey) ?? '0', 10);
    const nextReportCount = Number.isFinite(reportCount) ? reportCount + 1 : 1;
    const progressReportCount = formatNumber(nextReportCount);
    const lastReportAtKey = createEnvironmentStorageKey('speedOfTimeLastReportAt');
    const previousReportAt = Number.parseInt(localStorage.getItem(lastReportAtKey) ?? '', 10);
    const lastReportHours = Number.isFinite(previousReportAt)
      ? Math.max(0, (reportCreatedAtMs - previousReportAt) / (1000 * 60 * 60))
      : null;
    const lastReportTime = lastReportHours == null
      ? '-'
      : `${formatNumber(Math.floor(lastReportHours))} hours ago`;
    const superRareTotal = Object.values(state.global.inventory).reduce((total, variant) => (
      variant.status === 'owned' && variant.item.superRare > 0
        ? total + Math.max(0, variant.count)
        : total
    ), 0);
    const jewelTotal = Object.values(state.global.jewels).reduce(
      (total, count) => total + Math.max(0, count),
      0,
    ) + state.parties.reduce((partyTotal, party) => (
      partyTotal + party.characters.reduce((characterTotal, character) => (
        characterTotal + character.equipment.reduce(
          (equippedTotal, item) => equippedTotal + (item?.jewel ? 1 : 0),
          0,
        )
      ), 0)
    ), 0);
    const superRareTotalKey = createEnvironmentStorageKey('speedOfTimeLastReportedSuperRareTotal');
    const jewelTotalKey = createEnvironmentStorageKey('speedOfTimeLastReportedJewelTotal');
    const previousSuperRareTotal = Number.parseInt(localStorage.getItem(superRareTotalKey) ?? '0', 10);
    const previousJewelTotal = Number.parseInt(localStorage.getItem(jewelTotalKey) ?? '0', 10);
    const superRareIncrease = Math.max(0, superRareTotal - (Number.isFinite(previousSuperRareTotal) ? previousSuperRareTotal : 0));
    const jewelIncrease = Math.max(0, jewelTotal - (Number.isFinite(previousJewelTotal) ? previousJewelTotal : 0));
    // SpecRef: 8.1.2 | Header | Speed of Time Progress Report
    const reporterName = (localStorage.getItem(createEnvironmentStorageKey('settingFeedbackName')) ?? '').trim() || '-';
    const reportHeaderRows = [
      ['Name', `${reporterName} (${state.global.language})`],
      ['Report count', `${progressReportCount} (${lastReportTime})`],
      ['Super rare', `${formatNumber(superRareTotal)} (+${formatNumber(superRareIncrease)})`],
      ['Jewel', `${formatNumber(jewelTotal)} (+${formatNumber(jewelIncrease)})`],
    ];
    const headerLines = reportHeaderRows
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');
    const environmentLines = [
      ['browser, version', `${browserName}, ${browserVersion}`],
      ['User ID', state.global.userId],
      ['OS version', osVersion],
      ['Resolution', resolution],
    ]
      .map(([key, value]) => `**${key}:** ${value}`)
      .join('\n');
    const versionBuildEnvironmentLine = `**Version Build env:** ${APP_VERSION} (${formatNumber(state.buildNumber)}) ${environmentId}`;
    const currentShopRefreshCount = state.global.shopRefreshCounts[getShopHourKey(now)] ?? 0;
    const goldAndPaidRefreshCostLine = `**Gold and Paid Refresh cost:** ${formatNumber(state.global.gold)}G (${formatNumber(getShopRefreshPrice(currentShopRefreshCount))}G)`;
    const reportMessage = `${headerLines}\n\n${ptRows.map((row) => row.join(' ')).join('\n')}\n\n${goldAndPaidRefreshCostLine}\n${versionBuildEnvironmentLine}\n${environmentLines}`;
    const htmlFileName = `status-table-${year}${month}${day}${hour}${minute}.html`;
    const htmlFile = buildStatusTableHtmlFile(statusRows, htmlFileName);
    const reportTargetPartyIndex = state.parties.reduce((selectedIndex, party, partyIndex) => {
      if (selectedIndex < 0) return partyIndex;
      const selectedParty = state.parties[selectedIndex];
      if (party.level !== selectedParty.level) return party.level > selectedParty.level ? partyIndex : selectedIndex;
      if (party.experience !== selectedParty.experience) return party.experience > selectedParty.experience ? partyIndex : selectedIndex;
      return partyIndex < selectedIndex ? partyIndex : selectedIndex;
    }, -1);
    const reportTargetPartyLabel = reportTargetPartyIndex >= 0 ? `PT${reportTargetPartyIndex + 1}` as 'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6' : null;
    const latestBattleLogFile = reportTargetPartyLabel ? buildLatestBattleLogHtml(reportTargetPartyLabel) : null;
    const reportFiles = [htmlFile, ...(latestBattleLogFile ? [latestBattleLogFile] : [])];
    await postWebhookWithFiles(reportMessage, reportFiles, `KEMO EXPEDITION ${environmentId.toUpperCase()}`);
    localStorage.setItem(reportCounterKey, String(nextReportCount));
    localStorage.setItem(lastReportAtKey, String(reportCreatedAtMs));
    localStorage.setItem(superRareTotalKey, String(superRareTotal));
    localStorage.setItem(jewelTotalKey, String(jewelTotal));
    localStorage.setItem(partySnapshotsKey, JSON.stringify(partySnapshots));
    return true;
  }, [state]);

  const runAutoEquipment = useCallback((
    targetPartyIndexes?: number[],
    targetCharacterIds?: Array<number | string>,
    options?: { suppressNotifications?: boolean },
  ): AutoEquipmentRunSummary => {
    const summary: AutoEquipmentRunSummary = {
      processedCharacterIds: [],
      unequippedCount: 0,
      equippedCount: 0,
      upgradedCount: 0,
      jewelAssignmentCount: 0,
    };
    const targetPartyIndexSet = targetPartyIndexes ? new Set(targetPartyIndexes) : null;
    const targetCharacterIdSet = targetCharacterIds ? new Set(targetCharacterIds) : null;
    const simulatedInventory: InventoryRecord = { ...state.global.inventory };
    const slotNotifications = new Map<string, { message: string; partyIndex: number; startedFromEmpty: boolean }>();
    const setSlotNotification = (
      partyName: string,
      characterName: string,
      characterId: string | number,
      slotIndex: number,
      partyIndex: number,
      item: Item,
      previousItem: Item | null,
    ) => {
      const notificationKey = `${partyIndex}:${characterId}:${slotIndex}`;
      const existing = slotNotifications.get(notificationKey);
      const startedFromEmpty = existing?.startedFromEmpty ?? previousItem == null;
      const message = startedFromEmpty
        ? t('home.notification.equipment.equipped', { item: getItemDisplayName(item) })
        : t('home.notification.equipment.replaced', { previous: getItemDisplayName(previousItem!), item: getItemDisplayName(item) });
      slotNotifications.set(notificationKey, {
        message: t('home.notification.equipment.characterChanged', { party: partyName, character: characterName, message }),
        partyIndex,
        startedFromEmpty,
      });
    };

    const queueAutoEquipmentNotification = (
      partyName: string,
      characterName: string,
      characterId: string | number,
      slotIndex: number,
      item: Item,
      previousItem: Item | null,
      partyIndex: number,
    ) => {
      setSlotNotification(
        partyName,
        characterName,
        characterId,
        slotIndex,
        partyIndex,
        item,
        previousItem,
      );
    };

    const areEquipmentEntitiesEqual = (a: Item | null, b: Item | null): boolean => {
      if (a == null && b == null) return true;
      if (a == null || b == null) return false;

      const isSameVariant = getVariantKey(a) === getVariantKey(b);
      if (!isSameVariant) return false;
      if ((a.isLocked === true) !== (b.isLocked === true)) return false;

      const aJewel = a.jewel;
      const bJewel = b.jewel;
      if (!aJewel && !bJewel) return true;
      if (!aJewel || !bJewel) return false;

      return aJewel.key === bJewel.key && aJewel.rank === bJewel.rank;
    };

    const getEquipmentEntityKey = (item: Item): string => {
      const jewelSuffix = item.jewel ? `:${item.jewel.key}:${item.jewel.rank}` : '';
      const lockSuffix = item.isLocked === true ? ':locked' : ':unlocked';
      return `${getVariantKey(item)}${jewelSuffix}${lockSuffix}`;
    };

    const collectEquipmentDiff = (before: Array<Item | null>, after: Array<Item | null>) => {
      const beforeCounts = new Map<string, { count: number; item: Item }>();
      const afterCounts = new Map<string, { count: number; item: Item }>();

      before.forEach((item) => {
        if (!item) return;
        const key = getEquipmentEntityKey(item);
        const existing = beforeCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          beforeCounts.set(key, { count: 1, item });
        }
      });

      after.forEach((item) => {
        if (!item) return;
        const key = getEquipmentEntityKey(item);
        const existing = afterCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          afterCounts.set(key, { count: 1, item });
        }
      });

      const removedItems: Item[] = [];
      const addedItems: Item[] = [];
      const allKeys = new Set([...beforeCounts.keys(), ...afterCounts.keys()]);

      allKeys.forEach((key) => {
        const beforeEntry = beforeCounts.get(key);
        const afterEntry = afterCounts.get(key);
        const beforeCount = beforeEntry?.count ?? 0;
        const afterCount = afterEntry?.count ?? 0;

        if (beforeCount > afterCount && beforeEntry) {
          for (let i = 0; i < beforeCount - afterCount; i += 1) {
            removedItems.push(beforeEntry.item);
          }
        }

        if (afterCount > beforeCount && afterEntry) {
          for (let i = 0; i < afterCount - beforeCount; i += 1) {
            addedItems.push(afterEntry.item);
          }
        }
      });

      return { removedItems, addedItems };
    };

    const addItemToSimulatedInventory = (item: Item) => {
      const key = getVariantKey(item);
      const existing = simulatedInventory[key];
      if (existing) {
        simulatedInventory[key] = { ...existing, count: existing.count + 1, status: 'owned' };
      } else {
        simulatedInventory[key] = { item, count: 1, status: 'owned' };
      }
    };

    const removeItemFromSimulatedInventory = (key: string) => {
      const existing = simulatedInventory[key];
      if (!existing || existing.count <= 0) return;
      if (existing.count <= 1) {
        delete simulatedInventory[key];
      } else {
        simulatedInventory[key] = { ...existing, count: existing.count - 1 };
      }
    };

    const getItemTier = (item: Item): number => Math.floor(item.id / 1000);

    const formatCBonusValue = (value: number): string => (Math.round(value * 1000000) / 1000000).toString();

    const formatDefenseBonusPercent = (value: number): string => {
      const percent = Math.round(value * 1000) / 10;
      return formatDecimal(percent, 1, Number.isInteger(percent) ? 0 : 1);
    };

    const ITEM_DIRECT_C_BONUS_TYPES = new Set([
      'equip_slot', 'equip_melee', 'equip_ranged', 'equip_magic', 'penet', 'accuracy', 'growth_xV', 'upgrade_V',
      'melee_attack', 'ranged_attack', 'magical_attack', 'physical_attack', 'physical_defense',
      'magical_defense', 'physical_offense_multiplier_xV', 'magical_offense_multiplier_xV',
      'physical_defense_multiplier_xV', 'magical_defense_multiplier_xV', 'fire_defense_multiplier_xV',
      'ice_defense_multiplier_xV', 'thunder_defense_multiplier_xV',
    ]);

    const getItemCBonusSignatures = (item: Item): Set<string> => {
      const bonusNames = new Set<string>();

      for (const bonus of item.bonuses ?? []) {
        if (!ITEM_DIRECT_C_BONUS_TYPES.has(bonus.type)) continue;
        bonusNames.add(`c.${bonus.type}+${formatCBonusValue(bonus.value)}`);
      }

      const baseMultiplier = item.baseMultiplier ?? 1;
      if (baseMultiplier !== 1) {
        const offensePercent = Math.round((baseMultiplier - 1) * 1000) / 10;
        if (item.meleeAttack || item.meleeNoA || item.meleeNoABonus) {
          bonusNames.add(`c.melee_attack+${offensePercent}`);
        }
        if (item.rangedAttack || item.rangedNoA || item.rangedNoABonus) {
          bonusNames.add(`c.ranged_attack+${offensePercent}`);
        }
        if (item.magicalAttack || item.magicalNoA || item.magicalNoABonus) {
          bonusNames.add(`c.magical_attack+${offensePercent}`);
        }
        const defensePercent = formatDefenseBonusPercent(baseMultiplier - 1);
        if (item.physicalDefense) {
          bonusNames.add(`c.physical_defense+${defensePercent}`);
        }
        if (item.magicalDefense) {
          bonusNames.add(`c.magical_defense+${defensePercent}`);
        }
      }

      if (item.accuracyBonus) {
        bonusNames.add(`c.accuracy+${formatCBonusValue(item.accuracyBonus)}`);
      }
      if ((item.evasionBonus ?? 0) > 0) {
        bonusNames.add(`c.evasion+${formatCBonusValue(item.evasionBonus ?? 0)}`);
      }
      if (item.penetBonus) {
        bonusNames.add(`c.penet+${formatCBonusValue(item.penetBonus)}`);
      }

      if ((item.meleeNoABonus ?? 0) !== 0) {
        bonusNames.add(`c.melee_NoA+${formatCBonusValue(item.meleeNoABonus ?? 0)}`);
      }
      if ((item.rangedNoABonus ?? 0) !== 0) {
        bonusNames.add(`c.ranged_NoA+${formatCBonusValue(item.rangedNoABonus ?? 0)}`);
      }
      if ((item.magicalNoABonus ?? 0) !== 0) {
        bonusNames.add(`c.magical_NoA+${formatCBonusValue(item.magicalNoABonus ?? 0)}`);
      }

      return bonusNames;
    };

    const compareItemsByTierAndEnhancement = (a: Item, b: Item): number => {
      const tierDiff = getItemTier(a) - getItemTier(b);
      if (tierDiff !== 0) return tierDiff;

      const enhancementDiff = a.enhancement - b.enhancement;
      if (enhancementDiff !== 0) return enhancementDiff;

      return a.id - b.id;
    };


    const getCharacterAutoEquipBonuses = (character: Character): Bonus[] => {
      const race = RACES.find((r) => r.id === character.raceId);
      const mainClass = CLASSES.find((c) => c.id === character.mainClassId);
      const subClass = CLASSES.find((c) => c.id === character.subClassId);
      const predisposition = PREDISPOSITIONS.find((p) => p.id === character.predispositionId);
      const lineage = LINEAGES.find((l) => l.id === character.lineageId);
      if (!race || !mainClass || !subClass || !predisposition || !lineage) return [];

      const isMasterClass = character.mainClassId === character.subClassId;
      const equipmentBonuses = character.equipment.flatMap((item) => item?.bonuses ?? []);
      return [
        ...race.bonuses,
        ...mainClass.mainSubBonuses,
        ...(isMasterClass ? mainClass.masterBonuses : mainClass.mainBonuses),
        ...(isMasterClass ? [] : subClass.mainSubBonuses),
        ...predisposition.bonuses,
        ...lineage.bonuses,
        ...equipmentBonuses,
      ];
    };

    const decideAutoEquipmentCombatStyle = (character: Character): AutoEquipmentCombatStyle | null => {
      // SpecRef: 7.1.1.2 | Equipping into empty slots | Decide the combat style
      const bonuses = getCharacterAutoEquipBonuses(character);
      const enableFlags = { ranged: false, magic: false, melee: false };
      const uniqueMultiplierBonusNames = new Set<string>();
      const scoreByMultiplierType = new Map<string, number>();

      const addMultiplierScore = (multiplierType: string, value: number): void => {
        const existing = scoreByMultiplierType.get(multiplierType) ?? 0;
        scoreByMultiplierType.set(multiplierType, existing + (value - 1));
      };

      for (const bonus of bonuses) {
        if (bonus.type === 'equip_ranged' && bonus.value > 0) enableFlags.ranged = true;
        if (bonus.type === 'equip_magic' && bonus.value > 0) enableFlags.magic = true;
        if (bonus.type === 'equip_melee' && bonus.value > 0) enableFlags.melee = true;
        if (!bonus.type.endsWith('_multiplier')) continue;

        const bonusName = `${bonus.type}:${bonus.value}`;
        if (uniqueMultiplierBonusNames.has(bonusName)) continue;
        uniqueMultiplierBonusNames.add(bonusName);
        addMultiplierScore(bonus.type, bonus.value);
      }

      const scores: Record<AutoEquipmentCombatStyle, number> = {
        ranged: (scoreByMultiplierType.get('arrow_multiplier') ?? 0)
          + (scoreByMultiplierType.get('bolt_multiplier') ?? 0)
          + (scoreByMultiplierType.get('archery_multiplier') ?? 0),
        magic: (scoreByMultiplierType.get('wand_multiplier') ?? 0)
          + (scoreByMultiplierType.get('grimoire_multiplier') ?? 0)
          + (scoreByMultiplierType.get('catalyst_multiplier') ?? 0),
        melee: (scoreByMultiplierType.get('sword_multiplier') ?? 0)
          + (scoreByMultiplierType.get('katana_multiplier') ?? 0)
          + (scoreByMultiplierType.get('gauntlet_multiplier') ?? 0),
      };

      const ranking: AutoEquipmentCombatStyle[] = ['ranged', 'magic', 'melee'];
      if (!enableFlags.ranged && !enableFlags.magic && !enableFlags.melee) {
        return null;
      }
      let bestStyle: AutoEquipmentCombatStyle | null = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      ranking.forEach((style) => {
        if (!enableFlags[style]) return;
        if (scores[style] > bestScore) {
          bestStyle = style;
          bestScore = scores[style];
        }
      });

      return bestStyle;
    };

    const resolveAutoEquipmentTargetCategory = (
      targetCategory: AutoEquipmentTargetCategory,
      combatStyle: AutoEquipmentCombatStyle | null,
    ): ItemCategory[] => {
      if (targetCategory === 'i.weapon') {
        if (combatStyle === 'ranged') return ['arrow', 'bolt'];
        if (combatStyle === 'magic') return ['wand', 'grimoire'];
        if (combatStyle === 'melee') return ['sword', 'katana'];
        return ['shield'];
      }
      if (targetCategory === 'i.NoA') {
        if (combatStyle === 'ranged') return ['archery'];
        if (combatStyle === 'magic') return ['catalyst'];
        if (combatStyle === 'melee') return ['gauntlet'];
        return ['shield'];
      }
      return [targetCategory];
    };

    const getAutoEquipmentSelectionValueForCharacter = (character: Character, item: Item): number => {
      // SpecRef: 7.1.1.2 | Equipping into empty slots | modified core concept
      const categoryMultiplier = getCharacterCategoryMultiplier(character, item.category);
      const modifiedCoreConceptValue = Math.round(getItemCoreConceptValue(item) * categoryMultiplier);
      if (item.category === 'gauntlet') {
        return modifiedCoreConceptValue + (item.meleeNoABonus ?? 0);
      }
      if (item.category === 'archery') {
        return modifiedCoreConceptValue + (item.rangedNoABonus ?? 0);
      }
      if (item.category === 'catalyst') {
        return modifiedCoreConceptValue + (item.magicalNoABonus ?? 0);
      }
      return modifiedCoreConceptValue;
    };

    const getBestVariantKeyInCategory = (
      character: Character,
      targetCategories: ItemCategory[],
      memoryItemIds: Set<number>,
      memoryCBonusNames: Set<string>,
    ): string | null => {
      // SpecRef: 7.1.1.2 | Equipping into empty slots | Search for a candidate item
      const optionKeys: string[] = [];
      const candidates: EquipmentRankingCandidate[] = [];
      Object.entries(simulatedInventory)
        .forEach(([key, variant]) => {
          if (
            variant.status !== 'owned'
            || variant.count <= 0
            || !targetCategories.includes(variant.item.category)
          ) {
            return;
          }

          if (memoryItemIds.has(variant.item.id)) return;
          const hasAntagonismBonus = [
            ...(variant.item.bonuses ?? []),
            ...getSuperRareBonuses(variant.item.superRare),
          ].some((bonus) => bonus.type === 'antagonism');
          if (hasAntagonismBonus) return;

          const cBonusNames = getItemCBonusSignatures(variant.item);
          for (const bonusName of cBonusNames) {
            if (memoryCBonusNames.has(bonusName)) return;
          }

          optionKeys.push(key);
          candidates.push({
            index: optionKeys.length - 1,
            tier: getItemTier(variant.item),
            enhancement: variant.item.enhancement,
            coreConcept: getItemCoreConceptValue(variant.item),
            superRare: variant.item.superRare,
            itemId: variant.item.id,
            selectionValue: getAutoEquipmentSelectionValueForCharacter(character, variant.item),
          });
        });

      const selectedIndex = selectBestAutoEquipmentFillCandidate(candidates);
      return selectedIndex == null ? null : optionKeys[selectedIndex] ?? null;
    };

    const getBestUpgradeVariantKeyForItem = (equippedItem: Item): string | null => {
      if (equippedItem.superRare > 0) return null;

      const optionKeys: string[] = [];
      const candidates: EquipmentRankingCandidate[] = [];
      Object.entries(simulatedInventory).forEach(([key, variant]) => {
          if (variant.status !== 'owned' || variant.count <= 0) return;
          if (variant.item.id !== equippedItem.id) return;
          if (variant.item.superRare > 0) return;
          if (variant.item.enhancement <= equippedItem.enhancement) return;
          optionKeys.push(key);
          candidates.push({
            index: optionKeys.length - 1,
            tier: getItemTier(variant.item),
            enhancement: variant.item.enhancement,
            coreConcept: getItemCoreConceptValue(variant.item),
            superRare: variant.item.superRare,
            itemId: variant.item.id,
          });
        });

      const selectedIndex = selectBestAutoEquipmentUpgradeCandidate(candidates);
      return selectedIndex == null ? null : optionKeys[selectedIndex] ?? null;
    };

    const compareMemoryCJewelPriority = (
      a: { key: JewelKey; rank: number },
      b: { key: JewelKey; rank: number },
    ): number => {
      const rankDiff = b.rank - a.rank;
      if (rankDiff !== 0) return rankDiff;
      return a.key.localeCompare(b.key);
    };

    const compareJewelAttachTarget = (a: Item, b: Item): number => {
      const enhancementDiff = b.enhancement - a.enhancement;
      if (enhancementDiff !== 0) return enhancementDiff;

      const superRareDiff = b.superRare - a.superRare;
      if (superRareDiff !== 0) return superRareDiff;

      const coreConceptDiff = getItemCoreConceptValue(b) - getItemCoreConceptValue(a);
      if (coreConceptDiff !== 0) return coreConceptDiff;

      return compareItemsByTierAndEnhancement(b, a);
    };

    state.parties.forEach((party, partyIndex) => {
      if (targetPartyIndexSet && !targetPartyIndexSet.has(partyIndex)) return;

      const isJewelPriorityParty = state.global.jewelAutoEquipPriorityPartyId === party.id;

      party.characters.forEach((character) => {
        if (targetCharacterIdSet && !targetCharacterIdSet.has(character.id)) return;
        summary.processedCharacterIds.push(character.id);

        const autoEquipmentMode = normalizeAutoEquipmentMode(character.autoEquipmentMode);
        if (autoEquipmentMode === 0) {
          // SpecRef: 7.1.3.1 | Auto Assignment Order | 1-4
          if (isJewelPriorityParty) {
            const assignments = planAutoJewelAssignmentsForCharacter(character, state.global.jewels);
            assignments.forEach((assignment) => {
              actions.attachJewel(character.id, assignment.slotIndex, assignment.key, assignment.rank, partyIndex);
              summary.jewelAssignmentCount += 1;
            });
          }
          return;
        }

        // SpecRef: 7.1.1.2 | Equipping into empty slots | Item selection from a specific item category
        const combatStyle = decideAutoEquipmentCombatStyle(character);
        const priorities = AUTO_EQUIPMENT_PRIORITY_BY_CLASS[character.mainClassId] ?? AUTO_EQUIPMENT_PRIORITY_BY_CLASS.guardian;
        const { maxEquipSlots } = computeCharacterStats(character, party.level);
        const simulatedEquipmentSlots = Array.from({ length: maxEquipSlots }, (_, index) => character.equipment[index] ?? null);
        const memoryDEquipmentSlots = autoEquipmentMode === 2
          ? simulatedEquipmentSlots.map((item) => (item ? { ...item } : null))
          : null;
        const memoryCJewelsByCategory: Partial<Record<ItemCategory, Array<{ key: JewelKey; rank: number }>>> = {};

        if (autoEquipmentMode === 2) {
          // SpecRef: 7.1.1.1 | Removes all equipment | Record Memory C
          simulatedEquipmentSlots.forEach((equippedItem) => {
            if (!equippedItem?.jewel) return;
            const currentCategoryJewels = memoryCJewelsByCategory[equippedItem.category] ?? [];
            memoryCJewelsByCategory[equippedItem.category] = [...currentCategoryJewels, equippedItem.jewel];
          });

          // SpecRef: 8.2.4 | Equipment management | Lock and Unlock Item
          // SpecRef: 7.1.1.1 | Removes all equipment | Exception
          simulatedEquipmentSlots.forEach((equippedItem, slotIndex) => {
            if (!equippedItem) return;
            if (equippedItem.isLocked === true) return;
            if (equippedItem.superRare > 0) return;
            addItemToSimulatedInventory(equippedItem);
            actions.equipItem(character.id, slotIndex, null, partyIndex);
            summary.unequippedCount += 1;
            simulatedEquipmentSlots[slotIndex] = null;
          });
        }
        const memoryItemIds = new Set<number>();
        const memoryCBonusNames = new Set<string>();
        const emptySlotIndexes = simulatedEquipmentSlots
          .map((item, slotIndex) => (item ? -1 : slotIndex))
          .filter((index) => index >= 0);
        const equippedCategoryCounts: Partial<Record<ItemCategory, number>> = {};
        const resolvedFallbackTargetCounts: Partial<Record<'i.weapon' | 'i.NoA', number>> = {
          'i.weapon': 0,
          'i.NoA': 0,
        };
        const getResolvedCategoryCount = (targetCategory: AutoEquipmentTargetCategory): number => {
          if (
            combatStyle == null
            && (targetCategory === 'i.weapon' || targetCategory === 'i.NoA')
          ) {
            return resolvedFallbackTargetCounts[targetCategory] ?? 0;
          }
          const resolvedCategories = resolveAutoEquipmentTargetCategory(targetCategory, combatStyle);
          if (resolvedCategories.length === 0) return 0;
          return resolvedCategories.reduce((sum, category) => sum + (equippedCategoryCounts[category] ?? 0), 0);
        };
        simulatedEquipmentSlots.forEach((item) => {
          if (!item) return;
          memoryItemIds.add(item.id);
          getItemCBonusSignatures(item).forEach((bonusName) => memoryCBonusNames.add(bonusName));
          equippedCategoryCounts[item.category] = (equippedCategoryCounts[item.category] ?? 0) + 1;
        });

        if (autoEquipmentMode === 2) {
          emptySlotIndexes.forEach((slotIndex) => {
            const skippedCategories = new Set<AutoEquipmentTargetCategory>();
            let resolvedSelection: { itemKey: string; targetCategory: AutoEquipmentTargetCategory } | null = null;

            while (!resolvedSelection) {
              const targetCategory = getNextMissingAutoEquipmentCategory(
                priorities,
                equippedCategoryCounts,
                getResolvedCategoryCount,
                skippedCategories,
              );
              if (!targetCategory) break;

              const resolvedCategories = resolveAutoEquipmentTargetCategory(targetCategory, combatStyle);
              if (resolvedCategories.length === 0) {
                skippedCategories.add(targetCategory);
                continue;
              }

              const itemKey = getBestVariantKeyInCategory(character, resolvedCategories, memoryItemIds, memoryCBonusNames);
              if (!itemKey) {
                skippedCategories.add(targetCategory);
                continue;
              }

              resolvedSelection = { itemKey, targetCategory };
            }

            if (!resolvedSelection) return;

            const variant = simulatedInventory[resolvedSelection.itemKey];
            if (!variant) return;

            equippedCategoryCounts[variant.item.category] = (equippedCategoryCounts[variant.item.category] ?? 0) + 1;
            if (
              combatStyle == null
              && (resolvedSelection.targetCategory === 'i.weapon' || resolvedSelection.targetCategory === 'i.NoA')
            ) {
              resolvedFallbackTargetCounts[resolvedSelection.targetCategory] = (resolvedFallbackTargetCounts[resolvedSelection.targetCategory] ?? 0) + 1;
            }
            removeItemFromSimulatedInventory(resolvedSelection.itemKey);
            simulatedEquipmentSlots[slotIndex] = variant.item;
            memoryItemIds.add(variant.item.id);
            getItemCBonusSignatures(variant.item).forEach((bonusName) => memoryCBonusNames.add(bonusName));
            actions.equipItem(character.id, slotIndex, resolvedSelection.itemKey, partyIndex);
            summary.equippedCount += 1;
          });
        }

        simulatedEquipmentSlots.forEach((equippedItem, slotIndex) => {
          if (!equippedItem) return;
          if (equippedItem.isLocked === true) return;
          const itemKey = getBestUpgradeVariantKeyForItem(equippedItem);
          if (!itemKey) return;
          const variant = simulatedInventory[itemKey];
          if (!variant) return;

          removeItemFromSimulatedInventory(itemKey);
          addItemToSimulatedInventory(equippedItem);
          const nextEquippedItem = equippedItem.jewel
            ? { ...variant.item, jewel: equippedItem.jewel }
            : variant.item;
          simulatedEquipmentSlots[slotIndex] = nextEquippedItem;

          actions.equipItem(character.id, slotIndex, itemKey, partyIndex);
          summary.upgradedCount += 1;
          if (equippedItem.jewel) {
            actions.attachJewel(character.id, slotIndex, equippedItem.jewel.key, equippedItem.jewel.rank, partyIndex);
          }
          if (autoEquipmentMode !== 2) {
            queueAutoEquipmentNotification(
              party.name,
              character.name,
              character.id,
              slotIndex,
              nextEquippedItem,
              equippedItem,
              partyIndex,
            );
          }
        });

        Object.entries(memoryCJewelsByCategory).forEach(([category, jewels]) => {
          if (!jewels || jewels.length <= 0) return;

          const sortedJewels = [...jewels].sort(compareMemoryCJewelPriority);
          const attachTargets = simulatedEquipmentSlots
            .map((item, slotIndex) => ({ item, slotIndex }))
            .filter((entry): entry is { item: Item; slotIndex: number } => !!entry.item && entry.item.category === category)
            .sort((a, b) => compareJewelAttachTarget(a.item, b.item));

          const categoryAllowedJewels = new Set(JEWELS_BY_ITEM_CATEGORY[category as ItemCategory] ?? []);

          let jewelIndex = 0;
          attachTargets.forEach(({ slotIndex, item }) => {
            while (jewelIndex < sortedJewels.length && !categoryAllowedJewels.has(sortedJewels[jewelIndex].key)) {
              jewelIndex += 1;
            }
            if (jewelIndex >= sortedJewels.length) return;

            const jewel = sortedJewels[jewelIndex];
            jewelIndex += 1;
            simulatedEquipmentSlots[slotIndex] = { ...item, jewel };
            actions.attachJewel(character.id, slotIndex, jewel.key, jewel.rank, partyIndex);
            summary.jewelAssignmentCount += 1;
          });
        });

        // SpecRef: 7.1.3.1 | Auto Assignment Order | 1-4
        if (isJewelPriorityParty) {
          const simulatedCharacterForJewel = {
            ...character,
            equipment: simulatedEquipmentSlots,
          };
          const assignments = planAutoJewelAssignmentsForCharacter(simulatedCharacterForJewel, state.global.jewels);
          assignments.forEach((assignment) => {
            const slotItem = simulatedEquipmentSlots[assignment.slotIndex];
            if (!slotItem) return;
            simulatedEquipmentSlots[assignment.slotIndex] = {
              ...slotItem,
              jewel: { key: assignment.key, rank: assignment.rank },
            };
            actions.attachJewel(character.id, assignment.slotIndex, assignment.key, assignment.rank, partyIndex);
            summary.jewelAssignmentCount += 1;
          });
        }

        if (autoEquipmentMode === 2 && memoryDEquipmentSlots) {
          const hasSlotChange = simulatedEquipmentSlots.some((equippedItem, slotIndex) => {
            const previousItem = memoryDEquipmentSlots[slotIndex] ?? null;
            return !areEquipmentEntitiesEqual(previousItem, equippedItem);
          });
          if (!hasSlotChange) return;

          const { removedItems, addedItems } = collectEquipmentDiff(memoryDEquipmentSlots, simulatedEquipmentSlots);

          const replacementCount = Math.min(removedItems.length, addedItems.length);
          for (let index = 0; index < replacementCount; index += 1) {
            queueAutoEquipmentNotification(
              party.name,
              character.name,
              character.id,
              index,
              addedItems[index],
              removedItems[index],
              partyIndex,
            );
          }

          for (let index = replacementCount; index < addedItems.length; index += 1) {
            queueAutoEquipmentNotification(
              party.name,
              character.name,
              character.id,
              replacementCount * 1000 + index,
              addedItems[index],
              null,
              partyIndex,
            );
          }
        }
      });
    });

    const shouldSuppressAutoEquipmentNotifications = options?.suppressNotifications
      || pendingAfkMsRef.current > 0
      || shouldShowAfkSummaryRef.current
      || justCompletedAfkRecoveryRef.current;

    if (shouldSuppressAutoEquipmentNotifications) return summary;

    slotNotifications.forEach(({ message, partyIndex }) => {
      if (state.parties[partyIndex]?.diarySettings.notifyAutoEquipmentPopup === false) return;
      actions.addNotification(message, 'normal', 'item', true, {
        rarity: 'common',
        isSuperRareItem: false,
      });
    });
    return summary;
  }, [actions, state.global.inventory, state.parties]);

  apiAutoEquipmentRunnerRef.current = runAutoEquipment;

  const updateAfkTraceCoordinator = useCallback((canonicalJobId: string | null = null) => {
    const activeJobs = [...afkActiveChunkJobsRef.current.values()];
    afkRuntimeTrace.updateCoordinator({
      pendingAfkMs: pendingAfkMsRef.current,
      completedResultCount: afkCompletedChunkResultsRef.current.size,
      workerPoolSize: afkWorkerPoolRef.current.length,
      canonicalJobId,
      activeJobs: activeJobs.map(({ job, status, startedMonotonicAt }) => ({
        jobId: job.jobId,
        partyId: job.partyId,
        partyIndex: job.partyIndex,
        status,
        startedMonotonicAt,
        simulatedCompletedAt: job.simulatedCompletedAt,
      })),
    });
  }, []);

  const completeAfkCommitTransaction = useCallback((result: AfkPartyChunkResult) => {
    const transactionStartedAt = afkActiveCommitTransactionRef.current?.startedAt ?? performance.now();
    const chunkElapsedMs = result.cycleDurationMs * AFK_CHUNK_CYCLE_COUNT;
    afkRemainingMsByPartyRef.current[result.partyIndex] = Math.max(
      0,
      (afkRemainingMsByPartyRef.current[result.partyIndex] ?? 0) - chunkElapsedMs,
    );
    afkActiveCommitTransactionRef.current = null;
    const remaining = Object.values(afkRemainingMsByPartyRef.current);
    pendingAfkMsRef.current = remaining.length > 0 ? Math.max(...remaining) : 0;
    setPendingAfkMs(pendingAfkMsRef.current);
    const battles = Object.values(result.globalDelta.enemyBattleStats)
      .reduce((total, value) => total + Math.max(0, value.encounters), 0);
    memoryMonitor.markChunkComplete(battles);
    afkRuntimeTrace.record('commit_transaction_complete', {
      phase: 'commit_awaiting_react',
      partyId: result.partyId,
      partyIndex: result.partyIndex,
      jobId: result.jobId,
      durationMs: performance.now() - transactionStartedAt,
      progress: true,
      data: { pendingAfkMs: pendingAfkMsRef.current },
    });
    updateAfkTraceCoordinator();
    setAfkCoordinatorVersion((version) => version + 1);
  }, [updateAfkTraceCoordinator]);

  useEffect(() => {
    const previousPartyCount = prevPartyCountRef.current;
    prevPartyCountRef.current = state.parties.length;

    if (state.parties.length <= previousPartyCount) return;

    const newlyUnlockedPartyIndexes = Array.from(
      { length: state.parties.length - previousPartyCount },
      (_, offset) => previousPartyCount + offset,
    );
    runAutoEquipment(newlyUnlockedPartyIndexes);
  }, [runAutoEquipment, state.parties.length]);

  const setAutoRepeatEnabled = useCallback((nextEnabled: boolean) => {
    autoRepeatEnabledRef.current = nextEnabled;
    setIsAutoRepeatEnabled(nextEnabled);
    if (!nextEnabled) return;

    setPartyCycles((prevCycles) => {
      const nextCycles = { ...prevCycles };
      const now = Date.now();
      state.parties.forEach((party, partyIndex) => {
        const runtime = nextCycles[partyIndex] ?? { state: 'idle' as PartyCycleState, stateStartedAt: now, durationMs: 1000 };
        if (runtime.state === 'idle') {
          nextCycles[partyIndex] = {
            state: 'move',
            stateStartedAt: now,
            durationMs: getPartyTravelDurationMs(party, 'move'),
            sortieSourceState: undefined,
            sortieEmbezzlementGold: undefined,
          };
        }
      });
      return nextCycles;
    });
  }, [state.parties]);

  const handleResetGame = useCallback(() => {
    afkRuntimeTrace.cancelRecovery('game_reset');
    autoRepeatEnabledRef.current = true;
    setIsAutoRepeatEnabled(true);
    setPartyCycles({});
    pendingAfkSimulationRef.current = false;
    setPendingAfkMs(0);
    pendingAfkMsRef.current = 0;
    hasObservedActiveAfkRecoveryRef.current = false;
    shouldRebuildPartyCyclesAfterAfkRef.current = false;
    afkSimulationAnchorRef.current = null;
    afkRecoveryTotalMsRef.current = 0;
    afkChunkCursorRef.current = null;
    afkRemainingMsByPartyRef.current = {};
    afkActiveChunkJobsRef.current.forEach(({ job }) => {
      memoryMonitor.releaseWorker(job.jobId);
    });
    terminateAfkWorkers(afkWorkerPoolRef.current.map(({ worker }) => worker), 'reset');
    afkWorkerPoolRef.current = [];
    afkActiveChunkJobsRef.current.clear();
    afkCompletedChunkResultsRef.current.clear();
    updateAfkTraceCoordinator();
    try {
      localStorage.removeItem(AFK_RUNTIME_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear AFK runtime state:', error);
    }
    actions.resetGame();
  }, [actions, updateAfkTraceCoordinator]);

  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    if (state.parties.length === 0) return;
    if (state.selectedPartyIndex !== safeSelectedPartyIndex) {
      actions.selectParty(safeSelectedPartyIndex);
    }
  }, [actions, safeSelectedPartyIndex, state.parties.length, state.selectedPartyIndex]);

  const afkSummaryBaselineRef = useRef<AfkSummaryStats[] | null>(null);
  const shouldShowAfkSummaryRef = useRef(false);
  const { partyStats, characterStats } = computePartyStats(currentParty);

  useEffect(() => {
    preloadRaceIcons();
  }, []);

  useEffect(() => {
    try {
      if (getEnvironmentId() === 'beta') {
        setGameMode('m.laika');
        return;
      }
      const savedMode = localStorage.getItem(GAME_MODE_STORAGE_KEY);
      if (savedMode === 'm.kemo' || savedMode === 'm.luna' || savedMode === 'm.laika') {
        setGameMode(savedMode);
      }
    } catch (error) {
      console.error('Failed to load game mode:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedMode = getEnvironmentId() === 'beta' ? 'm.laika' : gameMode;
      if (getEnvironmentId() === 'beta' && gameMode !== 'm.laika') {
        setGameMode('m.laika');
      }
      localStorage.setItem(GAME_MODE_STORAGE_KEY, storedMode);
      window.dispatchEvent(new Event(THEME_SYNC_EVENT));
    } catch (error) {
      console.error('Failed to persist game mode:', error);
    }
  }, [gameMode]);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_EQUIPMENT_STORAGE_KEY, isAutoEquipmentEnabled ? 'on' : 'off');
    } catch (error) {
      console.error('Failed to persist auto equipment setting:', error);
    }
  }, [isAutoEquipmentEnabled]);

  useEffect(() => {
    if (hasHydratedAfkRef.current) return;
    hasHydratedAfkRef.current = true;

    try {
      const savedRuntime = localStorage.getItem(AFK_RUNTIME_STORAGE_KEY);
      if (!savedRuntime) return;

      const parsed = normalizeRuntimeSnapshot(JSON.parse(savedRuntime), latestPartiesRef.current.length);
      if (!parsed) throw new Error('Invalid AFK runtime snapshot.');

      const elapsedMs = Math.max(0, Math.min(Date.now() - parsed.checkpointAt, AFK_MAX_ELAPSED_MS));
      lastCheckpointAtRef.current = Date.now() - elapsedMs;

      setAutoRepeatEnabled(parsed.autoRepeatEnabled);
      const restoredPendingAfkMs = parsed.pendingAfkMs;
      if (restoredPendingAfkMs > 0) {
        // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Debug-only runtime trace
        afkRuntimeTrace.startRecovery({
          source: 'restored_checkpoint',
          pendingAfkMs: restoredPendingAfkMs,
          partyCount: latestPartiesRef.current.length,
        });
        pendingAfkMsRef.current = restoredPendingAfkMs;
        setPendingAfkMs(restoredPendingAfkMs);
        afkSchedulerProfileRef.current = {
          ...createAfkSchedulerProfile(),
          recoveredElapsedMs: restoredPendingAfkMs,
          activePartyCount: latestPartiesRef.current.length,
        };
        afkAverageOperationDurationMsRef.current = null;
        // SpecRef: 5.1.1 | Party State Machine | Refresh Handling
        // Reset `state.reactivate` main-progress on refresh and resume counting from 0.
        afkRecoveryTotalMsRef.current = restoredPendingAfkMs;
        afkRecoveryCompletedMsRef.current = 0;
        afkSimulationAnchorRef.current = parsed.afkSimulationAnchor ?? Date.now();
        const restoredSummaryBaseline = parsed.afkSummaryBaseline ?? [];
        afkSummaryBaselineRef.current = restoredSummaryBaseline.length > 0
          ? latestPartiesRef.current.map((party, index) => restoredSummaryBaseline[index] ?? { ...party.expeditionStats })
          : latestPartiesRef.current.map((party) => ({ ...party.expeditionStats }));
        shouldShowAfkSummaryRef.current = parsed.shouldShowAfkSummary;
        afkChunkCursorRef.current = parsed.afkChunkCursor;
        afkRemainingMsByPartyRef.current = parsed.afkRemainingMsByParty
          ?? Object.fromEntries(latestPartiesRef.current.map((_, partyIndex) => [partyIndex, restoredPendingAfkMs]));
        shouldRebuildPartyCyclesAfterAfkRef.current = true;
      }
      setPartyCycles(parsed.partyCycles);
    } catch (error) {
      console.error('Failed to restore AFK runtime state:', error);
    } finally {
      pendingAfkSimulationRef.current = false;
    }
  }, [setAutoRepeatEnabled]);

  useEffect(() => {
    // Hydration schedules the restored backlog for the next render. Preserve the
    // synchronously restored ref (and active recovery profile) until that positive
    // backlog has actually been observed by React.
    if (
      pendingAfkMs === 0
      && pendingAfkMsRef.current > 0
      && !hasObservedActiveAfkRecoveryRef.current
    ) return;

    pendingAfkMsRef.current = pendingAfkMs;
    afkRecoveryCompletedMsRef.current = pendingAfkMs > 0
      ? Math.max(0, afkRecoveryTotalMsRef.current - pendingAfkMs)
      : 0;
    if (pendingAfkMs === 0 && afkSchedulerProfileRef.current?.completedAt === null) {
      const completedAt = performance.now();
      afkSchedulerProfileRef.current = {
        ...afkSchedulerProfileRef.current,
        completedAt,
        totalRecoveryDurationMs: Math.max(0, completedAt - afkSchedulerProfileRef.current.startedAt),
      };
      if (import.meta.env.DEV) {
        (window as Window & { __BOKEMO_AFK_PROFILE__?: AfkSchedulerProfile }).__BOKEMO_AFK_PROFILE__ = afkSchedulerProfileRef.current;
      }
    }
  }, [pendingAfkMs]);

  // SpecRef: 9.1.2 | macOS menu-bar Party Progress pane | read-only Party Progress snapshot
  useEffect(() => {
    const desktop = window.bokemoDesktop;
    if (!desktop) return;

    const now = Date.now();
    const parties: DesktopPartyProgressPartySnapshot[] = state.parties.map((party, partyIndex) => {
      const cycle = partyCycles[partyIndex] ?? { state: 'idle' as PartyCycleState, stateStartedAt: now, durationMs: 1000 };
      const elapsedMs = Math.max(0, now - cycle.stateStartedAt);
      const { partyStats } = computePartyStats(party);
      const maxHp = Math.max(1, Math.floor(partyStats.hp));
      const expeditionLog = party.lastExpeditionLog;
      let currentHp = Math.max(0, Math.min(maxHp, Math.floor(party.currentHp)));
      let progress: DesktopPartyProgressValue = { kind: 'none' };
      let subProgress: DesktopPartyProgressValue = { kind: 'none' };

      if (cycle.state === 'explore') {
        const visibleCount = expeditionLog
          ? getExplorationVisibleRoomCount(elapsedMs, cycle.durationMs, expeditionLog.entries.length)
          : 0;
        const visibleEntry = expeditionLog?.entries[Math.max(0, visibleCount - 1)];
        if (visibleEntry) currentHp = Math.max(0, Math.min(maxHp, Math.floor(visibleEntry.remainingPartyHP)));
        progress = {
          kind: 'steps',
          completed: Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, visibleCount),
          total: EXPLORING_PROGRESS_TOTAL_STEPS,
        };
      } else if (cycle.state === 'rest') {
        const total = Math.max(1, cycle.restInitialTotalSteps ?? 1);
        const healPerStep = Math.max(REST_HEAL_MIN_HP, Math.ceil(maxHp * REST_HEAL_MAX_HP_RATIO));
        const remaining = Math.max(0, Math.ceil((maxHp - currentHp) / healPerStep));
        progress = { kind: 'steps', completed: Math.max(0, Math.min(total, total - remaining)), total };
      } else if (cycle.state === 'sell') {
        const total = getAutoSellStepCount(party);
        progress = {
          kind: 'steps',
          completed: Math.min(total, Math.floor((elapsedMs / Math.max(1, cycle.durationMs)) * total)),
          total,
        };
      } else if (cycle.state !== 'idle' && cycle.state !== 'reactivate') {
        progress = {
          kind: 'continuous',
          startedAt: cycle.stateStartedAt,
          endsAt: cycle.stateStartedAt + Math.max(1, cycle.durationMs),
        };
      }

      if (STEP_BASED_STATES.has(cycle.state)) {
        const stepTotal = cycle.state === 'rest'
          ? Math.max(1, cycle.restInitialTotalSteps ?? 1)
          : cycle.state === 'sell'
            ? getAutoSellStepCount(party)
            : Math.max(1, expeditionLog?.entries.length ?? 1);
        const stepDurationMs = cycle.state === 'rest'
          ? Math.max(1, cycle.durationMs)
          : Math.max(1, cycle.durationMs / stepTotal);
        const completedStepCount = Math.floor(elapsedMs / stepDurationMs);
        const stepStartedAt = cycle.stateStartedAt + completedStepCount * stepDurationMs;
        subProgress = { kind: 'continuous', startedAt: stepStartedAt, endsAt: stepStartedAt + stepDurationMs };
      }

      if (cycle.state !== 'explore') {
        partyProgressDisclosedLogsRef.current[partyIndex] = expeditionLog ?? null;
      }
      const disclosedLog = partyProgressDisclosedLogsRef.current[partyIndex] ?? null;
      const latestDisclosedEntry = disclosedLog?.entries[disclosedLog.entries.length - 1];
      const headlineFloorName = latestDisclosedEntry?.floor
        ? getLocalizedExpeditionFloorConcept(disclosedLog!.dungeonId, latestDisclosedEntry.floor)
          ?? t('expedition.floor', { floor: formatNumber(latestDisclosedEntry.floor) })
        : disclosedLog?.dungeonName
          ?? DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId)?.name
          ?? '-';
      const chargeDisplay = formatInstantExpeditionChargeDisplay(getInstantExpeditionChargeState(party, now));
      const compactProgressItems = getCompactProgressItems(
        party,
        getTimeSpeedScale(debugSettings),
        now,
        cycle.state,
      ).map((item) => ({ text: item.compactText, progressRatio: item.progressRatio }));

      return {
        id: party.id,
        name: party.name,
        state: cycle.state,
        stateLabel: getPartyCycleStateLabel(cycle.state),
        headlineFloorName,
        outcomeLabel: disclosedLog ? getExpeditionOutcomeLabel(disclosedLog.finalOutcome) : '',
        chargeCells: chargeDisplay.cells,
        chargeTimerText: chargeDisplay.timerText,
        compactProgressItems,
        currentHp,
        maxHp,
        progress,
        subProgress,
      };
    });

    const snapshotWithoutTimestamp = {
      schemaVersion: 1 as const,
      environment: getEnvironmentId(),
      language: state.global.language,
      unreadDiaryCount: state.parties.reduce((count, party) => (
        count + party.diaryLogs.reduce((partyCount, log) => partyCount + (log.isRead ? 0 : 1), 0)
      ), 0),
      theme: (
        gameMode === 'm.laika'
          ? (isDarkModeEnabled ? 'laika-dark' : 'laika')
          : gameMode === 'm.luna'
            ? (isDarkModeEnabled ? 'luna-dark' : 'luna')
            : isDarkModeEnabled ? 'dark' : 'light'
      ) as DesktopPartyProgressSnapshot['theme'],
      parties,
    };
    const snapshotHash = JSON.stringify(snapshotWithoutTimestamp);
    if (snapshotHash === lastPartyProgressSnapshotHashRef.current) return;
    lastPartyProgressSnapshotHashRef.current = snapshotHash;
    void desktop.updatePartyProgressPane({
      ...snapshotWithoutTimestamp,
      updatedAt: Date.now(),
    }).then((accepted) => {
      if (!accepted) {
        lastPartyProgressSnapshotHashRef.current = '';
        console.warn('Party Progress pane rejected its latest snapshot.');
      }
    }).catch((error) => {
      lastPartyProgressSnapshotHashRef.current = '';
      console.error('Failed to publish Party Progress pane snapshot:', error);
    });
  }, [gameMode, isDarkModeEnabled, partyCycles, pendingAfkMs, state.global.language, state.parties]);

  // SpecRef: 9.1.1 | macOS background lifecycle and native notifications | Diary-filtered native notifications
  useEffect(() => {
    const desktop = window.bokemoDesktop;
    const processedIds = processedNativeDiaryIdsRef.current;
    if (!desktop || !processedIds) return;
    if (pendingAfkMs > 0) {
      nativeAfkRecoveryRef.current = true;
      return;
    }

    const newLogs = state.parties
      .flatMap((party, partyIndex) => party.diaryLogs.map((log) => ({ party, partyIndex, log })))
      .filter(({ log }) => !processedIds.has(log.id))
      .sort((a, b) => a.log.createdAt - b.log.createdAt);
    if (newLogs.length === 0) {
      nativeAfkRecoveryRef.current = false;
      return;
    }

    newLogs.forEach(({ log }) => processedIds.add(log.id));
    saveProcessedDiaryIds(processedIds);
    const wasAfkRecovery = nativeAfkRecoveryRef.current;
    nativeAfkRecoveryRef.current = false;
    const preferences = getDesktopPreferences();
    if (!preferences.nativeNotificationsEnabled) return;

    void desktop.getWindowVisibility().then(async (isVisible) => {
      if (preferences.nativeNotificationMode === 'hiddenOnly' && isVisible) return;
      if (wasAfkRecovery) {
        await desktop.showNotification({
          id: `afk-${Date.now()}`,
          title: t('desktopNotification.afkTitle'),
          body: t('desktopNotification.afkBody', { count: newLogs.length }),
          kind: 'afkSummary',
        });
        return;
      }

      await Promise.all(newLogs.map(({ party, partyIndex, log }) => {
        const primaryTrigger = log.triggers[0] ?? 'unlock';
        const droppedItemTitle = getDesktopNotificationRewardItems(log)
          .map((item) => getItemDisplayName(item))
          .join('、');
        return desktop.showNotification({
          id: log.id,
          title: droppedItemTitle || t(`desktopNotification.trigger.${primaryTrigger}`),
          body: t('desktopNotification.diaryBody', {
            party: `PT${partyIndex + 1}`,
            dungeon: log.unlockDetail ?? log.sideQuestDetail ?? log.expeditionLog.dungeonName,
          }),
          kind: 'diary',
          partyId: party.id,
          diaryLogId: log.id,
        });
      }));
    }).catch((error) => console.error('Failed to deliver desktop notification:', error));
  }, [pendingAfkMs, state.parties]);

  useEffect(() => {
    const desktop = window.bokemoDesktop;
    if (!desktop) return;
    return desktop.onNotificationActivated((payload) => {
      const partyIndex = payload.partyId === undefined
        ? state.selectedPartyIndex
        : state.parties.findIndex((party) => party.id === payload.partyId);
      if (partyIndex >= 0) actions.selectParty(partyIndex);
      if (isPartyExpeditionSplitViewEnabled) {
        setActiveWideModeSecondaryTab('diary');
      } else {
        setActiveTab('diary');
      }
      if (payload.diaryLogId) {
        setDiaryExpandedLogs((previous) => ({ ...previous, [payload.diaryLogId!]: true }));
        actions.markDiaryLogSeen(payload.diaryLogId);
      }
    });
  }, [actions, isPartyExpeditionSplitViewEnabled, state.parties, state.selectedPartyIndex]);

  useEffect(() => {
    const desktop = window.bokemoDesktop;
    if (!desktop) return;
    return desktop.onPartyProgressPartyActivated((partyId) => {
      const partyIndex = state.parties.findIndex((party) => party.id === partyId);
      if (partyIndex < 0) return;
      actions.selectParty(partyIndex);
      setActiveTab('expedition');
    });
  }, [actions, state.parties]);

  useEffect(() => {
    if (pendingAfkMs > 0) return;
    if (!shouldShowAfkSummaryRef.current) return;
    const baselineStats = afkSummaryBaselineRef.current;
    if (!baselineStats) return;

    shouldShowAfkSummaryRef.current = false;
    afkSummaryBaselineRef.current = null;

    state.parties.forEach((party, partyIndex) => {
      const baseline = baselineStats[partyIndex];
      if (!baseline) return;

      const stats = {
        Clear: Math.max(0, party.expeditionStats.Clear - baseline.Clear),
        Turned_Back: Math.max(0, party.expeditionStats.Turned_Back - baseline.Turned_Back),
        Draw_Retreat: Math.max(0, party.expeditionStats.Draw_Retreat - baseline.Draw_Retreat),
        Wounded_Retreat: Math.max(0, party.expeditionStats.Wounded_Retreat - baseline.Wounded_Retreat),
        Defeat: Math.max(0, party.expeditionStats.Defeat - baseline.Defeat),
        donatedGold: Math.max(0, party.expeditionStats.donatedGold - baseline.donatedGold),
        savedGold: Math.max(0, party.expeditionStats.savedGold - baseline.savedGold),
      };

      const body = buildAfkSummaryNotification(stats);
      if (!body) return;

      if (party.diarySettings.notifyCyclePopup) {
        actions.addNotification(`PT${partyIndex + 1}: ${body}`);
      }
    });
  }, [actions, pendingAfkMs, state.parties]);

  useEffect(() => {
    const measurement = afkBatchMeasurementRef.current;
    if (!measurement) return;
    afkBatchMeasurementRef.current = null;

    const committedAt = performance.now();
    const durationMs = Math.max(0, committedAt - measurement.startedAt);
    const durationPerOperationMs = durationMs / Math.max(1, measurement.operationCount);
    const previousAverage = afkAverageOperationDurationMsRef.current;
    afkAverageOperationDurationMsRef.current = previousAverage === null
      ? durationPerOperationMs
      : (previousAverage * 0.7) + (durationPerOperationMs * 0.3);
    afkLastBatchCommittedAtRef.current = committedAt;

    const profile = afkSchedulerProfileRef.current ?? createAfkSchedulerProfile(measurement.startedAt);
    afkSchedulerProfileRef.current = recordAfkSchedulerBatch(
      profile,
      durationMs,
      measurement.operationCount,
      Math.max(0, measurement.startedAt - measurement.scheduledAt),
    );
    if (import.meta.env.DEV) {
      (window as Window & { __BOKEMO_AFK_PROFILE__?: AfkSchedulerProfile }).__BOKEMO_AFK_PROFILE__ = afkSchedulerProfileRef.current;
    }
  }, [state]);

  useEffect(() => {
    const transaction = afkActiveCommitTransactionRef.current;
    if (!transaction) return;

    if (!transaction.capturedSettingChanges) {
      // React queues these equipment mutations before the coordinator version
      // update below. Completing in this effect therefore retains the slot until
      // the Chunk commit is visible, while avoiding a second state-change signal
      // that may never arrive when an equipment action is rejected as a no-op.
      const autoEquipmentStartedAt = performance.now();
      afkRuntimeTrace.record('auto_equipment_start', {
        phase: 'auto_equipment',
        partyId: transaction.result.partyId,
        partyIndex: transaction.result.partyIndex,
        jobId: transaction.result.jobId,
      });
      const summary = runAutoEquipment(
        [transaction.result.partyIndex],
        undefined,
        { suppressNotifications: true },
      );
      afkRuntimeTrace.record('auto_equipment_complete', {
        phase: 'auto_equipment',
        partyId: transaction.result.partyId,
        partyIndex: transaction.result.partyIndex,
        jobId: transaction.result.jobId,
        durationMs: performance.now() - autoEquipmentStartedAt,
        progress: true,
        data: {
          processedCharacters: summary.processedCharacterIds.length,
          unequippedCount: summary.unequippedCount,
          equippedCount: summary.equippedCount,
          upgradedCount: summary.upgradedCount,
          jewelAssignmentCount: summary.jewelAssignmentCount,
        },
      });
    } else {
      afkRuntimeTrace.record('auto_equipment_skipped', {
        phase: 'commit_awaiting_react',
        partyId: transaction.result.partyId,
        partyIndex: transaction.result.partyIndex,
        jobId: transaction.result.jobId,
        data: { reason: 'captured_setting_changes' },
      });
    }

    completeAfkCommitTransaction(transaction.result);
  }, [completeAfkCommitTransaction, runAutoEquipment, state]);

  useEffect(() => {
    if (pendingAfkMs <= 0) return;
    if (afkInteractionPausedRef.current) {
      afkRuntimeTrace.setPhase('interaction_pause');
      updateAfkTraceCoordinator();
      return;
    }
    if (afkActiveCommitTransactionRef.current) {
      afkRuntimeTrace.setPhase('commit_awaiting_react');
      updateAfkTraceCoordinator(afkActiveCommitTransactionRef.current.result.jobId);
      return;
    }
    // v0.9.2 persisted a cross-party operation cursor. Party-scoped workers
    // restart only the uncommitted legacy slice from its durable game-state save.
    afkChunkCursorRef.current = null;

    if (!autoRepeatEnabledRef.current) {
      afkRemainingMsByPartyRef.current = {};
      setPendingAfkMs(0);
      return;
    }

    if (Object.keys(afkRemainingMsByPartyRef.current).length === 0) {
      afkRemainingMsByPartyRef.current = Object.fromEntries(
        state.parties.map((_, partyIndex) => [partyIndex, pendingAfkMsRef.current]),
      );
    }

    const activeJobs = Array.from(afkActiveChunkJobsRef.current.values()).map(({ job }) => job);
    if (activeJobs.length > 0) {
      const nextCanonicalJob = [...activeJobs].sort((left, right) => compareAfkChunkResults(left, right))[0];
      updateAfkTraceCoordinator(nextCanonicalJob.jobId);
      const completedResult = afkCompletedChunkResultsRef.current.get(nextCanonicalJob.jobId);
      if (completedResult) {
        const headOfLineWait = afkHeadOfLineWaitRef.current;
        if (headOfLineWait) {
          afkRuntimeTrace.record('canonical_order_wait_end', {
            phase: 'canonical_order_wait',
            jobId: headOfLineWait.blockerJobId,
            durationMs: performance.now() - headOfLineWait.startedAt,
            progress: true,
          });
          afkHeadOfLineWaitRef.current = null;
        }
        afkActiveChunkJobsRef.current.delete(completedResult.partyIndex);
        afkCompletedChunkResultsRef.current.delete(completedResult.jobId);
        afkLastBatchCommittedAtRef.current = performance.now();
        const profile = afkSchedulerProfileRef.current ?? createAfkSchedulerProfile();
        afkSchedulerProfileRef.current = recordAfkSchedulerBatch(
          profile,
          completedResult.durationMs,
          AFK_CHUNK_CYCLE_COUNT,
        );
        const baseParty = completedResult.baseParty;
        const liveParty = state.parties.find((party) => party.id === completedResult.partyId)
          ?? state.parties[completedResult.partyIndex];
        const capturedSettingChanges = Boolean(
          baseParty
          && liveParty
          && hasPendingPartySettingChanges(baseParty, liveParty),
        );
        afkRuntimeTrace.record('commit_transaction_start', {
          phase: 'commit_dispatch',
          partyId: completedResult.partyId,
          partyIndex: completedResult.partyIndex,
          jobId: completedResult.jobId,
          progress: true,
          data: {
            capturedSettingChanges,
            completedResultCount: afkCompletedChunkResultsRef.current.size,
          },
        });
        afkActiveCommitTransactionRef.current = {
          result: completedResult,
          capturedSettingChanges,
          startedAt: performance.now(),
        };
        actions.commitAfkPartyChunk(completedResult);
        afkRuntimeTrace.record('commit_reducer_dispatched', {
          phase: 'commit_awaiting_react',
          partyId: completedResult.partyId,
          partyIndex: completedResult.partyIndex,
          jobId: completedResult.jobId,
        });
        return;
      }
      if (afkCompletedChunkResultsRef.current.size > 0) {
        if (afkHeadOfLineWaitRef.current?.blockerJobId !== nextCanonicalJob.jobId) {
          afkHeadOfLineWaitRef.current = {
            blockerJobId: nextCanonicalJob.jobId,
            startedAt: performance.now(),
          };
          afkRuntimeTrace.record('canonical_order_wait_start', {
            phase: 'canonical_order_wait',
            partyId: nextCanonicalJob.partyId,
            partyIndex: nextCanonicalJob.partyIndex,
            jobId: nextCanonicalJob.jobId,
            data: { completedResultCount: afkCompletedChunkResultsRef.current.size },
          });
        } else {
          afkRuntimeTrace.setPhase('canonical_order_wait');
        }
      } else {
        afkRuntimeTrace.setPhase('worker_execution');
      }
    }

    const durationScale = Math.max(0.001, getTimeSpeedScale(debugSettings));
    const anchor = afkSimulationAnchorRef.current ?? Date.now();
    const workerLimit = getAfkWorkerPoolLimit(navigator.hardwareConcurrency, state.parties.length);
    let startedJob = false;

    state.parties.forEach((party, partyIndex) => {
      if (afkActiveChunkJobsRef.current.has(partyIndex)) return;
      const cycleDurationMs = getApproxAfkCycleDurationMs(party, durationScale);
      const chunkElapsedMs = cycleDurationMs * AFK_CHUNK_CYCLE_COUNT;
      const remainingMs = afkRemainingMsByPartyRef.current[partyIndex] ?? 0;
      if (remainingMs < chunkElapsedMs) return;

      let poolSlot = afkWorkerPoolRef.current.find((slot) => slot.jobId === null);
      if (!poolSlot && afkWorkerPoolRef.current.length < workerLimit) {
        const createdAt = performance.now();
        poolSlot = {
          worker: new Worker(new URL('../workers/afkChunkWorker.ts', import.meta.url), { type: 'module' }),
          jobId: null,
          createdAt,
          completedJobs: 0,
        };
        afkWorkerPoolRef.current.push(poolSlot);
        afkRuntimeTrace.record('worker_created', {
          phase: 'worker_queue',
          durationMs: 0,
          data: { workerPoolSize: afkWorkerPoolRef.current.length, workerLimit },
        });
      }
      if (!poolSlot) return;

      const simulatedStartedAt = anchor - remainingMs;
      const job: AfkPartyChunkJob = {
        jobId: `afk-${party.id}-${++afkWorkerJobSequenceRef.current}`,
        partyIndex,
        partyId: party.id,
        simulatedStartedAt,
        simulatedCompletedAt: simulatedStartedAt + chunkElapsedMs,
        cycleDurationMs,
        baseState: state,
        gameMode,
        cycleDurationScale: durationScale,
        queuedAt: performance.now(),
        workerCreatedAt: poolSlot.createdAt,
        isFirstWorkerJob: poolSlot.completedJobs === 0,
      };
      // Exact structured-clone sizing belongs in the opt-in Expedition 8 profiler.
      // The automatic dev/beta trace must remain observational and must not
      // stringify the complete state before every worker submission.
      const worker = poolSlot.worker;
      const { baseState: _releasedBaseState, ...jobMetadata } = job;
      const jobId = job.jobId;
      poolSlot.jobId = jobId;
      memoryMonitor.registerWorker(jobId);
      worker.onmessage = (event: MessageEvent<
        | { type: 'started'; jobId: string; partyIndex: number }
        | { type: 'complete'; result: AfkPartyChunkResult }
        | { type: 'error'; jobId: string; message: string }
      >) => {
        const eventJobId = event.data.type === 'complete' ? event.data.result.jobId : event.data.jobId;
        const currentSlot = afkWorkerPoolRef.current.find((slot) => slot.worker === worker);
        if (!currentSlot || currentSlot.jobId !== eventJobId) return;
        if (event.data.type === 'started') {
          const active = afkActiveChunkJobsRef.current.get(event.data.partyIndex);
          if (active) active.status = 'running';
          afkRuntimeTrace.record('worker_job_started', {
            phase: 'worker_execution',
            partyId: job.partyId,
            partyIndex: job.partyIndex,
            jobId,
            durationMs: performance.now() - (job.queuedAt ?? performance.now()),
            progress: true,
          });
          updateAfkTraceCoordinator();
          return;
        }
        currentSlot.jobId = null;
        if (event.data.type === 'complete') {
          currentSlot.completedJobs += 1;
          recordAfkWorkerJobTelemetry(event.data.result.jobId, event.data.result.workerTelemetry);
          memoryMonitor.releaseWorker(event.data.result.jobId);
          const active = afkActiveChunkJobsRef.current.get(partyIndex);
          if (active) {
            active.worker = null;
            active.status = 'completed';
          }
          afkCompletedChunkResultsRef.current.set(event.data.result.jobId, event.data.result);
          afkRuntimeTrace.record('worker_job_complete', {
            phase: 'worker_execution',
            partyId: event.data.result.partyId,
            partyIndex: event.data.result.partyIndex,
            jobId: event.data.result.jobId,
            durationMs: event.data.result.durationMs,
            progress: true,
            data: {
              workerStartupMs: event.data.result.workerTelemetry.workerStartupMs,
              queueMs: event.data.result.workerTelemetry.queueMs,
              executionMs: event.data.result.workerTelemetry.executionMs,
              inputTransferBytes: event.data.result.workerTelemetry.inputTransferBytes,
              outputTransferBytes: event.data.result.workerTelemetry.outputTransferBytes,
            },
          });
        } else {
          console.error(`AFK worker ${event.data.jobId} failed:`, event.data.message);
          afkRuntimeTrace.record('worker_job_error', {
            phase: 'error',
            partyId: job.partyId,
            partyIndex,
            jobId: event.data.jobId,
            anomaly: true,
            progress: true,
            data: { message: event.data.message },
          });
          terminateAfkWorkers([worker], 'worker-error-message');
          afkWorkerPoolRef.current = afkWorkerPoolRef.current.filter((slot) => slot.worker !== worker);
          afkActiveChunkJobsRef.current.delete(partyIndex);
          memoryMonitor.releaseWorker(event.data.jobId);
        }
        updateAfkTraceCoordinator();
        setAfkCoordinatorVersion((version) => version + 1);
      };
      worker.onerror = (event) => {
        console.error(`AFK worker ${jobId} failed:`, event.message);
        afkRuntimeTrace.record('worker_job_error', {
          phase: 'error',
          partyId: job.partyId,
          partyIndex,
          jobId,
          anomaly: true,
          progress: true,
          data: { message: event.message },
        });
        terminateAfkWorkers([worker], 'worker-error-event');
        afkWorkerPoolRef.current = afkWorkerPoolRef.current.filter((slot) => slot.worker !== worker);
        afkActiveChunkJobsRef.current.delete(partyIndex);
        memoryMonitor.releaseWorker(jobId);
        updateAfkTraceCoordinator();
        setAfkCoordinatorVersion((version) => version + 1);
      };
      afkActiveChunkJobsRef.current.set(partyIndex, {
        job: jobMetadata,
        worker,
        status: 'queued',
        startedMonotonicAt: job.queuedAt ?? performance.now(),
      });
      afkRuntimeTrace.record('worker_job_posted', {
        phase: 'worker_queue',
        partyId: party.id,
        partyIndex,
        jobId,
        progress: true,
        data: {
          activeJobCount: afkActiveChunkJobsRef.current.size,
          workerPoolSize: afkWorkerPoolRef.current.length,
          inputTransferBytes: job.inputTransferBytes ?? null,
          simulatedCompletedAt: job.simulatedCompletedAt,
        },
      });
      worker.postMessage(job);
      updateAfkTraceCoordinator();
      startedJob = true;
    });

    if (!startedJob && afkActiveChunkJobsRef.current.size === 0) {
      terminateAfkWorkers(afkWorkerPoolRef.current.map(({ worker }) => worker), 'recovery-complete');
      afkWorkerPoolRef.current = [];
      afkRemainingMsByPartyRef.current = {};
      pendingAfkMsRef.current = 0;
      setPendingAfkMs(0);
      updateAfkTraceCoordinator();
    }
  }, [actions, afkCoordinatorVersion, afkInteractionPauseVersion, debugSettings, gameMode, pendingAfkMs, state, updateAfkTraceCoordinator]);

  useEffect(() => () => {
    afkRuntimeTrace.cancelRecovery('unmount', {
      activeJobCount: afkActiveChunkJobsRef.current.size,
    });
    afkActiveChunkJobsRef.current.forEach(({ job }) => {
      memoryMonitor.releaseWorker(job.jobId);
    });
    terminateAfkWorkers(afkWorkerPoolRef.current.map(({ worker }) => worker), 'unmount');
    afkWorkerPoolRef.current = [];
    afkActiveChunkJobsRef.current.clear();
    updateAfkTraceCoordinator();
  }, [updateAfkTraceCoordinator]);

  useEffect(() => {
    const backlogObservation = observeAfkRecoveryBacklog(
      pendingAfkMs,
      hasObservedActiveAfkRecoveryRef.current,
    );
    hasObservedActiveAfkRecoveryRef.current = backlogObservation.hasObservedActiveRecovery;
    if (!backlogObservation.didCompleteRecovery) return;

    if (shouldRebuildPartyCyclesAfterAfkRef.current) {
      const runtimeNow = Date.now();
      const emulatedNow = afkSimulationAnchorRef.current ?? runtimeNow;
      const autoRepeatEnabled = autoRepeatEnabledRef.current;
      const recoveredAfkMs = Math.max(0, afkRecoveryTotalMsRef.current);
      const partialCycleSideEffects: Array<{ partyIndex: number; shouldFinalizeDiary: boolean; simulatedAt: number }> = [];
      const nextCycles: Record<number, PartyCycleRuntime> = {};

      latestPartiesRef.current.forEach((party, partyIndex) => {
        const { partyStats } = computePartyStats(party);
        const needsRest = party.currentHp < partyStats.hp;
        // SpecRef: 5.1.1 | Party State Machine | AFK → Online Transition Handling
        // Completed AFK expedition cycles are processed by the reducer; only the final
        // incomplete expedition cycle is restored as partial online progress. The state
        // that was active when AFK began is intentionally not preserved.
        if (needsRest) {
          nextCycles[partyIndex] = {
            state: 'rest',
            stateStartedAt: runtimeNow,
            durationMs: getStateDurationMs(party, 'rest'),
            restInitialTotalSteps: getRestInitialTotalSteps(party.currentHp, partyStats.hp),
            isCurrentExpeditionGodsBattle: false,
            wasLowHpAtRestStart: false,
          };
          return;
        }

        if (!autoRepeatEnabled) {
          nextCycles[partyIndex] = {
            state: 'idle',
            stateStartedAt: runtimeNow,
            durationMs: 1000,
            isCurrentExpeditionGodsBattle: false,
            wasLowHpAtRestStart: false,
          };
          return;
        }

        const durationScale = getTimeSpeedScale(debugSettings);
        const exploreDurationMultiplier = getPartyStateDurationMultiplier(party, 'explore');
        const approximateCycleDurationMs = Math.max(
          1,
          Math.ceil(BASE_STEP_DURATION_MS * APPROX_CYCLE_STEP_COUNT * durationScale * exploreDurationMultiplier),
        );
        const partialAfkMs = recoveredAfkMs % approximateCycleDurationMs;
        const moveDurationMs = getPartyTravelDurationMs(party, 'move');
        const exploreDurationMs = getExplorationDurationMs(undefined, exploreDurationMultiplier, durationScale);
        const returnDurationMs = getPartyTravelDurationMs(party, 'return');
        const onlineCycleDurationMs = Math.max(1, moveDurationMs + exploreDurationMs + returnDurationMs);
        const partialOnlineMs = Math.min(
          onlineCycleDurationMs - 1,
          Math.max(0, Math.floor((partialAfkMs / approximateCycleDurationMs) * onlineCycleDurationMs)),
        );

        if (partialOnlineMs < moveDurationMs) {
          nextCycles[partyIndex] = {
            state: 'move',
            stateStartedAt: runtimeNow - partialOnlineMs,
            durationMs: moveDurationMs,
            isCurrentExpeditionGodsBattle: false,
            wasLowHpAtRestStart: false,
          };
          return;
        }

        const exploreElapsedMs = partialOnlineMs - moveDurationMs;
        const shouldTriggerGodsBattle = shouldAutoTriggerGodsBattle(party);
        const runtimeExpeditionStartedAt = runtimeNow - exploreElapsedMs;
        const simulatedExpeditionStartedAt = emulatedNow - exploreElapsedMs;
        partialCycleSideEffects.push({
          partyIndex,
          shouldFinalizeDiary: exploreElapsedMs >= exploreDurationMs,
          simulatedAt: simulatedExpeditionStartedAt,
        });

        if (exploreElapsedMs < exploreDurationMs) {
          nextCycles[partyIndex] = {
            state: 'explore',
            stateStartedAt: runtimeExpeditionStartedAt,
            durationMs: exploreDurationMs,
            isCurrentExpeditionGodsBattle: shouldTriggerGodsBattle,
            wasLowHpAtRestStart: false,
          };
          return;
        }

        const returnElapsedMs = Math.min(returnDurationMs - 1, exploreElapsedMs - exploreDurationMs);
        nextCycles[partyIndex] = {
          state: 'return',
          stateStartedAt: runtimeNow - returnElapsedMs,
          durationMs: returnDurationMs,
          isCurrentExpeditionGodsBattle: false,
          wasLowHpAtRestStart: false,
        };
      });

      partialCycleSideEffects.forEach(({ partyIndex, shouldFinalizeDiary, simulatedAt }) => {
        const party = latestPartiesRef.current[partyIndex];
        const triggerGodsBattle = party ? shouldAutoTriggerGodsBattle(party) : false;
        actions.runExpedition(partyIndex, gameModeRef.current, triggerGodsBattle, simulatedAt);
        if (shouldFinalizeDiary) {
          actions.finalizeDiaryLog(partyIndex, simulatedAt);
        }
      });

      setPartyCycles(nextCycles);
      shouldRebuildPartyCyclesAfterAfkRef.current = false;
    }

    afkSimulationAnchorRef.current = null;
    afkRuntimeTrace.completeRecovery({
      recoveredAfkMs: afkRecoveryTotalMsRef.current,
      partyCount: latestPartiesRef.current.length,
    });
    afkRecoveryTotalMsRef.current = 0;
    afkRecoveryCompletedMsRef.current = 0;
  }, [actions, debugSettings, pendingAfkMs]);

  useEffect(() => {
    const previousPendingAfkMs = previousPendingAfkMsRef.current;
    previousPendingAfkMsRef.current = pendingAfkMs;

    if (previousPendingAfkMs > 0 && pendingAfkMs === 0) {
      justCompletedAfkRecoveryRef.current = true;
    } else if (pendingAfkMs > 0) {
      justCompletedAfkRecoveryRef.current = false;
    }
  }, [pendingAfkMs]);

  const suppressNotificationsForAfkEmulation = pendingAfkMs > 0
    || shouldShowAfkSummaryRef.current
    || justCompletedAfkRecoveryRef.current;

  useEffect(() => {
    // SpecRef: 8.1.1 | Notification Logic & Display | notification while AFK mode
    // Only clear notifications while AFK catch-up is actively running; once pending AFK reaches 0,
    // the Spec 5.1 summary notification must be allowed to remain visible.
    if (pendingAfkMs <= 0) return;
    onDismissAllNotifications();
  }, [onDismissAllNotifications, pendingAfkMs]);

  // SpecRef: 5.1.1 | Party State Machine | Refresh Handling
  // On refresh, `state.reactivate` progress is re-based to 0/x using the restored pending AFK backlog.
  const afkRecoveryTotalMs = Math.max(pendingAfkMs, afkRecoveryTotalMsRef.current);
  const afkRecoveryCompletedMs = Math.max(0, afkRecoveryTotalMs - pendingAfkMs);
  const afkRecoveryProgressPercent = pendingAfkMs > 0
    ? Math.max(
        0,
        Math.min(
          100,
          (afkRecoveryCompletedMs / Math.max(1, afkRecoveryTotalMs)) * 100
        )
      )
    : null;

  const pendingGodsBattleByPartyRef = useRef<Record<number, boolean>>({});
  const afkQuestCarryMsRef = useRef<Record<number, number>>({});
  const partyCyclesRef = useRef<Record<number, PartyCycleRuntime>>({});

  useEffect(() => {
    partyCyclesRef.current = partyCycles;
  }, [partyCycles]);

  const getRuntimeSnapshot = useCallback((checkpointAt: number = Date.now()): PersistedRuntimeSnapshot => ({
    schemaVersion: 1,
    checkpointAt,
    autoRepeatEnabled: autoRepeatEnabledRef.current,
    partyCycles: partyCyclesRef.current,
    pendingAfkMs: pendingAfkMsRef.current,
    afkRecoveryTotalMs: afkRecoveryTotalMsRef.current,
    afkRecoveryCompletedMs: Math.max(0, afkRecoveryTotalMsRef.current - pendingAfkMsRef.current),
    afkSimulationAnchor: afkSimulationAnchorRef.current,
    afkSummaryBaseline: afkSummaryBaselineRef.current,
    shouldShowAfkSummary: shouldShowAfkSummaryRef.current,
    afkChunkCursor: afkChunkCursorRef.current,
    afkRemainingMsByParty: afkRemainingMsByPartyRef.current,
  }), []);

  const persistAfkRuntimeState = useCallback((checkpointAt: number = lastCheckpointAtRef.current) => {
    // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Debug-only runtime trace
    if (pendingAfkSimulationRef.current) return;

    const traceCheckpoint = afkRuntimeTrace.isRecoveryActive();
    const checkpointStartedAt = traceCheckpoint ? performance.now() : 0;
    const previousTracePhase = traceCheckpoint ? afkRuntimeTrace.getCurrentSnapshot().phase : 'idle';
    try {
      const serializationStartedAt = traceCheckpoint ? performance.now() : 0;
      const payload = JSON.stringify(getRuntimeSnapshot(checkpointAt));
      if (traceCheckpoint) {
        afkRuntimeTrace.record('afk_checkpoint_serialization', {
          phase: 'afk_checkpoint',
          durationMs: performance.now() - serializationStartedAt,
          data: { payloadLength: payload.length },
        });
      }
      const storageStartedAt = traceCheckpoint ? performance.now() : 0;
      localStorage.setItem(AFK_RUNTIME_STORAGE_KEY, payload);
      if (traceCheckpoint) {
        afkRuntimeTrace.record('afk_checkpoint_storage_write', {
          phase: 'afk_checkpoint',
          durationMs: performance.now() - storageStartedAt,
        });
        afkRuntimeTrace.record('afk_checkpoint_complete', {
          phase: 'afk_checkpoint',
          durationMs: performance.now() - checkpointStartedAt,
        });
        afkRuntimeTrace.setPhase(previousTracePhase);
      }
    } catch (error) {
      console.error('Failed to persist AFK runtime state:', error);
      if (traceCheckpoint) {
        afkRuntimeTrace.record('afk_checkpoint_error', {
          phase: 'error',
          durationMs: performance.now() - checkpointStartedAt,
          anomaly: true,
          data: { message: error instanceof Error ? error.message : String(error) },
        });
        afkRuntimeTrace.setPhase(previousTracePhase);
      }
    }
  }, [getRuntimeSnapshot]);

  const handleImportGameState = useCallback(async (nextState: GameState, rawRuntimeSnapshot?: unknown) => {
    const result = await actions.importGameState(nextState);
    if (!result.state) return result;

    const importedRuntime = normalizeRuntimeSnapshot(rawRuntimeSnapshot, result.state.parties.length);
    const now = Date.now();
    const nextAutoRepeatEnabled = importedRuntime?.autoRepeatEnabled ?? true;
    const nextCycles = importedRuntime?.partyCycles ?? {};
    autoRepeatEnabledRef.current = nextAutoRepeatEnabled;
    setIsAutoRepeatEnabled(nextAutoRepeatEnabled);
    setPartyCycles(nextCycles);
    partyCyclesRef.current = nextCycles;
    pendingAfkSimulationRef.current = false;
    const nextPendingAfkMs = importedRuntime?.pendingAfkMs ?? 0;
    setPendingAfkMs(nextPendingAfkMs);
    pendingAfkMsRef.current = nextPendingAfkMs;
    hasObservedActiveAfkRecoveryRef.current = false;
    afkRecoveryTotalMsRef.current = importedRuntime?.afkRecoveryTotalMs ?? 0;
    afkRecoveryCompletedMsRef.current = importedRuntime?.afkRecoveryCompletedMs ?? 0;
    afkSimulationAnchorRef.current = importedRuntime?.afkSimulationAnchor ?? null;
    afkSummaryBaselineRef.current = importedRuntime?.afkSummaryBaseline ?? null;
    shouldShowAfkSummaryRef.current = importedRuntime?.shouldShowAfkSummary ?? false;
    afkChunkCursorRef.current = importedRuntime?.afkChunkCursor ?? null;
    afkRemainingMsByPartyRef.current = importedRuntime?.afkRemainingMsByParty
      ?? Object.fromEntries(result.state.parties.map((_, partyIndex) => [partyIndex, nextPendingAfkMs]));
    shouldRebuildPartyCyclesAfterAfkRef.current = nextPendingAfkMs > 0;
    lastCheckpointAtRef.current = importedRuntime?.checkpointAt ?? now;

    const nextRuntimeSnapshot = importedRuntime ?? getRuntimeSnapshot(now);
    try {
      localStorage.setItem(AFK_RUNTIME_STORAGE_KEY, JSON.stringify(nextRuntimeSnapshot));
    } catch (error) {
      console.error('Failed to replace AFK runtime state during import:', error);
      window.alert(`${t('save.writeWarning')}\n\n${error instanceof Error ? error.message : String(error)}`);
    }
    return result;
  }, [actions, getRuntimeSnapshot]);

  useEffect(() => {
    persistAfkRuntimeState();
  }, [isAutoRepeatEnabled, partyCycles, pendingAfkMs, persistAfkRuntimeState]);
  const getScaledSideQuestSeconds = useCallback((durationMs: number) => {
    // SpecRef: 5.1.2 | Side Quest | Realtime Progress
    // Side-quest time progress follows debug-scaled runtime duration.
    return Math.max(1, Math.floor(durationMs / 1000));
  }, []);

  const processTimeCheckpoint = useCallback((now: number = Date.now()) => {
    if (apiControlActiveRef.current) {
      lastCheckpointAtRef.current = now;
      return;
    }
    // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Gameplay mutations
    // AFK recovery is the sole gameplay writer until its backlog is exhausted and
    // the final partial online Cycle has been reconstructed. Keep the online clock
    // anchored so recovery wall time does not become a second catch-up interval.
    if (shouldPauseOnlineProgressForAfk({
      isHydrating: pendingAfkSimulationRef.current,
      pendingAfkMs: pendingAfkMsRef.current,
      hasChunkCursor: afkChunkCursorRef.current !== null,
      shouldRebuildAfterRecovery: shouldRebuildPartyCyclesAfterAfkRef.current,
    })) {
      lastCheckpointAtRef.current = now;
      return;
    }
    const parties = latestPartiesRef.current;
    const autoRepeatEnabled = autoRepeatEnabledRef.current;
    const elapsedMs = Math.max(0, Math.min(now - lastCheckpointAtRef.current, AFK_MAX_ELAPSED_MS));
    if (elapsedMs < PARTY_CYCLE_TICK_MS) return;

    if (debugSettings.displayAfkDuration && elapsedMs > 60_000) {
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      actions.addNotification(t('home.notification.debug.elapsedSincePreviousUpdate', { seconds: formatNumber(elapsedSeconds) }));
    }

    // Long background spans should be simulated inside the reducer so each expedition
    // phase reads the latest pending profit / HP values instead of stale render snapshots.
    if (elapsedMs >= REDUCER_CATCHUP_THRESHOLD_MS) {
      // SpecRef: 5.1 | AFK Emulation Efficiency
      // A returning player starts each catch-up at 100% efficiency. Convert this
      // absence once into effective simulation time using the progressive bands.
      const effectiveElapsedMs = getEffectiveAfkElapsedMs(elapsedMs);
      // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Debug-only runtime trace
      afkRuntimeTrace.startRecovery({
        source: pendingAfkMsRef.current > 0 ? 'additional_checkpoint' : 'elapsed_checkpoint',
        elapsedMs,
        effectiveElapsedMs,
        partyCount: parties.length,
      });
      if (pendingAfkMsRef.current <= 0) {
        afkSummaryBaselineRef.current = parties.map((party) => ({ ...party.expeditionStats }));
        shouldShowAfkSummaryRef.current = true;
        afkSchedulerProfileRef.current = {
          ...createAfkSchedulerProfile(),
          recoveredElapsedMs: effectiveElapsedMs,
          activePartyCount: parties.length,
        };
        afkAverageOperationDurationMsRef.current = null;
      } else if (afkSchedulerProfileRef.current) {
        afkSchedulerProfileRef.current = {
          ...afkSchedulerProfileRef.current,
          recoveredElapsedMs: Math.min(
            AFK_MAX_ELAPSED_MS,
            afkSchedulerProfileRef.current.recoveredElapsedMs + effectiveElapsedMs,
          ),
          activePartyCount: parties.length,
        };
      }
      afkSimulationAnchorRef.current = now;
      const nextPendingAfkMs = Math.min(
        AFK_MAX_EFFECTIVE_ELAPSED_MS,
        pendingAfkMsRef.current + effectiveElapsedMs,
      );
      const previousPendingAfkMs = pendingAfkMsRef.current;
      // SpecRef: 5.1.1 | Party State Machine | Refresh Handling
      // Update AFK recovery refs synchronously before persistence so refresh restores the same x/y progress baseline.
      afkRecoveryTotalMsRef.current = Math.max(afkRecoveryTotalMsRef.current, nextPendingAfkMs);
      afkRecoveryCompletedMsRef.current = Math.max(0, afkRecoveryTotalMsRef.current - nextPendingAfkMs);
      pendingAfkMsRef.current = nextPendingAfkMs;
      afkRemainingMsByPartyRef.current = Object.fromEntries(
        parties.map((_, partyIndex) => [partyIndex, Math.min(
          AFK_MAX_EFFECTIVE_ELAPSED_MS,
          previousPendingAfkMs > 0
            ? (afkRemainingMsByPartyRef.current[partyIndex] ?? previousPendingAfkMs) + effectiveElapsedMs
            : effectiveElapsedMs,
        )]),
      );
      setPendingAfkMs(nextPendingAfkMs);
      shouldRebuildPartyCyclesAfterAfkRef.current = true;
      lastCheckpointAtRef.current = now;
      void actions.flushSave().catch(() => undefined);
      persistAfkRuntimeState(now);
      return;
    }

    const unlimitedTimeSpeed = isUnlimitedTimeSpeed(debugSettings);
    const timeSpeedScale = Math.max(0.001, getTimeSpeedScale(debugSettings));

    parties.forEach((party, partyIndex) => {
      if (party.sideQuest?.type !== 'q.AFK') {
        afkQuestCarryMsRef.current[partyIndex] = 0;
        return;
      }

      if (unlimitedTimeSpeed) {
        const remainingSeconds = Math.max(0, party.sideQuest.target - party.sideQuest.progress);
        afkQuestCarryMsRef.current[partyIndex] = 0;
        if (remainingSeconds > 0) {
          const simulatedAt = lastCheckpointAtRef.current + elapsedMs;
          actions.advanceSideQuest(partyIndex, remainingSeconds, simulatedAt);
        }
        return;
      }

      const carriedMs = afkQuestCarryMsRef.current[partyIndex] ?? 0;
      const simulatedElapsedMs = elapsedMs / timeSpeedScale;
      const { gainedSeconds, remainderMs } = getElapsedWholeSeconds(carriedMs, simulatedElapsedMs);
      afkQuestCarryMsRef.current[partyIndex] = remainderMs;

      if (gainedSeconds > 0) {
        const simulatedAt = lastCheckpointAtRef.current + elapsedMs;
        actions.advanceSideQuest(partyIndex, gainedSeconds, simulatedAt);
      }
    });

    const simulationNow = lastCheckpointAtRef.current + elapsedMs;
    const suppressCycleNotificationsForAfk = pendingAfkMsRef.current > 0 || shouldShowAfkSummaryRef.current;

    setPartyCycles((prev) => {
      const next = { ...prev };
      const autoEquipmentPartyIndexes = new Set<number>();

      parties.forEach((party, partyIndex) => {
        const { partyStats: partyRuntimeStats } = computePartyStats(party);
        const needsRestBeforeCycleStart = party.currentHp < partyRuntimeStats.hp;
        const initialCycleState: PartyCycleState = needsRestBeforeCycleStart
          ? 'rest'
          : autoRepeatEnabled
            ? 'move'
            : 'idle';
        const runtime = next[partyIndex] ?? {
          state: initialCycleState,
          stateStartedAt: simulationNow,
          durationMs: initialCycleState === 'rest'
            ? getStateDurationMs(party, 'rest')
            : initialCycleState === 'move'
              ? getPartyTravelDurationMs(party, 'move')
              : 1000,
          restInitialTotalSteps: needsRestBeforeCycleStart
            ? getRestInitialTotalSteps(party.currentHp, partyRuntimeStats.hp)
            : undefined,
        };
        const updated = { ...runtime };
        const hpRatioAtRestStart = partyRuntimeStats.hp > 0 ? party.currentHp / partyRuntimeStats.hp : 1;
        if (updated.state === 'rest' && updated.wasLowHpAtRestStart === undefined) {
          updated.wasLowHpAtRestStart = hpRatioAtRestStart < 0.3;
          updated.restInitialTotalSteps = getRestInitialTotalSteps(party.currentHp, partyRuntimeStats.hp);
        }

        // SpecRef: 5.1.2 | Side Quest | Expiration
        if (party.sideQuest && simulationNow >= getScaledSideQuestExpiresAt(party.sideQuest, timeSpeedScale)) {
          actions.cancelSideQuest(partyIndex);
          if (!suppressCycleNotificationsForAfk && party.diarySettings.notifySideQuestPopup) {
            actions.addNotification(t('home.notification.sideQuestFailed', { party: party.name, quest: resolveSideQuestShortText(party.sideQuest) }));
          }
          next[partyIndex] = updated;
          return;
        }

        if (updated.state === 'idle' && autoRepeatEnabled) {
          updated.state = 'move';
          updated.durationMs = getPartyTravelDurationMs(party, 'move');
          updated.stateStartedAt = simulationNow;
          updated.sortieSourceState = undefined;
          updated.sortieEmbezzlementGold = undefined;
        }

        if (updated.state === 'explore') {
          const exploredRooms = party.lastExpeditionLog?.entries.length;
          updated.durationMs = getExplorationDurationMs(
            exploredRooms,
            getPartyStateDurationMultiplier(party, 'explore'),
            getTimeSpeedScale(debugSettings),
          );
        }

        if (updated.state === 'rest') {
          const restTickDurationMs = getStateDurationMs(party, 'rest');
          const elapsedRestMs = Math.max(0, simulationNow - updated.stateStartedAt);
          const restTickCount = Math.floor(elapsedRestMs / Math.max(1, restTickDurationMs));
          // SpecRef: 5.1.1 | Party State Machine | state.rest
          const healPerTick = Math.max(REST_HEAL_MIN_HP, Math.ceil(partyRuntimeStats.hp * REST_HEAL_MAX_HP_RATIO));
          const projectedHp = Math.min(
            partyRuntimeStats.hp,
            party.currentHp + (restTickCount > 0 ? healPerTick * restTickCount : 0),
          );
          if (party.currentHp < partyRuntimeStats.hp && restTickCount > 0) {
            actions.healPartyHp(partyIndex, healPerTick * restTickCount);
            updated.stateStartedAt += restTickCount * restTickDurationMs;
          }
          const hasCompletedRestStep = restTickCount > 0;
          const startedRestAtFullHp = party.currentHp >= partyRuntimeStats.hp;
          if (projectedHp >= partyRuntimeStats.hp && (!startedRestAtFullHp || hasCompletedRestStep)) {
            // SpecRef: 8.3 | UI_EXPEDITION | Auto Destination Change Logic
            if (party.expeditionDestinationMode === 'auto') {
              const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId + 1 && dungeon.id <= 9);
              const selectedDifficultyOffset = party.expeditionDifficultyOffsetByDungeon?.[party.selectedDungeonId]
                ?? party.expeditionDifficultyOffset
                ?? 0;
              const hasClearedSelectedExpeditionAtLeastOnce = Boolean(
                party.defeatedBossExpeditions?.[party.selectedDungeonId],
              );
              const nextDungeonEntryUnlocked = nextDungeon
                ? isDungeonEntryUnlocked(party, nextDungeon.id)
                : false;
              const selectedDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId);
              const selectedDungeonEnemyLevel = selectedDungeon?.expLevel ?? 0;
              const normalizedCondition = Math.max(-400, Math.min(400, Math.floor(party.condition)));
              const shouldAutoAdvanceDestination = Boolean(
                nextDungeon
                && selectedDungeon
                && hasClearedSelectedExpeditionAtLeastOnce
                && nextDungeonEntryUnlocked
                && (
                  (
                    (selectedDungeonEnemyLevel + selectedDifficultyOffset) <= party.level + 9
                    && normalizedCondition >= 250
                  )
                  || (
                    (selectedDungeonEnemyLevel + selectedDifficultyOffset) <= party.level + 10
                    && normalizedCondition >= 240
                  )
                  || (
                    (selectedDungeonEnemyLevel + selectedDifficultyOffset) <= party.level + 11
                    && normalizedCondition >= 230
                  )
                ),
              );
              if (shouldAutoAdvanceDestination && nextDungeon) {
                actions.autoSelectDungeon(partyIndex, nextDungeon.id);
              }
            }
            if (party.sideQuest?.type === 'q.healing') {
              const restSeconds = getScaledSideQuestSeconds(simulationNow - updated.stateStartedAt);
              actions.advanceSideQuest(partyIndex, restSeconds, simulationNow);
            }
            const hasTrophy = (party.lastExpeditionLog?.rewards.length ?? 0) > 0;
            const hasAutoSellItem = (party.lastExpeditionLog?.autoSellProfit ?? 0) > 0;
            if (hasTrophy || hasAutoSellItem) {
              updated.state = 'sell';
              updated.durationMs = getStateDurationMs(party, 'sell');
            } else {
              // SpecRef: 5.1.1 | Party State Machine | state.free_action
              updated.state = 'free_action';
              updated.durationMs = getStateDurationMs(party, 'free_action');
            }
            updated.restInitialTotalSteps = undefined;
            updated.stateStartedAt = simulationNow;
          }
        }

        let stateElapsedMs = Math.max(0, simulationNow - updated.stateStartedAt);
        let cyclePendingProfit = Math.max(0, party.pendingProfit ?? 0);
        while (updated.state !== 'rest' && stateElapsedMs >= updated.durationMs) {
          updated.stateStartedAt += updated.durationMs;
          stateElapsedMs -= updated.durationMs;

          if (updated.state === 'sell') {
              // SpecRef: 5.1.1 | Party State Machine | state.sell
              updated.state = 'free_action';
              updated.durationMs = getStateDurationMs(party, 'free_action');
            } else if (updated.state === 'free_action') {
              // SpecRef: 5.1.1 | Party State Machine | state.free_action
              const baseSpend = Math.floor((cyclePendingProfit * rollPercentInclusive(20, 40)) / 100);
              const squanderLevel = getPartyAbilityLevel(party, 'squander');
              const squanderMultiplier = squanderLevel >= 2 ? 1.5 : squanderLevel >= 1 ? 1.3 : 1;
              const spend = Math.min(cyclePendingProfit, Math.floor(baseSpend * squanderMultiplier));
              if (spend > 0) {
                if (!suppressCycleNotificationsForAfk && party.diarySettings.notifyCyclePopup) {
                  if (squanderLevel > 0) {
                    const lordName = getPartyAbilityOwnerName(party, 'squander') ?? t('common.unnamed');
                    actions.addNotification(t('home.notification.lordSquanderedGold', { party: party.name, lord: lordName, gold: formatNumber(spend) }));
                  } else {
                    actions.addNotification(t('home.notification.partySpentGold', { party: party.name, gold: formatNumber(spend) }));
                  }
                }
              }
              actions.spendPendingProfit(partyIndex, spend);
              if (party.sideQuest?.type === 'q.squander' && spend > 0) actions.advanceSideQuest(partyIndex, spend, simulationNow);
              cyclePendingProfit = Math.max(0, cyclePendingProfit - spend);
              if (party.currentSleepiness === 2) {
                updated.state = 'sound_sleep';
                updated.durationMs = getStateDurationMs(party, 'sound_sleep');
              } else {
                updated.state = 'pray';
                updated.durationMs = getStateDurationMs(party, 'pray');
              }
            } else if (updated.state === 'sound_sleep') {
              // SpecRef: 5.1.1 | Party State Machine | state.sound_sleep
              if (party.sideQuest?.type === 'q.sleeping' && updated.durationMs > 100) actions.advanceSideQuest(partyIndex, 1, simulationNow);
              autoEquipmentPartyIndexes.add(partyIndex);
              updated.state = 'pray';
              updated.durationMs = getStateDurationMs(party, 'pray');
            } else if (updated.state === 'pray') {
              const isNoFaith = isNoFaithDeity(party.deity.name);
              const donationRate = rollPercentInclusive(10, 33);
              const baseDonation = Math.floor((cyclePendingProfit * donationRate) / 100);
              const titheLevel = getPartyAbilityLevel(party, 'tithe');
              const titheBonusRate = isNoFaith ? 0 : (titheLevel >= 2 ? 0.15 : titheLevel >= 1 ? 0.1 : 0);
              const titheBonus = Math.floor(cyclePendingProfit * titheBonusRate);
              const donation = isNoFaith ? 0 : Math.min(cyclePendingProfit, baseDonation + titheBonus);
              const rawDeposit = Math.max(0, cyclePendingProfit - donation);
              const deposit = Math.floor(rawDeposit * getPrayerDepositMultiplier(party));
              const embezzled = Math.max(0, rawDeposit - deposit);
              actions.processPendingProfit(partyIndex, donation, deposit);
              if (party.sideQuest?.type === 'q.donation' && donation > 0) actions.advanceSideQuest(partyIndex, donation, simulationNow);
              if (party.sideQuest?.type === 'q.savings' && deposit > 0) actions.advanceSideQuest(partyIndex, deposit, simulationNow);
              if (party.sideQuest?.type === 'q.embezzlement' && embezzled > 0) actions.advanceSideQuest(partyIndex, embezzled, simulationNow);
              cyclePendingProfit = 0;
              if (donation > 0 || deposit > 0) {
                const embezzledText = embezzled > 0 ? t('home.notification.embezzledSuffix', { gold: formatNumber(embezzled) }) : '';
                if (!suppressCycleNotificationsForAfk && party.diarySettings.notifyCyclePopup) {
                  if (isNoFaith) {
                    actions.addNotification(t('home.notification.partySavedGold', { party: party.name, gold: formatNumber(deposit), suffix: embezzledText }));
                  } else if (titheLevel > 0) {
                    const pilgrimName = getPartyAbilityOwnerName(party, 'tithe') ?? t('common.unnamed');
                    actions.addNotification(t('home.notification.pilgrimDonatedAndSavedGold', { party: party.name, pilgrim: pilgrimName, donation: formatNumber(donation), deposit: formatNumber(deposit), suffix: embezzledText }));
                  } else {
                    actions.addNotification(t('home.notification.partyDonatedAndSavedGold', { party: party.name, donation: formatNumber(donation), deposit: formatNumber(deposit), suffix: embezzledText }));
                  }
                }
              }
              // SpecRef: 5.1.1 | Party State Machine | state.pray
              const shouldReturnToRest = party.currentHp < partyRuntimeStats.hp;
              if (shouldReturnToRest) {
                updated.state = 'rest';
                updated.durationMs = getStateDurationMs(party, 'rest');
                updated.wasLowHpAtRestStart = false;
                updated.restInitialTotalSteps = getRestInitialTotalSteps(party.currentHp, partyRuntimeStats.hp);
              } else {
                updated.state = autoRepeatEnabled ? 'move' : 'idle';
                updated.durationMs = updated.state === 'move' ? getPartyTravelDurationMs(party, 'move') : 1000;
                if (updated.state === 'move') {
                  updated.sortieSourceState = undefined;
                  updated.sortieEmbezzlementGold = undefined;
                }
              }
            } else if (updated.state === 'idle') {
              updated.durationMs = 1000;
            } else if (updated.state === 'move') {
              const triggerGodsBattle = pendingGodsBattleByPartyRef.current[partyIndex] === true
                || shouldAutoTriggerGodsBattle(party);
              pendingGodsBattleByPartyRef.current[partyIndex] = false;
              if (triggerGodsBattle && party.sideQuest) {
                actions.cancelSideQuest(partyIndex);
                if (!suppressCycleNotificationsForAfk && party.diarySettings.notifySideQuestPopup) {
                  actions.addNotification(t('home.notification.sideQuestCancelledByGodBattle', { party: party.name }));
                }
              }
              if (party.sideQuest?.type === 'q.exercise') actions.advanceSideQuest(partyIndex, getScaledSideQuestSeconds(updated.durationMs), simulationNow);
              actions.runExpedition(partyIndex, gameModeRef.current, triggerGodsBattle, simulationNow);
              updated.state = 'explore';
              updated.durationMs = getExplorationDurationMs(
                undefined,
                getPartyStateDurationMultiplier(party, 'explore'),
                getTimeSpeedScale(debugSettings),
              );
              updated.isCurrentExpeditionGodsBattle = triggerGodsBattle;
            } else if (updated.state === 'explore') {
              actions.finalizeDiaryLog(partyIndex);
              updated.state = 'return';
              updated.durationMs = getPartyTravelDurationMs(party, 'return');
              updated.isCurrentExpeditionGodsBattle = false;
            } else if (updated.state === 'return') {
              if (party.sideQuest?.type === 'q.exercise') actions.advanceSideQuest(partyIndex, getScaledSideQuestSeconds(updated.durationMs), simulationNow);
              if (!party.sideQuest && !hasActiveNonGodBattleClearGateCondition(party)) {
                actions.rollSideQuest(partyIndex, party.selectedDungeonId, simulationNow);
              }
              actions.rollPartySleepiness(partyIndex);
              updated.state = 'rest';
              updated.durationMs = getStateDurationMs(party, 'rest');
              updated.restInitialTotalSteps = getRestInitialTotalSteps(party.currentHp, partyRuntimeStats.hp);
              updated.isCurrentExpeditionGodsBattle = false;
              updated.wasLowHpAtRestStart = hpRatioAtRestStart < 0.3;
            }

            if (updated.state === 'rest') {
              updated.stateStartedAt = simulationNow;
              stateElapsedMs = 0;
            }
        }

        next[partyIndex] = updated;
      });

      if (autoEquipmentPartyIndexes.size > 0) {
        runAutoEquipment(
          Array.from(autoEquipmentPartyIndexes),
          undefined,
          { suppressNotifications: suppressCycleNotificationsForAfk },
        );
      }

      return next;
    });

    lastCheckpointAtRef.current = now;
    persistAfkRuntimeState(now);
  }, [actions, persistAfkRuntimeState]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    const scheduleNextCheckpoint = () => {
      if (cancelled) return;
      const delayMs = pendingAfkMsRef.current > 0
        ? 250
        : getNextPartyCycleCheckpointDelay(partyCyclesRef.current, Date.now());
      timeoutId = window.setTimeout(() => {
        processTimeCheckpoint();
        scheduleNextCheckpoint();
      }, delayMs);
    };
    scheduleNextCheckpoint();
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [processTimeCheckpoint]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Saving and persistence
      // Flush authoritative game state before writing the matching AFK cursor checkpoint.
      if (pendingAfkMsRef.current > 0) await actions.flushSave().catch(() => undefined);
      persistAfkRuntimeState();
    }, 5000);

    return () => window.clearInterval(id);
  }, [actions.flushSave, persistAfkRuntimeState]);

  useEffect(() => {
    const handleFocus = () => {
      processTimeCheckpoint();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        processTimeCheckpoint();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [processTimeCheckpoint]);

  useEffect(() => {
    const persistLatestCheckpoint = () => {
      const now = Date.now();
      lastCheckpointAtRef.current = now;
      // pagehide/beforeunload cannot guarantee that an asynchronous worker flush completes.
      void actions.flushSave().catch(() => undefined);
      persistAfkRuntimeState(now);
    };

    const handleVisibilityPersist = () => {
      if (document.visibilityState === 'hidden') {
        persistLatestCheckpoint();
      }
    };

    window.addEventListener('beforeunload', persistLatestCheckpoint);
    window.addEventListener('pagehide', persistLatestCheckpoint);
    document.addEventListener('visibilitychange', handleVisibilityPersist);

    return () => {
      window.removeEventListener('beforeunload', persistLatestCheckpoint);
      window.removeEventListener('pagehide', persistLatestCheckpoint);
      document.removeEventListener('visibilitychange', handleVisibilityPersist);
    };
  }, [actions.flushSave, persistAfkRuntimeState]);

  // Item gain notifications after selling phase
  useEffect(() => {
    // SpecRef: 8.1.1 | Notification Logic & Display | notification while AFK mode
    if (suppressNotificationsForAfkEmulation) {
      // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Functional correctness
      // AFK reducer slices are authoritative. React observation effects must not replay
      // side-quest progress, level notifications, or reward presentation per slice.
      notifiedRewardLogRef.current = state.parties.map((party) => party.lastExpeditionLog);
      prevPartyLogsRef.current = state.parties.map((party) => party.lastExpeditionLog);
      prevPartyLevelsRef.current = state.parties.map((party) => party.level);
      prevPartyCycleStateRef.current = state.parties.map((_, index) => partyCycles[index]?.state ?? null);
      justCompletedAfkRecoveryRef.current = false;
      return;
    }

    state.parties.forEach((party, index) => {
      const previousLog = prevPartyLogsRef.current[index] ?? null;
      const previousLevel = prevPartyLevelsRef.current[index] ?? party.level;
      const currentLog = party.lastExpeditionLog;
      const hasNewLog = !!currentLog && currentLog !== previousLog;
      if (hasNewLog && currentLog && party.sideQuest) {
        const simulatedAt = lastCheckpointAtRef.current;
        if (party.sideQuest.type === 'q.treasure-super-rare') {
          const gained = currentLog.rewards.filter((item) => item.superRare > 0).length;
          if (gained > 0) actions.advanceSideQuest(index, gained, simulatedAt);
        }
        if (party.sideQuest.type === 'q.treasure-boss-rare') {
          const gained = currentLog.rewards.filter((item) => getItemRarityById(item.id) === 'bossRare').length;
          if (gained > 0) actions.advanceSideQuest(index, gained, simulatedAt);
        }
        if (party.sideQuest.type === 'q.poor-kid' && (currentLog.rewards.length ?? 0) === 0) {
          actions.advanceSideQuest(index, 1, simulatedAt);
        }
        if (party.sideQuest.type === 'q.consecutive-wins') {
          if (currentLog.finalOutcome === 'Clear') {
            actions.advanceSideQuest(index, 1, simulatedAt);
          } else {
            actions.setSideQuestProgress(index, 0);
          }
        }
        if (party.sideQuest.type === 'q.losers' && currentLog.finalOutcome === 'Defeat') {
          actions.advanceSideQuest(index, 1, simulatedAt);
        }
      }
      const hasLevelUp = party.level > previousLevel;

      if (hasLevelUp && party.diarySettings.notifyCyclePopup) {
        const representativeCharacter = party.characters[0];
        const equipSlotIncrease = representativeCharacter
          ? Math.max(
              0,
              computeCharacterStats(representativeCharacter, party.level).maxEquipSlots
                - computeCharacterStats(representativeCharacter, previousLevel).maxEquipSlots
            )
          : 0;

        const levelUpMessage = equipSlotIncrease > 0
          ? t('home.notification.partyLevelUpWithEquipmentSlot', { party: party.name, level: party.level, slots: equipSlotIncrease })
          : t('home.notification.partyLevelUp', { party: party.name, level: party.level });
        actions.addNotification(levelUpMessage);
      }

      const cycle = partyCycles[index];
      const cycleState = cycle?.state ?? null;
      const sellingFinished = cycleState !== 'sell';
      // SpecRef: 5.1.1 | Party State Machine | Immediate 出撃 / 神魔戦
      const isInstantSortieRewardNotificationPending = instantSortieRewardNotificationPendingRef.current[index] === true;
      const canAnnounceGains = isInstantSortieRewardNotificationPending
        || (cycleState !== 'explore' && cycleState !== 'return' && cycleState !== 'rest' && cycleState !== 'sell');
      const hasRewardsToNotify = (currentLog?.rewards.length ?? 0) > 0;
      const isAlreadyNotified = notifiedRewardLogRef.current[index] === currentLog;
      const justFinishedSelling = prevPartyCycleStateRef.current[index] === 'sell' && cycleState !== 'sell';

      if (hasRewardsToNotify && sellingFinished && canAnnounceGains && (hasNewLog || justFinishedSelling) && !isAlreadyNotified && currentLog) {
        if (suppressNotificationsForAfkEmulation) {
          notifiedRewardLogRef.current[index] = currentLog;
          return;
        }

        if (party.diarySettings.notifyItemDropPopup) {
          for (const item of currentLog.rewards) {
            const inventoryCount = state.global.inventory[getVariantKey(item)]?.count ?? 0;
            if (inventoryCount > 20) continue;
            const isSuperRare = item.superRare > 0;
            const itemName = getItemDisplayName(item);
            const rarity = getItemRarityById(item.id);
            actions.addNotification(
              t('home.notification.partyObtainedItem', { party: party.name, item: itemName }),
              rarity === 'eliteRare' || rarity === 'bossRare' || isSuperRare ? 'rare' : 'normal',
              'item',
              undefined,
              { rarity, isSuperRareItem: isSuperRare }
            );
          }
        }
        notifiedRewardLogRef.current[index] = currentLog;
        instantSortieRewardNotificationPendingRef.current[index] = false;
      }

      if (hasNewLog && !hasRewardsToNotify) {
        notifiedRewardLogRef.current[index] = currentLog;
        instantSortieRewardNotificationPendingRef.current[index] = false;
      }
    });

    prevPartyLogsRef.current = state.parties.map((party) => party.lastExpeditionLog);
    prevPartyLevelsRef.current = state.parties.map((party) => party.level);
    prevPartyCycleStateRef.current = state.parties.map((_, index) => partyCycles[index]?.state ?? null);
    justCompletedAfkRecoveryRef.current = false;
  }, [state.parties, partyCycles, actions, suppressNotificationsForAfkEmulation]);

  useEffect(() => {
    state.parties.forEach((party, index) => {
      const prevQuest = prevSideQuestRef.current[index] ?? null;
      const nextQuest = party.sideQuest ?? null;
      if (!prevQuest && nextQuest && !suppressNotificationsForAfkEmulation && party.diarySettings.notifySideQuestPopup) {
        actions.addNotification(getSideQuestAssignMessage(party.name, resolveSideQuestShortText(nextQuest)));
      }
      if (prevQuest && !nextQuest && !suppressNotificationsForAfkEmulation && party.diarySettings.notifySideQuestPopup) {
        const latestDiary = party.diaryLogs?.[0];
        if (latestDiary?.triggers?.includes('sideQuest')) {
          const successMessage = getSideQuestSuccessMessage(party.name, latestDiary.sideQuestDetail);
          if (successMessage) {
            actions.addNotification(successMessage);
          }
        }
      }
    });
    prevSideQuestRef.current = state.parties.map((party) => party.sideQuest);
  }, [actions, state.parties, suppressNotificationsForAfkEmulation]);

  useEffect(() => {
    notifiedRewardLogRef.current = notifiedRewardLogRef.current.slice(0, state.parties.length);
    while (notifiedRewardLogRef.current.length < state.parties.length) {
      notifiedRewardLogRef.current.push(null);
    }
    prevPartyCycleStateRef.current = prevPartyCycleStateRef.current.slice(0, state.parties.length);
    while (prevPartyCycleStateRef.current.length < state.parties.length) {
      prevPartyCycleStateRef.current.push(null);
    }
  }, [state.parties.length]);

  useEffect(() => {
    if (suppressNotificationsForAfkEmulation) {
      prevShopPurchasesRef.current = state.global.shopPurchases;
      prevInventoryRef.current = state.global.inventory;
      return;
    }

    const newlyPurchasedItemIds: number[] = [];

    for (const [stockKey, currentPurchases] of Object.entries(state.global.shopPurchases)) {
      const previousPurchases = new Set(prevShopPurchasesRef.current[stockKey] ?? []);
      for (const stockItemKey of currentPurchases) {
        if (!previousPurchases.has(stockItemKey)) {
          const itemId = Number(stockItemKey.split('-')[0]);
          if (Number.isFinite(itemId)) newlyPurchasedItemIds.push(itemId);
        }
      }
    }

    if (newlyPurchasedItemIds.length > 0) {
      for (const itemId of newlyPurchasedItemIds) {
        const purchasedVariant = Object.values(state.global.inventory).find((variant) => {
          if (variant.item.id !== itemId) return false;
          const previousCount = prevInventoryRef.current[getVariantKey(variant.item)]?.count ?? 0;
          return variant.count > previousCount;
        });

        const autoSoldVariant = Object.values(state.global.inventory).find((variant) => {
          if (variant.item.id !== itemId || variant.status !== 'sold') return false;
          const previousVariant = prevInventoryRef.current[getVariantKey(variant.item)];
          return previousVariant?.status === 'sold' && previousVariant.count === variant.count;
        });

        const wasAutoSold = !purchasedVariant && Boolean(autoSoldVariant);
        const purchasedMasterItem = ITEMS.find((item) => item.id === itemId);

        const purchasedName = purchasedVariant
          ? getItemDisplayName(purchasedVariant.item)
          : autoSoldVariant
            ? getItemDisplayName(autoSoldVariant.item)
            : t('home.notification.shopPurchasedItemFallback', {
              item: purchasedMasterItem ? getLocalizedItemName(purchasedMasterItem) : t('common.unknown'),
            });

        if (wasAutoSold) {
          actions.addNotification(t('home.notification.shopBoughtAndAutoSold', { item: purchasedName }), 'normal', 'item', true);
          continue;
        }

        actions.addNotification(t('home.notification.shopBought', { item: purchasedName }), 'normal', 'item', true);
      }
    }

    prevShopPurchasesRef.current = state.global.shopPurchases;
    prevInventoryRef.current = state.global.inventory;
  }, [state.global.shopPurchases, state.global.inventory, actions, suppressNotificationsForAfkEmulation]);

  useEffect(() => {
    if (isPartyExpeditionSplitViewEnabled) {
      const expeditionScrollTop = tabScrollPositionsRef.current.expedition ?? 0;
      const secondaryScrollTop = tabScrollPositionsRef.current[activeWideModeSecondaryTab] ?? 0;
      primarySplitTabContentRef.current?.scrollTo({ top: expeditionScrollTop, behavior: 'auto' });
      secondarySplitTabContentRef.current?.scrollTo({ top: secondaryScrollTop, behavior: 'auto' });
      return;
    }

    const currentScrollTop = tabScrollPositionsRef.current[activeTab] ?? 0;
    if (prefersDocumentScroll) {
      window.scrollTo({ top: currentScrollTop, behavior: 'auto' });
      return;
    }

    tabContentRef.current?.scrollTo({ top: currentScrollTop, behavior: 'auto' });
  }, [activeTab, activeWideModeSecondaryTab, isPartyExpeditionSplitViewEnabled, prefersDocumentScroll]);

  const switchTab = (nextTab: Tab) => {
    if (isPartyExpeditionSplitViewEnabled) {
      const expeditionScrollTop = primarySplitTabContentRef.current?.scrollTop ?? 0;
      tabScrollPositionsRef.current.expedition = expeditionScrollTop;
      const currentSecondaryScrollTop = secondarySplitTabContentRef.current?.scrollTop ?? 0;
      tabScrollPositionsRef.current[activeWideModeSecondaryTab] = currentSecondaryScrollTop;

      if (nextTab === 'expedition') {
        return;
      }
      setActiveWideModeSecondaryTab(nextTab);
      return;
    }

    const currentScrollTop = prefersDocumentScroll
      ? window.scrollY
      : tabContentRef.current?.scrollTop ?? 0;
    tabScrollPositionsRef.current[activeTab] = currentScrollTop;

    if (nextTab === activeTab) return;
    const currentTabIndex = MAIN_TAB_ORDER.indexOf(activeTab);
    const nextTabIndex = MAIN_TAB_ORDER.indexOf(nextTab);
    setTabTransitionDirection(nextTabIndex > currentTabIndex ? 'forward' : 'backward');
    setActiveTab(nextTab);
  };

  const getPartyAbilityOwnerName = (party: Party, abilityId: string): string | null => {
    const { characterStats } = computePartyStats(party);
    const owner = party.characters.find((character) =>
      characterStats.find((stats) => stats.characterId === character.id)?.abilities.some((ability) => ability.id === abilityId)
    );
    return owner?.name ?? null;
  };

  const getPartyAbilityLevel = (party: Party, abilityId: string): number => {
    const { characterStats } = computePartyStats(party);
    return characterStats.reduce((maxLevel, stats) => {
      const level = stats.abilities
        .filter((ability) => ability.id === abilityId)
        .reduce((abilityMax, ability) => Math.max(abilityMax, ability.level), 0);
      return Math.max(maxLevel, level);
    }, 0);
  };

  const getPrayerDepositMultiplier = (party: Party): number => {
    const momentumLevel = getPartyAbilityLevel(party, 'momentum');
    const deityDonation = state.global.deityDonations[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0;
    const deityDepositMultiplier = getDeityDepositMultiplier(party.deity.name, deityDonation);
    const momentumEmbezzlementRate = momentumLevel > 0 ? 0.1 : 0;

    return Math.max(0, deityDepositMultiplier - momentumEmbezzlementRate);
  };

  // SpecRef: 5.1.1 | Party State Machine | Durration modifilier
  const getExploreTerrainDurationMultiplier = (party: Party, entryCount?: number): number => {
    const dungeon = DUNGEONS.find((entry) => entry.id === party.selectedDungeonId);
    if (!dungeon) return 1;

    const getFloorTerrainRoomMultiplier = (terrainEffect?: string): number => {
      if (terrainEffect === 'terrain.chill') return 2;
      if (terrainEffect === 'terrain.looping-path') return 2;
      return 1;
    };

    const floorByNumber = new Map(dungeon.floors.map((floor) => [floor.floorNumber, floor]));
    const roomsToEvaluate = Math.max(1, entryCount ?? (party.lastExpeditionLog?.entries.length ?? 0));
    const loggedRooms = party.lastExpeditionLog?.dungeonId === dungeon.id
      ? party.lastExpeditionLog.entries.slice(0, roomsToEvaluate)
      : [];

    if (loggedRooms.length > 0) {
      const weightedRoomMultiplierTotal = loggedRooms.reduce((total, room) => {
        const floor = typeof room.floor === 'number' ? floorByNumber.get(room.floor) : undefined;
        return total + getFloorTerrainRoomMultiplier(floor?.terrainEffect);
      }, 0);
      return weightedRoomMultiplierTotal / loggedRooms.length;
    }

    const fullDungeonRoomMultiplierTotal = dungeon.floors.reduce((total, floor) => (
      total + (4 * getFloorTerrainRoomMultiplier(floor.terrainEffect))
    ), 0);
    const fullDungeonRoomCount = dungeon.floors.length * 4;
    return fullDungeonRoomCount > 0 ? (fullDungeonRoomMultiplierTotal / fullDungeonRoomCount) : 1;
  };

  // SpecRef: 5.1.1 | Party State Machine | Durration modifilier
  const getPartyStateDurationMultiplier = (party: Party, cycleState: 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray' | 'explore'): number => {
    const deityGold = state.global.deityDonations[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0;
    const deityMultiplier = getDeityStateDurationMultiplier(party.deity.name, deityGold, cycleState);
    if (cycleState !== 'explore') return deityMultiplier;
    const exploredRooms = party.lastExpeditionLog?.entries.length;
    return deityMultiplier * getExploreTerrainDurationMultiplier(party, exploredRooms);
  };

  // SpecRef: 5.1 | PROGRESS | Step
  const getStateDurationMs = (party: Party, cycleState: 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray'): number => {
    const durationScale = getTimeSpeedScale(debugSettings);
    const baseStepCount = cycleState === 'rest'
      ? 1
      : cycleState === 'sell'
        ? getAutoSellStepCount(party)
        : cycleState === 'free_action'
          ? getFreeActionStepCount(party.condition)
          : cycleState === 'sound_sleep'
            ? SOUND_SLEEP_STEP_COUNT
            : PRAY_STEP_COUNT;
    return Math.max(100, Math.ceil(baseStepCount * BASE_STEP_DURATION_MS * durationScale * getPartyStateDurationMultiplier(party, cycleState)));
  };

  // SpecRef: 5.1.1 | Party State Machine | state.move
  // SpecRef: 5.1.1 | Party State Machine | state.return
  const getPartyTravelDurationMs = (party: Party, travelState: 'move' | 'return'): number => {
    // SpecRef: 5.1.1 | Party State Machine | Durration modifilier
    const isColosseum = party.selectedDungeonId === 99;
    const baseStepCount = isColosseum
      ? 1
      : travelState === 'move'
        ? 1 + getExpeditionTierDurationFactor(party.selectedDungeonId)
        : 5 + getExpeditionTierDurationFactor(party.selectedDungeonId);
    const durationScale = getTimeSpeedScale(debugSettings);
    const baseDurationMs = baseStepCount * BASE_STEP_DURATION_MS * durationScale;
    const peddlerLevel = getPartyAbilityLevel(party, 'peddler');
    if (peddlerLevel >= 2) return Math.max(100, Math.ceil((baseDurationMs * 3) / 5));
    if (peddlerLevel >= 1) return Math.max(100, Math.ceil((baseDurationMs * 2) / 3));
    return Math.max(100, Math.ceil(baseDurationMs));
  };

  const notifyExpeditionRewardsIfNeeded = (party: Party, partyIndex: number) => {
    const currentLog = party.lastExpeditionLog;
    if (!currentLog || currentLog.rewards.length <= 0) return;
    if (notifiedRewardLogRef.current[partyIndex] === currentLog) return;

    if (party.diarySettings.notifyItemDropPopup) {
      for (const item of currentLog.rewards) {
        const variantKey = getVariantKey(item);
        const inventoryCount = state.global.inventory[variantKey]?.count ?? 0;
        if (inventoryCount > 20) continue;

        const isSuperRare = item.superRare > 0;
        const itemName = getItemDisplayName(item);
        const rarity = getItemRarityById(item.id);
        actions.addNotification(
          t('home.notification.partyObtainedItem', { party: party.name, item: itemName }),
          rarity === 'eliteRare' || rarity === 'bossRare' || isSuperRare ? 'rare' : 'normal',
          'item',
          undefined,
          { rarity, isSuperRareItem: isSuperRare }
        );
      }
    }

    notifiedRewardLogRef.current[partyIndex] = currentLog;
  };


  const triggerSortie = (partyIndex: number, triggerGodsBattle: boolean = false) => {
    const cycle = partyCycles[partyIndex];
    const party = state.parties[partyIndex];
    if (!party) return;
    const { partyStats } = computePartyStats(party);
    const now = Date.now();
    const instantChargeState = getInstantExpeditionChargeState(party, now);

    const isColosseumSortie = party.selectedDungeonId === 99;

    if (!isColosseumSortie && (party.currentHp <= 0 || partyStats.hp <= 0)) {
      const refusingCharacter = party.characters[Math.floor(gameplayRandom() * party.characters.length)]?.name ?? `PT${partyIndex + 1}`;
      if (party.diarySettings.notifyCyclePopup) actions.addNotification(t('home.notification.characterRefusedExpedition', { character: refusingCharacter }));
      return;
    }

    // SpecRef: 8.3 | UI_EXPEDITION | "出撃" / "神魔戦" Buttons
    if (triggerGodsBattle && cycle?.state === 'move' && cycle.isCurrentExpeditionGodsBattle === true) {
      if (party.diarySettings.notifyCyclePopup) actions.addNotification(t('home.notification.partyAlreadyMovingToGodBattle', { party: party.name }));
      return;
    }
    // SpecRef: 8.3 | UI_EXPEDITION | Charge
    if (!isColosseumSortie && instantChargeState.stock <= 0) {
      if (party.diarySettings.notifyCyclePopup) actions.addNotification(t('home.notification.instantExpeditionChargeInsufficient', { party: party.name }));
      return;
    }

    const stolenProfit = Math.max(0, party.pendingProfit);

    if (party.diarySettings.notifyCyclePopup && stolenProfit > 0) {
      actions.addNotification(t('home.notification.instantExpeditionWithStolenGold', { party: party.name, gold: formatNumber(stolenProfit) }));
    } else if (party.diarySettings.notifyCyclePopup) {
      actions.addNotification(t('home.notification.instantExpeditionStarted', { party: party.name }));
    }

    notifyExpeditionRewardsIfNeeded(party, partyIndex);

    if (triggerGodsBattle && party.sideQuest) {
      actions.cancelSideQuest(partyIndex);
      if (party.diarySettings.notifySideQuestPopup) actions.addNotification(t('home.notification.sideQuestCancelledByGodBattle', { party: party.name }));
    }

    pendingGodsBattleByPartyRef.current[partyIndex] = false;
    if (!isColosseumSortie) {
      actions.consumeInstantExpeditionStock(partyIndex, now);
    }
    if (cycle?.state === 'explore') {
      actions.finalizeDiaryLog(partyIndex);
    }
    actions.clearPendingProfit(partyIndex);
    actions.healPartyHp(partyIndex, partyStats.hp);
    // SpecRef: 5.1.1 | Party State Machine | Immediate 出撃 / 神魔戦
    instantSortieRewardNotificationPendingRef.current[partyIndex] = true;
    actions.resolveInstantExpedition(partyIndex, gameModeRef.current, triggerGodsBattle, now);
    actions.rollPartySleepiness(partyIndex);
    // SpecRef: 5.1.1 | Party State Machine | Instant full-cycle sortie
    // Manual expeditions and Gods Battles resolve the expedition and its return tail immediately,
    // leaving the runtime at the beginning of rest so normal rest healing still occurs.
    const finalRestDurationMs = getStateDurationMs(party, 'rest');
    setPartyCycles((prev) => ({
      ...prev,
      [partyIndex]: {
        state: 'rest',
        stateStartedAt: now,
        durationMs: finalRestDurationMs,
        restInitialTotalSteps: 1,
        isCurrentExpeditionGodsBattle: false,
      },
    }));
  };

  const isDiaryTabVisible = isPartyExpeditionSplitViewEnabled
    ? activeWideModeSecondaryTab === 'diary'
    : activeTab === 'diary';
  const selectedDiaryPartyIndexRef = useRef(0);
  const handleSelectedDiaryPartyIndexChange = useCallback((partyIndex: number) => {
    selectedDiaryPartyIndexRef.current = partyIndex;
  }, []);
  const prevDiaryTabVisibleRef = useRef(isDiaryTabVisible);
  useEffect(() => {
    if (prevDiaryTabVisibleRef.current && !isDiaryTabVisible) {
      actions.markPartyDiaryLogsSeen(selectedDiaryPartyIndexRef.current);
    }
    prevDiaryTabVisibleRef.current = isDiaryTabVisible;
  }, [isDiaryTabVisible, actions]);

  const isSettingTabVisible = isPartyExpeditionSplitViewEnabled
    ? activeWideModeSecondaryTab === 'setting'
    : activeTab === 'setting';
  const prevSettingTabVisibleRef = useRef(isSettingTabVisible);
  const isDeveloperNewsPaneExpandedRef = useRef(false);
  // SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
  const handleDeveloperNewsPaneExpandedChange = useCallback((expanded: boolean) => {
    if (shouldMarkDeveloperNewsReadOnPaneChange(isDeveloperNewsPaneExpandedRef.current, expanded)) {
      actions.markDeveloperNewsRead(DEVELOPER_NEWS_ITEMS.map((item) => item.id));
    }
    isDeveloperNewsPaneExpandedRef.current = expanded;
  }, [actions]);
  // SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
  useEffect(() => {
    if (prevSettingTabVisibleRef.current && !isSettingTabVisible && isDeveloperNewsPaneExpandedRef.current) {
      actions.markDeveloperNewsRead(DEVELOPER_NEWS_ITEMS.map((item) => item.id));
    }
    prevSettingTabVisibleRef.current = isSettingTabVisible;
  }, [isSettingTabVisible, actions]);

  useEffect(() => {
    if (activeTab !== 'base' || activeBaseSubTab !== 'inventory') return;
    const hasNewInventoryItems = Object.values(state.global.inventory).some((variant) => variant.isNew);
    if (!hasNewInventoryItems) return;
    actions.markItemsSeen();
  }, [activeTab, activeBaseSubTab, state.global.inventory, actions]);

  setLanguage(state.global.language);
  const tabs: { id: Tab; label: string }[] = MAIN_TAB_ORDER.map((id) => ({
    id,
    label: t(`nav.${id}`),
  }));

  // SpecRef: 8.1 | UI_FOUNDATIONS | Navigation: Minimal scene transitions, tab-centered
  const completePrimaryNavSwipe = (clientX: number, clientY: number) => {
    const swipeStart = primaryNavPointerStartRef.current;
    primaryNavPointerStartRef.current = null;
    if (!swipeStart || isPartyExpeditionSplitViewEnabled) return;
    const deltaX = clientX - swipeStart.x;
    const deltaY = clientY - swipeStart.y;
    if (Math.abs(deltaX) < 36 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.25) return;
    primaryNavSwipeHandledRef.current = true;
    const currentIndex = MAIN_TAB_ORDER.indexOf(swipeStart.tab);
    if (currentIndex < 0) return;
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextTab = MAIN_TAB_ORDER[nextIndex];
    if (nextTab) switchTab(nextTab);
  };

  const unreadDiaryCount = state.parties.reduce((count, party) => (
    count + party.diaryLogs.filter((log) => !log.isRead).length
  ), 0);
  const hasUnreadDiary = unreadDiaryCount > 0;
  const unreadDiaryBadgeLabel = unreadDiaryCount >= 99 ? '99+' : `${unreadDiaryCount}`;
  // SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
  const hasUnreadDeveloperNews = DEVELOPER_NEWS_ITEMS.some((item) => !(state.global.readDeveloperNewsItemIds ?? []).includes(item.id));
  const envLabel = getEnvLabel();
  const versionLabel = envLabel
    ? `${APP_VERSION}(${state.buildNumber}) ${envLabel}`
    : `${APP_VERSION}(${state.buildNumber})`;
  const gameTitle = t('app.title');

  useEffect(() => {
    document.title = gameTitle;
  }, [gameTitle]);

  const isPartyExpeditionSplitView = isPartyExpeditionSplitViewEnabled;

  const renderTabContent = (tab: Tab) => {
    if (tab === 'party') {
      return (
        <PartyTab
          parties={state.parties}
          selectedPartyIndex={safeSelectedPartyIndex}
          party={currentParty}
          partyStats={partyStats}
          characterStats={characterStats}
          selectedCharacter={selectedCharacter}
          setSelectedCharacter={setSelectedCharacter}
          editingCharacter={editingCharacter}
          setEditingCharacter={setEditingCharacter}
          onUpdateCharacter={actions.updateCharacter}
          onReorderPartyCharacter={actions.reorderPartyCharacter}
          onEquipItem={actions.equipItem}
          onToggleEquipmentLock={actions.toggleEquipmentLock}
          onAttachJewel={actions.attachJewel}
          onAddStatNotifications={actions.addStatNotifications}
          onSelectParty={actions.selectParty}
          onUpdatePartyDeity={actions.updatePartyDeity}
          onRunAutoEquipmentForCharacter={(characterId) => runAutoEquipment([safeSelectedPartyIndex], [characterId])}
          inventory={state.global.inventory}
          jewels={state.global.jewels}
          deityDonations={state.global.deityDonations}
          unlockedDeities={state.global.unlockedDeities}
          unlockedMimorianEnemyIds={state.global.unlockedMimorianEnemyIds}
          isDarkModeEnabled={isDarkModeEnabled}
        />
      );
    }

    if (tab === 'expedition') {
      const emulatedNowMs = afkSimulationAnchorRef.current !== null && pendingAfkMs > 0
        ? Math.max(0, afkSimulationAnchorRef.current - pendingAfkMs)
        : Date.now();
      return (
        <ExpeditionTab
          state={state}
          debugSettings={debugSettings}
          emulatedNowMs={emulatedNowMs}
          onSelectDungeon={actions.selectDungeon}
          onToggleExpeditionDestinationMode={actions.setExpeditionDestinationMode}
          onSetExpeditionDepthLimit={actions.setExpeditionDepthLimit}
          onSetExpeditionDifficultyOffset={actions.setExpeditionDifficultyOffset}
          onResetExpeditionStats={actions.resetExpeditionStats}
          onSimulateExpedition={async (partyIndex, onProgress) => {
            memoryMonitor.setRuntime('simulation', debugSettings.timeSpeed);
            try {
              return await actions.simulateExpedition(partyIndex, gameModeRef.current, onProgress);
            } finally {
              memoryMonitor.setRuntime(pendingAfkMsRef.current > 0 ? 'afk' : isAutoRepeatEnabled ? 'online' : 'idle', debugSettings.timeSpeed);
            }
          }}
          isExpeditionStatsDisplayEnabled={isExpeditionStatsDisplayEnabled}
          partyCycles={partyCycles}
          afkRecoveryProgressPercent={afkRecoveryProgressPercent}
          afkRecoveryCompletedMs={afkRecoveryCompletedMs}
          afkRecoveryTotalMs={afkRecoveryTotalMs}
          onTriggerSortie={triggerSortie}
          expandedLogParty={expeditionExpandedLogParty}
          setExpandedLogParty={setExpeditionExpandedLogParty}
          expandedRoom={expeditionExpandedRoom}
          setExpandedRoom={setExpeditionExpandedRoom}
          isDarkModeEnabled={isDarkModeEnabled}
        />
      );
    }

    if (tab === 'base') {
      return (
        <BaseTab
          inventory={state.global.inventory}
          jewels={state.global.jewels}
          jewelAutoEquipPriorityPartyId={state.global.jewelAutoEquipPriorityPartyId ?? null}
          parties={state.parties}
          gold={state.global.gold}
          prana={state.global.prana}
          altarVictoriesByEnemyType={state.global.altarVictoriesByEnemyType}
          unlockedMimorianEnemyIds={state.global.unlockedMimorianEnemyIds}
          shopPurchases={state.global.shopPurchases}
          debugStorePurchases={state.global.jewelShopPurchases}
          shopRefreshCounts={state.global.shopRefreshCounts}
          shopIntimacy={state.global.shopIntimacy}
          shopIntimacyLastDecayAt={state.global.shopIntimacyLastDecayAt}
          onSellStack={actions.sellStack}
          onSetVariantStatus={actions.setVariantStatus}
          onBuyShopItem={actions.buyShopItem}
          onBuyDebugStoreItem={actions.buyDebugStoreItem}
          onRefreshShopLineup={actions.refreshShopLineup}
          onUnlockMimorianEnemy={actions.unlockMimorianEnemy}
          onSetJewelAutoEquipPriorityParty={actions.setJewelAutoEquipPriorityParty}
          activeSubTab={activeBaseSubTab}
          onSetActiveSubTab={setActiveBaseSubTab}
          debugSettings={debugSettings}
        />
      );
    }

    if (tab === 'diary') {
      return (
        <DiaryTab
          parties={state.parties}
          onOpenDiaryLog={actions.markDiaryLogSeen}
          onMarkPartyDiaryLogsSeen={actions.markPartyDiaryLogsSeen}
          onSelectedPartyIndexChange={handleSelectedDiaryPartyIndexChange}
          onUpdateDiarySettings={actions.updateDiarySettings}
          expandedLogs={diaryExpandedLogs}
          onSetExpandedLogs={setDiaryExpandedLogs}
          expandedRooms={diaryExpandedRooms}
          onSetExpandedRooms={setDiaryExpandedRooms}
          isSettingsExpanded={diarySettingsExpanded}
          onSetIsSettingsExpanded={setDiarySettingsExpanded}
          isDarkModeEnabled={isDarkModeEnabled}
        />
      );
    }

    return (
      <SettingTab
        gameState={state}
        deityDonations={state.global.deityDonations}
        onResetGame={handleResetGame}
        onImportGameState={handleImportGameState}
        getCompressedSavePayload={actions.getCompressedSavePayload}
        getRuntimeSnapshot={getRuntimeSnapshot}
        onAddNotification={actions.addNotification}
        onGrantFeedbackReward={actions.grantFeedbackReward}
        onResetCommonBags={actions.resetCommonBags}
        onResetUniqueBags={actions.resetUniqueBags}
        onResetSideQuestBag={actions.resetSideQuestBag}
        selectedBestiaryDungeonId={selectedBestiaryDungeonId}
        onSetSelectedBestiaryDungeonId={setSelectedBestiaryDungeonId}
        expandedBestiaryEnemies={expandedBestiaryEnemies}
        onSetExpandedBestiaryEnemies={setExpandedBestiaryEnemies}
        bestiaryScrollTop={bestiaryScrollTop}
        onSetBestiaryScrollTop={setBestiaryScrollTop}
        gameMode={gameMode}
        onSetGameMode={setGameMode}
        darkModeSetting={darkModeSetting}
        onSetDarkModeSetting={setDarkModeSetting}
        isAutoRepeatEnabled={isAutoRepeatEnabled}
        onSetAutoRepeatEnabled={setAutoRepeatEnabled}
        isExpeditionStatsDisplayEnabled={isExpeditionStatsDisplayEnabled}
        onSetExpeditionStatsDisplayEnabled={setIsExpeditionStatsDisplayEnabled}
        debugSettings={debugSettings}
        onUpdateDebugSettings={updateDebugSettings}
        partyCount={state.parties.length}
        onPartyUnlock={actions.unlockPartySlot}
        language={state.global.language}
        onSetLanguage={actions.setLanguage}
        onMarkDeveloperNewsRead={actions.markDeveloperNewsRead}
        onNewsPaneExpandedChange={handleDeveloperNewsPaneExpandedChange}
      />
    );
  };

  return (
    <Suspense fallback={null}>
    <Profiler
      id="AFK recovery"
      onRender={(_id, _phase, actualDuration) => {
        const profile = afkSchedulerProfileRef.current;
        if (!import.meta.env.DEV || !profile || profile.completedAt !== null || pendingAfkMsRef.current <= 0) return;
        afkSchedulerProfileRef.current = {
          ...profile,
          reactCommitCount: profile.reactCommitCount + 1,
          totalReactRenderDurationMs: profile.totalReactRenderDurationMs + Math.max(0, actualDuration),
          longestReactCommitDurationMs: Math.max(profile.longestReactCommitDurationMs, actualDuration),
        };
      }}
    >
    <div
      className={`flex flex-col ${prefersDocumentScroll ? 'min-h-screen' : 'h-screen'} ${gameMode === 'm.luna' ? 'theme-luna' : gameMode === 'm.laika' ? 'theme-laika' : ''} ${isDarkModeEnabled ? 'theme-dark' : ''}`}
      aria-busy={pendingAfkMs > 0}
      onClickCapture={(event) => {
        if (pendingAfkMs <= 0) return;
        const target = event.target instanceof Element
          ? event.target.closest('button, input, select, textarea, a, [role="button"]')
          : null;
        if (!target || target.closest('nav[aria-label="Main navigation"]') || target.closest('[data-afk-readonly="true"]')) return;
        // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Responsiveness
        // Pause before the next scheduler slice, but leave the event live so the
        // normal UI mutation can commit at a safe boundary.
        afkInteractionPausedRef.current = true;
        afkInteractionPauseStartedAtRef.current = performance.now();
        afkRuntimeTrace.record('interaction_pause_start', {
          phase: 'interaction_pause',
          data: { input: 'pointer' },
        });
        if (afkInteractionPauseTimerRef.current !== null) window.clearTimeout(afkInteractionPauseTimerRef.current);
        afkInteractionPauseTimerRef.current = window.setTimeout(() => {
          afkInteractionPauseTimerRef.current = null;
          afkInteractionPausedRef.current = false;
          afkRuntimeTrace.record('interaction_pause_end', {
            phase: 'interaction_pause',
            durationMs: Math.max(0, performance.now() - (afkInteractionPauseStartedAtRef.current ?? performance.now())),
            progress: true,
            data: { input: 'pointer' },
          });
          afkInteractionPauseStartedAtRef.current = null;
          setAfkInteractionPauseVersion((version) => version + 1);
        }, 0);
      }}
      onKeyDownCapture={(event) => {
        if (pendingAfkMs <= 0 || (event.key !== 'Enter' && event.key !== ' ')) return;
        const target = event.target instanceof Element
          ? event.target.closest('button, input, select, textarea, a, [role="button"]')
          : null;
        if (!target || target.closest('nav[aria-label="Main navigation"]') || target.closest('[data-afk-readonly="true"]')) return;
        afkInteractionPausedRef.current = true;
        afkInteractionPauseStartedAtRef.current = performance.now();
        afkRuntimeTrace.record('interaction_pause_start', {
          phase: 'interaction_pause',
          data: { input: 'keyboard' },
        });
        if (afkInteractionPauseTimerRef.current !== null) window.clearTimeout(afkInteractionPauseTimerRef.current);
        afkInteractionPauseTimerRef.current = window.setTimeout(() => {
          afkInteractionPauseTimerRef.current = null;
          afkInteractionPausedRef.current = false;
          afkRuntimeTrace.record('interaction_pause_end', {
            phase: 'interaction_pause',
            durationMs: Math.max(0, performance.now() - (afkInteractionPauseStartedAtRef.current ?? performance.now())),
            progress: true,
            data: { input: 'keyboard' },
          });
          afkInteractionPauseStartedAtRef.current = null;
          setAfkInteractionPauseVersion((version) => version + 1);
        }, 0);
      }}
    >
      {apiControlActive && (
        <div className="fixed inset-0 z-[100] cursor-wait bg-transparent" aria-label="Experimental AI API control active">
          <button
            type="button"
            className="absolute right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] cursor-pointer rounded border border-red-300 bg-white px-3 py-2 text-xs text-red-700 shadow"
            onClick={() => void window.bokemoDesktop?.setExperimentalApiEnabled(false).then((settings) => {
              window.dispatchEvent(new CustomEvent('bokemo-experimental-api-settings', { detail: settings }));
            })}
          >
            {t('setting.experimentalApi.disableControl')}
          </button>
        </div>
      )}
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-30 pt-[env(safe-area-inset-top)]">
        <div className="absolute inset-0 bg-white/25 backdrop-blur-[4px]" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-[500px] px-3 py-2.5 bg-white/25 backdrop-blur-[4px]">
          <div className="flex justify-between items-center gap-3 min-h-[44px]">
            <div className="pl-3">
              {/* SpecRef: 8.1.2 | Header | Game title label */}
              <h1 className="flex items-center gap-1 text-lg font-bold">
                <span aria-label={gameTitle}>
                  <span className="inline-block text-[1.35em] leading-none" style={{ transform: 'rotate(-22.5deg) scale(1.0)' }}>{t('home.nav.expeditionIcon')}</span>
                  <span>{t('setting.theme.kemo')}</span>
                </span>
                <span className="text-xs font-normal text-gray-500">{versionLabel}</span>
              </h1>
            </div>
            <div className="flex items-center gap-2 pr-3 text-right text-sm font-medium leading-none">
              <button
                type="button"
                onClick={async () => {
                  // SpecRef: 8.6 | UI_SETTING | Debug pane(デバッグ)
                  const confirmed = window.confirm(t('home.debug.reportProgressConfirm'));
                  if (!confirmed) return;
                  try {
                    const isReported = await reportProgressForSpeedOfTime();
                    if (!isReported) {
                      window.alert(t('home.debug.reportProgressUnset'));
                      return;
                    }
                    const bonusUntilMs = Date.now() + SPEED_OF_TIME_BONUS_DURATION_MS;
                    setTimeSpeedBonusUntilMs(bonusUntilMs);
                    updateDebugSettings({ timeSpeed: 'x1_2' });
                    actions.addNotification(t('home.debug.reportProgressSuccess'), 'normal', 'stat', true);
                  } catch (error) {
                    console.error('Failed to report progress for Speed of Time:', error);
                    window.alert(t('home.debug.reportProgressFailure'));
                  }
                }}
                className={`${IOS_GLASS_BUTTON_CLASS} px-2 py-1 text-sub hover:opacity-90`}
              >
                {speedOfTimeLabel ? `${speedOfTimeSymbol} ${speedOfTimeLabel}` : speedOfTimeSymbol}
              </button>
              <span>{formatNumber(state.global.gold)}G</span>
              {!isAutoRepeatEnabled && (
                <button
                  type="button"
                  onClick={() => setAutoRepeatEnabled(true)}
                  className={`${IOS_GLASS_BUTTON_CLASS} px-2 py-1 text-sub hover:opacity-90`}
                >
                  {t('home.header.paused')}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Tabs */}
      <nav
        className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2"
        aria-label="Main navigation"
        onPointerDown={(event) => { primaryNavSwipeHandledRef.current = false; primaryNavPointerStartRef.current = { x: event.clientX, y: event.clientY, tab: activeTab }; }}
        onPointerUp={(event) => completePrimaryNavSwipe(event.clientX, event.clientY)}
        onPointerCancel={() => { primaryNavPointerStartRef.current = null; }}
      >
        <div className="pointer-events-auto mx-auto flex w-full max-w-[500px] gap-1.5 rounded-[26px] border border-transparent bg-white/10 p-1.5 shadow-[0_8px_20px_rgb(15_23_42/0.10)] backdrop-blur-sm">
          {tabs.map(tab => {
            const isActive = (isPartyExpeditionSplitView && (tab.id === 'expedition' || tab.id === activeWideModeSecondaryTab)) || (!isPartyExpeditionSplitView && activeTab === tab.id);
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (primaryNavSwipeHandledRef.current) {
                    primaryNavSwipeHandledRef.current = false;
                    return;
                  }
                  switchTab(tab.id);
                }}
                className={`${IOS_GLASS_TOP_TAB_CLASS} min-h-[44px] flex-1 px-1 py-2 text-xs font-semibold relative transition-colors ${
                  isActive
                    ? 'text-sub'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="relative z-10">{tab.label}</span>
                {tab.id === 'diary' && hasUnreadDiary && (
                  <span className="absolute -top-1 right-1 z-50 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                    {unreadDiaryBadgeLabel}
                  </span>
                )}
                {tab.id === 'setting' && hasUnreadDeveloperNews && (
                  <span className="absolute -top-1 right-1 z-50 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" aria-label="Unread developer news" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <div
        ref={tabContentRef}
        className={prefersDocumentScroll ? `px-4 ${CHROME_CONTENT_PADDING_CLASS}` : `flex-1 px-4 ${CHROME_CONTENT_PADDING_CLASS} ${isPartyExpeditionSplitViewEnabled ? 'overflow-hidden' : 'overflow-y-auto'}`}
        onScroll={() => {
          if (prefersDocumentScroll || isPartyExpeditionSplitViewEnabled) return;
          const currentScrollTop = tabContentRef.current?.scrollTop ?? 0;
          tabScrollPositionsRef.current[activeTab] = currentScrollTop;
        }}
      >
        {isPartyExpeditionSplitView ? (
          <div
            className="grid h-full justify-center gap-4 items-start"
            style={{ gridTemplateColumns: `repeat(2, minmax(0, ${TAB_PANEL_WIDTH_PX}px))` }}
          >
            <div
              ref={primarySplitTabContentRef}
              className="h-full w-full min-w-0 overflow-y-auto"
              onScroll={() => {
                const currentScrollTop = primarySplitTabContentRef.current?.scrollTop ?? 0;
                tabScrollPositionsRef.current.expedition = currentScrollTop;
              }}
            >
              {renderTabContent('expedition')}
            </div>
            <div
              ref={secondarySplitTabContentRef}
              className="h-full w-full min-w-0 overflow-y-auto"
              onScroll={() => {
                const currentScrollTop = secondarySplitTabContentRef.current?.scrollTop ?? 0;
                tabScrollPositionsRef.current[activeWideModeSecondaryTab] = currentScrollTop;
              }}
            >
              {renderTabContent(activeWideModeSecondaryTab)}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[500px] overflow-x-hidden">
            <div key={activeTab} className={`main-tab-transition main-tab-transition-${tabTransitionDirection}`}>
              {renderTabContent(activeTab)}
            </div>
          </div>
        )}
      </div>

      <NotificationToast
        notifications={notifications}
        onDismiss={onDismissNotification}
        onDismissAll={onDismissAllNotifications}
      />
    </div>
    </Profiler>
    </Suspense>
  );
}

// SpecRef: 8.2 | UI_PARTY | Party tab
// SpecRef: 8.2.1 | Displays | Displays
// SpecRef: 8.2.2 | Party member details | Party member details
// SpecRef: 8.2.3 | Character Edit Mode (selected member): | Character Edit Mode (selected member):
// SpecRef: 8.2.4 | Equipment management | Equipment management
