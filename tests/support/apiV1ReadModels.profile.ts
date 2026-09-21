import assert from 'node:assert/strict';
import { buildApiV1ReadData } from '../../src/api/v1/readModels.ts';
import { createFreshGameState } from '../../src/hooks/useGameState.ts';

const state = createFreshGameState('en', Date.UTC(2026, 8, 20));
const before = structuredClone(state);
const calls: Array<{ partyIndex: number; count: number }> = [];
const context = {
  revision: 7,
  environment: 'desktop',
  gameMode: 'mode.normal' as const,
  enemyLevelOffset: 5,
  inGameTime: Date.UTC(2026, 8, 20),
  simulation: async (partyIndex: number, count: number) => {
    calls.push({ partyIndex, count });
    return { total: count, Clear: count };
  },
};

await buildApiV1ReadData('read/observation/compact', state, {}, context);
assert.deepEqual(calls, state.parties.map((_, partyIndex) => ({ partyIndex, count: 100 })));
calls.length = 0;
const full = await buildApiV1ReadData('read/expedition/1/simulationRun', state, {}, context);
assert.deepEqual(calls, [{ partyIndex: 0, count: 1_000 }]);
assert.equal(full.simulatedRevision, 7);
// Undo/Redo availability is part of the equipment projection and follows the shared history facts.
{
  const { snapshotCharacterEquipment } = await import('../../src/api/v1/equipmentHistoryFacts.ts');
  const target = state.parties[0].characters[0];
  const readEquipment = async (history?: Record<string, { undo: never[]; redo: never[] }>) => (await buildApiV1ReadData(`read/build/character/${target.id}/equipment`, state, {}, { ...context, control: { equipmentHistory: history } }) as {
    validOptions: { numberOfEmptyEquipmentSlots: number; undoEquipment: { available: boolean; unavailableReason: string | null }; redoEquipment: { available: boolean; unavailableReason: string | null } };
  }).validOptions;
  assert.deepEqual((await readEquipment()).undoEquipment, { available: false, unavailableReason: 'noHistory' });
  assert.deepEqual((await readEquipment()).redoEquipment, { available: false, unavailableReason: 'noHistory' });

  const empty = snapshotCharacterEquipment([], 0);
  assert.deepEqual((await readEquipment({ [String(target.id)]: { undo: [empty] as never[], redo: [] } })).undoEquipment, { available: true, unavailableReason: null }, 'restoring a bare state is available');
  const same = snapshotCharacterEquipment(target.equipment, 0);
  assert.equal((await readEquipment({ [String(target.id)]: { undo: [same] as never[], redo: [] } })).undoEquipment.unavailableReason, 'noChange');
  const unavailable = { ...same, equipment: same.equipment.map((entry, index) => index === 0 ? { ...entry, item: { ...entry.item, id: 999999 } } : entry) };
  assert.equal((await readEquipment({ [String(target.id)]: { undo: [], redo: [unavailable] as never[] } })).redoEquipment.unavailableReason, 'itemsUnavailable');
  const slots = (await readEquipment()).numberOfEmptyEquipmentSlots;
  assert.ok(slots >= 0);
  const shortArray = { ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, characters: party.characters.map((entry) => entry.id === target.id ? { ...entry, equipment: [] } : entry) } : party) };
  const bare = await buildApiV1ReadData(`read/build/character/${target.id}/equipment`, shortArray, {}, context) as { validOptions: { numberOfEmptyEquipmentSlots: number } };
  assert.ok(bare.validOptions.numberOfEmptyEquipmentSlots > 0, 'empty slots are counted against the real slot count, not the array length');
}
assert.deepEqual(state, before);

// calculatedStatus is the public fact model (9.1.4.14), not the internal computed-stats object.
{
  const { Value } = await import('@sinclair/typebox/value');
  const { CalculatedStatusSchema } = await import('../../src/api/v1/contracts.ts');
  const party = await buildApiV1ReadData('read/observation/party', state, {}, context) as { partyInfo: { party: { characters: { characterId: number; calculatedStatus: unknown }[] } } };
  const character = party.partyInfo.party.characters[0];
  const status = await buildApiV1ReadData(`read/build/character/${character.characterId}/status`, state, {}, context) as { calculatedStatus: { stats: { key: string }[]; attacks: { attackType: string; available: boolean; speed: unknown }[] } };
  for (const projected of [character.calculatedStatus, status.calculatedStatus]) {
    assert.equal(Value.Check(CalculatedStatusSchema, projected), true, JSON.stringify([...Value.Errors(CalculatedStatusSchema, projected)].slice(0, 3)));
  }
  assert.deepEqual(status.calculatedStatus, character.calculatedStatus, 'both projections use the same fact model');
  assert.ok(status.calculatedStatus.stats.some((entry) => entry.key === 'b.vitality'));
  assert.deepEqual(status.calculatedStatus.attacks.map((entry) => entry.attackType), ['melee', 'ranged', 'magical']);
  for (const attack of status.calculatedStatus.attacks) assert.equal(attack.available, attack.speed !== null);
  assert.equal('rangedNoA' in (status.calculatedStatus as object), false, 'no internal computed-stats members leak');
}
assert.deepEqual(state, before);
