import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  MEMORY_EVENT_LIMIT,
  MEMORY_SAMPLE_LIMIT,
  MemoryMonitor,
} from '../src/game/memoryMonitoring.ts';

const require = createRequire(import.meta.url);
const { normalizeAppMemoryMetrics } = require('../desktop/memory-metrics.cjs');

test('memory monitoring keeps bounded samples and tracks peaks without inventing unavailable values', async () => {
  let now = 1_000;
  const monitor = new MemoryMonitor('dev', () => now++);
  for (let index = 0; index < MEMORY_SAMPLE_LIMIT + 12; index += 1) {
    await monitor.sample({ jsHeapUsed: index, jsHeapTotal: index * 2, jsHeapLimit: 10_000 });
  }
  const diagnostics = monitor.getDiagnosticExport();
  assert.equal(diagnostics.schemaVersion, 2);
  assert.equal(diagnostics.samples.length, MEMORY_SAMPLE_LIMIT);
  assert.equal(diagnostics.current?.peak.jsHeapUsed, MEMORY_SAMPLE_LIMIT + 11);
  assert.equal(diagnostics.current?.current.applicationWorkingSet, null);
  assert.equal(diagnostics.current?.current.rendererWorkingSet, null);
  assert.deepEqual(diagnostics.current?.processBreakdown, []);
});

test('desktop metrics aggregate every Electron process and identify the requesting renderer', () => {
  const metrics = normalizeAppMemoryMetrics([
    { pid: 10, type: 'Browser', memory: { workingSetSize: 100 } },
    { pid: 20, type: 'Tab', memory: { workingSetSize: 200 } },
    { pid: 21, type: 'Tab', memory: { workingSetSize: 50 } },
    { pid: 30, type: 'GPU', name: 'GPU Process', memory: { workingSetSize: 75 } },
    { pid: 40, type: 'Utility', serviceName: 'network.mojom.NetworkService', memory: { workingSetSize: 25 } },
  ], 20);
  assert.equal(metrics.applicationWorkingSetBytes, 450 * 1024);
  assert.equal(metrics.rendererWorkingSetBytes, 200 * 1024);
  assert.equal(metrics.processBreakdown.length, 5);
  assert.deepEqual(metrics.processBreakdown.map((entry: { type: string }) => entry.type), ['Browser', 'Tab', 'Tab', 'GPU', 'Utility']);
  assert.equal(metrics.processBreakdown[4].serviceName, 'network.mojom.NetworkService');
});

test('desktop aggregation refuses a fabricated total when any process working set is unavailable', () => {
  const metrics = normalizeAppMemoryMetrics([
    { pid: 10, type: 'Browser', memory: { workingSetSize: 100 } },
    { pid: 20, type: 'Tab', memory: { workingSetSize: Number.NaN } },
  ], 20);
  assert.equal(metrics.applicationWorkingSetBytes, null);
  assert.equal(metrics.rendererWorkingSetBytes, null);
  assert.equal(metrics.processBreakdown[1].workingSetBytes, null);
});

test('samples retain only the current process breakdown while tracking aggregate peaks', async () => {
  const readings = [
    {
      applicationWorkingSetBytes: 500,
      rendererWorkingSetBytes: 300,
      processBreakdown: [{ pid: 1, type: 'Browser', name: null, serviceName: null, workingSetBytes: 200 }],
    },
    {
      applicationWorkingSetBytes: 400,
      rendererWorkingSetBytes: 250,
      processBreakdown: [{ pid: 2, type: 'Tab', name: null, serviceName: null, workingSetBytes: 250 }],
    },
  ];
  const monitor = new MemoryMonitor('dev', () => 1_000, async () => readings.shift() ?? null);
  await monitor.sample();
  const second = await monitor.sample();
  assert.equal(second.current.applicationWorkingSet, 400);
  assert.equal(second.peak.applicationWorkingSet, 500);
  assert.equal(second.current.rendererWorkingSet, 250);
  assert.equal(second.peak.rendererWorkingSet, 300);
  assert.deepEqual(second.processBreakdown.map((entry) => entry.pid), [2]);
  assert.deepEqual(monitor.getDiagnosticExport().samples[0].processBreakdown.map((entry) => entry.pid), [1]);
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
  const diagnostics = readFileSync(new URL('../src/components/MemoryDiagnostics.tsx', import.meta.url), 'utf8');
  const locales = ['en', 'ja', 'zh-CN', 'zh-TW'].map((locale) => readFileSync(new URL(`../src/i18n/${locale}.ts`, import.meta.url), 'utf8'));
  assert.match(preload, /getMemoryMetrics: \(\) => ipcRenderer\.invoke\('desktop:get-memory-metrics'\)/);
  assert.match(main, /ipcMain\.handle\('desktop:get-memory-metrics'/);
  assert.match(main, /normalizeAppMemoryMetrics\(app\.getAppMetrics\(\), processId\)/);
  assert.match(diagnostics, /applicationWorkingSet/);
  assert.match(diagnostics, /rendererWorkingSet/);
  assert.doesNotMatch(diagnostics, /setting\.memory\.total/);
  assert.doesNotMatch(diagnostics, /processBreakdown/);
  locales.forEach((locale) => {
    assert.match(locale, /setting\.memory\.applicationWorkingSet/);
    assert.match(locale, /setting\.memory\.rendererWorkingSet/);
  });
  assert.match(partyTab, /image\.onload = null;[\s\S]{0,80}image\.onerror = null;[\s\S]{0,80}image\.src = ''/);
  assert.match(shared, /const release = \(\) => \{[\s\S]{0,100}image\.onload = null/);
});
