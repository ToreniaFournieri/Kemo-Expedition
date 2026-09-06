import type { GameState } from '../types';
import {
  createLogSegmentedSaveProjection,
  getPersistedDiaryLogKeys,
  removeOrphanedDiaryLogRecords,
  type LogSegmentedStorage,
  type PreparedDiaryLogRecord,
} from './logSegmentedSave.ts';
import { serializeGameState } from './saveCodec.ts';
import { encodePersistedState } from './storageCompression.ts';

export interface PersistedStateWriter { setItem(key: string, value: string): void }
export type PersistedStateStorage = LogSegmentedStorage;
export interface PersistencePhaseDurations { canonicalSnapshotMs: number; jsonStringifyMs: number; compressionEncodingMs: number; storageWriteMs: number; endToEndMs: number }
export interface PersistencePayloadSizes { jsonChars: number; jsonUtf8Bytes: number; jsonUtf16Bytes: number; encodedChars: number; encodedUtf8Bytes: number; encodedUtf16Bytes: number; compressionRatio: number }
export interface PersistedStateProfile { phases: PersistencePhaseDurations; sizes: PersistencePayloadSizes }
interface PersistenceProfilingOptions { now?: () => number; includeUtf8Sizes?: boolean }

export interface PersistenceWorkerRequest {
  readonly type: 'encode'; readonly requestId: number; readonly revision: number;
  readonly jsonPayload: string; readonly submittedAt: number;
  readonly logRecords?: readonly PreparedDiaryLogRecord[];
}
export type PersistenceWorkerResponse =
  | { readonly type: 'complete'; readonly requestId: number; readonly revision: number; readonly encodedPayload: string; readonly encodedLogRecords: readonly { key: string; encodedPayload: string }[]; readonly queueLatencyMs: number; readonly compressionMs: number; readonly completedAt: number }
  | { readonly type: 'error'; readonly requestId: number; readonly revision: number; readonly message: string };
export interface PersistenceWorkerLike {
  onmessage: ((event: MessageEvent<PersistenceWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: PersistenceWorkerRequest): void;
  terminate(): void;
}

export type PersistenceTelemetryEventName = 'canonical_snapshot' | 'json_serialization' | 'worker_submission'
  | 'worker_queue_latency' | 'worker_compression' | 'result_delivery' | 'storage_write'
  | 'durability_latency' | 'event_loop_delay' | 'worker_error' | 'storage_error';
export interface PersistenceTelemetryEvent {
  readonly event: PersistenceTelemetryEventName; readonly revision: number; readonly requestId?: number;
  readonly durationMs: number; readonly data?: Readonly<Record<string, string | number | boolean>>;
}
export interface PersistenceCoordinatorOptions {
  readonly storageKey: string; readonly storage: PersistedStateStorage;
  readonly workerFactory: () => PersistenceWorkerLike; readonly now?: () => number;
  readonly onTelemetry?: (event: PersistenceTelemetryEvent) => void;
  readonly onError?: (error: Error) => void;
}

interface PreparedSave {
  readonly revision: number;
  readonly jsonPayload: string;
  readonly logRecords: readonly PreparedDiaryLogRecord[];
  readonly retainedLogKeys: readonly string[];
  readonly requestedAt: number;
}
interface InFlightSave extends PreparedSave { readonly requestId: number }
interface StorageRetry extends InFlightSave {
  readonly encodedPayload: string;
  readonly encodedLogRecords: readonly { key: string; encodedPayload: string }[];
}
interface DurableWaiter { readonly revision: number; readonly resolve: () => void; readonly reject: (error: Error) => void }

export class PersistenceShutdownError extends Error {
  constructor() { super('Persistence coordinator was shut down before durability was reached.'); this.name = 'PersistenceShutdownError' }
}

function getUtf8ByteLength(value: string): number { return new TextEncoder().encode(value).byteLength }
function getCrossContextNow(): number { return performance.timeOrigin + performance.now() }

/** Milestone 1 synchronous reference pipeline retained for byte-parity tests and baselines. */
// SpecRef: 5.1.4 | Save and load | Data persistence
export function persistGameState(state: GameState, storageKey: string, storage: PersistedStateWriter, profiling?: PersistenceProfilingOptions): PersistedStateProfile | null {
  const now = profiling?.now ?? (() => performance.now());
  const enabled = profiling !== undefined;
  const endStarted = enabled ? now() : 0;
  const canonicalStarted = enabled ? now() : 0;
  const canonical = serializeGameState(state);
  const canonicalSnapshotMs = enabled ? now() - canonicalStarted : 0;
  const stringifyStarted = enabled ? now() : 0;
  const jsonPayload = JSON.stringify(canonical);
  const jsonStringifyMs = enabled ? now() - stringifyStarted : 0;
  const compressionStarted = enabled ? now() : 0;
  const encodedPayload = encodePersistedState(jsonPayload);
  const compressionEncodingMs = enabled ? now() - compressionStarted : 0;
  const storageStarted = enabled ? now() : 0;
  storage.setItem(storageKey, encodedPayload);
  const storageWriteMs = enabled ? now() - storageStarted : 0;
  const endToEndMs = enabled ? now() - endStarted : 0;
  if (!enabled) return null;
  const jsonUtf16Bytes = jsonPayload.length * 2;
  const encodedUtf16Bytes = encodedPayload.length * 2;
  return {
    phases: { canonicalSnapshotMs, jsonStringifyMs, compressionEncodingMs, storageWriteMs, endToEndMs },
    sizes: {
      jsonChars: jsonPayload.length, jsonUtf8Bytes: profiling.includeUtf8Sizes ? getUtf8ByteLength(jsonPayload) : 0, jsonUtf16Bytes,
      encodedChars: encodedPayload.length, encodedUtf8Bytes: profiling.includeUtf8Sizes ? getUtf8ByteLength(encodedPayload) : 0, encodedUtf16Bytes,
      compressionRatio: jsonUtf16Bytes === 0 ? 0 : encodedUtf16Bytes / jsonUtf16Bytes,
    },
  };
}

/** One active encode plus one replaceable latest-state pending snapshot. */
export class PersistenceCoordinator {
  private readonly options: PersistenceCoordinatorOptions;
  private readonly now: () => number;
  private worker: PersistenceWorkerLike | null = null;
  private revision = 0;
  private requestId = 0;
  private durableRevision = 0;
  private inFlight: InFlightSave | null = null;
  private pending: PreparedSave | null = null;
  private storageRetry: StorageRetry | null = null;
  private waiters: DurableWaiter[] = [];
  private persistedLogKeys: Set<string>;
  private readonly cachedLastLogReferences = new WeakMap<object, string>();
  private readonly replacementRecordNamespace = globalThis.crypto?.randomUUID?.()
    ?? `replacement-${Date.now()}-${Math.floor(performance.now() * 1000)}`;
  private selfContainedThroughRevision = 0;
  private lastEnqueuedState: GameState | null = null;
  private lastEnqueuedRevision = 0;
  private stopped = false;

