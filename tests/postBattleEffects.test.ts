import assert from 'node:assert/strict';
import test from 'node:test';
import {
  POST_BATTLE_EFFECT_HANDLER_ORDER,
  resolvePostBattleEffects,
  type ResolvePostBattleEffectsInput,
} from '../src/game/expeditionEffects/postBattleEffects.ts';

test('post-battle handler order is explicit and stable', () => {
  assert.deepEqual(POST_BATTLE_EFFECT_HANDLER_ORDER.effects, [
    'core:post-battle-deity',
    'core:first_aid',
    'core:terrain.rejuvenation',
    'core:terrain.abundant',
    'core:terrain.rotwood',
    'core:terrain.leakage',
    'core:terrain.heatwave',
  ]);
  assert.deepEqual(POST_BATTLE_EFFECT_HANDLER_ORDER.continuation, ['core:terrain.decay']);
});

function resolve(overrides: Partial<ResolvePostBattleEffectsInput> = {}) {
  const draws: number[] = [];
  const tape = [0.1, 0.7, 0.2, 0.8, 0.3, 0.9, 0.4, 0.6];
  const result = resolvePostBattleEffects({
    currentHp: 800,
    maxHp: 1000,
    floorNumber: 1,
    roomInFloor: 1,
    roomType: 'battle_Normal',
    deityKey: null,
    deityRank: 1,
    partyName: 'Party',
    characters: [
      { name: 'Front', firstAidLevel: 0, firstAidHpContribution: 0, thunderResistance: 0.5 },
      { name: 'Back', firstAidLevel: 0, firstAidHpContribution: 0, thunderResistance: 2 },
    ],
    isFinalBossRoom: false,
    random: () => {
      const value = tape[draws.length] ?? 0;
      draws.push(value);
      return value;
    },
    ...overrides,
  });
  return { result, draws };
}

test('inactive post-battle terrain preserves the three historical unconditional draws', () => {
  const { result, draws } = resolve();
  assert.equal(result.preContinuationHp, 800);
  assert.equal(result.finalHp, 800);
  assert.deepEqual(result.preContinuationFacts, []);
  assert.equal(draws.length, 3);
});

test('elite restoration, First Aid, and rejuvenation retain calculation and fact order', () => {
  const { result, draws } = resolve({
    currentHp: 500,
    floorNumber: 2,
    roomInFloor: 4,
    roomType: 'battle_Elite',
    terrainEffect: 'terrain.rejuvenation',
    deityKey: 'Goddess of Restoration',
    deityRank: 4,
    characters: [
      { name: 'Front', firstAidLevel: 1, firstAidHpContribution: 500, thunderResistance: 1 },
      { name: 'Back', firstAidLevel: 2, firstAidHpContribution: 1000, thunderResistance: 1 },
    ],
  });
  assert.equal(result.deityHealAmount, 102);
  assert.equal(result.preContinuationHp, 649);
  assert.deepEqual(result.preContinuationFacts.map((fact) => fact.type), [
    'deity-restoration', 'first-aid', 'first-aid', 'terrain-rejuvenation',
  ]);
  assert.equal(draws.length, 6);
});

test('Leakage selects resistance before its flavor draw', () => {
  const { result, draws } = resolve({ terrainEffect: 'terrain.leakage' });
  assert.equal(result.preContinuationHp, 752);
  assert.equal(result.preContinuationFacts[0]?.type, 'terrain-leakage');
  assert.equal(draws.length, 4);
});

test('wounded retreat is decided before Decay and consumes no Decay flavor draw', () => {
  const { result, draws } = resolve({ currentHp: 300, terrainEffect: 'terrain.decay' });
  assert.equal(result.shouldRetreat, true);
  assert.equal(result.finalHp, 300);
  assert.deepEqual(result.continuationFacts, []);
  assert.equal(draws.length, 3);
});

test('a final room bypasses wounded retreat and applies Decay afterward', () => {
  const { result, draws } = resolve({ currentHp: 300, terrainEffect: 'terrain.decay', isFinalBossRoom: true });
  assert.equal(result.shouldRetreat, false);
  assert.equal(result.preContinuationHp, 300);
  assert.equal(result.finalHp, 280);
  assert.equal(result.continuationFacts[0]?.type, 'terrain-decay');
  assert.equal(draws.length, 4);
});

test('Rotwood blocks elite restoration and emits its fact at the existing position', () => {
  const { result, draws } = resolve({
    floorNumber: 3,
    roomInFloor: 4,
    roomType: 'battle_Elite',
    terrainEffect: 'terrain.rotwood',
    deityKey: 'Goddess of Restoration',
  });
  assert.equal(result.deityHealAmount, undefined);
  assert.deepEqual(result.preContinuationFacts.map((fact) => fact.type), ['terrain-rotwood']);
  assert.equal(draws.length, 4);
});
