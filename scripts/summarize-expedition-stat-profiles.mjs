import { resolve } from 'node:path';
import { analyzeStatCpu, analyzeStatHeap } from './analyze-expedition-stat-profile.mjs';

const root = process.argv[2];
if (!root) throw new Error('Usage: node scripts/summarize-expedition-stat-profiles.mjs <profile-root>');
const workloads = ['online', 'simulation', 'gods-battle', 'afk-6x12', 'api-1', 'api-100', 'observation-before-after'];

function category(caller) {
  if (/getPartyAbilityLevel|getPartyCunningMultiplier|getPrayerDepositMultiplier/.test(caller)) return 'ability/reward helpers';
  if (/getUnlockActorName/.test(caller)) return 'unlock narration';
  if (/simulateApiSortieBatchForTesting/.test(caller)) return 'API Cycle start';
  if (/buildExperimentalObservation|<anonymous>/.test(caller)) return 'observation';
  if (/simulateExpeditionRuns/.test(caller)) return 'simulation baseline';
  if (/gameReducer/.test(caller)) return 'reducer direct';
  return caller;
}

function summarize(metric, valueKey, totalKey) {
  const totals = metric.map((entry) => entry[totalKey]);
  const categories = new Map();
  metric.forEach((entry) => {
    const perRun = new Map();
    entry.statByCaller.forEach((site) => {
      const key = category(site.caller);
      perRun.set(key, (perRun.get(key) ?? 0) + site[valueKey] * 100 / entry[totalKey]);
    });
    perRun.forEach((value, key) => {
      const values = categories.get(key) ?? [];
      values.push(value);
      categories.set(key, values);
    });
  });
  const statPercents = metric.map((entry) => entry.statByCaller.reduce((sum, site) => sum + site[valueKey], 0) * 100 / entry[totalKey]);
  const stats = (values) => ({
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    minimum: Math.min(...values),
    maximum: Math.max(...values),
  });
  return {
    total: stats(totals),
    statPercent: stats(statPercents),
    byCategoryPercent: Object.fromEntries([...categories.entries()].map(([key, values]) => [key, stats(values)])),
  };
}

const report = {};
for (const workload of workloads) {
  const cpu = [];
  const allocations = [];
  for (let run = 1; run <= 3; run += 1) {
    const directory = resolve(root, `run-${run}`);
    cpu.push(analyzeStatCpu(resolve(directory, `${workload}.cpuprofile`)));
    allocations.push(analyzeStatHeap(resolve(directory, `${workload}.heapprofile`)));
  }
  report[workload] = {
    cpu: summarize(cpu, 'ms', 'sampledMs'),
    allocations: summarize(allocations, 'bytes', 'sampledBytes'),
  };
}
console.log(JSON.stringify(report, null, 2));
