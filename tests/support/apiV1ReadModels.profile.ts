import assert from 'node:assert/strict';
import { buildApiV1ReadData } from '../../src/api/v1/readModels.ts';
import { buildDiaryTabView, type DiaryProjection } from '../../src/api/v1/diaryTabView.ts';
import { createFreshGameState } from '../../src/hooks/useGameState.ts';

import { createExpeditionSimulationRoomResults } from '../../src/game/expeditionSimulation.ts';
import { computePartyStats as computePartyStatsForPadding } from '../../src/game/partyComputation.ts';
import type { DiaryLog, ExpeditionLog } from '../../src/types/index.ts';

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
// Diary reads publish a closed, language-neutral projection for compact entries, preserve stored legacy prose,
// use the save's durable opaque IDs, and validate against the generated contract.
{
  const expedition = (compact: boolean): ExpeditionLog => ({
    dungeonId: 1,
    ...(compact ? { compactVersion: 1 as const } : {}),
    dungeonName: compact ? '' : 'Stored legacy dungeon',
    difficultyOffset: 4,
    totalExperience: 0,
    totalRooms: 0,
    completedRooms: 0,
    finalOutcome: 'Return',
    entries: [],
    rewards: [],
    autoSellProfit: 0,
    autoSellCount: 0,
    autoSellItems: [],
    remainingPartyHP: 100,
    maxPartyHP: 100,
  });
  const compactEntry: DiaryLog = {
    id: '1758331425678-k3m9xq',
    expeditionLog: expedition(true),
    triggers: ['sideQuest'],
    semantic: { version: 1, quest: { label: ['sideQuest.label.test'], jewel: ['fort', 3] } },
    createdAt: Date.UTC(2026, 8, 20, 2),
    isRead: false,
  };
  const legacyEntry: DiaryLog = {
    id: 'legacy-diary-id',
    expeditionLog: expedition(false),
    triggers: ['unlock'],
    unlockHeadline: 'Stored legacy headline',
    unlockDetail: 'Stored legacy detail',
    createdAt: Date.UTC(2026, 8, 20, 1),
    isRead: true,
  };
  const secondParty = { ...structuredClone(state.parties[0]), id: 2, name: 'PT2', diaryLogs: [legacyEntry] };
  const diaryState = {
    ...structuredClone(state),
    selectedPartyIndex: 1,
    parties: [{ ...structuredClone(state.parties[0]), diaryLogs: [legacyEntry, compactEntry] }, secondParty],
  };
  (diaryState.parties[0].diarySettings as typeof diaryState.parties[0]['diarySettings'] & { notifyDefeat?: boolean }).notifyDefeat = true;
  const projection = await buildApiV1ReadData('read/observation/diary', diaryState, { partyNumber: 1, diaryEntryId: compactEntry.id }, context) as any;
  assert.deepEqual(projection.diaryInfo.effectiveSelection, { partyNumber: 1, diaryEntryId: compactEntry.id });
  assert.equal(projection.diaryInfo.parties[0].characters[0].characterId, diaryState.parties[0].characters[0].id);
  assert.equal(projection.diaryInfo.parties[0].characters[0].name, diaryState.parties[0].characters[0].name);
  assert.deepEqual(projection.diaryInfo.parties[0].entries.map((entry: { diaryEntryId: string }) => entry.diaryEntryId), [compactEntry.id, legacyEntry.id], 'newest entry is first');
  assert.equal(projection.diaryInfo.parties[0].entries[0].content.format, 'semantic');
  assert.equal(projection.diaryInfo.parties[0].entries[0].battleLog.logId, `diary:${compactEntry.id}`);
  assert.deepEqual(projection.diaryInfo.parties[0].entries[0].sideQuest, { label: { format: 'semantic', text: ['sideQuest.label.test'] }, jewelKey: 'fort', jewelRank: 3 });
  assert.deepEqual(projection.diaryInfo.parties[0].entries[1].content, { format: 'legacy', title: 'Stored legacy headline', subtitle: 'Stored legacy detail', text: 'Stored legacy headline\nStored legacy detail' });
  assert.equal('notifyDefeat' in projection.diaryInfo.parties[0].settings, false, 'the legacy migration alias is not public');
  const retainedBattle = await buildApiV1ReadData('read/expedition/1/latestBattleLog', diaryState, { logId: `diary:${compactEntry.id}` }, context) as any;
  const tabView = buildDiaryTabView(projection.diaryInfo as DiaryProjection, [retainedBattle]);
  assert.equal(tabView?.selectedPartyNumber, 1);
  assert.equal(tabView?.parties[0].diaryLogs[0].expeditionLog.logId, `diary:${compactEntry.id}`);
  assert.equal(tabView?.parties[0].diaryLogs[0].sideQuestLabel, 'sideQuest.label.test');
  assert.equal(tabView?.parties[0].diaryLogs[1].unlockHeadline, 'Stored legacy headline');
  assert.equal(tabView?.parties[0].diaryLogs[1].unlockDetail, 'Stored legacy detail');
  assert.equal(tabView?.parties[0].characters[0].name, diaryState.parties[0].characters[0].name);

  const Ajv = (await import('ajv')).default;
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'read/observation/diary')!.response.data);
  assert.equal(validate(projection), true, JSON.stringify(validate.errors?.slice(0, 3)));

  const detail = await buildApiV1ReadData(`read/diary/diaryEntry/${encodeURIComponent(legacyEntry.id)}`, diaryState, {}, context) as any;
  assert.equal(detail.entry.diaryEntryId, legacyEntry.id);
  assert.equal(detail.entry.content.format, 'legacy');
  assert.equal(detail.entry.battleLog.logId, `diary:${legacyEntry.id}`);
  const settings = await buildApiV1ReadData('read/diary/1/diarySetting', diaryState, {}, context) as any;
  assert.deepEqual(settings.validOptions.sideQuestThreshold, ['all', 2, 3, 4, 5, 6, 7, 8, 'none']);
  assert.deepEqual(settings.validOptions.notifySideQuestPopup, [true, false]);
  await assert.rejects(() => buildApiV1ReadData('read/observation/diary', diaryState, { partyNumber: 2, diaryEntryId: compactEntry.id }, context), /not_found/);
  const anotherLanguage = await buildApiV1ReadData('read/observation/diary', { ...diaryState, global: { ...diaryState.global, language: 'ko' } }, { partyNumber: 1 }, context);
  const originalLanguage = await buildApiV1ReadData('read/observation/diary', diaryState, { partyNumber: 1 }, context);
  assert.deepEqual(anotherLanguage, originalLanguage, 'new compact Diary facts do not depend on the active dictionary');
}
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
  type Search = { items: string[]; totalCount: number; truncated: boolean };
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
  const defaultPage = await buildApiV1ReadData('read/base/searchItems', withJewels, { details: 'none' }, context) as Search;
  assert.deepEqual([defaultPage.totalCount, defaultPage.truncated], [all.length, all.length > 10], 'a cut-off list says so');
  const wholePage = await buildApiV1ReadData('read/base/searchItems', withJewels, { details: 'none', limit: 5000 }, context) as Search;
  assert.deepEqual([wholePage.totalCount, wholePage.truncated], [all.length, false]);
  assert.deepEqual(defaultLimit, all.slice(0, defaultLimit.length), 'limit takes the top of the sorted result');
  assert.deepEqual(await search({ limit: 2 }), all.slice(0, 2));
  for (const limit of [0, -1, 5001, 1.5]) await assert.rejects(() => buildApiV1ReadData('read/base/searchItems', withJewels, { limit }, context), /invalid_request/, `limit ${limit}`);

  const first = owned[0].item;
  assert.equal((await search({ itemId: first.id })).every((stack) => idOf(stack) === first.id), true);
  // The category keys are the item categories themselves; `bow`, `glove`, and `book` remain accepted aliases.
  const categoryOf = (api: string) => ({ bow: 'archery', glove: 'gauntlet', book: 'grimoire', sword: 'sword', archery: 'archery', gauntlet: 'gauntlet', grimoire: 'grimoire' } as Record<string, string>)[api];
  for (const api of ['sword', 'archery', 'gauntlet', 'grimoire', 'bow', 'glove', 'book']) {
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
    assert.equal(projection.party.characters[index].autoEquipmentMode, ['OFF', 'SEMI', 'FULL'][original.autoEquipmentMode ?? 0], 'the wire uses the same spelling as the autoEquipment commit');
    assert.equal(rebuilt.mimorianEnemyId, original.mimorianEnemyId);
    // Every slot the character has is listed, including trailing empty ones the saved array does not store.
    const maxEquipSlots = computePartyStatsForPadding(party).characterStats[index].maxEquipSlots;
    assert.equal(rebuilt.equipment.length, Math.max(original.equipment.length, maxEquipSlots));
    assert.ok(rebuilt.equipment.slice(original.equipment.length).every((item) => item === null), 'padded slots are empty');
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
    const result = await buildApiV1ReadData('read/observation/expedition', source, {}, { ...context, inGameTime: now, ...(cycle ? { partyCycle: () => cycle } : {}), chargeDurationScale: 1, ...extra } as never) as unknown as Info;
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
  // An API account's charge follows its own in-game clock, the instant its sortie commit decides with, never the wall clock
  // (Build 111 regression: the projection showed charge the commit refused as `charge_insufficient`).
  const accountClock = now - 3 * 86_400_000;
  const behindWallClock = withParty({ instantExpeditionStock: 0, instantExpeditionChargeStartedAt: accountClock });
  const lagging = await read(behindWallClock, undefined, { inGameTime: accountClock });
  assert.deepEqual([lagging.chargeStock, lagging.controls.sortie.unavailableReason], [0, 'charge_insufficient']);
  const laggingStock = await buildApiV1ReadData('read/expedition/1/chargeStock', behindWallClock, {}, { ...context, inGameTime: accountClock, chargeDurationScale: 1 }) as { chargeStock: number };
  assert.equal(laggingStock.chargeStock, 0);
  assert.ok((await read(behindWallClock, undefined)).chargeStock > 0, 'the same party has recharged by the frozen wall clock');
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
    const context2 = { ...context, inGameTime: now, partyCycle: () => cycle, disclosedLog: () => previous, chargeDurationScale: 1 } as never;
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
  Object.assign(result, { totals: { experience: 12_345, itemDrops: 2_501, dropSaleValue: 67_890 } });
  const data = buildSimulationRunData(result as never, 3, 'seed-domain');
  assert.deepEqual(parseSimulationRunData(data), result, 'the forecast round-trips through the public projection');
  assert.deepEqual(data.counts, { clear: 411, return: 37, draw: 29, retreat: 173, defeat: 350 });
  assert.deepEqual(data.expectedPerRun, { experience: 12.3, itemDrops: 2.5, dropSaleValue: 67.9 }, 'expected rewards are per-run means');
}

