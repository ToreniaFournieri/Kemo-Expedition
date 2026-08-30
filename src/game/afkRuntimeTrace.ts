import { getEnvironmentId, isDebugModeEnabled, type EnvironmentId } from './environment.ts';

export const AFK_TRACE_SCHEMA_VERSION = 1 as const;
export const AFK_TRACE_EVENT_LIMIT = 2_048;
export const AFK_TRACE_ANOMALY_LIMIT = 256;
export const AFK_TRACE_WATCHDOG_INTERVAL_MS = 250;
export const AFK_TRACE_EVENT_LOOP_LAG_MS = 250;
export const AFK_TRACE_LONG_WAIT_MS = 1_000;

export type AfkTracePhase =
  | 'idle'
  | 'recovery_start'
  | 'worker_queue'
  | 'worker_execution'
  | 'canonical_order_wait'
  | 'commit_dispatch'
  | 'commit_awaiting_react'
  | 'auto_equipment'
  | 'game_save'
  | 'afk_checkpoint'
  | 'interaction_pause'
  | 'recovery_complete'
  | 'error';

type AfkTraceValue = string | number | boolean | null | readonly string[] | readonly number[];

export interface AfkTraceRecordOptions {
  readonly phase?: AfkTracePhase;
  readonly partyId?: number;
  readonly partyIndex?: number;
  readonly jobId?: string;
  readonly durationMs?: number;
  readonly progress?: boolean;
  readonly anomaly?: boolean;
  readonly data?: Readonly<Record<string, AfkTraceValue>>;
}

export interface AfkTraceEvent {
  readonly schemaVersion: typeof AFK_TRACE_SCHEMA_VERSION;
  readonly sequence: number;
  readonly timestamp: number;
  readonly monotonicTime: number;
  readonly event: string;
  readonly recoveryId: string | null;
  readonly phase: AfkTracePhase;
  readonly partyId?: number;
  readonly partyIndex?: number;
  readonly jobId?: string;
  readonly durationMs?: number;
  readonly data?: Readonly<Record<string, AfkTraceValue>>;
}

export interface AfkTraceAggregate {
  readonly count: number;
  readonly totalDurationMs: number;
  readonly maxDurationMs: number;
}

export interface AfkTraceActiveJobInput {
  readonly jobId: string;
  readonly partyId: number;
  readonly partyIndex: number;
  readonly status: 'queued' | 'running' | 'completed';
  readonly startedMonotonicAt: number;
  readonly simulatedCompletedAt: number;
}

export interface AfkTraceActiveJobSnapshot extends Omit<AfkTraceActiveJobInput, 'startedMonotonicAt'> {
  readonly ageMs: number;
}

export interface AfkTraceCoordinatorInput {
  readonly pendingAfkMs: number;
  readonly activeJobs: readonly AfkTraceActiveJobInput[];
  readonly completedResultCount: number;
  readonly workerPoolSize: number;
  readonly canonicalJobId: string | null;
}

export interface AfkTraceCurrentSnapshot {
  readonly recoveryId: string | null;
  readonly recoveryActive: boolean;
  readonly phase: AfkTracePhase;
  readonly phaseAgeMs: number;
  readonly lastProgressAgeMs: number;
  readonly longWaitActive: boolean;
  readonly longWaitAgeMs: number | null;
  readonly pendingAfkMs: number;
  readonly completedResultCount: number;
  readonly workerPoolSize: number;
  readonly canonicalJobId: string | null;
  readonly activeJobs: readonly AfkTraceActiveJobSnapshot[];
}

export interface AfkTraceDiagnosticExport {
  readonly schemaVersion: typeof AFK_TRACE_SCHEMA_VERSION;
  readonly enabled: boolean;
  readonly environment: EnvironmentId;
  readonly sessionStartedAt: number;
  readonly exportedAt: number;
  readonly droppedEventCount: number;
  readonly droppedAnomalyCount: number;
  readonly current: AfkTraceCurrentSnapshot;
  readonly aggregatesByEvent: Readonly<Record<string, AfkTraceAggregate>>;
  readonly aggregatesByPhase: Readonly<Record<string, AfkTraceAggregate>>;
  readonly aggregatesByParty: Readonly<Record<string, AfkTraceAggregate>>;
  readonly events: readonly AfkTraceEvent[];
  readonly anomalies: readonly AfkTraceEvent[];
}

type Listener = () => void;

function getMonotonicNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function finiteNonNegative(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : undefined;
}

