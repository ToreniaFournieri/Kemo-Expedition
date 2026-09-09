import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createInitialStateBase, gameReducer, calculateFreeActionSpend, calculatePrayerProfit, getPartyAbilityLevel, hasActiveNonGodBattleClearGateCondition, simulateExpeditionRuns } from '../../src/hooks/useGameState';
import { createApiRuntime, createEvaluation, transactApiRequest, readEvaluation, evaluationSummary } from '../../src/game/experimentalApiSession';
import { applyApiCommand, configureParty, validateBuild } from '../../src/game/experimentalApiStrategy';
import { buildExperimentalObservation, buildRemoveAllEquipmentEffects, returnReasonFromParty } from '../../src/game/experimentalApi';
import { resolveApiCycles } from '../../src/game/experimentalApiCycle';
import { createApiRandom, withGameplayRandomSource, gameplayRandom } from '../../src/game/gameplayRandom';
import { withBattleSeedSource } from '../../src/game/battleSeedSource';
import { ensureLanguageLoaded, setLanguage } from '../../src/i18n';
import { PersistenceCoordinator } from '../../src/game/savePersistence';
import { decodePersistedState } from '../../src/game/storageCompression';
import { getVariantKey, type GameState } from '../../src/types';
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, v: string) => { values.set(key, v); }, removeItem: (key: string) => { values.delete(key); }, key: (i: number) => [...values.keys()][i] ?? null, get length() { return values.size; } };
Object.defineProperty(globalThis, 'localStorage', { value: storage });
await ensureLanguageLoaded('en'); setLanguage('en');
function fresh(): GameState {
  values.clear();
  const state = createInitialStateBase().state;
  state.apiRuntime = { ...createApiRuntime(), evaluation: createEvaluation('test', 'Test', '0.9.6', 12) };
  return state;
}
const deps = { reduce: gameReducer, equip: (s: GameState) => s, ability: getPartyAbilityLevel, freeSpend: calculateFreeActionSpend, prayer: calculatePrayerProfit, hasGate: hasActiveNonGodBattleClearGateCondition };
test('call 20,000 may win, exact batch counts and terminal requests are enforced', async () => {
  let state = fresh(); state.apiRuntime!.evaluation!.countedApiCalls = 19_999;
  let executed = 0;
  const result = await transactApiRequest({ state, operation: 'sortie', payload: { count: 100 }, persist: async s => { state = structuredClone(s); }, execute: async s => {
    executed++; s.parties[0].defeatedBossExpeditions[1] = true;
    return { state: s, actualSorties: 100, firstWinningSortie: 30, response: { sortie: { requestedCount: 100, completedCount: 100 }, outcomes: { Clear: 1, Defeat: 99 }, observation: { legalActions: [{ type: 'sortie' }], parties: [{ expedition: { normalSortieAvailable: true, godBattleAvailable: true } }] } } };
  } });
  assert.equal(executed, 1);
  assert.equal((result.evaluation as { finalScore: number }).finalScore, 200_100);
  assert.equal(state.apiRuntime!.evaluation!.firstWinningSortie, 30);
  assert.equal(state.apiRuntime!.evaluation!.winningOperation!.call, 20000);
  assert.deepEqual(state.apiRuntime!.evaluation!.winningOperation!.outcomes, { Clear: 1, Defeat: 99 });
  const terminalObservation = result.observation as { legalActions: unknown[]; parties: Array<{ expedition: { normalSortieAvailable: boolean; godBattleAvailable: boolean } }> };
  assert.deepEqual(terminalObservation.legalActions, []);
  assert.equal(terminalObservation.parties[0].expedition.normalSortieAvailable, false);
  assert.equal(terminalObservation.parties[0].expedition.godBattleAvailable, false);
  const denied = await transactApiRequest({ state, operation: 'observation', payload: {}, persist: async () => assert.fail('terminal write'), execute: async () => { throw new Error('should not execute'); } });
  assert.equal((denied.error as { code: string }).code, 'evaluation_finished');
});
test('failed request 20,000 exhausts budget and applies failure penalty', async () => {
  let state = fresh(); state.apiRuntime!.evaluation!.countedApiCalls = 19_999;
  const response = await transactApiRequest({ state, operation: 'command', payload: {}, persist: async s => { state = structuredClone(s); }, execute: async () => { throw new Error('failed'); } });
  assert.equal((response.evaluation as { finalScore: number }).finalScore, 300_000);
});
test('idempotent retries cost a call but never reexecute sorties; conflicting bodies reject', async () => {
  let state = fresh(); let executed = 0;
  const request = (count: number) => transactApiRequest({ state, operation: 'sortie', payload: { count }, idempotencyKey: 'batch-1', persist: async s => { state = structuredClone(s); }, execute: async s => { executed++; return { state: s, actualSorties: count, response: { done: true } }; } });
  await request(2); const replay = await request(2); const conflict = await request(3);
  assert.equal(executed, 1); assert.equal(replay.replayed, true);
  assert.equal(state.apiRuntime!.evaluation!.actualSorties, 2);
  assert.equal(state.apiRuntime!.evaluation!.countedApiCalls, 3);
  assert.equal((conflict.error as { code: string }).code, 'idempotency_conflict');
});
test('failed durable commit preserves gameplay and RNG, retaining only the call reservation', async () => {
  let state = fresh(); const initial = structuredClone(state); let writes = 0;
  const response = await transactApiRequest({ state, operation: 'sortie', payload: {}, idempotencyKey: 'failed', persist: async s => { if (++writes === 2) throw new Error('quota'); state = structuredClone(s); }, execute: async s => {
    s.global.gold += 100; s.apiRuntime!.randomState++; return { state: s, actualSorties: 4, response: {} };
  } });
  assert.equal((response.error as { code: string }).code, 'persistence_failed');
  assert.equal(state.global.gold, initial.global.gold); assert.equal(state.apiRuntime!.randomState, initial.apiRuntime!.randomState);
  assert.equal(state.apiRuntime!.evaluation!.actualSorties, 0); assert.equal(state.apiRuntime!.evaluation!.countedApiCalls, 1);
  assert.deepEqual(state.apiRuntime!.receipts, {});
});
test('Gods Battles are rejected before execution during evaluation', async () => {
  const result = await transactApiRequest({ state: fresh(), operation: 'command', payload: { command: { type: 'god_battle' } }, persist: async () => {}, execute: async () => { assert.fail('god battle executed'); } });
  assert.equal((result.error as { code: string }).code, 'illegal_action');
});
test('build validation rejects injected equipment and duplicate pairs, and configuration is atomic', () => {
  const state = fresh(), party = state.parties[0], c = party.characters[0];
  assert.ok(validateBuild(state, 0, c, { equipment: [] }).some(v => v.code === 'unknown_field'));
  const before = structuredClone(state);
  assert.throws(() => configureParty(state, 0, { characters: [{ characterId: c.id, changes: { mainClassId: 'invalid' } }], depthLimit: 'all' }, deps));
  assert.deepEqual(state, before);
  const next = configureParty(state, 0, { depthLimit: '1f-3', autoEquip: true }, deps);
  assert.equal(next.parties[0].expeditionDepthLimit, '1f-3');
  assert.equal(state.parties[0].expeditionDepthLimit, before.parties[0].expeditionDepthLimit);
  assert.throws(() => applyApiCommand(state, { type: 'set_deity', partyId: 1 }, deps, Date.now()));
});
test('remove_all_equipment reuses UI semantics and is exposed per character', () => {
  const state = fresh();
  const party = state.parties[0];
  const character = party.characters.find(candidate => candidate.equipment.some(Boolean))!;
  const slotIndex = character.equipment.findIndex(Boolean);
  const original = character.equipment[slotIndex]!;
  character.equipment[slotIndex] = { ...original, isLocked: true, superRare: Math.max(1, original.superRare), jewel: { key: 'might', rank: 8 } };
  character.autoEquipmentMode = 2;
  const detached = { ...character.equipment[slotIndex]!, jewel: null };
  const inventoryKey = getVariantKey(detached);
  const beforeItemCount = state.global.inventory[inventoryKey]?.count ?? 0;
  const beforeJewelCount = state.global.jewels['might:8'] ?? 0;
  const next = applyApiCommand(state, { type: 'remove_all_equipment', partyId: party.id, characterId: character.id }, deps, Date.now());
  const result = next.parties[0].characters.find(candidate => candidate.id === character.id)!;
  assert.ok(result.equipment.every(item => item === null));
  assert.equal(result.autoEquipmentMode, 1);
  assert.equal(next.global.inventory[inventoryKey]?.count, beforeItemCount + 1);
  assert.equal(next.global.jewels['might:8'], beforeJewelCount + 1);
  const beforeObservation = buildExperimentalObservation(state, 0, false, {}, 0);
  const afterObservation = buildExperimentalObservation(next, 1, false, {}, 0);
  assert.ok(next.parties[0].currentHp <= afterObservation.parties[0].hp.maximum);
  assert.deepEqual(buildRemoveAllEquipmentEffects(beforeObservation, afterObservation, party.id, character.id), {
    partyId: party.id,
    characterId: character.id,
    removedItemCount: character.equipment.filter(Boolean).length,
    returnedJewelCount: character.equipment.filter(item => item?.jewel != null).length,
    previousAutoEquipmentMode: 2,
    autoEquipmentMode: 1,
    hp: {
      previousCurrent: beforeObservation.parties[0].hp.current,
      previousMaximum: beforeObservation.parties[0].hp.maximum,
      current: afterObservation.parties[0].hp.current,
      maximum: afterObservation.parties[0].hp.maximum,
    },
  });
  const legal = beforeObservation.legalActions;
  assert.ok(legal.some(action => action.type === 'remove_all_equipment' && action.partyId === party.id && action.characterId === character.id));
  assert.throws(() => applyApiCommand(state, { type: 'remove_all_equipment', partyId: party.id, characterId: 999999 }, deps, Date.now()));
  assert.throws(() => applyApiCommand(state, { type: 'remove_all_equipment', partyId: party.id, characterId: character.id, slotIndex: 0 }, deps, Date.now()));
});
test('remove_all_equipment preserves OFF and SEMI and is a no-op for an empty SEMI character', () => {
  for (const mode of [0, 1] as const) {
    const state = fresh();
    const character = state.parties[0].characters[0];
    character.autoEquipmentMode = mode;
    const next = applyApiCommand(state, { type: 'remove_all_equipment', partyId: state.parties[0].id, characterId: character.id }, deps, Date.now());
    assert.equal(next.parties[0].characters[0].autoEquipmentMode, mode);
  }
  const state = fresh();
  const character = state.parties[0].characters[0];
  character.equipment = character.equipment.map(() => null);
  character.autoEquipmentMode = 1;
  const next = applyApiCommand(state, { type: 'remove_all_equipment', partyId: state.parties[0].id, characterId: character.id }, deps, Date.now());
  assert.deepEqual(next, state);
});
test('actual engine Cycles reconcile XP, outcomes, durations and preserve non-target parties and charge', () => {
  const state = fresh(); const clone = structuredClone(state.parties[0]); clone.id = 2; state.parties.push(clone);
  const before = structuredClone(state); const random = createApiRandom(17);
  const result = withBattleSeedSource(() => 17n, () => withGameplayRandomSource(random.next, () => resolveApiCycles(state, 0, 3, 1000, 'mode.orca', 5, deps)));
  assert.equal(result.response.runs.length, 3);
  assert.equal(Object.values(result.response.outcomes).reduce((a, b) => a + b), 3);
  assert.equal(result.response.totals.experienceGained, result.response.runs.reduce((a, b) => a + b.experienceGained, 0));
  assert.deepEqual(result.state.parties[1], before.parties[1]);
  assert.deepEqual(result.response.charge.before, result.response.charge.after);
  assert.ok(result.response.sortie.partyElapsedEndMs > 3 * 30 * 15000);
  assert.deepEqual(state, before);
});
test('forecasts preserve all input state and do not consume ambient gameplay randomness', async () => {
  const state = fresh(); const before = structuredClone(state); let draws = 0;
  // A scoped synchronous sentinel verifies the async function restores the source before yielding.
  const pending = withGameplayRandomSource(() => { draws++; return 0.5; }, () => simulateExpeditionRuns(state, 0, 'mode.orca', 10, undefined, 5));
  const outcomes = await pending;
  assert.equal(outcomes.total, 10); assert.equal(draws, 0); assert.deepEqual(state, before);
  assert.ok(gameplayRandom() >= 0);
});
test('atomic persistence throws on quota failure and never installs the rejected state later', () => {
  const state = fresh(); let fail = false;
  const coordinator = new PersistenceCoordinator({ storageKey: 'atomic', storage: { ...storage, setItem: (key, value) => { if (fail) throw new Error('quota'); storage.setItem(key, value); } }, workerFactory: () => { throw new Error('API commits must not start a retry worker'); } });
  coordinator.commitAtomic(state);
  const before = values.get('atomic'); fail = true;
  assert.throws(() => coordinator.commitAtomic({ ...state, global: { ...state.global, gold: 9999 } }));
  coordinator.retry(); assert.equal(values.get('atomic'), before);
  assert.equal(JSON.parse(decodePersistedState(before!)).global.gold, state.global.gold);
  coordinator.shutdown();
});
test('evaluation score does not charge simulations as actual sorties', () => {
  const e = createEvaluation('id', 'Forecast', '0.9.6', 12); e.countedApiCalls = 1;
  assert.equal(evaluationSummary(e)!.scoreSoFar, 10);
});

