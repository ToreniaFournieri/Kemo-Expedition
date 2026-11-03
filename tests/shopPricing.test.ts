import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateItemSellPrice, getIdentifiedShopItemPrice, getShopItemPrice } from '../src/game/pricing.ts';
import type { Item } from '../src/types/index.ts';

const item = (id: number, enhancement: number, superRare: number) => ({ id, enhancement, superRare }) as Item;

// SpecRef: 3.1.6 | Item selling price
test('sell price scales with enhancement, halves the old super rare bonus, and rounds up', () => {
  assert.equal(calculateItemSellPrice(item(1101, 0, 0)), 12);
  assert.equal(calculateItemSellPrice(item(1101, 3, 0)), 20); // 12 x 1.6 = 19.2
  assert.equal(calculateItemSellPrice(item(1101, 0, 5)), 1200); // 12 x 100
  assert.equal(calculateItemSellPrice(item(1301, 6, 0)), 264); // 12 x 2.2 x 10 (rare)
  assert.equal(calculateItemSellPrice(item(1101, 0, 0), 1.5), 18);
});

// SpecRef: 3.1.6 | Item selling price
test('unidentified and identified purchase prices follow the spec formulas', () => {
  assert.equal(getShopItemPrice(1104), 60); // (4+2) x 1 x 10
  assert.equal(getShopItemPrice(2301), 8 * 10 * 10);
  assert.equal(getIdentifiedShopItemPrice(1104, 2, 0), 720); // 6 x 1 x 3 x 40
  assert.equal(getIdentifiedShopItemPrice(1104, 2, 9), 72000); // x 100
  assert.equal(getIdentifiedShopItemPrice(1304, 6, 0), 6 * 10 * 7 * 40);
});
