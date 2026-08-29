import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

function label(frame) {
  return `${frame.functionName || '<anonymous>'} (${basename((frame.url || 'native').replace(/^file:\/\//, ''))}:${(frame.lineNumber ?? -1) + 1})`;
}

function callerOf(stackFromLeaf) {
  const statIndex = stackFromLeaf.findIndex((frame) => frame.functionName === 'computePartyStats');
  if (statIndex < 0) return null;
  const caller = stackFromLeaf[statIndex + 1];
  return caller ? label(caller) : '<root>';
}

export function analyzeStatCpu(path) {
  const profile = JSON.parse(readFileSync(path, 'utf8'));
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const parents = new Map();
  for (const node of profile.nodes) for (const child of node.children ?? []) parents.set(child, node.id);
  let total = 0;
  const byCaller = new Map();
  for (let index = 0; index < (profile.samples?.length ?? 0); index += 1) {
    const micros = profile.timeDeltas?.[index] ?? 1;
    total += micros;
    const stack = [];
    let cursor = profile.samples[index];
    while (cursor !== undefined) {
      const node = nodes.get(cursor);
      if (!node) break;
      stack.push(node.callFrame);
      cursor = parents.get(cursor);
    }
    const caller = callerOf(stack);
    if (caller) byCaller.set(caller, (byCaller.get(caller) ?? 0) + micros);
  }
  return {
    sampledMs: total / 1_000,
    statByCaller: [...byCaller.entries()].map(([caller, micros]) => ({ caller, ms: micros / 1_000, percent: micros * 100 / total })).sort((a, b) => b.ms - a.ms),
  };
}

export function analyzeStatHeap(path) {
  const profile = JSON.parse(readFileSync(path, 'utf8'));
  let total = 0;
  const byCaller = new Map();
  const visit = (node, stack) => {
    const next = [node.callFrame, ...stack];
    const bytes = node.selfSize ?? 0;
    total += bytes;
    const caller = callerOf(next);
    if (bytes > 0 && caller) byCaller.set(caller, (byCaller.get(caller) ?? 0) + bytes);
    for (const child of node.children ?? []) visit(child, next);
  };
  visit(profile.head, []);
  return {
    sampledBytes: total,
    statByCaller: [...byCaller.entries()].map(([caller, bytes]) => ({ caller, bytes, percent: bytes * 100 / total })).sort((a, b) => b.bytes - a.bytes),
  };
}

const cpuPath = process.argv.find((path) => path.endsWith('.cpuprofile'));
const heapPath = process.argv.find((path) => path.endsWith('.heapprofile'));
if (cpuPath || heapPath) {
  if (!cpuPath || !heapPath) throw new Error('Usage: node scripts/analyze-expedition-stat-profile.mjs <cpu> <heap>');
  console.log(JSON.stringify({ cpu: analyzeStatCpu(cpuPath), allocations: analyzeStatHeap(heapPath) }, null, 2));
}
