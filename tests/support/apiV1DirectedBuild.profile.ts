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

/**
 * A stand-in that re-picks every unlocked slot (as FULL does): each slot is emptied and refilled with the last Inventory
 * item the character can equip, in key order. Unlike `fakeAutoEquipment`, it changes gear that is already worn.
 */
function repickAutoEquipment(state: GameState, partyIndex: number, characterId: number | undefined): GameState {
  let next = state;
  const character = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
  if (character.autoEquipmentMode === 0) return next;
  const slots = character.equipment.map((item, slot) => (item && item.isLocked ? -1 : slot)).filter((slot) => slot >= 0);
  if (slots.length > 0) next = applyApiV1Commit(`commit/build/character/${characterId}/removeEquipment`, next, { targetEquipment: slots }, commitContext()).state;
  for (const slot of slots) {
    const current = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
    const key = Object.keys(next.global.inventory).sort().reverse().find((candidate) => {
      const entry = next.global.inventory[candidate];
      return entry.status === 'owned' && entry.count > 0 && canCharacterEquipCategory(current, entry.item.category);
    });
    if (key) next = gameReducer(next, { type: 'EQUIP_ITEM', partyIndex, characterId: characterId!, slotIndex: slot, itemKey: key });
  }
  return next;
}

let clock = now;
function dependencies(options: { tick?: number; autoEquipment?: boolean | GaSearchDependencies['commitContext']['applyAutoEquipment'] } = {}): GaSearchDependencies {
  clock = now;
  const applyAutoEquipment = typeof options.autoEquipment === 'function' ? options.autoEquipment : options.autoEquipment === false ? (s: GameState) => s : fakeAutoEquipment;
  return {
    simulate: (target, index, count, seed, simulationOptions) => simulateExpeditionRuns(target, index, 'mode.normal', count, undefined, 0, seed, simulationOptions),
    now: () => { clock += options.tick ?? 0; return clock; }, createSeed: () => 99, revision: 4,
    commitContext: { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, applyAutoEquipment, now: () => now },
  };
}
const search = (state: GameState, raw: Record<string, unknown>, options: Parameters<typeof dependencies>[0] = {}) => runDirectedBuild(state, 0, parseDirectedBuildRequest(state, 0, raw), dependencies(options));
interface DirectedData {
  verdict: string; changeSummary: GaChangeEntry[]; basis: string; seed: number; direction: string; directionStrictness: string; evaluations: number; elapsedSeconds: number;
  composition: { before: Record<string, number>; after: Record<string, number>; distanceBefore: number; distance: number; smallestDistance: number; recomposition: number; forcedRecomposition: boolean };
  steps: Record<string, { candidatesTried: number; selected: string | null }>;
  forecast: { scope: { endsAt: string } };
  verification: { before: number; after: number; verifySeed: number; crossCheck: { objective: string; minimum: number | null } };
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
rejects({ direction: 'free', targets: everyone(), autoEquipmentScope: 'some' }, 'invalid_request:autoEquipmentScope');
rejects({ direction: 'free', targets: everyone(), directionStrictness: 'loose' }, 'invalid_request:directionStrictness');
rejects({ direction: 'free', targets: everyone(), directionPenalty: 51 }, 'invalid_request:directionPenalty');
rejects({ direction: 'free', targets: everyone(), objectiveGuard: { success: 0.1 } }, 'invalid_request:objectiveGuard.success.same_as_objective');
rejects({ direction: 'free', targets: everyone(), tuningParameters: { verifySeed: 'x' } }, 'invalid_request:tuningParameters.verifySeed');
rejects({ direction: 'free', targets: everyone(), tuningParameters: { timeBudgetSeconds: 601 } }, 'invalid_request:tuningParameters.timeBudgetSeconds');
{
  // Defaults: `medium` effort and its preset, the 9.1.3 component defaults, `success`, no order, deity, or item-scope change,
  // `changedOnly` Auto Equipment, a `strict` direction with a penalty of 2, and no guard.
  const parsed = parseDirectedBuildRequest(shallow, 0, { direction: 'balance', targets: [{ characterId: ids[1] }] });
  const { effort, populationSize, generations, quickRuns, confirmRuns, timeBudgetSeconds, mutationRate, verifyRuns, eliteCount, confirmTopN, verifySeed } = parsed.parameters;
  assert.equal(effort, 'medium');
  assert.deepEqual({ populationSize, generations, quickRuns, confirmRuns, timeBudgetSeconds, mutationRate }, DIRECTED_EFFORT_PRESETS.medium);
  assert.deepEqual([verifyRuns, eliteCount, confirmTopN, verifySeed], [500, 2, 3, null]);
  assert.deepEqual(parsed.targets[0], { characterId: ids[1], uniqueCharacter: false, raceGender: true, mainClass: true, subClass: true, lineage: false, predisposition: false, autoEquipmentRun: 'currentSetting' });
  assert.deepEqual([parsed.objective, parsed.considerOrderChange, parsed.considerDeityChange, parsed.considerItemsScope], ['success', false, 'none', 'normal']);
  assert.deepEqual([parsed.autoEquipmentScope, parsed.directionStrictness, parsed.directionPenalty, parsed.objectiveGuard], ['changedOnly', 'strict', 2, null]);
  // The 9.1.3 presets: `high` is 48 x 60 with 300 / 1000 runs, 480 s, and a mutation rate of 0.5.
  assert.deepEqual(DIRECTED_EFFORT_PRESETS.high, { populationSize: 48, generations: 60, quickRuns: 300, confirmRuns: 1000, timeBudgetSeconds: 480, mutationRate: 0.5 });
  assert.deepEqual([DIRECTED_EFFORT_PRESETS.low.timeBudgetSeconds, DIRECTED_EFFORT_PRESETS.medium.timeBudgetSeconds], [60, 180]);
  const high = parseDirectedBuildRequest(shallow, 0, { direction: 'free', targets: everyone(), tuningParameters: { effort: 'high', mutationRate: 0.2 } });
  assert.deepEqual([high.parameters.populationSize, high.parameters.mutationRate], [48, 0.2], 'an explicit value overrides the preset');
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
  assert.equal(data.composition.distanceBefore, compositionDistance('rapidRanged', data.composition.before));
  assert.equal(data.composition.smallestDistance, 0);
  assert.equal(data.composition.forcedRecomposition, data.composition.distanceBefore > 0, 'strict excludes a current build outside the ranges');
  assert.equal(data.composition.recomposition, ['melee', 'ranged', 'magic', 'support'].reduce((sum, key) => sum + Math.abs(data.composition.after[key] - data.composition.before[key]), 0) / 2);
  assert.equal(data.directionStrictness, 'strict');
  assert.deepEqual(data.forecast.scope, { from: '1f-1', to: '1f-3', rooms: 3, endsAt: 'depthLimit' });
  assert.equal(data.verification.crossCheck.objective, 'bossDamage');
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
  // `allTargets` runs Auto Equipment for members whose build does not change; `changedOnly` (the default) never does.
  const off = (await search(stripped, { direction: 'free', targets: equipOnly('OFF'), autoEquipmentScope: 'allTargets', tuningParameters: small })).data as unknown as DirectedData;
  assert.deepEqual(off.changeSummary, [], 'OFF runs nothing');
  const unchangedOnly = (await search(stripped, { direction: 'free', targets: equipOnly('FULL'), tuningParameters: small })).data as unknown as DirectedData;
  assert.deepEqual([unchangedOnly.verdict, unchangedOnly.changeSummary], ['noChange', []], 'changedOnly: no build change, no Auto Equipment');
  const full = (await search(stripped, { direction: 'free', targets: equipOnly('FULL'), autoEquipmentScope: 'allTargets', tuningParameters: small })).data as unknown as DirectedData;
  assert.ok(full.changeSummary.length > 0 && full.changeSummary.every((entry) => entry.endpoint.endsWith('/equip')), 'FULL fills the empty slots from the Inventory');
  assert.notEqual(full.verdict, 'noChange');
  apply(stripped, full);
  // `currentSetting` follows each character's own mode: all OFF here, so nothing runs.
  let manual = stripped;
  for (const characterId of ids) manual = gameReducer(manual, { type: 'UPDATE_CHARACTER', partyIndex: 0, characterId, updates: { autoEquipmentMode: 0 } });
  assert.deepEqual(((await search(manual, { direction: 'free', targets: equipOnly('currentSetting'), autoEquipmentScope: 'allTargets', tuningParameters: small })).data as unknown as DirectedData).changeSummary, []);

  // Only `global` takes items worn outside the targets: with an empty Inventory the party gets gear only from party 2.
  const geared = apply(stripped, full);
  const donorParty = { ...geared.parties[0], id: 2, name: 'PT2', characters: geared.parties[0].characters.map((character) => ({ ...character, id: character.id + 100, isUnique: false, uniqueCharacterId: undefined })) };
  const donorState: GameState = { ...stripped, parties: [stripped.parties[0], donorParty], global: { ...stripped.global, inventory: {} } };
  const donorIds = donorParty.characters.map((character) => character.id);
  for (const scope of ['normal', 'withinTargets']) {
    const empty = (await search(donorState, { direction: 'free', targets: equipOnly('FULL'), considerItemsScope: scope, autoEquipmentScope: 'allTargets', tuningParameters: small })).data as unknown as DirectedData;
    assert.deepEqual(empty.changeSummary, [], `${scope} has nothing to equip`);
  }
  const global = (await search(donorState, { direction: 'free', targets: equipOnly('FULL'), considerItemsScope: 'global', autoEquipmentScope: 'allTargets', tuningParameters: small })).data as unknown as DirectedData;
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

// ---------------- Time budget (Spec 9.1.3, 2-3-3 `timeBudgetSeconds`) ----------------
{
  // A clock that would let Step 1 run long: Step 1 stops at 75% of the time left after the verification reserve, Step 2
  // still runs in the rest, and the whole request, verification included, fits in the budget.
  const data = (await search(shallow, { direction: 'balance', targets: everyone({ lineage: true }), considerDeityChange: 'unoccupiedDeities', tuningParameters: { ...small, generations: 50, timeBudgetSeconds: 5 } }, { tick: 50 })).data as unknown as DirectedData;
  assert.ok(data.steps.step1);
  assert.ok(data.steps.step2 && data.steps.step2.candidatesTried > 0, `Step 2 gets its share: ${JSON.stringify(data.steps)}`);
  assert.ok(data.elapsedSeconds <= 5, `elapsed ${data.elapsedSeconds}`);
  apply(shallow, data);
}

// ---------------- autoEquipmentScope `changedOnly` (Spec 9.1.3, 2-3-3) ----------------
{
  // Gear that Auto Equipment would pick differently (`repickAutoEquipment` takes the last item, the worn gear is the first).
  const geared = apply(shallow, (await search(shallow, { direction: 'free', targets: ids.map((characterId) => ({ characterId, changeableComponents: { raceGender: false, mainClass: false, subClass: false, autoEquipmentRun: 'FULL' } })), autoEquipmentScope: 'allTargets', tuningParameters: small })).data as unknown as DirectedData);
  const equipOnly = ids.map((characterId) => ({ characterId, changeableComponents: { raceGender: false, mainClass: false, subClass: false, autoEquipmentRun: 'FULL' } }));
  const kept = (await search(geared, { direction: 'free', targets: equipOnly, tuningParameters: small }, { autoEquipment: repickAutoEquipment })).data as unknown as DirectedData;
  assert.deepEqual([kept.verdict, kept.changeSummary], ['noChange', []], 'changedOnly: the current build is exactly the current build, gear included');
  const repicked = (await search(geared, { direction: 'free', targets: equipOnly, autoEquipmentScope: 'allTargets', tuningParameters: small }, { autoEquipment: repickAutoEquipment })).data as unknown as DirectedData;
  assert.ok(repicked.changeSummary.some((entry) => entry.endpoint.endsWith('/equip')), 'allTargets re-runs Auto Equipment on unchanged members');
  // Only the member whose class changes is re-equipped: the party has two Ranged classes, `magicBurst` allows one, and only
  // one ranged member may change, so `strict` must re-class it.
  const before = compositionOf(geared.parties[0].characters);
  const mover = geared.parties[0].characters.find((character) => ['ranger', 'striker', 'ninja'].includes(character.mainClassId) && !character.isUnique)!;
  assert.ok(before.ranged === 2 && compositionDistance('magicBurst', before) === 1, JSON.stringify(before));
  {
    const one = ids.map((characterId) => ({ characterId, changeableComponents: { raceGender: false, subClass: false, mainClass: characterId === mover.id, autoEquipmentRun: 'FULL' } }));
    const moved = (await search(geared, { direction: 'magicBurst', targets: one, tuningParameters: small }, { autoEquipment: repickAutoEquipment })).data as unknown as DirectedData;
    assert.deepEqual([moved.composition.forcedRecomposition, moved.composition.distance], [true, 0]);
    const touched = new Set(moved.changeSummary.filter((entry) => /\/(equip|jewelAttach|jewelRemove)$/.test(entry.endpoint)).map((entry) => Number(entry.endpoint.split('/')[3])));
    assert.deepEqual([...touched], [mover.id], `only ${mover.id} is re-equipped`);
  }
}

// ---------------- directionStrictness `soft` (Spec 9.1.3, 2-3-3) ----------------
{
  // `magicBurst` on a party with fewer than two magic classes: `strict` must change the composition, `soft` need not.
  const distanceBefore = compositionDistance('magicBurst', compositionOf(shallow.parties[0].characters));
  assert.ok(distanceBefore > 0, 'the fresh party does not fit magicBurst');
  const strict = (await search(shallow, { direction: 'magicBurst', targets: everyone(), tuningParameters: small })).data as unknown as DirectedData;
  assert.deepEqual([strict.composition.forcedRecomposition, strict.composition.distance], [true, 0]);
  assert.ok(strict.composition.recomposition > 0);
  const soft = (await search(shallow, { direction: 'magicBurst', targets: everyone(), directionStrictness: 'soft', tuningParameters: small })).data as unknown as DirectedData;
  assert.deepEqual([soft.directionStrictness, soft.composition.forcedRecomposition, soft.composition.distanceBefore], ['soft', false, distanceBefore]);
  // A penalty of 50 points per member keeps a `soft` result from moving away from the direction.
  const steep = (await search(shallow, { direction: 'magicBurst', targets: everyone(), directionStrictness: 'soft', directionPenalty: 50, tuningParameters: small })).data as unknown as DirectedData;
  assert.ok(steep.composition.distance <= distanceBefore, JSON.stringify(steep.composition));
  // `free` is the same under both: its distance is always 0.
  const free = (await search(shallow, { direction: 'free', targets: everyone(), directionStrictness: 'soft', tuningParameters: small })).data as unknown as DirectedData;
  assert.deepEqual([free.composition.distanceBefore, free.composition.distance, free.composition.forcedRecomposition], [0, 0, false]);
}

// ---------------- objectiveGuard and verifySeed ----------------
{
  const guarded = (await search(shallow, { direction: 'free', targets: everyone(), objective: 'bossDamage', objectiveGuard: { success: 0.05 }, tuningParameters: { ...small, verifySeed: 7 } })).data as unknown as DirectedData;
  assert.deepEqual([guarded.verification.crossCheck.objective, guarded.verification.crossCheck.minimum, guarded.verification.verifySeed], ['success', 0.05, 7]);
  assert.equal(guarded.forecast.scope.endsAt, 'bossRoom');
}

console.log('directedBuild profile ok');
