import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function positive(name, fallback) {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

function option(name, fallback) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
}

const samples = positive('samples', 20);
const warmups = positive('warmups', 2);
const summaryOnly = process.argv.includes('--summary-only');
const verifyPinnedHashes = !process.argv.includes('--no-pinned-hash-check');
const scope = option('scope', 'all_parties');
const validScopes = new Set(['all_parties', 'party_1', 'character_1']);
if (!validScopes.has(scope)) throw new Error(`Unknown automatic-equipment profile scope: ${scope}`);
const allWorkloads = ['no_op', 'upgrade_heavy', 'full_rebuild', 'locked_equipment', 'jewel_priority', 'max_inventory'];
const workloads = option('workloads', allWorkloads.join(',')).split(',').filter(Boolean);
if (workloads.length === 0 || workloads.some((workload) => !allWorkloads.includes(workload))) {
  throw new Error(`Unknown automatic-equipment workload list: ${workloads.join(',')}`);
}
const outputPath = option('output', '');
const fixtureEnvelope = JSON.parse(readFileSync(
  resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'),
  'utf8',
));
const encodedState = fixtureEnvelope.saveDataCompressed;
if (typeof encodedState !== 'string' || encodedState.length === 0) throw new Error('Expedition 8 fixture payload is missing');

const build = spawnSync('npm', ['run', 'build'], {
  cwd: process.cwd(),
  env: { ...process.env, BOKEMO_AUTO_EQUIPMENT_PROFILE: '1' },
  stdio: 'inherit',
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bokemo-auto-equipment-attribution-'));
const mainPath = join(temporaryDirectory, 'main.cjs');
const userDataPath = join(temporaryDirectory, 'electron-user-data');
const indexPath = resolve(process.cwd(), 'dist/index.html');

try {
  writeFileSync(mainPath, `
const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('disable-gpu');
app.setPath('userData', ${JSON.stringify(userDataPath)});

const workloads = ${JSON.stringify(workloads)};
const scope = ${JSON.stringify(scope)};
const expectedHashes = {
  all_parties: {
    no_op: { action: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945', final: 'ea2fac27529c3ebde4a18f0316f6218a821397f16465715984f36307ed8ecb6b' },
    upgrade_heavy: { action: 'c5badfd789d306d422dd1d8f6a9b8b64eb4d8a1fd149557b8b24df85152ef558', final: 'c6f3a08ec5750202f9a87ee2f89a9dc863a948ecdf7af217f6d234d6ce8bd560' },
    full_rebuild: { action: '28c2be26d1ad2467a45ece7ee9abae3fd343f5a3e15d9c15e310231ad10cfd5c', final: '9de40f57b6e3073a0d5ff234d8c0789873f60afe52231bbae7e93bc0184ee0d8' },
    locked_equipment: { action: 'ec7c4963dd2a5c721fe4eaf99f841312349e15571baef6837417a82909690dd4', final: 'a5ebb3d28cf350027346b4d6b58906c4f6d3f267f161ccd9aa636d98aee5fd00' },
    jewel_priority: { action: 'b053201d08a20b6f15600b9ac0bb12d9fa3b4a7fdef448c115e59bcbef4f7c5d', final: 'f85a79bb7696ee54ecba0a678a554e54bf96d35e7933e155ed0b57cb8643274f' },
    max_inventory: { action: 'ce0c0d895099d202866b9f29b9287b60e293fd7bd105a43a3064189e6d1ddbd2', final: 'ee2fb639e67ce4497c6ac5d5af4fd5478df28ecd2d7e3ffbaa52a63ab19d759f' },
  },
  party_1: {
    no_op: { action: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945', final: 'ea2fac27529c3ebde4a18f0316f6218a821397f16465715984f36307ed8ecb6b' },
    upgrade_heavy: { action: '068e53072dd493b12c463f225e74b9c56aaf5f679f38a0b820a7dc064218fc90', final: '6cd78c08fea8cfaadedac1ac234b0d9725da42a2df5c2f149981e797435af9b8' },
    full_rebuild: { action: 'd53d956e73463a25c888510bec33c434b2058c9c5f26bd467abb51d4b30f931d', final: 'c0c8fb8d51943d8ae4f991d28dde7694140a13268eae3951741b1555f90bf2ea' },
    locked_equipment: { action: '6c79c217976dce3bca74de6bbd621e8b55f7acc4ae6e28a00bee7ebbf540caa8', final: 'd048abeccf60843d31a87b19816bca7a62f41127f36310c47587cc8047b07822' },
    jewel_priority: { action: 'b053201d08a20b6f15600b9ac0bb12d9fa3b4a7fdef448c115e59bcbef4f7c5d', final: 'f85a79bb7696ee54ecba0a678a554e54bf96d35e7933e155ed0b57cb8643274f' },
    max_inventory: { action: 'e0ee222af0eb8aabaa3300731e315353d6145ffc55255984a11727dfb74f6a70', final: '9553c84665e39144c825c018809cc5e50203d16f2e6edb2a13372b4f97e360b9' },
  },
};
const nearestRank = (values, ratio) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * ratio) - 1)] ?? 0;
const distribution = (values) => ({ samples: values.length, p50: nearestRank(values, 0.5), p95: nearestRank(values, 0.95), maximum: Math.max(...values, 0) });

async function waitForProfile(window) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const ready = await window.webContents.executeJavaScript('Boolean(window.__BOKEMO_AUTO_EQUIPMENT_PROFILE__)', true);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Automatic-equipment profile hook did not become ready');
}

async function runSample(window, workload) {
  return window.webContents.executeJavaScript(\`(async () => {
    const timerStartedAt = performance.now();
    const eventLoopDelay = new Promise((resolve) => setTimeout(() => resolve(performance.now() - timerStartedAt), 0));
    const result = await window.__BOKEMO_AUTO_EQUIPMENT_PROFILE__.run(\${JSON.stringify(workload)}, \${JSON.stringify(scope)});
    return { ...result, profileVerificationWindowDelayMs: await eventLoopDelay };
  })()\`, true);
}

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  try {
    await window.loadFile(${JSON.stringify(indexPath)}, { query: { lang: 'ja' } });
    await window.webContents.executeJavaScript(\`localStorage.setItem('kemo-expedition-save:prod', \${JSON.stringify(${JSON.stringify(encodedState)})})\`, true);
    await window.webContents.reload();
    await waitForProfile(window);
    const report = { schemaVersion: 3, generatedAt: new Date().toISOString(), scope, sampling: { warmups: ${warmups}, measuredSamples: ${samples} }, workloads: {} };
    for (const workload of workloads) {
      for (let index = 0; index < ${warmups}; index += 1) await runSample(window, workload);
      const measured = [];
      for (let index = 0; index < ${samples}; index += 1) measured.push(await runSample(window, workload));
      const actionHashes = [...new Set(measured.map((sample) => sample.actionSequenceSha256))];
      const finalHashes = [...new Set(measured.map((sample) => sample.finalStateSha256))];
      if (actionHashes.length !== 1 || finalHashes.length !== 1) throw new Error(\`Non-deterministic automatic-equipment workload: \${workload}\`);
      const expected = expectedHashes[scope]?.[workload] ?? null;
      if (${verifyPinnedHashes} && expected && (actionHashes[0] !== expected.action || finalHashes[0] !== expected.final)) {
        throw new Error(\`Pinned automatic-equipment hash mismatch for \${workload}: action=\${actionHashes[0]}, final=\${finalHashes[0]}\`);
      }
      const phaseNames = Object.keys(measured[0].attribution.phasesMs);
      const optimizedReducer = distribution(measured.map((sample) => sample.attribution.phasesMs.reducerApplication));
      const sequentialReducer = distribution(measured.map((sample) => sample.sequentialReducerMs));
      report.workloads[workload] = {
        summary: {
          totalMs: distribution(measured.map((sample) => sample.attribution.totalMs)),
          profileVerificationWindowDelayMs: distribution(measured.map((sample) => sample.profileVerificationWindowDelayMs)),
          unclassifiedMs: distribution(measured.map((sample) => sample.attribution.unclassifiedMs)),
          phasesMs: Object.fromEntries(phaseNames.map((phase) => [phase, distribution(measured.map((sample) => sample.attribution.phasesMs[phase]))])),
          sequentialReducerMs: sequentialReducer,
          legacyPlanningMs: distribution(measured.map((sample) => sample.legacyPlanningMs)),
          reducerAttribution: {
            partyStatsMs: distribution(measured.map((sample) => sample.reducerAttribution.partyStatsMs)),
            inventoryMutationMs: distribution(measured.map((sample) => sample.reducerAttribution.inventoryMutationMs)),
            structuralAndControlMs: distribution(measured.map((sample) => sample.reducerAttribution.structuralAndControlMs)),
            partyStatsCalls: measured[0].reducerAttribution.partyStatsCalls,
            partyMaxHpCalls: measured[0].reducerAttribution.partyMaxHpCalls,
            characterStatsCalls: measured[0].reducerAttribution.characterStatsCalls,
            characterHpContributionCalls: measured[0].reducerAttribution.characterHpContributionCalls,
            hpLedgerInitializations: measured[0].reducerAttribution.hpLedgerInitializations,
            hpLedgerUpdates: measured[0].reducerAttribution.hpLedgerUpdates,
            hpLedgerRebuilds: measured[0].reducerAttribution.hpLedgerRebuilds,
          },
          hpStrategyCandidates: Object.fromEntries(
            Object.keys(measured[0].hpStrategyCandidates).map((strategy) => [strategy, {
              reducerMs: distribution(measured.map((sample) => sample.hpStrategyCandidates[strategy].reducerMs)),
              partyStatsMs: distribution(measured.map((sample) => sample.hpStrategyCandidates[strategy].attribution.partyStatsMs)),
              attributionCounts: Object.fromEntries(
                Object.entries(measured[0].hpStrategyCandidates[strategy].attribution)
                  .filter(([key]) => !key.endsWith('Ms')),
              ),
            }]),
          ),
          reducerMedianImprovementPercent: sequentialReducer.p50 <= 0 ? 0 : (1 - optimizedReducer.p50 / sequentialReducer.p50) * 100,
          inventoryEntriesVisited: measured[0].attribution.inventoryEntriesVisited,
          inventoryIndexEntries: measured[0].attribution.inventoryIndexEntries,
          rankingCandidates: measured[0].attribution.rankingCandidates,
          dispatchedActions: measured[0].attribution.dispatchedActions,
          actionSequenceSha256: actionHashes[0],
          finalStateSha256: finalHashes[0],
          runSummary: measured[0].summary,
          limitations: ['The verification-window delay includes the legacy full-party reducer, whole-party Max-HP reducer, sequential parity oracle, legacy planner oracle, and SHA-256 hashing; production synchronous work is represented by totalMs and phasesMs.'],
        },
        ...(${summaryOnly} ? {} : { samples: measured }),
      };
    }
    const serializedReport = JSON.stringify(report, null, 2) + '\\n';
    ${outputPath ? `require('node:fs').writeFileSync(${JSON.stringify(resolve(outputPath))}, serializedReport);` : ''}
    process.stdout.write(serializedReport);
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
