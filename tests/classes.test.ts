import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/data/classes.ts', import.meta.url), 'utf8');
const partyTabSource = readFileSync(new URL('../src/components/home/tabs/PartyTab.tsx', import.meta.url), 'utf8');

function classBlock(classId: string): string {
  const start = source.indexOf(`    id: '${classId}',`);
  assert.notEqual(start, -1, `missing class ${classId}`);
  const next = source.indexOf("\n  {\n    id:", start + 1);
  return source.slice(start, next === -1 ? source.indexOf('\n];', start) : next);
}

test('class master bonuses match the specification', () => {
  const expectedMultipliers = new Map([
    ['duelist', 'sword_multiplier'],
    ['sword-saint', 'katana_multiplier'],
    ['ranger', 'arrow_multiplier'],
    ['striker', 'bolt_multiplier'],
    ['ninja', 'archery_multiplier'],
    ['wizard', 'wand_multiplier'],
    ['sage', 'grimoire_multiplier'],
    ['alchemist', 'catalyst_multiplier'],
    ['guardian', 'armor_multiplier'],
    ['pilgrim', 'robe_multiplier'],
    ['lord', 'shield_multiplier'],
  ]);

  for (const [classId, bonusType] of expectedMultipliers) {
    assert.match(
      classBlock(classId),
      new RegExp(`masterBonuses: \\[[\\s\\S]*\\{ type: '${bonusType}', value: 1\\.2 \\}`),
    );
  }

  assert.doesNotMatch(classBlock('samurai'), /masterBonuses: \[[\s\S]*_multiplier'/);
});

test('character editing emphasizes only master-exclusive class bonuses', () => {
  assert.match(
    partyTabSource,
    /isMasterBonus: selectedMainClassIsMaster && index >= selectedMainSubBonuses\.length/,
  );
  assert.match(partyTabSource, /entry\.isMasterBonus \? 'font-bold' : ''/);
  assert.match(partyTabSource, /entry\.isMasterBonus \? 'font-bold' : undefined/);
});
