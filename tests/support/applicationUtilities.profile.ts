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
  removeItemFromInventory,
  sellAllOwnedInventory,
  sellInventoryStack,
  setInventoryVariantStatus,
} from '../../src/game/inventoryMutation.ts';
import {
  migrateLegacyBag,
  normalizeImportedBags,
} from '../../src/game/bagMigration.ts';
import { createCommonRewardBag } from '../../src/game/bags.ts';
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

test('inventory removal preserves missing, last-copy, multi-copy, and mutable semantics', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const item = Object.values(state.global.inventory).find((variant) => variant.count > 0)?.item;
  assert.ok(item);
  const key = getVariantKey(item);
  const missing = {};
  assert.equal(removeItemFromInventory(missing, key), missing);

  const lastCopy = { [key]: { item, count: 1, status: 'owned' as const, isNew: true } };
  const removedLast = removeItemFromInventory(lastCopy, key);
  assert.notEqual(removedLast, lastCopy);
  assert.deepEqual(removedLast[key], { ...lastCopy[key], count: 0, status: 'notown' });
  assert.equal(lastCopy[key].count, 1);

  const multiple = { [key]: { item, count: 3, status: 'owned' as const, isNew: false } };
  const removedMutable = removeItemFromInventory(multiple, key, true);
  assert.equal(removedMutable, multiple);
  assert.equal(multiple[key].count, 2);
  assert.equal(multiple[key].status, 'owned');
});

test('inventory status transitions preserve missing identity and clone existing variants', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const item = Object.values(state.global.inventory).find((variant) => variant.count > 0)?.item;
  assert.ok(item);
  const key = getVariantKey(item);
  const missing = {};
  assert.equal(setInventoryVariantStatus(missing, key, 'notown'), missing);

  const inventory = { [key]: { item, count: 2, status: 'owned' as const, isNew: false } };
  const transitioned = setInventoryVariantStatus(inventory, key, 'notown');
  assert.notEqual(transitioned, inventory);
  assert.equal(transitioned[key].status, 'notown');
  assert.equal(inventory[key].status, 'owned');
});

test('single-stack sale preserves Gold versus Prana precedence and status projection', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const sourceItem = Object.values(state.global.inventory).find((variant) => variant.count > 0)?.item;
  assert.ok(sourceItem);
  const item = { ...sourceItem, superRare: 0 };
  const key = getVariantKey(item);
  const inventory = { [key]: { item, count: 2, status: 'owned' as const, isNew: false } };
  const goldSale = sellInventoryStack(inventory, key, 100, 5, { getPrana: () => 0 });
  assert.equal(goldSale.gold, 100 + calculateSellPrice(item) * 2);
  assert.equal(goldSale.prana, 5);
  assert.equal(goldSale.soldCount, 2);
  assert.deepEqual(goldSale.inventory[key], { ...inventory[key], count: 0, status: 'sold' });

  const pranaSale = sellInventoryStack(inventory, key, 100, 5, { getPrana: () => 3 });
  assert.equal(pranaSale.gold, 100);
  assert.equal(pranaSale.prana, 11);
  assert.equal(pranaSale.soldCount, 2);
});

