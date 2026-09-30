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
import ko from '../src/i18n/ko.ts';

const glossarySource = readFileSync(new URL('../src/data/glossary.ts', import.meta.url), 'utf8');
const deitySource = readFileSync(new URL('../src/game/deity.ts', import.meta.url), 'utf8');

test('Korean dictionary covers every Japanese runtime key with matching placeholders', () => {
  const placeholders = (value: string) => [...new Set(
    [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]),
  )].sort();

  for (const [key, japanese] of Object.entries(ja)) {
    assert.ok(key in ko, `ko is missing ${key}`);
    assert.deepEqual(placeholders(ko[key]), placeholders(japanese), `ko placeholder mismatch in ${key}`);
  }
  assert.equal(ko['setting.language.ko'], '한국어');
});

test('Korean notification and Gods Battle labels retain their distinct game meanings', () => {
  assert.equal(ko['desktopNotification.trigger.draw'], '파티 무승부');
  assert.equal(ko['desktopNotification.trigger.retreat'], '파티 후퇴');
  assert.equal(ko['home.godsBattle.named'], '신마{god}전');
});

test('deity identity has a Korean-independent migration path and display-only localization', () => {
  assert.match(deitySource, /'Goddess of Restoration': \[[^\]]*'재생의 여신'/);
  assert.match(deitySource, /return deityKey \?\? name;/);
  assert.match(deitySource, /export function getDeityDisplayName/);
});

test('all indexed ability and terrain flavor families are complete and use supported placeholders in every language', () => {
  const languages = [
    ['ja', ja], ['en', en], ['zh-CN', zhCN], ['zh-TW', zhTW], ['ko', ko],
  ] as const;
  const placeholders = (value: string) => [...new Set(
    [...value.replace(/(?<!\{)\btarget\b(?!\})/g, '{target}').matchAll(/\{([^}]+)\}/g)].map((match) => match[1]),
  )].sort();

  const abilityFamilies: Record<string, number> = {
    'confusion-success': 10, 'confusion-failure': 10, 'confusion-no-target': 13,
    'soul-reap': 10, regeneration: 10, 'self-destruct': 10, decompose: 10, flee: 10,
    pursuit: 10, illusion: 10, 'illusion-breaker': 10, shock: 10, 'null-shock': 10,
    flying: 10, corrode: 10, 'null-corrode': 10, 'life-drain': 10, 'null-life-drain': 10,
    'death-touch': 10, 'null-death-touch': 10, burn: 10, 'null-burn': 10, bind: 10,
    'null-bind': 10, incapacitated: 10, resurrect: 10, reanimate: 10, requiem: 10,
    'null-requiem': 10, 'null-antagonism': 10, 'equation-breaker': 10, unforgettable: 10,
    inline: 42,
  };
  for (const [family, count] of Object.entries(abilityFamilies)) {
    for (let index = 1; index <= count; index += 1) {
      const key = `battleFlavor.${family}.${index}`;
      const reference = ja[key];
      assert.ok(reference, `ja is missing ${key}`);
      for (const [language, dictionary] of languages) {
        assert.ok(dictionary[key], `${language} is missing ${key}`);
        assert.ok(placeholders(dictionary[key]).every((placeholder) => ['actor', 'target', 'spell'].includes(placeholder)),
          `${language} has an unsupported placeholder in ${key}`);
      }
    }
  }

  const terrainFamilies = [
    'regeneration', 'decayBlocked', 'abundant', 'decay', 'shock', 'heatwave', 'vineSnare',
    'crystalZone', 'conduction', 'manaBurn', 'sacredJudgement', 'chainLightning', 'deletion',
  ] as const;
  for (const family of terrainFamilies) {
    for (let index = 1; index <= 10; index += 1) {
      const key = `battleFlavor.environment.${family}.${index}`;
      const reference = ja[key];
      assert.ok(reference, `ja is missing ${key}`);
      for (const [language, dictionary] of languages) {
        assert.ok(dictionary[key], `${language} is missing ${key}`);
        assert.deepEqual(placeholders(dictionary[key]), placeholders(reference), `${language} placeholder mismatch in ${key}`);
      }
    }
  }
});

test('normalizes supported system language tags case-insensitively', () => {
  assert.equal(normalizeSystemLanguage('ja-JP'), 'ja');
  assert.equal(normalizeSystemLanguage('EN-us'), 'en');
  assert.equal(normalizeSystemLanguage('zh-Hans-SG'), 'zh-CN');
  assert.equal(normalizeSystemLanguage('zh_Hant_HK'), 'zh-TW');
  assert.equal(normalizeSystemLanguage('zh'), 'zh-CN');
  assert.equal(normalizeSystemLanguage('ko-KR'), 'ko');
});

test('uses the first supported system language preference', () => {
  assert.equal(resolveSystemLanguage(['fr-FR', 'zh-TW', 'en-US']), 'zh-TW');
  assert.equal(resolveSystemLanguage(['de-DE', 'en-GB']), 'en');
  assert.equal(resolveSystemLanguage(['fr-FR', 'ko-KR', 'en-US']), 'ko');
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
  assert.equal(selectInitialLanguage(null, null, 'ko'), 'ko');
  assert.equal(selectInitialLanguage(null, null, null), 'ja');
});

test('AFK emulation efficiency is available in the runtime glossary in every language', () => {
  assert.match(glossarySource, /"key": "f\.afk-emulation-efficiency"/);

  const localizedGlossary = [
    { dictionary: ja, label: '放置効率' },
    { dictionary: en, label: 'AFK Efficiency' },
    { dictionary: zhCN, label: '挂机效率' },
    { dictionary: zhTW, label: '放置效率' },
    { dictionary: ko, label: '방치 효율' },
  ] as const;
  localizedGlossary.forEach(({ dictionary, label }) => {
    assert.equal(dictionary['data.glossary.100.label'], label);
    const description = dictionary['data.glossary.100.description'];
    assert.match(description, /0–45h \| x1/);
    assert.match(description, /540–810h \| x1\/9/);
  });
});

test('condition is available in the runtime glossary in every language', () => {
  assert.match(glossarySource, /"key": "f\.condition"/);

  const localizedGlossary = [
    { dictionary: ja, label: '調子' },
    { dictionary: en, label: 'Condition' },
    { dictionary: zhCN, label: '状态' },
    { dictionary: zhTW, label: '狀態' },
    { dictionary: ko, label: '컨디션' },
  ] as const;
  localizedGlossary.forEach(({ dictionary, label }) => {
    assert.equal(dictionary['data.glossary.condition.label'], label);
    assert.ok(dictionary['data.glossary.condition.description'].length > 0);
  });
});
