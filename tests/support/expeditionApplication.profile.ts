import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { getDungeonById } from '../../src/data/dungeons.ts';
import { normalizeGameBags, refillBagIfEmpty } from '../../src/game/bags.ts';
import {
  runExpeditionApplication,
  type ExpeditionApplicationAdapters,
} from '../../src/game/expeditionApplication.ts';
import { createDefaultExpeditionApplicationAdapterFactory } from '../../src/game/expeditionApplicationAdapters.ts';
import { installRecoveredExpeditionRewards } from '../../src/game/expeditionRewardInstallation.ts';
import { computePartyStats } from '../../src/game/partyComputation.ts';
import { loadAndValidateExpedition8Fixture } from './expedition8SaveFixture.ts';

function createAdapters(): ExpeditionApplicationAdapters {
  return {
    normalizeBags: normalizeGameBags,
    getDungeon: getDungeonById,
    getTerrainOverride: () => undefined,
    isGodsBattleAvailable: () => false,
    installRecoveredItems: () => {
      throw new Error('unreachable reward installation');
    },
    refillBag: refillBagIfEmpty,
    enemyDefinitions: [],
    getDiarySettings: (settings) => settings as NonNullable<typeof settings>,
    defaultUnlockedDeities: [],
  };
}

test('application runner preserves unavailable preflight without acquiring RNG or time', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  let randomCalls = 0;
  let timeCalls = 0;
  const result = runExpeditionApplication({
    state,
    command: { partyIndex: 0 },
    authorities: {
      random: () => {
        randomCalls += 1;
        return 0.5;
      },
      getCommittedAt: () => {
        timeCalls += 1;
        return 123;
      },
    },
    adapters: { ...createAdapters(), getDungeon: () => undefined },
  });

  assert.deepEqual(result, { kind: 'unchanged', reason: 'dungeon-unavailable' });
  assert.equal(randomCalls, 0);
  assert.equal(timeCalls, 0);
});

test('application runner returns supplied status authority for HP-ineligible preflight', () => {
  const { state: fixtureState } = loadAndValidateExpedition8Fixture();
  const authoritativeParty = fixtureState.parties[0];
  const state = {
    ...fixtureState,
    parties: [{ ...authoritativeParty, currentHp: 0 }, ...fixtureState.parties.slice(1)],
  };
  const result = runExpeditionApplication({
    state,
    command: {
      partyIndex: 0,
      authoritativePartyStatus: {
        party: authoritativeParty,
        computed: computePartyStats(authoritativeParty),
      },
    },
    authorities: {
      random: () => {
        throw new Error('HP rejection must not acquire RNG');
      },
      getCommittedAt: () => {
        throw new Error('HP rejection must not acquire time');
      },
    },
    adapters: createAdapters(),
  });

  assert.deepEqual(result, {
    kind: 'unchanged',
    reason: 'party-hp-ineligible',
    statusAuthoritySupplied: true,
  });
});

test('application runner owns ordering but excludes reducer side effects', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/game/expeditionApplication.ts'), 'utf8');
  const preparation = source.indexOf('prepareExpeditionRun({');
  const inventory = source.indexOf('new ExpeditionInventoryCoordinator({');
  const service = source.indexOf('runExpeditionService({');
  const postService = source.indexOf('planExpeditionPostService({');
  const checkpointCompletion = source.indexOf('inventoryCoordinator.complete(');
  const completion = source.indexOf('completeExpeditionPresentation({');
  const forecast = source.indexOf("if (command.resolutionMode === 'forecast')");
  const commit = source.indexOf('planExpeditionCommit({');

  assert.ok(
    preparation < inventory
      && inventory < service
      && service < postService
      && postService < checkpointCompletion
      && checkpointCompletion < completion
      && completion < forecast
      && forecast < commit,
  );
  assert.doesNotMatch(
    source,
    /recordRunExpeditionStatusAuthority|forecastResolutionByState|WeakMap|gameplayRandom|Date\.now/,
  );
});

test('reward installation preserves retained and auto-sold presentation facts', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const item = Object.values(state.global.inventory).find((variant) => variant.count > 0)?.item;
  assert.ok(item);
  let calls = 0;
  const result = installRecoveredExpeditionRewards({
    recoveredItems: [item, item],
    inventory: state.global.inventory,
    gold: 100,
    autoSellMultiplier: 1.5,
    mutateInventory: true,
    addItemToInventory: (inventory, receivedItem, gold, multiplier, mutateInventory) => {
      calls += 1;
      assert.equal(receivedItem, item);
      assert.equal(multiplier, 1.5);
      assert.equal(mutateInventory, true);
      return calls === 1
        ? { inventory, gold, wasAutoSold: false, autoSellProfit: 0 }
        : { inventory, gold: gold + 75, wasAutoSold: true, autoSellProfit: 75 };
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.gold, 175);
  assert.deepEqual(result.retainedItems, [item]);
  assert.deepEqual(result.autoSoldItems, [{ item, profit: 75 }]);
  assert.equal(result.presentation.rewards.length, 1);
  assert.equal(result.presentation.rewardNames.length, 1);
  assert.deepEqual(
    result.presentation.rewardLogEntries.map((entry) => entry.autoSellProfit),
    [undefined, 75],
  );
});

test('default adapter factory adds only invocation-scoped AFK authorities', () => {
  const { state } = loadAndValidateExpedition8Fixture();
  const inventoryOverlay = {
    record: state.global.inventory,
    checkpoint: () => 0,
    rollback: () => undefined,
    releaseCheckpoint: () => undefined,
  };
  const encounterCache = new Map();
  const normalizeBags = (bags: typeof state.parties[0]['bags']) => normalizeGameBags(bags);
  const getDiarySettings = (settings: Parameters<ExpeditionApplicationAdapters['getDiarySettings']>[0]) => (
    settings as ReturnType<ExpeditionApplicationAdapters['getDiarySettings']>
  );
  const factory = createDefaultExpeditionApplicationAdapterFactory({
    normalizeBags,
    getDiarySettings,
    addItemToInventory: (inventory, _item, gold) => ({
      inventory,
      gold,
      wasAutoSold: false,
      autoSellProfit: 0,
    }),
  });
  const adapters = factory({ inventoryOverlay, encounterCache });

  assert.equal(adapters.normalizeBags, normalizeBags);
  assert.equal(adapters.getDiarySettings, getDiarySettings);
  assert.equal(adapters.inventoryOverlay, inventoryOverlay);
  assert.equal(adapters.encounterCache, encounterCache);
  assert.ok(adapters.getDungeon(state.parties[0].selectedDungeonId));
  assert.ok(adapters.defaultUnlockedDeities.length > 0);
});