function appendBounded<T>(values: T[], value: T, limit: number): boolean {
  values.push(value);
  if (values.length <= limit) return false;
  values.splice(0, values.length - limit);
  return true;
}

function updateAggregate(
  target: Map<string, AfkTraceAggregate>,
  key: string,
  durationMs: number | undefined,
): void {
  const previous = target.get(key) ?? { count: 0, totalDurationMs: 0, maxDurationMs: 0 };
  const duration = durationMs ?? 0;
  target.set(key, {
    count: previous.count + 1,
    totalDurationMs: previous.totalDurationMs + duration,
    maxDurationMs: Math.max(previous.maxDurationMs, duration),
  });
}

function mapToRecord(values: Map<string, AfkTraceAggregate>): Readonly<Record<string, AfkTraceAggregate>> {
  return Object.freeze(Object.fromEntries(
    [...values.entries()].map(([key, value]) => [key, Object.freeze({ ...value })]),
  ));
}

function sanitizeData(
  data: Readonly<Record<string, AfkTraceValue>>,
): Readonly<Record<string, AfkTraceValue>> {
  const blockedKey = /(saveData|gameState|combatLog|battleLog|rewards?|rng|character|userId)/i;
  return Object.freeze(Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => !blockedKey.test(key))
      .map(([key, value]) => {
        if (typeof value === 'string') return [key, value.slice(0, 500)];
        if (Array.isArray(value)) return [key, Object.freeze(value.slice(0, 64))];
        return [key, value];
      }),
  ));
}

