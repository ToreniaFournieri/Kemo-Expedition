import { useSyncExternalStore } from 'react';
import { afkRuntimeTrace } from '../game/afkRuntimeTrace';
import { getEnvironmentId } from '../game/environment';
import { memoryMonitor, type MemoryMetrics } from '../game/memoryMonitoring';
import { t } from '../i18n';

function formatBytes(value: number | null): string {
  if (value === null) return t('setting.memory.unavailable');
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 ** 2).toFixed(1)} MiB`;
}

const METRICS: ReadonlyArray<{ key: keyof MemoryMetrics; label: string }> = [
  { key: 'currentMemory', label: 'setting.memory.total' },
  { key: 'jsHeapUsed', label: 'setting.memory.jsHeap' },
  { key: 'wasmMemory', label: 'setting.memory.wasm' },
  { key: 'estimatedAssetMemory', label: 'setting.memory.assets' },
  { key: 'workerOwnedEstimate', label: 'setting.memory.workers' },
  { key: 'processMemory', label: 'setting.memory.process' },
];

export interface RuntimeDiagnosticExport {
  readonly schemaVersion: 1;
  readonly app: {
    readonly version: string;
    readonly build: number;
    readonly environment: ReturnType<typeof getEnvironmentId>;
    readonly exportedAt: number;
    readonly userAgent: string;
    readonly platform: string;
    readonly language: string;
    readonly hardwareConcurrency: number | null;
    readonly deviceMemoryGiB: number | null;
    readonly visibility: string;
    readonly viewport: { readonly width: number; readonly height: number } | null;
    readonly timeOrigin: number | null;
  };
  readonly memory: ReturnType<typeof memoryMonitor.getDiagnosticExport>;
  readonly afkTrace: ReturnType<typeof afkRuntimeTrace.getDiagnosticExport>;
}

function formatDuration(value: number): string {
  if (value < 1_000) return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(value)} ms`;
  return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(value / 1_000)} s`;
}

function buildRuntimeDiagnosticExport(): RuntimeDiagnosticExport {
  const runtimeNavigator = typeof navigator === 'undefined'
    ? null
    : navigator as Navigator & { deviceMemory?: number };
  return Object.freeze({
    schemaVersion: 1,
    app: Object.freeze({
      version: `v${__APP_VERSION__}`,
      build: __BUILD_NUMBER__,
      environment: getEnvironmentId(),
      exportedAt: Date.now(),
      userAgent: runtimeNavigator?.userAgent ?? 'unavailable',
      platform: runtimeNavigator?.platform ?? 'unavailable',
      language: runtimeNavigator?.language ?? 'unavailable',
      hardwareConcurrency: runtimeNavigator === null || !Number.isFinite(runtimeNavigator.hardwareConcurrency)
        ? null
        : runtimeNavigator.hardwareConcurrency,
      deviceMemoryGiB: runtimeNavigator === null || !Number.isFinite(runtimeNavigator.deviceMemory)
        ? null
        : runtimeNavigator.deviceMemory ?? null,
      visibility: typeof document === 'undefined' ? 'unavailable' : document.visibilityState,
      viewport: typeof window === 'undefined' ? null : Object.freeze({ width: window.innerWidth, height: window.innerHeight }),
      timeOrigin: typeof performance === 'undefined' || !Number.isFinite(performance.timeOrigin) ? null : performance.timeOrigin,
    }),
    memory: memoryMonitor.getDiagnosticExport(),
    afkTrace: afkRuntimeTrace.getDiagnosticExport(),
  });
}

export function RuntimeDiagnostics() {
  // SpecRef: 8.6 | UI_SETTING | Runtime Diagnostics
  const snapshot = useSyncExternalStore(
    (listener) => memoryMonitor.subscribe(listener),
    () => memoryMonitor.getSnapshot(),
    () => null,
  );
  const diagnostics = memoryMonitor.getDiagnosticExport();
  useSyncExternalStore(
    (listener) => afkRuntimeTrace.subscribe(listener),
    () => afkRuntimeTrace.getRevision(),
    () => 0,
  );
  const trace = afkRuntimeTrace.getDiagnosticExport();
  const longestWaitMs = trace.aggregatesByEvent.long_wait_end?.maxDurationMs ?? 0;

  const exportJson = () => {
    const payload = JSON.stringify(buildRuntimeDiagnosticExport(), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bokemo-runtime-diagnostics-v${__APP_VERSION__}-build${__BUILD_NUMBER__}-${getEnvironmentId()}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const resetSession = () => {
    memoryMonitor.reset();
    afkRuntimeTrace.reset();
  };

  return (
    <section className="rounded border bg-white p-3" aria-label={t('setting.runtime.title')} data-afk-readonly="true">
      <div className="mb-2 font-medium">{t('setting.runtime.title')}</div>
      <div className="mb-2 text-xs font-medium text-gray-600">{t('setting.memory.title')}</div>
      {snapshot ? (
        <>
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs">
            <span className="text-gray-500" />
            <span className="text-gray-500">{t('setting.memory.current')}</span>
            <span className="text-gray-500">{t('setting.memory.peak')}</span>
            {METRICS.map(({ key, label }) => (
              <div className="contents" key={key}>
                <span>{t(label)}</span>
                <span className="text-right tabular-nums">{formatBytes(snapshot.current[key])}</span>
                <span className="text-right tabular-nums">{formatBytes(snapshot.peak[key])}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {t('setting.memory.activity', {
              workers: memoryMonitor.getActiveWorkerCount(),
              samples: diagnostics.samples.length,
              events: diagnostics.events.length,
            })}
          </div>
        </>
      ) : <div className="text-xs text-gray-500">{t('setting.memory.waiting')}</div>}
      <div className="mt-3 border-t pt-3 text-xs">
        <div className="mb-2 font-medium text-gray-600">{t('setting.runtime.afkTrace')}</div>
        <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
          <span>{t('setting.runtime.phase')}</span>
          <span className="text-right font-mono">{trace.current.phase}</span>
          <span>{t('setting.runtime.traceActivity')}</span>
          <span className="text-right tabular-nums">{t('setting.runtime.traceCounts', {
            events: trace.events.length,
            anomalies: trace.anomalies.length,
          })}</span>
          <span>{t('setting.runtime.longestWait')}</span>
          <span className="text-right tabular-nums">{longestWaitMs > 0 ? formatDuration(longestWaitMs) : t('setting.runtime.none')}</span>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={exportJson} className="rounded border px-2 py-1 text-xs">{t('setting.memory.export')}</button>
        <button type="button" onClick={resetSession} className="rounded border px-2 py-1 text-xs">{t('setting.memory.reset')}</button>
      </div>
    </section>
  );
}
