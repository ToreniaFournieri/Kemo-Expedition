import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { normalizeImportedBags, upgradeLegacyRewardBagKeys } from '../../src/game/bagMigration.ts';
import { getDiarySettingsWithDefaults } from '../../src/game/diarySettings.ts';
import { getItemRarityById, upgradeLegacyDiaryTriggers, upgradeLegacyItemRarity } from '../../src/game/itemRarity.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { DiarySettings, DiaryTrigger, GameState } from '../../src/types/index.ts';

// SpecRef: 1.1 | 1.0.3 Item rarity tier | `common`, `uncommon`, `rare`, `epic`, `mythic`
test('item IDs keep their rarity band under the renamed rarity values', () => {
  assert.deepEqual([1101, 1201, 1301, 1401, 8501].map(getItemRarityById), ['common', 'uncommon', 'rare', 'epic', 'mythic']);
});

test('legacy rarity values and Diary triggers upgrade to the renamed values', () => {
  assert.deepEqual(['eliteRare', 'bossRare', 'mythicRare', 'common', 'rare'].map(upgradeLegacyItemRarity), ['rare', 'epic', 'mythic', 'common', 'rare']);
  assert.equal(upgradeLegacyItemRarity(undefined), undefined);
  const legacyTriggers = ['victory', 'bossRare', 'eliteRare'] as unknown as DiaryTrigger[];
  assert.deepEqual(upgradeLegacyDiaryTriggers(legacyTriggers), ['victory', 'epic', 'rare']);
  const currentTriggers: DiaryTrigger[] = ['defeat', 'mythic'];
  assert.equal(upgradeLegacyDiaryTriggers(currentTriggers), currentTriggers, 'current triggers are returned unchanged');
});

// SpecRef: 1.2 | Bag Randomization | `t.rare_reward_bag`, `t.epic_reward_bag`, `t.mythic_reward_bag`
test('legacy reward bags keep their remaining tickets under the renamed keys, and a current key wins', () => {
  const legacy = {
    eliteRareRewardBag: { entries: [{ id: 0, tickets: 12 }, { id: 1, tickets: 1 }] },
    bossRareRewardBag: { entries: [{ id: 0, tickets: 30 }, { id: 1, tickets: 0 }] },
    mythicRareRewardBag: { entries: [{ id: 0, tickets: 5 }, { id: 1, tickets: 1 }] },
  };
  const bags = normalizeImportedBags(legacy);
  assert.deepEqual(bags.rareRewardBag.entries, legacy.eliteRareRewardBag.entries);
  assert.deepEqual(bags.epicRewardBag.entries, legacy.bossRareRewardBag.entries);
  assert.deepEqual(bags.mythicRewardBag.entries, legacy.mythicRareRewardBag.entries);
  for (const key of ['eliteRareRewardBag', 'bossRareRewardBag', 'mythicRareRewardBag']) assert.equal(key in bags, false, key);

  const current = { entries: [{ id: 0, tickets: 3 }, { id: 1, tickets: 1 }] };
  const mixed = upgradeLegacyRewardBagKeys({ ...legacy, rareRewardBag: current });
  assert.equal(mixed.rareRewardBag, current);
  assert.equal('eliteRareRewardBag' in mixed, false);
});

// SpecRef: 8.5 | UI_DIARY | Setting (エピックレア通知)
test('a legacy boss-rare Diary threshold becomes the Epic threshold, and a current key wins', () => {
  const legacy = getDiarySettingsWithDefaults({ bossThreshold: 3 } as unknown as Partial<DiarySettings>);
  assert.equal(legacy.epicThreshold, 3);
  assert.equal('bossThreshold' in legacy, false);
  const mixed = getDiarySettingsWithDefaults({ bossThreshold: 3, epicThreshold: 'none' } as unknown as Partial<DiarySettings>);
  assert.equal(mixed.epicThreshold, 'none');
  assert.equal('bossThreshold' in mixed, false);
});

// SpecRef: 5.1.4 | Save and load | Data persistence
test('a save written before the item rarity rename loads with only the renamed keys and values', () => {
  const envelope = JSON.parse(readFileSync(resolve(process.cwd(), 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'), 'utf8')) as { saveDataCompressed: string };
  const raw = JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState & { parties: Array<{ bags: Record<string, unknown> }> };
  const rawText = JSON.stringify(raw);
  for (const legacy of ['eliteRareRewardBag', '"bossRare"', 'bossThreshold', ':bossRare']) {
    assert.ok(rawText.includes(legacy), `the fixture predates the rename (${legacy})`);
  }
  const rawPartyBags = raw.parties.map((party) => party.bags);
  const rawGodsBattleProgress = raw.parties.map((party) => Object.entries((party as unknown as GameState['parties'][number]).clearGateProgress ?? {})
    .filter(([key]) => key.endsWith(':bossRare')));

  const hydrated = hydrateGameState(raw);
  const text = JSON.stringify(hydrated);
  for (const legacy of ['eliteRare', 'bossRare', 'mythicRare', 'bossThreshold']) {
    assert.equal(text.includes(legacy), false, `no ${legacy} remains after loading`);
  }
  // Persisted bags store compact `[id, tickets]` entries; hydrated bags store `{ id, tickets }`.
  const ticketPairs = (bag: unknown) => ((bag as { entries?: unknown[] } | undefined)?.entries ?? [])
    .map((entry) => (Array.isArray(entry) ? entry : [(entry as { id: number }).id, (entry as { tickets: number }).tickets]));
  hydrated.parties.forEach((party, index) => {
    assert.deepEqual(ticketPairs(party.bags?.rareRewardBag), ticketPairs(rawPartyBags[index].eliteRareRewardBag), `party ${index + 1} rare bag`);
    assert.deepEqual(ticketPairs(party.bags?.epicRewardBag), ticketPairs(rawPartyBags[index].bossRareRewardBag), `party ${index + 1} epic bag`);
    assert.deepEqual(ticketPairs(party.bags?.mythicRewardBag), ticketPairs(rawPartyBags[index].mythicRareRewardBag), `party ${index + 1} mythic bag`);
    for (const [legacyKey, count] of rawGodsBattleProgress[index]) {
      assert.equal(party.clearGateProgress[legacyKey.replace(/:bossRare$/, ':epic')], count, `party ${index + 1} ${legacyKey}`);
    }
  });
});
