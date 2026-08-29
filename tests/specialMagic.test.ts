import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const battleSource = readFileSync(new URL('../native/battle_protocol.cpp', import.meta.url), 'utf8');
const magicSource = readFileSync(new URL('../src/game/magic.ts', import.meta.url), 'utf8');
const homeSharedSource = readFileSync(new URL('../src/components/home/homeShared.tsx', import.meta.url), 'utf8');
const partyTabSource = readFileSync(new URL('../src/components/home/tabs/PartyTab.tsx', import.meta.url), 'utf8');
const localeSources = ['ja', 'en', 'zh-CN', 'zh-TW'].map(locale => (
  readFileSync(new URL(`../src/i18n/${locale}.ts`, import.meta.url), 'utf8')
));

test('special magic ability selection follows Gravity Well, Armor Break, Mana Break priority', () => {
  assert.match(magicSource, /gravity_well: 20,[\s\S]*?armor_break: 12,[\s\S]*?mana_break: 10/);
  assert.match(magicSource, /isSpecialMagicCastable\('gravity_well', magicalNoA\)[\s\S]*?return 'gravity_well'[\s\S]*?isSpecialMagicCastable\('armor_break', magicalNoA\)[\s\S]*?return 'armor_break'[\s\S]*?isSpecialMagicCastable\('mana_break', magicalNoA\)[\s\S]*?return 'mana_break'/);
});

test('defense break spells use terrain-adjusted thresholds and persistent battle amplifiers', () => {
  assert.match(battleSource, /GravityWell\) > 0 && attempts >= 20[\s\S]*?ArmorBreak\) > 0 && attempts >= 12[\s\S]*?ManaBreak\) > 0 && attempts >= 10/);
  assert.match(battleSource, /physical_defense_debuff \*= 4\.0 \/ 3\.0/);
  assert.match(battleSource, /magical_defense_debuff \*= 4\.0 \/ 3\.0/);
  assert.match(battleSource, /const double debuff = magical \? target\.temporary\.magical_defense_debuff : target\.temporary\.physical_defense_debuff/);
  assert.match(battleSource, /elemental_attribute, swarm, debuff/);
});

test('status spell selection checks ideal magical NoA independently of runtime terrain modifiers', () => {
  assert.match(partyTabSource, /resolveSpecialMagicFromAbilities\(stats\.abilities, stats\.magicalNoA\)/);
  assert.match(homeSharedSource, /resolveSpecialMagicFromAbilities\(enemy\.abilities, enemy\.magicalNoA\)/);
});

test('defense break spells use localized special combat-log formats without hit counts', () => {
  assert.match(homeSharedSource, /entry\.specialAttack === 'armor_break'[\s\S]*?battleLog\.hits\.armorBreak/);
  assert.match(homeSharedSource, /entry\.specialAttack === 'mana_break'[\s\S]*?battleLog\.hits\.manaBreak/);
  for (const localeSource of localeSources) {
    assert.match(localeSource, /'battleLog\.hits\.armorBreak':/);
    assert.match(localeSource, /'battleLog\.hits\.manaBreak':/);
  }
});
