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
// Undo/Redo are part of the equipment projection: up to 30 states, most recent first, plus next-step availability.
{
  const { snapshotCharacterEquipment } = await import('../../src/api/v1/equipmentHistoryFacts.ts');
  type Action = { equipmentStates: string[][]; available: boolean; unavailableReason: string | null };
  const target = state.parties[0].characters[0];
  const readEquipment = async (history?: Record<string, { undo: never[]; redo: never[] }>) => (await buildApiV1ReadData(`read/build/character/${target.id}/equipment`, state, {}, { ...context, control: { equipmentHistory: history } }) as {
    validOptions: { numberOfEmptyEquipmentSlots: number; undoEquipment: Action; redoEquipment: Action };
  }).validOptions;
  const options = await readEquipment();
  assert.deepEqual(options.undoEquipment, { equipmentStates: [], available: false, unavailableReason: 'No undo history.' });
  assert.deepEqual(options.redoEquipment, { equipmentStates: [], available: false, unavailableReason: 'No redo history.' });

  const empty = snapshotCharacterEquipment([], 0);
  const same = snapshotCharacterEquipment(target.equipment, 0);
  const key = String(target.id);
  const bareUndo = (await readEquipment({ [key]: { undo: [empty] as never[], redo: [] } })).undoEquipment;
  assert.deepEqual(bareUndo, { equipmentStates: [[]], available: true, unavailableReason: null }, 'restoring a bare state is available');
  assert.equal((await readEquipment({ [key]: { undo: [same] as never[], redo: [] } })).undoEquipment.unavailableReason, 'The undo target matches the current equipment.');
  const unavailable = { ...same, equipment: same.equipment.map((entry, index) => index === 0 ? { ...entry, item: { ...entry.item, id: 999999 } } : entry) };
  const redo = (await readEquipment({ [key]: { undo: [], redo: [unavailable] as never[] } })).redoEquipment;
  assert.equal(redo.available, false);
  assert.equal(redo.unavailableReason, 'The redo target contains unavailable items.');
  assert.equal(redo.equipmentStates.length, 1);
  assert.match(redo.equipmentStates[0][0], /^\d+\/[01]\/999999\/\d\/\d+/);

  // History keeps up to 30 states and lists them most recent first (the order repeated Undo restores them).
  const thirty = Array.from({ length: 30 }, (_, index) => snapshotCharacterEquipment(index === 0 ? [] : target.equipment.slice(0, index % 2), 0));
  const listed = (await readEquipment({ [key]: { undo: thirty as never[], redo: [] } })).undoEquipment;
  assert.equal(listed.equipmentStates.length, 30);
  assert.deepEqual(listed.equipmentStates[29], [], 'the oldest state is last');
  assert.equal(listed.equipmentStates[0].length, thirty[29].equipment.length, 'the most recent state is first');

  const shortArray = { ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, characters: party.characters.map((entry) => entry.id === target.id ? { ...entry, equipment: [] } : entry) } : party) };
  const bare = await buildApiV1ReadData(`read/build/character/${target.id}/equipment`, shortArray, {}, context) as { validOptions: { numberOfEmptyEquipmentSlots: number } };
  assert.ok(bare.validOptions.numberOfEmptyEquipmentSlots > 0, 'empty slots are counted against the real slot count, not the array length');
}
// Item and equipment-entry formats round-trip through master data, so a projection is enough to rebuild a display item.
{
  const { formatEquipmentEntry, parseEquipmentEntry, parseSavedEquipmentSet } = await import('../../src/api/v1/itemFormat.ts');
  const target = state.parties[0].characters[0];
  const equipped = target.equipment.flatMap((item, slot) => item ? [{ item, slot }] : []);
  assert.ok(equipped.length > 0);
  for (const { item, slot } of equipped) {
    const jeweled = { ...item, jewel: { key: 'fort' as const, rank: 3 }, isLocked: true };
    const parsed = parseEquipmentEntry(formatEquipmentEntry(slot, jeweled, true, jeweled.jewel))!;
    assert.equal(parsed.slotIndex, slot);
    assert.equal(parsed.isLocked, true);
    assert.equal(parsed.item.id, item.id);
    assert.equal(parsed.item.name, item.name);
    assert.equal(parsed.item.enhancement, item.enhancement);
    assert.equal(parsed.item.superRare, item.superRare);
    assert.deepEqual(parsed.item.jewel, { key: 'fort', rank: 3 });
  }
  assert.equal(parseEquipmentEntry(0), null);
  assert.equal(parseEquipmentEntry('3/1/999999/0/0'), null, 'an unknown item id does not parse');
  assert.equal(parseEquipmentEntry('3/2/1101/0/0'), null, 'a bad lock flag does not parse');
  assert.equal(parseEquipmentEntry('3/0/1101/0/0/notajewel:2'), null);

  // The saved-set read returns each entry's own lock flag (not the item's) when detail is requested, as a boolean or a string.
  const first = equipped[0];
  const withSet = { ...state, global: { ...state.global, savedEquipmentSets: [{ slot: 4, name: 'Boss', createdAt: Date.UTC(2026, 8, 20), equipment: [{ slotIndex: first.slot, item: { ...first.item, isLocked: false, jewel: { key: 'ward' as const, rank: 2 } }, isLocked: true }] }] } };
  for (const detail of [true, 'true']) {
    const read = await buildApiV1ReadData(`read/build/character/${target.id}/equipmentSet`, withSet, { isEquipmentSetDetail: detail }, context) as { equipmentSets: { equipmentSetId: number; equipmentSet: { name: string; createdAt: string; equipment?: string[] } }[] };
    assert.equal(read.equipmentSets[0].equipmentSet.equipment?.[0], `${first.slot}/1/${first.item.id}/${first.item.enhancement}/${first.item.superRare}/ward:2`);
    const rebuilt = parseSavedEquipmentSet(read.equipmentSets[0]);
    assert.equal(rebuilt.slot, 4);
    assert.equal(rebuilt.equipment[0].isLocked, true);
    assert.equal(rebuilt.equipment[0].item.jewel?.key, 'ward');
    assert.equal(rebuilt.createdAt, Date.UTC(2026, 8, 20));
  }
  const summary = await buildApiV1ReadData(`read/build/character/${target.id}/equipmentSet`, withSet, {}, context) as { equipmentSets: { equipmentSet: { equipment?: string[] } }[] };
  assert.equal(summary.equipmentSets[0].equipmentSet.equipment, undefined, 'the summary omits equipment');
}

// The donation box reports every unlocked god with its real rank and the total needed for the next rank.
{
  const { getDeityRank, getNextRankDonationRequirement } = await import('../../src/game/deity.ts');
  const donated = { ...state, global: { ...state.global, unlockedDeities: ['Goddess of Restoration', 'God of Attrition'], deityDonations: { 'Goddess of Restoration': 1300, 'God of Attrition': 1_000_000_000 } } };
  const box = await buildApiV1ReadData('resources/donationBox', donated, {}, context) as { gods: string[] };
  assert.deepEqual(box.gods, [
    `restoration/${getDeityRank(1300)}/1300/${getNextRankDonationRequirement(1300)}`,
    `attrition/${getDeityRank(1_000_000_000)}/1000000000/MAX`,
  ]);
  assert.equal(getNextRankDonationRequirement(1_000_000_000), null, 'the top rank has no next requirement');
  assert.ok(Number(box.gods[0].split('/')[3]) > 1300, 'the next-rank total is above the current donation');
  const none = { ...state, global: { ...state.global, unlockedDeities: [], deityDonations: {} } };
  assert.deepEqual((await buildApiV1ReadData('resources/donationBox', none, {}, context) as { gods: string[] }).gods, []);
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