  constructor(options: PersistenceCoordinatorOptions) {
    this.options = options;
    this.now = options.now ?? (() => performance.now());
    this.persistedLogKeys = getPersistedDiaryLogKeys(options.storage.getItem(options.storageKey));
  }

  // SpecRef: 9.1.3 | Experimental AI API | Evaluation transactions
  // API transactions need immediate failure, not background retry of an uncommitted state.
  commitAtomic(state: GameState): void {
    if (this.stopped) throw new PersistenceShutdownError();
    persistGameState(state, this.options.storageKey, this.options.storage);
    this.worker?.terminate(); this.worker = null;
    this.inFlight = null; this.pending = null; this.storageRetry = null;
    this.durableRevision = ++this.revision;
    this.lastEnqueuedState = state; this.lastEnqueuedRevision = this.revision;
    this.persistedLogKeys = new Set();
    const waiters = this.waiters; this.waiters = [];
    waiters.forEach(waiter => waiter.resolve());
  }
  requestOrdinary(state: GameState): number { return this.enqueue(state) }
  requestDurable(state: GameState): Promise<void> { const revision = this.enqueue(state); return this.waitForRevision(revision) }
  replaceDurable(state: GameState): Promise<void> { const revision = this.enqueue(state, true); return this.waitForRevision(revision) }
  async createExportPayload(state: GameState): Promise<string> {
    if (this.stopped) throw new PersistenceShutdownError();
    const jsonPayload = JSON.stringify(serializeGameState(state));
    const worker = this.options.workerFactory();
    return new Promise<string>((resolve, reject) => {
      const finish = () => worker.terminate();
      worker.onmessage = (event) => {
        const response = event.data;
        finish();
        if (response.type === 'error') reject(new Error(response.message));
        else resolve(response.encodedPayload);
      };
      worker.onerror = (event) => { finish(); reject(new Error(event.message || 'Export compression worker failed.')); };
      worker.postMessage({
        type: 'encode',
        requestId: 0,
        revision: 0,
        jsonPayload,
        submittedAt: getCrossContextNow(),
      });
    });
  }
  flush(): Promise<void> {
    if (this.stopped) return Promise.reject(new PersistenceShutdownError());
    if (this.revision === 0 || this.durableRevision >= this.revision) return Promise.resolve();
    return this.waitForRevision(this.revision);
  }
  retry(): void {
    if (this.stopped) return;
    if (this.storageRetry) this.writeEncodedPayload(this.storageRetry);
    else this.startPending();
  }
  shutdown(): void {
    if (this.stopped) return;
    this.stopped = true;
    this.worker?.terminate();
    this.worker = null; this.inFlight = null; this.pending = null; this.storageRetry = null;
    const error = new PersistenceShutdownError();
    const waiters = this.waiters; this.waiters = [];
    waiters.forEach((waiter) => waiter.reject(error));
  }
  getSnapshotForTesting() {
    return Object.freeze({ revision: this.revision, durableRevision: this.durableRevision,
      inFlightRevision: this.inFlight?.revision ?? null, pendingRevision: this.pending?.revision ?? null,
      storageRetryRevision: this.storageRetry?.revision ?? null });
  }

