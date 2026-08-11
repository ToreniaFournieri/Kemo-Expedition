import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const enemySource = readFileSync(new URL('../src/data/enemies.ts', import.meta.url), 'utf8');
const battleSource = readFileSync(new URL('../src/game/battle.ts', import.meta.url), 'utf8');
const homeScreenSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const localeSources = ['ja', 'en', 'zh-CN', 'zh-TW'].map(locale => (
  readFileSync(new URL(`../src/i18n/${locale}.ts`, import.meta.url), 'utf8')
));

test('Enemy 363 is assigned the percentage-damage magic style', () => {
  assert.match(enemySource, /363: 'percentage_damage'/);
});

test('Gravity Well checks terrain-adjusted attempts and resolves as one fixed-damage hit', () => {
  assert.match(battleSource, /enemy\.magicStyle === undefined && hasEnemyArcMagic\(enemy\)/);
  assert.match(battleSource, /specialMagic === 'gravity_well' \? 20/);
  assert.match(battleSource, /applyPartyDamage\(Math\.floor\(partyHp \* 2 \/ 5\)\)/);
  assert.match(battleSource, /applyEnemyDamage\(Math\.floor\(enemyHp \* 2 \/ 5\)\)/);
  assert.match(battleSource, /hits: .*gravity_well.*\? 1 : undefined,[\s\S]*?totalAttempts: .*gravity_well.*\? 1 : undefined/);
});

test('Gravity Well uses its localized special combat-log format', () => {
  assert.match(battleSource, /specialAttack: (?:specialMagic|activatedSpecialMagic)/);
  assert.match(homeScreenSource, /entry\.specialAttack === 'gravity_well'[\s\S]*?battleLog\.hits\.gravityWell/);
  for (const localeSource of localeSources) {
    assert.match(localeSource, /'battleLog\.hits\.gravityWell':/);
  }
});
