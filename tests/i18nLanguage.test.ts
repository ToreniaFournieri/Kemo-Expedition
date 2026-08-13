import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeSystemLanguage,
  resolveSystemLanguage,
  selectInitialLanguage,
} from '../src/i18n/languageDetection.ts';

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
