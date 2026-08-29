import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildSync } from 'esbuild';

function positive(name, fallback) {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

const samples = positive('samples', 20);
const warmups = positive('warmups', 2);
const onlyCandidate = process.argv.find((value) => value.startsWith('--only='))?.split('=')[1] ?? '';
const promotionOnly = process.argv.includes('--promotion');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bokemo-afk-transfer-renderer-'));
const rendererPath = join(temporaryDirectory, 'profile.js');
const workerPath = join(temporaryDirectory, 'worker.js');
const htmlPath = join(temporaryDirectory, 'profile.html');
const mainPath = join(temporaryDirectory, 'main.cjs');
const preloadPath = join(temporaryDirectory, 'preload.cjs');
const userDataPath = join(temporaryDirectory, 'electron-user-data');
const fixture = readFileSync(resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'), 'utf8');

try {
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/afkTransferRenderer.profile.ts')],
    outfile: rendererPath,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    define: {
      'import.meta.env.DEV': 'false',
      __BUILD_NUMBER__: '0',
      __EXPEDITION_8_SAVE_FIXTURE__: JSON.stringify(fixture),
      __AFK_TRANSFER_WORKER_URL__: JSON.stringify('./worker.js'),
      __AFK_TRANSFER_SAMPLE_COUNT__: String(samples),
      __AFK_TRANSFER_WARMUP_COUNT__: String(warmups),
      __AFK_TRANSFER_ONLY_CANDIDATE__: JSON.stringify(onlyCandidate),
      __AFK_TRANSFER_PROMOTION_ONLY__: String(promotionOnly),
    },
    logLevel: 'silent',
  });
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/afkTransferRendererWorker.profile.ts')],
    outfile: workerPath,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    define: { 'import.meta.env.DEV': 'false', __BUILD_NUMBER__: '0' },
    logLevel: 'silent',
  });
  writeFileSync(htmlPath, '<!doctype html><meta charset="utf-8"><script type="module" src="./profile.js"></script>\n');
  writeFileSync(preloadPath, `
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('__BOKEMO_PROFILE_MEMORY__', {
  sample: () => ipcRenderer.invoke('profile:get-memory-metrics'),
});
`);
  writeFileSync(mainPath, `
const { app, BrowserWindow, ipcMain } = require('electron');
const { normalizeAppMemoryMetrics } = require(${JSON.stringify(resolve(process.cwd(), 'desktop/memory-metrics.cjs'))});
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('js-flags', '--expose-gc');
app.setPath('userData', ${JSON.stringify(userDataPath)});
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { preload: ${JSON.stringify(preloadPath)}, contextIsolation: true, nodeIntegration: false, sandbox: true } });
  ipcMain.handle('profile:get-memory-metrics', (event) => normalizeAppMemoryMetrics(app.getAppMetrics(), event.sender.getOSProcessId()));
  try {
    await window.loadFile(${JSON.stringify(htmlPath)});
    const report = await window.webContents.executeJavaScript('window.__BOKEMO_AFK_TRANSFER_PROFILE__', true);
    process.stdout.write(JSON.stringify(report, null, 2) + '\\n');
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