// A closed Clear-Gate before the depth limit ends every run as `return` (a "success"), so `simulationRun` names the gate.
{
  const { describeSimulationDepthReach } = await import('../../src/api/v1/simulationView.ts');
  const { getEliteGateKey } = await import('../../src/game/clearGateCore.ts');
  const fresh = createFreshGameState('ja', Date.now()).parties[0];
  const blocked = { ...fresh, selectedDungeonId: 1, expeditionDepthLimit: '3f-3' as const, clearGateProgress: { [String(getEliteGateKey(1, 1))]: 2 }, clearGateStatus: {} };
  assert.deepEqual(describeSimulationDepthReach(blocked), { requested: '3f-3', reachable: '1f-3', blockedByGate: { floorRoom: '1f-4', current: 2, required: 7 } });
  const shallow = { ...blocked, expeditionDepthLimit: '1f-3' as const };
  assert.deepEqual(describeSimulationDepthReach(shallow), { requested: '1f-3', reachable: '1f-3', blockedByGate: null }, 'a gate past the depth limit does not matter');
  const open = { ...blocked, clearGateStatus: { [getEliteGateKey(1, 1)]: true, [getEliteGateKey(1, 2)]: true } };
  assert.deepEqual(describeSimulationDepthReach(open), { requested: '3f-3', reachable: '3f-3', blockedByGate: null });
}

