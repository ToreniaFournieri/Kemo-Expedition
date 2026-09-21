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
