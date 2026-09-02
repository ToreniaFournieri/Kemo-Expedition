import type {
  Character,
  EnemyDef,
  GameBags,
  Item,
  TerrainEffectKey,
} from '../types/index.ts';
import {
  resolveExpeditionOutcome,
  type ExpeditionOutcomeResult,
} from './expeditionEffects/expeditionOutcome.ts';

export type ExpeditionFinalOutcome = 'Clear' | 'Escape' | 'Defeat' | 'Retreat';
export type EnemyBattleStats = Record<number, { defeats: number; encounters: number }>;

export interface CreateExpeditionTransactionInput {
  readonly initialHp: number;
  readonly bags: GameBags;
  readonly enemyBattleStats?: Readonly<EnemyBattleStats>;
  readonly revealedItemIds?: readonly number[];
  readonly revealedAbilityIds?: readonly string[];
  readonly revealedTerrainKeys?: readonly TerrainEffectKey[];
}

export interface RecordExpeditionBattleRoomInput {
  readonly enemyId: number;
  readonly victory: boolean;
  readonly bags: GameBags;
  readonly revealedItemIds: readonly number[];
  readonly revealedAbilityIds: readonly string[];
  readonly terrainEffect?: TerrainEffectKey;
}

export interface RecordExpeditionVictoryRewardsInput {
  readonly experience: number;
  readonly bags: GameBags;
}

export interface ExpeditionAutoSoldItemFact {
  readonly item: Item;
  readonly profit: number;
}

export interface RecordExpeditionRecoveredItemsInput {
  readonly recoveredItems: readonly Item[];
  readonly retainedItems: readonly Item[];
  readonly autoSoldItems: readonly ExpeditionAutoSoldItemFact[];
}

export interface RecordExpeditionPostRewardInput {
  readonly preContinuationHp: number;
  readonly finalHp: number;
  readonly shouldRetreat: boolean;
  readonly reachedDepthLimit: boolean;
}

export interface ExpeditionTransactionResult {
  readonly currentHp: number;
  readonly bags: GameBags;
  readonly totalExperience: number;
  readonly finalOutcome: ExpeditionFinalOutcome;
  readonly roomCounter: number;
  readonly enemyBattleStats: EnemyBattleStats;
  readonly revealedItemIds: number[];
  readonly revealedAbilityIds: string[];
  readonly revealedTerrainKeys: TerrainEffectKey[];
  readonly recoveredItems: Item[];
  readonly retainedRewards: Item[];
  readonly autoSoldItems: ExpeditionAutoSoldItemFact[];
  readonly autoSellProfit: number;
  readonly endedWithDrawRetreat: boolean;
}

export interface PlanExpeditionFinalizationInput {
  readonly transaction: ExpeditionTransactionResult;
  readonly initialGold: number;
  readonly installedGold: number;
  readonly isGodsBattle: boolean;
  readonly dungeonId: number;
  readonly clearGateProgress: Readonly<Record<string, number>>;
  readonly clearGateStatus: Readonly<Record<number, boolean>>;
  readonly defeatedBossExpeditions: Readonly<Record<number, boolean>>;
  readonly expeditionStats: Readonly<ExpeditionStatistics>;
  readonly altarVictoriesByEnemyType: Readonly<Record<string, number>>;
  readonly partyCharacters: readonly Pick<Character, 'raceId' | 'mimorianEnemyId'>[];
  readonly enemyDefinitions: readonly Pick<EnemyDef, 'id' | 'enemyType'>[];
  readonly currentUnlockedPartySlots: number;
  readonly completedBossVictory: boolean;
}

export interface ExpeditionStatistics {
  readonly Clear: number;
  readonly Turned_Back: number;
  readonly Draw_Retreat: number;
  readonly Wounded_Retreat: number;
  readonly Defeat: number;
  readonly donatedGold: number;
  readonly savedGold: number;
}

