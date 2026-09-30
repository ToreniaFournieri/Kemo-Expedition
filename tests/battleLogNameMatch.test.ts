import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { isStandaloneBattleLogName } from '../src/game/battleLogNameMatch.ts';

test('accepts a Japanese character name used as the battle-log actor', () => {
  const action = 'レイ がアーマーブレイクを唱えた！';
  assert.equal(isStandaloneBattleLogName(action, action.indexOf('レイ'), 'レイ'), true);
});

test('compact battle-log chibi markers use the current party name with the retained appearance', () => {
  const source = readFileSync('src/components/home/homeShared.tsx', 'utf8');
  assert.match(source, /party\.characters\.find\(character => character\.id === actor\.id\)\?\.name \?\? actor\.name/);
});

test('rejects a short character name embedded in a spell name', () => {
  const action = 'レイ がアーマーブレイクを唱えた！';
  const embeddedIndex = action.indexOf('レイ', 1);
  assert.equal(isStandaloneBattleLogName(action, embeddedIndex, 'レイ'), false);
});

test('accepts a Japanese character name surrounded by grammatical particles', () => {
  const action = '敵がレイに攻撃！';
  assert.equal(isStandaloneBattleLogName(action, action.indexOf('レイ'), 'レイ'), true);
});

test('rejects an English character name embedded in another word', () => {
  const action = 'Enemy used XRayBurst!';
  assert.equal(isStandaloneBattleLogName(action, action.indexOf('Ray'), 'Ray'), false);
});

test('accepts names separated by spaces in English and Chinese logs', () => {
  assert.equal(isStandaloneBattleLogName('Ray cast Armor Break!', 0, 'Ray'), true);
  assert.equal(isStandaloneBattleLogName('雷 咏唱了破甲！', 0, '雷'), true);
});
