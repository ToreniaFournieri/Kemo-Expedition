import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { default as Ajv } from 'ajv';
import { buildApiV1ReadData } from '../../src/api/v1/readModels.ts';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations.ts';
import { readStatusFacts } from '../../src/api/v1/calculatedStatus.ts';
import { buildCombatTotals, buildPartyStatsView } from '../../src/api/v1/statusView.ts';
import { buildPartySummaries, buildPartyView, type PartyProjection } from '../../src/api/v1/partyView.ts';
import { parseInventoryStacks, parseJewelStacks } from '../../src/api/v1/itemFormat.ts';
import { getItemById } from '../../src/data/items.ts';
import { isJewelAllowedForCategory } from '../../src/game/jewel.ts';
import { deriveStatusFacts } from '../../src/game/statusFacts.ts';
import { computePartyStats } from '../../src/game/partyComputation.ts';
import { hydrateGameState } from '../../src/game/saveCodec.ts';
import { decodePersistedState } from '../../src/game/storageCompression.ts';
import type { GameState } from '../../src/types/index.ts';
import { oracleStatusFacts } from './statusFactsOracle.ts';

// A real, heavy save (six parties, unique characters, Mimorian and other special races, Super Rare items, Jewels, and
// about 2,300 item variants) exercises the Party projections and equipment commands against real data.
const savePath = path.resolve('sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz');
const envelope = JSON.parse(fs.readFileSync(savePath, 'utf8')) as { saveDataCompressed: string };
const state = hydrateGameState(JSON.parse(decodePersistedState(envelope.saveDataCompressed)) as GameState);
// An older save has no saved equipment sets; the app's load path normalizes this, and so must the API.
(state.global as { savedEquipmentSets?: unknown[] }).savedEquipmentSets ??= [];

const now = Date.parse('2026-09-21T00:00:00.000Z');
const readContext = { revision: 1, environment: 'dev', gameMode: 'mode.normal' as const, enemyLevelOffset: 0, inGameTime: now };
const read = (operation: string, parameters: Record<string, unknown> = {}, source: GameState = state) => buildApiV1ReadData(operation, source, parameters, readContext);
const characters = state.parties.flatMap((party) => party.characters);
assert.equal(state.parties.length, 6);
assert.equal(characters.length, 36);

const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
const validator = (operationId: string) => new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === operationId)!.response.data);
const validateParty = validator('read/observation/party');
const validateSearch = validator('read/base/searchItems');
const validateEquipment = validator('read/build/character/{characterId}/equipment');
const validateStatus = validator('read/build/character/{characterId}/status');
const validateDonation = validator('resources/donationBox');
const validateDiary = validator('read/observation/diary');
const validateDiaryEntry = validator('read/diary/diaryEntry/{diaryEntryId}');

const equippedCount = (source: GameState) => source.parties.flatMap((party) => party.characters).reduce((sum, character) => sum + character.equipment.filter(Boolean).length, 0);
const attachedJewels = (source: GameState) => source.parties.flatMap((party) => party.characters).flatMap((character) => character.equipment).filter((item) => item?.jewel).length;
const inventoryTotal = (source: GameState) => Object.values(source.global.inventory).reduce((sum, variant) => sum + variant.count, 0);
const jewelTotal = (source: GameState) => Object.values(source.global.jewels).reduce((sum, count) => sum + count, 0);
// Every item the player has exists once: in the inventory or equipped by exactly one character.
const itemConservation = (source: GameState) => inventoryTotal(source) + equippedCount(source);
const jewelConservation = (source: GameState) => jewelTotal(source) + attachedJewels(source);

const startedAt = performance.now();

// The mixed retained history in the real pre-v1 save uses opaque string IDs and legacy records. Every summary and
// focused entry must validate without exposing an internal DiaryLog or converting old prose into invented semantics.
{
  const observation = await read('read/observation/diary') as { diaryInfo: { parties: Array<{ partyNumber: number; entries: Array<{ diaryEntryId: string; content: { format: string }; battleLog: { logId: string } | null }> }> } };
  assert.equal(validateDiary(observation), true, JSON.stringify(validateDiary.errors?.slice(0, 3)));
  let retained = 0;
  for (const party of observation.diaryInfo.parties) {
    for (const summary of party.entries) {
      retained += 1;
      assert.equal(typeof summary.diaryEntryId, 'string');
      assert.equal(summary.battleLog?.logId, `diary:${summary.diaryEntryId}`);
      const focused = await read(`read/diary/diaryEntry/${encodeURIComponent(summary.diaryEntryId)}`);
      assert.equal(validateDiaryEntry(focused), true, `${summary.diaryEntryId}: ${JSON.stringify(validateDiaryEntry.errors?.slice(0, 3))}`);
    }
  }
  assert.ok(retained > 0, 'the real save contains retained Diary history');
}

