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

test('every special-bonus ability in the specification is the runtime ability of that item ID', () => {
  // The name table applies to every item with that name, so an item sharing a name with another special item needs an ID entry.
  const abilitiesOf = (block: string) => [...block.matchAll(/abilityId: '([a-z_]+)'/g)].map((match) => match[1]).sort();
  const tableOf = (declaration: string, keyPattern: RegExp) => {
    const start = source.indexOf(declaration);
    assert.notEqual(start, -1, declaration);
    const block = source.slice(start, source.indexOf('\n};', start));
    const entries = new Map<string, string[]>();
    for (const match of block.matchAll(keyPattern)) entries.set(match[1], abilitiesOf(match[2]));
    return entries;
  };
  const byName = tableOf('const ITEM_ADDITIONAL_BONUS_BY_NAME:', /^ {2}'([^']+)': (\[[\s\S]*?\]),$/gm);
  const byId = tableOf('const ITEM_ADDITIONAL_BONUS_BY_ID:', /^ {2}(\d+): (\[[\s\S]*?\]),$/gm);

  const regularSection = itemSpec.slice(0, itemSpec.indexOf('### 3.2.2 Mythic item from gods'));
  let checked = 0;
  for (const line of regularSection.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim());
    if (!/^\d{4}$/.test(cells[1] ?? '') || !cells[7]?.includes('`a.')) continue;
    const expected = [...cells[7].matchAll(/`a\.([a-z_-]+)`/g)].map((match) => match[1].replace(/-/g, '_')).sort();
    assert.deepEqual(byId.get(cells[1]) ?? byName.get(cells[6]), expected, `${cells[1]} ${cells[6]}`);
    checked += 1;
  }
  assert.ok(checked >= 40, `checked ${checked} rows`);
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
  const regularSection = itemSpec.slice(0, itemSpec.indexOf('### 3.2.2 Mythic item from gods'));
  const rarityNames: Record<string, string> = {
    C: 'common',
    U: 'uncommon',
    R: 'rare',
    E: 'epic',
  };
  for (const line of regularSection.split('\n')) {
    const match = line.match(
      /^\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([CURE])\s*\|\s*[^|]+\|\s*`i\.([^`]+)`[A-Z]+\s*\|\s*([^|]+?)\s*\|/,
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
  assert.match(source, /getMasterItemId\(tier, 'rare'/);
  assert.match(source, /getMasterItemId\(tier, 'epic'/);
});

test('Mythic specification IDs follow the runtime drop order', () => {
  const mythicSection = itemSpec.slice(itemSpec.indexOf('### 3.2.2 Mythic item from gods'));
  const ids = [...mythicSection.matchAll(/^\|\s*(85\d{2})\s*\|/gm)].map((match) => Number(match[1]));
  assert.deepEqual(ids, Array.from({ length: 24 }, (_, index) => 8501 + index));
  assert.match(source, /const id = 8500 \+ index \+ 1;/);
});

test('runtime item lookup uses the first-declaration-preserving index', () => {
  assert.match(source, /const ITEM_BY_ID = new Map<number, ItemDef>\(\);/);
  assert.match(source, /if \(!ITEM_BY_ID\.has\(item\.id\)\) ITEM_BY_ID\.set\(item\.id, item\);/);
  assert.match(source, /let activeItemLookup = indexedItemLookup;/);
  assert.match(source, /export const getItemById = \(id: number\): ItemDef \| undefined => activeItemLookup\(id\);/);
  assert.match(source, /finally \{\s*activeItemLookup = previous;\s*\}/);
});
