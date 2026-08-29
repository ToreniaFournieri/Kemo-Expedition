import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const beforeRevision = process.argv[2] ?? '6fb485e8';
const temporaryRoot = mkdtempSync(join(tmpdir(), 'bokemo-gate0r-ab-'));
const revisions = { A: join(temporaryRoot, 'A'), B: join(temporaryRoot, 'B') };

function command(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(`${commandName} ${args.join(' ')} failed\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  return result;
}

function exportRevision(revision, target) {
  mkdirSync(target, { recursive: true });
  const archive = spawnSync('git', ['archive', '--format=tar', revision], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  if (archive.status !== 0) throw new Error(archive.stderr.toString());
  const extracted = spawnSync('tar', ['-xf', '-', '-C', target], { input: archive.stdout, maxBuffer: 256 * 1024 * 1024 });
  if (extracted.status !== 0) throw new Error(extracted.stderr.toString());
}

function copyWorkspaceFile(relativePath, target) {
  const source = resolve(root, relativePath);
  if (!existsSync(source)) return;
  const destination = resolve(target, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

exportRevision(beforeRevision, revisions.A);
exportRevision('HEAD', revisions.B);
copyWorkspaceFile('tests/support/battlePerformance.profile.ts', revisions.A);
const changed = [
  ...command('git', ['diff', '--name-only'], { cwd: root }).stdout.trim().split('\n'),
  ...command('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root }).stdout.trim().split('\n'),
].filter(Boolean);
for (const path of changed) copyWorkspaceFile(path, revisions.B);
for (const target of Object.values(revisions)) symlinkSync(resolve(root, 'node_modules'), resolve(target, 'node_modules'), 'dir');

const sequence = ['A', 'B', 'B', 'A', 'A', 'B', 'B', 'A', 'A', 'B'];
const records = { A: [], B: [] };
const parse = (stdout, marker) => {
  const match = stdout.match(new RegExp(`${marker} (.+)`));
  if (!match) throw new Error(`Missing ${marker}`);
  return JSON.parse(match[1]);
};

for (const [index, label] of sequence.entries()) {
  const target = revisions[label];
  const result = command(process.execPath, ['--test', 'tests/battlePerformance.test.cjs'], {
    cwd: target,
    env: { ...process.env, BOKEMO_RETROSPECTIVE_COMPARISON: '1' },
  });
  const battleOnly = parse(result.stdout, 'BATTLE_ONLY_BASELINE');
  const online = parse(result.stdout, 'BATTLE_MIGRATION_BASELINE');
  const afk = parse(result.stdout, 'BATTLE_MIGRATION_AFK_BASELINE');
  const api = parse(result.stdout, 'BATTLE_MIGRATION_API_BASELINE');
  const record = {
    typicalMedianMs: battleOnly[0].medianBattleMs,
    typicalP95Ms: battleOnly[0].p95BattleMs,
    heavyMedianMs: battleOnly[1].medianBattleMs,
    heavyP95Ms: battleOnly[1].p95BattleMs,
    onlineMedianMs: online.medianBattleMs,
    onlineP95Ms: online.p95BattleMs,
    afkTotalCpuMs: afk.totalWorkerCpuMs,
    afkProjectedParallelMs: afk.projectedParallelWorkerMs,
    apiCount100Ms: api.find(entry => entry.count === 100).durationMs,
  };
  records[label].push(record);
  console.info(`GATE0R_AB_RUN ${index + 1}/${sequence.length} ${label}`, JSON.stringify(record));
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

const metricNames = Object.keys(records.A[0]);
const summary = {};
for (const metric of metricNames) {
  const a = records.A.map(record => record[metric]);
  const b = records.B.map(record => record[metric]);
  const aMedian = median(a);
  const bMedian = median(b);
  summary[metric] = {
    A: { median: aMedian, range: [Math.min(...a), Math.max(...a)] },
    B: { median: bMedian, range: [Math.min(...b), Math.max(...b)] },
    relativePercent: (bMedian - aMedian) * 100 / aMedian,
  };
}
const report = {
  methodology: {
    beforeRevision,
    afterRevision: 'active workspace snapshot based on HEAD',
    node: process.version,
    dependencyDirectory: resolve(root, 'node_modules'),
    freshChildProcesses: true,
    runsPerRevision: 5,
    order: sequence,
    temporaryRoot,
  },
  records,
  summary,
};
copyFileSync(resolve(root, 'package-lock.json'), resolve(temporaryRoot, 'package-lock.reference.json'));
console.info('GATE0R_AB_SUMMARY', JSON.stringify(report));
