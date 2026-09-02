import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  DEFAULT_DIARY_SETTINGS,
  getDiarySettingsWithDefaults,
} from '../../src/game/diarySettings.ts';
import {
  addItemToInventory,
  calculateSellPrice,
  ITEM_MAX_STACK,
} from '../../src/game/inventoryMutation.ts';
import { getVariantKey } from '../../src/types/index.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

test('Diary settings normalize legacy defeat and popup fields from one shared default', () => {
  assert.deepEqual(getDiarySettingsWithDefaults(undefined), DEFAULT_DIARY_SETTINGS);
  assert.deepEqual(
    getDiarySettingsWithDefaults({
      notifyDefeat: false,
      defeatNotificationMode: 'invalid',
      notifyCyclePopup: false,
      notifyItemDropPopup: 'invalid',
    } as never),
    {
      ...DEFAULT_DIARY_SETTINGS,
      notifyDefeat: false,
      defeatNotificationMode: 'none',
      notifyCyclePopup: false,
    },
  );
  assert.equal(
    getDiarySettingsWithDefaults({ defeatNotificationMode: 'defeatAndDraw' })
      .defeatNotificationMode,
    'defeatAndDraw',
  );
});

test('inventory addition preserves immutable and mutable identity modes', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const item = Object.values(state.global.inventory).find((variant) => variant.count > 0)?.item;
  assert.ok(item);
  const key = getVariantKey(item);
  const immutableInput = {
    [key]: { item, count: 1, status: 'owned' as const, isNew: false },
  };
  const immutableResult = addItemToInventory(immutableInput, item, 50);
  assert.notEqual(immutableResult.inventory, immutableInput);
  assert.equal(immutableInput[key].count, 1);
  assert.equal(immutableResult.inventory[key].count, 2);

  const mutableInput = {
    [key]: { item, count: 1, status: 'owned' as const, isNew: false },
  };
  const mutableResult = addItemToInventory(mutableInput, item, 50, 1, true);
  assert.equal(mutableResult.inventory, mutableInput);
  assert.equal(mutableInput[key].count, 2);
});

test('inventory addition auto-sells marked and overflow variants without mutation', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const item = Object.values(state.global.inventory).find((variant) => variant.count > 0)?.item;
  assert.ok(item);
  const key = getVariantKey(item);
  const expectedProfit = calculateSellPrice(item, 1.5);

  for (const variant of [
    { item, count: 1, status: 'sold' as const, isNew: false },
    { item, count: ITEM_MAX_STACK, status: 'owned' as const, isNew: false },
  ]) {
    const inventory = { [key]: variant };
    const result = addItemToInventory(inventory, item, 100, 1.5, true);
    assert.equal(result.inventory, inventory);
    assert.equal(result.wasAutoSold, true);
    assert.equal(result.autoSellProfit, expectedProfit);
    assert.equal(result.gold, 100 + expectedProfit);
    assert.equal(inventory[key].count, variant.count);
  }
});

test('shared utility ownership leaves imported-bag migration in hydration', () => {
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const adapterSource = readFileSync(
    resolve(process.cwd(), 'src/game/expeditionApplicationAdapters.ts'),
    'utf8',
  );
  assert.match(hookSource, /from '\.\.\/game\/diarySettings'/);
  assert.match(hookSource, /from '\.\.\/game\/inventoryMutation'/);
  assert.doesNotMatch(
    hookSource,
    /function (getDiarySettingsWithDefaults|normalizeDiaryDefeatNotificationMode|addItemToInventory|calculateSellPrice)\(/,
  );
  assert.match(hookSource, /function normalizeImportedBags\(/);
  assert.match(hookSource, /migrateLegacyBag\(/);
  assert.doesNotMatch(adapterSource, /migrateLegacyBag|createCommonRewardBag|hydrateGameState/);
});
