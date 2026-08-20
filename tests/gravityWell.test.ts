import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const enemySource = readFileSync(new URL('../src/data/enemies.ts', import.meta.url), 'utf8');
const battleSource = readFileSync(new URL('../src/game/battle.ts', import.meta.url), 'utf8');
const normalActionSource = readFileSync(new URL('../src/game/battleNormalAction.ts', import.meta.url), 'utf8');
const kernelSource = readFileSync(new URL('../native/battle_kernel.cpp', import.meta.url), 'utf8');
const homeSharedSource = readFileSync(new URL('../src/components/home/homeShared.tsx', import.meta.url), 'utf8');
const localeSources = ['ja', 'en', 'zh-CN', 'zh-TW'].map(locale => (
  readFileSync(new URL(`../src/i18n/${locale}.ts`, import.meta.url), 'utf8')
));

test('Enemy 363 is assigned the percentage-damage magic style', () => {
  assert.match(enemySource, /363: 'percentage_damage'/);
});

test('Gravity Well checks terrain-adjusted attempts and resolves as one fixed-damage hit', () => {
  assert.match(battleSource, /enemy\.magicStyle === undefined && hasEnemyArcMagic\(enemy\)/);
  assert.match(battleSource, /resolveNormalActionSpecialMagic\([\s\S]*?attempts,[\s\S]*?partyHp/);
  assert.match(normalActionSource, /forceGravityWell \|\| has\('gravity_well'\)/);
  assert.match(kernelSource, /special_mask & 1[\s\S]*?magical_noa >= 20/);
  assert.match(kernelSource, /__builtin_floor\(normal_action_input\[31\] \* 2\.0 \/ 5\.0\)/);
  assert.match(battleSource, /applyPartyDamage\(specialResolution\.damage\)/);
  assert.match(battleSource, /applyEnemyDamage\(specialResolution\.damage\)/);
  assert.match(battleSource, /hits: .*gravity_well.*\? 1 : undefined,[\s\S]*?totalAttempts: .*gravity_well.*\? 1 : undefined/);
});

test('Gravity Well uses its localized special combat-log format', () => {
  assert.match(battleSource, /specialAttack: (?:specialMagic|activatedSpecialMagic)/);
  assert.match(homeSharedSource, /entry\.specialAttack === 'gravity_well'[\s\S]*?battleLog\.hits\.gravityWell/);
  for (const localeSource of localeSources) {
    assert.match(localeSource, /'battleLog\.hits\.gravityWell':/);
  }
});