// 1. Party observations validate against the published schema, rebuild every member losslessly, and stay finite.
let statusChecked = 0;
for (const party of state.parties) {
  const observation = await read('read/observation/party', { partyNumber: party.id }) as { partyInfo: PartyProjection };
  assert.equal(validateParty(observation), true, `party ${party.id}: ${JSON.stringify(validateParty.errors?.slice(0, 2))}`);
  const projection = observation.partyInfo;
  const view = buildPartyView(projection);
  assert.equal(view.characters.length, 6);
  assert.equal(projection.parties.length, 6, 'every party is summarized');
  const computed = computePartyStats(party).characterStats;
  view.characters.forEach((rebuilt, slot) => {
    const original = party.characters[slot];
    for (const key of ['id', 'name', 'gender', 'raceId', 'mainClassId', 'subClassId', 'lineageId', 'predispositionId'] as const) assert.equal(rebuilt[key], original[key], `${original.name} ${key}`);
    assert.equal(Boolean(rebuilt.isUnique), Boolean(original.isUnique));
    assert.equal(rebuilt.mimorianEnemyId, original.mimorianEnemyId);
    assert.equal(rebuilt.equipment.length, original.equipment.length);
    original.equipment.forEach((item, index) => {
      const back = rebuilt.equipment[index];
      if (!item) return assert.equal(back, null);
      assert.ok(back, `${original.name} slot ${index}`);
      assert.deepEqual(
        [back.id, back.enhancement, back.superRare, back.isLocked === true, back.jewel ?? null],
        [item.id, item.enhancement, item.superRare, item.isLocked === true, item.jewel ?? null],
        `${original.name} slot ${index} (${item.name})`,
      );
    });

    // The status facts equal the frozen formulas and the computed stats, with no loss, on real gear.
    const stats = computed[slot];
    const status = view.characterStatus[slot];
    const derived = deriveStatusFacts(original, stats);
    const expected = oracleStatusFacts(original, stats);
    assert.deepEqual([derived.offenseAmplifier.melee, derived.offenseAmplifier.ranged, derived.offenseAmplifier.magical], [expected.melee, expected.ranged, expected.magical], `${original.name} offense`);
    assert.deepEqual([derived.defenseAmplifier.physical, derived.defenseAmplifier.magical], [expected.physicalDefense, expected.magicalDefense], `${original.name} defense`);
    assert.deepEqual([derived.effectiveAccuracyBonus, derived.accuracyDecay, derived.penetration], [expected.effective, expected.decay, expected.penetration], `${original.name} accuracy`);
    assert.deepEqual(readStatusFacts(status), derived, `${original.name} round trip`);
    for (const fact of [...status.stats, ...status.attacks.flatMap((attack) => attack.facts)]) assert.equal(Number.isFinite(fact.value), true, `${original.name} ${fact.key}`);
    const statsView = buildPartyStatsView(status);
    assert.deepEqual(statsView.baseStats, stats.baseStats);
    assert.deepEqual(statsView.abilities, stats.abilities, `${original.name} abilities`);
    assert.deepEqual([statsView.physicalDefense, statsView.magicalDefense, statsView.maxEquipSlots, statsView.meleeNoA, statsView.rangedNoA, statsView.magicalNoA], [stats.physicalDefense, stats.magicalDefense, stats.maxEquipSlots, stats.meleeNoA, stats.rangedNoA, stats.magicalNoA]);
    const totals = buildCombatTotals(status, projection.party.maxHp);
    assert.equal(totals.hp, Math.floor(projection.party.maxHp));
    assert.equal(totals.penet, Math.round(expected.penetration * 100));
    statusChecked += 1;
  });
  assert.deepEqual(buildPartySummaries(projection).map((summary) => summary.characters.length), [6, 6, 6, 6, 6, 6]);
}
assert.equal(statusChecked, 36);

