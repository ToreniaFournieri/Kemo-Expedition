import { useSyncExternalStore } from 'react';
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

export function MemoryDiagnostics() {
  const snapshot = useSyncExternalStore(
    (listener) => memoryMonitor.subscribe(listener),
    () => memoryMonitor.getSnapshot(),
    () => null,
  );
  const diagnostics = memoryMonitor.getDiagnosticExport();

  const exportJson = () => {
    const payload = JSON.stringify(memoryMonitor.getDiagnosticExport(), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `bokemo-memory-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded border bg-white p-3" aria-label={t('setting.memory.title')}>
      <div className="mb-2 font-medium">{t('setting.memory.title')}</div>
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
              workers: snapshot.activeWorkers,
              samples: diagnostics.samples.length,
              events: diagnostics.events.length,
            })}
          </div>
        </>
      ) : <div className="text-xs text-gray-500">{t('setting.memory.waiting')}</div>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={exportJson} className="rounded border px-2 py-1 text-xs">{t('setting.memory.export')}</button>
        <button type="button" onClick={() => memoryMonitor.reset()} className="rounded border px-2 py-1 text-xs">{t('setting.memory.reset')}</button>
      </div>
    </section>
  );
}