// Compact observation (9.1.3 2-1-1): `<conditionKey>/<conditionValue>` with the Spec 7.2 keys, and unread Diary titles as
// `<diaryEntryId>/<diaryTitle>/<diarySubtitle>/<YYYYMMDD HH:MM>` with the free-text parts percent-encoded.
{
  const { ensureLanguageLoaded, setLanguage } = await import('../../src/i18n/index.ts');
  await ensureLanguageLoaded('en');
  const { getDungeonById } = await import('../../src/data/dungeons.ts');
  setLanguage('en');
  const createdAt = new Date(2026, 8, 16, 22, 4).getTime();
  const log = { ...(state.parties[0].lastExpeditionLog ?? {}), dungeonId: 1, dungeonName: 'stale/name', difficultyOffset: 0, rewards: [], entries: [] } as unknown as ExpeditionLog;
  const unreadEntry = { id: '120', createdAt, isRead: false, triggers: ['defeat'], expeditionLog: log } as unknown as DiaryLog;
  const readEntry = { ...unreadEntry, id: '121', isRead: true } as DiaryLog;
  const withDiary = { ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, condition: -360, diaryLogs: [unreadEntry, readEntry] } : party) };
  const compact = await buildApiV1ReadData('read/observation/compact', withDiary, {}, context) as { partyInfo: { party: { condition: string } }[]; attention: { notification: { unreadDiary: number; unreadDiaryTitle: string[] }[] } };
  assert.equal(compact.partyInfo[0].party.condition, 'terrible/-360');
  const steady = await buildApiV1ReadData('read/observation/compact', { ...state, parties: state.parties.map((party) => ({ ...party, condition: 55 })) }, {}, context) as typeof compact;
  assert.equal(steady.partyInfo[0].party.condition, 'steady/55');
  assert.equal(compact.attention.notification[0].unreadDiary, 1);
  const dungeonName = getDungeonById(1)!.name;
  assert.deepEqual(compact.attention.notification[0].unreadDiaryTitle, [`120/${encodeURIComponent('Defeat Record')}/${encodeURIComponent(dungeonName)}/20260916 22:04`]);
  calls.length = 0;
}

