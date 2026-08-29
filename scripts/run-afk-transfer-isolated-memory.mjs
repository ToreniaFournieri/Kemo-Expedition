import { spawnSync } from 'node:child_process';

function positive(name, fallback) {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

const samples = positive('samples', 5);
const warmups = positive('warmups', 1);
const candidates = ['build72', 'production'];
const values = Object.fromEntries(candidates.map((candidate) => [candidate, {}]));
const finalHashes = Object.fromEntries(candidates.map((candidate) => [candidate, new Set()]));

function nearestRank(entries, ratio) {
  const ordered = [...entries].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * ratio) - 1)] ?? 0;
}

function distribution(entries) {
  return {
    samples: entries.length,
    minimum: Math.min(...entries),
    p50: nearestRank(entries, 0.5),
    p95: nearestRank(entries, 0.95),
    maximum: Math.max(...entries),
  };
}

for (let sampleIndex = 0; sampleIndex < samples; sampleIndex += 1) {
  const order = sampleIndex % 2 === 0 ? candidates : [...candidates].reverse();
  for (const candidate of order) {
    const result = spawnSync(process.execPath, [
      'scripts/run-afk-transfer-renderer-profile.mjs',
      '--samples=1',
      `--warmups=${warmups}`,
      `--only=${candidate}`,
    ], { cwd: process.cwd(), encoding: 'utf8' });
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) throw new Error(`Isolated ${candidate} profile failed with status ${result.status}`);
    const report = JSON.parse(result.stdout);
    finalHashes[candidate].add(report.validation.deterministicAfkFinalStateSha256);
    const candidateReport = report.candidates[candidate];
    for (const [field, fieldDistribution] of Object.entries(candidateReport)) {
      (values[candidate][field] ??= []).push(fieldDistribution.p50);
    }
  }
}

const fields = [
  'peakApplicationWorkingSetBytes',
  'peakRendererWorkingSetBytes',
  'settledApplicationWorkingSetBytes',
  'settledRendererWorkingSetBytes',
  'peakRendererHeapBytes',
];
const memory = Object.fromEntries(fields.map((field) => [field, {
  build72: distribution(values.build72[field]),
  production: distribution(values.production[field]),
}]));

process.stdout.write(`${JSON.stringify({
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sampling: { samples, warmups, processIsolation: 'fresh-electron-process-per-candidate' },
  validation: {
    build72FinalStateSha256: [...finalHashes.build72][0] ?? null,
    productionFinalStateSha256: [...finalHashes.production][0] ?? null,
    finalStateIdentical: finalHashes.build72.size === 1
      && finalHashes.production.size === 1
      && [...finalHashes.build72][0] === [...finalHashes.production][0],
  },
  memory,
}, null, 2)}\n`);
