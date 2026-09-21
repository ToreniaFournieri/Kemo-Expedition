import assert from 'node:assert/strict';
import { default as Ajv } from 'ajv';
import { buildApiV1ReadData, type ApiV1ReadContext } from '../../src/api/v1/readModels.ts';
import { createFreshGameState } from '../../src/hooks/useGameState.ts';
import { getCharacterCategoryMultiplier, getCharacterGrowthMultiplier, getItemStats } from '../../src/components/home/homeShared.tsx';
import { computeCharacterStats } from '../../src/game/characterComputation.ts';
import { getItemDisplayMultiplier } from '../../src/game/itemPower.ts';
import { getJewelCBonusValue, getJewelDRankBonus, JEWEL_DEFS, JEWELS_BY_ITEM_CATEGORY } from '../../src/game/jewel.ts';
import { getItemById, ITEMS } from '../../src/data/items.ts';
import { t } from '../../src/i18n/index.ts';

// SpecRef: 9.1.3 | Read | 2-3-5 character/{characterId}/equipmentEvaluation
const at = Date.parse('2026-01-01T00:00:00.000Z');
const context: ApiV1ReadContext = {
  revision: 7, environment: 'dev', gameMode: 'mode.normal', enemyLevelOffset: 0, inGameTime: at,
};
const state = createFreshGameState('en', at);
const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { method: string; path: string; operationId: string; response: { data: object } }[] };
const operationId = 'read/build/character/{characterId}/equipmentEvaluation';
const operation = catalog.operations.find((entry) => entry.operationId === operationId)!;
assert.equal(operation.method, 'GET');
assert.equal(operation.path, '/api/v1/read/build/character/{characterId}/equipmentEvaluation');
assert.equal(catalog.operations.some((entry) => entry.operationId === 'commit/build/character/{characterId}/equipmentEvaluation'), false, 'the obsolete Commit route is absent');
const validate = new Ajv({ strict: false }).compile(operation.response.data);
const evaluate = (characterId: number, targetItems: unknown, from = state) => buildApiV1ReadData(`read/build/character/${characterId}/equipmentEvaluation`, from, { targetItems }, context);

type Entry = { item: string; equippable: boolean; stats: { key: string; value: number; unit: string }[]; abilities: string[] };
const format = (item: { id: number }, enhancement: number, superRare: number, jewel?: string, locked = 0) => {
  const definition = getItemById(item.id)!;
  return `${locked}/${item.id}/${enhancement}/${superRare}/${jewel ?? `${JEWELS_BY_ITEM_CATEGORY[definition.category][0]}:1`}`;
};

// 1. The read never changes the game or revision, validates, and accepts one item or a repeated-query-style array.
const character = state.parties[0].characters[0];
const sword = ITEMS.find((item) => item.category === 'sword')!;
{
  const before = JSON.stringify(state);
  const single = await evaluate(character.id, format(sword, 0, 0));
  assert.equal(JSON.stringify(state), before, 'the read keeps the authoritative state unchanged');
  assert.equal(context.revision, 7, 'the read does not advance revision metadata');
  assert.equal(validate(single), true, JSON.stringify(validate.errors));
  assert.equal((single as { calculatedItemStatus: Entry[] }).calculatedItemStatus.length, 1);
  const targets = [format(sword, 0, 0), format(sword, 3, 0, 'shade:2'), format(sword, 3, 12, 'fort:8')];
  const many = await evaluate(character.id, targets);
  assert.deepEqual((many as { calculatedItemStatus: Entry[] }).calculatedItemStatus.map((entry) => entry.item), targets, 'results keep the request order');
}

