import type { InventoryRecord, Item } from '../types/index.ts';
import type { ExpeditionRewardInstallation } from './expeditionService.ts';

export interface ExpeditionInventoryOverlay {
  readonly record: InventoryRecord;
  checkpoint(): number;
  rollback(checkpoint: number): void;
  releaseCheckpoint(): void;
}

export interface ExpeditionInventoryInstallationResult<TPresentation>
  extends ExpeditionRewardInstallation<TPresentation> {
  readonly inventory: InventoryRecord;
  readonly gold: number;
}

export interface CreateExpeditionInventoryCoordinatorInput<TPresentation> {
  readonly inventory: InventoryRecord;
  readonly gold: number;
  readonly overlay?: ExpeditionInventoryOverlay;
  readonly install: (
    recoveredItems: readonly Item[],
    inventory: InventoryRecord,
    gold: number,
    mutateInventory: boolean,
  ) => ExpeditionInventoryInstallationResult<TPresentation>;
}

export interface CompletedExpeditionInventoryCoordination {
  readonly inventory: InventoryRecord;
  readonly installedGold: number;
}

/**
 * Application-owned inventory/checkpoint coordination. Reward mechanics remain
 * injected, while the domain service receives only the synchronous installer.
 */
export class ExpeditionInventoryCoordinator<TPresentation> {
  private readonly input: CreateExpeditionInventoryCoordinatorInput<TPresentation>;
  private readonly checkpoint: number | undefined;
  private currentInventory: InventoryRecord;
  private currentGold: number;

  constructor(input: CreateExpeditionInventoryCoordinatorInput<TPresentation>) {
    this.input = input;
    this.checkpoint = input.overlay?.checkpoint();
    this.currentInventory = input.overlay?.record ?? input.inventory;
    this.currentGold = input.gold;
  }

  readonly installRecoveredItems = (
    recoveredItems: readonly Item[],
  ): ExpeditionRewardInstallation<TPresentation> => {
    const result = this.input.install(
      recoveredItems,
      this.currentInventory,
      this.currentGold,
      this.input.overlay !== undefined,
    );
    this.currentInventory = result.inventory;
    this.currentGold = result.gold;
    return result;
  };

  get installedGold(): number {
    return this.currentGold;
  }

  complete(shouldRollbackInventory: boolean): CompletedExpeditionInventoryCoordination {
    if (shouldRollbackInventory && this.input.overlay && this.checkpoint !== undefined) {
      this.input.overlay.rollback(this.checkpoint);
    }
    const inventory = this.input.overlay?.record
      ?? (shouldRollbackInventory ? this.input.inventory : this.currentInventory);
    this.input.overlay?.releaseCheckpoint();
    return { inventory, installedGold: this.currentGold };
  }
}
