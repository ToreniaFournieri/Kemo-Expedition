import assert from 'node:assert/strict';
import test from 'node:test';
import { BONUS_ABILITY_GLOSSARY_ENTRIES, LOCALIZED_BONUS_ABILITY_GLOSSARY_ENTRIES, localizeLevelScale } from '../../src/data/bonusAbilityGlossary.ts';
import { ensureLanguageLoaded, setLanguage } from '../../src/i18n/index.ts';

const scales = BONUS_ABILITY_GLOSSARY_ENTRIES.flatMap((entry) => entry.levelScale);
const JAPANESE_TEXT = /[぀-ヿ㐀-鿿！-～]/u;

test('Japanese level scales keep the canonical Spec 1.1 text', () => {
  setLanguage('ja');
  for (const scale of scales) assert.equal(localizeLevelScale(scale), scale);
});

test('English glossary level scales contain no Japanese text', async () => {
  await ensureLanguageLoaded('en');
  setLanguage('en');
  try {
    for (const entry of LOCALIZED_BONUS_ABILITY_GLOSSARY_ENTRIES) {
      for (const localized of entry.levelScale) {
        assert.doesNotMatch(localized.replace(/・/gu, ''), JAPANESE_TEXT, `${entry.abilityId}: ${localized}`);
      }
    }
    assert.equal(localizeLevelScale('Lv1: 反射5%・被弾95%'), 'Lv1: reflect 5% / damage taken 95%');
    assert.equal(localizeLevelScale('Lv1: 命中+30・回避-20'), 'Lv1: Accuracy +30 / Evasion -20');
    assert.equal(localizeLevelScale('Lv2: +1.5%/回'), 'Lv2: +1.5%/hit');
    assert.equal(localizeLevelScale('Lv2: 遠距離＋近距離'), 'Lv2: Ranged + Melee');
  } finally {
    setLanguage('ja');
  }
});

test('ability help renders every level with its values in every translated language', async () => {
  const { formatBonusAbilityHelpDescription } = await import('../../src/data/bonusAbilityGlossary.ts');
  const { t } = await import('../../src/i18n/index.ts');
  const KANA = /[\u3040-\u309f\u30a0-\u30fa\u30fc-\u30ff]/u;
  try {
    for (const language of ['en', 'ko', 'zh-CN', 'zh-TW'] as const) {
      await ensureLanguageLoaded(language);
      setLanguage(language);
      const unresolvedTiming = t('home.abilityDescription.specifiedTiming');
      for (const entry of BONUS_ABILITY_GLOSSARY_ENTRIES) {
        for (let level = 1; level <= Math.max(1, entry.levelScale.length); level += 1) {
          const text = formatBonusAbilityHelpDescription(entry.abilityId, level);
          const where = `${language} ${entry.abilityId} Lv${level}: ${text}`;
          assert.doesNotMatch(text, /(?<![A-Za-z0-9])x?[NM](?![A-Za-z0-9])/u, where);
          assert.doesNotMatch(text, KANA, where);
          if (entry.phase === 'COMBAT' && entry.levelScale.length > 0) assert.ok(!text.includes(unresolvedTiming), where);
        }
      }
      for (const element of ['ice', 'fire', 'thunder', 'magical', 'melee']) {
        assert.ok(t(`ability.${element}_reflect.description`).includes(t('home.abilityDescription.reflectTemplate')), `${language} ${element}_reflect`);
      }
    }
    setLanguage('en');
    assert.equal(formatBonusAbilityHelpDescription('iaigiri', 2), 'Multiplies physical damage by x1.8 (attack count is halved).');
    assert.equal(formatBonusAbilityHelpDescription('execution', 1), "If the opponent's remaining HP is 40% or less, multiplies damage dealt by x1.5.");
  } finally {
    setLanguage('ja');
  }
});
