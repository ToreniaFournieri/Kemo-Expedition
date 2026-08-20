import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
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
  for (const key of popupSettingKeys) {
    assert.match(hookSource, new RegExp(`${key}: true`));
    assert.match(hookSource, new RegExp(`${key}: typeof raw\\?\\.${key} === 'boolean' \\? raw\\.${key} : true`));
  }
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
