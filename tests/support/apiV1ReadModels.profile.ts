import assert from 'node:assert/strict';
import { buildApiV1ReadData } from '../../src/api/v1/readModels.ts';
import { createFreshGameState } from '../../src/hooks/useGameState.ts';

import { createExpeditionSimulationRoomResults } from '../../src/game/expeditionSimulation.ts';

// A hand-built forecast: room 1 is reached by every run, room 2 by 900, and later rooms by nobody.
function fakeSimulation(total: number) {
  const rooms = createExpeditionSimulationRoomResults(total);
  const first = Math.round(total * 0.9); const draw = Math.round(total * 0.04); const retreat = Math.round(total * 0.02); const defeat = total - first - draw - retreat;
  Object.assign(rooms[0], { Victory: first, Draw: draw, Retreat: retreat, Defeat: defeat, reached: total, NotReached: 0 });
  rooms[0].successfulHp.Full = first;
  rooms[0].retreatHp.From30 = retreat;
  Object.assign(rooms[1], { Clear: first, reached: first, NotReached: total - first });
  for (let index = 2; index < rooms.length; index += 1) rooms[index].NotReached = total;
  return { Clear: first, Return: 0, Draw: draw, Retreat: retreat, Defeat: defeat, total, rooms };
}

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
    return { ...fakeSimulation(count) };
  },
};