// 2. The item search returns every owned variant, every equipped item, and every Jewel, ordered and parseable.
{
  const positive = Object.values(state.global.inventory).filter((variant) => variant.count > 0);
  const owned = await read('read/base/searchItems', { state: 'owned', details: 'none', limit: 5000 }) as { items: string[] };
  assert.equal(validateSearch(owned), true, JSON.stringify(validateSearch.errors?.slice(0, 2)));
  assert.equal(owned.items.length, positive.length, 'no owned stack is dropped');
  assert.ok(owned.items.length < 5000, 'the fixture stays under the request limit');
  // The projection rebuilds the owned inventory exactly: same variants, same counts.
  const rebuilt = parseInventoryStacks(owned.items);
  const expectedCounts = Object.fromEntries(Object.entries(state.global.inventory).filter(([, variant]) => variant.count > 0).map(([key, variant]) => [key, variant.count]));
  assert.deepEqual(Object.fromEntries(Object.entries(rebuilt).map(([key, variant]) => [key, variant.count])), expectedCounts, 'the rebuilt inventory equals the save');
  for (const variant of Object.values(rebuilt)) assert.ok(getItemById(variant.item.id), `master item ${variant.item.id}`);
  assert.ok(Object.values(rebuilt).some((variant) => variant.item.superRare > 0), 'Super Rare stacks are listed');
  assert.ok(Object.values(rebuilt).some((variant) => variant.item.superRare > 80), 'the highest Super Rare titles (81 and 82) are listed');
  const powers = owned.items.map((entry) => Number(entry.split('/')[5]));
  for (let index = 1; index < powers.length; index += 1) assert.ok(powers[index - 1] >= powers[index] || Number.isNaN(powers[index]), 'base power never increases down the list');

  const equipped = await read('read/base/searchItems', { state: 'equipped', details: 'none', limit: 5000 }) as { items: string[] };
  assert.equal(equipped.items.length, equippedCount(state), 'every equipped item is listed once');
  assert.equal(equipped.items.filter((entry) => !/\/0:0\//.test(entry)).length, attachedJewels(state), 'attached Jewels are reported on their items');

  const jewels = await read('read/base/searchItems', { state: 'owned', category: 'jewel', details: 'none', limit: 5000 }) as { items: string[] };
  const parsed = parseJewelStacks(jewels.items);
  assert.equal(Object.keys(parsed).length, Object.keys(state.global.jewels).length);
  assert.deepEqual(parsed, state.global.jewels, 'Jewel counts are exact');

  const limited = await read('read/base/searchItems', { state: 'owned', details: 'all', limit: 25 }) as { items: string[] };
  assert.equal(limited.items.length, 25);
  const superOnly = await read('read/base/searchItems', { state: 'owned', superRare: true, details: 'none', limit: 5000 }) as { items: string[] };
  assert.equal(superOnly.items.length, positive.filter((variant) => variant.item.superRare > 0).length);
}

// 3. Equipment reads agree with the real equipment for all 36 characters.
for (const party of state.parties) {
  for (const character of party.characters) {
    const equipment = await read(`read/build/character/${character.id}/equipment`) as { current: { equipment: string[] }; validOptions: { numberOfEmptyEquipmentSlots: number } };
    assert.equal(validateEquipment(equipment), true, `${character.name} equipment: ${JSON.stringify(validateEquipment.errors?.slice(0, 2))}`);
    const status = await read(`read/build/character/${character.id}/status`);
    assert.equal(validateStatus(status), true, `${character.name} status: ${JSON.stringify(validateStatus.errors?.slice(0, 2))}`);
    const slots = computePartyStats(party).characterStats[party.characters.indexOf(character)].maxEquipSlots;
    assert.equal(equipment.validOptions.numberOfEmptyEquipmentSlots, slots - character.equipment.slice(0, slots).filter(Boolean).length, `${character.name} empty slots`);
    assert.equal(equipment.current.equipment.filter((entry) => entry !== '0').length, character.equipment.filter(Boolean).length, `${character.name} equipped`);
  }
}

const donations = await read('resources/donationBox');
assert.equal(validateDonation(donations), true, JSON.stringify(validateDonation.errors?.slice(0, 2)));

// 4. Equipment commands on real gear conserve every item and Jewel, and Undo restores the exact equipment.
const equipmentHistory: ApiV1CommitContext['equipmentHistory'] = {};
const context = (): ApiV1CommitContext => ({
  simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory, uploadedFiles: {}, canonicalFiles: {},
  applyAutoEquipment: (source) => source, createDeliveryId: () => 'delivery', now: () => now,
});
const targetParty = state.parties[0];
const target = targetParty.characters.find((character) => character.equipment.some((item) => item?.jewel) && character.equipment.some((item) => item && item.superRare > 0))
  ?? targetParty.characters.find((character) => character.equipment.some((item) => item?.jewel))!;
assert.ok(target, 'a character with Jewels');
const equipmentOf = (source: GameState) => source.parties.flatMap((party) => party.characters).find((character) => character.id === target.id)!.equipment;
// Undo/Redo restore items, locks, and the recorded Jewel assignment exactly (Spec 9.1.3, 2-3-3). A saved set restores
// items and locks only and assigns Jewels independently (Spec 8.2.4), so every Jewel present must at least be valid for
// its item's category; `exactJewels` selects which contract to assert.
const assertRestored = (restored: GameState, message: string, exactJewels: boolean) => {
  const original = equipmentOf(state);
  const now = equipmentOf(restored);
  assert.equal(now.length, original.length, message);
  original.forEach((item, slot) => {
    const back = now[slot];
    if (!item) return assert.equal(back, null, `${message}: slot ${slot} stays empty`);
    assert.ok(back, `${message}: slot ${slot} restored`);
    assert.deepEqual([back.id, back.enhancement, back.superRare, back.isLocked === true], [item.id, item.enhancement, item.superRare, item.isLocked === true], `${message}: slot ${slot} item`);
    if (exactJewels) assert.deepEqual(back.jewel ?? null, item.jewel ?? null, `${message}: slot ${slot} Jewel`);
    else if (back.jewel) assert.ok(isJewelAllowedForCategory(back.category, back.jewel.key), `${message}: slot ${slot} Jewel ${back.jewel.key} is valid for ${back.category}`);
  });
};
const before = { items: itemConservation(state), jewels: jewelConservation(state) };
{
  const removed = applyApiV1Commit(`commit/build/character/${target.id}/removeAllEquipment`, state, {}, context());
  assert.equal(itemConservation(removed.state), before.items, 'Remove All conserves every item');
  assert.equal(jewelConservation(removed.state), before.jewels, 'Remove All returns attached Jewels to the inventory');
  assert.equal(removed.state.parties.flatMap((party) => party.characters).find((character) => character.id === target.id)!.equipment.filter(Boolean).length, 0);

  const undone = applyApiV1Commit(`commit/build/character/${target.id}/undoEquipment`, removed.state, {}, context());
  assertRestored(undone.state, 'Undo restores every item, lock, and Jewel assignment exactly', true);
  assert.equal(itemConservation(undone.state), before.items);
  assert.equal(jewelConservation(undone.state), before.jewels);

  // One missing Jewel makes the whole Undo unavailable: nothing is partially restored.
  const jewelSlot = equipmentOf(state).find((item) => item?.jewel);
  assert.ok(jewelSlot?.jewel, 'the real-save character wears a Jewel');
  if (jewelSlot?.jewel) {
    const jewelKey = `${jewelSlot.jewel.key}:${jewelSlot.jewel.rank}`;
    const lacking = { ...removed.state, global: { ...removed.state.global, jewels: { ...removed.state.global.jewels, [jewelKey]: 0 } } };
    assert.throws(() => applyApiV1Commit(`commit/build/character/${target.id}/undoEquipment`, lacking, {}, context()), /illegal_action/, 'an unavailable Jewel blocks the whole Undo');
  }

  // Save, clear, and load an exact set: the character's equipment returns exactly.
  const saved = applyApiV1Commit(`commit/build/character/${target.id}/saveEquipmentSet`, state, { equipmentSet: { name: 'Real set' } }, context());
  const setId = (saved.data as { equipmentSetId: number }).equipmentSetId;
  const cleared = applyApiV1Commit(`commit/build/character/${target.id}/removeAllEquipment`, saved.state, {}, context());
  const loaded = applyApiV1Commit(`commit/build/character/${target.id}/loadEquipmentSet`, cleared.state, { equipmentSetId: setId, loadMode: 'equipSet' }, context());
  assertRestored(loaded.state, 'an exact set load restores every item and lock, then assigns valid Jewels', false);
  assert.equal(itemConservation(loaded.state), before.items);
  assert.equal(jewelConservation(loaded.state), before.jewels);
}

// 5. A build change that drops equipment aptitude is simulated without any commit, then committed only when confirmed.
{
  const striker = state.parties.flatMap((party) => party.characters).find((character) => !character.isUnique && ['duelist', 'samurai', 'sword-saint'].includes(character.mainClassId) && character.equipment.some((item) => item && ['sword', 'katana', 'gauntlet'].includes(item.category)));
  assert.ok(striker, 'a melee character with melee gear');
  const parameters = { mainClassId: 'sage', subClassId: 'sage' };
  const simulated = applyApiV1Commit(`commit/build/character/${striker.id}/changeBuild`, state, { ...parameters, simulation: true }, context());
  assert.equal((simulated.data as { confirmationRequired: boolean }).confirmationRequired, true);
  assert.equal(simulated.state, state, 'a simulation returns the very same state');
  const warnings = (simulated.data as { warnings: { key: string }[] }).warnings;
  assert.ok(warnings.some((warning) => warning.key === 'api.warning.changeBuild.meleeAptitudeRemoved'));
  const committed = applyApiV1Commit(`commit/build/character/${striker.id}/changeBuild`, state, { ...parameters, simulation: false, confirmation: 'yes' }, context());
  const after = committed.state.parties.flatMap((party) => party.characters).find((character) => character.id === striker.id)!;
  assert.equal(after.equipment.some((item) => item && ['sword', 'katana', 'gauntlet'].includes(item.category)), false, 'melee gear is removed');
  assert.equal(itemConservation(committed.state), itemConservation(state), 'removed gear returns to the inventory');
  assert.equal(jewelConservation(committed.state), jewelConservation(state));
}

// 5b. equipmentEvaluation on the real save: every owned variant with a Jewel, for characters of different builds, never changes the state.
{
  const validateEvaluation = validator('read/build/character/{characterId}/equipmentEvaluation');
  const { JEWELS_BY_ITEM_CATEGORY } = await import('../../src/game/jewel.ts');
  const owned = Object.values(state.global.inventory).filter((variant) => variant.count > 0).map((variant) => `0/${variant.item.id}/${variant.item.enhancement}/${variant.item.superRare}/${JEWELS_BY_ITEM_CATEGORY[variant.item.category][0]}:1`);
  assert.ok(owned.length > 1000, 'the real save owns many variants');
  const characters = state.parties.flatMap((party) => party.characters).filter((_, index) => index % 6 === 0);
  let evaluated = 0;
  for (const someone of characters) {
    for (let start = 0; start < owned.length; start += 100) {
      const batch = owned.slice(start, start + 100);
      const before = JSON.stringify(state);
      const data = await read(`read/build/character/${someone.id}/equipmentEvaluation`, { targetItems: batch });
      assert.equal(JSON.stringify(state), before, 'an evaluation never changes the state');
      assert.equal(validateEvaluation(data), true, JSON.stringify(validateEvaluation.errors?.slice(0, 2)));
      const entries = (data as { calculatedItemStatus: { item: string; stats: { value: number }[] }[] }).calculatedItemStatus;
      assert.deepEqual(entries.map((entry) => entry.item), batch);
      for (const entry of entries) for (const fact of entry.stats) assert.equal(Number.isFinite(fact.value), true, `${entry.item} has a finite value`);
      evaluated += entries.length;
    }
  }
  assert.ok(evaluated > 5000, `${evaluated} evaluations validated`);
}

// 5c. latestBattleLog on the real save: every party's latest retained log and every Diary-retained log validates against the
// published schema, has no undisclosed replay data or rendered narration, and derives its bottleneck enemies from the rooms.
{
  const validateLog = validator('read/expedition/{p}/latestBattleLog');
  let logs = 0; let bottlenecks = 0;
  for (const party of state.parties) {
    const latest = await read(`read/expedition/${party.id}/latestBattleLog`) as { battleLog: { rooms: { enemyId: number | null; damageTaken: number; maximumPartyHp: number; outcome: string }[] } | null; bottleneckEnemies: { room: number; enemy: { enemyId: number; level: number | null } | null }[] };
    assert.equal(validateLog(latest), true, `party ${party.id} latest: ${JSON.stringify(validateLog.errors?.slice(0, 2))}`);
    for (const diary of party.diaryLogs) {
      const retained = await read(`read/expedition/${party.id}/latestBattleLog`, { logId: `diary:${diary.id}` }) as { battleLog: { logId: string } | null; bottleneckEnemies: unknown[] };
      assert.equal(validateLog(retained), true, `party ${party.id} diary ${diary.id}: ${JSON.stringify(validateLog.errors?.slice(0, 2))}`);
      assert.equal(retained.battleLog?.logId, `diary:${diary.id}`);
      logs += 1;
    }
    if (latest.battleLog) {
      logs += 1;
      const text = JSON.stringify(latest);
      for (const banned of ['seedHex', 'replayMetadata', 'actionText', 'random_flavor']) assert.equal(text.includes(banned), false, `${banned} is not published`);
      const expected = party.lastExpeditionLog!.entries.filter((entry) => entry.outcome !== 'victory' || (entry.maxPartyHP > 0 && (entry.damageTaken / entry.maxPartyHP) * 100 >= 35)).length;
      assert.equal(latest.bottleneckEnemies.length, expected, 'bottlenecks are the rooms with 35% damage, a draw, or a defeat');
      bottlenecks += latest.bottleneckEnemies.length;
      for (const bottleneck of latest.bottleneckEnemies as unknown as { room: number; enemy: { level: number | null; stats: { value: number }[]; hp: number; dropItemIds: number[] } | null }[]) {
        assert.ok(bottleneck.enemy, `room ${bottleneck.room} keeps its enemy snapshot`);
        assert.ok(bottleneck.enemy!.level !== null && bottleneck.enemy!.level >= 1, 'the effective enemy level is derived from the dungeon, floor, room type, and difficulty');
        for (const fact of bottleneck.enemy!.stats) assert.equal(Number.isFinite(fact.value), true);
        assert.ok(bottleneck.enemy!.hp > 0);
      }
    } else assert.deepEqual(latest, { battleLog: null, resources: null, bottleneckEnemies: [] });
  }
  assert.ok(logs > 0, 'the real save retains battle logs');
  await assert.rejects(() => read('read/expedition/1/latestBattleLog', { logId: 'diary:does-not-exist' }), /not_found/);
  await assert.rejects(() => read('read/expedition/1/latestBattleLog', { logId: 'latest' }), /not_found/);
  console.log(`latestBattleLog: ${logs} retained logs, ${bottlenecks} bottleneck rooms validated`);
}

// 5c-2. The pane renders a retained log from the API response alone: every room of every party's log and every Diary-retained
// log renders exactly as the retained record itself would (names, gate and reward text, the Bestiary snapshot, and the whole
// narration, including end events), without reading the game state.
{
  const { buildExpeditionLogView } = await import('../../src/api/v1/expeditionLogView.ts');
  const { renderExpeditionMetadata, renderDiaryBattle } = await import('../../src/game/compactDiary.ts');
  const { publicEnemySnapshot } = await import('../../src/api/v1/enemyStatus.ts');
  const { setLanguage } = await import('../../src/i18n/index.ts');
  const validateLog = validator('read/expedition/{p}/latestBattleLog');
  let rooms = 0; let compact = 0; let legacy = 0;
  for (const language of ['ja'] as const) {
    setLanguage(language);
    for (const party of state.parties) {
      const targets = [
        { logId: 'latest', log: party.lastExpeditionLog, parameters: {} as Record<string, unknown> },
        ...party.diaryLogs.map((diary) => ({ logId: `diary:${diary.id}`, log: diary.expeditionLog, parameters: { logId: `diary:${diary.id}` } })),
      ];
      for (const target of targets) {
        if (!target.log) continue;
        const response = await read(`read/expedition/${party.id}/latestBattleLog`, target.parameters) as never;
        assert.equal(validateLog(response), true, JSON.stringify(validateLog.errors?.slice(0, 2)));
        const view = buildExpeditionLogView(response)!;
        const expected = renderExpeditionMetadata(target.log);
        assert.equal(view.entries.length, expected.entries.length);
        expected.entries.forEach((entry, index) => {
          const actual = view.entries[index];
          const where = `${language} party ${party.id} ${target.logId} room ${entry.room}`;
          assert.equal(actual.enemyName, entry.enemyName, `${where} enemy name`);
          assert.equal(actual.gateInfo, entry.gateInfo, `${where} gate text`);
          assert.equal(actual.reward, entry.reward, `${where} reward text`);
          assert.equal(Boolean(actual.godsBattle), Boolean(entry.godsBattle), `${where} Gods Battle flag`);
          assert.deepEqual(actual.enemySnapshot ?? null, entry.enemySnapshot ? publicEnemySnapshot(entry.enemySnapshot) : null, `${where} enemy snapshot`);
          assert.equal(actual.postBattlePartyHP, entry.postBattlePartyHP, `${where} post-battle HP`);
          assert.deepEqual(renderDiaryBattle(actual, party.characters), renderDiaryBattle(entry, party.characters), `${where} narration`);
          rooms += 1;
          if (entry.compactBattle) compact += 1; else legacy += 1;
        });
        assert.deepEqual(view.rewards.map((item) => [item.id, item.enhancement, item.superRare]), target.log.rewards.map((item) => [item.id, item.enhancement, item.superRare]), 'rewards');
        assert.equal(view.autoSellMultiplier, target.log.autoSellMultiplier);
      }
    }
  }
  setLanguage('ja');
  assert.ok(rooms > 0, 'the real save retains rooms');
  console.log(`log rendering: ${rooms} rooms (${compact} compact, ${legacy} legacy) render identically from the response`);
}

// 5c-3. The Base projection on the real save: every variant, every worn item with its owner, and every held Jewel, valid
// against the published schema and consistent with the save.
{
  const validateBase = validator('read/observation/base');
  const response = await read('read/observation/base') as { baseInfo: { inventory: { variantKey: string; status: string; quantity: number; sale: { gold: number; prana: number } | null }[]; jewels: { quantity: number }[]; equippedItems: { characterId: number; item: string; jewel: string | null; active: boolean }[]; altar: { categories: unknown[] } } };
  assert.equal(validateBase(response), true, JSON.stringify(validateBase.errors?.slice(0, 3)));
  assert.equal(response.baseInfo.inventory.length, Object.keys(state.global.inventory).length);
  const wornCount = state.parties.reduce((sum, party) => sum + party.characters.reduce((inner, character) => inner + character.equipment.filter(Boolean).length, 0), 0);
  assert.equal(response.baseInfo.equippedItems.length, wornCount, 'every worn item is listed');
  const attachedJewels = state.parties.flatMap((party) => party.characters.flatMap((character) => character.equipment.filter((item) => item?.jewel)));
  assert.equal(response.baseInfo.equippedItems.filter((entry) => entry.jewel !== null).length, attachedJewels.length, 'every attached Jewel is listed with its item');
  assert.equal(response.baseInfo.jewels.reduce((sum, entry) => sum + entry.quantity, 0), Object.values(state.global.jewels).reduce((sum, count) => sum + count, 0), 'every held Jewel is listed');
  for (const entry of response.baseInfo.inventory) assert.equal(entry.sale !== null, entry.status === 'owned' && entry.quantity > 0);
  console.log(`base projection: ${response.baseInfo.inventory.length} variants, ${response.baseInfo.equippedItems.length} worn items, ${response.baseInfo.jewels.length} Jewel kinds validated`);
}

// 5d. The old save's outcome names are upgraded on load: every log and count uses Clear, Return, Draw, Retreat, and Defeat.
{
  const allowed = new Set(['Clear', 'Return', 'Retreat', 'Defeat']);
  for (const party of state.parties) {
    for (const log of [party.lastExpeditionLog, party.pendingDiaryLog?.expeditionLog, ...party.diaryLogs.map((entry) => entry.expeditionLog)]) {
      if (log) assert.equal(allowed.has(log.finalOutcome), true, `stored outcome ${log.finalOutcome}`);
    }
    for (const key of ['Turned_Back', 'Draw_Retreat', 'Wounded_Retreat']) assert.equal(key in (party.expeditionStats as object), false, `${key} is upgraded`);
    for (const key of ['Return', 'Draw', 'Retreat']) assert.equal(typeof (party.expeditionStats as unknown as Record<string, number>)[key], 'number', key);
  }
}

// 6. The heavy projections stay fast: the whole check above runs well within a generous budget.
const elapsed = performance.now() - startedAt;
assert.ok(elapsed < 20_000, `the real-save checks took ${Math.round(elapsed)} ms`);
console.log(`apiV1SampleSave profile ok (${Math.round(elapsed)} ms)`);