export interface ExpeditionFinalizationPlan {
  readonly shouldRollbackInventory: boolean;
  readonly gold: number;
  readonly rewards: Item[];
  readonly autoSoldItems: ExpeditionAutoSoldItemFact[];
  readonly autoSellProfit: number;
  readonly autoSellItemCount: number;
  readonly endedWithDrawRetreat: boolean;
  readonly outcome: ExpeditionOutcomeResult;
  readonly expeditionStats: ExpeditionStatistics;
  readonly altarVictoriesByEnemyType: Record<string, number>;
  readonly pendingUnlockPartySlot: number | null;
  readonly requiresUnlockNarration: boolean;
}

const PARTY_UNLOCK_BY_DUNGEON_ID: Readonly<Record<number, number>> = Object.freeze({
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
});

export function getPartyUnlockSlotForBossVictory(dungeonId: number): number | null {
  return PARTY_UNLOCK_BY_DUNGEON_ID[dungeonId] ?? null;
}

/**
 * Transaction-local expedition authority. It is deliberately mutable so one
 * long AFK Chunk does not allocate a replacement accumulator for every room.
 * No reference from this object is installed into GameState until finish().
 */
export class ExpeditionTransactionAccumulator {
  currentHp: number;
  bags: GameBags;
  totalExperience = 0;
  finalOutcome: ExpeditionFinalOutcome = 'Clear';
  roomCounter = 0;
  private terminal = false;
  private readonly enemyBattleStats: EnemyBattleStats;
  private readonly revealedItemIds: Set<number>;
  private readonly revealedAbilityIds: Set<string>;
  private readonly revealedTerrainKeys: Set<TerrainEffectKey>;
  private readonly recoveredItems: Item[] = [];
  private readonly retainedRewards: Item[] = [];
  private readonly autoSoldItems: ExpeditionAutoSoldItemFact[] = [];
  private totalAutoSellProfit = 0;
  private drawRetreat = false;

  constructor(input: CreateExpeditionTransactionInput) {
    this.currentHp = input.initialHp;
    this.bags = input.bags;
    this.enemyBattleStats = { ...(input.enemyBattleStats ?? {}) };
    this.revealedItemIds = new Set(input.revealedItemIds ?? []);
    this.revealedAbilityIds = new Set(input.revealedAbilityIds ?? []);
    this.revealedTerrainKeys = new Set(input.revealedTerrainKeys ?? []);
  }

  get ended(): boolean {
    return this.terminal;
  }

  beginRoom(): number {
    this.roomCounter += 1;
    return this.roomCounter;
  }

  end(outcome: Exclude<ExpeditionFinalOutcome, 'Clear'>): void {
    this.finalOutcome = outcome;
    this.terminal = true;
  }

  revealPartyAbilities(abilityIds: Iterable<string>): void {
    for (const abilityId of abilityIds) this.revealedAbilityIds.add(abilityId);
  }

  recordBattleRoom(input: RecordExpeditionBattleRoomInput): void {
    this.bags = input.bags;
    const currentStats = this.enemyBattleStats[input.enemyId] ?? { defeats: 0, encounters: 0 };
    this.enemyBattleStats[input.enemyId] = {
      defeats: currentStats.defeats + (input.victory ? 1 : 0),
      encounters: currentStats.encounters + 1,
    };
    input.revealedAbilityIds.forEach((abilityId) => this.revealedAbilityIds.add(abilityId));
    input.revealedItemIds.forEach((itemId) => this.revealedItemIds.add(itemId));
    if (input.terrainEffect) this.revealedTerrainKeys.add(input.terrainEffect);
  }

  recordVictoryRewards(input: RecordExpeditionVictoryRewardsInput): void {
    this.totalExperience += input.experience;
    this.bags = input.bags;
  }

  recordRecoveredItems(input: RecordExpeditionRecoveredItemsInput): void {
    this.recoveredItems.push(...input.recoveredItems);
    this.retainedRewards.push(...input.retainedItems);
    for (const fact of input.autoSoldItems) {
      this.autoSoldItems.push({ item: fact.item, profit: fact.profit });
      this.totalAutoSellProfit += fact.profit;
    }
  }

  recordPostReward(input: RecordExpeditionPostRewardInput): void {
    this.currentHp = input.preContinuationHp;
    if (input.shouldRetreat) {
      this.end('Retreat');
      return;
    }
    this.currentHp = input.finalHp;
    if (input.reachedDepthLimit) this.end('Escape');
  }

