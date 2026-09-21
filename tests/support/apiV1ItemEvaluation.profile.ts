import assert from 'node:assert/strict';
import { default as Ajv } from 'ajv';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations.ts';
import { createFreshGameState } from '../../src/hooks/useGameState.ts';
import { getCharacterCategoryMultiplier, getCharacterGrowthMultiplier, getItemStats } from '../../src/components/home/homeShared.tsx';
import { computeCharacterStats } from '../../src/game/characterComputation.ts';
import { getItemDisplayMultiplier } from '../../src/game/itemPower.ts';
import { getItemById, ITEMS } from '../../src/data/items.ts';
import { t } from '../../src/i18n/index.ts';

// SpecRef: 9.1.3 | Commit | 3-3-6 character/{characterId}/equipmentEvaluation
const at = Date.parse('2026-01-01T00:00:00.000Z');
const context = (): ApiV1CommitContext => ({
  simulatedAt: at, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: {}, uploadedFiles: {}, canonicalFiles: {},
  applyAutoEquipment: (state) => state, createDeliveryId: () => 'id', now: () => at,
});
const state = createFreshGameState('en', at);
const catalog = (await import('../../desktop/api-v1-contract.json', { with: { type: 'json' } })).default as { operations: { operationId: string; response: { data: object } }[] };
const validate = new Ajv({ strict: false }).compile(catalog.operations.find((operation) => operation.operationId === 'commit/build/character/{characterId}/equipmentEvaluation')!.response.data);
const evaluate = (characterId: number, targetItems: unknown, from = state) => applyApiV1Commit(`commit/build/character/${characterId}/equipmentEvaluation`, from, { targetItems }, context());

type Entry = { item: string; equippable: boolean; stats: { key: string; value: number; unit: string }[]; abilities: string[] };
const format = (item: { id: number }, enhancement: number, superRare: number, locked = 0) => `${locked}/${item.id}/${enhancement}/${superRare}`;

// 1. The evaluation never changes the game: same state object, valid response, a single item or an array.
const character = state.parties[0].characters[0];
const sword = ITEMS.find((item) => item.category === 'sword')!;
{
  const single = evaluate(character.id, format(sword, 0, 0));
  assert.equal(single.state, state, 'a valid no-op keeps the state identity');
  assert.equal(validate(single.data), true, JSON.stringify(validate.errors));
  assert.equal((single.data as { calculatedItemStatus: Entry[] }).calculatedItemStatus.length, 1);
  const many = evaluate(character.id, [format(sword, 0, 0), format(sword, 3, 0), format(sword, 3, 12)]);
  assert.equal((many.data as { calculatedItemStatus: Entry[] }).calculatedItemStatus.map((entry) => entry.item).join(','), [format(sword, 0, 0), format(sword, 3, 0), format(sword, 3, 12)].join(','), 'results keep the request order');
}

// 2. Every value equals what the Party pane prints for that item (the frozen display formula), for many items and characters.
{
  let compared = 0;
  for (const target of state.parties[0].characters) {
    const level = state.parties[0].level;
    const baseStats = computeCharacterStats(target, level).baseStats;
    const hpScale = ((baseStats.vitality + baseStats.mind) / 20) * getCharacterGrowthMultiplier(target);
    for (const def of ITEMS.filter((_, index) => index % 7 === 0)) {
      for (const [enhancement, superRare] of [[0, 0], [4, 0], [6, 9]] as const) {
        const item = { ...getItemById(def.id)!, enhancement, superRare, isLocked: false, jewel: null };
        const entry = (evaluate(target.id, format(def, enhancement, superRare)).data as { calculatedItemStatus: Entry[] }).calculatedItemStatus[0];
        const stat = (key: string) => entry.stats.find((fact) => fact.key === key)?.value ?? 0;
        const categoryMultiplier = getCharacterCategoryMultiplier(target, item.category);
        const multiplier = getItemDisplayMultiplier(item, categoryMultiplier);
        assert.equal(stat('f.category_multiplier'), categoryMultiplier);
        assert.equal(stat('f.item_multiplier'), multiplier);
        assert.equal(stat('d.melee_attack'), Math.round((item.meleeAttack ?? 0) * multiplier));
        assert.equal(stat('d.physical_defense'), Math.round((item.physicalDefense ?? 0) * multiplier));
        assert.equal(stat('d.HP'), Math.round((item.partyHP ?? 0) * multiplier * hpScale));
        // The text the pane prints contains exactly these numbers.
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
  const first = (from: typeof state, item: { id: number }) => (evaluate(character.id, format(item, 0, 0), from).data as { calculatedItemStatus: Entry[] }).calculatedItemStatus[0];
  const value = (entry: Entry, key: string) => entry.stats.find((fact) => fact.key === key)?.value ?? 0;
  const samurai = first(variant('samurai'), katana);
  const guardian = first(variant('guardian'), katana);
  assert.ok(value(samurai, 'd.melee_attack') > value(guardian, 'd.melee_attack'), 'the samurai katana multiplier applies');
  assert.ok(value(samurai, 'f.category_multiplier') > value(guardian, 'f.category_multiplier'));
  assert.equal(samurai.equippable, true, 'a melee class can equip a katana');
  // Equippability follows the aptitude, and is reported (not rejected) so the pane can show the item.
  const caster = { ...state, parties: state.parties.map((party, index) => index === 0 ? { ...party, characters: party.characters.map((entry) => entry.id === character.id ? { ...entry, raceId: 'cervin' as const, mainClassId: 'guardian' as const, subClassId: 'guardian' as const, lineageId: 'frozen_forest' as const, predispositionId: 'introspective' as const } : entry) } : party) };
  const { canCharacterEquipCategory } = await import('../../src/game/equipmentSets.ts');
  const casterCharacter = caster.parties[0].characters[0];
  assert.equal(canCharacterEquipCategory(casterCharacter, 'sword'), false, 'the fixture has no melee aptitude');
  assert.equal(first(caster, sword).equippable, false);
  assert.equal(first(caster, ITEMS.find((item) => item.category === 'armor')!).equippable, true, 'defensive gear needs no aptitude');
}

// 4. Invalid requests are rejected atomically.
{
  const fail = (targetItems: unknown, expected: RegExp) => assert.throws(() => evaluate(character.id, targetItems), expected);
  fail([], /invalid_request:targetItems/);
  fail('0', /invalid_request:targetItems/);
  fail('0/999999/0/0', /invalid_request:targetItems/);
  fail(`0/${sword.id}/9/0`, /invalid_request:targetItems/);
  fail([format(sword, 0, 0), format(sword, 0, 0)], /invalid_request:targetItems/);
  fail([format(sword, 0, 0), 'nope'], /invalid_request:targetItems/);
  assert.throws(() => evaluate(9_999_999, format(sword, 0, 0)), /not_found/);
}
console.log('apiV1ItemEvaluation profile ok');
