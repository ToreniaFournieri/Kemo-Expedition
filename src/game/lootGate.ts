import { Item, Party } from '../types';
import { getDebugSettings } from './debugSettings';

export type GateRarity = 'uncommon' | 'eliteRare' | 'bossRare';

export const ELITE_GATE_REQUIREMENTS: Record<number, number> = {
  1: 3,
  2: 9,
  3: 18,
  4: 30,
  5: 45,
};

export const ENTRY_GATE_REQUIRED = 1;
export const BOSS_GATE_REQUIRED = 3;
export const GODS_BATTLE_REQUIRED = 10;

// SpecRef: 5.3.1 | "Loot-Gate" progression system | getGodsBattleRequired
export function getGodsBattleRequired(): number {
  const settings = getDebugSettings();
  return settings.godsBattleCondition === 'simple1' ? 1 : GODS_BATTLE_REQUIRED;
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | getLootCollectionKey
export function getLootCollectionKey(tier: number, rarity: GateRarity): string {
  return `${tier}:${rarity}`;
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | getLootCollectionCount
export function getLootCollectionCount(party: Pick<Party, 'lootGateProgress'>, tier: number, rarity: GateRarity): number {
  const key = getLootCollectionKey(tier, rarity);
  return party.lootGateProgress?.[key] ?? 0;
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | getEntryGateKey
export function getEntryGateKey(dungeonId: number): number {
  return dungeonId * 1000 + 101;
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | getEliteGateKey
export function getEliteGateKey(dungeonId: number, floorNumber: number): number {
  return dungeonId * 1000 + floorNumber * 10 + 4;
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | getBossGateKey
export function getBossGateKey(dungeonId: number): number {
  return dungeonId * 1000 + 604;
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | isLootGateUnlocked
export function isLootGateUnlocked(party: Pick<Party, 'lootGateStatus'>, gateKey: number): boolean {
  return Boolean(party.lootGateStatus?.[gateKey]);
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | getItemRarityForLootGate
export function getItemRarityForLootGate(itemId: number): GateRarity | null {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return null;
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | addRecoveredItemsToLootProgress
export function addRecoveredItemsToLootProgress(currentProgress: Record<string, number>, recoveredItems: Item[]): Record<string, number> {
  const nextProgress = { ...currentProgress };
  for (const item of recoveredItems) {
    const rarity = getItemRarityForLootGate(item.id);
    if (!rarity) continue;
    const tier = Math.floor(item.id / 1000);
    const key = getLootCollectionKey(tier, rarity);
    nextProgress[key] = (nextProgress[key] ?? 0) + 1;
  }
  return nextProgress;
}

// SpecRef: 5.3.1 | "Loot-Gate" progression system | unlockAvailableLootGates
export function unlockAvailableLootGates(
  currentStatus: Record<number, boolean>,
  progress: Record<string, number>,
  maxDungeonId: number
): Record<number, boolean> {
  const nextStatus = { ...currentStatus };

  for (let dungeonId = 1; dungeonId <= maxDungeonId; dungeonId++) {
    const uncommonCount = progress[getLootCollectionKey(dungeonId, 'uncommon')] ?? 0;
    for (let floor = 1; floor <= 5; floor++) {
      const required = ELITE_GATE_REQUIREMENTS[floor] ?? 3;
      if (uncommonCount >= required) {
        nextStatus[getEliteGateKey(dungeonId, floor)] = true;
      }
    }

    const eliteRareCount = progress[getLootCollectionKey(dungeonId, 'eliteRare')] ?? 0;
    if (eliteRareCount >= BOSS_GATE_REQUIRED) {
      nextStatus[getBossGateKey(dungeonId)] = true;
    }

    if (dungeonId > 1) {
      const previousBossRare = progress[getLootCollectionKey(dungeonId - 1, 'bossRare')] ?? 0;
      if (previousBossRare >= ENTRY_GATE_REQUIRED) {
        nextStatus[getEntryGateKey(dungeonId)] = true;
      }
    }
  }

  return nextStatus;
}