await buildApiV1ReadData('read/observation/compact', state, {}, context);
assert.deepEqual(calls, state.parties.map((_, partyIndex) => ({ partyIndex, count: 100 })));
calls.length = 0;
const full = await buildApiV1ReadData('read/expedition/1/simulationRun', state, {}, context);
assert.deepEqual(calls, [{ partyIndex: 0, count: 1_000 }]);
assert.equal(full.simulatedRevision, 7);
{
  // The two compact strings of 9.1.3 and the structured numbers behind them, validated against the published schema.
  const Ajv = (await import('ajv')).default;
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'read/expedition/{p}/simulationRun')!.response.data);
  assert.equal(validate(full), true, JSON.stringify(validate.errors?.slice(0, 2)));
  const data = full as unknown as { runs: number; overview: string; detail: string[]; overviewPercent: Record<string, number>; rooms: { room: number; floorRoom: string; reached: number; notReached: number; victory: number; clear: number; defeat: number }[]; seedDomain: string };
  assert.equal(data.runs, 1_000);
  assert.equal(data.overview, 'Success 90.0% / Draw 4.0% / Retreat 2.0% / Defeat 4.0%');
  assert.deepEqual(data.overviewPercent, { success: 90, clear: 90, return: 0, draw: 4, retreat: 2, defeat: 4 });
  assert.equal(data.detail.length, 24);
  assert.equal(data.detail[0], '1f-1/Success 90.0% / Draw 4.0% / Retreat 2.0% / Defeat 4.0% / Not reached 0.0%');
  assert.equal(data.detail[1], '1f-2/Success 90.0% / Draw 0.0% / Retreat 0.0% / Defeat 0.0% / Not reached 10.0%');
  assert.equal(data.detail[23], '6f-4/Success 0.0% / Draw 0.0% / Retreat 0.0% / Defeat 0.0% / Not reached 100.0%');
  assert.deepEqual(data.rooms.slice(0, 5).map((room) => room.floorRoom), ['1f-1', '1f-2', '1f-3', '1f-4', '2f-1']);
  // Every run is counted exactly once in every room.
  for (const room of data.rooms as unknown as Array<Record<string, number>>) {
    assert.equal(room.reached + room.notReached, 1_000, `room ${room.room} totals`);
    assert.equal(room.victory + room.clear + room.return + room.draw + room.retreat + room.defeat, room.reached, `room ${room.room} outcomes`);
  }
  assert.match(data.seedDomain, /^[0-9a-f-]{36}$/);
  const second = await buildApiV1ReadData('read/expedition/1/simulationRun', state, {}, context) as unknown as { seedDomain: string };
  assert.notEqual(second.seedDomain, data.seedDomain, 'each forecast has its own seed domain');
}
calls.length = 0;
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
  assert.equal(redo.unavailableReason, 'The redo target contains unavailable items or Jewels.');
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
  assert.equal(parseEquipmentEntry('0'), null);
  assert.equal(parseEquipmentEntry('3/1/999999/0/0'), null, 'an unknown item id does not parse');
  assert.equal(parseEquipmentEntry('3/2/1101/0/0'), null, 'a bad lock flag does not parse');
  assert.equal(parseEquipmentEntry('3/0/1101/0/0/notajewel:2'), null);

  // The saved-set read returns each entry's own lock flag (not the item's) when detail is requested, as a boolean or a string.
  const first = equipped[0];
  const withSet = { ...state, global: { ...state.global, savedEquipmentSets: [{ slot: 4, name: 'Boss', createdAt: Date.UTC(2026, 8, 20), equipment: [{ slotIndex: first.slot, item: { ...first.item, isLocked: false, jewel: { key: 'ward' as const, rank: 2 } }, isLocked: true }] }] } };
  for (const detail of [true, 'true']) {
    const read = await buildApiV1ReadData(`read/build/character/${target.id}/equipmentSet`, withSet, { isEquipmentSetDetail: detail }, context) as {
      equipmentSets: { equipmentSetId: number; equipmentSet: { name: string; createdAt: string; equipment?: string[]; availability: { allAvailable: boolean; entries: Array<{ slotIndex: number; item: string; available: boolean; unavailableReason: string | null }> } } }[];
    };
    assert.equal(read.equipmentSets[0].equipmentSet.equipment?.[0], `${first.slot}/1/${first.item.id}/${first.item.enhancement}/${first.item.superRare}`, 'saved sets carry no Jewel');
    const rebuilt = parseSavedEquipmentSet(read.equipmentSets[0]);
    assert.equal(rebuilt.slot, 4);
    assert.equal(rebuilt.equipment[0].isLocked, true);
    assert.equal(rebuilt.equipment[0].item.jewel, null);
    assert.equal(rebuilt.createdAt, Date.UTC(2026, 8, 20));
    assert.equal(read.equipmentSets[0].equipmentSet.availability.allAvailable, true);
    assert.deepEqual(read.equipmentSets[0].equipmentSet.availability.entries, [{
      slotIndex: first.slot,
      item: `${first.slot}/1/${first.item.id}/${first.item.enhancement}/${first.item.superRare}`,
      available: true,
      unavailableReason: null,
    }]);
    assert.equal(rebuilt.availability.entries[0].available, true);
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
// searchItems (9.1.3, 2-4-1): filters, states, formats, base power, sort order, limit, details, and Jewels.
{
  const { parseInventoryStacks, parseJewelStacks } = await import('../../src/api/v1/itemFormat.ts');
  const { getItemBasePower, getItemDisplayMultiplier } = await import('../../src/game/itemPower.ts');
  const { getVariantKey } = await import('../../src/types/index.ts');
  const target = state.parties[0].characters[0];
  const equippedArmor = target.equipment.findIndex((item) => item?.category === 'armor');
  const withJewels = { ...state, global: { ...state.global, jewels: { 'fort:3': 2, 'might:1': 1, 'ward:2': 0 } },
    parties: state.parties.map((party, index) => index === 0 ? { ...party, characters: party.characters.map((entry) => entry.id === target.id ? { ...entry, equipment: entry.equipment.map((item, slot) => slot === equippedArmor && item ? { ...item, jewel: { key: 'fort' as const, rank: 4 } } : item) } : entry) } : party) };
  type Search = { items: string[] };
  const search = async (parameters: Record<string, unknown>, from = withJewels) => (await buildApiV1ReadData('read/base/searchItems', from, { details: 'none', limit: 5000, ...parameters }, context) as Search).items;

  const owned = Object.values(state.global.inventory).filter((variant) => variant.status === 'owned' && variant.count > 0);
  assert.ok(owned.length > 3, 'the fresh state owns several variants');
  const all = await search({});
  assert.equal(all.length, owned.length, 'category is optional: omitting it searches every equipment category');

  // Format: <Item Format>/<quantity>/<calculatedBasePower>, sorted by higher base power, then higher item id.
  const powerOf = (stack: string) => Number(stack.split('/')[5]);
  const idOf = (stack: string) => Number(stack.split('/')[1]);
  for (let index = 1; index < all.length; index += 1) {
    const [previous, current] = [all[index - 1], all[index]];
    assert.ok(powerOf(previous) > powerOf(current) || (powerOf(previous) === powerOf(current) && idOf(previous) >= idOf(current)), `${previous} sorts before ${current}`);
  }
  for (const variant of owned) {
    const stack = all.find((entry) => entry.startsWith(`0/${variant.item.id}/${variant.item.enhancement}/${variant.item.superRare}/`))!;
    assert.equal(stack, `0/${variant.item.id}/${variant.item.enhancement}/${variant.item.superRare}/${variant.count}/${getItemBasePower(variant.item)}`);
  }
  const rebuilt = parseInventoryStacks(all);
  assert.equal(Object.keys(rebuilt).length, owned.length);
  for (const variant of owned) assert.equal(rebuilt[getVariantKey(variant.item)].count, variant.count);

  // Base power is the category's defining d. stat, scaled like the Inventory (no character bonus).
  const armor = owned.find((variant) => variant.item.category === 'armor')!.item;
  assert.equal(getItemBasePower(armor), Math.round((armor.physicalDefense ?? 0) * getItemDisplayMultiplier(armor)));
  const enhanced = { ...armor, enhancement: 3 };
  assert.ok(getItemBasePower(enhanced) > getItemBasePower(armor), 'enhancement raises the calculated base power');
  const jeweledArmor = { ...armor, jewel: { key: 'fort' as const, rank: 3 } };
  assert.ok(getItemBasePower(jeweledArmor) > getItemBasePower(armor), 'an attached Jewel adds its d. value for that stat');
  const shield = owned.find((variant) => variant.item.category === 'shield')?.item;
  if (shield) assert.equal(getItemBasePower(shield), Math.round((shield.partyHP ?? 0) * getItemDisplayMultiplier(shield)), 'a shield reports HP');
  const gauntlet = owned.find((variant) => variant.item.category === 'gauntlet')?.item;
  if (gauntlet) assert.equal(getItemBasePower(gauntlet), Math.round((gauntlet.meleeNoA ?? 0) * getItemDisplayMultiplier(gauntlet) * 100) / 100, 'a gauntlet reports its scaled melee NoA');
  const katana = owned.find((variant) => variant.item.category === 'katana')?.item;
  if (katana) assert.equal(getItemBasePower(katana), Math.round((katana.meleeAttack ?? 0) * getItemDisplayMultiplier(katana)), 'a katana reports melee attack, not its NoA penalty');

  // limit: default 10, applied after filtering and sorting; out-of-range values are rejected.
  const defaultLimit = (await buildApiV1ReadData('read/base/searchItems', withJewels, { details: 'none' }, context) as Search).items;
  assert.equal(defaultLimit.length, Math.min(10, owned.length), 'the default limit is 10');
  assert.deepEqual(defaultLimit, all.slice(0, defaultLimit.length), 'limit takes the top of the sorted result');
  assert.deepEqual(await search({ limit: 2 }), all.slice(0, 2));
  for (const limit of [0, -1, 5001, 1.5]) await assert.rejects(() => buildApiV1ReadData('read/base/searchItems', withJewels, { limit }, context), /invalid_request/, `limit ${limit}`);

  const first = owned[0].item;
  assert.equal((await search({ itemId: first.id })).every((stack) => idOf(stack) === first.id), true);
  const categoryOf = (api: string) => ({ bow: 'archery', glove: 'gauntlet', book: 'grimoire', sword: 'sword' } as Record<string, string>)[api];
  for (const api of ['sword', 'bow', 'glove', 'book']) {
    for (const stack of await search({ category: api })) assert.equal(Object.values(parseInventoryStacks([stack]))[0].item.category, categoryOf(api));
  }
  assert.equal((await search({ rarity: 'bossRare' })).length, 0, 'a fresh state owns no boss rare items');
  assert.equal((await search({ superRare: 'true' })).length, 0);
  assert.equal((await search({ superRare: true })).length, 0);
  assert.equal((await search({ superRare: false })).length, owned.length);
  assert.equal((await search({ state: 'sold' })).length, 0);

  // Character-assigned items: <Item Format>/<characterId>/<jewelType>:<jewelRank>/<calculatedBasePower>.
  const equippedList = await search({ state: 'equipped' });
  const equippedCount = state.parties.flatMap((party) => party.characters).flatMap((character) => character.equipment.filter(Boolean)).length;
  assert.equal(equippedList.length, equippedCount);
  for (const entry of equippedList) assert.match(entry, /^[01]\/\d+\/[0-6]\/\d+\/\d+\/(?:0:0|[a-z]+:[1-8])\/-?\d+(?:\.\d+)?$/);
  const armorEntry = equippedList.find((entry) => entry.includes('/fort:4/'));
  assert.ok(armorEntry, 'the attached Jewel is reported');
  assert.equal(armorEntry!.split('/')[4], String(target.id));
  assert.equal(Number(armorEntry!.split('/')[6]), getItemBasePower({ ...target.equipment[equippedArmor]!, jewel: { key: 'fort', rank: 4 } }), 'the Jewel adds to the assigned item power');
  assert.equal((await search({ state: 'all' })).length, owned.length + equippedCount, 'all lists stacks and character-assigned items');
  const equippedPowers = equippedList.map((entry) => Number(entry.split('/')[6]));
  assert.deepEqual(equippedPowers, [...equippedPowers].sort((left, right) => right - left), 'character-assigned items sort by higher power first');

  // The jewel category: unassigned stacks sort by higher rank, then higher Jewel type; assigned Jewels are character-assigned items.
  const unassigned = await search({ category: 'jewel' });
  assert.deepEqual(unassigned, ['fort:3/2', 'might:1/1'], 'higher rank first');
  assert.deepEqual(parseJewelStacks(unassigned), { 'fort:3': 2, 'might:1': 1 });
  const sameRank = { ...withJewels, global: { ...withJewels.global, jewels: { 'might:2': 1, 'fort:2': 1, 'focus:2': 1 } } };
  assert.deepEqual(await search({ category: 'jewel' }, sameRank), ['focus:2/1', 'fort:2/1', 'might:2/1'], 'equal rank: higher Jewel type (specification order) first');
  const assigned = await search({ category: 'jewel', state: 'equipped' });
  assert.equal(assigned.length, 1);
  assert.match(assigned[0], /\/fort:4\/-?\d+/);
  assert.equal((await search({ category: 'jewel', state: 'all' })).length, 3);
  assert.deepEqual(await search({ category: 'jewel', state: 'sold' }), []);
  assert.deepEqual(await search({ category: 'jewel', rarity: 'bossRare' }), [], 'item filters exclude unassigned Jewels');

  // Details follow the base format, in the fixed order ability, cBonus, otherBonus.
  const sample = Object.values(state.global.inventory).find((variant) => variant.item.id === 1104)!;
  const sampleFormat = `0/${sample.item.id}/${sample.item.enhancement}/${sample.item.superRare}/${sample.count}/${getItemBasePower(sample.item)}`;
  const detailed = async (details: string) => (await search({ itemId: 1104, details }))[0];
  assert.equal(await detailed('none'), sampleFormat);
  assert.equal(await detailed('ability'), `${sampleFormat}/ability=[]`);
  assert.equal(await detailed('cBonus'), `${sampleFormat}/cBonus=[c.accuracy+0.001, c.melee-attack+23]`);
  assert.equal(await detailed('otherBonus'), `${sampleFormat}/otherBonus=[d.melee_attack:14]`);
  assert.equal(await detailed('abilityAndCBonus'), `${sampleFormat}/ability=[]/cBonus=[c.accuracy+0.001, c.melee-attack+23]`);
  assert.equal(await detailed('all'), `${sampleFormat}/ability=[]/cBonus=[c.accuracy+0.001, c.melee-attack+23]/otherBonus=[d.melee_attack:14]`);
  const defaulted = (await buildApiV1ReadData('read/base/searchItems', withJewels, { itemId: 1104 }, context) as Search).items[0];
  assert.equal(defaulted, `${sampleFormat}/ability=[]/cBonus=[c.accuracy+0.001, c.melee-attack+23]`, 'the default details are abilityAndCBonus');
  assert.equal((await search({ category: 'jewel', details: 'all' }))[0], 'fort:3/2/ability=[]/cBonus=[c.physical-defense+11]/otherBonus=[d.physical_defense:10, d.HP:10]', 'a rank-3 Jewel reports its rank bonuses');

  // searchAbility and searchBonus filter on the same ids the details report.
  const { describeItem } = await import('../../src/api/v1/itemDetails.ts');
  const { getItemById } = await import('../../src/data/items.ts');
  const pursuit = { ...getItemById(1304)!, enhancement: 0, superRare: 0 };
  assert.deepEqual(describeItem(pursuit).ability, ['a.pursuit']);
  assert.deepEqual(describeItem({ ...getItemById(1313)!, enhancement: 0, superRare: 0 }).cBonus, ['c.physical-defense-x2/3']);
  assert.deepEqual(describeItem({ ...getItemById(2303)!, enhancement: 0, superRare: 0 }).otherBonus, ['d.melee_attack:43', 'e.ice+0.020']);
  assert.deepEqual(describeItem({ ...getItemById(4313)!, enhancement: 0, superRare: 0 }).cBonus, ['c.penet+0.16']);
  const withPursuit = { ...state, global: { ...state.global, inventory: { ...state.global.inventory, [getVariantKey(pursuit)]: { item: pursuit, count: 2, status: 'owned' as const } } } };
  assert.deepEqual((await search({ searchAbility: 'a.pursuit' }, withPursuit)).map((stack) => stack.split('/')[1]), ['1304']);
  assert.deepEqual((await search({ searchBonus: 'c.melee-attack+23' })).every((stack) => idOf(stack) === 1104), true);
  assert.deepEqual(await search({ searchAbility: 'a.does-not-exist' }), []);
}
// The party observation carries what the Party tab needs, validates against the published schema, and rebuilds the view.
{
  const { default: Ajv } = await import('ajv');
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const { buildPartySummaries, buildPartyView } = await import('../../src/api/v1/partyView.ts');
  const { getDeityNameFromId } = await import('../../src/game/deity.ts');
  const party = state.parties[0];
  const observation = await buildApiV1ReadData('read/observation/party', state, { partyNumber: party.id }, context) as { partyInfo: never };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'read/observation/party')!.response.data);
  assert.equal(validate(observation), true, JSON.stringify(validate.errors));

  const projection = (observation as { partyInfo: Parameters<typeof buildPartyView>[0] }).partyInfo;
  const view = buildPartyView(projection);
  assert.equal(view.id, party.id);
  assert.equal(view.level, party.level);
  assert.equal(view.experience, party.experience);
  assert.equal(view.experienceToNext, party.level < 69 ? Math.ceil((await import('../../src/game/partyLevel.ts')).getXpToNextLevel(party.level)) : 0, 'experience to the next level is published');
  assert.deepEqual(projection.unlockedMimorianEnemyIds, state.global.unlockedMimorianEnemyIds, 'the unlocked Mimorian forms are published');
  assert.equal(view.maxHp, projection.party.maxHp);
  assert.ok(view.maxHp > 0, 'the maximum party HP is projected');
  assert.equal(view.deity.name, getDeityNameFromId(projection.party.deityId) ?? 'None');
  assert.equal(view.characters.length, party.characters.length);
  view.characters.forEach((rebuilt, index) => {
    const original = party.characters[index];
    for (const key of ['id', 'name', 'gender', 'raceId', 'mainClassId', 'subClassId', 'lineageId', 'predispositionId'] as const) assert.equal(rebuilt[key], original[key], key);
    assert.equal(Boolean(rebuilt.isUnique), Boolean(original.isUnique), 'the unique flag is projected');
    assert.equal(rebuilt.autoEquipmentMode, original.autoEquipmentMode);
    assert.equal(rebuilt.mimorianEnemyId, original.mimorianEnemyId);
    assert.equal(rebuilt.equipment.length, original.equipment.length);
    original.equipment.forEach((item, slot) => {
      const back = rebuilt.equipment[slot];
      if (!item) return assert.equal(back, null);
      assert.ok(back);
      assert.deepEqual([back.id, back.name, back.enhancement, back.superRare, back.isLocked === true, back.jewel ?? null], [item.id, item.name, item.enhancement, item.superRare, item.isLocked === true, item.jewel ?? null], `slot ${slot}`);
    });
  });
  assert.ok(view.characters.some((character) => character.isUnique), 'the fixture party has a unique member');

  // The summaries list every party with its deity and member identities, including Mimorian forms.
  const withMimorian = { ...state, parties: state.parties.map((entry, index) => index === 0 ? { ...entry, characters: entry.characters.map((character, slot) => slot === 1 ? { ...character, raceId: 'mimorian' as const, mimorianEnemyId: 193 } : character) } : entry) };
  const both = await buildApiV1ReadData('read/observation/party', withMimorian, { partyNumber: party.id }, context) as { partyInfo: Parameters<typeof buildPartyView>[0] };
  assert.equal(validate(both), true, JSON.stringify(validate.errors));
  const summaries = buildPartySummaries(both.partyInfo);
  assert.equal(summaries.length, state.parties.length);
  assert.deepEqual(summaries[0].characters.map((character) => character.name), party.characters.map((character) => character.name));
  assert.equal(summaries[0].characters[1].mimorianEnemyId, 193);
  assert.equal(summaries[0].characters[0].mimorianEnemyId, undefined);
  assert.equal(summaries[0].deity.name, view.deity.name);
}
// The API speaks Clear, Return, Draw, Retreat, and Defeat (as the Simulation Run does); the runtime's stored and canonical
// Clear-Gate names never appear in a response.
{
  const { apiExpeditionOutcome, apiExpeditionOutcomeOrNull } = await import('../../src/api/v1/expeditionOutcome.ts');
  const room = (outcome: 'victory' | 'draw' | 'defeat') => ({ room: 1, outcome, enemyName: 'x', enemyHP: 1, enemyAttackValues: '', damageDealt: 0, damageTaken: 0, remainingPartyHP: 1, maxPartyHP: 1, details: [] }) as never;
  const log = (finalOutcome: 'Clear' | 'Return' | 'Retreat' | 'Defeat', last: 'victory' | 'draw' | 'defeat') => ({ finalOutcome, entries: [room('victory'), room(last)] });
  assert.equal(apiExpeditionOutcome(log('Clear', 'victory')), 'Clear');
  assert.equal(apiExpeditionOutcome(log('Return', 'victory')), 'Return');
  assert.equal(apiExpeditionOutcome(log('Retreat', 'draw')), 'Draw', 'a retreat that ended in a draw is a Draw');
  assert.equal(apiExpeditionOutcome(log('Retreat', 'victory')), 'Retreat', 'a retreat after a victory is a Retreat');
  assert.equal(apiExpeditionOutcome(log('Defeat', 'defeat')), 'Defeat');
  assert.equal(apiExpeditionOutcome({ finalOutcome: 'Retreat', entries: [] }), 'Retreat');
  assert.equal(apiExpeditionOutcomeOrNull(null), null);
  const withLog = (finalOutcome: 'Clear' | 'Return' | 'Retreat' | 'Defeat', last: 'victory' | 'draw') => ({ ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, lastExpeditionLog: { ...log(finalOutcome, last), dungeonId: 1, dungeonName: '', difficultyOffset: 0, totalExperience: 0, totalRooms: 24, completedRooms: 2, rewards: [], autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 1, maxPartyHP: 1 } as never } : party) });
  for (const [stored, last, expected] of [['Clear', 'victory', 'Clear'], ['Return', 'victory', 'Return'], ['Retreat', 'draw', 'Draw'], ['Retreat', 'victory', 'Retreat'], ['Defeat', 'victory', 'Defeat']] as const) {
    const source = withLog(stored, last === 'victory' ? 'victory' : 'draw');
    const compact = await buildApiV1ReadData('read/observation/compact', source, {}, context) as unknown as { partyInfo: { lastOutcome: string | null }[] };
    assert.equal(compact.partyInfo[0].lastOutcome, expected, `compact ${stored}/${last}`);
    const expedition = await buildApiV1ReadData('read/observation/expedition', source, {}, context) as unknown as { expeditionInfo: { parties: { disclosedOutcome: string | null }[] } };
    assert.equal(expedition.expeditionInfo.parties[0].disclosedOutcome, expected, `expedition ${stored}/${last}`);
    const battle = await buildApiV1ReadData('read/expedition/1/latestBattleLog', source, {}, context) as unknown as { battleLog: { finalOutcome: string } };
    assert.equal(battle.battleLog.finalOutcome, expected, `battle log ${stored}/${last}`);
  }
}
// Saves written before the outcome names were unified (`Escape`, `Turned_Back`, `Draw_Retreat`, `Wounded_Retreat`) load with the
// current names, from any load path (they all go through hydration).
{
  const { hydrateGameState } = await import('../../src/game/saveCodec.ts');
  const { upgradeLegacyOutcomeKeys } = await import('../../src/game/legacyOutcomeKeys.ts');
  assert.deepEqual(upgradeLegacyOutcomeKeys({ Clear: 1, Turned_Back: 2, Draw_Retreat: 3, Wounded_Retreat: 4, Defeat: 5, donatedGold: 6 }), { Clear: 1, Return: 2, Draw: 3, Retreat: 4, Defeat: 5, donatedGold: 6 });
  assert.deepEqual(upgradeLegacyOutcomeKeys({ Return: 9, Turned_Back: 2 }), { Return: 9 }, 'a current key wins over a legacy one');
  assert.equal(upgradeLegacyOutcomeKeys(null), null);
  const legacyLog = { finalOutcome: 'Escape', entries: [], dungeonId: 1, dungeonName: '', difficultyOffset: 0, totalExperience: 0, totalRooms: 24, completedRooms: 3, rewards: [], autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 1, maxPartyHP: 1 };
  const legacy = JSON.parse(JSON.stringify({ ...state, parties: state.parties.map((party, index) => index === 0 ? {
    ...party,
    expeditionStats: { Clear: 1, Turned_Back: 2, Draw_Retreat: 3, Wounded_Retreat: 4, Defeat: 5, donatedGold: 0, savedGold: 0 },
    lastExpeditionLog: legacyLog,
    pendingDiaryLog: { id: 'p', expeditionLog: legacyLog, triggers: [], createdAt: 0, isRead: false },
    diaryLogs: [{ id: 'd', expeditionLog: legacyLog, triggers: [], createdAt: 0, isRead: false }],
  } : party) }));
  const loaded = hydrateGameState(legacy);
  const first = loaded.parties[0];
  assert.deepEqual([first.expeditionStats.Return, first.expeditionStats.Draw, first.expeditionStats.Retreat], [2, 3, 4]);
  assert.equal('Turned_Back' in first.expeditionStats, false);
  assert.deepEqual([first.lastExpeditionLog?.finalOutcome, first.pendingDiaryLog?.expeditionLog.finalOutcome, first.diaryLogs[0].expeditionLog.finalOutcome], ['Return', 'Return', 'Return']);
}
// The live party cycle and the disclosed log (Spec 8.3, Update Timing): the real state and its clock are projected for the ordinary
// player's runtime, and while a party explores the previous log is what any client sees, so the running result is not spoiled.
{
  const room = (floor: number, outcome: 'victory' | 'defeat' | 'draw') => ({ room: floor, floor, roomInFloor: 1, roomType: 'battle_Normal', outcome, enemyName: 'x', enemyHP: 1, enemyAttackValues: '', damageDealt: 0, damageTaken: 0, remainingPartyHP: 1, maxPartyHP: 1, details: [] }) as never;
  const log = (finalOutcome: 'Clear' | 'Return' | 'Retreat' | 'Defeat', floor: number, last: 'victory' | 'draw' | 'defeat' = 'victory') => ({ finalOutcome, entries: [room(floor, last)], dungeonId: 1, dungeonName: '', difficultyOffset: 0, totalExperience: 0, totalRooms: 24, completedRooms: floor, rewards: [], autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 1, maxPartyHP: 1 }) as never;
  const running = log('Defeat', 5, 'defeat');           // the exploration in progress (already resolved by the engine)
  const previous = log('Return', 2);                    // what the player saw before it started
  const source = { ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, lastExpeditionLog: running } : party) };
  const startedAt = Date.UTC(2026, 8, 21, 1, 2, 3);
  const live = { ...context, partyCycle: () => ({ state: 'explore', stateStartedAt: startedAt, durationMs: 60_000 }), disclosedLog: (index: number) => index === 0 ? previous : undefined, chargeDurationScale: 1 };
  const expedition = await buildApiV1ReadData('read/observation/expedition', source, {}, live) as unknown as { expeditionInfo: { parties: Record<string, unknown>[] } };
  const first = expedition.expeditionInfo.parties[0];
  assert.equal(first.state, 'state.explore');
  assert.equal(first.stateStartedAt, new Date(startedAt).toISOString());
  assert.equal(first.stateDurationMs, 60_000);
  assert.equal(first.stateExpectedEndAt, new Date(startedAt + 60_000).toISOString());
  assert.equal(first.disclosedFloor, 2, 'the floor of the running exploration is not disclosed');
  assert.equal(first.disclosedOutcome, 'Return', 'the outcome of the running exploration is not disclosed');
  const idle = await buildApiV1ReadData('read/observation/expedition', source, {}, { ...live, partyCycle: () => ({ state: 'idle', stateStartedAt: startedAt, durationMs: 1000 }) }) as unknown as { expeditionInfo: { parties: Record<string, unknown>[] } };
  assert.equal(idle.expeditionInfo.parties[0].state, 'state.idle');
  assert.equal(idle.expeditionInfo.parties[0].stateStartedAt, null, 'an idle party has no state clock');
  const compact = await buildApiV1ReadData('read/observation/compact', source, {}, live) as unknown as { partyInfo: { state: string; lastOutcome: string | null }[] };
  assert.deepEqual([compact.partyInfo[0].state, compact.partyInfo[0].lastOutcome], ['state.explore', 'Return']);
  const battle = await buildApiV1ReadData('read/expedition/1/latestBattleLog', source, {}, live) as unknown as { battleLog: { finalOutcome: string; rooms: { room: number }[] } };
  assert.deepEqual([battle.battleLog.finalOutcome, battle.battleLog.rooms[0].room], ['Return', 2], 'the latest log is the disclosed one');
  // Once the party is no longer exploring the newest log is disclosed.
  const done = { ...live, partyCycle: () => ({ state: 'return', stateStartedAt: startedAt, durationMs: 1000 }), disclosedLog: () => running };
  const after = await buildApiV1ReadData('read/observation/expedition', source, {}, done) as unknown as { expeditionInfo: { parties: Record<string, unknown>[] } };
  assert.deepEqual([after.expeditionInfo.parties[0].state, after.expeditionInfo.parties[0].disclosedOutcome, after.expeditionInfo.parties[0].disclosedFloor], ['state.return', 'Defeat', 5]);
  // No runtime memory (an API account): the newest log, and the resume state of Spec 5.1.1.
  const account = await buildApiV1ReadData('read/observation/expedition', source, {}, context) as unknown as { expeditionInfo: { parties: Record<string, unknown>[] } };
  assert.equal(account.expeditionInfo.parties[0].disclosedOutcome, 'Defeat');
  assert.equal(account.expeditionInfo.parties[0].stateStartedAt, null);
  const hurt = { ...source, parties: source.parties.map((party, index) => index === 0 ? { ...party, currentHp: 1 } : party) };
  const resumed = await buildApiV1ReadData('read/observation/expedition', hurt, {}, context) as unknown as { expeditionInfo: { parties: { state: string }[] } };
  assert.equal(resumed.expeditionInfo.parties[0].state, 'state.rest', 'below maximum HP an account party rests');
}
// Server-gated exploration, step progress, goals, and controls of the Expedition projection (Spec 8.3, 9.1.4.7).
{
  const { computePartyStats } = await import('../../src/game/partyComputation.ts');
  const { default: Ajv } = await import('ajv');
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'read/observation/expedition')!.response.data);
  type Info = { expeditionInfo: { parties: Record<string, any>[] } };
  const read = async (source: typeof state, cycle: Record<string, unknown> | undefined, extra: Record<string, unknown> = {}) => {
    const result = await buildApiV1ReadData('read/observation/expedition', source, {}, { ...context, ...(cycle ? { partyCycle: () => cycle } : {}), chargeDurationScale: 1, ...extra } as never) as unknown as Info;
    assert.equal(validate(result), true, JSON.stringify(validate.errors));
    return result.expeditionInfo.parties[0];
  };
  const withParty = (changes: Record<string, unknown>) => ({ ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, ...changes } : party) }) as typeof state;
  const maximumHp = computePartyStats(state.parties[0]).partyStats.hp;
  const entry = (room: number, outcome: string, remainingPartyHP: number) => ({ room, floor: 1, roomInFloor: room, roomType: 'battle_Normal', enemyId: 100 + room, outcome, enemyName: 'x', enemyHP: 1, enemyAttackValues: '', damageDealt: 0, damageTaken: 0, startPartyHP: room === 1 ? maximumHp : undefined, remainingPartyHP, maxPartyHP: maximumHp, details: [] });
  const log = { finalOutcome: 'Defeat', entries: [entry(1, 'victory', maximumHp * 0.9), entry(2, 'victory', maximumHp * 0.8), entry(3, 'victory', maximumHp * 0.5), entry(4, 'defeat', 0)], dungeonId: 1, dungeonName: '', difficultyOffset: 0, totalExperience: 0, totalRooms: 24, completedRooms: 4, rewards: [], autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 0, maxPartyHP: maximumHp } as never;
  const charged = withParty({ lastExpeditionLog: log, currentHp: 0, instantExpeditionStock: 3, instantExpeditionChargeStartedAt: null });
  // A frozen clock: the projection reads Date.now(), and a loaded machine must not move a reveal boundary.
  const now = Date.now();
  const realNow = Date.now;
  Date.now = () => now;

  // Two of four rooms are revealed after 1.5 of 4 seconds: the projection carries those rooms and their HP, never a later one.
  const midway = await read(charged, { state: 'explore', stateStartedAt: now - 1500, durationMs: 4000 });
  assert.equal(midway.exploration.revealedRoomCount, 2);
  assert.deepEqual(midway.exploration.rooms.map((room: { room: number }) => room.room), [1, 2]);
  assert.equal(midway.currentHp, maximumHp * 0.8, 'the displayed HP is the last revealed room, not the final HP');
  assert.equal(midway.progress.kind, 'stepBased');
  assert.deepEqual([midway.progress.completedSteps, midway.progress.totalSteps], [2, 24]);
  assert.ok(Date.parse(midway.exploration.nextRevealAt) > now && Date.parse(midway.exploration.nextRevealAt) <= now + 600, 'the next room appears within its own step');
  assert.equal(JSON.stringify(midway).includes('defeat'), false, 'the defeat in room 4 is not disclosed');
  assert.equal(midway.controls.sortie.available, true, 'available while the revealed HP is above zero');
  const start = await read(charged, { state: 'explore', stateStartedAt: now + 60_000, durationMs: 4000 });
  assert.equal(start.exploration.revealedRoomCount, 0);
  assert.equal(start.currentHp, maximumHp, 'before the first room the HP is the estimated starting HP');
  // Once the last room is revealed the party is exhausted and the button says so; a stopped exploration has no more reveals.
  const finished = await read(charged, { state: 'explore', stateStartedAt: now - 4000, durationMs: 4000 });
  assert.deepEqual([finished.exploration.revealedRoomCount, finished.currentHp, finished.exploration.nextRevealAt], [4, 0, null]);
  assert.equal(finished.controls.sortie.unavailableReason, 'party_exhausted');
  // A party without a live cycle (an API account) has no clock, progress, or running exploration.
  const account = await read(charged, undefined);
  assert.deepEqual([account.progress, account.exploration], [null, null]);

  // Rest counts whole heal Steps; sell counts items; continuous states have only a percentage.
  const healPerStep = Math.max(200, Math.ceil(maximumHp * 0.02));
  const resting = await read(withParty({ currentHp: maximumHp - healPerStep * 2 }), { state: 'rest', stateStartedAt: now - 500, durationMs: 1000, restInitialTotalSteps: 5 });
  assert.deepEqual([resting.progress.kind, resting.progress.completedSteps, resting.progress.totalSteps], ['stepBased', 3, 5]);
  assert.equal(Date.parse(resting.progress.subProgress.endsAt) - Date.parse(resting.progress.subProgress.startedAt), 1000);
  const selling = await read(withParty({ lastExpeditionLog: { ...log, autoSellItems: [{}, {}, {}, {}] } }), { state: 'sell', stateStartedAt: now - 1500, durationMs: 4000 });
  assert.deepEqual([selling.progress.completedSteps, selling.progress.totalSteps], [1, 4]);
  const moving = await read(state, { state: 'move', stateStartedAt: now - 500, durationMs: 1000 });
  assert.deepEqual([moving.progress.kind, moving.progress.totalSteps, moving.progress.subProgress], ['continuous', null, null]);
  assert.equal(Math.round(moving.progress.mainPercent), 50);
  const idle = await read(state, { state: 'idle', stateStartedAt: now, durationMs: 1000 });
  assert.equal(idle.progress, null, 'idle has no bar');

  // Goals: the first locked Elite gate of the selected destination, from the shared goal selection, and the side quest.
  assert.deepEqual(idle.clearGates.map((gate: { kind: string }) => gate.kind), ['eliteGate']);
  assert.equal(idle.clearGates[0].current, 0);
  assert.equal(idle.sideQuest, null);
  const quest = await read(withParty({ sideQuest: { id: 3, type: 'q.exercise', target: 10, progress: 4, assignedAt: now, expiresAt: now + 3_600_000 } }), undefined);
  assert.deepEqual([quest.sideQuest.type, quest.sideQuest.percent, quest.sideQuest.hasDeadline], ['q.exercise', 40, true]);

  // Controls carry the reason; the reasons follow the commit's own order.
  const noCharge = await read(withParty({ instantExpeditionStock: 0, instantExpeditionChargeStartedAt: now }), undefined);
  assert.equal(noCharge.controls.sortie.unavailableReason, 'charge_insufficient');
  assert.equal(noCharge.controls.godsBattle.unavailableReason, 'gods_battle_unavailable', 'a Gods Battle without its gate reports the gate first');
  const locked = await read(withParty({ selectedDungeonId: 2, instantExpeditionStock: 3, instantExpeditionChargeStartedAt: null }), undefined);
  assert.equal(locked.controls.sortie.unavailableReason, 'entry_gate_locked');
  const colosseum = await read(withParty({ selectedDungeonId: 99, currentHp: 0, instantExpeditionStock: 0, instantExpeditionChargeStartedAt: now }), undefined);
  assert.deepEqual(colosseum.controls.sortie, { available: true, unavailableReason: null }, 'the Colosseum needs no HP, charge, or gate');

  // The pane's view of an exploring party is its running exploration, never the disclosed previous log (Build 78 regression:
  // the tab showed the previous expedition's rooms while a new one ran), and it is rendered from the API response alone:
  // the game state's retained logs are not an input to the view (Spec 9.1.3, 2-2-2 `resources`).
  {
    const { buildPartyExpeditionLogView } = await import('../../src/api/v1/expeditionLogView.ts');
    const previousEntry = (room: number) => ({ ...entry(room, 'victory', maximumHp * 0.7), enemyId: 200 + room, enemyName: 'previous', floor: 2 });
    const previous = { ...(log as object), dungeonId: 2, finalOutcome: 'Return', completedRooms: 2, entries: [previousEntry(1), previousEntry(2)] } as never;
    const running = { ...(log as object), entries: (log as { entries: { enemyName: string }[] }).entries.map((row) => ({ ...row, enemyName: 'running' })) } as never;
    const exploringState = withParty({ lastExpeditionLog: running, currentHp: 0, instantExpeditionStock: 3, instantExpeditionChargeStartedAt: null });
    const cycle = { state: 'explore', stateStartedAt: now - 1500, durationMs: 4000 };
    const context2 = { ...context, partyCycle: () => cycle, disclosedLog: () => previous, chargeDurationScale: 1 } as never;
    const exp = (await buildApiV1ReadData('read/observation/expedition', exploringState, {}, context2) as unknown as Info).expeditionInfo.parties[0];
    const api = await buildApiV1ReadData('read/expedition/1/latestBattleLog', exploringState, {}, context2) as never;
    const shown = buildPartyExpeditionLogView({ exploration: exp.exploration as never, latestBattleLog: api })!;
    assert.deepEqual(shown.entries.map((row) => row.enemyId), [101, 102], 'the revealed rooms of the running exploration');
    assert.deepEqual(shown.entries.map((row) => row.enemyName), ['running', 'running'], 'named from the projection\'s own resources');
    assert.equal(shown.dungeonId, 1);
    assert.equal(shown.finalOutcome, null, 'the result is not disclosed while exploring');
    assert.deepEqual([shown.totalExperience, shown.rewards.length, shown.autoSellProfit], [0, 0, 0]);
    assert.equal(JSON.stringify(exp.exploration).includes('previous'), false, 'nothing of the disclosed log is in the exploration');
    // Not exploring: the newest disclosed log, from `latestBattleLog`.
    const idleContext = { ...context, partyCycle: () => ({ state: 'return', stateStartedAt: now, durationMs: 1000 }), disclosedLog: () => running, chargeDurationScale: 1 } as never;
    const doneExp = (await buildApiV1ReadData('read/observation/expedition', exploringState, {}, idleContext) as unknown as Info).expeditionInfo.parties[0];
    assert.equal(doneExp.exploration, null);
    const doneApi = await buildApiV1ReadData('read/expedition/1/latestBattleLog', exploringState, {}, idleContext) as never;
    const done = buildPartyExpeditionLogView({ exploration: doneExp.exploration as never, latestBattleLog: doneApi })!;
    assert.deepEqual(done.entries.map((row) => row.enemyId), [101, 102, 103, 104]);
    assert.deepEqual(done.entries.map((row) => row.enemyName), ['running', 'running', 'running', 'running']);
    assert.equal(done.finalOutcome, 'Defeat');
    // The disclosed log is what `latestBattleLog` returns while exploring, and its own resources describe it.
    const disclosed = buildPartyExpeditionLogView({ exploration: undefined, latestBattleLog: api })!;
    assert.deepEqual(disclosed.entries.map((row) => row.enemyName), ['previous', 'previous']);
  }
  Date.now = realNow;
}

