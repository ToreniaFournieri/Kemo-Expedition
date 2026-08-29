import type { DiaryLog, ExpeditionLog, GameState, Party } from '../types';
import { DIARY_LOG_RETENTION_LIMIT } from './diary.ts';
import { serializeGameState } from './saveCodec.ts';
import { decodePersistedState } from './storageCompression.ts';

export const LOG_SEGMENTED_SAVE_FORMAT = 'log-segmented-v1' as const;
export const LOG_SEGMENTED_SAVE_SCHEMA_VERSION = 1 as const;

export interface LogSegmentedStorage {
  readonly length: number;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
}

type PersistedDiaryLogBody = Omit<DiaryLog, 'isRead'>;

interface PersistedDiaryLogReference {
  readonly id: string;
  readonly isRead: boolean;
  readonly recordKey: string;
}

type PersistedLastExpeditionLog =
  | { readonly source: 'diary'; readonly diaryLogId: string }
  | { readonly source: 'explicit'; readonly value: ExpeditionLog | null };

interface PersistedPartyHistory {
  readonly partyId: number;
  readonly diaryLogs: readonly PersistedDiaryLogReference[];
  readonly lastExpeditionLog: PersistedLastExpeditionLog;
  readonly pendingDiaryLog: DiaryLog | null;
}

type LogStrippedParty = Omit<Party, 'diaryLogs' | 'lastExpeditionLog' | 'pendingDiaryLog'> & {
  readonly diaryLogs: [];
  readonly lastExpeditionLog: null;
  readonly pendingDiaryLog: null;
};

type LogStrippedGameState = Omit<GameState, 'parties'> & {
  readonly parties: readonly LogStrippedParty[];
};

export interface LogSegmentedSaveCore {
  readonly storageFormat: typeof LOG_SEGMENTED_SAVE_FORMAT;
  readonly schemaVersion: typeof LOG_SEGMENTED_SAVE_SCHEMA_VERSION;
  readonly state: LogStrippedGameState;
  readonly partyHistories: readonly PersistedPartyHistory[];
}

export interface PersistedDiaryLogRecord {
  readonly storageFormat: typeof LOG_SEGMENTED_SAVE_FORMAT;
  readonly schemaVersion: typeof LOG_SEGMENTED_SAVE_SCHEMA_VERSION;
  readonly partyId: number;
  readonly logId: string;
  readonly value: PersistedDiaryLogBody;
}

export interface PreparedDiaryLogRecord {
  readonly key: string;
  readonly jsonPayload: string;
}

export interface LogSegmentedSaveProjection {
  readonly core: LogSegmentedSaveCore;
  readonly coreJsonPayload: string;
  readonly newLogRecords: readonly PreparedDiaryLogRecord[];
  readonly retainedLogKeys: ReadonlySet<string>;
  readonly coreJsonChars: number;
}

function invalidSegmentedSave(message: string): never {
  throw new Error(`Invalid ${LOG_SEGMENTED_SAVE_FORMAT} save: ${message}`);
}

export function getDiaryLogStoragePrefix(storageKey: string): string {
  return `${storageKey}:diary:`;
}

export function getDiaryLogStorageKey(storageKey: string, partyId: number, logId: string, recordNamespace?: string): string {
  if (!Number.isInteger(partyId) || partyId < 1 || typeof logId !== 'string' || logId.length === 0) {
    throw new Error('Cannot create a Diary storage key without a valid Party and log ID.');
  }
  const base = `${getDiaryLogStoragePrefix(storageKey)}${partyId}:${encodeURIComponent(logId)}`;
  return recordNamespace ? `${base}:${encodeURIComponent(recordNamespace)}` : base;
}

function withoutReadState(log: DiaryLog): PersistedDiaryLogBody {
  const { isRead: _isRead, ...value } = log;
  return value;
}

function findLastExpeditionDiaryReference(
  party: Party,
  cachedReferences?: WeakMap<object, string>,
): string | null {
  const latest = party.lastExpeditionLog;
  if (!latest) return null;

  const identityMatch = party.diaryLogs.find((entry) => entry.expeditionLog === latest);
  if (identityMatch) {
    cachedReferences?.set(latest, identityMatch.id);
    return identityMatch.id;
  }

  const cachedId = cachedReferences?.get(latest);
  if (cachedId && party.diaryLogs.some((entry) => entry.id === cachedId)) return cachedId;

  // Legacy monolithic saves duplicate `lastExpeditionLog` instead of retaining
  // the Diary object's identity. Pay this exact comparison once, then cache the
  // reference for subsequent checkpoints in the same runtime session.
  const serializedLatest = JSON.stringify(latest);
  const structuralMatch = party.diaryLogs.find((entry) => JSON.stringify(entry.expeditionLog) === serializedLatest);
  if (!structuralMatch) return null;
  cachedReferences?.set(latest, structuralMatch.id);
  return structuralMatch.id;
}

