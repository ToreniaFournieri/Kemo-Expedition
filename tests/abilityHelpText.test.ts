import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ja from '../src/i18n/ja.ts';
import en from '../src/i18n/en.ts';
import zhCN from '../src/i18n/zh-CN.ts';
import zhTW from '../src/i18n/zh-TW.ts';
import ko from '../src/i18n/ko.ts';

const formatterSource = readFileSync(new URL('../src/data/bonusAbilityGlossary.ts', import.meta.url), 'utf8');

test('ability help substitutes only standalone N/M level tokens, so words like "Nullifies" survive', () => {
  assert.doesNotMatch(formatterSource, /\.replace\(\/N\/g/);
  assert.doesNotMatch(formatterSource, /\.replace\(\/M\/g/);
  assert.match(formatterSource, /\.replace\(\/\\bN\\b\/g, normalizedValue\)/);
});

test('ability descriptions contain no generic placeholder text', () => {
  const placeholders = [
    /^Ignores or cancels the matching/,
    /^Negates or prevents the related/,
    /^Applies the .* ability effect/,
    /^Nullifies the related incoming damage/,
    /^Reflects part of the related incoming/,
  ];
  for (const [language, dictionary] of Object.entries({ ja, en, 'zh-CN': zhCN, 'zh-TW': zhTW, ko })) {
    for (const [key, value] of Object.entries(dictionary as Record<string, string>)) {
      if (!/^ability\..+\.description$/.test(key)) continue;
      for (const placeholder of placeholders) assert.doesNotMatch(value, placeholder, `${language}:${key}`);
    }
  }
});

test('every language defines exactly the Japanese key set', () => {
  const expected = Object.keys(ja).sort();
  for (const [language, dictionary] of Object.entries({ en, 'zh-CN': zhCN, 'zh-TW': zhTW, ko })) {
    const keys = Object.keys(dictionary).sort();
    assert.deepEqual(expected.filter((key) => !keys.includes(key)), [], `${language} is missing keys`);
    assert.deepEqual(keys.filter((key) => !(key in ja)), [], `${language} has keys Japanese does not`);
  }
});