// Header facts of `overview`: save-owned values always, runtime-owned Speed of Time and auto-repeat only for the player's runtime.
{
  const { default: Ajv } = await import('ajv');
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'read/observation/overview')!.response.data);
  const read = async (extra: Record<string, unknown>) => {
    const result = await buildApiV1ReadData('read/observation/overview', state, {}, { ...context, ...extra } as never) as any;
    assert.equal(validate(result), true, JSON.stringify(validate.errors));
    return result.headerInfo;
  };
  const account = await read({});
  assert.deepEqual([account.speedOfTime, account.autoRepeat, account.progressReportInfo], [null, null, { available: false, bonusActive: false }], 'an API account has no runtime-owned header facts');
  assert.deepEqual([account.gold, account.prana, account.environment, account.gameMode], [state.global.gold, state.global.prana, 'desktop', 'mode.normal']);
  const soon = Date.now() + 3 * 3_600_000;
  const player = await read({ headerRuntime: () => ({ timeSpeed: 'x5', bonusUntilMs: soon, autoRepeat: false, progressReportConfigured: true }), chargeDurationScale: 0.2 / 1.2 });
  assert.deepEqual([player.speedOfTime.base, player.speedOfTime.bonusActive, player.speedOfTime.bonusUntil, player.autoRepeat], ['x5', true, new Date(soon).toISOString(), false]);
  assert.equal(player.speedOfTime.scale, 0.2 / 1.2);
  assert.deepEqual(player.progressReportInfo, { available: true, bonusActive: true });
  const expired = await read({ headerRuntime: () => ({ timeSpeed: 'x1_2', bonusUntilMs: Date.now() - 1, autoRepeat: true, progressReportConfigured: true }) });
  assert.deepEqual([expired.speedOfTime.base, expired.speedOfTime.bonusActive, expired.speedOfTime.bonusUntil], ['x1.2', false, null], 'an expired bonus is not reported');
}