test('evaluation remains active across the former 200-call limit', async () => {
  let state = fresh(); state.apiRuntime!.evaluation!.countedApiCalls = 199;
  for (const expected of [200, 201]) {
    const response = await transactApiRequest({ state, operation: 'observation', payload: {}, persist: async s => { state = structuredClone(s); }, execute: async s => ({ state: s, response: {} }) });
    const evaluation = response.evaluation as ReturnType<typeof evaluationSummary>;
    assert.equal(evaluation!.status, 'active');
    assert.equal(evaluation!.countedApiCalls, expected);
    assert.equal(evaluation!.remainingApiCalls, 20_000 - expected);
    assert.equal(evaluation!.finalScore, null);
  }
});
test('interrupted final reservation exhausts the 20,000-call budget without executing again', async () => {
  const state = fresh(); state.apiRuntime!.evaluation!.countedApiCalls = 20_000;
  const summary = evaluationSummary(state.apiRuntime!.evaluation)!;
  assert.equal(summary.status, 'failed');
  assert.equal(summary.remainingApiCalls, 0);
  assert.equal(summary.finalScore, 300_000);
  const response = await transactApiRequest({ state, operation: 'observation', payload: {}, persist: async () => assert.fail('terminal write'), execute: async () => assert.fail('terminal execution') });
  assert.equal((response.error as { code: string }).code, 'evaluation_finished');
});