export function createLogSegmentedSaveProjection(
  state: GameState,
  storageKey: string,
  persistedLogKeys: ReadonlySet<string> = new Set(),
  options: {
    readonly rewriteAllLogs?: boolean;
    readonly recordNamespace?: string;
    readonly stateAlreadySerialized?: boolean;
    readonly cachedLastReferences?: WeakMap<object, string>;
  } = {},
): LogSegmentedSaveProjection {
  // SpecRef: 9.2.3 | Runtime retention and transfer | Keep immutable retained
  // Diary bodies independently addressable so unchanged history is not copied
  // or recompressed by ordinary and AFK checkpoints.
  const serialized = options.stateAlreadySerialized ? state : serializeGameState(state);
  const retainedLogKeys = new Set<string>();
  const newLogRecords: PreparedDiaryLogRecord[] = [];
  const partyHistories: PersistedPartyHistory[] = [];

  const parties = serialized.parties.map((party): LogStrippedParty => {
    if (party.diaryLogs.length > DIARY_LOG_RETENTION_LIMIT) {
      invalidSegmentedSave(`Party ${party.id} exceeds the Diary retention limit`);
    }
    const seenIds = new Set<string>();
    const diaryLogs = party.diaryLogs.map((log): PersistedDiaryLogReference => {
      if (!log || typeof log.id !== 'string' || log.id.length === 0 || seenIds.has(log.id)) {
        invalidSegmentedSave(`Party ${party.id} has an invalid or duplicate Diary log ID`);
      }
      seenIds.add(log.id);
      const recordKey = getDiaryLogStorageKey(storageKey, party.id, log.id, options.recordNamespace);
      retainedLogKeys.add(recordKey);
      if (options.rewriteAllLogs || !persistedLogKeys.has(recordKey)) {
        const record: PersistedDiaryLogRecord = {
          storageFormat: LOG_SEGMENTED_SAVE_FORMAT,
          schemaVersion: LOG_SEGMENTED_SAVE_SCHEMA_VERSION,
          partyId: party.id,
          logId: log.id,
          value: withoutReadState(log),
        };
        newLogRecords.push({ key: recordKey, jsonPayload: JSON.stringify(record) });
      }
      return { id: log.id, isRead: log.isRead === true, recordKey };
    });

    const diaryLogId = findLastExpeditionDiaryReference(party, options.cachedLastReferences);
    partyHistories.push({
      partyId: party.id,
      diaryLogs,
      lastExpeditionLog: diaryLogId
        ? { source: 'diary', diaryLogId }
        : { source: 'explicit', value: party.lastExpeditionLog },
      pendingDiaryLog: party.pendingDiaryLog,
    });

    const {
      diaryLogs: _diaryLogs,
      lastExpeditionLog: _lastExpeditionLog,
      pendingDiaryLog: _pendingDiaryLog,
      ...partyWithoutLogs
    } = party;
    return {
      ...partyWithoutLogs,
      diaryLogs: [],
      lastExpeditionLog: null,
      pendingDiaryLog: null,
    };
  });

  const core: LogSegmentedSaveCore = {
    storageFormat: LOG_SEGMENTED_SAVE_FORMAT,
    schemaVersion: LOG_SEGMENTED_SAVE_SCHEMA_VERSION,
    state: { ...serialized, parties },
    partyHistories,
  };
  const coreJsonPayload = JSON.stringify(core);
  return {
    core,
    coreJsonPayload,
    newLogRecords,
    retainedLogKeys,
    coreJsonChars: coreJsonPayload.length,
  };
}

function parseCore(encodedPayload: string): LogSegmentedSaveCore | null {
  const parsed = JSON.parse(decodePersistedState(encodedPayload)) as Partial<LogSegmentedSaveCore>;
  if (parsed?.storageFormat !== LOG_SEGMENTED_SAVE_FORMAT) return null;
  if (parsed.schemaVersion !== LOG_SEGMENTED_SAVE_SCHEMA_VERSION) {
    invalidSegmentedSave('unsupported schema version');
  }
  if (!parsed.state || !Array.isArray(parsed.state.parties) || !Array.isArray(parsed.partyHistories)) {
    invalidSegmentedSave('missing state or Party histories');
  }
  return parsed as LogSegmentedSaveCore;
}

export function getPersistedDiaryLogKeys(encodedPayload: string | null): Set<string> {
  if (!encodedPayload) return new Set();
  const core = parseCore(encodedPayload);
  if (!core) return new Set();
  return new Set(core.partyHistories.flatMap((history) => history.diaryLogs.map((entry) => entry.recordKey)));
}