// The forecast the Expedition pane draws is rebuilt exactly from `simulationRun` (no rounding, nothing dropped).
{
  const { buildSimulationRunData, parseSimulationRunData } = await import('../../src/api/v1/simulationView.ts');
  const result = fakeSimulation(1000);
  // Give every counter a distinct value so a swapped or dropped field cannot round-trip by accident.
  result.Clear = 411; result.Return = 37; result.Draw = 29; result.Retreat = 173; result.Defeat = 350;
  result.rooms.forEach((room, index) => {
    Object.assign(room, { Victory: index + 1, Clear: index % 3, Return: index % 5, Draw: index % 7, Retreat: index % 11, Defeat: index % 13, NotReached: 1000 - index, reached: index * 7 });
    Object.assign(room.successfulHp, { Full: index, From90: index + 1, From80: index + 2, From70: index + 3, From60: index + 4, From50: index + 5, From40: index + 6, Below40: index + 7 });
    Object.assign(room.retreatHp, { From30: index + 8, From20: index + 9, From10: index + 10, Below10: index + 11 });
  });
  const data = buildSimulationRunData(result as never, 3, 'seed-domain');
  assert.deepEqual(parseSimulationRunData(data), result, 'the forecast round-trips through the public projection');
  assert.deepEqual(data.counts, { clear: 411, return: 37, draw: 29, retreat: 173, defeat: 350 });
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

// The status-pane values are derived once (deriveStatusFacts), published as calculatedStatus facts, and read back
// losslessly. The oracle is a frozen copy of the formulas the Party tab used to hold inline (the pane version).
{
  const { computePartyStats } = await import('../../src/game/partyComputation.ts');
  const { deriveStatusFacts } = await import('../../src/game/statusFacts.ts');
  const { buildCalculatedStatus, readStatusFacts } = await import('../../src/api/v1/calculatedStatus.ts');
  const { buildCombatTotals, buildPartyStatsView } = await import('../../src/api/v1/statusView.ts');
  const { computeCharacterHpContribution } = await import('../../src/game/partyComputation.ts');
  const { getUnlockedRaceAbilitiesFromBonuses } = await import('../../src/game/characterComputation.ts');

  const { oracleStatusFacts: oracle } = await import('./statusFactsOracle.ts');

  const classes = ['guardian', 'samurai', 'striker', 'sage', 'wizard', 'ranger', 'sword-saint', 'alchemist'] as const;
  const deities = ['Goddess of Restoration', 'God of Attrition', 'God of Cunning', 'God of Fortification', 'Goddess of Fertility', 'God of Resonance', 'Goddess of Precision', 'God of Fate', 'God of Dusk', 'Goddess of Mirage'];
  const seen = { iaigiri: false, heavy: false, deityOffense: false, deityDefense: false };
  let checked = 0;
  for (const [index, main] of classes.entries()) {
    for (const deity of deities) {
      const sub = classes[(index + 3) % classes.length];
      const variant = { ...state, parties: [{ ...state.parties[0], deity: { ...state.parties[0].deity, name: deity as never }, characters: state.parties[0].characters.map((character, slot) => ({ ...character, mainClassId: slot % 2 === 0 ? main : sub, subClassId: slot % 2 === 0 ? sub : main })) }] };
      const party = variant.parties[0];
      const computed = computePartyStats(party).characterStats;
      party.characters.forEach((character, slot) => {
        const stats = computed[slot];
        const expected = oracle(character, stats);
        const derived = deriveStatusFacts(character, stats);
        assert.deepEqual([derived.offenseAmplifier.melee, derived.offenseAmplifier.ranged, derived.offenseAmplifier.magical], [expected.melee, expected.ranged, expected.magical], `${main}/${deity}/${slot} offense`);
        assert.deepEqual([derived.defenseAmplifier.physical, derived.defenseAmplifier.magical], [expected.physicalDefense, expected.magicalDefense], 'defense');
        assert.deepEqual([derived.effectiveAccuracyBonus, derived.accuracyDecay, derived.penetration], [expected.effective, expected.decay, expected.penetration], 'accuracy and penetration');

        // Published and read back without loss, and never a non-finite number.
        const status = buildCalculatedStatus(character, stats, party.level);
        assert.deepEqual(readStatusFacts(status), derived, 'lossless round trip');
        for (const entry of status.stats) assert.equal(Number.isFinite(entry.value), true, entry.key);

        // The Party tab's character numbers are rebuilt from the facts alone, with no loss against the computed stats.
        const view = buildPartyStatsView(status);
        assert.deepEqual(view.baseStats, stats.baseStats, 'base stats');
        assert.equal(view.maxEquipSlots, stats.maxEquipSlots);
        assert.deepEqual([view.physicalDefense, view.magicalDefense, view.evasionBonus, view.accuracyPotency], [stats.physicalDefense, stats.magicalDefense, stats.evasionBonus, stats.accuracyPotency]);
        assert.deepEqual([view.meleeAttack, view.rangedAttack, view.magicalAttack, view.meleeNoA, view.rangedNoA, view.magicalNoA], [stats.meleeAttack, stats.rangedAttack, stats.magicalAttack, stats.meleeNoA, stats.rangedNoA, stats.magicalNoA], 'attacks and attack counts');
        assert.deepEqual([view.elementalOffense, view.elementalOffenseValue], [stats.elementalOffense, stats.elementalOffenseValue]);
        assert.deepEqual(view.elementalDefenseMultipliers, stats.elementalDefenseMultipliers);
        assert.deepEqual(view.abilities, stats.abilities, 'abilities keep their order, level, localized name, and description');
        // The HP breakdown and the race unlock state are published, not recomputed by the tab.
        const hp = computeCharacterHpContribution(character, party.level);
        assert.deepEqual([view.hpBaseIncrease, view.hpItemIncrease], [hp.baseHpBonus, hp.itemHpBonus], 'HP contribution');
        assert.equal(view.raceUnlockActive, getUnlockedRaceAbilitiesFromBonuses(character.equipment.flatMap((item) => item?.bonuses ?? [])).has(character.raceId), 'race unlock state');

        // The notification totals come from the projection and agree with the old rounding rules.
        const totals = buildCombatTotals(status, 12345.9);
        assert.equal(totals.hp, 12345);
        assert.equal(totals.meleeAttackAmp, expected.melee);
        assert.equal(totals.physicalDefenseResistPercent, Math.round(expected.physicalDefense * 100));
        assert.equal(totals.magicalDefenseResistPercent, Math.round(expected.magicalDefense * 100));
        assert.equal(totals.accuracy, Math.round(expected.effective * 1000));
        assert.equal(totals.evasion, Math.round(stats.evasionBonus * 1000));
        assert.equal(totals.penet, Math.round(expected.penetration * 100));
        assert.equal(totals.physDef, Math.round(stats.physicalDefense));
        assert.equal(totals.meleeAtk, Math.round(stats.meleeAttack));
        assert.equal(totals.rangedNoA, stats.rangedNoA);
        assert.equal(totals.fireDefenseResistPercent, Math.round(Math.max(0.01, stats.elementalDefenseMultipliers.fire) * 100));
        assert.equal(totals.elementalOffense, stats.elementalOffense);
        assert.equal(totals.elementalOffensePercent, Math.round((stats.elementalOffenseValue - 1) * 100));
        const levels: Record<string, number> = {};
        for (const ability of stats.abilities) if (ability.level >= 1) levels[ability.id] = Math.max(levels[ability.id] ?? 0, ability.level);
        assert.deepEqual(totals.abilityLevels, levels, 'ability ids survive the kebab-case round trip');

        seen.iaigiri ||= stats.abilities.some((ability) => ability.id === 'iaigiri' && ability.level > 0);
        seen.heavy ||= stats.abilities.some((ability) => ability.id === 'heavy_strike' && ability.level > 0);
        seen.deityOffense ||= stats.deityOffenseAmplifierBonus !== 0;
        seen.deityDefense ||= stats.deityDefenseAmplifierBonus.physical !== 1 || stats.deityDefenseAmplifierBonus.magical !== 1;
        checked += 1;
      });
    }
  }
  assert.ok(checked >= 400, 'many real characters were compared');
  assert.deepEqual(seen, { iaigiri: true, heavy: true, deityOffense: true, deityDefense: true }, 'the fixtures exercise Iaigiri, Heavy Strike, and deity amplifiers');

  // A Heavy Strike character's amplifier and penetration include the Heavy Strike factors the old notification omitted.
  const heavy = { ...state.parties[0], characters: state.parties[0].characters.map((character) => ({ ...character, mainClassId: 'striker' as const, subClassId: 'striker' as const })) };
  const heavyComputed = computePartyStats(heavy).characterStats;
  const withCount = heavyComputed.findIndex((stats) => Math.max(stats.rangedNoA, stats.magicalNoA, stats.meleeNoA) > 0);
  assert.ok(withCount >= 0, 'a fixture member has attack count equipment');
  const heavyStats = heavyComputed[withCount];
  assert.ok(heavyStats.abilities.some((ability) => ability.id === 'heavy_strike' && ability.level > 0));
  const heavyFacts = deriveStatusFacts(heavy.characters[withCount], heavyStats);
  assert.ok(heavyFacts.penetration > heavyStats.penetMultiplier, 'Heavy Strike converts attack count into penetration');
}
assert.deepEqual(state, before);
