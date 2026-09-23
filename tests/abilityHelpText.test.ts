import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ja from '../src/i18n/ja.ts';
import en from '../src/i18n/en.ts';
import zhCN from '../src/i18n/zh-CN.ts';
import zhTW from '../src/i18n/zh-TW.ts';
import ko from '../src/i18n/ko.ts';

const homeSharedSource = readFileSync(new URL('../src/components/home/homeShared.tsx', import.meta.url), 'utf8');

test('ability help substitutes only standalone N/M level tokens, so words like "Nullifies" survive', () => {
  assert.doesNotMatch(homeSharedSource, /\.replace\(\/N\/g/);
  assert.doesNotMatch(homeSharedSource, /\.replace\(\/M\/g/);
  assert.match(homeSharedSource, /\.replace\(\/\\bN\\b\/g, normalizedValue\)/);
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
