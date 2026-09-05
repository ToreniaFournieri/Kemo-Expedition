import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const RESULT_PREFIX = 'BOKEMO_AFK_LIVE_RESULT ';
const validHours = new Set([9, 24, 162]);

function positive(name, fallback, allowZero = false) {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(parsed) || parsed < (allowZero ? 0 : 1)) throw new Error(`${name} is invalid`);
  return parsed;
}

function nearestRank(values, ratio) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * ratio) - 1)] ?? 0;
}

function distribution(values) {
  const finite = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  return {
    samples: finite.length,
    minimum: finite.length === 0 ? 0 : Math.min(...finite),
    p50: nearestRank(finite, 0.5),
    p95: nearestRank(finite, 0.95),
    maximum: finite.length === 0 ? 0 : Math.max(...finite),
  };
}

function parseHours() {
  const raw = process.argv.find((value) => value.startsWith('--hours='))?.slice(8) ?? '9,24,162';
  const hours = raw.split(',').map(Number);
  if (hours.length === 0 || hours.some((value) => !validHours.has(value))) throw new Error('hours must use 9, 24, or 162');
  return hours;
}

function compactRun(run) {
  return {
    ...run,
    trace: {
      ...run.trace,
      events: [],
      anomalies: run.trace.anomalies,
    },
  };
}

const hours = parseHours();
const requestedMode = process.argv.find((value) => value.startsWith('--mode='))?.slice(7) ?? 'timing';
if (!['timing', 'memory', 'both'].includes(requestedMode)) throw new Error('mode must be timing, memory, or both');
const modes = requestedMode === 'both' ? ['timing', 'memory'] : [requestedMode];
const requestedVariants = process.argv.find((value) => value.startsWith('--variants='))?.slice(11) ?? 'candidate';
const variants = requestedVariants.split(',');
if (variants.length === 0 || variants.some((variant) => !['baseline', 'candidate', 'renderer-memo', 'coordinator-authority', 'authority-production', 'coordinator-paced'].includes(variant))) {
  throw new Error('variants must use baseline, candidate, renderer-memo, coordinator-authority, authority-production, or coordinator-paced');
}
const samples = positive('samples', 1);
const warmups = positive('warmups', 0, true);
const workerLimit = positive('workers', 0, true);
if (workerLimit > 6) throw new Error('workers must be between 1 and 6, or 0 for the production policy');
const includeRuns = process.argv.includes('--include-runs');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bokemo-afk-live-'));
const distPath = join(temporaryDirectory, 'dist');
const mainPath = join(temporaryDirectory, 'main.cjs');
const preloadPath = join(temporaryDirectory, 'preload.cjs');

