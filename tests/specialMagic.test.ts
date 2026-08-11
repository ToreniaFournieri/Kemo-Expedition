import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const battleSource = readFileSync(new URL('../src/game/battle.ts', import.meta.url), 'utf8');
const magicSource = readFileSync(new URL('../src/game/magic.ts', import.meta.url), 'utf8');

test('special magic ability selection follows Gravity Well, Armor Break, Mana Break priority', () => {
  assert.match(magicSource, /id === 'gravity_well'[\s\S]*?return 'gravity_well'[\s\S]*?id === 'armor_break'[\s\S]*?return 'armor_break'[\s\S]*?id === 'mana_break'[\s\S]*?return 'mana_break'/);
});

test('defense break spells use terrain-adjusted thresholds and persistent battle amplifiers', () => {
  assert.match(battleSource, /specialMagic === 'armor_break' \? 12/);
  assert.match(battleSource, /specialMagic === 'mana_break' \? 10/);
  assert.match(battleSource, /enemyPhysicalDefenseDebuffAmplifier \*= 4 \/ 3/);
  assert.match(battleSource, /enemyMagicalDefenseDebuffAmplifier \*= 4 \/ 3/);
  assert.match(battleSource, /partyPhysicalDefenseDebuffAmplifier \*= 4 \/ 3/);
  assert.match(battleSource, /partyMagicalDefenseDebuffAmplifier \*= 4 \/ 3/);
  assert.match(battleSource, /swarmAmplifier \* defenseDebuffAmplifier/);
});
