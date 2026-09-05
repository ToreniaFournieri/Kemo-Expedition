import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRewardTicketCount,
  resolveEnemyRewardDrops,
} from '../src/game/expeditionEffects/rewardDrops.ts';
import { drawFromBagWithRandom } from '../src/game/weightedBag.ts';
import type { GameBags, ItemDef } from '../src/types/index.ts';

const COMMON_ITEM: ItemDef = {
  id: 101,
  category: 'sword',
  name: 'test-common',
};

function withBags(overrides: Partial<GameBags>): GameBags {
  const fallback = { entries: [{ id: 0, tickets: 1 }] };
  return {
    commonRewardBag: fallback,
    commonEnhancementBag: fallback,
    uncommonRewardBag: fallback,
    eliteRareRewardBag: fallback,
    bossRareRewardBag: fallback,
    mythicRareRewardBag: fallback,
    enhancementBag: fallback,
    superRareBag: fallback,
    commonSuperRareBag: fallback,
    rareSuperRareBag: fallback,
    physicalThreatBag: fallback,
    magicalThreatBag: fallback,
    sideQuestBag: fallback,
    ...overrides,
  };
}

const noRefill = (bags: GameBags): GameBags => bags;

test('explicit weighted draws retain stable ID ordering without mutating the source bag', () => {
  const source = { entries: [{ id: 2, tickets: 1 }, { id: 0, tickets: 1 }] };
  const first = drawFromBagWithRandom(source, () => 0);
  const second = drawFromBagWithRandom(source, () => 0.5);
  assert.equal(first.ticket, 0);
  assert.equal(second.ticket, 2);
  assert.deepEqual(first.newBag.entries.map((entry) => entry.id), [0, 2]);
  assert.deepEqual(source.entries, [{ id: 2, tickets: 1 }, { id: 0, tickets: 1 }]);
});

test('reward ticket modifiers retain Gehenna suppression and additive ordering', () => {
  assert.equal(getRewardTicketCount({
    hasUnlock: true,
    terrainEffect: 'terrain.gehenna',
    deityItemChanceTickets: 2,
    difficultyItemChanceTickets: 2,
    auriferousBonusRolls: 3,
  }), 8);
  assert.equal(getRewardTicketCount({
    hasUnlock: true,
    terrainEffect: 'terrain.rejuvenation',
    deityItemChanceTickets: 2,
    difficultyItemChanceTickets: 2,
    auriferousBonusRolls: 3,
  }), 10);
});

test('a missed item consumes every configured reward draw and no later draws', () => {
  const draws: number[] = [];
  const result = resolveEnemyRewardDrops({
    baseItems: [COMMON_ITEM],
    bags: withBags({ commonRewardBag: { entries: [{ id: 0, tickets: 8 }] } }),
    hasUnlock: true,
    terrainEffect: 'terrain.gehenna',
    difficultyItemChanceTickets: 2,
    auriferousBonusRolls: 3,
    refillBag: noRefill,
    random: () => {
      draws.push(0);
      return 0;
    },
  });
  assert.equal(draws.length, 8);
  assert.deepEqual(result.recoveredItems, []);
  assert.equal(result.bags.commonRewardBag.entries[0]?.tickets, 0);
});

test('a common reward preserves enhancement threshold and Super Rare draw order', () => {
  const tape = [0, 0, 0, 0.75];
  let cursor = 0;
  const result = resolveEnemyRewardDrops({
    baseItems: [COMMON_ITEM],
    bags: withBags({
      commonRewardBag: { entries: [{ id: 1, tickets: 2 }] },
      commonEnhancementBag: { entries: [{ id: 2, tickets: 1 }] },
      commonSuperRareBag: { entries: [{ id: 0, tickets: 1 }, { id: 7, tickets: 1 }] },
    }),
    hasUnlock: false,
    refillBag: noRefill,
    random: () => tape[cursor++] ?? 0,
  });
  assert.equal(cursor, 4);
  assert.deepEqual(result.recoveredItems, [{
    ...COMMON_ITEM,
    enhancement: 2,
    superRare: 7,
  }]);
});

test('a common enhancement below two skips Super Rare without consuming a draw', () => {
  let draws = 0;
  const result = resolveEnemyRewardDrops({
    baseItems: [COMMON_ITEM],
    bags: withBags({
      commonRewardBag: { entries: [{ id: 1, tickets: 2 }] },
      commonEnhancementBag: { entries: [{ id: 1, tickets: 1 }] },
    }),
    hasUnlock: false,
    difficultySuperRareChanceTickets: 4,
    refillBag: noRefill,
    random: () => {
      draws += 1;
      return 0;
    },
  });
  assert.equal(draws, 3);
  assert.equal(result.recoveredItems[0]?.superRare, 0);
});

test('reward resolution requests a refill at the same draw boundary', () => {
  const refills: string[] = [];
  const result = resolveEnemyRewardDrops({
    baseItems: [COMMON_ITEM],
    bags: withBags({ commonRewardBag: { entries: [{ id: 1, tickets: 1 }] } }),
    hasUnlock: false,
    refillBag: (bags, bagType) => {
      if (bags[bagType].entries.some((entry) => entry.tickets > 0)) return bags;
      refills.push(bagType);
      return { ...bags, [bagType]: { entries: [{ id: 0, tickets: 1 }] } };
    },
    random: () => 0,
  });
  assert.deepEqual(refills, ['commonRewardBag']);
  assert.equal(result.recoveredItems.length, 1);
  assert.equal(result.recoveredItems[0]?.enhancement, 0);
});
