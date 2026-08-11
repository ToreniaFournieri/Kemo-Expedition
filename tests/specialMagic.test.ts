import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const battleSource = readFileSync(new URL('../src/game/battle.ts', import.meta.url), 'utf8');
const magicSource = readFileSync(new URL('../src/game/magic.ts', import.meta.url), 'utf8');
const homeScreenSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const localeSources = ['ja', 'en', 'zh-CN', 'zh-TW'].map(locale => (
  readFileSync(new URL(`../src/i18n/${locale}.ts`, import.meta.url), 'utf8')
));

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

test('defense break spells use localized special combat-log formats without hit counts', () => {
  assert.match(homeScreenSource, /entry\.specialAttack === 'armor_break'[\s\S]*?battleLog\.hits\.armorBreak/);
  assert.match(homeScreenSource, /entry\.specialAttack === 'mana_break'[\s\S]*?battleLog\.hits\.manaBreak/);
  for (const localeSource of localeSources) {
    assert.match(localeSource, /'battleLog\.hits\.armorBreak':/);
    assert.match(localeSource, /'battleLog\.hits\.manaBreak':/);
  }
});
