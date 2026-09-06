import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialStateBase, gameReducer, calculateFreeActionSpend, calculatePrayerProfit, getPartyAbilityLevel, hasActiveNonGodBattleClearGateCondition, simulateExpeditionRuns } from '../../src/hooks/useGameState';
import { createApiRuntime, createEvaluation, transactApiRequest, evaluationSummary } from '../../src/game/experimentalApiSession';
import { applyApiCommand, configureParty, validateBuild } from '../../src/game/experimentalApiStrategy';
import { resolveApiCycles } from '../../src/game/experimentalApiCycle';
import { createApiRandom, withGameplayRandomSource, gameplayRandom } from '../../src/game/gameplayRandom';
import { withBattleSeedSource } from '../../src/game/battleSeedSource';
import { ensureLanguageLoaded, setLanguage } from '../../src/i18n';
import { PersistenceCoordinator } from '../../src/game/savePersistence';
import { decodePersistedState } from '../../src/game/storageCompression';
import type { GameState } from '../../src/types';
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
test('call 200 may win, exact batch counts and terminal requests are enforced', async () => {
  let state = fresh(); state.apiRuntime!.evaluation!.countedApiCalls = 199;
  let executed = 0;
  const result = await transactApiRequest({ state, operation: 'sortie', payload: { count: 100 }, persist: async s => { state = structuredClone(s); }, execute: async s => {
    executed++; s.parties[0].defeatedBossExpeditions[1] = true;
    return { state: s, actualSorties: 100, firstWinningSortie: 30, response: {} };
  } });
  assert.equal(executed, 1);
  assert.equal((result.evaluation as { finalScore: number }).finalScore, 2100);
  assert.equal(state.apiRuntime!.evaluation!.firstWinningSortie, 30);
  const denied = await transactApiRequest({ state, operation: 'observation', payload: {}, persist: async () => assert.fail('terminal write'), execute: async () => { throw new Error('should not execute'); } });
  assert.equal((denied.error as { code: string }).code, 'evaluation_finished');
});
test('failed request 200 exhausts budget and applies failure penalty', async () => {
  let state = fresh(); state.apiRuntime!.evaluation!.countedApiCalls = 199;
  const response = await transactApiRequest({ state, operation: 'command', payload: {}, persist: async s => { state = structuredClone(s); }, execute: async () => { throw new Error('failed'); } });
  assert.equal((response.evaluation as { finalScore: number }).finalScore, 102000);
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
