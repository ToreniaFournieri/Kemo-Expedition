import type { Character, DiaryLog, ExpeditionLog, GameState, InventoryRecord, Party, TerrainEffectKey } from '../types';
import type { RuntimeGameMode } from './runtimeGameMode';
import { DIARY_LOG_RETENTION_LIMIT } from './diary.ts';

export const AFK_CHUNK_CYCLE_COUNT = 30;
export type AfkWorkerSimulationStrategy = 'legacy' | 'optimized';

// SpecRef: 5.1 | PROGRESS | Chunk
// A terminal partial Chunk contains every complete Cycle that still fits in the
// party backlog. A sub-Cycle remainder stays available for online reconstruction.
export function getAfkChunkOperationCount(remainingMs: number, cycleDurationMs: number): number {
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return 0;
  if (!Number.isFinite(cycleDurationMs) || cycleDurationMs <= 0) return 0;
  return Math.min(AFK_CHUNK_CYCLE_COUNT, Math.floor(remainingMs / cycleDurationMs));
}

export interface AfkPartyDispatchCandidate {
  partyId: number;
  partyIndex: number;
  partyLocalEmulatedTime: number;
}

/**
 * Orders only currently eligible parties. Party-local emulated time is the
 * performance-oriented catch-up priority; Party ID is the stable tie breaker.
 */
export function compareAfkPartyDispatchCandidates(
  left: AfkPartyDispatchCandidate,
  right: AfkPartyDispatchCandidate,
): number {
  return left.partyLocalEmulatedTime - right.partyLocalEmulatedTime
    || left.partyId - right.partyId
    || left.partyIndex - right.partyIndex;
}

/** Removes the first accepted result from a Map-backed arrival FIFO. */
export function takeNextAfkFifoResult<T extends { jobId: string }>(
  queue: Map<string, T>,
): T | null {
  const first = queue.values().next();
  if (first.done) return null;
  queue.delete(first.value.jobId);
  return first.value;
}

/**
 * Scales recovery concurrency conservatively while retaining logical-processor
 * capacity for the renderer, Electron main process, persistence, and the OS.
 * The optional override is profile-only and remains subject to every runtime
 * safety cap.
 */
export function getAfkWorkerPoolLimit(
  logicalProcessors: number | undefined,
  partyCount: number,
  workerLimitOverride?: number,
): number {
  const availableParties = Number.isFinite(partyCount) ? Math.max(0, Math.floor(partyCount)) : 0;
  if (availableParties === 0) return 0;
  const processors = Number.isFinite(logicalProcessors) ? Math.max(1, Math.floor(logicalProcessors!)) : 4;
  const adaptiveHardwareLimit = processors <= 3
    ? 1
    : processors <= 7
      ? 2
      : Math.min(6, Math.floor(processors / 2) - 1);
  const hardwareLimit = Number.isFinite(workerLimitOverride)
    ? Math.max(1, Math.min(6, Math.floor(workerLimitOverride!)))
    : adaptiveHardwareLimit;
  return Math.min(availableParties, hardwareLimit);
}

export interface AfkPartyChunkJob {
  jobId: string;
  partyIndex: number;
  partyId: number;
  simulatedStartedAt: number;
  simulatedCompletedAt: number;
  cycleDurationMs: number;
  operationCount?: number;
  baseState: GameState;
  gameMode: RuntimeGameMode;
  enemyLevelOffset?: number;
  cycleDurationScale: number;
  queuedAt?: number;
  workerCreatedAt?: number;
  isFirstWorkerJob?: boolean;
  inputTransferBytes?: number;
  workerOptimization?: AfkWorkerSimulationStrategy;
  compactBattleResultOutput?: boolean;
}

export interface AfkPartyChunkColdWorkerJob extends AfkPartyChunkJob {
  transferSchemaVersion: 3;
  transferKind: 'cold';
  nextStateToken: string;
  reconciliationRevision: number;
}

type AfkContinuationDiaryLogTransferEntry =
  | { source: 'retained'; index: number }
  | { source: 'renderer'; value: DiaryLog };

type AfkContinuationLastExpeditionLogTransfer =
  | { source: 'retained' }
  | { source: 'diary'; index: number }
  | { source: 'renderer'; value: ExpeditionLog | null };

interface AfkContinuationPartyHistoryTransfer {
  diaryLogs: AfkContinuationDiaryLogTransferEntry[];
  lastExpeditionLog: AfkContinuationLastExpeditionLogTransfer;
}

export interface AfkPartyChunkContinuationWorkerJob extends AfkPartyChunkJob {
  transferSchemaVersion: 3;
  transferKind: 'continuation';
  retainedStateToken: string;
  nextStateToken: string;
  reconciliationRevision: number;
  retainedRevision: number;
  partyHistory: AfkContinuationPartyHistoryTransfer;
}

export type AfkPartyChunkWorkerJob = AfkPartyChunkColdWorkerJob | AfkPartyChunkContinuationWorkerJob;

export interface AfkPartyChunkInventoryColdWorkerJob extends AfkPartyChunkJob {
  inventoryTransferSchemaVersion: 4;
  inventoryTransferKind: 'cold';
  nextInventoryToken: string;
  inventoryRevision: number;
}

