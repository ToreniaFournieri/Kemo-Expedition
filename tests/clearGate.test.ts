import assert from 'node:assert/strict';
import test from 'node:test';
import type { Item, Party } from '../src/types/index.ts';
import {
  CLEAR_GATE_REQUIRED,
  addRecoveredBossRaresToGodsBattleProgress,
  applyClearGateOutcome,
  getBossGateKey,
  getClearGateProgress,
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

test('eight consecutive successful returns unlock the next Clear-Gate permanently', () => {
  const gateKey = getEliteGateKey(1, 1);
  let party = gateParty();

  for (let run = 1; run <= CLEAR_GATE_REQUIRED; run += 1) {
    const result = applyClearGateOutcome(party, 1, 'Turned_Back');
    party = { ...party, clearGateProgress: result.progress, clearGateStatus: result.status };
    assert.equal(getClearGateProgress(party, gateKey), run);
  }

  assert.equal(isClearGateUnlocked(party, gateKey), true);
  const failureAfterUnlock = applyClearGateOutcome(party, 1, 'Defeat');
  assert.equal(failureAfterUnlock.status[gateKey], true);
  assert.equal(failureAfterUnlock.progress[String(gateKey)], CLEAR_GATE_REQUIRED);
});

test('a failed run resets only the active next-gate streak', () => {
  const firstGate = getEliteGateKey(1, 1);
  const secondGate = getEliteGateKey(1, 2);
  const party = gateParty({
    clearGateProgress: { [String(firstGate)]: CLEAR_GATE_REQUIRED, [String(secondGate)]: 5 },
    clearGateStatus: { [firstGate]: true },
  });

  const result = applyClearGateOutcome(party, 1, 'Wounded_Retreat');
  assert.equal(result.progress[String(firstGate)], CLEAR_GATE_REQUIRED);
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