// 2. Every value equals what the Party pane prints for that item and specified Jewel, over many items and characters.
{
  let compared = 0;
  for (const target of state.parties[0].characters) {
    const level = state.parties[0].level;
    const baseStats = computeCharacterStats(target, level).baseStats;
    const hpScale = ((baseStats.vitality + baseStats.mind) / 20) * getCharacterGrowthMultiplier(target);
    for (const def of ITEMS.filter((_, index) => index % 7 === 0)) {
      for (const [enhancement, superRare] of [[0, 0], [4, 0], [6, 9]] as const) {
        const jewelKey = JEWELS_BY_ITEM_CATEGORY[def.category][0];
        const item = { ...getItemById(def.id)!, enhancement, superRare, isLocked: false, jewel: { key: jewelKey, rank: 1 } };
        const result = await evaluate(target.id, format(def, enhancement, superRare));
        const entry = (result as { calculatedItemStatus: Entry[] }).calculatedItemStatus[0];
        const stat = (key: string) => entry.stats.find((fact) => fact.key === key)?.value ?? 0;
        const categoryMultiplier = getCharacterCategoryMultiplier(target, item.category);
        const multiplier = getItemDisplayMultiplier(item, categoryMultiplier);
        assert.equal(stat('f.category_multiplier'), categoryMultiplier);
        assert.equal(stat('f.item_multiplier'), multiplier);
        assert.equal(stat('d.melee_attack'), Math.round(((item.meleeAttack ?? 0) + getJewelDRankBonus(item.jewel, 'meleeAttack')) * multiplier));
        assert.equal(stat('d.physical_defense'), Math.round(((item.physicalDefense ?? 0) + getJewelDRankBonus(item.jewel, 'physicalDefense')) * multiplier));
        assert.equal(stat('d.HP'), Math.round((item.partyHP ?? 0) * multiplier * hpScale) + Math.round(getJewelDRankBonus(item.jewel, 'partyHP') * multiplier * hpScale));
        assert.equal(stat(`c.${JEWEL_DEFS[jewelKey].cBonusType}`), getJewelCBonusValue(jewelKey, 1));
        const text = getItemStats(item, categoryMultiplier, hpScale);
        if (stat('d.melee_attack')) assert.ok(text.includes(t('home.itemStat.meleeAttackFlat', { value: stat('d.melee_attack') })), text);
        if (stat('d.magical_attack')) assert.ok(text.includes(t('home.itemStat.magicalAttackFlat', { value: stat('d.magical_attack') })), text);
        if (stat('d.ranged_attack')) assert.ok(text.includes(t('home.itemStat.rangedAttackFlat', { value: stat('d.ranged_attack') })), text);
        if (stat('d.physical_defense')) assert.ok(text.includes(t('home.itemStat.physicalDefenseFlat', { value: stat('d.physical_defense') })), text);
        if (stat('d.magical_defense')) assert.ok(text.includes(t('home.itemStat.magicalDefenseFlat', { value: stat('d.magical_defense') })), text);
        if (stat('d.HP')) assert.ok(text.includes(`HP+${stat('d.HP')}`), text);
        assert.equal(validate({ calculatedItemStatus: [entry] }), true);
        compared += 1;
      }
    }
  }
  assert.ok(compared > 300, `${compared} evaluations compared`);
}

// 3. Character-specific: a katana bonus scales only katana items, and equippability follows the character's aptitude.
{
  const katana = ITEMS.find((item) => item.category === 'katana')!;
  const variant = (mainClassId: 'samurai' | 'guardian') => ({ ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, characters: party.characters.map((entry) => entry.id === character.id ? { ...entry, mainClassId, subClassId: mainClassId } : entry) } : party) });
  const first = async (from: typeof state, item: { id: number }) => ((await evaluate(character.id, format(item, 0, 0), from)) as { calculatedItemStatus: Entry[] }).calculatedItemStatus[0];
  const value = (entry: Entry, key: string) => entry.stats.find((fact) => fact.key === key)?.value ?? 0;
  const samurai = await first(variant('samurai'), katana);
  const guardian = await first(variant('guardian'), katana);
  assert.ok(value(samurai, 'd.melee_attack') > value(guardian, 'd.melee_attack'), 'the samurai katana multiplier applies');
  assert.ok(value(samurai, 'f.category_multiplier') > value(guardian, 'f.category_multiplier'));
  assert.equal(samurai.equippable, true, 'a melee class can equip a katana');
  const caster = { ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, characters: party.characters.map((entry) => entry.id === character.id ? { ...entry, raceId: 'cervin' as const, mainClassId: 'guardian' as const, subClassId: 'guardian' as const, lineageId: 'frozen_forest' as const, predispositionId: 'introspective' as const } : entry) } : party) };
  const { canCharacterEquipCategory } = await import('../../src/game/equipmentSets.ts');
  const casterCharacter = caster.parties[0].characters[0];
  assert.equal(canCharacterEquipCategory(casterCharacter, 'sword'), false, 'the fixture has no melee aptitude');
  assert.equal((await first(caster, sword)).equippable, false);
  assert.equal((await first(caster, ITEMS.find((item) => item.category === 'armor')!)).equippable, true, 'defensive gear needs no aptitude');
}

// 4. Invalid queries are rejected without partial results.
{
  const fail = (targetItems: unknown, expected: RegExp) => assert.rejects(() => evaluate(character.id, targetItems), expected);
  await fail([], /invalid_request:targetItems/);
  await fail('0', /invalid_request:targetItems/);
  await fail('0/999999/0/0/might:1', /invalid_request:targetItems/);
  await fail(`0/${sword.id}/9/0/might:1`, /invalid_request:targetItems/);
  await fail(`0/${sword.id}/0/0/unknown:1`, /invalid_request:targetItems/);
  await fail(`0/${sword.id}/0/0/might:9`, /invalid_request:targetItems/);
  await fail(`0/${sword.id}/0/0/arcana:1`, /invalid_request:targetItems/);
  await fail(`0/${sword.id}/0/0`, /invalid_request:targetItems/);
  await fail([format(sword, 0, 0), format(sword, 0, 0)], /invalid_request:targetItems/);
  await fail([format(sword, 0, 0), 'nope'], /invalid_request:targetItems/);
  await assert.rejects(() => evaluate(9_999_999, format(sword, 0, 0)), /not_found/);
}
console.log('apiV1ItemEvaluation profile ok');