export interface AfkPartyChunkInventoryContinuationWorkerJob extends AfkPartyChunkJob {
  inventoryTransferSchemaVersion: 4;
  inventoryTransferKind: 'continuation';
  retainedInventoryToken: string;
  nextInventoryToken: string;
  retainedInventoryRevision: number;
  inventoryRevision: number;
  inventoryChanges: Record<string, InventoryRecord[string] | null>;
}

export type AfkPartyChunkInventoryWorkerJob =
  | AfkPartyChunkInventoryColdWorkerJob
  | AfkPartyChunkInventoryContinuationWorkerJob;

export interface AfkWorkerPhaseAttribution {
  statusSnapshotMs: number;
  expeditionMs: number;
  diaryFinalizationMs: number;
  sideQuestAutomationMs: number;
  profitProcessingMs: number;
  hpRecoveryMs: number;
  progressCallbackMs: number;
  chunkFinalizationMs: number;
  inventoryDeltaMs: number;
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

export interface AfkWorkerPerformanceTelemetry extends Partial<AfkWorkerPhaseAttribution> {
  workerStartupMs: number;
  queueMs: number;
  inputHydrationMs: number;
  languageReadyMs: number;
  executionMs: number;
  battleCount: number;
  battleTotalMs: number;
  battlePreparationMs: number;
  battleInputWriteMs: number;
  battleNativeExecutionMs: number;
  battleBorrowedOutputValidationMs: number;
  battleOutputConsumeMs: number;
  battleInputBytes: number;
  battleOutputBytes: number;
  battleResultBagEntryAllocations: number;
  inputTransferBytes: number | null;
  outputTransferBytes: number | null;
}

export interface AfkPartyChunkResult {
  schemaVersion: 1;
  jobId: string;
  partyIndex: number;
  partyId: number;
  simulatedCompletedAt: number;
  cycleDurationMs: number;
  operationCount: number;
  baseParty: Party;
  resultParty: Party;
  unlockedParties: Party[];
  globalDelta: AfkGlobalDelta;
  durationMs: number;
  workerTelemetry: AfkWorkerPerformanceTelemetry;
}

type AfkDiaryLogTransferEntry =
  | { source: 'base'; index: number }
  | { source: 'worker'; value: DiaryLog };

type AfkLastExpeditionLogTransfer =
  | { source: 'base' }
  | { source: 'diary'; index: number }
  | { source: 'worker'; value: ExpeditionLog | null };

interface AfkPartyHistoryTransfer {
  diaryLogs: AfkDiaryLogTransferEntry[];
  lastExpeditionLog: AfkLastExpeditionLogTransfer;
}

type AfkPartyChunkWorkerParty = Omit<Party, 'diaryLogs' | 'lastExpeditionLog'> & {
  diaryLogs: [];
  lastExpeditionLog: null;
};

const AFK_BASE_DIARY_INDEX_KEY = '__afkBaseDiaryIndex';

type AfkBaseDiaryPlaceholder = Pick<DiaryLog, 'id' | 'createdAt' | 'isRead'> & {
  [AFK_BASE_DIARY_INDEX_KEY]: number;
};

export type AfkPartyChunkWorkerResult = Omit<AfkPartyChunkResult, 'baseParty' | 'resultParty'> & {
  transferSchemaVersion: 2;
  resultParty: AfkPartyChunkWorkerParty;
  partyHistory: AfkPartyHistoryTransfer;
};

export type AfkPartyChunkWorkerResultV3 = Omit<AfkPartyChunkWorkerResult, 'transferSchemaVersion'> & {
  transferSchemaVersion: 3;
  consumedStateToken: string | null;
  nextStateToken: string;
  reconciliationRevision: number;
};

export type AfkPartyChunkInventoryWorkerResult = Omit<AfkPartyChunkWorkerResult, 'transferSchemaVersion'> & {
  transferSchemaVersion: 4;
  consumedInventoryToken: string | null;
  nextInventoryToken: string;
  inventoryRevision: number;
};

function createAfkBaseDiaryPlaceholder(diaryLog: DiaryLog, index: number): DiaryLog {
  return {
    id: diaryLog.id,
    createdAt: diaryLog.createdAt,
    isRead: diaryLog.isRead,
    [AFK_BASE_DIARY_INDEX_KEY]: index,
  } as AfkBaseDiaryPlaceholder as unknown as DiaryLog;
}

function getAfkBaseDiaryIndex(diaryLog: DiaryLog): number | null {
  const value = (diaryLog as DiaryLog & Partial<AfkBaseDiaryPlaceholder>)[AFK_BASE_DIARY_INDEX_KEY];
  return Number.isInteger(value) && value! >= 0 ? value! : null;
}

/**
 * Removes retained Diary presentation bodies from every party. The target
 * party keeps bounded identity/order/read placeholders so normal retention and
 * unread calculations remain authoritative without transferring old logs.
 */
export function createAfkPartyChunkWorkerState(
  state: GameState,
  partyIndex: number,
  historyStrategy: 'full' | 'placeholders' = 'placeholders',
): GameState {
  return {
    ...state,
    parties: state.parties.map((party, index) => (
      index === partyIndex
        ? historyStrategy === 'full'
          ? party
          : {
          ...party,
          lastExpeditionLog: null,
          diaryLogs: (party.diaryLogs ?? []).map(createAfkBaseDiaryPlaceholder),
          }
        : { ...party, lastExpeditionLog: null, diaryLogs: [] }
    )),
  };
}

export function createAfkPartyChunkWorkerResult(result: AfkPartyChunkResult): AfkPartyChunkWorkerResult {
  // SpecRef: 9.2.3 | Runtime retention and transfer | Worker and subsystem boundaries should transfer compact results or state deltas where practical
  const baseDiaryLogs = result.baseParty.diaryLogs ?? [];
  const resultDiaryLogs = result.resultParty.diaryLogs ?? [];
  const diaryLogs: AfkDiaryLogTransferEntry[] = resultDiaryLogs.map((diaryLog) => {
    const placeholderIndex = getAfkBaseDiaryIndex(diaryLog);
    const baseIndex = placeholderIndex ?? baseDiaryLogs.indexOf(diaryLog);
    return baseIndex >= 0
      ? { source: 'base', index: baseIndex }
      : { source: 'worker', value: diaryLog };
  });
  const resultDiaryIndex = resultDiaryLogs.findIndex((diaryLog) => (
    diaryLog.expeditionLog === result.resultParty.lastExpeditionLog
  ));
  const lastExpeditionLog: AfkLastExpeditionLogTransfer = result.resultParty.lastExpeditionLog === result.baseParty.lastExpeditionLog
    ? { source: 'base' }
    : resultDiaryIndex >= 0
      ? { source: 'diary', index: resultDiaryIndex }
      : { source: 'worker', value: result.resultParty.lastExpeditionLog };
  const { baseParty: _baseParty, ...workerResult } = result;
  return {
    ...workerResult,
    transferSchemaVersion: 2,
    resultParty: {
      ...workerResult.resultParty,
      lastExpeditionLog: null,
      diaryLogs: [] as [],
    },
    partyHistory: { diaryLogs, lastExpeditionLog },
  };
}

export function createAfkPartyChunkWorkerResultV3(
  result: AfkPartyChunkResult,
  continuation: Omit<AfkPartyChunkWorkerResultV3, keyof AfkPartyChunkWorkerResult | 'transferSchemaVersion'>,
): AfkPartyChunkWorkerResultV3 {
  return {
    ...createAfkPartyChunkWorkerResult(result),
    transferSchemaVersion: 3,
    ...continuation,
  };
}

function invalidAfkWorkerResult(message: string): never {
  throw new Error(`Invalid AFK worker transfer schema v2: ${message}`);
}

export function hydrateAfkPartyChunkResult(
  result: AfkPartyChunkWorkerResult,
  baseParty: Party,
): AfkPartyChunkResult {
  // SpecRef: 9.2.3 | Runtime retention and transfer | Worker and subsystem boundaries should transfer compact results or state deltas where practical
  if (result.transferSchemaVersion !== 2) invalidAfkWorkerResult('unsupported transferSchemaVersion');
  if (!Number.isInteger(result.partyIndex) || result.partyIndex < 0) invalidAfkWorkerResult('invalid partyIndex');
  if (result.partyId !== baseParty.id || result.resultParty.id !== result.partyId) {
    invalidAfkWorkerResult('party identity mismatch');
  }
  if (!result.partyHistory || !Array.isArray(result.partyHistory.diaryLogs)) {
    invalidAfkWorkerResult('missing partyHistory');
  }
  if (result.partyHistory.diaryLogs.length > DIARY_LOG_RETENTION_LIMIT) {
    invalidAfkWorkerResult('Diary retention limit exceeded');
  }
  const baseDiaryLogs = baseParty.diaryLogs ?? [];
  const diaryLogs = result.partyHistory.diaryLogs.map((entry, transferIndex) => {
    if (entry.source === 'worker') return entry.value;
    if (entry.source !== 'base' || !Number.isInteger(entry.index) || entry.index < 0 || entry.index >= baseDiaryLogs.length) {
      return invalidAfkWorkerResult(`invalid base Diary reference at transfer index ${transferIndex}`);
    }
    return baseDiaryLogs[entry.index]!;
  });
  if (!result.partyHistory.lastExpeditionLog) invalidAfkWorkerResult('missing lastExpeditionLog transfer');
  const lastExpeditionLog = result.partyHistory.lastExpeditionLog.source === 'base'
    ? baseParty.lastExpeditionLog
    : result.partyHistory.lastExpeditionLog.source === 'diary'
      ? (() => {
        const index = result.partyHistory.lastExpeditionLog.index;
        if (!Number.isInteger(index) || index < 0 || index >= diaryLogs.length) {
          return invalidAfkWorkerResult('invalid lastExpeditionLog Diary reference');
        }
        return diaryLogs[index]!.expeditionLog;
      })()
      : result.partyHistory.lastExpeditionLog.source === 'worker'
        ? result.partyHistory.lastExpeditionLog.value
        : invalidAfkWorkerResult('invalid lastExpeditionLog source');
  return {
    schemaVersion: result.schemaVersion,
    jobId: result.jobId,
    partyIndex: result.partyIndex,
    partyId: result.partyId,
    simulatedCompletedAt: result.simulatedCompletedAt,
    cycleDurationMs: result.cycleDurationMs,
    operationCount: result.operationCount,
    baseParty,
    resultParty: {
      ...result.resultParty,
      lastExpeditionLog,
      diaryLogs,
    },
    unlockedParties: result.unlockedParties,
    globalDelta: result.globalDelta,
    durationMs: result.durationMs,
    workerTelemetry: result.workerTelemetry,
  };
}

export function hydrateAfkPartyChunkResultV3(
  result: AfkPartyChunkWorkerResultV3,
  baseParty: Party,
): AfkPartyChunkResult {
  if (result.transferSchemaVersion !== 3) throw new Error('Invalid AFK worker transfer schema v3');
  if (!result.nextStateToken || !Number.isInteger(result.reconciliationRevision) || result.reconciliationRevision < 1) {
    throw new Error('Invalid AFK worker transfer schema v3 acknowledgement');
  }
  if (result.consumedStateToken !== null && typeof result.consumedStateToken !== 'string') {
    throw new Error('Invalid AFK worker transfer schema v3 consumed token');
  }
  return hydrateAfkPartyChunkResult({ ...result, transferSchemaVersion: 2 }, baseParty);
}

export function hydrateAfkPartyChunkInventoryResult(
  result: AfkPartyChunkInventoryWorkerResult,
  baseParty: Party,
  expected: AfkPartyChunkInventoryWorkerJob,
): AfkPartyChunkResult {
  if (result.transferSchemaVersion !== 4
    || result.nextInventoryToken !== expected.nextInventoryToken
    || result.inventoryRevision !== expected.inventoryRevision) {
    throw new Error('Invalid AFK inventory reconciliation acknowledgement');
  }
  if (result.consumedInventoryToken !== null && typeof result.consumedInventoryToken !== 'string') {
    throw new Error('Invalid AFK inventory reconciliation consumed token');
  }
  const expectedConsumedToken = expected.inventoryTransferKind === 'continuation'
    ? expected.retainedInventoryToken
    : null;
  if (result.consumedInventoryToken !== expectedConsumedToken) {
    throw new Error('Invalid AFK inventory reconciliation consumed token acknowledgement');
  }
  return hydrateAfkPartyChunkResult({ ...result, transferSchemaVersion: 2 }, baseParty);
}

export function createAfkPartyChunkInventoryColdWorkerJob(
  job: AfkPartyChunkJob,
  nextInventoryToken: string,
  inventoryRevision: number,
): AfkPartyChunkInventoryColdWorkerJob {
  if (!nextInventoryToken || !Number.isInteger(inventoryRevision) || inventoryRevision < 1) {
    throw new Error('Invalid AFK inventory cold transfer');
  }
  return {
    ...job,
    inventoryTransferSchemaVersion: 4,
    inventoryTransferKind: 'cold',
    nextInventoryToken,
    inventoryRevision,
  };
}

export function createAfkPartyChunkInventoryContinuationWorkerJob(
  job: AfkPartyChunkJob,
  retainedInventory: InventoryRecord,
  retainedInventoryToken: string,
  retainedInventoryRevision: number,
  nextInventoryToken: string,
  inventoryRevision: number,
): AfkPartyChunkInventoryContinuationWorkerJob {
  if (!retainedInventoryToken || !nextInventoryToken
    || !Number.isInteger(retainedInventoryRevision) || retainedInventoryRevision < 1
    || !Number.isInteger(inventoryRevision) || inventoryRevision <= retainedInventoryRevision) {
    throw new Error('Invalid AFK inventory continuation transfer');
  }
  const authoritativeInventory = job.baseState.global.inventory;
  const inventoryChanges: Record<string, InventoryRecord[string] | null> = {};
  Object.entries(authoritativeInventory).forEach(([key, variant]) => {
    if (retainedInventory[key] !== variant) inventoryChanges[key] = variant;
  });
  Object.keys(retainedInventory).forEach((key) => {
    if (!(key in authoritativeInventory)) inventoryChanges[key] = null;
  });
  return {
    ...job,
    baseState: {
      ...job.baseState,
      global: { ...job.baseState.global, inventory: {} },
    },
    inventoryTransferSchemaVersion: 4,
    inventoryTransferKind: 'continuation',
    retainedInventoryToken,
    nextInventoryToken,
    retainedInventoryRevision,
    inventoryRevision,
    inventoryChanges,
  };
}

export function hydrateAfkPartyChunkInventoryWorkerState(
  job: AfkPartyChunkInventoryWorkerJob,
  retainedInventory: InventoryRecord | null,
  retainedInventoryToken: string | null,
  retainedInventoryRevision: number,
): { state: GameState; inventory: InventoryRecord } {
  if (job.inventoryTransferSchemaVersion !== 4) {
    throw new Error('Invalid AFK inventory transfer schema');
  }
  if (job.inventoryTransferKind === 'cold') {
    if (!job.nextInventoryToken || !Number.isInteger(job.inventoryRevision) || job.inventoryRevision < 1) {
      throw new Error('Invalid AFK inventory cold state');
    }
    return { state: job.baseState, inventory: job.baseState.global.inventory };
  }
  if (!retainedInventory
    || job.retainedInventoryToken !== retainedInventoryToken
    || job.retainedInventoryRevision !== retainedInventoryRevision) {
    throw new Error('AFK inventory reconciliation state mismatch');
  }
  if (!job.nextInventoryToken || job.inventoryRevision <= retainedInventoryRevision) {
    throw new Error('AFK inventory reconciliation revision mismatch');
  }
  Object.entries(job.inventoryChanges).forEach(([key, variant]) => {
    if (variant === null) delete retainedInventory[key];
    else retainedInventory[key] = variant;
  });
  return {
    state: {
      ...job.baseState,
      global: { ...job.baseState.global, inventory: retainedInventory },
    },
    inventory: retainedInventory,
  };
}

export function createAfkPartyChunkInventoryWorkerResult(
  result: AfkPartyChunkResult,
  job: AfkPartyChunkInventoryWorkerJob,
): AfkPartyChunkInventoryWorkerResult {
  return {
    ...createAfkPartyChunkWorkerResult(result),
    transferSchemaVersion: 4,
    consumedInventoryToken: job.inventoryTransferKind === 'continuation' ? job.retainedInventoryToken : null,
    nextInventoryToken: job.nextInventoryToken,
    inventoryRevision: job.inventoryRevision,
  };
}

function diaryLogEqual(left: DiaryLog, right: DiaryLog): boolean {
  return left.id === right.id && JSON.stringify(left) === JSON.stringify(right);
}

export function createAfkPartyChunkColdWorkerJob(
  job: AfkPartyChunkJob,
  nextStateToken: string,
  reconciliationRevision: number,
): AfkPartyChunkColdWorkerJob {
  return {
    ...job,
    transferSchemaVersion: 3,
    transferKind: 'cold',
    nextStateToken,
    reconciliationRevision,
  };
}

export function createAfkPartyChunkContinuationWorkerJob(
  job: AfkPartyChunkJob,
  retainedParty: Party,
  retainedStateToken: string,
  retainedRevision: number,
  nextStateToken: string,
  reconciliationRevision: number,
): AfkPartyChunkContinuationWorkerJob {
  if (!retainedStateToken || retainedParty.id !== job.partyId) {
    throw new Error('Invalid AFK continuation source identity');
  }
  if (!Number.isInteger(retainedRevision) || retainedRevision < 1
    || !Number.isInteger(reconciliationRevision) || reconciliationRevision <= retainedRevision) {
    throw new Error('Invalid AFK continuation reconciliation revision');
  }
  const authoritativeParty = job.baseState.parties[job.partyIndex];
  if (!authoritativeParty || authoritativeParty.id !== job.partyId) {
    throw new Error('Invalid AFK continuation authoritative party');
  }
  const retainedDiaryLogs = retainedParty.diaryLogs ?? [];
  const authoritativeDiaryLogs = authoritativeParty.diaryLogs ?? [];
  const diaryLogs: AfkContinuationDiaryLogTransferEntry[] = authoritativeDiaryLogs.map((diaryLog) => {
    const retainedIndex = retainedDiaryLogs.findIndex((retained) => diaryLogEqual(retained, diaryLog));
    return retainedIndex >= 0
      ? { source: 'retained', index: retainedIndex }
      : { source: 'renderer', value: diaryLog };
  });
  const diaryIndex = authoritativeDiaryLogs.findIndex((entry) => entry.expeditionLog === authoritativeParty.lastExpeditionLog);
  const lastExpeditionLog: AfkContinuationLastExpeditionLogTransfer = authoritativeParty.lastExpeditionLog === retainedParty.lastExpeditionLog
    ? { source: 'retained' }
    : diaryIndex >= 0
      ? { source: 'diary', index: diaryIndex }
      : { source: 'renderer', value: authoritativeParty.lastExpeditionLog };
  const baseState = createAfkPartyChunkWorkerState(job.baseState, job.partyIndex);
  baseState.parties[job.partyIndex] = {
    ...authoritativeParty,
    diaryLogs: [],
    lastExpeditionLog: null,
  };
  return {
    ...job,
    baseState,
    transferSchemaVersion: 3,
    transferKind: 'continuation',
    retainedStateToken,
    nextStateToken,
    reconciliationRevision,
    retainedRevision,
    partyHistory: { diaryLogs, lastExpeditionLog },
  };
}

export function hydrateAfkPartyChunkContinuationWorkerState(
  job: AfkPartyChunkContinuationWorkerJob,
  retainedParty: Party,
  retainedStateToken: string,
  retainedRevision: number,
): GameState {
  if (job.transferSchemaVersion !== 3 || job.transferKind !== 'continuation') {
    throw new Error('Invalid AFK continuation transfer kind');
  }
  if (job.retainedStateToken !== retainedStateToken || job.retainedRevision !== retainedRevision) {
    throw new Error('AFK continuation state mismatch');
  }
  if (job.reconciliationRevision <= retainedRevision) {
    throw new Error('AFK continuation revision mismatch');
  }
  const compactParty = job.baseState.parties[job.partyIndex];
  if (!retainedParty || !compactParty || retainedParty.id !== job.partyId || compactParty.id !== job.partyId) {
    throw new Error('AFK continuation party identity mismatch');
  }
  if (!job.partyHistory || !Array.isArray(job.partyHistory.diaryLogs)
    || job.partyHistory.diaryLogs.length > DIARY_LOG_RETENTION_LIMIT) {
    throw new Error('Invalid AFK continuation Diary transfer');
  }
  const retainedDiaryLogs = retainedParty.diaryLogs ?? [];
  const diaryLogs = job.partyHistory.diaryLogs.map((entry, index) => {
    if (entry.source === 'renderer') return entry.value;
    if (entry.source !== 'retained' || !Number.isInteger(entry.index)
      || entry.index < 0 || entry.index >= retainedDiaryLogs.length) {
      throw new Error(`Invalid AFK continuation Diary reference at ${index}`);
    }
    return retainedDiaryLogs[entry.index]!;
  });
  const latest = job.partyHistory.lastExpeditionLog;
  if (!latest) throw new Error('Missing AFK continuation latest expedition transfer');
  const lastExpeditionLog = latest.source === 'retained'
    ? retainedParty.lastExpeditionLog
    : latest.source === 'diary'
      ? (() => {
        if (!Number.isInteger(latest.index) || latest.index < 0 || latest.index >= diaryLogs.length) {
          throw new Error('Invalid AFK continuation latest expedition reference');
        }
        return diaryLogs[latest.index]!.expeditionLog;
      })()
      : latest.source === 'renderer'
        ? latest.value
        : null;
  const parties = [...job.baseState.parties];
  parties[job.partyIndex] = { ...compactParty, diaryLogs, lastExpeditionLog };
  return { ...job.baseState, parties };
}

function normalizeTransferBytes(value: number | null | undefined): number | null {
  return value == null ? null : Math.max(0, Math.floor(value));
}

export interface AfkInventoryDeltaEntry {
  countDelta: number;
  isNew: boolean;
  variant: InventoryRecord[string];
}

export type AfkInventoryDelta = Record<string, AfkInventoryDeltaEntry>;

interface BattleStatDelta {
  defeats: number;
  encounters: number;
}

export interface AfkGlobalDelta {
  gold: number;
  prana: number;
  inventory: AfkInventoryDelta;
  jewels: Record<string, number>;
  deityDonations: Record<string, number>;
  altarVictoriesByEnemyType: Record<string, number>;
  enemyBattleStats: Record<number, BattleStatDelta>;
  unlockedMimorianEnemyIds: number[];
  unlockedDeities: string[];
  challengedGodNames: string[];
  revealedItemCompendiumItemIds: number[];
  revealedGlossaryAbilityIds: string[];
  revealedGlossaryTerrainKeys: TerrainEffectKey[];
}

export function compareAfkChunkResults(
  left: Pick<AfkPartyChunkResult, 'simulatedCompletedAt' | 'partyId' | 'jobId'>,
  right: Pick<AfkPartyChunkResult, 'simulatedCompletedAt' | 'partyId' | 'jobId'>,
): number {
  // Deterministic simulation-order helper retained for isolated profiles and
  // fixtures. The live AFK coordinator uses arrival FIFO instead.
  return left.simulatedCompletedAt - right.simulatedCompletedAt
    || left.partyId - right.partyId
    || left.jobId.localeCompare(right.jobId);
}

function jsonEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function addUnique<T>(current: T[], additions: T[]): T[] {
  const serializedCurrent = new Set(current.map((value) => JSON.stringify(value)));
  return [
    ...current,
    ...additions.filter((value) => {
      const key = JSON.stringify(value);
      if (serializedCurrent.has(key)) return false;
      serializedCurrent.add(key);
      return true;
    }),
  ];
}

function createNumberDelta(
  base: Record<string, number>,
  result: Record<string, number>,
): Record<string, number> {
  const delta: Record<string, number> = {};
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((key) => {
    const value = (result[key] ?? 0) - (base[key] ?? 0);
    if (value !== 0) delta[key] = value;
  });
  return delta;
}

function mergeNumberDelta(
  current: Record<string, number>,
  delta: Record<string, number>,
): Record<string, number> {
  const next = { ...current };
  Object.entries(delta).forEach(([key, value]) => {
    if (value !== 0) next[key] = Math.max(0, (next[key] ?? 0) + value);
  });
  return next;
}

function createBattleStatsDelta(
  base: NonNullable<GameState['global']['enemyBattleStats']>,
  result: NonNullable<GameState['global']['enemyBattleStats']>,
): Record<number, BattleStatDelta> {
  const delta: Record<number, BattleStatDelta> = {};
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((rawKey) => {
    const key = Number(rawKey);
    const baseValue = base[key] ?? { defeats: 0, encounters: 0 };
    const resultValue = result[key] ?? { defeats: 0, encounters: 0 };
    const value = {
      defeats: resultValue.defeats - baseValue.defeats,
      encounters: resultValue.encounters - baseValue.encounters,
    };
    if (value.defeats !== 0 || value.encounters !== 0) delta[key] = value;
  });
  return delta;
}

function mergeBattleStatsDelta(
  current: NonNullable<GameState['global']['enemyBattleStats']>,
  delta: Record<number, BattleStatDelta>,
): NonNullable<GameState['global']['enemyBattleStats']> {
  const next = { ...current };
  Object.entries(delta).forEach(([rawKey, value]) => {
    const key = Number(rawKey);
    const currentValue = next[key] ?? { defeats: 0, encounters: 0 };
    next[key] = {
      defeats: Math.max(0, currentValue.defeats + value.defeats),
      encounters: Math.max(0, currentValue.encounters + value.encounters),
    };
  });
  return next;
}

function createInventoryDelta(base: InventoryRecord, result: InventoryRecord): AfkInventoryDelta {
  const delta: AfkInventoryDelta = {};
  new Set([...Object.keys(base), ...Object.keys(result)]).forEach((key) => {
    const resultVariant = result[key];
    if (!resultVariant) return;
    const countDelta = resultVariant.count - (base[key]?.count ?? 0);
    if (countDelta !== 0 || resultVariant.isNew) {
      delta[key] = { countDelta, isNew: resultVariant.isNew === true, variant: resultVariant };
    }
  });
  return delta;
}

function mergeInventoryDelta(current: InventoryRecord, delta: AfkInventoryDelta): InventoryRecord {
  const next = { ...current };
  Object.entries(delta).forEach(([key, change]) => {
    const currentVariant = next[key];
    next[key] = {
      ...(currentVariant ?? change.variant),
      count: Math.max(0, Math.min(99, (currentVariant?.count ?? 0) + change.countDelta)),
      isNew: (currentVariant?.isNew ?? false) || change.isNew,
    };
  });
  return next;
}

function additions<T>(base: T[], result: T[]): T[] {
  const baseKeys = new Set(base.map((value) => JSON.stringify(value)));
  return result.filter((value) => !baseKeys.has(JSON.stringify(value)));
}

export function createAfkPartyChunkResult(
  job: AfkPartyChunkJob,
  resultState: GameState,
  durationMs: number,
  workerTelemetry: Partial<AfkWorkerPerformanceTelemetry> = {},
  inventoryDeltaOverride?: AfkInventoryDelta,
): AfkPartyChunkResult {
  const baseGlobal = job.baseState.global;
  const resultGlobal = resultState.global;
  return {
    schemaVersion: 1,
    jobId: job.jobId,
    partyIndex: job.partyIndex,
    partyId: job.partyId,
    simulatedCompletedAt: job.simulatedCompletedAt,
    cycleDurationMs: job.cycleDurationMs,
    operationCount: Math.max(1, Math.floor(job.operationCount ?? AFK_CHUNK_CYCLE_COUNT)),
    baseParty: job.baseState.parties[job.partyIndex],
    resultParty: resultState.parties[job.partyIndex],
    unlockedParties: resultState.parties.slice(job.baseState.parties.length),
    globalDelta: {
      gold: resultGlobal.gold - baseGlobal.gold,
      prana: resultGlobal.prana - baseGlobal.prana,
      inventory: inventoryDeltaOverride ?? createInventoryDelta(baseGlobal.inventory, resultGlobal.inventory),
      jewels: createNumberDelta(baseGlobal.jewels, resultGlobal.jewels),
      deityDonations: createNumberDelta(baseGlobal.deityDonations, resultGlobal.deityDonations),
      altarVictoriesByEnemyType: createNumberDelta(baseGlobal.altarVictoriesByEnemyType ?? {}, resultGlobal.altarVictoriesByEnemyType ?? {}),
      enemyBattleStats: createBattleStatsDelta(baseGlobal.enemyBattleStats ?? {}, resultGlobal.enemyBattleStats ?? {}),
      unlockedMimorianEnemyIds: additions(baseGlobal.unlockedMimorianEnemyIds, resultGlobal.unlockedMimorianEnemyIds),
      unlockedDeities: additions(baseGlobal.unlockedDeities, resultGlobal.unlockedDeities),
      challengedGodNames: additions(baseGlobal.challengedGodNames, resultGlobal.challengedGodNames),
      revealedItemCompendiumItemIds: additions(baseGlobal.revealedItemCompendiumItemIds, resultGlobal.revealedItemCompendiumItemIds),
      revealedGlossaryAbilityIds: additions(baseGlobal.revealedGlossaryAbilityIds, resultGlobal.revealedGlossaryAbilityIds),
      revealedGlossaryTerrainKeys: additions(baseGlobal.revealedGlossaryTerrainKeys, resultGlobal.revealedGlossaryTerrainKeys),
    },
    durationMs,
    workerTelemetry: {
      workerStartupMs: Math.max(0, workerTelemetry.workerStartupMs ?? 0),
      queueMs: Math.max(0, workerTelemetry.queueMs ?? 0),
      inputHydrationMs: Math.max(0, workerTelemetry.inputHydrationMs ?? 0),
      languageReadyMs: Math.max(0, workerTelemetry.languageReadyMs ?? 0),
      executionMs: Math.max(0, workerTelemetry.executionMs ?? durationMs),
      battleCount: Math.max(0, workerTelemetry.battleCount ?? 0),
      battleTotalMs: Math.max(0, workerTelemetry.battleTotalMs ?? 0),
      battlePreparationMs: Math.max(0, workerTelemetry.battlePreparationMs ?? 0),
      battleInputWriteMs: Math.max(0, workerTelemetry.battleInputWriteMs ?? 0),
      battleNativeExecutionMs: Math.max(0, workerTelemetry.battleNativeExecutionMs ?? 0),
      battleBorrowedOutputValidationMs: Math.max(0, workerTelemetry.battleBorrowedOutputValidationMs ?? 0),
      battleOutputConsumeMs: Math.max(0, workerTelemetry.battleOutputConsumeMs ?? 0),
      battleInputBytes: Math.max(0, workerTelemetry.battleInputBytes ?? 0),
      battleOutputBytes: Math.max(0, workerTelemetry.battleOutputBytes ?? 0),
      battleResultBagEntryAllocations: Math.max(0, workerTelemetry.battleResultBagEntryAllocations ?? 0),
      inputTransferBytes: normalizeTransferBytes(workerTelemetry.inputTransferBytes ?? job.inputTransferBytes),
      outputTransferBytes: normalizeTransferBytes(workerTelemetry.outputTransferBytes),
    },
  };
}

function overlayChangedCharacterSettings(base: Character[], result: Character[], live: Character[]): Character[] {
  if (jsonEqual(base, live)) return result;
  const liveById = new Map(live.map((character) => [character.id, character]));
  const resultById = new Map(result.map((character) => [character.id, character]));
  return live.map((liveCharacter) => {
    const baseCharacter = base.find((character) => character.id === liveCharacter.id);
    const resultCharacter = resultById.get(liveCharacter.id) ?? liveCharacter;
    return baseCharacter && jsonEqual(baseCharacter, liveCharacter) ? resultCharacter : liveCharacter;
  }).filter((character) => liveById.has(character.id));
}

const PARTY_SETTING_KEYS = [
  'name',
  'deity',
  'selectedDungeonId',
  'expeditionDestinationMode',
  'expeditionDepthLimit',
  'expeditionDifficultyOffset',
  'expeditionDifficultyOffsetByDungeon',
  'diarySettings',
] as const satisfies ReadonlyArray<keyof Party>;

/**
 * Captures whether this PT has live changes that were made after its worker
 * snapshot. The coordinator calls this once, before committing the Chunk, so
 * later changes cannot alter the auto-equipment decision for this boundary.
 */
export function hasPendingPartySettingChanges(base: Party, live: Party): boolean {
  return PARTY_SETTING_KEYS.some((key) => !jsonEqual(base[key], live[key]))
    || !jsonEqual(base.characters, live.characters);
}

export function overlayPendingPartySettings(base: Party, result: Party, live: Party): Party {
  const next = { ...result };
  PARTY_SETTING_KEYS.forEach((key) => {
    if (!jsonEqual(base[key], live[key])) {
      (next as unknown as Record<string, unknown>)[key] = live[key];
    }
  });
  next.characters = overlayChangedCharacterSettings(base.characters, result.characters, live.characters);
  return next;
}

/**
 * Applies one completed party Chunk to the authoritative state. Workers operate
 * on captured snapshots, so shared additions are merged as deltas while live PT
 * settings are overlaid after the Chunk result.
 */
export function commitAfkPartyChunk(current: GameState, result: AfkPartyChunkResult): GameState {
  const baseParty = result.baseParty;
  const resultParty = result.resultParty;
  const liveParty = current.parties.find((party) => party.id === result.partyId)
    ?? current.parties[result.partyIndex];
  if (!baseParty || !resultParty || !liveParty) return current;

  const parties = [...current.parties];
  const livePartyIndex = parties.findIndex((party) => party.id === result.partyId);
  if (livePartyIndex < 0) return current;
  parties[livePartyIndex] = overlayPendingPartySettings(baseParty, resultParty, liveParty);

  result.unlockedParties.forEach((unlockedParty) => {
    if (!parties.some((party) => party.id === unlockedParty.id)) parties.push(unlockedParty);
  });

  const currentGlobal = current.global;
  const delta = result.globalDelta;

  return {
    ...current,
    parties,
    global: {
      ...currentGlobal,
      gold: Math.max(0, currentGlobal.gold + delta.gold),
      prana: Math.max(0, currentGlobal.prana + delta.prana),
      inventory: mergeInventoryDelta(currentGlobal.inventory, delta.inventory),
      jewels: mergeNumberDelta(currentGlobal.jewels, delta.jewels),
      deityDonations: mergeNumberDelta(currentGlobal.deityDonations, delta.deityDonations),
      altarVictoriesByEnemyType: mergeNumberDelta(
        currentGlobal.altarVictoriesByEnemyType ?? {},
        delta.altarVictoriesByEnemyType,
      ),
      enemyBattleStats: mergeBattleStatsDelta(
        currentGlobal.enemyBattleStats ?? {},
        delta.enemyBattleStats,
      ),
      unlockedMimorianEnemyIds: addUnique(currentGlobal.unlockedMimorianEnemyIds, delta.unlockedMimorianEnemyIds),
      unlockedDeities: addUnique(currentGlobal.unlockedDeities, delta.unlockedDeities),
      challengedGodNames: addUnique(currentGlobal.challengedGodNames, delta.challengedGodNames),
      revealedItemCompendiumItemIds: addUnique(currentGlobal.revealedItemCompendiumItemIds, delta.revealedItemCompendiumItemIds),
      revealedGlossaryAbilityIds: addUnique(currentGlobal.revealedGlossaryAbilityIds, delta.revealedGlossaryAbilityIds),
      revealedGlossaryTerrainKeys: addUnique(currentGlobal.revealedGlossaryTerrainKeys, delta.revealedGlossaryTerrainKeys),
    },
  };
}
