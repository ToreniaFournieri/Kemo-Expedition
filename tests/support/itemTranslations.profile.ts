import assert from 'node:assert/strict';
import test from 'node:test';
import { ENHANCEMENT_TITLES, ITEMS, SUPER_RARE_TITLES } from '../../src/data/items.ts';
import en from '../../src/i18n/en.ts';
import ja from '../../src/i18n/ja.ts';
import ko from '../../src/i18n/ko.ts';
import zhCN from '../../src/i18n/zh-CN.ts';
import zhTW from '../../src/i18n/zh-TW.ts';

// Item names and titles are looked up by id (`item.name.<id>`, ...), so a missing key only shows up as the raw key on screen.
const expected = [
  ...ITEMS.map((item) => `item.name.${item.id}`),
  ...ENHANCEMENT_TITLES.filter((entry) => entry.title).map((entry) => `item.enhancementTitle.${entry.value}`),
  ...SUPER_RARE_TITLES.filter((entry) => entry.title).map((entry) => `item.superRareTitle.${entry.value}`),
];

for (const [language, translations] of Object.entries({ ja, en, ko, 'zh-CN': zhCN, 'zh-TW': zhTW })) {
  test(`${language} has every item name and title`, () => {
    const missing = expected.filter((key) => !(translations as Record<string, string>)[key]);
    assert.deepEqual(missing, [], `${language} is missing item translations:\n${missing.join('\n')}`);
  });
}
