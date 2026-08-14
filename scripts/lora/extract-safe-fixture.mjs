import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import { ROOT } from './lib.mjs';

const sourcePath = join(ROOT, 'sample_savedata/Kemo-Expedition_Backup_v0.9.2_dev_20260812.kemoz');
const envelope = JSON.parse(readFileSync(sourcePath, 'utf8'));
const state = JSON.parse(decodePersistedState(envelope.saveDataCompressed));
const fixture = {
  schema_version: 1,
  source: 'sample_savedata/Kemo-Expedition_Backup_v0.9.2_dev_20260812.kemoz',
  source_version: envelope.meta?.version ?? null,
  environment: envelope.meta?.env ?? null,
  parties: (state.parties ?? []).map((party) => ({
    id: party.id,
    level: party.level,
    selectedDungeonId: party.selectedDungeonId,
    characters: (party.characters ?? []).map((character) => ({
      id: character.id,
      raceId: character.raceId,
      mainClassId: character.mainClassId,
      subClassId: character.subClassId,
    })),
  })),
};
const outputPath = join(ROOT, 'data/lora/fixtures/sample_observation.json');
mkdirSync(join(ROOT, 'data/lora/fixtures'), { recursive: true });
writeFileSync(outputPath, JSON.stringify(fixture, null, 2) + '\n');
console.log(`Wrote ${fixture.parties.length} sanitized parties without inventory, logs, bags, or save internals.`);
