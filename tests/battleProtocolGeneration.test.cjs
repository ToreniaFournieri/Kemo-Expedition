const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');

test('battle protocol generated TypeScript and C++ definitions are current', () => {
  assert.doesNotThrow(() => execFileSync(
    process.execPath,
    [resolve(process.cwd(), 'scripts/generate-battle-protocol.mjs'), '--check'],
    { cwd: process.cwd(), stdio: 'pipe' },
  ));
});

test('append-only battle IDs cover every runtime ability and terrain', () => {
  const definition = readFileSync(resolve(process.cwd(), 'native/battle_protocol.def'), 'utf8');
  const abilities = new Set([...definition.matchAll(/^ABILITY\(\d+,\s*([^)]+)\)$/gmu)].map((match) => match[1]));
  const terrains = new Set([...definition.matchAll(/^TERRAIN\(\d+,\s*([^)]+)\)$/gmu)].map((match) => match[1]));

  const abilitySource = readFileSync(resolve(process.cwd(), 'src/data/abilityNames.ts'), 'utf8');
  const abilityObject = /ABILITY_BASE_NAME_KEYS[^=]*= \{([\s\S]*?)\n\};/u.exec(abilitySource)?.[1] ?? '';
  const runtimeAbilities = new Set([...abilityObject.matchAll(/^\s{2}([a-z0-9_]+):/gmu)].map((match) => match[1]));

  const glossarySource = readFileSync(resolve(process.cwd(), 'src/data/glossary.ts'), 'utf8');
  const runtimeTerrains = new Set([...glossarySource.matchAll(/"key": "(terrain\.[^"]+)"/gu)].map((match) => match[1]));

  assert.deepEqual([...abilities].sort(), [...runtimeAbilities].sort());
  assert.deepEqual([...terrains].sort(), [...runtimeTerrains].sort());
});

test('runtime battle protocol uses binary buffers rather than JSON serialization', () => {
  const sources = [
    readFileSync(resolve(process.cwd(), 'src/game/battleProtocol.ts'), 'utf8'),
    readFileSync(resolve(process.cwd(), 'native/battle_protocol.cpp'), 'utf8'),
  ].join('\n');
  assert.doesNotMatch(sources, /JSON\.(?:parse|stringify)/u);
  assert.match(sources, /DataView/);
  assert.match(sources, /input_arena/);
  assert.match(sources, /output_arena/);
});
