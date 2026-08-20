import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, buildManifest, generateCorpus, validateCorpus } from './lib.mjs';

const { records, entities, legacySeeds } = generateCorpus();
const errors = validateCorpus(records, entities, legacySeeds);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const canonicalPath = join(ROOT, 'data/bokemo_lora_training.jsonl');
const mlxDir = join(ROOT, 'data/lora/mlx');
mkdirSync(mlxDir, { recursive: true });
writeFileSync(canonicalPath, records.map((entry) => JSON.stringify(entry)).join('\n') + '\n');
for (const split of ['train', 'valid', 'test']) {
  const exported = records.filter((entry) => entry.split === split).map((entry) => JSON.stringify({ messages: entry.messages }));
  writeFileSync(join(mlxDir, `${split}.jsonl`), exported.join('\n') + '\n');
}
writeFileSync(join(ROOT, 'data/lora/manifest.json'), JSON.stringify(buildManifest(records), null, 2) + '\n');
console.log(`Generated ${records.length} records across ${new Set(records.map((entry) => entry.group_id)).size} families.`);
