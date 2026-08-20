const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const readJsonl = (file) => readFileSync(path.join(root, file), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const records = readJsonl('data/bokemo_lora_training.jsonl');

test('LoRA corpus has the exact aligned category and locale allocation', () => {
  assert.equal(records.length, 4096);
  const families = new Map();
  for (const record of records) {
    const family = families.get(record.group_id) || [];
    family.push(record);
    families.set(record.group_id, family);
  }
  assert.equal(families.size, 1024);
  for (const family of families.values()) {
    assert.deepEqual(family.map((entry) => entry.locale).sort(), ['en', 'ja', 'zh-CN', 'zh-TW']);
    assert.equal(new Set(family.map((entry) => entry.split)).size, 1);
  }
  const counts = Object.fromEntries(['authoritative', 'calculation', 'strategy', 'api_action', 'safety'].map((category) => [category, [...families.values()].filter((family) => family[0].category === category).length]));
  assert.deepEqual(counts, { authoritative: 360, calculation: 160, strategy: 280, api_action: 160, safety: 64 });
});

test('MLX exports contain only messages and use group-isolated exact splits', () => {
  const expected = { train: 3280, valid: 408, test: 408 };
  for (const [split, count] of Object.entries(expected)) {
    const exported = readJsonl(`data/lora/mlx/${split}.jsonl`);
    assert.equal(exported.length, count);
    assert.ok(exported.every((entry) => Object.keys(entry).length === 1 && Array.isArray(entry.messages)));
  }
});

test('action records end with parseable gold JSON and forbidden cases abstain', () => {
  for (const record of records.filter((entry) => entry.task_type === 'action')) {
    const line = record.messages.at(-1).content.split('\n').at(-1);
    assert.match(line, /^ACTION_JSON: /);
    const action = JSON.parse(line.slice('ACTION_JSON: '.length));
    assert.deepEqual(action, record.expected_action);
    if (record.category === 'safety') assert.equal(action, null);
    else assert.ok(['/experimental/v1/build-options', '/experimental/v1/command', '/experimental/v1/sortie'].includes(action.path));
  }
});

test('all 17 seed records have explicit v2 migrations', () => {
  const legacy = new Set(readJsonl('data/lora/seed_v1.jsonl').map((entry) => entry.id));
  const migrated = new Set(records.flatMap((entry) => entry.legacy_ids || []));
  assert.deepEqual(migrated, legacy);
});

test('the checked-in corpus is a deterministic generator result', async () => {
  const { generateCorpus } = await import('../scripts/lora/lib.mjs');
  const generated = generateCorpus().records;
  assert.equal(JSON.stringify(generated), JSON.stringify(records));
});

test('the sample-save fixture is strictly whitelisted and contains no hidden game state', () => {
  const fixture = JSON.parse(readFileSync(path.join(root, 'data/lora/fixtures/sample_observation.json'), 'utf8'));
  assert.deepEqual(Object.keys(fixture).sort(), ['environment', 'parties', 'schema_version', 'source', 'source_version']);
  for (const party of fixture.parties) {
    assert.deepEqual(Object.keys(party).sort(), ['characters', 'id', 'level', 'selectedDungeonId']);
    for (const character of party.characters) {
      assert.deepEqual(Object.keys(character).sort(), ['id', 'mainClassId', 'raceId', 'subClassId']);
    }
  }
  const serialized = JSON.stringify(fixture);
  for (const forbidden of ['inventory', 'bags', 'diaryLogs', 'lastExpeditionLog', 'global']) assert.equal(serialized.includes(forbidden), false);
});

test('the sanitized fixture is a deterministic projection of the checked-in sample save', async () => {
  const { decodePersistedState } = await import('../src/game/storageCompression.ts');
  const envelope = JSON.parse(readFileSync(path.join(root, 'sample_savedata/Kemo-Expedition_Backup_v0.9.2_dev_20260812.kemoz'), 'utf8'));
  const state = JSON.parse(decodePersistedState(envelope.saveDataCompressed));
  const expectedParties = state.parties.map((party) => ({
    id: party.id,
    level: party.level,
    selectedDungeonId: party.selectedDungeonId,
    characters: party.characters.map((character) => ({ id: character.id, raceId: character.raceId, mainClassId: character.mainClassId, subClassId: character.subClassId })),
  }));
  const fixture = JSON.parse(readFileSync(path.join(root, 'data/lora/fixtures/sample_observation.json'), 'utf8'));
  assert.deepEqual(fixture.parties, expectedParties);
});
