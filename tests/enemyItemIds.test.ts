import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const enemySource = readFileSync(new URL('../src/data/enemies.ts', import.meta.url), 'utf8');
const masterSource = readFileSync(new URL('../src/data/masterSpecData.ts', import.meta.url), 'utf8');
const divineSource = readFileSync(new URL('../src/data/dropTables.ts', import.meta.url), 'utf8');
const enemySpec = readFileSync(new URL('../Specification_4.2_EXPEDITION_&_ENEMY_MASTER_DATA.md', import.meta.url), 'utf8');
const itemSpec = readFileSync(new URL('../Specification_3.2_ITEM_MASTER_DATA.md', import.meta.url), 'utf8');

function parseIds(value: string): number[] {
  return value.trim() === '' ? [] : value.split(',').map((id) => Number(id.trim()));
}

function parseSpecificationEnemyItemIds(): Map<number, number[]> {
  const tableStart = enemySpec.indexOf('| `Enemy_ID` | `x.type`');
  assert.notEqual(tableStart, -1, 'enemy master table');
  const rows = new Map<number, number[]>();
  for (const line of enemySpec.slice(tableStart).split('\n').slice(2)) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (!/^\d+$/.test(cells[0] ?? '')) continue;
    rows.set(Number(cells[0]), parseIds(cells[4] ?? ''));
  }
  return rows;
}

function parseRuntimeEnemyItemIds(): Map<number, number[]> {
  const rows = new Map<number, number[]>();
  for (const match of divineSource.matchAll(/\{ enemyId: (\d+),[^\n]*?itemIds: \[([^\]]*)\]/g)) {
    rows.set(Number(match[1]), parseIds(match[2]));
  }

  for (let enemyId = 13; enemyId <= 18; enemyId += 1) rows.set(enemyId, []);

  let enemyId = 100;
  const enemyRows = masterSource.matchAll(
    /^\s*\[\d+,'[^']+',\d+,'(?:normal|elite|boss)','[^']+','[^']+',\[([^\]]*)\],'[^']+'(?:,'[^']+')?\],?$/gm,
  );
  for (const match of enemyRows) {
    rows.set(enemyId, parseIds(match[1]));
    enemyId += 1;
  }
  assert.equal(enemyId, 388, 'all 288 expedition enemy rows');
  return rows;
}

test('every runtime enemy uses the exact ordered x.item_ids list from the specification', () => {
  const specificationRows = parseSpecificationEnemyItemIds();
  const runtimeRows = parseRuntimeEnemyItemIds();

  assert.equal(specificationRows.size, 306);
  assert.equal(runtimeRows.size, 306);
  assert.deepEqual(runtimeRows, specificationRows);
});

test('every enemy x.item_id exists and duplicate reward rolls remain intact', () => {
  const itemIds = new Set([...itemSpec.matchAll(/^\|\s*(\d+)\s*\|/gm)].map((match) => Number(match[1])));
  const runtimeRows = parseRuntimeEnemyItemIds();

  for (const [enemyId, enemyItemIds] of runtimeRows) {
    for (const itemId of enemyItemIds) {
      assert.ok(itemIds.has(itemId), `Enemy ${enemyId} references missing item ${itemId}`);
    }
  }

  assert.deepEqual(runtimeRows.get(297), [6318, 6315, 6315, 6110, 6111, 6112]);
});

test('runtime drop resolution has no symbolic or category-derived fallback path', () => {
  assert.doesNotMatch(enemySource, /masterDropTokens|dropItemId|parseMasterDropToken|getDropItemIdFromMaster/);
  assert.match(enemySource, /return enemy\.itemIds\s*\.map\(\(itemId\) => getItemById\(itemId\)\)/);
});
