import { getBattleKernelMemoryBytes } from '../../src/game/battleKernel.ts';
import { measureAfkEnvelopeBytes, runMemoryWorkload } from './memoryBenchmarkWorkloads.ts';

const CHILD_PREFIX = 'BOKEMO_MEMORY_RESULT ';
const name = process.argv.find((value) => value.startsWith('--workload='))?.slice(11);
const smoke = process.argv.includes('--profile=smoke');
const repetitions = Number(process.argv.find((value) => value.startsWith('--repetitions='))?.slice(14) ?? 3);
if (!name) throw new Error('Unknown memory workload');

async function runOnce() {
  global.gc?.();
  const initial = process.memoryUsage();
  let peak = { ...initial };
  const observe = () => {
    const current = process.memoryUsage();
    peak = {
      rss: Math.max(peak.rss, current.rss), heapTotal: Math.max(peak.heapTotal, current.heapTotal),
      heapUsed: Math.max(peak.heapUsed, current.heapUsed), external: Math.max(peak.external, current.external),
      arrayBuffers: Math.max(peak.arrayBuffers, current.arrayBuffers),
    };
  };
  const timer = setInterval(observe, smoke ? 10 : 1_000);
  const startedAt = Date.now();
  await runMemoryWorkload(name!, smoke, observe);
  clearInterval(timer);
  observe();
  const completion = process.memoryUsage();
  global.gc?.();
  await new Promise((resolveDelay) => setTimeout(resolveDelay, smoke ? 20 : 1_000));
  global.gc?.();
  return { workload: name, elapsedMs: Date.now() - startedAt, initial, peak, completion, settled: process.memoryUsage(), wasmMemory: getBattleKernelMemoryBytes() };
}

await runOnce();
const runs = [];
for (let index = 0; index < repetitions; index += 1) runs.push(await runOnce());
process.stdout.write(`${CHILD_PREFIX}${JSON.stringify({
  workload: name,
  runs,
  afkEnvelopeBytes: measureAfkEnvelopeBytes(),
})}\n`);
