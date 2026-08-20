import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const deitySource = readFileSync(new URL('../src/game/deity.ts', import.meta.url), 'utf8');
const localeSources = ['ja', 'en', 'zh-CN', 'zh-TW'].map((locale) => (
  readFileSync(new URL(`../src/i18n/${locale}.ts`, import.meta.url), 'utf8')
));

test('Goddess of Fertility multiplies free action duration by 1.2', () => {
  assert.match(
    deitySource,
    /state === 'free_action' && deityKey === 'Goddess of Fertility'\) return 1\.2;/,
  );
  assert.doesNotMatch(
    deitySource,
    /state === 'free_action' && deityKey === 'Goddess of Fertility'\) return 2;/,
  );
});

test('Goddess of Fertility localized effects describe free action time x1.2', () => {
  const expectedDescriptions = [
    '自由行動時間1.2倍',
    'Free action time x1.2',
    '自由行动时间1.2倍',
    '自由行動時間1.2倍',
  ];

  localeSources.forEach((source, index) => {
    assert.match(source, new RegExp(expectedDescriptions[index].replace('.', '\\.')));
  });
});