// latestBattleLog (9.1.4.14): `logId=latest` is the party's newest log, exactly like an omitted `logId`.
assert.deepEqual(
  await buildApiV1ReadData('read/expedition/1/latestBattleLog', state, { logId: 'latest' }, context),
  await buildApiV1ReadData('read/expedition/1/latestBattleLog', state, {}, context),
);

// Party projection (9.1.4.17): an explicitly invalid party or a character outside the selected party is rejected.
{
  const party = state.parties[0];
  const selected = await buildApiV1ReadData('read/observation/party', state, { partyNumber: party.id, characterId: party.characters[1].id }, context) as { partyInfo: { effectiveSelection: { partyNumber: number; characterId: number } } };
  assert.deepEqual(selected.partyInfo.effectiveSelection, { partyNumber: party.id, characterId: party.characters[1].id });
  await assert.rejects(buildApiV1ReadData('read/observation/party', state, { partyNumber: 6 }, context), /not_found/);
  await assert.rejects(buildApiV1ReadData('read/observation/party', state, { characterId: 999_999 }, context), /not_found/);
}

// Pagination (9.1.4.3): a cursor is bound to its route, filters, and revision; garbage is an invalid request.
{
  const first = await buildApiV1ReadData('resources/bestiary', state, { limit: 50 }, context) as { enemies: unknown[]; nextCursor: string };
  assert.equal(first.enemies.length, 50);
  const second = await buildApiV1ReadData('resources/bestiary', state, { limit: 50, cursor: first.nextCursor }, context) as { enemies: { enemyId: number }[] };
  assert.equal(second.enemies.length, 50);
  await assert.rejects(buildApiV1ReadData('resources/bestiary', state, { limit: 50, cursor: first.nextCursor }, { ...context, revision: 8 }), /invalid_cursor/, 'another revision');
  await assert.rejects(buildApiV1ReadData('resources/bestiary', state, { limit: 50, enemyType: 'Beast', cursor: first.nextCursor }, context), /invalid_cursor/, 'other filters');
  await assert.rejects(buildApiV1ReadData('resources/itemCompendium', state, { limit: 50, cursor: first.nextCursor }, context), /invalid_cursor/, 'another route');
  await assert.rejects(buildApiV1ReadData('resources/bestiary', state, { cursor: '%%%' }, context), /invalid_request/);
  await assert.rejects(buildApiV1ReadData('resources/bestiary', state, { limit: 201 }, context), /invalid_request/);
  const last = await buildApiV1ReadData('resources/superRareList', state, {}, context) as { nextCursor: string | null };
  assert.equal(last.nextCursor, null, 'a complete list reports a null cursor');
}

// Item Compendium filters (9.1.3 4-2-5): tier, rarity, ability/bonus search, and `details`; rarity and tier are reported.
{
  const { ITEMS } = await import('../../src/data/items.ts');
  type Compendium = { items: { itemId: number; rarity: string; tier: number; ability?: string[]; cBonus?: string[]; otherBonus?: string[] }[]; nextCursor: string | null };
  // Every item revealed, so the detail filters and fields apply (an unrevealed item is only a placeholder).
  const allRevealed = { ...state, global: { ...state.global, revealedItemCompendiumItemIds: ITEMS.map((item) => item.id) } };
  const read = (parameters: Record<string, unknown>) => buildApiV1ReadData('resources/itemCompendium', allRevealed, { limit: 200, ...parameters }, context) as Promise<Compendium>;
  const tier2 = await read({ category: 'sword', tier: 2 });
  assert.ok(tier2.items.length > 0 && tier2.items.every((item) => item.tier === 2 && Math.floor(item.itemId / 1000) === 2));
  const common = await read({ category: 'sword', rarity: 'common' });
  assert.ok(common.items.length > 0 && common.items.every((item) => item.rarity === 'common'));
  const withAbility = (await read({ category: 'sword', details: 'all' })).items.find((item) => (item.ability ?? []).length > 0);
  assert.ok(withAbility, 'some sword has an ability');
  if (withAbility) {
    const abilityId = withAbility.ability![0].split(':')[0];
    const found = await read({ category: 'sword', searchAbility: abilityId, details: 'ability' });
    assert.ok(found.items.length > 0 && found.items.every((item) => item.ability!.some((entry) => entry.split(':')[0] === abilityId)));
    assert.ok(found.items.every((item) => item.cBonus === undefined && item.otherBonus === undefined), '`details=ability` returns only abilities');
  }
  const none = await read({ category: 'sword', details: 'none' });
  assert.ok(none.items.every((item) => item.ability === undefined && item.cBonus === undefined && item.otherBonus === undefined));
  const aliases = await read({ category: 'book' });
  assert.deepEqual(aliases.items.map((item) => item.itemId), (await read({ category: 'grimoire' })).items.map((item) => item.itemId));
  assert.equal((await read({ category: 'grimoire' })).items.length, ITEMS.filter((item) => item.category === 'grimoire').length);
  // An unrevealed item is a placeholder: ID, category, rarity, and tier only; the detail searches never match it (9.1.4.7).
  const hidden = await buildApiV1ReadData('resources/itemCompendium', state, { category: 'sword', details: 'all', limit: 200 }, context) as Compendium;
  assert.ok(hidden.items.length > 0);
  for (const item of hidden.items) assert.deepEqual(Object.keys(item).sort(), ['category', 'itemId', 'rarity', 'revealed', 'tier']);
  const abilityId = withAbility!.ability![0].split(':')[0];
  assert.deepEqual((await buildApiV1ReadData('resources/itemCompendium', state, { category: 'sword', searchAbility: abilityId }, context) as Compendium).items, []);
}

