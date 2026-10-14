import assert from 'node:assert/strict';
import { createFreshGameState, gameReducer, simulateExpeditionRuns } from '../../src/hooks/useGameState';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { compositionDistance, compositionOf, DIRECTED_EFFORT_PRESETS, parseDirectedBuildRequest, runDirectedBuild } from '../../src/api/v1/directedBuild';
import type { GaChangeEntry, GaSearchDependencies } from '../../src/api/v1/gaSearch';
import { canCharacterEquipCategory } from '../../src/game/equipmentSets';
import { getDeityId } from '../../src/game/deity';
import { LINEAGES } from '../../src/data/lineages';
import type { Character, GameState } from '../../src/types';

// SpecRef: 9.1.3 | Read | 2-3-3 party/{p}/directedBuild
// SpecRef: 9.1.4.9 | Operation-specific completion rules | Directed build

const now = Date.parse('2026-01-01T00:00:00.000Z');
const small = { seed: 8, populationSize: 8, generations: 2, quickRuns: 10, confirmRuns: 50, verifyRuns: 100, eliteCount: 2 };

/**
 * A stand-in for the game's Auto Equipment (the planner lives in the renderer): a character whose mode is not OFF fills
 * each empty slot with the first Inventory item it can equip, in key order.
 */
function fakeAutoEquipment(state: GameState, partyIndex: number, characterId: number | undefined): GameState {
  let next = state;
  const character = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
  if (character.autoEquipmentMode === 0) return next;
  character.equipment.forEach((item, slot) => {
    if (item) return;
    const current = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
    const key = Object.keys(next.global.inventory).sort().find((candidate) => {
      const entry = next.global.inventory[candidate];
      return entry.status === 'owned' && entry.count > 0 && canCharacterEquipCategory(current, entry.item.category);
    });
    if (key) next = gameReducer(next, { type: 'EQUIP_ITEM', partyIndex, characterId: characterId!, slotIndex: slot, itemKey: key });
  });
  return next;
}

let clock = now;
function dependencies(options: { tick?: number; autoEquipment?: boolean } = {}): GaSearchDependencies {
  clock = now;
  const applyAutoEquipment = options.autoEquipment === false ? (s: GameState) => s : fakeAutoEquipment;
  return {
    simulate: (target, index, count, seed, simulationOptions) => simulateExpeditionRuns(target, index, 'mode.normal', count, undefined, 0, seed, simulationOptions),
    now: () => { clock += options.tick ?? 0; return clock; }, createSeed: () => 99, revision: 4,
    commitContext: { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, applyAutoEquipment, now: () => now },
  };
}
const search = (state: GameState, raw: Record<string, unknown>, options: Parameters<typeof dependencies>[0] = {}) => runDirectedBuild(state, 0, parseDirectedBuildRequest(state, 0, raw), dependencies(options));
interface DirectedData {
  verdict: string; changeSummary: GaChangeEntry[]; basis: string; seed: number; direction: string; evaluations: number;
  composition: { before: Record<string, number>; after: Record<string, number>; distance: number };
  steps: Record<string, { candidatesTried: number; selected: string | null }>;
  verification: { before: number; after: number };
}
const commitContext = (): ApiV1CommitContext => ({ simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: {}, uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment: fakeAutoEquipment, createDeliveryId: () => 'd', now: () => now });
/** The result applied through `applyBuildChanges`, as a client would send it back. */
const apply = (state: GameState, data: DirectedData): GameState => (data.changeSummary.length === 0 ? state
  : applyApiV1Commit('commit/build/party/1/applyBuildChanges', state, { changes: data.changeSummary, basis: data.basis, verdict: data.verdict, simulation: false, confirmation: 'yes' }, commitContext()).state);

