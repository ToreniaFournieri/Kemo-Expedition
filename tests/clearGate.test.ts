import assert from 'node:assert/strict';
import test from 'node:test';
import type { Item, Party } from '../src/types/index.ts';
import en from '../src/i18n/en.ts';
import ja from '../src/i18n/ja.ts';
import zhCN from '../src/i18n/zh-CN.ts';
import zhTW from '../src/i18n/zh-TW.ts';
import {
  BOSS_GATE_REQUIRED,
  ELITE_GATE_REQUIREMENTS,
  addRecoveredBossRaresToGodsBattleProgress,
  applyClearGateOutcome,
  getBossGateKey,
  getClearGateProgress,
  getClearGateRequired,
  getEliteGateKey,
  getGodsBattleProgress,
  isClearGateUnlocked,
  migrateLegacyGateState,
} from '../src/game/clearGateCore.ts';

type GateParty = Pick<Party, 'clearGateProgress' | 'clearGateStatus' | 'defeatedBossExpeditions'>;

function gateParty(overrides: Partial<GateParty> = {}): GateParty {
  return {
    clearGateProgress: {},
    clearGateStatus: {},
    defeatedBossExpeditions: {},
    ...overrides,
  };
}

test('each Clear-Gate uses its floor-specific consecutive-success requirement', () => {
  for (let floor = 1; floor <= 5; floor += 1) {
    assert.equal(getClearGateRequired(getEliteGateKey(1, floor)), ELITE_GATE_REQUIREMENTS[floor]);
  }
  assert.equal(getClearGateRequired(getBossGateKey(1)), BOSS_GATE_REQUIRED);
});

test('gated-room text shows only the required streak while floating bubbles retain progress', () => {
  const dictionaries = { ja, en, 'zh-CN': zhCN, 'zh-TW': zhTW };
  const render = (template: string, params: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (match, key: string) => String(params[key] ?? match));

  for (const [language, dictionary] of Object.entries(dictionaries)) {
    const params = { label: dictionary['home.gate.consecutiveSuccesses'], current: 0, required: 9, floor: 1 };
    const gatedRoomText = render(dictionary['game.log.gateInfo.floor'], params);
    const floatingBubbleText = render(dictionary['home.progress.eliteBubble'], params);

    assert.equal(gatedRoomText.includes('0/9'), false, language);
    assert.equal(gatedRoomText.includes('9'), true, language);
    assert.equal(floatingBubbleText.includes('0/9'), true, language);
  }
});

test('a newly cleared gated room discloses that progression starts on the next run', () => {
  const dictionaries = { ja, en, 'zh-CN': zhCN, 'zh-TW': zhTW };
  const render = (template: string, params: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (match, key: string) => String(params[key] ?? match));

  for (const [language, dictionary] of Object.entries(dictionaries)) {
    const params = { label: dictionary['home.gate.consecutiveSuccesses'], required: 9, floor: 1 };
    const clearedText = render(dictionary['game.log.gateInfo.floorCleared'], params);

    assert.equal(clearedText.includes('9'), true, language);
    assert.equal(clearedText.includes('1F-4'), true, language);
    assert.notEqual(clearedText, render(dictionary['game.log.gateInfo.floor'], params), language);
  }

  assert.equal(
    render(ja['game.log.gateInfo.floorCleared'], {
      label: ja['home.gate.consecutiveSuccesses'],
      required: 9,
      floor: 1,
    }),
    '連続攻略成功 9回 で 1F-4 解放達成（次回から先に進める）',
  );
});

test('nine consecutive successful returns unlock the first Clear-Gate permanently', () => {
  const gateKey = getEliteGateKey(1, 1);
  const required = getClearGateRequired(gateKey);
  let party = gateParty();

  for (let run = 1; run <= required; run += 1) {
    const result = applyClearGateOutcome(party, 1, 'Turned_Back');
    party = { ...party, clearGateProgress: result.progress, clearGateStatus: result.status };
    assert.equal(getClearGateProgress(party, gateKey), run);
  }

  assert.equal(isClearGateUnlocked(party, gateKey), true);
  const failureAfterUnlock = applyClearGateOutcome(party, 1, 'Defeat');
  assert.equal(failureAfterUnlock.status[gateKey], true);
  assert.equal(failureAfterUnlock.progress[String(gateKey)], required);
});

test('a failed run resets only the active next-gate streak', () => {
  const firstGate = getEliteGateKey(1, 1);
  const secondGate = getEliteGateKey(1, 2);
  const firstRequired = getClearGateRequired(firstGate);
  const party = gateParty({
    clearGateProgress: { [String(firstGate)]: firstRequired, [String(secondGate)]: 5 },
    clearGateStatus: { [firstGate]: true },
  });

  const result = applyClearGateOutcome(party, 1, 'Wounded_Retreat');
  assert.equal(result.progress[String(firstGate)], firstRequired);
  assert.equal(result.progress[String(secondGate)], 0);
  assert.equal(result.status[firstGate], true);
});

test('Gods Battle progress counts Boss Rare items but not Mythic items', () => {
  const items = [{ id: 1401 }, { id: 1402 }, { id: 8501 }] as Item[];
  const progress = addRecoveredBossRaresToGodsBattleProgress({}, 1, items);
  assert.equal(getGodsBattleProgress({ clearGateProgress: progress }, 1), 2);
});

test('legacy saves retain unlocked item gates and Boss Rare Gods Battle progress', () => {
  const migrated = migrateLegacyGateState({
    lootGateProgress: {
      '2:uncommon': 12,
      '2:eliteRare': 3,
      '2:bossRare': 2,
    },
  });

  assert.equal(migrated.status[getEliteGateKey(2, 1)], true);
  assert.equal(migrated.status[getEliteGateKey(2, 2)], true);
  assert.equal(migrated.status[getEliteGateKey(2, 3)], true);
  assert.equal(migrated.status[getEliteGateKey(2, 4)], undefined);
  assert.equal(migrated.status[getBossGateKey(2)], true);
  assert.equal(getGodsBattleProgress({ clearGateProgress: migrated.progress }, 2), 2);
});
