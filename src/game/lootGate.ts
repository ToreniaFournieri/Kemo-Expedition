import { Item, Party } from '../types';
import { t } from '../i18n';
import { getDebugSettings } from './debugSettings';

type GateRarity = 'uncommon' | 'eliteRare' | 'bossRare';
type GateRoomType = 'battle_Normal' | 'battle_Elite' | 'battle_Boss';

type LootGateCheckResult =
  | { blocked: false }
  | {
      blocked: true;
      required: number;
      collected: number;
      label: string;
    };

export const ELITE_GATE_REQUIREMENTS: Record<number, number> = {
  1: 2,
  2: 6,
  3: 12,
  4: 20,
  5: 30,
};

export const ENTRY_GATE_REQUIRED = 1;
export const BOSS_GATE_REQUIRED = 3;
const GODS_BATTLE_REQUIRED = 3;

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | getGodsBattleRequired
export function getGodsBattleRequired(): number {
  const settings = getDebugSettings();
  return settings.godsBattleCondition === 'simple1' ? 1 : GODS_BATTLE_REQUIRED;
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | Gods battle gate
export function hasDefeatedDungeonBoss(
  party: Pick<Party, 'defeatedBossExpeditions'>,
  dungeonId: number,
): boolean {
  return Boolean(party.defeatedBossExpeditions?.[dungeonId]);
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | getLootCollectionKey
export function getLootCollectionKey(tier: number, rarity: GateRarity): string {
  return `${tier}:${rarity}`;
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | getLootCollectionCount
export function getLootCollectionCount(party: Pick<Party, 'lootGateProgress'>, tier: number, rarity: GateRarity): number {
  const key = getLootCollectionKey(tier, rarity);
  return party.lootGateProgress?.[key] ?? 0;
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | getEntryGateKey
export function getEntryGateKey(dungeonId: number): number {
  return dungeonId * 1000 + 101;
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | getEliteGateKey
export function getEliteGateKey(dungeonId: number, floorNumber: number): number {
  return dungeonId * 1000 + floorNumber * 10 + 4;
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | getBossGateKey
export function getBossGateKey(dungeonId: number): number {
  return dungeonId * 1000 + 604;
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | isLootGateUnlocked
export function isLootGateUnlocked(party: Pick<Party, 'lootGateStatus'>, gateKey: number): boolean {
  return Boolean(party.lootGateStatus?.[gateKey]);
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | getItemRarityForLootGate
export function getItemRarityForLootGate(itemId: number): GateRarity | null {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return null;
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | checkLootGateRequirement
export function checkLootGateRequirement(params: {
  dungeonId: number;
  floorNumber: number;
  roomInFloor: number;
  roomType: GateRoomType;
  tier: number;
  party: Pick<Party, 'lootGateProgress' | 'lootGateStatus' | 'defeatedBossExpeditions'>;
}): LootGateCheckResult {
  const { dungeonId, floorNumber, roomInFloor, roomType, tier, party } = params;
  if (dungeonId === 99) return { blocked: false };

  // Entering gate (1,1): previous expedition boss clear requirement. First expedition is exempt.
  if (floorNumber === 1 && roomInFloor === 1 && tier > 1) {
    const prevTier = tier - 1;
    const required = ENTRY_GATE_REQUIRED;
    const collected = party.defeatedBossExpeditions?.[prevTier] ? 1 : 0;
    const gateUnlocked = isLootGateUnlocked(party, getEntryGateKey(dungeonId)) || collected >= required;
    if (!gateUnlocked) {
      return {
        blocked: true,
        required,
        collected,
        label: t('home.gate.bossDefeated'),
      };
    }
    return { blocked: false };
  }

  // Elite/Boss gates are checked at room x,4.
  if (roomInFloor !== 4) return { blocked: false };

  if (roomType === 'battle_Elite') {
    const required = ELITE_GATE_REQUIREMENTS[floorNumber] ?? 3;
    const collected = getLootCollectionCount(party, tier, 'uncommon');
    const gateUnlocked = isLootGateUnlocked(party, getEliteGateKey(dungeonId, floorNumber)) || collected >= required;
    if (!gateUnlocked) {
      return {
        blocked: true,
        required,
        collected,
        label: t('home.gate.uncommonItems'),
      };
    }
  }

  if (roomType === 'battle_Boss') {
    const required = BOSS_GATE_REQUIRED;
    const collected = getLootCollectionCount(party, tier, 'eliteRare');
    const gateUnlocked = isLootGateUnlocked(party, getBossGateKey(dungeonId)) || collected >= required;
    if (!gateUnlocked) {
      return {
        blocked: true,
        required,
        collected,
        label: t('home.gate.eliteRareItems'),
      };
    }
  }

  return { blocked: false };
}

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | addRecoveredItemsToLootProgress
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

// SpecRef: 5.1.3.1 | "Loot-Gate" progression system | unlockAvailableLootGates
export function unlockAvailableLootGates(
  currentStatus: Record<number, boolean>,
  progress: Record<string, number>,
  defeatedBossExpeditions: Record<number, boolean>,
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
      const defeatedPreviousBoss = Boolean(defeatedBossExpeditions[dungeonId - 1]);
      if (defeatedPreviousBoss) {
        nextStatus[getEntryGateKey(dungeonId)] = true;
      }
    }
  }

  return nextStatus;
}