const fresh = createFreshGameState('ja', now);
const shallow: GameState = { ...fresh, parties: [{ ...fresh.parties[0], expeditionDepthLimit: '1f-3' }, ...fresh.parties.slice(1)] };
const ids = shallow.parties[0].characters.map((character) => character.id);
const everyone = (components: Record<string, unknown> = {}) => ids.map((characterId) => ({ characterId, changeableComponents: components }));

// ---------------- Request validation (Spec 9.1.4.9) ----------------
function rejects(raw: Record<string, unknown>, marker: string): void {
  let message = '';
  try { parseDirectedBuildRequest(shallow, 0, raw); } catch (error) { message = String(error); }
  assert.ok(message.includes(marker), `${JSON.stringify(raw)} expected ${marker}, got ${message}`);
}
rejects({ targets: everyone() }, 'invalid_request:direction');
rejects({ direction: 'sniper', targets: everyone() }, 'invalid_request:direction');
rejects({ direction: 'free' }, 'invalid_request:targets');
rejects({ direction: 'free', targets: [{ characterId: 999999 }] }, 'invalid_request:targets.characterId.not_in_party');
rejects({ direction: 'free', targets: [{ characterId: ids[0] }, { characterId: ids[0] }] }, 'invalid_request:targets.characterId.duplicate');
rejects({ direction: 'free', targets: [{ characterId: ids[0], changeableComponents: { equipment: true } }] }, 'invalid_request:targets.changeableComponents.equipment.unknown_member');
rejects({ direction: 'free', targets: [{ characterId: ids[0], changeableComponents: { autoEquipmentRun: 'ON' } }] }, 'invalid_request:targets.changeableComponents.autoEquipmentRun');
rejects({ direction: 'free', targets: everyone(), considerItemsScope: 'everything' }, 'invalid_request:considerItemsScope');
rejects({ direction: 'free', targets: everyone(), tuningParameters: { effort: 'max' } }, 'invalid_request:tuningParameters.effort');
rejects({ direction: 'free', targets: everyone(), tuningParameters: { maxChanges: 3 } }, 'invalid_request:tuningParameters.maxChanges.unknown_member');
rejects({ direction: 'free', targets: everyone(), tuningParameters: { populationSize: 8, eliteCount: 3 } }, 'invalid_request:tuningParameters.eliteCount');
rejects({ direction: 'free', targets: everyone(), gaParameters: {} }, 'invalid_request:gaParameters.unknown_member');
{
  // Defaults: `medium` effort and its preset, the 9.1.3 component defaults, `success`, no order, deity, or item-scope change.
  const parsed = parseDirectedBuildRequest(shallow, 0, { direction: 'balance', targets: [{ characterId: ids[1] }] });
  const { effort, populationSize, generations, quickRuns, confirmRuns, timeBudgetSeconds, verifyRuns, eliteCount, confirmTopN } = parsed.parameters;
  assert.equal(effort, 'medium');
  assert.deepEqual({ populationSize, generations, quickRuns, confirmRuns, timeBudgetSeconds }, DIRECTED_EFFORT_PRESETS.medium);
  assert.deepEqual([verifyRuns, eliteCount, confirmTopN], [500, 2, 3]);
  assert.deepEqual(parsed.targets[0], { characterId: ids[1], uniqueCharacter: false, raceGender: true, mainClass: true, subClass: true, lineage: false, predisposition: false, autoEquipmentRun: 'currentSetting' });
  assert.deepEqual([parsed.objective, parsed.considerOrderChange, parsed.considerDeityChange, parsed.considerItemsScope], ['success', false, 'none', 'normal']);
}

// ---------------- Composition distance (Spec 9.1.4.9) ----------------
assert.equal(compositionDistance('free', { melee: 6, ranged: 0, magic: 0, support: 0 }), 0);
assert.equal(compositionDistance('balance', { melee: 2, ranged: 1, magic: 2, support: 1 }), 0);
assert.equal(compositionDistance('turtle', { melee: 1, ranged: 2, magic: 2, support: 1 }), 1, 'one Support short');
assert.equal(compositionDistance('rapidRanged', { melee: 3, ranged: 1, magic: 1, support: 1 }), 3, 'two melee over, one ranged short');

