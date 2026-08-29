import { getBattleKernelMemoryBytes } from './battleKernel.ts';
import { getEnvironmentId, type EnvironmentId } from './environment.ts';

export const MEMORY_DIAGNOSTIC_SCHEMA_VERSION = 2 as const;
export const MEMORY_SAMPLE_LIMIT = 120;
export const MEMORY_EVENT_LIMIT = 256;
export const MEMORY_NORMAL_SAMPLE_INTERVAL_MS = 15_000;
export const MEMORY_ACCELERATED_SAMPLE_INTERVAL_MS = 60_000;

export type MemoryRuntimeMode = 'idle' | 'online' | 'afk' | 'simulation';
export type MemorySpeed = 'realtime' | 'x1_2' | 'x5' | 'x20' | 'x100' | 'unlimited';
export type MemoryEventName =
  | 'session_start'
  | 'online_processing_start'
  | 'chunk_complete'
  | 'afk_emulation_start'
  | 'afk_emulation_complete'
  | 'simulation_start'
  | 'simulation_complete'
  | 'wasm_memory_growth'
  | 'memory_warning'
  | 'session_end';

export interface MemoryMetrics {
  readonly jsHeapUsed: number | null;
  readonly jsHeapTotal: number | null;
  readonly jsHeapLimit: number | null;
  readonly wasmMemory: number | null;
  readonly estimatedAssetMemory: number | null;
  readonly workerOwnedEstimate: number | null;
  readonly applicationWorkingSet: number | null;
  readonly rendererWorkingSet: number | null;
}

export interface DesktopProcessMemoryBreakdown {
  readonly pid: number | null;
  readonly type: string;
  readonly name: string | null;
  readonly serviceName: string | null;
  readonly workingSetBytes: number | null;
}

export interface MemorySnapshot {
  readonly schemaVersion: typeof MEMORY_DIAGNOSTIC_SCHEMA_VERSION;
  readonly timestamp: number;
  readonly elapsedTime: number;
  readonly runtimeMode: MemoryRuntimeMode;
  readonly speed: MemorySpeed;
  readonly activeWorkers: number;
  readonly completedChunks: number;
  readonly battleCount: number;
  readonly current: MemoryMetrics;
  readonly peak: MemoryMetrics;
  readonly processBreakdown: readonly DesktopProcessMemoryBreakdown[];
}

export interface MemoryEvent {
  readonly schemaVersion: typeof MEMORY_DIAGNOSTIC_SCHEMA_VERSION;
  readonly timestamp: number;
  readonly event: MemoryEventName;
  readonly runtimeMode: MemoryRuntimeMode;
  readonly speed: MemorySpeed;
  readonly elapsedTime: number;
  readonly activeWorkers: number;
  readonly completedChunks: number;
  readonly battleCount: number;
  readonly metrics: MemoryMetrics;
}

export interface MemoryDiagnosticExport {
  readonly schemaVersion: typeof MEMORY_DIAGNOSTIC_SCHEMA_VERSION;
  readonly enabled: boolean;
  readonly environment: EnvironmentId;
  readonly sessionStartedAt: number;
  readonly exportedAt: number;
  readonly current: MemorySnapshot | null;
  readonly samples: readonly MemorySnapshot[];
  readonly events: readonly MemoryEvent[];
}

export interface DesktopProcessMemoryMetrics {
  readonly applicationWorkingSetBytes: number | null;
  readonly rendererWorkingSetBytes: number | null;
  readonly processBreakdown: readonly DesktopProcessMemoryBreakdown[];
}

type DesktopMemoryReader = () => Promise<DesktopProcessMemoryMetrics | null>;

type HeapPerformance = Performance & {
  memory?: {
    usedJSHeapSize?: number;
    totalJSHeapSize?: number;
    jsHeapSizeLimit?: number;
  };
};

type Listener = () => void;