// Super Rare list (9.1.3 4-2-8): titles 1–N only, `<superRareId>/<name>/<bonus>`, the name in the current language.
{
  const { ensureLanguageLoaded, setLanguage } = await import('../../src/i18n/index.ts');
  await ensureLanguageLoaded('en');
  const { SUPER_RARE_TITLES } = await import('../../src/data/items.ts');
  setLanguage('en');
  const list = await buildApiV1ReadData('resources/superRareList', state, {}, context) as { superRare: string[] };
  assert.equal(list.superRare.length, SUPER_RARE_TITLES.filter((title) => title.value > 0).length);
  assert.ok(!list.superRare.some((entry) => entry.startsWith('0/')), 'title 0 ("no title") is not listed');
  const [id, name, bonus] = list.superRare[0].split('/').map(decodeURIComponent);
  assert.equal(id, '1');
  assert.equal(name, 'World-Conquering');
  assert.equal(bonus, 'c.growth_x1.6, c.evasion-0.005');
  const one = await buildApiV1ReadData('resources/superRareList', state, { superRareId: 2 }, context) as { superRare: string[] };
  assert.deepEqual(one.superRare.map((entry) => entry.split('/')[0]), ['2']);
}

// Debug and Mode Select reads (9.1.3 2-6-2/2-6-3): an API account's unset debug fields report their defaults, and every
// documented field has its valid options.
{
  const debug = await buildApiV1ReadData('read/setting/debug', state, {}, { ...context, control: { settings: { debug: { colosseumMode: true } } } }) as { current: Record<string, unknown>; validOptions: Record<string, unknown[]> };
  assert.equal(debug.current.speedOfTime, 'real');
  assert.equal(debug.current.godsStrength, 'normal');
  assert.equal(Object.keys(debug.current).length, 12, 'every debug field is reported');
  assert.equal(Object.keys(debug.validOptions).length, 12);
  assert.deepEqual(debug.validOptions.displayAllBestiary, [true, false]);
  const modeSelect = await buildApiV1ReadData('read/setting/modeSelect', state, {}, context) as { validOptions: Record<string, unknown[]> };
  assert.deepEqual(modeSelect.validOptions.autoRepeat, [], 'auto-repeat is never controlled through the API');
  assert.deepEqual(modeSelect.validOptions.showExpeditionStats, [], 'an API account has no display settings');
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

// Item Compendium (8.6): every item at base level, `revealed` from `revealedItemCompendiumItemIds`, filtered by category.
{
  const { default: Ajv } = await import('ajv');
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'resources/itemCompendium')!.response.data);
  const { ITEMS } = await import('../../src/data/items.ts');
  const sword = ITEMS.find((item) => item.category === 'sword')!;
  const armor = ITEMS.find((item) => item.category === 'armor')!;
  const fresh = await buildApiV1ReadData('resources/itemCompendium', state, { category: 'sword' }, context) as { items: { itemId: number; category: string; revealed: boolean; ability: string[]; cBonus: string[]; otherBonus: string[] }[] };
  assert.equal(validate(fresh), true, JSON.stringify(validate.errors));
  assert.ok(fresh.items.length > 0);
  for (const item of fresh.items) assert.equal(item.category, 'sword', 'the category filter excludes every other item category');
  assert.ok(fresh.items.every((item) => item.revealed === false), 'nothing is revealed in a fresh save');
  const revealed = { ...state, global: { ...state.global, revealedItemCompendiumItemIds: [sword.id] } };
  const afterReveal = await buildApiV1ReadData('resources/itemCompendium', revealed, { category: 'sword' }, context) as { items: { itemId: number; revealed: boolean }[] };
  assert.equal(afterReveal.items.find((item) => item.itemId === sword.id)?.revealed, true);
  assert.ok(afterReveal.items.filter((item) => item.itemId !== sword.id).every((item) => item.revealed === false), 'revealing one item does not reveal the rest');
  const armorSearch = await buildApiV1ReadData('resources/itemCompendium', state, { category: 'armor', itemId: armor.id }, context) as { items: { itemId: number }[] };
  assert.deepEqual(armorSearch.items.map((item) => item.itemId), [armor.id], 'itemId narrows to exactly one item');
}

