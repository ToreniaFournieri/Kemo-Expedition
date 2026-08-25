import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { buildSync } from 'esbuild';

const CHILD_PREFIX = 'BOKEMO_MEMORY_RESULT ';
const workloads = ['idle', 'normal-play', 'x100', 'afk-24h', 'simulation-100', 'pane-switching'];

function numberArg(name, fallback) {
  const token = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!token) return fallback;
  const value = Number(token.slice(name.length + 3));
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid --${name}`);
  return value;
}

const temporaryDirectory = mkdtempSync(resolve(tmpdir(), 'bokemo-memory-'));
const childPath = resolve(temporaryDirectory, 'memory-child.mjs');
buildSync({
  entryPoints: [resolve('tests/support/memoryBenchmarkChild.ts')],
  outfile: childPath,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  logLevel: 'silent',
  define: {
    __APP_VERSION__: JSON.stringify('0.9.4-memory-benchmark'),
    __BUILD_NUMBER__: '0',
    __PUBLIC_CHARACTER_IMAGE_FILES__: '[]',
    __PUBLIC_CHIBI_IMAGE_FILES__: '[]',
    'import.meta.env.BASE_URL': JSON.stringify('/dev/'),
    'import.meta.env.DEV': 'true',
  },
});

function runOne(workload, profile, repetitions) {
  const result = spawnSync(process.execPath, [
    '--expose-gc',
    childPath,
    `--profile=${profile}`,
    `--workload=${workload}`,
    `--repetitions=${repetitions}`,
  ], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `${workload} failed`);
  const line = result.stdout.split('\n').find((value) => value.startsWith(CHILD_PREFIX));
  if (!line) throw new Error(`Missing result for ${workload}`);
  return JSON.parse(line.slice(CHILD_PREFIX.length));
}

try {
  const profile = process.argv.includes('--profile=standard') ? 'standard' : 'smoke';
  const absoluteAllowance = numberArg('absolute-mib', 32) * 1024 * 1024;
  const percentageAllowance = numberArg('percentage', 20);
  const repetitions = Math.max(1, Math.floor(numberArg('repetitions', 3)));
  const requested = process.argv.find((value) => value.startsWith('--workload='))?.slice(11);
  const selected = requested ? [requested] : workloads;
  const reports = [];
  let failed = false;
  for (const workload of selected) {
    const childReport = runOne(workload, profile, repetitions);
    const runs = childReport.runs;
    const first = runs[0].settled.rss;
    const last = runs[runs.length - 1].settled.rss;
    const growthBytes = last - first;
    const growthPercent = first > 0 ? growthBytes / first * 100 : 0;
    const regression = growthBytes > absoluteAllowance && growthPercent > percentageAllowance;
    failed ||= regression;
    reports.push({ workload, runs, afkEnvelopeBytes: childReport.afkEnvelopeBytes, settledGrowthBytes: growthBytes, settledGrowthPercent: growthPercent, regression });
  }
  const report = {
    schemaVersion: 1,
    profile,
    generatedAt: new Date().toISOString(),
    platform: `${process.platform}-${process.arch}`,
    node: process.version,
    gate: { absoluteAllowanceBytes: absoluteAllowance, percentageAllowance },
    reports,
  };
  const outputArg = process.argv.find((value) => value.startsWith('--output='))?.slice(9);
  if (outputArg) writeFileSync(resolve(outputArg), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (failed) process.exitCode = 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
