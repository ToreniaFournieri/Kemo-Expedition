import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  MEMORY_EVENT_LIMIT,
  MEMORY_SAMPLE_LIMIT,
  MemoryMonitor,
} from '../src/game/memoryMonitoring.ts';

test('memory monitoring keeps bounded samples and tracks peaks without inventing unavailable values', async () => {
  let now = 1_000;
  const monitor = new MemoryMonitor('dev', () => now++);
  for (let index = 0; index < MEMORY_SAMPLE_LIMIT + 12; index += 1) {
    await monitor.sample({ jsHeapUsed: index, jsHeapTotal: index * 2, jsHeapLimit: 10_000, processMemory: null });
  }
  const diagnostics = monitor.getDiagnosticExport();
  assert.equal(diagnostics.samples.length, MEMORY_SAMPLE_LIMIT);
  assert.equal(diagnostics.current?.peak.jsHeapUsed, MEMORY_SAMPLE_LIMIT + 11);
  assert.equal(diagnostics.current?.current.processMemory, null);
});

test('memory event logging is bounded and heap warnings are debounced', async () => {
  const monitor = new MemoryMonitor('beta');
  monitor.start();
  await monitor.sample({ jsHeapUsed: 90, jsHeapTotal: 100, jsHeapLimit: 100 });
  await monitor.sample({ jsHeapUsed: 91, jsHeapTotal: 100, jsHeapLimit: 100 });
  await monitor.sample({ jsHeapUsed: 92, jsHeapTotal: 100, jsHeapLimit: 100 });
  await monitor.sample({ jsHeapUsed: 93, jsHeapTotal: 100, jsHeapLimit: 100 });
  assert.equal(monitor.getDiagnosticExport().events.filter((event) => event.event === 'memory_warning').length, 1);
  await monitor.sample({ jsHeapUsed: 70, jsHeapTotal: 100, jsHeapLimit: 100 });
  await monitor.sample({ jsHeapUsed: 90, jsHeapTotal: 100, jsHeapLimit: 100 });
  await monitor.sample({ jsHeapUsed: 90, jsHeapTotal: 100, jsHeapLimit: 100 });
  await monitor.sample({ jsHeapUsed: 90, jsHeapTotal: 100, jsHeapLimit: 100 });
  assert.equal(monitor.getDiagnosticExport().events.filter((event) => event.event === 'memory_warning').length, 2);
  for (let index = 0; index < MEMORY_EVENT_LIMIT + 10; index += 1) monitor.recordEventFromCurrent('chunk_complete');
  assert.equal(monitor.getDiagnosticExport().events.length, MEMORY_EVENT_LIMIT);
  monitor.stop();
});

test('pausing collection retains live worker ownership while stop releases it', async () => {
  const monitor = new MemoryMonitor('dev');
  monitor.registerWorker('worker-1', 4096);
  assert.equal((await monitor.sample()).activeWorkers, 1);
  monitor.pause();
  assert.equal((await monitor.sample()).activeWorkers, 1);
  monitor.stop();
  assert.equal((await monitor.sample()).activeWorkers, 0);
  monitor.reset();
  const diagnostics = monitor.getDiagnosticExport();
  assert.equal(diagnostics.samples.length, 0);
  assert.equal(diagnostics.events.length, 0);
});

test('runtime events are collected only between explicit start and stop', async () => {
  const monitor = new MemoryMonitor('dev');
  await monitor.recordEvent('simulation_start');
  assert.equal(monitor.getDiagnosticExport().samples.length, 0);
  monitor.start();
  await monitor.recordEvent('simulation_start');
  assert.equal(monitor.getDiagnosticExport().enabled, true);
  assert.ok(monitor.getDiagnosticExport().events.some((event) => event.event === 'simulation_start'));
  monitor.stop();
  await monitor.recordEvent('simulation_complete');
  assert.equal(monitor.getDiagnosticExport().enabled, false);
  assert.equal(monitor.getDiagnosticExport().events.some((event) => event.event === 'simulation_complete'), false);
});

test('desktop bridge is read-only and image probes release handlers and sources', () => {
  const preload = readFileSync(new URL('../desktop/preload.cjs', import.meta.url), 'utf8');
  const main = readFileSync(new URL('../desktop/main.cjs', import.meta.url), 'utf8');
  const partyTab = readFileSync(new URL('../src/components/home/tabs/PartyTab.tsx', import.meta.url), 'utf8');
  const shared = readFileSync(new URL('../src/components/home/homeShared.tsx', import.meta.url), 'utf8');
  assert.match(preload, /getProcessMemoryMetrics: \(\) => ipcRenderer\.invoke\('desktop:get-process-memory-metrics'\)/);
  assert.match(main, /ipcMain\.handle\('desktop:get-process-memory-metrics'/);
  assert.match(partyTab, /image\.onload = null;[\s\S]{0,80}image\.onerror = null;[\s\S]{0,80}image\.src = ''/);
  assert.match(shared, /const release = \(\) => \{[\s\S]{0,100}image\.onload = null/);
});
