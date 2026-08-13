import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/data/items.ts', import.meta.url), 'utf8');
const masterSource = readFileSync(new URL('../src/data/masterSpecData.ts', import.meta.url), 'utf8');
const itemSpec = readFileSync(new URL('../Specification_3.2_ITEM_MASTER_DATA.md', import.meta.url), 'utf8');

test('the Ursan boss wand grants Command as its special bonus', () => {
  assert.match(
    source,
    /'軍配': \[\{ type: 'ability', value: 1, abilityId: 'command', abilityLevel: 1 \}\]/,
  );
});

test('special spell equipment grants the requested passive abilities', () => {
  assert.match(source, /'光の剣': \[\{ type: 'ability', value: 1, abilityId: 'armor_break', abilityLevel: 1 \}\]/);
  assert.match(source, /'冥核': \[\{ type: 'ability', value: 1, abilityId: 'gravity_well', abilityLevel: 1 \}\]/);
  assert.match(source, /'月兎の破魔杖': \[\{ type: 'ability', value: 1, abilityId: 'mana_break', abilityLevel: 1 \}\]/);
});

test('every item specification row has the exact explicit runtime ID', () => {
  const runtimeIds = new Map<string, number>();
  const idBlock = masterSource.slice(
    masterSource.indexOf('const MASTER_ITEM_ID_INDEX:'),
    masterSource.indexOf('} as const;', masterSource.indexOf('const MASTER_ITEM_ID_INDEX:')),
  );
  for (const match of idBlock.matchAll(/^\s*'([^']+)':\s*(\d+),$/gm)) {
    runtimeIds.set(match[1], Number(match[2]));
  }

  const specIds: number[] = [];
  const regularSection = itemSpec.slice(0, itemSpec.indexOf('### 3.2.2 Mythic rare item from gods'));
  const rarityNames: Record<string, string> = {
    C: 'common',
    U: 'uncommon',
    E: 'eliteRare',
    B: 'bossRare',
  };
  for (const line of regularSection.split('\n')) {
    const match = line.match(
      /^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([CUEB])\s*\|\s*[^|]+\|\s*`i\.([^`]+)`[A-Z]+\s*\|\s*([^|]+?)\s*\|/,
    );
    if (!match) continue;
    const [, id, tier, rarityCode, category, name] = match;
    const key = `${tier}|${rarityNames[rarityCode]}|${category}|${name.trim()}`;
    assert.equal(runtimeIds.get(key), Number(id), key);
    specIds.push(Number(id));
  }

  assert.equal(specIds.length, 407);
  assert.equal(runtimeIds.size, 407);
  assert.equal(new Set(specIds).size, 407);
  assert.match(source, /getMasterItemId\(tier, 'common'/);
  assert.match(source, /getMasterItemId\(tier, 'uncommon'/);
  assert.match(source, /getMasterItemId\(tier, 'eliteRare'/);
  assert.match(source, /getMasterItemId\(tier, 'bossRare'/);
});

test('Mythic specification IDs follow the runtime drop order', () => {
  const mythicSection = itemSpec.slice(itemSpec.indexOf('### 3.2.2 Mythic rare item from gods'));
  const ids = [...mythicSection.matchAll(/^\|\s*(85\d{2})\s*\|/gm)].map((match) => Number(match[1]));
  assert.deepEqual(ids, Array.from({ length: 24 }, (_, index) => 8501 + index));
  assert.match(source, /const id = 8500 \+ index \+ 1;/);
});