function readDiaryLogRecord(
  storage: Pick<LogSegmentedStorage, 'getItem'>,
  reference: PersistedDiaryLogReference,
  partyId: number,
  storageKey: string,
  onMissingDiaryRecord?: (partyId: number, logId: string) => void,
): DiaryLog | null {
  const baseKey = getDiaryLogStorageKey(storageKey, partyId, reference.id);
  if (reference.recordKey !== baseKey && !reference.recordKey.startsWith(`${baseKey}:`)) {
    invalidSegmentedSave(`Diary record key mismatch for ${reference.id}`);
  }
  const encodedRecord = storage.getItem(reference.recordKey);
  if (!encodedRecord) {
    if (onMissingDiaryRecord) {
      onMissingDiaryRecord(partyId, reference.id);
      return null;
    }
    invalidSegmentedSave(`missing Diary record ${reference.id}`);
  }
  const parsed = JSON.parse(decodePersistedState(encodedRecord)) as Partial<PersistedDiaryLogRecord>;
  if (parsed.storageFormat !== LOG_SEGMENTED_SAVE_FORMAT
    || parsed.schemaVersion !== LOG_SEGMENTED_SAVE_SCHEMA_VERSION
    || parsed.partyId !== partyId
    || parsed.logId !== reference.id
    || !parsed.value
    || parsed.value.id !== reference.id) {
    invalidSegmentedSave(`Diary record identity mismatch for ${reference.id}`);
  }
  return { ...parsed.value, isRead: reference.isRead === true } as DiaryLog;
}

export function hydrateLogSegmentedSave(
  encodedPayload: string,
  storage: Pick<LogSegmentedStorage, 'getItem'>,
  storageKey: string,
  options: {
    readonly onMissingDiaryRecord?: (partyId: number, logId: string) => void;
  } = {},
): GameState | null {
  const core = parseCore(encodedPayload);
  if (!core) return null;
  if (core.partyHistories.length !== core.state.parties.length) {
    invalidSegmentedSave('Party history count mismatch');
  }

  const parties = core.state.parties.map((party, partyIndex): Party => {
    const history = core.partyHistories[partyIndex];
    if (!history || history.partyId !== party.id || history.diaryLogs.length > DIARY_LOG_RETENTION_LIMIT) {
      return invalidSegmentedSave(`Party history mismatch at index ${partyIndex}`);
    }
    const seenIds = new Set<string>();
    const diaryLogs = history.diaryLogs.flatMap((reference) => {
      if (seenIds.has(reference.id)) invalidSegmentedSave(`duplicate Diary reference ${reference.id}`);
      seenIds.add(reference.id);
      const diaryLog = readDiaryLogRecord(
        storage,
        reference,
        party.id,
        storageKey,
        options.onMissingDiaryRecord,
      );
      return diaryLog ? [diaryLog] : [];
    });
    const latestTransfer = history.lastExpeditionLog;
    const lastExpeditionLog = latestTransfer.source === 'diary'
      ? (() => {
        const diary = diaryLogs.find((entry) => entry.id === latestTransfer.diaryLogId);
        if (!diary) {
          if (options.onMissingDiaryRecord
            && history.diaryLogs.some((entry) => entry.id === latestTransfer.diaryLogId)) return null;
          return invalidSegmentedSave('latest-expedition Diary reference is unavailable');
        }
        return diary.expeditionLog;
      })()
      : latestTransfer.source === 'explicit'
        ? latestTransfer.value
        : invalidSegmentedSave('invalid latest-expedition reference');
    return {
      ...party,
      diaryLogs,
      lastExpeditionLog,
      pendingDiaryLog: history.pendingDiaryLog,
      hasUnreadDiary: diaryLogs.some((entry) => !entry.isRead),
    };
  });

  return { ...core.state, parties } as GameState;
}

export function removeOrphanedDiaryLogRecords(
  storageKey: string,
  storage: Pick<LogSegmentedStorage, 'length' | 'key' | 'removeItem'>,
  retainedLogKeys: ReadonlySet<string>,
): number {
  const prefix = getDiaryLogStoragePrefix(storageKey);
  const removals: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix) && !retainedLogKeys.has(key)) removals.push(key);
  }
  removals.forEach((key) => storage.removeItem(key));
  return removals.length;
}

export function removeAllDiaryLogRecords(
  storageKey: string,
  storage: Pick<LogSegmentedStorage, 'length' | 'key' | 'removeItem'>,
): number {
  return removeOrphanedDiaryLogRecords(storageKey, storage, new Set());
}