// Bestiary (8.6): every enemy at base level, shared encounter/defeat counts, `revealed` once encountered.
{
  const { default: Ajv } = await import('ajv');
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'resources/bestiary')!.response.data);
  const { ENEMIES } = await import('../../src/data/enemies.ts');
  const enemy = ENEMIES[0];
  // The list is paginated (Spec 9.1.4.3): follow `nextCursor` through every page.
  type BestiaryPage = { enemies: { enemyId: number; enemyType: string; revealed: boolean; encounters: number; defeats: number }[]; nextCursor: string | null };
  const firstPage = await buildApiV1ReadData('resources/bestiary', state, {}, context) as BestiaryPage;
  assert.equal(validate(firstPage), true, JSON.stringify(validate.errors));
  assert.equal(firstPage.enemies.length, 100, 'the default page size is 100');
  const fresh: BestiaryPage = { enemies: [...firstPage.enemies], nextCursor: firstPage.nextCursor };
  for (let cursor = firstPage.nextCursor; cursor;) {
    const page = await buildApiV1ReadData('resources/bestiary', state, { cursor }, context) as BestiaryPage;
    fresh.enemies.push(...page.enemies);
    cursor = page.nextCursor;
  }
  assert.equal(fresh.enemies.length, ENEMIES.length, 'every enemy is returned, revealed or not');
  assert.deepEqual(fresh.enemies.map((entry) => entry.enemyId), ENEMIES.map((entry) => entry.id), 'pages keep the Bestiary order without gaps or repeats');
  const untouched = fresh.enemies.find((entry) => entry.enemyId === enemy.id)!;
  assert.deepEqual([untouched.revealed, untouched.encounters, untouched.defeats], [false, 0, 0]);
  const encountered = { ...state, global: { ...state.global, enemyBattleStats: { [enemy.id]: { encounters: 3, defeats: 1 } } } };
  const met = await buildApiV1ReadData('resources/bestiary', encountered, { enemyId: enemy.id }, context) as { enemies: { enemyId: number; revealed: boolean; encounters: number; defeats: number }[] };
  assert.deepEqual(met.enemies, [{ ...met.enemies[0], revealed: true, encounters: 3, defeats: 1 }]);
  // The type filter matches revealed enemies only: an unencountered enemy's type is undisclosed.
  const byType = await buildApiV1ReadData('resources/bestiary', encountered, { enemyType: enemy.enemyType, limit: 200 }, context) as { enemies: { enemyId: number; enemyType: string }[] };
  assert.deepEqual(byType.enemies.map((entry) => entry.enemyId), [enemy.id]);
  // An unencountered enemy is a placeholder: its ID and counts, never its name, status, or drops (9.1.4.7).
  const hidden = await buildApiV1ReadData('resources/bestiary', state, { enemyId: enemy.id }, context) as { enemies: Record<string, unknown>[] };
  assert.deepEqual(hidden.enemies, [{ enemyId: enemy.id, revealed: false, encounters: 0, defeats: 0 }]);
}

// Enemy Edit Pane current (9.1.3 2-6-1): the ordinary player's real pane, an API account's own settings (defaults if unset).
{
  const { getDefaultColosseumEnemySettings } = await import('../../src/game/colosseum.ts');
  const pane = { ...getDefaultColosseumEnemySettings(), level: 33, enemyMainClass: 'sage' as const, abilities: [{ id: 'first_strike' as const, level: 3 }] };
  const player = await buildApiV1ReadData('read/setting/enemyEditPane', state, {}, { ...context, enemyEditSettings: () => pane }) as { current: Record<string, unknown> };
  assert.deepEqual(player.current, { enemyLevel: 33, enemyName: pane.name, terrainEffect: 'none', enemyType: pane.enemyType, mainClass: 'sage', subClass: 'none', addedAbilities: [{ abilityId: 'a.first-strike', level: 3 }] });
  const account = await buildApiV1ReadData('read/setting/enemyEditPane', state, {}, { ...context, control: { settings: { enemyEditPane: { enemyLevel: 12 } } } }) as { current: Record<string, unknown> };
  assert.equal(account.current.enemyLevel, 12);
  assert.equal(account.current.mainClass, getDefaultColosseumEnemySettings().enemyMainClass);
}