// ---------------- A direction the party can meet ----------------
const isFelidianNinja = (character: Character) => character.raceId === 'felidian' && character.mainClassId === 'ninja';
{
  const before = structuredClone(shallow);
  const outcome = await search(shallow, { direction: 'rapidRanged', targets: everyone(), tuningParameters: small });
  const data = outcome.data as unknown as DirectedData;
  assert.deepEqual(shallow, before, 'the search never changes the state it read');
  assert.equal(data.direction, 'rapidRanged');
  assert.equal(data.seed, 8);
  assert.deepEqual(data.composition.before, compositionOf(shallow.parties[0].characters));
  assert.equal(data.composition.distance, 0, `rapidRanged is reachable: ${JSON.stringify(data.composition)}`);
  assert.ok(data.composition.after.ranged >= 2 && data.composition.after.melee <= 1 && data.composition.after.magic <= 1);
  assert.ok(data.steps.step1.candidatesTried > 0);
  assert.equal(data.steps.step2, undefined, 'no deity step without considerDeityChange');
  assert.equal(data.steps.step3, undefined, 'no final tuning without lineage or predisposition');
  assert.ok(data.changeSummary.some((entry) => entry.endpoint.endsWith('/changeBuild')), 'main classes change');
  // The result applies as written and gives exactly the reported composition, within the class rules.
  const applied = apply(shallow, data);
  const characters = applied.parties[0].characters;
  assert.deepEqual(compositionOf(characters), data.composition.after);
  for (const character of characters) {
    const original = shallow.parties[0].characters.find((entry) => entry.id === character.id)!;
    if (original.mainClassId !== character.mainClassId || original.raceId !== character.raceId) assert.ok(!isFelidianNinja(character), `${character.id} became a Felidian ninja`);
    if (original.mainClassId !== character.mainClassId && ['guardian', 'pilgrim', 'lord'].includes(character.mainClassId)) {
      assert.equal(characters.filter((entry) => entry.mainClassId === character.mainClassId).length, 1, `${character.mainClassId} is assigned twice`);
    }
  }
  // A unique character keeps its identity: `uniqueCharacter` is false by default.
  assert.ok(!data.changeSummary.some((entry) => 'uniqueSelection' in entry.parameters));
  // A fixed seed repeats the whole search.
  assert.deepEqual((await search(shallow, { direction: 'rapidRanged', targets: everyone(), tuningParameters: small })).data, outcome.data);
}

// ---------------- A direction the party cannot meet: the closest composition (9.1.3 wins over a precheck) ----------------
{
  // Only the duelist may change. `turtle` wants 1–2 per category and 2–3 Support, which one member cannot reach: the best
  // is a distance of 1, and a Support class it takes is never the guardian's.
  const duelist = shallow.parties[0].characters.find((character) => character.mainClassId === 'duelist')!;
  const targets = ids.map((characterId) => ({ characterId, changeableComponents: { raceGender: false, subClass: false, mainClass: characterId === duelist.id } }));
  const data = (await search(shallow, { direction: 'turtle', targets, tuningParameters: small })).data as unknown as DirectedData;
  assert.equal(data.composition.distance, 1, JSON.stringify(data.composition));
  const applied = apply(shallow, data).parties[0].characters.find((character) => character.id === duelist.id)!;
  assert.notEqual(applied.mainClassId, 'guardian', 'the guardian is already in the party');
  for (const entry of data.changeSummary) if (entry.endpoint.endsWith('/changeBuild')) assert.equal(entry.endpoint, `commit/build/character/${duelist.id}/changeBuild`);
  // Nothing changeable at all: the search still runs and keeps the current values.
  const fixed = ids.map((characterId) => ({ characterId, changeableComponents: { raceGender: false, mainClass: false, subClass: false, autoEquipmentRun: 'OFF' } }));
  const none = (await search(shallow, { direction: 'magicBurst', targets: fixed, tuningParameters: small })).data as unknown as DirectedData;
  assert.deepEqual([none.verdict, none.changeSummary, none.steps.step1.selected], ['noChange', [], null]);
  assert.equal(none.composition.distance, compositionDistance('magicBurst', compositionOf(shallow.parties[0].characters)));
}

