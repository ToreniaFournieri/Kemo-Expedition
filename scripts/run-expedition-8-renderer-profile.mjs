import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildSync } from 'esbuild';

function parsePositiveInteger(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

const samples = parsePositiveInteger('samples', 20);
const warmups = parsePositiveInteger('warmups', 2);
const summaryOnly = process.argv.includes('--summary-only');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bokemo-exp8-renderer-profile-'));
const rendererPath = join(temporaryDirectory, 'profile.js');
const workerPath = join(temporaryDirectory, 'afk-worker.js');
const persistenceWorkerPath = join(temporaryDirectory, 'persistence-worker.js');
const htmlPath = join(temporaryDirectory, 'profile.html');
const mainPath = join(temporaryDirectory, 'main.cjs');
const userDataPath = join(temporaryDirectory, 'electron-user-data');
const fixturePath = resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz');
const fixture = readFileSync(fixturePath, 'utf8');

try {
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/expedition8RendererBaseline.profile.ts')],
    outfile: rendererPath,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    define: {
      'import.meta.env.DEV': 'false',
      __BUILD_NUMBER__: '0',
      __EXPEDITION_8_SAVE_FIXTURE__: JSON.stringify(fixture),
      __EXPEDITION_8_SAVE_SHA256__: JSON.stringify('87c837fda20d7159d87a68cfc5877d95722aae5719b10e860775dd3ed221662f'),
      __PROFILE_SAMPLE_COUNT__: String(samples),
      __PROFILE_WARMUP_COUNT__: String(warmups),
      __AFK_WORKER_URL__: JSON.stringify('./afk-worker.js'),
      __PERSISTENCE_WORKER_URL__: JSON.stringify('./persistence-worker.js'),
    },
    logLevel: 'silent',
  });
  buildSync({
    entryPoints: [resolve(process.cwd(), 'src/workers/afkChunkWorker.ts')],
    outfile: workerPath,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    define: {
      'import.meta.env.DEV': 'false',
      __BUILD_NUMBER__: '0',
    },
    logLevel: 'silent',
  });
  buildSync({
    entryPoints: [resolve(process.cwd(), 'src/workers/persistenceWorker.ts')],
    outfile: persistenceWorkerPath,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    define: { 'import.meta.env.DEV': 'false', __BUILD_NUMBER__: '0' },
    logLevel: 'silent',
  });
  writeFileSync(htmlPath, '<!doctype html><meta charset="utf-8"><script type="module" src="./profile.js"></script>\n');
  writeFileSync(mainPath, `
const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('disable-gpu');
app.setPath('userData', ${JSON.stringify(userDataPath)});
app.whenReady().then(async () => {
  const window = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  try {
    await window.loadFile(${JSON.stringify(htmlPath)});
    const report = await window.webContents.executeJavaScript('window.__BOKEMO_EXP8_PROFILE_PROMISE__', true);
    const printable = ${summaryOnly ? `{
      ...report,
      startupSequence: {
        ...report.startupSequence,
        intervals: undefined,
        browserLongTasks: report.startupSequence.browserLongTasks,
      },
    }` : 'report'};
    process.stdout.write(JSON.stringify(printable, null, 2) + '\\n');
    app.exit(0);
  } catch (error) {
    process.stderr.write((error && error.stack ? error.stack : String(error)) + '\\n');
    app.exit(1);
  }
});
`);
  const result = spawnSync(resolve(process.cwd(), 'node_modules/.bin/electron'), [mainPath], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