test('compact exempt reads reveal final strategy only after termination and do not alter accounting', () => {
  const state = fresh();
  const before = structuredClone(state);
  assert.equal('ledger' in evaluationSummary(state.apiRuntime!.evaluation)!, false);
  const denied = readEvaluation(state, 'evaluation-report', () => assert.fail('active strategic projection'));
  assert.equal((denied.error as { code: string }).code, 'evaluation_active');
  assert.deepEqual(readEvaluation(state, 'evaluation-ledger', () => assert.fail('ledger strategic projection')), { ledger: [] });
  assert.deepEqual(state, before);
  state.apiRuntime!.evaluation!.status = 'succeeded';
  state.apiRuntime!.evaluation!.goalAchieved = true;
  const report = readEvaluation(state, 'evaluation-report', () => ({ observation: { revision: 0 } })).report as { evaluation: { finalScore: number }; ledger: unknown[] };
  assert.equal(report.evaluation.finalScore, 0);
  assert.deepEqual(report.ledger, []);
});
test('public race choices and validation agree, with evaluation-effective availability', () => {
  const state = fresh();
  const observation = buildExperimentalObservation(state, 0, false, {}, 0);
  assert.equal(observation.catalogs.selectableRaceIds.includes('kemoria'), false);
  assert.equal(observation.catalogs.selectableRaceIds.includes('orcinian'), false);
  const member = state.parties[0].characters.find(c => !c.isUnique)!;
  for (const raceId of ['kemoria', 'orcinian']) assert.ok(validateBuild(state, 0, member, { raceId }).some(v => v.field === 'raceId'));
  assert.ok(observation.parties.every(p => !p.expedition.godBattleAvailable));
  state.apiRuntime!.evaluation!.status = 'failed';
  const terminal = buildExperimentalObservation(state, 0, false, {}, 0);
  assert.deepEqual(terminal.legalActions, []);
  assert.ok(terminal.parties.every(p => !p.expedition.normalSortieAvailable && !p.expedition.godBattleAvailable));
});
test('completed return reasons distinguish depth limit, gate and draw without changing legacy counts', () => {
  const state = fresh();
  const result = resolveApiCycles(state, 0, 1, state.apiRuntime!.simulatedAt, 'mode.orca', 5, deps);
  const party = result.state.parties[0];
  assert.ok(party.lastExpeditionLog);
  party.lastExpeditionLog!.finalOutcome = 'Escape';
  party.lastExpeditionLog!.entries.at(-1)!.gateInfo = undefined;
  assert.equal(returnReasonFromParty(party), 'depth_limit');
  party.lastExpeditionLog!.entries.at(-1)!.gateInfo = 'blocked';
  assert.equal(returnReasonFromParty(party), 'clear_gate');
  party.lastExpeditionLog!.finalOutcome = 'Retreat';
  party.lastExpeditionLog!.entries.at(-1)!.outcome = 'draw';
  assert.equal(returnReasonFromParty(party), 'draw');
});

