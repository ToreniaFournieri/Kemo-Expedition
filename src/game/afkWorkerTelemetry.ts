import type { AfkWorkerPerformanceTelemetry } from './afkChunkCoordinator';
import { afkRuntimeTrace } from './afkRuntimeTrace';

const TELEMETRY_LIMIT = 120;

export type AfkWorkerTelemetrySample =
  | ({ kind: 'job'; jobId: string; recordedAt: number } & AfkWorkerPerformanceTelemetry)
  | { kind: 'termination'; reason: string; workerCount: number; durationMs: number; recordedAt: number };

const samples: AfkWorkerTelemetrySample[] = [];

function append(sample: AfkWorkerTelemetrySample): void {
  samples.push(sample);
  if (samples.length > TELEMETRY_LIMIT) samples.splice(0, samples.length - TELEMETRY_LIMIT);
  if (typeof window !== 'undefined') {
    (window as Window & { __BOKEMO_AFK_WORKER_PROFILE__?: readonly AfkWorkerTelemetrySample[] })
      .__BOKEMO_AFK_WORKER_PROFILE__ = Object.freeze([...samples]);
  }
}

export function recordAfkWorkerJobTelemetry(jobId: string, telemetry: AfkWorkerPerformanceTelemetry): void {
  append({ kind: 'job', jobId, recordedAt: Date.now(), ...telemetry });
}

export function terminateAfkWorkers(workers: readonly Worker[], reason: string): number {
  if (workers.length === 0) return 0;
  const startedAt = performance.now();
  workers.forEach((worker) => worker.terminate());
  const durationMs = Math.max(0, performance.now() - startedAt);
  append({ kind: 'termination', reason, workerCount: workers.length, durationMs, recordedAt: Date.now() });
  afkRuntimeTrace.record('worker_pool_terminated', {
    durationMs,
    data: { reason, workerCount: workers.length },
  });
  return durationMs;
}

export function getAfkWorkerTelemetryForTesting(): readonly AfkWorkerTelemetrySample[] {
  return Object.freeze([...samples]);
}
