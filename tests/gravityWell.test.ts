import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const enemySource = readFileSync(new URL('../src/data/enemies.ts', import.meta.url), 'utf8');
const battleSource = readFileSync(new URL('../native/battle_protocol.cpp', import.meta.url), 'utf8');
const candidateSource = readFileSync(new URL('../src/game/battleCandidate.ts', import.meta.url), 'utf8');
const homeSharedSource = readFileSync(new URL('../src/components/home/homeShared.tsx', import.meta.url), 'utf8');
const localeSources = ['ja', 'en', 'zh-CN', 'zh-TW'].map(locale => (
  readFileSync(new URL(`../src/i18n/${locale}.ts`, import.meta.url), 'utf8')
));

test('Enemy 363 is assigned the percentage-damage magic style', () => {
  assert.match(enemySource, /363: 'percentage_damage'/);
});

test('Gravity Well checks terrain-adjusted attempts and resolves as one fixed-damage hit', () => {
  assert.match(battleSource, /AbilityId::GravityWell\) > 0 && attempts >= 20/);
  assert.match(battleSource, /calculated = __builtin_floor\(hp \* 0\.4\)/);
  assert.match(battleSource, /attempts = special == protocol::AbilityId::GravityWell \? 1 : attempts/);
  assert.match(battleSource, /hits = special == protocol::AbilityId::GravityWell \? 1 : 0/);
});

test('Gravity Well uses its localized special combat-log format', () => {
  assert.match(candidateSource, /specialAttack,/);
  assert.match(homeSharedSource, /entry\.specialAttack === 'gravity_well'[\s\S]*?battleLog\.hits\.gravityWell/);
  for (const localeSource of localeSources) {
    assert.match(localeSource, /'battleLog\.hits\.gravityWell':/);
  }
});
