import { getDungeonById } from '../data/dungeons.ts';
import { ENEMIES } from '../data/enemies.ts';
import { DEITY_OPTIONS, isNoFaithDeity, normalizeDeityName } from './deity.ts';
import type { DiarySettings, GameBags, InventoryRecord, Item, Party } from '../types/index.ts';
import { refillBagIfEmpty } from './bags.ts';
import { isGodsBattleAvailable } from './clearGate.ts';
import { getColosseumEnemySettings } from './colosseum.ts';
import type { ExpeditionApplicationAdapters } from './expeditionApplication.ts';
import type { ExpeditionInventoryOverlay } from './expeditionInventory.ts';
import {
  installRecoveredExpeditionRewards,
  type InventoryItemAdditionResult,
} from './expeditionRewardInstallation.ts';
import type { EnemyDef } from '../types/index.ts';

export const DEFAULT_UNLOCKED_DEITIES: readonly string[] = DEITY_OPTIONS
  .map((deity) => normalizeDeityName(deity.name))
  .filter((deityName) => !isNoFaithDeity(deityName));

export interface DefaultExpeditionAdapterStaticDependencies {
  readonly normalizeBags: (bags: Party['bags']) => GameBags;
  readonly getDiarySettings: (settings: Partial<DiarySettings> | undefined) => DiarySettings;
  readonly addItemToInventory: (
    inventory: InventoryRecord,
    item: Item,
    gold: number,
    autoSellMultiplier: number,
    mutateInventory: boolean,
  ) => InventoryItemAdditionResult;
}

export interface ExpeditionAdapterInvocationContext {
  readonly inventoryOverlay?: ExpeditionInventoryOverlay;
  readonly encounterCache?: Map<string, EnemyDef>;
}

/** Creates the stable environment adapter bundle used by every expedition caller. */
export function createDefaultExpeditionApplicationAdapterFactory(
  dependencies: DefaultExpeditionAdapterStaticDependencies,
): (context?: ExpeditionAdapterInvocationContext) => ExpeditionApplicationAdapters {
  return (context = {}) => ({
    normalizeBags: dependencies.normalizeBags,
    getDungeon: getDungeonById,
    getTerrainOverride: (dungeon) => {
      if (dungeon.id !== 99) return undefined;
      const terrainEffect = getColosseumEnemySettings().terrainEffect;
      return terrainEffect === 'none' ? undefined : terrainEffect;
    },
    isGodsBattleAvailable,
    installRecoveredItems: (input) => installRecoveredExpeditionRewards({
      ...input,
      addItemToInventory: dependencies.addItemToInventory,
    }),
    refillBag: refillBagIfEmpty,
    enemyDefinitions: ENEMIES,
    getDiarySettings: dependencies.getDiarySettings,
    defaultUnlockedDeities: DEFAULT_UNLOCKED_DEITIES,
    ...(context.inventoryOverlay ? { inventoryOverlay: context.inventoryOverlay } : {}),
    ...(context.encounterCache ? { encounterCache: context.encounterCache } : {}),
  });
}
