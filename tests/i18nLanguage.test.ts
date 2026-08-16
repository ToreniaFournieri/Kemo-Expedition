import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  normalizeSystemLanguage,
  resolveSystemLanguage,
  selectInitialLanguage,
} from '../src/i18n/languageDetection.ts';
import ja from '../src/i18n/ja.ts';
import en from '../src/i18n/en.ts';
import zhCN from '../src/i18n/zh-CN.ts';
import zhTW from '../src/i18n/zh-TW.ts';

const glossarySource = readFileSync(new URL('../src/data/glossary.ts', import.meta.url), 'utf8');

test('normalizes supported system language tags case-insensitively', () => {
  assert.equal(normalizeSystemLanguage('ja-JP'), 'ja');
  assert.equal(normalizeSystemLanguage('EN-us'), 'en');
  assert.equal(normalizeSystemLanguage('zh-Hans-SG'), 'zh-CN');
  assert.equal(normalizeSystemLanguage('zh_Hant_HK'), 'zh-TW');
  assert.equal(normalizeSystemLanguage('zh'), 'zh-CN');
});

test('uses the first supported system language preference', () => {
  assert.equal(resolveSystemLanguage(['fr-FR', 'zh-TW', 'en-US']), 'zh-TW');
  assert.equal(resolveSystemLanguage(['de-DE', 'en-GB']), 'en');
});

test('returns null when system language information is missing or unsupported', () => {
  assert.equal(resolveSystemLanguage([]), null);
  assert.equal(resolveSystemLanguage(['fr-FR', 'de-DE']), null);
  assert.equal(normalizeSystemLanguage(undefined), null);
});

test('selects URL, saved, system, then Japanese in priority order', () => {
  assert.equal(selectInitialLanguage('en', 'zh-CN', 'zh-TW'), 'en');
  assert.equal(selectInitialLanguage(null, 'zh-CN', 'zh-TW'), 'zh-CN');
  assert.equal(selectInitialLanguage(null, null, 'zh-TW'), 'zh-TW');
  assert.equal(selectInitialLanguage(null, null, null), 'ja');
});

test('AFK emulation efficiency is available in the runtime glossary in every language', () => {
  assert.match(glossarySource, /"key": "f\.afk-emulation-efficiency"/);

  const localizedGlossary = [
    { dictionary: ja, label: '放置効率' },
    { dictionary: en, label: 'AFK Efficiency' },
    { dictionary: zhCN, label: '挂机效率' },
    { dictionary: zhTW, label: '放置效率' },
  ] as const;
  localizedGlossary.forEach(({ dictionary, label }) => {
    assert.equal(dictionary['data.glossary.100.label'], label);
    const description = dictionary['data.glossary.100.description'];
    assert.match(description, /0–9h \| x1/);
    assert.match(description, /108–162h \| x1\/9/);
  });
});
