import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  AFK_TRACE_ANOMALY_LIMIT,
  AFK_TRACE_EVENT_LIMIT,
  AFK_TRACE_LONG_WAIT_MS,
  AfkRuntimeTrace,
} from '../src/game/afkRuntimeTrace.ts';

const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../src/workers/afkChunkWorker.ts', import.meta.url), 'utf8');
const diagnosticsSource = readFileSync(new URL('../src/components/MemoryDiagnostics.tsx', import.meta.url), 'utf8');

function makeClock() {
  let wall = 1_000;
  let monotonic = 100;
  return {
    wallNow: () => wall,
    monotonicNow: () => monotonic,
    advance(ms: number) {
      wall += ms;
      monotonic += ms;
    },
  };
}

test('AFK runtime tracing is a complete no-op when disabled', () => {
  const clock = makeClock();
  const trace = new AfkRuntimeTrace({
    enabled: false,
    environment: 'prod',
    wallNow: clock.wallNow,
    monotonicNow: clock.monotonicNow,
  });
  trace.startRecovery({ partyCount: 6 });
  trace.record('worker_job_posted', { jobId: 'job-1', data: { queueSize: 1 } });
  trace.checkWatchdog(0);
  const exported = trace.getDiagnosticExport();
  assert.equal(exported.enabled, false);
  assert.equal(exported.events.length, 0);
  assert.equal(exported.anomalies.length, 0);
  assert.equal(exported.current.recoveryActive, false);
});

test('AFK trace retention, aggregates, dropped counts, and reset are bounded', () => {
  const clock = makeClock();
  const trace = new AfkRuntimeTrace({
    enabled: true,
    environment: 'dev',
    wallNow: clock.wallNow,
    monotonicNow: clock.monotonicNow,
  });
  trace.startRecovery();
  for (let index = 0; index < AFK_TRACE_EVENT_LIMIT + 20; index += 1) {
    trace.record('worker_job_complete', { partyId: 1, durationMs: index, anomaly: true });
  }
  const exported = trace.getDiagnosticExport();
  assert.equal(exported.events.length, AFK_TRACE_EVENT_LIMIT);
  assert.equal(exported.anomalies.length, AFK_TRACE_ANOMALY_LIMIT);
  assert.ok(exported.droppedEventCount >= 20);
  assert.ok(exported.droppedAnomalyCount > 0);
  assert.equal(exported.aggregatesByEvent.worker_job_complete.count, AFK_TRACE_EVENT_LIMIT + 20);
  assert.equal(exported.aggregatesByPhase.recovery_start.count, AFK_TRACE_EVENT_LIMIT + 21);
  assert.equal(exported.aggregatesByParty['1'].maxDurationMs, AFK_TRACE_EVENT_LIMIT + 19);
  trace.reset();
  const reset = trace.getDiagnosticExport();
  assert.equal(reset.events.length, 0);
  assert.equal(reset.anomalies.length, 0);
  assert.equal(reset.droppedEventCount, 0);
});

test('watchdog records event-loop lag and closes a classified long wait on progress', () => {
  const clock = makeClock();
  const trace = new AfkRuntimeTrace({
    enabled: true,
    environment: 'beta',
    wallNow: clock.wallNow,
    monotonicNow: clock.monotonicNow,
  });
  trace.startRecovery({ pendingAfkMs: 10_000 });
  trace.setPhase('worker_execution');
  clock.advance(AFK_TRACE_LONG_WAIT_MS + 250);
  trace.checkWatchdog(clock.monotonicNow() - 300);
  assert.equal(trace.getDiagnosticExport().current.longWaitActive, true);
  trace.record('worker_job_complete', { phase: 'worker_execution', progress: true, durationMs: 1_250 });
  const exported = trace.getDiagnosticExport();
  assert.equal(exported.current.longWaitActive, false);
  assert.ok(exported.anomalies.some((event) => event.event === 'event_loop_lag'));
  assert.ok(exported.anomalies.some((event) => event.event === 'long_wait_end'));
});

test('cancelling recovery closes its active state and records the reason', () => {
  const clock = makeClock();
  const trace = new AfkRuntimeTrace({
    enabled: true,
    environment: 'dev',
    wallNow: clock.wallNow,
    monotonicNow: clock.monotonicNow,
  });
  trace.startRecovery();
  trace.cancelRecovery('game_reset', { activeJobCount: 2 });
  const exported = trace.getDiagnosticExport();
  assert.equal(exported.current.recoveryActive, false);
  assert.equal(exported.current.phase, 'idle');
  assert.ok(exported.anomalies.some((event) => (
    event.event === 'recovery_cancelled'
    && event.data.reason === 'game_reset'
    && event.data.activeJobCount === 2
  )));
});

test('active-job snapshots expose age without retaining prohibited payload fields', () => {
  const clock = makeClock();
  const trace = new AfkRuntimeTrace({
    enabled: true,
    environment: 'dev',
    wallNow: clock.wallNow,
    monotonicNow: clock.monotonicNow,
  });
  trace.startRecovery();
  trace.updateCoordinator({
    pendingAfkMs: 50_000,
    completedResultCount: 1,
    workerPoolSize: 3,
    canonicalJobId: 'job-1',
    activeJobs: [{
      jobId: 'job-1',
      partyId: 2,
      partyIndex: 1,
      status: 'running',
      startedMonotonicAt: clock.monotonicNow(),
      simulatedCompletedAt: 2_000,
    }],
  });
  trace.record('metadata_redaction', {
    data: {
      queueSize: 1,
      saveData: 'secret save payload',
      gameState: 'secret state payload',
      message: 'safe error metadata',
    },
  });
  clock.advance(400);
  const exported = trace.getDiagnosticExport();
  assert.equal(exported.current.activeJobs[0].ageMs, 400);
  assert.equal(exported.current.activeJobs[0].status, 'running');
  const serialized = JSON.stringify(exported);
  assert.doesNotMatch(serialized, /secret save payload|secret state payload/);
  assert.match(serialized, /safe error metadata/);
});

test('runtime wiring covers worker, ordering, commit, equipment, persistence, and combined export phases', () => {
  assert.match(workerSource, /type: 'started'/);
  assert.match(homeSource, /worker_job_posted/);
  assert.match(homeSource, /worker_job_started/);
  assert.match(homeSource, /worker_job_complete/);
  assert.match(homeSource, /canonical_order_wait_start/);
  assert.match(homeSource, /canonical_order_wait_end/);
  assert.match(homeSource, /commit_transaction_start/);
  assert.match(homeSource, /commit_reducer_dispatched/);
  assert.match(homeSource, /commit_transaction_complete/);
  assert.match(homeSource, /auto_equipment_start/);
  assert.match(homeSource, /auto_equipment_complete/);
  assert.match(homeSource, /afk_checkpoint_serialization/);
  assert.match(homeSource, /afk_checkpoint_storage_write/);
  assert.match(hookSource, /game_save_serialization/);
  assert.match(hookSource, /game_save_compression/);
  assert.match(hookSource, /game_save_storage_write/);
  assert.match(diagnosticsSource, /memory: memoryMonitor\.getDiagnosticExport\(\)/);
  assert.match(diagnosticsSource, /afkTrace: afkRuntimeTrace\.getDiagnosticExport\(\)/);
  assert.match(diagnosticsSource, /bokemo-runtime-diagnostics-v/);
  assert.match(diagnosticsSource, /data-afk-readonly="true"/);
  assert.match(homeSource, /target\.closest\('\[data-afk-readonly="true"\]'\)/);
});
