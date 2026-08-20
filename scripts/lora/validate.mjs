import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, buildManifest, generateCorpus, validateCorpus } from './lib.mjs';

const canonical = readFileSync(join(ROOT, 'data/bokemo_lora_training.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const generated = generateCorpus();
const errors = validateCorpus(canonical, generated.entities, generated.legacySeeds);
const expected = generated.records.map((entry) => JSON.stringify(entry)).join('\n');
const actual = canonical.map((entry) => JSON.stringify(entry)).join('\n');
if (actual !== expected) errors.push('canonical corpus is stale; run npm run lora:generate');
const manifest = JSON.parse(readFileSync(join(ROOT, 'data/lora/manifest.json'), 'utf8'));
if (JSON.stringify(manifest) !== JSON.stringify(buildManifest(canonical))) errors.push('manifest is stale; run npm run lora:generate');
for (const split of ['train', 'valid', 'test']) {
  const exported = readFileSync(join(ROOT, `data/lora/mlx/${split}.jsonl`), 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
  const expectedMessages = canonical.filter((entry) => entry.split === split).map((entry) => ({ messages: entry.messages }));
  if (JSON.stringify(exported) !== JSON.stringify(expectedMessages)) errors.push(`${split}.jsonl is stale`);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Validated ${canonical.length} records, 1,024 aligned families, four locales, and three group-isolated splits.`);
