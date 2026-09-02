import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { prepareExpeditionRun } from '../../src/game/expeditionPreparation.ts';
import { computePartyStats } from '../../src/game/partyComputation.ts';
import type { Dungeon, GameBags, Party } from '../../src/types/index.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

function fixtureParty(): { state: ReturnType<typeof loadAndValidateExpedition8Fixture>['state']; party: Party } {
  const { state } = loadAndValidateExpedition8Fixture();
  const source = state.parties[0];
  const computed = computePartyStats(source);
  return {
    state,
    party: { ...source, currentHp: computed.partyStats.hp },
  };
}

function dungeonFor(party: Party): Dungeon {
  return {
    id: party.selectedDungeonId,
    name: 'Test Dungeon',
    expLevel: 1,
    floors: [],
  } as unknown as Dungeon;
}

function preparationLookups(party: Party) {
  const dungeon = dungeonFor(party);
  return {
    getDungeon: (dungeonId: number) => dungeonId === dungeon.id ? dungeon : undefined,
    getTerrainOverride: () => undefined,
    isGodsBattleAvailable: () => false,
  };
}

test('preflight rejects an unavailable dungeon before bag normalization', () => {
  const { state, party } = fixtureParty();
  let normalizationCalls = 0;
  const result = prepareExpeditionRun({
    currentParty: { ...party, selectedDungeonId: 999_999 },
    global: state.global,
    ...preparationLookups(party),
    normalizeBags: (bags) => {
      normalizationCalls += 1;
      return bags;
    },
  });

  assert.deepEqual(result, { status: 'dungeon-unavailable' });
  assert.equal(normalizationCalls, 0);
});

test('preflight records HP ineligibility without constructing transaction inputs', () => {
  const { state, party } = fixtureParty();
  let normalizationCalls = 0;
  const result = prepareExpeditionRun({
    currentParty: { ...party, currentHp: 0 },
    global: state.global,
    ...preparationLookups(party),
    normalizeBags: (bags) => {
      normalizationCalls += 1;
      return bags;
    },
  });

  assert.deepEqual(result, {
    status: 'party-hp-ineligible',
    statusAuthoritySupplied: false,
  });
  assert.equal(normalizationCalls, 0);
});

test('preflight prefers Chunk authority and constructs the shared context and transaction', () => {
  const { state, party } = fixtureParty();
  const chunkParty = { ...party, name: 'Chunk authority' };
  const authoritativeParty = { ...party, name: 'Fallback authority' };
  const chunkComputed = computePartyStats(chunkParty);
  const authoritativeComputed = computePartyStats(authoritativeParty);
  const normalizedBags = { marker: 'normalized' } as unknown as GameBags;
  const result = prepareExpeditionRun({
    currentParty: party,
    global: state.global,
    ...preparationLookups(party),
    triggerGodsBattle: false,
    chunkPartyStatus: { party: chunkParty, computed: chunkComputed },
    authoritativePartyStatus: { party: authoritativeParty, computed: authoritativeComputed },
    normalizeBags: () => normalizedBags,
  });

  assert.equal(result.status, 'prepared');
  if (result.status !== 'prepared') return;
  assert.equal(result.statusAuthoritySupplied, true);
  assert.equal(result.statusParty, chunkParty);
  assert.equal(result.partyStatus, chunkComputed);
  assert.equal(result.context.statusParty, chunkParty);
  assert.equal(result.context.partyStatus, chunkComputed);
  assert.equal(result.transaction.initialHp, chunkComputed.partyStats.hp);
  assert.equal(result.transaction.bags, normalizedBags);
  assert.equal(result.transaction.enemyBattleStats, state.global.enemyBattleStats);
  assert.equal(result.isGodsBattle, false);
});

test('preflight computes fallback authority and preserves ordered ability disclosures', () => {
  const { state, party } = fixtureParty();
  const result = prepareExpeditionRun({
    currentParty: party,
    global: state.global,
    ...preparationLookups(party),
    normalizeBags: (bags) => bags,
  });

  assert.equal(result.status, 'prepared');
  if (result.status !== 'prepared') return;
  assert.equal(result.statusAuthoritySupplied, false);
  assert.equal(result.statusParty, party);
  assert.deepEqual(
    result.transaction.revealedAbilityIds?.slice(0, state.global.revealedGlossaryAbilityIds.length),
    state.global.revealedGlossaryAbilityIds,
  );
  assert.deepEqual(
    result.transaction.revealedTerrainKeys,
    state.global.revealedGlossaryTerrainKeys,
  );
});

test('RUN_EXPEDITION delegates preflight while retaining diagnostics and early returns', () => {
  const preparationSource = readFileSync(
    resolve(process.cwd(), 'src/game/expeditionPreparation.ts'),
    'utf8',
  );
  const hookSource = readFileSync(resolve(process.cwd(), 'src/hooks/useGameState.ts'), 'utf8');
  const applicationSource = readFileSync(resolve(process.cwd(), 'src/game/expeditionApplication.ts'), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';

  assert.match(runExpedition, /runExpeditionApplication\(/);
  assert.match(applicationSource, /const preparation = prepareExpeditionRun\(/);
  assert.match(applicationSource, /dungeon-unavailable/);
  assert.match(runExpedition, /recordRunExpeditionStatusAuthority\(result\.statusAuthoritySupplied\)/);
  assert.match(applicationSource, /party-hp-ineligible/);
  assert.match(applicationSource, /runExpeditionService\(\{[\s\S]{0,220}transaction,/);
  assert.doesNotMatch(applicationSource, /const suppliedPartyStatus|const persistedCurrentHp|createExpeditionRunContext\(/);
  assert.doesNotMatch(preparationSource, /gameplayRandom|Math\.random|Date\.now|recordRunExpeditionStatusAuthority|runExpeditionService/);
});