  private emit(event: PersistenceTelemetryEvent): void { this.options.onTelemetry?.(event) }
  private enqueue(state: GameState, rewriteAllLogs = false): number {
    if (this.stopped) throw new PersistenceShutdownError();
    if (!rewriteAllLogs && state === this.lastEnqueuedState) return this.lastEnqueuedRevision;
    const revision = ++this.revision;
    // A full replacement garbage-collects the prior record generation. Every
    // snapshot prepared before the newest self-contained snapshot is durable
    // must therefore carry its own complete generation as well; otherwise it
    // could later publish references to records that the replacement deleted.
    const requiresSelfContainedLogs = rewriteAllLogs || this.durableRevision < this.selfContainedThroughRevision;
    if (requiresSelfContainedLogs) this.selfContainedThroughRevision = revision;
    const requestedAt = this.now();
    const canonicalStarted = this.now();
    const canonical = serializeGameState(state);
    this.emit({ event: 'canonical_snapshot', revision, durationMs: this.now() - canonicalStarted });
    const serializationStarted = this.now();
    const projection = createLogSegmentedSaveProjection(canonical, this.options.storageKey, this.persistedLogKeys, {
      rewriteAllLogs: requiresSelfContainedLogs,
      recordNamespace: requiresSelfContainedLogs ? `${this.replacementRecordNamespace}-${revision}` : undefined,
      stateAlreadySerialized: true,
      cachedLastReferences: this.cachedLastLogReferences,
    });
    this.emit({ event: 'json_serialization', revision, durationMs: this.now() - serializationStarted,
      data: { jsonChars: projection.coreJsonChars, jsonUtf16Bytes: projection.coreJsonChars * 2,
        diaryRecords: projection.newLogRecords.length } });
    this.pending = {
      revision,
      jsonPayload: projection.coreJsonPayload,
      logRecords: projection.newLogRecords,
      retainedLogKeys: [...projection.retainedLogKeys],
      requestedAt,
    };
    this.lastEnqueuedState = state;
    this.lastEnqueuedRevision = revision;
    this.startPending();
    return revision;
  }
  private waitForRevision(revision: number): Promise<void> {
    if (this.durableRevision >= revision) return Promise.resolve();
    if (this.stopped) return Promise.reject(new PersistenceShutdownError());
    return new Promise((resolve, reject) => this.waiters.push({ revision, resolve, reject }));
  }
  private ensureWorker(): PersistenceWorkerLike {
    if (this.worker) return this.worker;
    const worker = this.options.workerFactory();
    worker.onmessage = (event) => this.handleWorkerMessage(event.data);
    worker.onerror = (event) => this.handleWorkerFailure(new Error(event.message || 'Persistence worker failed.'));
    this.worker = worker;
    return worker;
  }
  private startPending(): void {
    if (this.stopped || this.inFlight || this.storageRetry || !this.pending) return;
    const prepared = this.pending; this.pending = null;
    const inFlight: InFlightSave = { ...prepared, requestId: ++this.requestId };
    this.inFlight = inFlight;
    const request: PersistenceWorkerRequest = { type: 'encode', requestId: inFlight.requestId, revision: inFlight.revision,
      jsonPayload: inFlight.jsonPayload, logRecords: inFlight.logRecords, submittedAt: getCrossContextNow() };
    const submissionStarted = this.now();
    try { this.ensureWorker().postMessage(request) }
    catch (error) { this.handleWorkerFailure(error instanceof Error ? error : new Error(String(error))); return }
    this.emit({ event: 'worker_submission', revision: inFlight.revision, requestId: inFlight.requestId,
      durationMs: this.now() - submissionStarted, data: { jsonChars: inFlight.jsonPayload.length,
        jsonUtf16Bytes: inFlight.jsonPayload.length * 2, diaryRecords: inFlight.logRecords.length } });
    const timerScheduledAt = this.now();
    setTimeout(() => {
      if (!this.stopped) this.emit({ event: 'event_loop_delay', revision: inFlight.revision, requestId: inFlight.requestId,
        durationMs: this.now() - timerScheduledAt });
    }, 0);
  }
  private handleWorkerMessage(response: PersistenceWorkerResponse): void {
    if (this.stopped || !this.inFlight || response.requestId !== this.inFlight.requestId || response.revision !== this.inFlight.revision) return;
    if (response.type === 'error') { this.handleWorkerFailure(new Error(response.message)); return }
    const inFlight = this.inFlight;
    this.emit({ event: 'worker_queue_latency', revision: inFlight.revision, requestId: inFlight.requestId, durationMs: response.queueLatencyMs });
    this.emit({ event: 'worker_compression', revision: inFlight.revision, requestId: inFlight.requestId, durationMs: response.compressionMs });
    this.emit({ event: 'result_delivery', revision: inFlight.revision, requestId: inFlight.requestId, durationMs: Math.max(0, getCrossContextNow() - response.completedAt) });
    this.inFlight = null;
    this.storageRetry = { ...inFlight, encodedPayload: response.encodedPayload, encodedLogRecords: response.encodedLogRecords };
    this.writeEncodedPayload(this.storageRetry);
  }
  private writeEncodedPayload(retry: StorageRetry): void {
    if (this.stopped || this.storageRetry?.requestId !== retry.requestId) return;
    const started = this.now();
    let preflightDiaryRecordsRemoved = 0;
    let removedDiaryRecords = 0;
    const retained = new Set(retry.retainedLogKeys);
    // A prior failed transaction may have written some immutable records but
    // failed before its manifest commit. They are unreachable from the
    // currently durable core and can otherwise consume the quota forever,
    // causing every automatic retry to fail at the same point.
    try {
      preflightDiaryRecordsRemoved = removeOrphanedDiaryLogRecords(
        this.options.storageKey,
        this.options.storage,
        this.persistedLogKeys,
      );
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.emit({ event: 'storage_error', revision: retry.revision, requestId: retry.requestId, durationMs: this.now() - started,
        data: { message: normalized.message, maintenance: true, phase: 'preflight' } });
    }
    try {
      // New immutable records become durable before the core starts referencing
      // them. The core key is one atomic manifest-last commit.
      retry.encodedLogRecords.forEach((record) => this.options.storage.setItem(record.key, record.encodedPayload));
      this.options.storage.setItem(this.options.storageKey, retry.encodedPayload);
      this.persistedLogKeys = retained;
    }
    catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.emit({ event: 'storage_error', revision: retry.revision, requestId: retry.requestId, durationMs: this.now() - started,
        data: { message: normalized.message } });
      // The old manifest remains authoritative because setItem is atomic and
      // the manifest write did not complete. Reclaim any partial records now so
      // they do not make the next retry less likely to fit.
      try {
        removeOrphanedDiaryLogRecords(this.options.storageKey, this.options.storage, this.persistedLogKeys);
      } catch {
        // The original storage failure is the actionable error. A later retry
        // repeats the same safe preflight cleanup.
      }
      this.options.onError?.(normalized); return;
    }
    // Garbage collection is deliberately outside the durability transaction:
    // once the manifest/core write succeeds, obsolete immutable records are
    // unreachable and a cleanup failure must not retry or reject that save.
    try {
      removedDiaryRecords = removeOrphanedDiaryLogRecords(this.options.storageKey, this.options.storage, retained);
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.emit({ event: 'storage_error', revision: retry.revision, requestId: retry.requestId, durationMs: this.now() - started,
        data: { message: normalized.message, maintenance: true } });
    }
    this.emit({ event: 'storage_write', revision: retry.revision, requestId: retry.requestId, durationMs: this.now() - started,
      data: { diaryRecordsWritten: retry.encodedLogRecords.length, preflightDiaryRecordsRemoved, diaryRecordsRemoved: removedDiaryRecords } });
    this.emit({ event: 'durability_latency', revision: retry.revision, requestId: retry.requestId, durationMs: this.now() - retry.requestedAt });
    this.durableRevision = Math.max(this.durableRevision, retry.revision);
    this.storageRetry = null;
    const remaining: DurableWaiter[] = [];
    for (const waiter of this.waiters) { if (waiter.revision <= this.durableRevision) waiter.resolve(); else remaining.push(waiter) }
    this.waiters = remaining;
    this.startPending();
  }
  private handleWorkerFailure(error: Error): void {
    if (this.stopped || !this.inFlight) return;
    const failed = this.inFlight; this.inFlight = null;
    if (!this.pending || this.pending.revision < failed.revision) this.pending = failed;
    this.worker?.terminate(); this.worker = null;
    this.emit({ event: 'worker_error', revision: failed.revision, requestId: failed.requestId,
      durationMs: this.now() - failed.requestedAt, data: { message: error.message } });
    this.options.onError?.(error);
  }
}

export function createBrowserPersistenceWorker(): PersistenceWorkerLike {
  return new Worker(new URL('../workers/persistenceWorker.ts', import.meta.url), { type: 'module' });
}