// Enemy Edit Pane: terrainEffect and enemyType valid options come from the real terrain glossary and enemy master data.
{
  const { TERRAIN_EFFECT_GLOSSARY_SECTION } = await import('../../src/data/glossary.ts');
  const { ENEMIES } = await import('../../src/data/enemies.ts');
  const read = await buildApiV1ReadData('read/setting/enemyEditPane', state, {}, context) as { validOptions: { terrainEffect: string[]; enemyType: string[] } };
  assert.equal(read.validOptions.terrainEffect[0], 'none');
  assert.deepEqual(read.validOptions.terrainEffect.slice(1), TERRAIN_EFFECT_GLOSSARY_SECTION!.entries.map((entry) => entry.key));
  assert.deepEqual(new Set(read.validOptions.enemyType), new Set(ENEMIES.map((enemy) => enemy.enemyType)));
}

// Glossary (1.0.3, 8.6): real localized content per category; only ability/terrain entries are reveal-gated.
{
  const { default: Ajv } = await import('ajv');
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'resources/glossary')!.response.data);
  const { GLOSSARY_SECTIONS } = await import('../../src/data/glossary.ts');
  const terrainSection = GLOSSARY_SECTIONS.find((section) => section.heading === '1.1.10 t. terrain effects')!;
  const someTerrain = terrainSection.entries[0];
  const bonusSection = GLOSSARY_SECTIONS.find((section) => section.heading === '2.1.2 b. bonus')!;
  const fresh = await buildApiV1ReadData('resources/glossary', state, { category: 't.' }, context) as { entries: { glossaryId: string; category: string }[]; validOptions: { category: string[] } };
  assert.equal(validate(fresh), true, JSON.stringify(validate.errors));
  assert.deepEqual(fresh.entries, [], 'no terrain effect is revealed in a fresh save');
  assert.deepEqual(fresh.validOptions.category, ['a.', 'b.', 'c.', 'd.', 'f.', 'g.', 'm.', 'q.', 't.']);
  const revealed = { ...state, global: { ...state.global, revealedGlossaryTerrainKeys: [someTerrain.key] } };
  const afterReveal = await buildApiV1ReadData('resources/glossary', revealed, { category: 't.' }, context) as { entries: { glossaryId: string }[] };
  assert.deepEqual(afterReveal.entries.map((entry) => entry.glossaryId), [someTerrain.key]);
  const always = await buildApiV1ReadData('resources/glossary', state, { category: 'b.' }, context) as { entries: { glossaryId: string; label: string; description: string }[] };
  assert.deepEqual(always.entries.map((entry) => entry.glossaryId), bonusSection.entries.map((entry) => entry.key), 'non-reveal-gated categories are always fully visible');
  const narrowed = await buildApiV1ReadData('resources/glossary', state, { category: 'b.', glossaryId: bonusSection.entries[0].key }, context) as { entries: { glossaryId: string }[] };
  assert.deepEqual(narrowed.entries.map((entry) => entry.glossaryId), [bonusSection.entries[0].key]);
}

// Character Roster (8.6): base status is unchanged; the bonus vocabulary excludes ability-type bonuses (redundant with
// the separate ability fields); ability fields are stable IDs, not the raw definition objects.
{
  const Ajv = (await import('ajv')).default;
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'resources/characterRoster')!.response.data);
  const { RACES } = await import('../../src/data/races.ts');
  const lupinian = RACES.find((race) => race.id === 'lupinian')!;
  const read = await buildApiV1ReadData('resources/characterRoster', state, { race: 'lupinian' }, context) as { races: { raceId: string; status: unknown; ability: string[]; defaultAbility: string | null; unlockAbility: string | null }[] };
  assert.equal(validate(read), true, JSON.stringify(validate.errors));
  assert.deepEqual(read.races.map((race) => race.raceId), ['lupinian'], 'the race filter returns exactly one race');
  const [entry] = read.races;
  assert.deepEqual(entry.status, lupinian.stats);
  assert.equal(entry.ability.length, 0, 'ability-type bonuses are excluded (redundant with defaultAbility/unlockAbility)');
  assert.equal(entry.defaultAbility, lupinian.defaultAbility.id);
  assert.equal(entry.unlockAbility, lupinian.unlockAbility!.id);
  const rosterAll = await buildApiV1ReadData('resources/characterRoster', state, { race: 'kemoria' }, context) as { races: { defaultAbility: string | null }[] };
  assert.equal(rosterAll.races[0].defaultAbility, null, "kemoria's 'none' sentinel becomes null, not the literal string");
  const mustelid = await buildApiV1ReadData('resources/characterRoster', state, { race: 'mustelid' }, context) as { races: { raceId: string }[] };
  assert.deepEqual(mustelid.races.map((race) => race.raceId), ['mustelid'], 'mustelid (missing from the original query enum) is reachable');
}