// ---------------- autoEquipmentRun and considerItemsScope ----------------
{
  // A stripped party: the build stays, and only the requested Auto Equipment changes anything.
  let stripped = shallow;
  for (const characterId of ids) stripped = gameReducer(stripped, { type: 'REMOVE_ALL_EQUIPMENT', partyIndex: 0, characterId });
  const equipOnly = (run: string) => ids.map((characterId) => ({ characterId, changeableComponents: { raceGender: false, mainClass: false, subClass: false, autoEquipmentRun: run } }));
  const off = (await search(stripped, { direction: 'free', targets: equipOnly('OFF'), tuningParameters: small })).data as unknown as DirectedData;
  assert.deepEqual(off.changeSummary, [], 'OFF runs nothing');
  const full = (await search(stripped, { direction: 'free', targets: equipOnly('FULL'), tuningParameters: small })).data as unknown as DirectedData;
  assert.ok(full.changeSummary.length > 0 && full.changeSummary.every((entry) => entry.endpoint.endsWith('/equip')), 'FULL fills the empty slots from the Inventory');
  assert.notEqual(full.verdict, 'noChange');
  apply(stripped, full);
  // `currentSetting` follows each character's own mode: all OFF here, so nothing runs.
  let manual = stripped;
  for (const characterId of ids) manual = gameReducer(manual, { type: 'UPDATE_CHARACTER', partyIndex: 0, characterId, updates: { autoEquipmentMode: 0 } });
  assert.deepEqual(((await search(manual, { direction: 'free', targets: equipOnly('currentSetting'), tuningParameters: small })).data as unknown as DirectedData).changeSummary, []);

  // Only `global` takes items worn outside the targets: with an empty Inventory the party gets gear only from party 2.
  const geared = apply(stripped, full);
  const donorParty = { ...geared.parties[0], id: 2, name: 'PT2', characters: geared.parties[0].characters.map((character) => ({ ...character, id: character.id + 100, isUnique: false, uniqueCharacterId: undefined })) };
  const donorState: GameState = { ...stripped, parties: [stripped.parties[0], donorParty], global: { ...stripped.global, inventory: {} } };
  const donorIds = donorParty.characters.map((character) => character.id);
  for (const scope of ['normal', 'withinTargets']) {
    const empty = (await search(donorState, { direction: 'free', targets: equipOnly('FULL'), considerItemsScope: scope, tuningParameters: small })).data as unknown as DirectedData;
    assert.deepEqual(empty.changeSummary, [], `${scope} has nothing to equip`);
  }
  const global = (await search(donorState, { direction: 'free', targets: equipOnly('FULL'), considerItemsScope: 'global', tuningParameters: small })).data as unknown as DirectedData;
  const removals = global.changeSummary.filter((entry) => entry.endpoint.endsWith('/removeEquipment'));
  const equips = global.changeSummary.filter((entry) => entry.endpoint.endsWith('/equip'));
  assert.ok(removals.length > 0 && removals.every((entry) => donorIds.includes(Number(entry.endpoint.split('/')[3]))), 'donors are emptied');
  assert.ok(equips.length > 0 && equips.every((entry) => ids.includes(Number(entry.endpoint.split('/')[3]))), 'the party is equipped');
  assert.equal(removals.reduce((sum, entry) => sum + (entry.parameters.targetEquipment as number[]).length, 0), equips.length, 'every taken item is placed and none is created');
  const worn = (state: GameState, characterIds: number[]) => state.parties.flatMap((party) => party.characters).filter((character) => characterIds.includes(character.id)).reduce((sum, character) => sum + character.equipment.filter(Boolean).length, 0);
  const applied = apply(donorState, global);
  assert.equal(worn(applied, ids), equips.length);
  assert.equal(worn(applied, donorIds), worn(donorState, donorIds) - equips.length);
}

