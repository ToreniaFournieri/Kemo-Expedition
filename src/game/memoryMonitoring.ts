import { getBattleKernelMemoryBytes } from './battleKernel.ts';
import { getEnvironmentId, type EnvironmentId } from './environment.ts';

export const MEMORY_DIAGNOSTIC_SCHEMA_VERSION = 1 as const;
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
  readonly processMemory: number | null;
  readonly currentMemory: number | null;
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
  readonly environment: EnvironmentId;
  readonly sessionStartedAt: number;
  readonly exportedAt: number;
  readonly current: MemorySnapshot | null;
  readonly samples: readonly MemorySnapshot[];
  readonly events: readonly MemoryEvent[];
}

export interface DesktopProcessMemoryMetrics {
  readonly privateBytes: number | null;
  readonly residentSetBytes: number | null;
}

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
    processMemory: null,
    currentMemory: null,
  };
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

  constructor(environment: EnvironmentId = getEnvironmentId(), now: () => number = () => Date.now()) {
    this.environment = environment;
    this.now = now;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.sessionStartedAt = this.now();
    void this.recordEvent('session_start');
    this.schedule();
  }

  stop(): void {
    if (this.running) this.recordEventFromCurrent('session_end');
    this.running = false;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
    this.workers.clear();
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
    const desktopMetrics = await this.readDesktopProcessMetrics();
    const workerEstimates = [...this.workers.values()];
    const workerOwnedEstimate = workerEstimates.some((value) => value !== null)
      ? workerEstimates.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
    const wasmMemory = finiteMetric(getBattleKernelMemoryBytes());
    const jsHeapUsed = finiteMetric(overrides.jsHeapUsed ?? heap?.usedJSHeapSize);
    const processMemory = finiteMetric(overrides.processMemory ?? desktopMetrics?.residentSetBytes ?? desktopMetrics?.privateBytes);
    const estimatedAssetMemory = finiteMetric(overrides.estimatedAssetMemory ?? estimateVisibleArtworkBytes());
    const fallbackParts = [jsHeapUsed, wasmMemory, estimatedAssetMemory, workerOwnedEstimate];
    const fallbackCurrent = fallbackParts.some((value) => value !== null)
      ? fallbackParts.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
    const current: MemoryMetrics = Object.freeze({
      jsHeapUsed,
      jsHeapTotal: finiteMetric(overrides.jsHeapTotal ?? heap?.totalJSHeapSize),
      jsHeapLimit: finiteMetric(overrides.jsHeapLimit ?? heap?.jsHeapSizeLimit),
      wasmMemory,
      estimatedAssetMemory,
      workerOwnedEstimate,
      processMemory,
      currentMemory: finiteMetric(overrides.currentMemory ?? processMemory ?? fallbackCurrent),
    });
    this.peak = Object.freeze({
      jsHeapUsed: maxMetric(this.peak.jsHeapUsed, current.jsHeapUsed),
      jsHeapTotal: maxMetric(this.peak.jsHeapTotal, current.jsHeapTotal),
      jsHeapLimit: maxMetric(this.peak.jsHeapLimit, current.jsHeapLimit),
      wasmMemory: maxMetric(this.peak.wasmMemory, current.wasmMemory),
      estimatedAssetMemory: maxMetric(this.peak.estimatedAssetMemory, current.estimatedAssetMemory),
      workerOwnedEstimate: maxMetric(this.peak.workerOwnedEstimate, current.workerOwnedEstimate),
      processMemory: maxMetric(this.peak.processMemory, current.processMemory),
      currentMemory: maxMetric(this.peak.currentMemory, current.currentMemory),
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
    });
    boundedAppend(this.samples, snapshot, MEMORY_SAMPLE_LIMIT);
    this.observeWasmGrowth(current.wasmMemory);
    this.observeHeapPressure(current);
    this.emit();
    return snapshot;
  }

  async recordEvent(event: MemoryEventName): Promise<void> {
    const snapshot = await this.sample();
    this.appendEvent(event, snapshot.current);
  }

  recordEventFromCurrent(event: MemoryEventName): void {
    this.appendEvent(event, this.getSnapshot()?.current ?? emptyMetrics());
  }

  markChunkComplete(battleCount = 0): void {
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

  private async readDesktopProcessMetrics(): Promise<DesktopProcessMemoryMetrics | null> {
    if (typeof window === 'undefined') return null;
    try {
      return await window.bokemoDesktop?.getProcessMemoryMetrics?.() ?? null;
    } catch {
      return null;
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