test('candidate comparison matches stable members across rows and includes removed slots without mutation', async () => {
  const { compareApiParties } = await import('../../src/game/experimentalApiComparison');
  const state = fresh();
  const before = buildExperimentalObservation(state, 0, false, {}, 0).parties[0];
  const preserved = structuredClone(before);
  const after = structuredClone(before);
  after.hp.maximum += 10;
  const c = after.characters[0];
  assert.ok(c.computed);
  c.computed.meleeNumberOfAttacks += 3;
  c.build.mainClassId = c.build.mainClassId === 'wizard' ? 'guardian' : 'wizard';
  const removed = c.equipment.pop();
  after.characters.reverse(); after.characters.forEach((v, index) => { v.row = index + 1; });
  const result = compareApiParties(before, after);
  assert.equal(result.maximumHp.delta, 10);
  const change = result.characters.find(v => v.characterId === c.id)!;
  assert.ok(change.combatChanges.some(v => v.field === 'meleeNumberOfAttacks' && v.delta === 3));
  assert.ok(change.buildChanges.some(v => v.field === 'mainClassId'));
  assert.equal(change.row.before, 1); assert.equal(change.row.after, after.characters.length);
  if (removed) assert.deepEqual(change.equipmentChanges.find(v => v.slotIndex === removed.slotIndex), { slotIndex: removed.slotIndex, before: removed, after: null });
  assert.deepEqual(before, preserved);
  const unchanged = compareApiParties(before, before);
  assert.equal(unchanged.maximumHp.delta, 0);
  assert(unchanged.characters.every(v => !v.combatChanges.length && !v.equipmentChanges.length && !v.buildChanges.length));
});

