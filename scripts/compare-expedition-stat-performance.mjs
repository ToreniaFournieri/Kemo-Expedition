import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const [baselineArgument, candidateArgument] = process.argv.slice(2);
if (!baselineArgument || !candidateArgument) {
  throw new Error('Usage: node scripts/compare-expedition-stat-performance.mjs <baseline-bundle> <candidate-bundle>');
}

const bundles = {
  baseline: resolve(baselineArgument),
  candidate: resolve(candidateArgument),
};
const workloads = [
  'online',
  'simulation',
  'gods-battle',
  'afk-6x12',
  'api-1',
  'api-100',
  'observation-before-after',
];
const alternatingOrder = [
  'baseline', 'candidate', 'candidate', 'baseline', 'baseline',
  'candidate', 'candidate', 'baseline', 'baseline', 'candidate',
];

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor(ordered.length / 2)];
}

const results = {};
for (const workload of workloads) {
  const durations = { baseline: [], candidate: [] };
  for (const revision of alternatingOrder) {
    const child = spawnSync(process.execPath, [bundles[revision]], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, BOKEMO_STAT_WORKLOAD: workload },
    });
    if (child.status !== 0) {
      throw new Error(`${revision}/${workload} failed:\n${child.stderr || child.stdout}`);
    }
    const marker = child.stdout.split('\n').find((line) => line.startsWith('EXPEDITION_STAT_AUDIT '));
    if (!marker) throw new Error(`${revision}/${workload} produced no result`);
    const report = JSON.parse(marker.slice('EXPEDITION_STAT_AUDIT '.length));
    durations[revision].push(report.durationMs);
  }
  const baselineMedian = median(durations.baseline);
  const candidateMedian = median(durations.candidate);
  results[workload] = {
    baseline: {
      medianMs: baselineMedian,
      minimumMs: Math.min(...durations.baseline),
      maximumMs: Math.max(...durations.baseline),
      runsMs: durations.baseline,
    },
    candidate: {
      medianMs: candidateMedian,
      minimumMs: Math.min(...durations.candidate),
      maximumMs: Math.max(...durations.candidate),
      runsMs: durations.candidate,
    },
    relativeChangePercent: (candidateMedian - baselineMedian) * 100 / baselineMedian,
  };
}

console.log(JSON.stringify({ alternatingOrder, results }, null, 2));