export class AfkRuntimeTrace {
  private enabled: boolean;
  private readonly environment: EnvironmentId;
  private readonly wallNow: () => number;
  private readonly monotonicNow: () => number;
  private sessionStartedAt: number;
  private sequence = 0;
  private revision = 0;
  private recoverySequence = 0;
  private recoveryId: string | null = null;
  private recoveryActive = false;
  private phase: AfkTracePhase = 'idle';
  private phaseStartedAt: number;
  private lastProgressAt: number;
  private longWaitStartedAt: number | null = null;
  private events: AfkTraceEvent[] = [];
  private anomalies: AfkTraceEvent[] = [];
  private droppedEventCount = 0;
  private droppedAnomalyCount = 0;
  private aggregatesByEvent = new Map<string, AfkTraceAggregate>();
  private aggregatesByPhase = new Map<string, AfkTraceAggregate>();
  private aggregatesByParty = new Map<string, AfkTraceAggregate>();
  private coordinator: AfkTraceCoordinatorInput = {
    pendingAfkMs: 0,
    activeJobs: [],
    completedResultCount: 0,
    workerPoolSize: 0,
    canonicalJobId: null,
  };
  private listeners = new Set<Listener>();
  private notifyTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: {
    enabled?: boolean;
    environment?: EnvironmentId;
    wallNow?: () => number;
    monotonicNow?: () => number;
  } = {}) {
    this.enabled = options.enabled ?? isDebugModeEnabled();
    this.environment = options.environment ?? getEnvironmentId();
    this.wallNow = options.wallNow ?? (() => Date.now());
    this.monotonicNow = options.monotonicNow ?? getMonotonicNow;
    this.sessionStartedAt = this.wallNow();
    this.phaseStartedAt = this.monotonicNow();
    this.lastProgressAt = this.phaseStartedAt;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    const liveProfileEnabled = typeof __AFK_LIVE_PROFILE_ENABLED__ !== 'undefined'
      && __AFK_LIVE_PROFILE_ENABLED__;
    const next = enabled && (this.environment !== 'prod' || liveProfileEnabled);
    if (this.enabled === next) return;
    this.enabled = next;
    if (next) {
      this.reset();
      return;
    }
    if (this.notifyTimer !== null) clearTimeout(this.notifyTimer);
    this.notifyTimer = null;
    this.recoveryActive = false;
    this.recoveryId = null;
    this.phase = 'idle';
    this.coordinator = {
      pendingAfkMs: 0,
      activeJobs: [],
      completedResultCount: 0,
      workerPoolSize: 0,
      canonicalJobId: null,
    };
    this.revision += 1;
    this.listeners.forEach((listener) => listener());
  }

  isRecoveryActive(): boolean {
    return this.enabled && this.recoveryActive;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRevision(): number {
    return this.revision;
  }

  startRecovery(data: Readonly<Record<string, AfkTraceValue>> = {}): void {
    // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Debug-only runtime trace
    if (!this.enabled) return;
    const wasActive = this.recoveryActive;
    if (!this.recoveryActive) {
      this.recoverySequence += 1;
      this.recoveryId = `afk-${this.sessionStartedAt}-${this.recoverySequence}`;
      this.recoveryActive = true;
    }
    this.record(wasActive ? 'recovery_extended' : 'recovery_start', {
      phase: 'recovery_start',
      progress: true,
      data,
    });
  }

  completeRecovery(data: Readonly<Record<string, AfkTraceValue>> = {}): void {
    if (!this.enabled || !this.recoveryActive) return;
    this.record('recovery_complete', { phase: 'recovery_complete', progress: true, data });
    this.recoveryActive = false;
    this.endLongWait(this.monotonicNow());
    this.setPhase('idle');
    this.recoveryId = null;
  }

  cancelRecovery(reason: string, data: Readonly<Record<string, AfkTraceValue>> = {}): void {
    if (!this.enabled || !this.recoveryActive) return;
    this.record('recovery_cancelled', {
      phase: 'error',
      anomaly: true,
      progress: true,
      data: { reason, ...data },
    });
    this.recoveryActive = false;
    this.endLongWait(this.monotonicNow());
    this.setPhase('idle');
    this.recoveryId = null;
  }

  setPhase(phase: AfkTracePhase): void {
    if (!this.enabled || this.phase === phase) return;
    this.phase = phase;
    this.phaseStartedAt = this.monotonicNow();
    this.revision += 1;
    this.scheduleNotify();
  }

  updateCoordinator(input: AfkTraceCoordinatorInput): void {
    if (!this.enabled) return;
    this.coordinator = {
      pendingAfkMs: Math.max(0, input.pendingAfkMs),
      activeJobs: input.activeJobs.map((job) => ({ ...job })),
      completedResultCount: Math.max(0, Math.floor(input.completedResultCount)),
      workerPoolSize: Math.max(0, Math.floor(input.workerPoolSize)),
      canonicalJobId: input.canonicalJobId,
    };
    this.revision += 1;
    this.scheduleNotify();
  }

  record(event: string, options: AfkTraceRecordOptions = {}): void {
    if (!this.enabled) return;
    const now = this.monotonicNow();
    if (options.phase) this.setPhase(options.phase);
    const durationMs = finiteNonNegative(options.durationMs);
    const traceEvent: AfkTraceEvent = Object.freeze({
      schemaVersion: AFK_TRACE_SCHEMA_VERSION,
      sequence: ++this.sequence,
      timestamp: this.wallNow(),
      monotonicTime: now,
      event,
      recoveryId: this.recoveryId,
      phase: this.phase,
      ...(options.partyId === undefined ? {} : { partyId: options.partyId }),
      ...(options.partyIndex === undefined ? {} : { partyIndex: options.partyIndex }),
      ...(options.jobId === undefined ? {} : { jobId: options.jobId }),
      ...(durationMs === undefined ? {} : { durationMs }),
      ...(options.data ? { data: sanitizeData(options.data) } : {}),
    });
    if (appendBounded(this.events, traceEvent, AFK_TRACE_EVENT_LIMIT)) this.droppedEventCount += 1;
    if (options.anomaly && appendBounded(this.anomalies, traceEvent, AFK_TRACE_ANOMALY_LIMIT)) {
      this.droppedAnomalyCount += 1;
    }
    updateAggregate(this.aggregatesByEvent, event, durationMs);
    updateAggregate(this.aggregatesByPhase, this.phase, durationMs);
    if (options.partyId !== undefined) updateAggregate(this.aggregatesByParty, String(options.partyId), durationMs);
    if (options.progress) {
      this.endLongWait(now);
      this.lastProgressAt = now;
    }
    this.revision += 1;
    this.scheduleNotify(options.anomaly === true);
  }

  checkWatchdog(expectedAt: number): void {
    // SpecRef: 5.1.1.1 | AFK Recovery Performance Requirements | Debug-only runtime trace
    if (!this.enabled || !this.recoveryActive) return;
    const now = this.monotonicNow();
    const lagMs = Math.max(0, now - expectedAt);
    if (lagMs >= AFK_TRACE_EVENT_LOOP_LAG_MS) {
      this.record('event_loop_lag', {
        durationMs: lagMs,
        anomaly: true,
        data: { thresholdMs: AFK_TRACE_EVENT_LOOP_LAG_MS, visibility: this.visibility() },
      });
    }
    const waitMs = Math.max(0, now - this.lastProgressAt);
    if (waitMs >= AFK_TRACE_LONG_WAIT_MS && this.longWaitStartedAt === null) {
      this.longWaitStartedAt = this.lastProgressAt;
      this.record('long_wait_start', {
        durationMs: waitMs,
        data: { thresholdMs: AFK_TRACE_LONG_WAIT_MS, visibility: this.visibility() },
      });
    }
  }

  getCurrentSnapshot(): AfkTraceCurrentSnapshot {
    const now = this.monotonicNow();
    return Object.freeze({
      recoveryId: this.recoveryId,
      recoveryActive: this.recoveryActive,
      phase: this.phase,
      phaseAgeMs: Math.max(0, now - this.phaseStartedAt),
      lastProgressAgeMs: Math.max(0, now - this.lastProgressAt),
      longWaitActive: this.longWaitStartedAt !== null,
      longWaitAgeMs: this.longWaitStartedAt === null ? null : Math.max(0, now - this.longWaitStartedAt),
      pendingAfkMs: this.coordinator.pendingAfkMs,
      completedResultCount: this.coordinator.completedResultCount,
      workerPoolSize: this.coordinator.workerPoolSize,
      canonicalJobId: this.coordinator.canonicalJobId,
      activeJobs: Object.freeze(this.coordinator.activeJobs.map(({ startedMonotonicAt, ...job }) => Object.freeze({
        ...job,
        ageMs: Math.max(0, now - startedMonotonicAt),
      }))),
    });
  }

  getDiagnosticExport(): AfkTraceDiagnosticExport {
    return Object.freeze({
      schemaVersion: AFK_TRACE_SCHEMA_VERSION,
      enabled: this.enabled,
      environment: this.environment,
      sessionStartedAt: this.sessionStartedAt,
      exportedAt: this.wallNow(),
      droppedEventCount: this.droppedEventCount,
      droppedAnomalyCount: this.droppedAnomalyCount,
      current: this.getCurrentSnapshot(),
      aggregatesByEvent: mapToRecord(this.aggregatesByEvent),
      aggregatesByPhase: mapToRecord(this.aggregatesByPhase),
      aggregatesByParty: mapToRecord(this.aggregatesByParty),
      events: Object.freeze([...this.events]),
      anomalies: Object.freeze([...this.anomalies]),
    });
  }

  reset(): void {
    if (!this.enabled) return;
    const recoveryWasActive = this.recoveryActive;
    const activePhase = this.phase;
    this.sessionStartedAt = this.wallNow();
    this.sequence = 0;
    this.revision += 1;
    this.recoverySequence = recoveryWasActive ? 1 : 0;
    this.recoveryId = recoveryWasActive ? `afk-${this.sessionStartedAt}-1` : null;
    this.recoveryActive = recoveryWasActive;
    this.phase = recoveryWasActive ? activePhase : 'idle';
    this.phaseStartedAt = this.monotonicNow();
    this.lastProgressAt = this.phaseStartedAt;
    this.longWaitStartedAt = null;
    this.events = [];
    this.anomalies = [];
    this.droppedEventCount = 0;
    this.droppedAnomalyCount = 0;
    this.aggregatesByEvent.clear();
    this.aggregatesByPhase.clear();
    this.aggregatesByParty.clear();
    if (!recoveryWasActive) {
      this.coordinator = {
        pendingAfkMs: 0,
        activeJobs: [],
        completedResultCount: 0,
        workerPoolSize: 0,
        canonicalJobId: null,
      };
    }
    this.notifyNow();
  }

  private endLongWait(now: number): void {
    if (this.longWaitStartedAt === null) return;
    const durationMs = Math.max(0, now - this.longWaitStartedAt);
    this.longWaitStartedAt = null;
    this.record('long_wait_end', {
      durationMs,
      anomaly: true,
      data: { visibility: this.visibility() },
    });
  }

  private visibility(): string {
    return typeof document === 'undefined' ? 'unavailable' : document.visibilityState;
  }

  private scheduleNotify(immediate = false): void {
    if (!this.enabled || this.listeners.size === 0) return;
    if (immediate) {
      this.notifyNow();
      return;
    }
    if (this.notifyTimer !== null) return;
    this.notifyTimer = setTimeout(() => {
      this.notifyTimer = null;
      this.notifyNow();
    }, AFK_TRACE_WATCHDOG_INTERVAL_MS);
  }

  private notifyNow(): void {
    if (this.notifyTimer !== null) clearTimeout(this.notifyTimer);
    this.notifyTimer = null;
    this.listeners.forEach((listener) => listener());
  }
}

export const afkRuntimeTrace = new AfkRuntimeTrace({ enabled: false });