// News (8.6): each entry reports the save's read state, which `commit/setting/markNewsAsRead` changes.
{
  const news = await buildApiV1ReadData('resources/developerNewsNotification', state, {}, context) as { entries: Array<{ version: string; isRead: boolean }> };
  assert.ok(news.entries.length > 0 && news.entries.every((entry) => entry.isRead === false));
  const [first] = news.entries;
  const read = { ...state, global: { ...state.global, readDeveloperNewsItemIds: [first.version] } };
  const after = await buildApiV1ReadData('resources/developerNewsNotification', read, {}, context) as typeof news;
  assert.deepEqual(after.entries.filter((entry) => entry.isRead).map((entry) => entry.version), [first.version]);
}

// Clairvoyance (8.6): remaining/total/hitsRemaining/hitsTotal per bag, compared against a freshly created bag of the
// same kind; a fresh save's live bags equal their own defaults everywhere.
{
  const Ajv = (await import('ajv')).default;
  const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
  const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'resources/clairvoyance/{p}')!.response.data);
  type BagFacts = { remaining: number; total: number; hitsRemaining: number; hitsTotal: number };
  // Spec 9.1.3 4-2-3 / 8.6: a fresh party has no a.prophecy, so without the Debug override Clairvoyance is unavailable.
  const unavailable = await buildApiV1ReadData('resources/clairvoyance/1', state, {}, context);
  assert.deepEqual(unavailable, { available: false });
  assert.equal(validate(unavailable), true, JSON.stringify(validate.errors));
  const apiAccountOverride = await buildApiV1ReadData('resources/clairvoyance/1', state, {}, { ...context, control: { settings: { debug: { clairvoyance: true } } } } as never) as { available: boolean; canReset: boolean };
  assert.deepEqual([apiAccountOverride.available, apiAccountOverride.canReset], [true, true], "an API account's own Debug override");
  const overrideContext = { ...context, debugSettings: () => ({ clairvoyanceEnabled: true }) } as never;
  const fresh = await buildApiV1ReadData('resources/clairvoyance/1', state, {}, overrideContext) as {
    reward: Record<string, BagFacts>; enhancement: Record<string, { remaining: number; total: number; tiers: { tier: number; remaining: number; total: number }[] }>;
    superRare: Record<string, BagFacts>; sideQuest: BagFacts; sleepiness: { remaining: number; total: number; awake: { remaining: number; total: number } };
  };
  assert.equal(validate(fresh), true, JSON.stringify(validate.errors));
  for (const facts of Object.values(fresh.reward)) assert.deepEqual([facts.remaining, facts.hitsRemaining], [facts.total, facts.hitsTotal], 'a fresh bag equals its own default');
  for (const facts of Object.values(fresh.superRare)) assert.deepEqual([facts.remaining, facts.hitsRemaining], [facts.total, facts.hitsTotal]);
  assert.deepEqual([fresh.sideQuest.remaining, fresh.sideQuest.hitsRemaining], [fresh.sideQuest.total, fresh.sideQuest.hitsTotal]);
  assert.ok(fresh.enhancement.common.tiers.length === 6 && fresh.enhancement.common.tiers.every((tier) => tier.remaining === tier.total));
  assert.deepEqual([fresh.sleepiness.remaining, fresh.sleepiness.awake.remaining], [fresh.sleepiness.total, fresh.sleepiness.awake.total]);
  assert.ok(fresh.reward.common.total > 0 && fresh.enhancement.general.total > 0, 'totals are real positive counts, not placeholders');

  // Drawing down one party's common reward "win" slot changes only that bag's live facts, never its own total or any
  // other bag/party's facts. A fresh save has only one party, so a second, untouched party is added for this check.
  const drawnDown = {
    ...state,
    parties: [
      { ...state.parties[0], bags: { ...state.parties[0].bags, commonRewardBag: { entries: state.parties[0].bags.commonRewardBag.entries.map((entry) => entry.id === 1 ? { ...entry, tickets: entry.tickets - 1 } : entry) } } },
      { ...state.parties[0], id: 2 },
    ],
  };
  const afterDraw = await buildApiV1ReadData('resources/clairvoyance/1', drawnDown, {}, overrideContext) as typeof fresh;
  assert.equal(afterDraw.reward.common.hitsRemaining, fresh.reward.common.hitsTotal - 1);
  assert.equal(afterDraw.reward.common.total, fresh.reward.common.total, 'the total never changes with the live bag');
  assert.deepEqual(afterDraw.reward.uncommon, fresh.reward.uncommon, 'another bag is untouched');
  const otherParty = await buildApiV1ReadData('resources/clairvoyance/2', drawnDown, {}, overrideContext) as typeof fresh;
  assert.deepEqual(otherParty.reward.common, fresh.reward.common, "another party's bag is untouched");
  await assert.rejects(buildApiV1ReadData('resources/clairvoyance/99', state, {}, context), /not_found/);
}

assert.deepEqual(state, before);