test('invalid builds expose all member paths and preserve gameplay with one counted rejection', async () => {
  let state = fresh(); const initial = structuredClone(state);
  const ids = state.parties[0].characters.slice(0, 2).map(c => c.id);
  const configuration = { characters: ids.map(characterId => ({ characterId, changes: { mainClassId: 'not-a-class' } })) };
  const response = await transactApiRequest({ state, operation: 'command', payload: {}, persist: async s => { state = structuredClone(s); }, execute: async s => ({ state: configureParty(s, 0, configuration, deps), response: {} }) });
  const error = response.error as { code: string; details: { field: string; violations: Array<{ field: string; code: string; characterId: number }> } };
  assert.equal(error.code, 'invalid_build');
  assert.deepEqual(error.details.violations, ids.map((characterId, index) => ({ field: `configuration.characters[${index}].changes.mainClassId`, code: 'unavailable_selection', characterId })));
  assert.equal(error.details.field, 'configuration.characters[0].changes.mainClassId');
  assert.deepEqual(state.parties, initial.parties); assert.deepEqual(state.global, initial.global);
  assert.equal(state.apiRuntime!.randomState, initial.apiRuntime!.randomState);
  assert.equal(state.apiRuntime!.revision, initial.apiRuntime!.revision);
  assert.equal(state.apiRuntime!.evaluation!.countedApiCalls, 1); assert.equal(state.apiRuntime!.evaluation!.actualSorties, 0);
});

