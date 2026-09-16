import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeCompactBattleEvents, decodeCompactBattleEvents, validateCompactBattleLog } from '../src/game/compactBattleLog.ts';
import type { BattleProtocolEvent } from '../src/game/battleProtocol.ts';
const actor = { id: 101, kind: 'character' as const, name: 'Custom 名', elementalOffense: 'fire' as const, elementalOffenseValue: 1.2, physicalDefense: 50, abilities: [] };
const event: BattleProtocolEvent = { opcode: 'attack', phase: 2, actorKind: 1, actorId: 101, targetId: 101, abilityId: null, attackType: 'magical', flags: 64, timing: 12, hits: 0, attempts: 4, aux0: 3, value0: 0, value1: 1203, value2: 0, aux1: 0, aux2: 0 };
test('sparse events preserve zero hits, fractional facts, target identity and independent reaction/type', () => {
  const facts = [event, { ...event, opcode: 'reflected' as const, value0: 17.5 }, { ...event, opcode: 'absorbed' as const, value1: 40 }];
  const compact = encodeCompactBattleEvents(facts, [actor]);
  assert.deepEqual(decodeCompactBattleEvents(JSON.parse(JSON.stringify(compact))), facts);
  assert.equal(compact.events[0][0], 3);
  assert.equal(JSON.stringify(compact.events).includes('1203'), true);
  assert.equal(JSON.stringify(compact.events).includes('Custom'), false);
});
test('flavor delta keeps explicit zero overrides and does not change the source event', () => {
  const source = { ...event, opcode: 'ability_activated' as const, abilityId: 'burn' as const, value0: 5, aux0: 2 };
  const flavor = { ...source, opcode: 'random_flavor' as const, value0: 0, aux0: 0, aux1: 2 };
  const compact = encodeCompactBattleEvents([source, flavor], [actor]);
  assert.deepEqual(decodeCompactBattleEvents(compact), [source, flavor]);
});
test('unknown compact versions, opcodes, truncated masks, and actor references fail closed', () => {
  const compact = encodeCompactBattleEvents([event], [actor]);
  assert.throws(() => validateCompactBattleLog({ ...compact, version: 2 } as never));
  assert.throws(() => decodeCompactBattleEvents({ ...compact, actors: [] }));
  assert.throws(() => validateCompactBattleLog({ ...compact, events: [[2, 999, 0]] }));
  assert.throws(() => validateCompactBattleLog({ ...compact, events: [[2, 9, 1]] }));
});