try {
  const build = spawnSync(resolve('node_modules/.bin/vite'), ['build', '--outDir', distPath, '--emptyOutDir'], {
    cwd: process.cwd(),
    env: { ...process.env, BOKEMO_AFK_LIVE_PROFILE: '1' },
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (build.status !== 0) throw new Error(build.stderr || build.stdout || 'AFK live profile build failed');

  writeFileSync(preloadPath, `
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('__BOKEMO_AFK_LIVE_PROFILE_MEMORY__', {
  sample: () => ipcRenderer.invoke('profile:get-memory-metrics'),
  forceGc: () => ipcRenderer.invoke('profile:force-gc'),
});
`);
  writeFileSync(mainPath, `
const { app, BrowserWindow, ipcMain, net, protocol } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { normalizeAppMemoryMetrics } = require(${JSON.stringify(resolve('desktop/memory-metrics.cjs'))});
const DIST_ROOT = ${JSON.stringify(distPath)};
const PRELOAD = ${JSON.stringify(preloadPath)};
const hours = Number(process.argv.find(value => value.startsWith('--profile-hours='))?.slice(16) || 162);
const mode = process.argv.find(value => value.startsWith('--profile-mode='))?.slice(15) || 'timing';
const variant = process.argv.find(value => value.startsWith('--profile-variant='))?.slice(18) || 'candidate';
const workers = Number(process.argv.find(value => value.startsWith('--profile-workers='))?.slice(18) || 0);
const userData = process.argv.find(value => value.startsWith('--profile-user-data='))?.slice(20);
if (userData) app.setPath('userData', userData);
app.commandLine.appendSwitch('enable-precise-memory-info');
app.commandLine.appendSwitch('js-flags', '--expose-gc');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
function resolveFile(requestUrl) {
  const url = new URL(requestUrl);
  const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.resolve(DIST_ROOT, '.' + requested);
  const relative = path.relative(DIST_ROOT, file);
  return relative.startsWith('..') || path.isAbsolute(relative) ? null : file;
}
app.whenReady().then(async () => {
  protocol.handle('app', request => {
    const file = resolveFile(request.url);
    return file ? net.fetch(pathToFileURL(file).toString()) : new Response('Not found', { status: 404 });
  });
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 820,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  ipcMain.handle('profile:get-memory-metrics', event => normalizeAppMemoryMetrics(app.getAppMetrics(), event.sender.getOSProcessId()));
  ipcMain.handle('profile:force-gc', event => event.sender.executeJavaScript('globalThis.gc?.()').then(() => undefined));
  const timeout = setTimeout(() => {
    process.stderr.write('AFK live profile timed out\\n');
    app.exit(1);
  }, 300000);
  try {
    await window.loadURL('app://bokemo/?afkProfileHours=' + hours + '&afkProfileMode=' + encodeURIComponent(mode) + '&afkProfileVariant=' + encodeURIComponent(variant) + '&afkProfileWorkers=' + workers);
    const result = await window.webContents.executeJavaScript('window.__BOKEMO_AFK_LIVE_PROFILE_RESULT__', true);
    const compactResult = { ...result, trace: { ...result.trace, events: [] } };
    clearTimeout(timeout);
    process.stdout.write(${JSON.stringify(RESULT_PREFIX)} + JSON.stringify(compactResult) + '\\n');
    app.exit(0);
  } catch (error) {
    clearTimeout(timeout);
    process.stderr.write((error && error.stack ? error.stack : String(error)) + '\\n');
    app.exit(1);
  }
});
`);

  const rawRuns = [];
  for (const mode of modes) {
    for (const rawAbsenceHours of hours) {
      for (let index = -warmups; index < samples; index += 1) {
        const orderedVariants = index % 2 === 0 ? variants : [...variants].reverse();
        for (const variant of orderedVariants) {
          const userDataPath = join(temporaryDirectory, `user-${mode}-${variant}-${rawAbsenceHours}-${index}`);
          const run = spawnSync(resolve('node_modules/.bin/electron'), [
            mainPath,
            `--profile-hours=${rawAbsenceHours}`,
            `--profile-mode=${mode}`,
            `--profile-variant=${variant}`,
            `--profile-workers=${workerLimit}`,
            `--profile-user-data=${userDataPath}`,
          ], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
          if (run.status !== 0) throw new Error(run.stderr || run.stdout || `AFK live ${mode}/${rawAbsenceHours}h failed`);
          const line = run.stdout.split('\n').find((value) => value.startsWith(RESULT_PREFIX));
          if (!line) throw new Error(`Missing AFK live result for ${mode}/${rawAbsenceHours}h`);
          if (index >= 0) rawRuns.push(JSON.parse(line.slice(RESULT_PREFIX.length)));
        }
      }
    }
  }

  const workloads = Object.fromEntries(modes.flatMap((mode) => variants.flatMap((variant) => hours.map((rawAbsenceHours) => {
    const runs = rawRuns.filter((run) => run.mode === mode && run.variant === variant && run.rawAbsenceHours === rawAbsenceHours);
    const attributionFields = [
      'jobConstructionMs', 'workerSubmissionMs', 'workerExecutionSumMs',
      'workerInputQueueMs', 'workerInputHydrationMs', 'workerLanguageReadyMs', 'workerSimulationExecutionMs',
      'workerBattleCount', 'workerBattleTotalMs', 'workerBattlePreparationMs', 'workerBattleInputWriteMs',
      'workerBattleNativeExecutionMs', 'workerBattleBorrowedOutputValidationMs', 'workerBattleOutputConsumeMs',
      'workerBattleInputBytes', 'workerBattleOutputBytes', 'workerBattleResultBagEntryAllocations',
      'workerStatusSnapshotMs', 'workerExpeditionMs', 'workerDiaryFinalizationMs',
      'workerSideQuestAutomationMs', 'workerProfitProcessingMs', 'workerHpRecoveryMs',
      'workerProgressCallbackMs', 'workerChunkFinalizationMs', 'workerInventoryDeltaMs',
      'workerExpeditionPreparationMs', 'workerExpeditionInventoryCoordinatorMs',
      'workerExpeditionServiceMs', 'workerExpeditionPostServiceMs',
      'workerExpeditionInventoryCompletionMs', 'workerExpeditionPresentationCompletionMs',
      'workerExpeditionCommitProjectionMs', 'workerExpeditionCount', 'workerExpeditionRoomCount',
      'workerExpeditionRetainedNarrationCount', 'workerExpeditionReplayedBattleCount',
      'hydrationMs', 'fifoCommitWaitMs',
      'chunkCommitReactVisibilityMs', 'autoEquipmentMs', 'autoEquipmentPlanningCount',
      'autoEquipmentNoopCount', 'autoEquipmentPlannedActionCount', 'autoEquipmentReactVisibilityMs',
      'atomicTransactionReactVisibilityMs', 'chunkReducerMs', 'autoEquipmentReducerMs',
      'coordinatorAuthorityTransactionMs', 'coordinatorAuthorityTransactionMaximumMs', 'coordinatorAuthorityTransactionCount',
      'coordinatorAuthorityPublicationCount', 'coordinatorAuthorityTransactionsPerPublication',
      'coordinatorAuthorityPublicationDelayMs',
      'coordinatorAuthorityDispatchPaceMs', 'coordinatorAuthorityAckToWorkerPostMs',
      'workerSlotIdleBeforeDispatchMs',
      'rendererTransactionBoundaryMs', 'rendererTransactionBoundarySharePercent', 'persistenceRendererMs',
      'checkpointMs', 'recoveryFinalizationMs',
      'rendererPartyStatsCalls', 'rendererPartyStatsHits', 'rendererPartyStatsMisses', 'rendererPartyStatsComputeMs',
    ];
    return [`${variant}-${mode}-${rawAbsenceHours}h`, {
      mode,
      variant,
      rawAbsenceHours,
      samples: runs.length,
      finalStateHashes: [...new Set(runs.map((run) => run.validation.finalStateSha256))],
      persistedStateHashes: [...new Set(runs.map((run) => run.validation.persistedStateSha256))],
      wholeRecoveryHashStable: new Set(runs.map((run) => run.validation.finalStateSha256)).size === 1,
      persistedStateSemanticallyIdenticalEveryRun: runs.every((run) => run.validation.persistedStateSemanticallyIdentical),
      wallMs: distribution(runs.map((run) => run.wallMs)),
      heartbeatP95Ms: distribution(runs.map((run) => run.heartbeatDelayMs.p95)),
      heartbeatMaximumMs: distribution(runs.map((run) => run.heartbeatDelayMs.maximum)),
      reactCommitCount: distribution(runs.map((run) => run.react.commitCount)),
      reactCommitP95Ms: distribution(runs.map((run) => run.react.p95CommitDurationMs)),
      longTaskMaximumMs: distribution(runs.map((run) => Math.max(...run.longTasks.map((task) => task.durationMs), 0))),
      attribution: Object.fromEntries(attributionFields.map((field) => [field, distribution(runs.map((run) => run.attribution[field]))])),
      memory: {
        peakApplicationWorkingSetBytes: distribution(runs.map((run) => run.memory.peakApplicationWorkingSetBytes)),
        peakRendererWorkingSetBytes: distribution(runs.map((run) => run.memory.peakRendererWorkingSetBytes)),
        peakRendererHeapBytes: distribution(runs.map((run) => run.memory.peakRendererHeapBytes)),
        completionApplicationWorkingSetBytes: distribution(runs.map((run) => run.memory.points.find((point) => point.label === 'completion')?.applicationWorkingSetBytes)),
        settledApplicationWorkingSetBytes: distribution(runs.map((run) => run.memory.points.find((point) => point.label === 'settled')?.applicationWorkingSetBytes)),
        settledRendererWorkingSetBytes: distribution(runs.map((run) => run.memory.points.find((point) => point.label === 'settled')?.rendererWorkingSetBytes)),
      },
      ...(includeRuns ? { runs: runs.map(compactRun) } : {}),
    }];
  }))));
  const comparisons = Object.fromEntries(modes.flatMap((mode) => hours.flatMap((rawAbsenceHours) => {
    const baseline = workloads[`baseline-${mode}-${rawAbsenceHours}h`];
    const candidate = workloads[`candidate-${mode}-${rawAbsenceHours}h`];
    if (!baseline || !candidate) return [];
    const percentChange = (candidateValue, baselineValue) => baselineValue > 0
      ? (candidateValue - baselineValue) / baselineValue * 100
      : 0;
    return [[`${mode}-${rawAbsenceHours}h`, {
      wallP50Percent: percentChange(candidate.wallMs.p50, baseline.wallMs.p50),
      wallP95Percent: percentChange(candidate.wallMs.p95, baseline.wallMs.p95),
      peakApplicationWorkingSetPercent: percentChange(
        candidate.memory.peakApplicationWorkingSetBytes.p50,
        baseline.memory.peakApplicationWorkingSetBytes.p50,
      ),
      settledApplicationWorkingSetPercent: percentChange(
        candidate.memory.settledApplicationWorkingSetBytes.p50,
        baseline.memory.settledApplicationWorkingSetBytes.p50,
      ),
      reactCommitP95Percent: percentChange(candidate.reactCommitP95Ms.p50, baseline.reactCommitP95Ms.p50),
      heartbeatMaximumPercent: percentChange(candidate.heartbeatMaximumMs.p50, baseline.heartbeatMaximumMs.p50),
    }]];
  })));
  process.stdout.write(`${JSON.stringify({
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    sampling: { hours, modes, variants, workerLimit: workerLimit || null, warmups, samples, freshElectronProcessPerRun: true, alternatingVariantOrder: variants.length > 1 },
    workloads,
    comparisons,
  }, null, 2)}\n`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
