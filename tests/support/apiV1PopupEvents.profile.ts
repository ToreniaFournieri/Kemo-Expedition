import assert from 'node:assert/strict';
import { ITEMS } from '../../src/data/items';
import { createFreshGameState } from '../../src/hooks/useGameState';
import type { GameState, Item } from '../../src/types';
import { getVariantKey } from '../../src/types';
import {
  appendApiV1PopupEvents,
  planApiV1PopupCandidates,
  type ApiV1PopupEvent,
} from '../../src/api/v1/popupEvents';

// SpecRef: 9.1.4.8 | Durable popup production, AFK grouping, IDs, retention, and replay fencing

const now = Date.parse('2026-09-22T03:00:00.000Z');
const before = createFreshGameState('en', now);
const reward: Item = { ...ITEMS[0], enhancement: 1, superRare: 0, isLocked: false, jewel: null };

// All four configured categories are semantic and settings-gated. A sortie can produce Cycle, item, and side-quest
// events; automatic equipment is derived from the committed before/after equipment rather than localized UI prose.
{
  const staged = structuredClone(before);
  const previous = staged.parties[0];
  before.parties[0].pendingProfit = 123;
  before.parties[0].sideQuest = {
    id: 7, type: 'q.exercise', shortText: 'Exercise', target: 10, progress: 2, rolledTier: 2,
    assignedAt: now - 1_000, expiresAt: now + 60_000,
  };
  previous.level += 1;
  previous.sideQuest = null;
  previous.lastExpeditionLog = {
    compactVersion: 1, dungeonId: 1, dungeonName: '', difficultyOffset: 0, totalExperience: 1,
    totalRooms: 1, completedRooms: 1, finalOutcome: 'Clear', entries: [], rewards: [reward],
    autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 1, maxPartyHP: 1,
  };
  staged.global.inventory[getVariantKey(reward)] = { item: reward, count: 1, status: 'owned' };
  const candidates = planApiV1PopupCandidates('commit/expedition/1/godsBattle', before, staged, { diaryEntryId: 'diary-1' });
  assert.deepEqual(candidates.map((event) => event.eventKey), [
    'popup.cycle.instantExpedition',
    'popup.cycle.levelUp',
    'popup.itemDrop',
    'popup.sideQuest.cancelledByGodsBattle',
  ]);
  assert.equal(candidates[2].args.item, `0/${reward.id}/1/0`);
  assert.equal(candidates[2].diaryEntryId, 'diary-1');

  const autoBefore = createFreshGameState('en', now);
  const autoAfter = structuredClone(autoBefore);
  const character = autoAfter.parties[0].characters[0];
  character.equipment[0] = reward;
  const auto = planApiV1PopupCandidates(
    `commit/build/character/${character.id}/autoEquipment`, autoBefore, autoAfter, {},
  );
  assert.equal(auto.length, 1);
  assert.equal(auto[0].eventKey, 'popup.autoEquipment');
  assert.equal(auto[0].args.characterId, character.id);
  assert.equal(auto[0].args.after, `0=0/${reward.id}/1/0/0:0`);

  autoAfter.parties[0].diarySettings.notifyAutoEquipmentPopup = false;
  assert.equal(planApiV1PopupCandidates(
    `commit/build/character/${character.id}/autoEquipment`, autoBefore, autoAfter, {},
  ).length, 0);
}

// AFK progression emits one grouped Cycle summary per configured Party and never a burst of reconstructed item,
// side-quest, or automatic-equipment events.
{
  const after = structuredClone(before);
  after.parties[0].expeditionStats.Clear += 3;
  after.parties[0].expeditionStats.Defeat += 1;
  after.parties[0].expeditionStats.savedGold += 456;
  after.parties[0].lastExpeditionLog = {
    compactVersion: 1, dungeonId: 1, dungeonName: '', difficultyOffset: 0, totalExperience: 1,
    totalRooms: 1, completedRooms: 1, finalOutcome: 'Clear', entries: [], rewards: [reward],
    autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 1, maxPartyHP: 1,
  };
  const candidates = planApiV1PopupCandidates('commit/progress/elapsed', before, after, {});
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].eventKey, 'popup.afkSummary');
  assert.deepEqual(candidates[0].args, {
    partyName: after.parties[0].name, Clear: 3, Return: 0, Draw: 0, Retreat: 0, Defeat: 1,
    donatedGold: 0, savedGold: 456,
  });
}

function event(index: number, createdAt: string): ApiV1PopupEvent {
  return {
    apiVersion: 'v1', schemaVersion: 1, revision: index + 1, sequence: 1, eventId: `${index + 1}:1`,
    eventKey: 'popup.test', args: { index }, partyNumber: 1, diaryEntryId: null, groupKey: null, createdAt,
  };
}

// IDs are deterministic inside the committed revision. Retention preserves the union of the latest 256 events and
// every event younger than five minutes.
{
  const oldTime = new Date(now - 600_000).toISOString();
  const retained = Array.from({ length: 300 }, (_, index) => event(index, oldTime));
  const appended = appendApiV1PopupEvents(retained, [{
    eventKey: 'popup.afkSummary', args: { count: 1 }, partyNumber: 2, diaryEntryId: null, groupKey: 'afk',
  }, {
    eventKey: 'popup.itemDrop', args: { item: '0/1/0/0' }, partyNumber: 2, diaryEntryId: null, groupKey: null,
  }], 301, new Date(now).toISOString());
  assert.equal(appended.length, 256);
  assert.deepEqual(appended.slice(-2).map((entry) => entry.eventId), ['301:1', '301:2']);
  assert.equal(appended.at(-2)?.groupKey, '301:afk:2');
  assert.equal(appended.at(-1)?.apiVersion, 'v1');
  assert.equal(appended.at(-1)?.schemaVersion, 1);

  const recentTime = new Date(now - 60_000).toISOString();
  const recent = Array.from({ length: 300 }, (_, index) => event(index, recentTime));
  assert.equal(appendApiV1PopupEvents(recent, [{
    eventKey: 'popup.test', args: {}, partyNumber: null, diaryEntryId: null, groupKey: null,
  }], 301, new Date(now).toISOString()).length, 301, 'five minutes retains more than the count floor');
}

console.log('apiV1PopupEvents profile ok');
