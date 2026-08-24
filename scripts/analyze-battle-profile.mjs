import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const categories = [
  'party/stat computation',
  'protocol input projection',
  'input validation and layout',
  'arena field writing',
  'native Wasm execution',
  'borrowed output construction and validation',
  'indexed semantic preprocessing and validation',
  'localization and BattleLogEntry construction',
  'final threat-bag copying',
  'expedition/AFK/API orchestration outside battle',
  'runtime/GC/unattributed',
];

function categoryOf(frame) {
  const name = frame.functionName ?? '';
  const file = basename((frame.url ?? '').replace(/^file:\/\//, ''));
  const line = (frame.lineNumber ?? -1) + 1;
  if (/computePartyStats|computeCharacterStats|computePartyStatus/.test(name)) return categories[0];
  if (/projectBattleProtocolInput|projectBattleCombatants/.test(name)) return categories[1];
  if (/validateBattleProtocolInput|validateCombatant|validateBag|calculateBattleProtocolInputLayout/.test(name)) return categories[2];
  if (/writeValidatedBattleProtocolInput|writeBattleProtocolInput|encodeBag/.test(name)) return categories[3];
  if ((frame.url ?? '').startsWith('wasm:') || /battle_protocol_execute|wasm-function/.test(name)) return categories[4];
  if (/BorrowedBattleProtocolOutputView/.test(name) || (file === 'battleProtocol.ts' && line >= 446 && line <= 501)) return categories[5];
  if (/requireFlavorPairs|BattleProtocolEventCursor|eventOffset|eventOpcode|eventPhase|eventActor|eventTarget|eventAbility|eventAttack|eventFlags|eventTiming|eventHits|eventAttempts|eventAux|eventValue/.test(name)
      || (file === 'battleProtocol.ts' && line >= 502 && line <= 568)) return categories[6];
  if (file === 'battleCandidate.ts' && line >= 1330) return categories[8];
  if (/convertIndexedBattleSemanticEvents|replaceFlavor|abilityLabel|spellName|translate|\bt\b|getBattleFlavor|getAbilityName|Intl/.test(name)
      || file === 'i18n.ts' || file === 'i18n/index.ts') return categories[7];
  if (/simulateAfk|simulateApi|resolveExpedition|runExpedition|process.*Cycle|useGameState|afkScheduler|expedition/.test(name)
      || /useGameState|afkScheduler|expedition/i.test(file)) return categories[9];
  return categories[10];
}

function emptyTotals() {
  return Object.fromEntries(categories.map(category => [category, 0]));
}

function nearestCategory(framesFromLeaf) {
  for (const frame of framesFromLeaf) {
    const category = categoryOf(frame);
    if (category !== categories[10]) return category;
  }
  return categories[10];
}

function analyzeCpu(path) {
  const profile = JSON.parse(readFileSync(path, 'utf8'));
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const parents = new Map();
  for (const node of profile.nodes) for (const child of node.children ?? []) parents.set(child, node.id);
  const exclusive = emptyTotals();
  const inclusive = emptyTotals();
  let total = 0;
  for (let index = 0; index < (profile.samples?.length ?? 0); index += 1) {
    const node = nodes.get(profile.samples[index]);
    if (!node) continue;
    const micros = profile.timeDeltas?.[index] ?? 1;
    total += micros;
    const frames = [];
    const present = new Set();
    let cursor = node.id;
    while (cursor !== undefined) {
      const ancestor = nodes.get(cursor);
      if (!ancestor) break;
      frames.push(ancestor.callFrame);
      present.add(categoryOf(ancestor.callFrame));
      cursor = parents.get(cursor);
    }
    exclusive[nearestCategory(frames)] += micros;
    for (const category of present) inclusive[category] += micros;
  }
  const present = totals => Object.fromEntries(categories.map(category => [category, {
    ms: totals[category] / 1_000,
    percent: total === 0 ? 0 : totals[category] * 100 / total,
  }]));
  return { sampledMs: total / 1_000, exclusive: present(exclusive), inclusive: present(inclusive) };
}

function analyzeHeap(path) {
  const profile = JSON.parse(readFileSync(path, 'utf8'));
  const exclusive = emptyTotals();
  const inclusive = emptyTotals();
  const sites = [];
  let total = 0;
  const visit = (node, stack) => {
    const nextStack = [...stack, node.callFrame];
    const bytes = node.selfSize ?? 0;
    if (bytes > 0) {
      total += bytes;
      exclusive[nearestCategory([...nextStack].reverse())] += bytes;
      for (const category of new Set(nextStack.map(categoryOf))) inclusive[category] += bytes;
      sites.push({ bytes, stack: nextStack.slice(-8).map(frame => `${frame.functionName || '<anonymous>'} (${basename(frame.url || 'native')}:${(frame.lineNumber ?? -1) + 1})`).reverse() });
    }
    for (const child of node.children ?? []) visit(child, nextStack);
  };
  visit(profile.head, []);
  const present = totals => Object.fromEntries(categories.map(category => [category, {
    bytes: totals[category],
    percent: total === 0 ? 0 : totals[category] * 100 / total,
  }]));
  return { sampledBytes: total, exclusive: present(exclusive), inclusive: present(inclusive), largestStacks: sites.sort((a, b) => b.bytes - a.bytes).slice(0, 12) };
}

const cpuPath = process.argv.find(path => path.endsWith('.cpuprofile'));
const heapPath = process.argv.find(path => path.endsWith('.heapprofile'));
if (!cpuPath || !heapPath) throw new Error('Usage: node scripts/analyze-battle-profile.mjs <file.cpuprofile> <file.heapprofile>');
console.log(JSON.stringify({ cpu: analyzeCpu(cpuPath), allocations: analyzeHeap(heapPath) }, null, 2));
