import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ExpeditionInventoryCoordinator,
  type ExpeditionInventoryOverlay,
} from '../src/game/expeditionInventory.ts';
import type { InventoryRecord, Item } from '../src/types/index.ts';

function inventory(marker: number): InventoryRecord {
  return { marker: { count: marker } } as unknown as InventoryRecord;
}

function item(id: number): Item {
  return { id, enhancement: 0, superRare: 0 } as Item;
}

class TestOverlay implements ExpeditionInventoryOverlay {
  readonly record: InventoryRecord;
  checkpointCalls = 0;
  rollbackCalls: number[] = [];
  releaseCalls = 0;
  private snapshot: InventoryRecord = {};

  constructor(record: InventoryRecord) {
    this.record = record;
  }

  checkpoint(): number {
    this.checkpointCalls += 1;
    this.snapshot = { ...this.record };
    return 17;
  }

  rollback(checkpoint: number): void {
    this.rollbackCalls.push(checkpoint);
    Object.keys(this.record).forEach((key) => delete this.record[key]);
    Object.assign(this.record, this.snapshot);
  }

  releaseCheckpoint(): void {
    this.releaseCalls += 1;
  }
}

test('online inventory coordination preserves synchronous installation and successful output', () => {
  const base = inventory(1);
  const installed = inventory(2);
  const recovered = item(101);
  const calls: unknown[][] = [];
  const coordinator = new ExpeditionInventoryCoordinator({
    inventory: base,
    gold: 100,
    install: (items, currentInventory, gold, mutateInventory) => {
      calls.push([items, currentInventory, gold, mutateInventory]);
      return {
        inventory: installed,
        gold: 125,
        retainedItems: items,
        autoSoldItems: [],
        presentation: { marker: 'presentation' },
      };
    },
  });

  const serviceResult = coordinator.installRecoveredItems([recovered]);
  assert.deepEqual(calls, [[[recovered], base, 100, false]]);
  assert.equal(serviceResult.presentation.marker, 'presentation');
  assert.equal(coordinator.installedGold, 125);
  assert.deepEqual(coordinator.complete(false), {
    inventory: installed,
    installedGold: 125,
  });
});

test('online Defeat coordination restores the authoritative input inventory', () => {
  const base = inventory(1);
  const coordinator = new ExpeditionInventoryCoordinator({
    inventory: base,
    gold: 100,
    install: (items) => ({
      inventory: inventory(2),
      gold: 125,
      retainedItems: items,
      autoSoldItems: [],
      presentation: null,
    }),
  });

  coordinator.installRecoveredItems([item(101)]);
  assert.equal(coordinator.complete(true).inventory, base);
});

test('AFK inventory coordination checkpoints, mutates, rolls back, and releases its overlay', () => {
  const base = inventory(1);
  const overlay = new TestOverlay(inventory(1));
  const coordinator = new ExpeditionInventoryCoordinator({
    inventory: base,
    gold: 100,
    overlay,
    install: (items, currentInventory, gold, mutateInventory) => {
      assert.equal(currentInventory, overlay.record);
      assert.equal(gold, 100);
      assert.equal(mutateInventory, true);
      currentInventory.added = { count: 1 } as InventoryRecord[string];
      return {
        inventory: currentInventory,
        gold: 150,
        retainedItems: items,
        autoSoldItems: [],
        presentation: null,
      };
    },
  });

  assert.equal(overlay.checkpointCalls, 1);
  coordinator.installRecoveredItems([item(101)]);
  const completed = coordinator.complete(true);
  assert.equal(completed.inventory, overlay.record);
  assert.equal(completed.installedGold, 150);
  assert.deepEqual(overlay.rollbackCalls, [17]);
  assert.equal(overlay.releaseCalls, 1);
  assert.equal(overlay.record.added, undefined);
});

test('successful AFK coordination retains overlay mutations and only releases the checkpoint', () => {
  const overlay = new TestOverlay(inventory(1));
  const coordinator = new ExpeditionInventoryCoordinator({
    inventory: inventory(1),
    gold: 100,
    overlay,
    install: (items, currentInventory) => {
      currentInventory.added = { count: 1 } as InventoryRecord[string];
      return {
        inventory: currentInventory,
        gold: 100,
        retainedItems: items,
        autoSoldItems: [],
        presentation: null,
      };
    },
  });

  coordinator.installRecoveredItems([item(101)]);
  coordinator.complete(false);
  assert.deepEqual(overlay.rollbackCalls, []);
  assert.equal(overlay.releaseCalls, 1);
  assert.equal(overlay.record.added?.count, 1);
});

test('RUN_EXPEDITION delegates checkpoint lifecycle to the inventory coordinator', () => {
  const coordinatorSource = readFileSync(
    new URL('../src/game/expeditionInventory.ts', import.meta.url),
    'utf8',
  );
  const hookSource = readFileSync(new URL('../src/hooks/useGameState.ts', import.meta.url), 'utf8');
  const applicationSource = readFileSync(new URL('../src/game/expeditionApplication.ts', import.meta.url), 'utf8');
  const runExpedition = hookSource.match(/case 'RUN_EXPEDITION':[\s\S]*?case 'FINALIZE_DIARY_LOG':/)?.[0] ?? '';

  assert.match(runExpedition, /runExpeditionApplication\(/);
  assert.match(applicationSource, /new ExpeditionInventoryCoordinator\(/);
  assert.match(applicationSource, /installRecoveredItems: inventoryCoordinator\.installRecoveredItems/);
  assert.match(applicationSource, /installedGold: inventoryCoordinator\.installedGold/);
  assert.match(applicationSource, /inventoryCoordinator\.complete\(\s*finalization\.shouldRollbackInventory/);
  assert.doesNotMatch(applicationSource, /inventoryOverlay\.(checkpoint|rollback|releaseCheckpoint)\(/);
  assert.doesNotMatch(applicationSource, /let (currentInventory|currentGold)\b/);
  assert.doesNotMatch(coordinatorSource, /gameplayRandom|Math\.random|Date\.now|runExpeditionService/);
});