test('bulk sale selects only positive owned stacks and aggregates mixed currencies', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const sourceItem = Object.values(state.global.inventory).find((variant) => variant.count > 0)?.item;
  assert.ok(sourceItem);
  const goldItem = { ...sourceItem, superRare: 0, isLocked: true };
  const pranaItem = { ...sourceItem, superRare: 1 };
  const ignoredItem = { ...sourceItem, superRare: 2 };
  const goldKey = getVariantKey(goldItem);
  const pranaKey = getVariantKey(pranaItem);
  const ignoredKey = getVariantKey(ignoredItem);
  const inventory = {
    [goldKey]: { item: goldItem, count: 2, status: 'owned' as const, isNew: false },
    [pranaKey]: { item: pranaItem, count: 3, status: 'owned' as const, isNew: false },
    [ignoredKey]: { item: ignoredItem, count: 4, status: 'sold' as const, isNew: false },
  };
  const result = sellAllOwnedInventory(inventory, 100, 5, {
    getPrana: (item) => item.superRare > 0 ? 4 : 0,
  });

  assert.equal(result.gold, 100 + calculateSellPrice(goldItem) * 2);
  assert.equal(result.prana, 17);
  assert.equal(result.soldCount, 5);
  assert.equal(result.inventory[goldKey].status, 'sold');
  assert.equal(result.inventory[pranaKey].status, 'sold');
  assert.equal(result.inventory[ignoredKey], inventory[ignoredKey]);

  const noEligible = { [ignoredKey]: inventory[ignoredKey] };
  const unchanged = sellAllOwnedInventory(noEligible, 100, 5, { getPrana: () => 0 });
  assert.equal(unchanged.inventory, noEligible);
  assert.equal(unchanged.soldCount, 0);
});

test('shared utility ownership leaves imported-bag migration in hydration', () => {
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const migrationSource = readFileSync(resolve(process.cwd(), 'src/game/bagMigration.ts'), 'utf8');
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
  assert.match(hookSource, /from '\.\.\/game\/bagMigration'/);
  assert.doesNotMatch(hookSource, /function (normalizeImportedBags|migrateLegacyBag)\(/);
  assert.match(hookSource, /parsed\.bags = normalizeImportedBags\(parsed\.bags\)/);
  assert.match(migrationSource, /commonSuperRareBag: migrateLegacyBag\(/);
  assert.doesNotMatch(adapterSource, /migrateLegacyBag|createCommonRewardBag|hydrateGameState/);
  assert.match(hookSource, /const sale = sellInventoryStack\(/);
  assert.match(hookSource, /const sale = sellAllOwnedInventory\(/);
  assert.match(hookSource, /setInventoryVariantStatus\(/);
  assert.doesNotMatch(
    hookSource,
    /function removeItemFromInventory\(|case 'SELL_ALL_OWNED':[\s\S]{0,500}for \(const \[/,
  );
});

test('legacy bag migration preserves entries, ticket arrays, and fallbacks', () => {
  assert.deepEqual(
    migrateLegacyBag({ tickets: [1, 0, 1, 'invalid'] }, createCommonRewardBag, 'commonRewardBag'),
    { entries: [{ id: 0, tickets: 1 }, { id: 1, tickets: 2 }] },
  );
  assert.deepEqual(
    migrateLegacyBag({ entries: [[0, 2.9], [1, -3], ['invalid', 4]] }, createCommonRewardBag, 'commonRewardBag'),
    { entries: [{ id: 0, tickets: 2 }, { id: 1, tickets: 0 }] },
  );
  assert.deepEqual(
    migrateLegacyBag(null, createCommonRewardBag, 'commonRewardBag'),
    createCommonRewardBag(),
  );
});

test('save bag normalization migrates every bag and preserves Super Rare fallback input', () => {
  const normalized = normalizeImportedBags({
    commonRewardBag: { tickets: [1, 0, 1] },
    superRareBag: { tickets: [0, 1, 1] },
  });

  assert.deepEqual(normalized.commonRewardBag, {
    entries: [{ id: 0, tickets: 1 }, { id: 1, tickets: 2 }],
  });
  assert.deepEqual(normalized.commonSuperRareBag.entries, normalized.superRareBag.entries);
  assert.deepEqual(normalized.rareSuperRareBag.entries, normalized.superRareBag.entries);
  assert.deepEqual(Object.keys(normalized).sort(), [
    'bossRareRewardBag',
    'commonEnhancementBag',
    'commonRewardBag',
    'commonSuperRareBag',
    'eliteRareRewardBag',
    'enhancementBag',
    'magicalThreatBag',
    'mythicRareRewardBag',
    'physicalThreatBag',
    'rareSuperRareBag',
    'sideQuestBag',
    'superRareBag',
    'uncommonRewardBag',
  ]);
});
