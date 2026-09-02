import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getDiarySettingsWithDefaults } from '../src/game/diarySettings.ts';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
const diarySettingsSource = readFileSync(new URL('../src/game/diarySettings.ts', import.meta.url), 'utf8');
const homeSource = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const diaryTabSource = readFileSync(new URL('../src/components/home/tabs/DiaryTab.tsx', import.meta.url), 'utf8');
const localeSources = ['ja', 'en', 'zh-CN', 'zh-TW'].map((locale) =>
  readFileSync(new URL(`../src/i18n/${locale}.ts`, import.meta.url), 'utf8')
);

const popupSettingKeys = [
  'notifyCyclePopup',
  'notifyItemDropPopup',
  'notifyAutoEquipmentPopup',
  'notifySideQuestPopup',
] as const;

test('Diary popup settings default to enabled and migrate older saves', () => {
  const defaults = getDiarySettingsWithDefaults(undefined);
  for (const key of popupSettingKeys) {
    assert.equal(defaults[key], true);
    assert.equal(getDiarySettingsWithDefaults({ [key]: false })[key], false);
    assert.match(diarySettingsSource, new RegExp(`${key}:`));
  }
  assert.match(hookSource, /from '\.\.\/game\/diarySettings'/);
  assert.doesNotMatch(hookSource, /const DEFAULT_DIARY_SETTINGS|function getDiarySettingsWithDefaults/);
});

test('Diary UI renders all four persisted popup controls with localized labels', () => {
  assert.match(diaryTabSource, /diary\.settings\.popupNotifications/);
  for (const key of popupSettingKeys) assert.match(diaryTabSource, new RegExp(`'${key}'`));

  const labelKeys = [
    'diary.settings.cyclePopupNotification',
    'diary.settings.itemDropPopupNotification',
    'diary.settings.autoEquipmentPopupNotification',
    'diary.settings.sideQuestPopupNotification',
  ];
  for (const source of localeSources) {
    for (const key of labelKeys) assert.match(source, new RegExp(`'${key}'`));
  }
});

test('runtime checks every popup category independently', () => {
  assert.match(homeSource, /diarySettings\.notifyCyclePopup/);
  assert.match(homeSource, /diarySettings\.notifyItemDropPopup/);
  assert.match(homeSource, /diarySettings\.notifyAutoEquipmentPopup/);
  assert.match(homeSource, /diarySettings\.notifySideQuestPopup/);
});