// ---------------- Step 2: the deity ----------------
{
  // Party 2 holds Fortification, the only unlocked deity; `allDeities` may take it, freeing it first.
  const own = { ...shallow.parties[0], deity: { ...shallow.parties[0].deity, name: 'None' } };
  const holder = { ...shallow.parties[0], id: 2, name: 'PT2', characters: shallow.parties[0].characters.map((character) => ({ ...character, id: character.id + 100, isUnique: false, uniqueCharacterId: undefined })), deity: { ...shallow.parties[0].deity, name: 'God of Fortification' } };
  const held: GameState = { ...shallow, parties: [own, holder], global: { ...shallow.global, unlockedDeities: ['God of Fortification'] } };
  const targets = ids.map((characterId) => ({ characterId, changeableComponents: { raceGender: false, mainClass: false, subClass: false, autoEquipmentRun: 'OFF' } }));
  const data = (await search(held, { direction: 'free', targets, considerDeityChange: 'allDeities', tuningParameters: small })).data as unknown as DirectedData;
  assert.ok(data.steps.step2.candidatesTried >= 2, JSON.stringify(data.steps));
  if (data.steps.step2.selected === 'deity fortification') {
    assert.deepEqual(data.changeSummary.slice(0, 2), [
      { endpoint: 'commit/build/party/2', parameters: { deityId: 'none' } },
      { endpoint: 'commit/build/party/1', parameters: { deityId: 'fortification' } },
    ]);
    assert.deepEqual(apply(held, data).parties.map((party) => getDeityId(party.deity.name)), ['fortification', 'none']);
  }
}

// ---------------- Step 3: lineage and predisposition ----------------
{
  const editable = shallow.parties[0].characters.find((character) => !character.isUnique)!;
  const targets = [{ characterId: editable.id, changeableComponents: { raceGender: false, mainClass: false, subClass: false, lineage: true, autoEquipmentRun: 'OFF' } }];
  const data = (await search(shallow, { direction: 'free', targets, tuningParameters: small })).data as unknown as DirectedData;
  const lineages = LINEAGES.filter((entry) => entry.selectable === true).length;
  assert.equal(data.steps.step3.candidatesTried, lineages - 1, 'every other selectable lineage is tried once');
  if (data.steps.step3.selected) {
    assert.match(data.steps.step3.selected, new RegExp(`^${editable.id}: lineage `));
    assert.deepEqual(data.changeSummary.map((entry) => entry.endpoint), [`commit/build/character/${editable.id}/changeBuild`]);
  }
  // A unique character's lineage is fixed by the game rules: nothing to try.
  const unique = shallow.parties[0].characters.find((character) => character.isUnique)!;
  const fixed = (await search(shallow, { direction: 'free', targets: [{ characterId: unique.id, changeableComponents: { raceGender: false, mainClass: false, subClass: false, lineage: true, predisposition: true, autoEquipmentRun: 'OFF' } }], tuningParameters: small })).data as unknown as DirectedData;
  assert.equal(fixed.steps.step3.candidatesTried, 0);
}

// ---------------- Time budget ----------------
{
  // A clock that runs out during Step 1: later steps do not run (no `steps` entry), and a valid result still returns.
  const data = (await search(shallow, { direction: 'balance', targets: everyone({ lineage: true }), considerDeityChange: 'unoccupiedDeities', tuningParameters: { ...small, generations: 50, timeBudgetSeconds: 5 } }, { tick: 50 })).data as unknown as DirectedData;
  assert.ok(data.steps.step1);
  assert.equal(data.steps.step2, undefined);
  assert.equal(data.steps.step3, undefined);
  apply(shallow, data);
}

console.log('directedBuild profile ok');
