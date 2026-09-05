import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveEnemyPassiveAbilities } from '../src/game/enemyPassiveAbilities.ts';

import {
  addOrcaEnemyAbilities,
  DEFAULT_ORCA_ENEMY_LEVEL_OFFSET,
  isRuntimeGameMode,
  normalizeOrcaEnemyLevelOffset,
} from '../src/game/runtimeGameMode.ts';

test('runtime game mode and Orca offset normalization keep the specified bounds', () => {
  assert.equal(isRuntimeGameMode('mode.normal'), true);
  assert.equal(isRuntimeGameMode('mode.orca'), true);
  assert.equal(isRuntimeGameMode('m.orca'), false);
  assert.equal(normalizeOrcaEnemyLevelOffset(-1), 0);
  assert.equal(DEFAULT_ORCA_ENEMY_LEVEL_OFFSET, 5);
  assert.equal(normalizeOrcaEnemyLevelOffset(undefined), DEFAULT_ORCA_ENEMY_LEVEL_OFFSET);
  assert.equal(normalizeOrcaEnemyLevelOffset(7.9), 7);
  assert.equal(normalizeOrcaEnemyLevelOffset(99), 20);
});

test('raw Orca ability assignment retains First Strike 0 before passive upgrading', () => {
  const enemy = { abilities: [] } as Parameters<typeof addOrcaEnemyAbilities>[0];
  const modified = addOrcaEnemyAbilities(enemy);
  assert.equal(modified.abilities.find((ability) => ability.id === 'first_strike')?.level, 0);
  assert.equal(modified.abilities.find((ability) => ability.id === 'upgrade_all_abilities')?.level, 1);
  const resolved = resolveEnemyPassiveAbilities(modified.abilities);
  assert.equal(resolved.find((ability) => ability.id === 'first_strike')?.level, 1);
});

test('expedition scaling applies Orca abilities and the selected extra enemy level', () => {
  const scalingSource = readFileSync(new URL('../src/game/enemyScaling.ts', import.meta.url), 'utf8');
  const battleRoomSource = readFileSync(new URL('../src/game/expeditionBattleRoom.ts', import.meta.url), 'utf8');
  assert.match(scalingSource, /options\.gameMode === 'mode\.orca' \? \(options\.enemyLevelOffset \?\? 0\) : 0/);
  assert.match(scalingSource, /addOrcaEnemyAbilities\(enemy\)/);
  assert.match(battleRoomSource, /difficultyOffset \+ modeLevelOffset/);
  assert.match(battleRoomSource, /resolveEnemyPassiveAbilities\(withModeAbilities\.abilities\)/);
});