function finiteMetric(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function boundedAppend<T>(values: T[], value: T, limit: number): void {
  values.push(value);
  if (values.length > limit) values.splice(0, values.length - limit);
}

function maxMetric(previous: number | null, current: number | null): number | null {
  if (current === null) return previous;
  return previous === null ? current : Math.max(previous, current);
}

function emptyMetrics(): MemoryMetrics {
  return {
    jsHeapUsed: null,
    jsHeapTotal: null,
    jsHeapLimit: null,
    wasmMemory: null,
    estimatedAssetMemory: null,
    workerOwnedEstimate: null,
    applicationWorkingSet: null,
    rendererWorkingSet: null,
  };
}

async function readDesktopMemoryMetrics(): Promise<DesktopProcessMemoryMetrics | null> {
  if (typeof window === 'undefined') return null;
  try {
    return await window.bokemoDesktop?.getMemoryMetrics?.() ?? null;
  } catch {
    return null;
  }
}

function normalizeProcessBreakdown(value: unknown): readonly DesktopProcessMemoryBreakdown[] {
  if (!Array.isArray(value)) return Object.freeze([]);
  return Object.freeze(value.map((entry) => {
    const metric = entry as Partial<DesktopProcessMemoryBreakdown> | null;
    return Object.freeze({
      pid: typeof metric?.pid === 'number' && Number.isInteger(metric.pid) && metric.pid >= 0 ? metric.pid : null,
      type: typeof metric?.type === 'string' ? metric.type : 'Unknown',
      name: typeof metric?.name === 'string' ? metric.name : null,
      serviceName: typeof metric?.serviceName === 'string' ? metric.serviceName : null,
      workingSetBytes: finiteMetric(metric?.workingSetBytes),
    });
  }));
}

function estimateVisibleArtworkBytes(): number | null {
  if (typeof document === 'undefined') return null;
  let bytes = 0;
  let found = false;
  document.querySelectorAll('img').forEach((node) => {
    const image = node as HTMLImageElement;
    if (!image.isConnected || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
    found = true;
    bytes += image.naturalWidth * image.naturalHeight * 4;
  });
  document.querySelectorAll<HTMLElement>('[style*="background-image"]').forEach((node) => {
    const style = getComputedStyle(node);
    if (!style.backgroundImage || style.backgroundImage === 'none') return;
    const rect = node.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    found = true;
    bytes += Math.ceil(rect.width) * Math.ceil(rect.height) * 4;
  });
  return found ? bytes : 0;
}

export class MemoryMonitor {
  private readonly environment: EnvironmentId;
  private readonly now: () => number;
  private sessionStartedAt = Date.now();
  private samples: MemorySnapshot[] = [];
  private events: MemoryEvent[] = [];
  private listeners = new Set<Listener>();
  private workers = new Map<string, number | null>();
  private peak = emptyMetrics();
  private runtimeMode: MemoryRuntimeMode = 'idle';
  private speed: MemorySpeed = 'realtime';
  private completedChunks = 0;
  private battleCount = 0;
  private highHeapSamples = 0;
  private warningActive = false;
  private lastWasmBytes: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private readonly desktopMemoryReader: DesktopMemoryReader;

  constructor(
    environment: EnvironmentId = getEnvironmentId(),
    now: () => number = () => Date.now(),
    desktopMemoryReader: DesktopMemoryReader = readDesktopMemoryMetrics,
  ) {
    this.environment = environment;
    this.now = now;
    this.desktopMemoryReader = desktopMemoryReader;
  }

  start(): void {
    if (this.running) return;
    this.sessionStartedAt = this.now();
    this.samples = [];
    this.events = [];
    this.peak = emptyMetrics();
    this.completedChunks = 0;
    this.battleCount = 0;
    this.highHeapSamples = 0;
    this.warningActive = false;
    this.lastWasmBytes = null;
    this.running = true;
    void this.recordEvent('session_start');
    this.schedule();
  }

  pause(): void {
    if (this.running) this.recordEventFromCurrent('session_end');
    this.running = false;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  stop(): void {
    this.pause();
    this.listeners.clear();
    this.workers.clear();
  }

  isRunning(): boolean {
    return this.running;
  }

  getActiveWorkerCount(): number {
    return this.workers.size;
  }

  setRuntime(mode: MemoryRuntimeMode, speed: MemorySpeed): void {
    this.runtimeMode = mode;
    this.speed = speed;
    if (this.running) this.schedule();
  }

  registerWorker(id: string, ownedBytesEstimate: number | null = null): void {
    this.workers.set(id, finiteMetric(ownedBytesEstimate));
    this.emit();
  }

  releaseWorker(id: string): void {
    this.workers.delete(id);
    this.emit();
  }

  incrementBattleCount(count = 1): void {
    if (Number.isFinite(count) && count > 0) this.battleCount += Math.floor(count);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): MemorySnapshot | null {
    return this.samples[this.samples.length - 1] ?? null;
  }

  getDiagnosticExport(): MemoryDiagnosticExport {
    return Object.freeze({
      schemaVersion: MEMORY_DIAGNOSTIC_SCHEMA_VERSION,
      enabled: this.running,
      environment: this.environment,
      sessionStartedAt: this.sessionStartedAt,
      exportedAt: this.now(),
      current: this.getSnapshot(),
      samples: Object.freeze([...this.samples]),
      events: Object.freeze([...this.events]),
    });
  }

  reset(): void {
    this.sessionStartedAt = this.now();
    this.samples = [];
    this.events = [];
    this.peak = emptyMetrics();
    this.completedChunks = 0;
    this.battleCount = 0;
    this.highHeapSamples = 0;
    this.warningActive = false;
    this.lastWasmBytes = null;
    this.recordEventFromCurrent('session_start');
    this.emit();
  }

  async sample(overrides: Partial<MemoryMetrics> = {}): Promise<MemorySnapshot> {
    const heap = typeof performance === 'undefined' ? undefined : (performance as HeapPerformance).memory;
    const desktopMetrics = await this.desktopMemoryReader();
    const workerEstimates = [...this.workers.values()];
    const workerOwnedEstimate = workerEstimates.some((value) => value !== null)
      ? workerEstimates.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
    const wasmMemory = finiteMetric(getBattleKernelMemoryBytes());
    const jsHeapUsed = finiteMetric(overrides.jsHeapUsed ?? heap?.usedJSHeapSize);
    const estimatedAssetMemory = finiteMetric(overrides.estimatedAssetMemory ?? estimateVisibleArtworkBytes());
    const applicationWorkingSet = finiteMetric(overrides.applicationWorkingSet ?? desktopMetrics?.applicationWorkingSetBytes);
    const rendererWorkingSet = finiteMetric(overrides.rendererWorkingSet ?? desktopMetrics?.rendererWorkingSetBytes);
    const current: MemoryMetrics = Object.freeze({
      jsHeapUsed,
      jsHeapTotal: finiteMetric(overrides.jsHeapTotal ?? heap?.totalJSHeapSize),
      jsHeapLimit: finiteMetric(overrides.jsHeapLimit ?? heap?.jsHeapSizeLimit),
      wasmMemory,
      estimatedAssetMemory,
      workerOwnedEstimate,
      applicationWorkingSet,
      rendererWorkingSet,
    });
    this.peak = Object.freeze({
      jsHeapUsed: maxMetric(this.peak.jsHeapUsed, current.jsHeapUsed),
      jsHeapTotal: maxMetric(this.peak.jsHeapTotal, current.jsHeapTotal),
      jsHeapLimit: maxMetric(this.peak.jsHeapLimit, current.jsHeapLimit),
      wasmMemory: maxMetric(this.peak.wasmMemory, current.wasmMemory),
      estimatedAssetMemory: maxMetric(this.peak.estimatedAssetMemory, current.estimatedAssetMemory),
      workerOwnedEstimate: maxMetric(this.peak.workerOwnedEstimate, current.workerOwnedEstimate),
      applicationWorkingSet: maxMetric(this.peak.applicationWorkingSet, current.applicationWorkingSet),
      rendererWorkingSet: maxMetric(this.peak.rendererWorkingSet, current.rendererWorkingSet),
    });
    const snapshot: MemorySnapshot = Object.freeze({
      schemaVersion: MEMORY_DIAGNOSTIC_SCHEMA_VERSION,
      timestamp: this.now(),
      elapsedTime: Math.max(0, this.now() - this.sessionStartedAt),
      runtimeMode: this.runtimeMode,
      speed: this.speed,
      activeWorkers: this.workers.size,
      completedChunks: this.completedChunks,
      battleCount: this.battleCount,
      current,
      peak: this.peak,
      processBreakdown: normalizeProcessBreakdown(desktopMetrics?.processBreakdown),
    });
    boundedAppend(this.samples, snapshot, MEMORY_SAMPLE_LIMIT);
    this.observeWasmGrowth(current.wasmMemory);
    this.observeHeapPressure(current);
    this.emit();
    return snapshot;
  }

  async recordEvent(event: MemoryEventName): Promise<void> {
    if (!this.running) return;
    const snapshot = await this.sample();
    if (!this.running) return;
    this.appendEvent(event, snapshot.current);
  }

  recordEventFromCurrent(event: MemoryEventName): void {
    if (!this.running) return;
    this.appendEvent(event, this.getSnapshot()?.current ?? emptyMetrics());
  }

  markChunkComplete(battleCount = 0): void {
    if (!this.running) return;
    this.completedChunks += 1;
    this.incrementBattleCount(battleCount);
    this.recordEventFromCurrent('chunk_complete');
  }

  private appendEvent(event: MemoryEventName, metrics: MemoryMetrics): void {
    boundedAppend(this.events, Object.freeze({
      schemaVersion: MEMORY_DIAGNOSTIC_SCHEMA_VERSION,
      timestamp: this.now(),
      event,
      runtimeMode: this.runtimeMode,
      speed: this.speed,
      elapsedTime: Math.max(0, this.now() - this.sessionStartedAt),
      activeWorkers: this.workers.size,
      completedChunks: this.completedChunks,
      battleCount: this.battleCount,
      metrics,
    }), MEMORY_EVENT_LIMIT);
    this.emit();
  }

  private observeWasmGrowth(bytes: number | null): void {
    if (bytes !== null && this.lastWasmBytes !== null && bytes > this.lastWasmBytes) {
      this.appendEvent('wasm_memory_growth', this.getSnapshot()?.current ?? emptyMetrics());
    }
    this.lastWasmBytes = bytes;
  }

  private observeHeapPressure(metrics: MemoryMetrics): void {
    const ratio = metrics.jsHeapUsed !== null && metrics.jsHeapLimit !== null && metrics.jsHeapLimit > 0
      ? metrics.jsHeapUsed / metrics.jsHeapLimit
      : 0;
    this.highHeapSamples = ratio >= 0.85 ? this.highHeapSamples + 1 : 0;
    if (this.highHeapSamples >= 3 && !this.warningActive) {
      this.warningActive = true;
      this.appendEvent('memory_warning', metrics);
      console.warn('BoKemo memory warning: JavaScript heap usage exceeded 85% for three samples.');
    } else if (ratio < 0.75) {
      this.warningActive = false;
    }
  }

  private schedule(): void {
    if (!this.running) return;
    if (this.timer !== null) clearTimeout(this.timer);
    const accelerated = this.speed === 'x100' || this.speed === 'unlimited';
    this.timer = setTimeout(() => {
      void this.sample().finally(() => this.schedule());
    }, accelerated ? MEMORY_ACCELERATED_SAMPLE_INTERVAL_MS : MEMORY_NORMAL_SAMPLE_INTERVAL_MS);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const memoryMonitor = new MemoryMonitor();
