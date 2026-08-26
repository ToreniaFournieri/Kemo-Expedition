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

const samples = positive('samples', 5);
const warmups = positive('warmups', 1);
const summaryOnly = process.argv.includes('--summary-only');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bokemo-exp8-startup-diagnostics-'));
const rendererPath = join(temporaryDirectory, 'profile.js');
const workerPath = join(temporaryDirectory, 'diagnostic-worker.js');
const htmlPath = join(temporaryDirectory, 'profile.html');
const mainPath = join(temporaryDirectory, 'main.cjs');
const userDataPath = join(temporaryDirectory, 'electron-user-data');
const fixture = readFileSync(resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'), 'utf8');

try {
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/expedition8StartupDiagnostics.profile.ts')],
    outfile: rendererPath, bundle: true, platform: 'browser', format: 'esm',
    define: {
      'import.meta.env.DEV': 'false', __BUILD_NUMBER__: '0',
      __EXPEDITION_8_SAVE_FIXTURE__: JSON.stringify(fixture),
      __DIAGNOSTIC_WORKER_URL__: JSON.stringify('./diagnostic-worker.js'),
      __DIAGNOSTIC_SAMPLE_COUNT__: String(samples), __DIAGNOSTIC_WARMUP_COUNT__: String(warmups),
    }, logLevel: 'silent',
  });
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/expedition8StartupDiagnosticWorker.profile.ts')],
    outfile: workerPath, bundle: true, platform: 'browser', format: 'esm',
    define: { 'import.meta.env.DEV': 'false', __BUILD_NUMBER__: '0' }, logLevel: 'silent',
  });
  writeFileSync(htmlPath, '<!doctype html><meta charset="utf-8"><script type="module" src="./profile.js"></script>\n');
  writeFileSync(mainPath, `
const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('enable-precise-memory-info');
app.setPath('userData', ${JSON.stringify(userDataPath)});
app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  try {
    await window.loadFile(${JSON.stringify(htmlPath)});
    const report = await window.webContents.executeJavaScript('window.__BOKEMO_EXP8_STARTUP_DIAGNOSTICS__', true);
    const printable = ${summaryOnly ? `{
      ...report,
      variants: Object.fromEntries(Object.entries(report.variants).map(([name, value]) => [name, {
        configuration: value.configuration,
        summary: value.summary,
      }])),
    }` : 'report'};
    process.stdout.write(JSON.stringify(printable, null, 2) + '\\n');
    app.exit(0);
  } catch (error) {
    process.stderr.write((error && error.stack ? error.stack : String(error)) + '\\n');
    app.exit(1);
  }
});
`);
  const result = spawnSync(resolve(process.cwd(), 'node_modules/.bin/electron'), [mainPath], { cwd: process.cwd(), stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
