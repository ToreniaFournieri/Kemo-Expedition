import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExpeditionDepthLimit } from '../src/types/index.ts';
import { hasReachedExpeditionDepthLimit } from '../src/game/expeditionEffects/expeditionContinuation.ts';

const positions: ReadonlyArray<readonly [ExpeditionDepthLimit, number, number]> = [
  ['1f-3', 1, 3], ['1f-4', 1, 4],
  ['2f-3', 2, 3], ['2f-4', 2, 4],
  ['3f-3', 3, 3], ['3f-4', 3, 4],
  ['4f-3', 4, 3], ['4f-4', 4, 4],
  ['5f-3', 5, 3], ['5f-4', 5, 4],
  ['beforeBoss', 6, 3],
];

test('every configured expedition depth limit resolves at its exact room', () => {
  for (const [depthLimit, floorNumber, roomInFloor] of positions) {
    assert.equal(
      hasReachedExpeditionDepthLimit(depthLimit, floorNumber, roomInFloor),
      true,
      depthLimit,
    );
  }
});

test('depth limits reject adjacent rooms, floors, and the all setting', () => {
  for (const [depthLimit, floorNumber, roomInFloor] of positions) {
    assert.equal(hasReachedExpeditionDepthLimit(depthLimit, floorNumber, roomInFloor - 1), false);
    assert.equal(hasReachedExpeditionDepthLimit(depthLimit, floorNumber + 1, roomInFloor), false);
  }
  assert.equal(hasReachedExpeditionDepthLimit('all', 6, 4), false);
});