  recordDefeat(partyHp: number): void {
    this.currentHp = partyHp;
    this.end('Defeat');
  }

  recordDraw(partyHp: number): void {
    this.currentHp = partyHp;
    this.drawRetreat = true;
    this.end('Retreat');
  }

  finish(): ExpeditionTransactionResult {
    return {
      currentHp: this.currentHp,
      bags: this.bags,
      totalExperience: Math.ceil(this.totalExperience),
      finalOutcome: this.finalOutcome,
      roomCounter: this.roomCounter,
      enemyBattleStats: { ...this.enemyBattleStats },
      revealedItemIds: Array.from(this.revealedItemIds),
      revealedAbilityIds: Array.from(this.revealedAbilityIds),
      revealedTerrainKeys: Array.from(this.revealedTerrainKeys),
      recoveredItems: [...this.recoveredItems],
      retainedRewards: [...this.retainedRewards],
      autoSoldItems: this.autoSoldItems.map((fact) => ({ ...fact })),
      autoSellProfit: this.totalAutoSellProfit,
      endedWithDrawRetreat: this.drawRetreat,
    };
  }
}

export function planExpeditionFinalization(
  input: PlanExpeditionFinalizationInput,
): ExpeditionFinalizationPlan {
  const isDefeat = input.transaction.finalOutcome === 'Defeat';
  const autoSellProfit = isDefeat ? 0 : input.transaction.autoSellProfit;
  const rewards = isDefeat ? [] : [...input.transaction.retainedRewards];
  const autoSoldItems = isDefeat
    ? []
    : input.transaction.autoSoldItems.map((fact) => ({ ...fact }));
  const outcome = resolveExpeditionOutcome({
    finalOutcome: input.transaction.finalOutcome,
    endedWithDrawRetreat: input.transaction.endedWithDrawRetreat,
    isGodsBattle: input.isGodsBattle,
    dungeonId: input.dungeonId,
    recoveredItems: input.transaction.recoveredItems,
    clearGateProgress: input.clearGateProgress,
    clearGateStatus: input.clearGateStatus,
    defeatedBossExpeditions: input.defeatedBossExpeditions,
  });
  const canonicalOutcome = outcome.canonicalGateOutcome;
  const expeditionStats: ExpeditionStatistics = {
    ...input.expeditionStats,
    [canonicalOutcome]: input.expeditionStats[canonicalOutcome] + 1,
  };
  const altarVictoriesByEnemyType = { ...input.altarVictoriesByEnemyType };
  if (input.transaction.finalOutcome === 'Clear') {
    const assignedEnemyTypes = new Set(
      input.partyCharacters
        .filter((character) => character.raceId === 'mimorian')
        .map((character) => (
          input.enemyDefinitions.find((enemy) => enemy.id === character.mimorianEnemyId)?.enemyType
        ))
        .filter((enemyType): enemyType is string => Boolean(enemyType)),
    );
    assignedEnemyTypes.forEach((enemyType) => {
      altarVictoriesByEnemyType[enemyType] = (altarVictoriesByEnemyType[enemyType] ?? 0) + 1;
    });
  }
  const unlockedPartySlot = input.completedBossVictory
    ? getPartyUnlockSlotForBossVictory(input.dungeonId)
    : null;
  const pendingUnlockPartySlot = unlockedPartySlot !== null
    && unlockedPartySlot > input.currentUnlockedPartySlots
    ? Math.max(1, Math.min(6, unlockedPartySlot))
    : null;

  return {
    shouldRollbackInventory: isDefeat,
    gold: isDefeat ? input.initialGold : input.installedGold - autoSellProfit,
    rewards,
    autoSoldItems,
    autoSellProfit,
    autoSellItemCount: autoSoldItems.length,
    endedWithDrawRetreat: input.transaction.endedWithDrawRetreat,
    expeditionStats,
    altarVictoriesByEnemyType,
    pendingUnlockPartySlot,
    requiresUnlockNarration: pendingUnlockPartySlot !== null,
    outcome,
  };
}