test('configuration structural errors retain codes and identify nested fields', () => {
  const state = fresh(); const id = state.parties[0].characters[0].id;
  const cases = [
    { configuration: { characters: [{ characterId: id, autoEquipmentMode: 'FULL' }] }, field: 'configuration.characters[0].autoEquipmentMode', code: 'invalid_equipment_mode' },
    { configuration: { characters: [{ characterId: id, changes: null }] }, field: 'configuration.characters[0].changes', code: 'object_required' },
    { configuration: { destination: { mode: 'typo' } }, field: 'configuration.destination.mode', code: 'invalid_destination_mode' },
    { configuration: { depthLimit: 'typo' }, field: 'configuration.depthLimit', code: 'invalid_depth_limit' },
    { configuration: { autoEquip: 'true' }, field: 'configuration.autoEquip', code: 'boolean_required' },
    { configuration: { surprise: true }, field: 'configuration.surprise', code: 'unknown_field' },
    { configuration: { locks: [{ characterId: id, slotIndex: -1, locked: true }] }, field: 'configuration.locks[0].slotIndex', code: 'occupied_slot_required' },
  ];
  for (const entry of cases) {
    const original = structuredClone(state);
    assert.throws(() => configureParty(state, 0, entry.configuration, deps), (e: unknown) => {
      const error = (e as { response: { error: { details: { field: string; violations: Array<{ code: string }> } } } }).response.error;
      assert.equal(error.details.field, entry.field); assert.equal(error.details.violations[0].code, entry.code); return true;
    });
    assert.deepEqual(state, original);
  }
});

test('recommended opening guide contains valid JSON and a legal fresh-state configuration', () => {
  const guide = readFileSync('playing_guide/Playing_Guide_Recommended_Opening_Build.md', 'utf8');
  const blocks = [...guide.matchAll(/```json\n([\s\S]*?)\n```/g)].flatMap(match => {
    try { return [JSON.parse(match[1])]; }
    catch { return match[1].split('\n').filter(Boolean).map(line => JSON.parse(line)); }
  });
  assert.ok(blocks.length >= 10);
  const configuration = blocks.find(value => value?.characters && value?.order);
  assert.ok(configuration);
  const state = fresh();
  const next = configureParty(state, 0, configuration, deps);
  assert.deepEqual(next.parties[0].characters.map(character => character.id), configuration.order);
  assert.equal(next.parties[0].expeditionDepthLimit, '1f-3');
});
