import { useState, useEffect, useRef, useCallback, type ChangeEvent, type Dispatch, type MouseEvent, type SetStateAction, type ReactNode } from 'react';
import { GameState, GameBags, Item, Character, InventoryRecord, InventoryVariant, NotificationStyle, NotificationCategory, EnemyDef, Dungeon, Party, DiaryRarityThreshold, DiarySettings, ExpeditionLogEntry, ExpeditionDepthLimit, ItemCategory, BonusType, ComputedCharacterStats, ElementalOffense, RaceId, Race, getVariantKey, MAX_LEVEL } from '../types';
import { computePartyStats } from '../game/partyComputation';
import {
  DUNGEONS,
  getEffectiveEnemyLevel,
  getEffectiveEnemyMultipliers,
  getEffectiveExpeditionTier,
} from '../data/dungeons';
import { RACES } from '../data/races';
import { CLASSES, CLASS_SHORT_NAMES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES, ITEMS, getSuperRareBonuses } from '../data/items';
import { GOD_ENEMY_PROFILES, GOD_MYTHIC_DROPS, getGodProfileForDungeon } from '../data/dropTables';
import { GLOSSARY_SECTIONS } from '../data/glossary';
import { getItemDisplayName } from '../game/gameState';
import { ENEMIES, getEnemyDropCandidates } from '../data/enemies';
import { applyEnemyEncounterScaling } from '../game/enemyScaling';
import { buildGodRuntimeEnemy } from '../game/godEnemy';
import { DEITY_OPTIONS, getDeityEffectDescription, getDeityRank, getNextDonationThreshold, normalizeDeityName } from '../game/deity';
import { getXpToNextLevel } from '../game/partyLevel';
import { createEnvironmentStorageKey, getEnvLabel, getEnvironmentId } from '../game/environment';
import { getShopItemPrice, getShopHourKey, getShopLineupSeed, getShopStockKey, getShopRefreshPrice, getNextShopRefreshDate, countElapsedShopRefreshes } from '../game/shop';
import { getBaseMultiplier } from '../game/baseMultiplier';
import { computeCharacterStats, getUnlockedRaceAbilitiesFromBonuses } from '../game/characterComputation';
import { serializeGameState } from '../game/saveCodec';
import { getBagEntryTickets, getBagTicketTotal } from '../game/bags';
import { replaceCharacterEquipment } from '../game/equipment';
import {
  ELITE_GATE_REQUIREMENTS,
  ENTRY_GATE_REQUIRED,
  BOSS_GATE_REQUIRED,
  getGodsBattleRequired,
  getEntryGateKey,
  getEliteGateKey,
  getBossGateKey,
  getLootCollectionCount,
  getItemRarityForLootGate,
  isLootGateUnlocked,
} from '../game/lootGate';

interface HomeScreenProps {
  state: GameState;
  bags: GameBags;
  actions: {
    selectParty: (partyIndex: number) => void;
    selectDungeon: (partyIndex: number, dungeonId: number) => void;
    setExpeditionDepthLimit: (partyIndex: number, depthLimit: ExpeditionDepthLimit) => void;
    runExpedition: (partyIndex: number, isLunaMode?: boolean, triggerGodsBattle?: boolean) => void;
    finalizeDiaryLog: (partyIndex: number) => void;
    updatePartyDeity: (partyIndex: number, deityName: string) => void;
    healPartyHp: (partyIndex: number, amount: number) => void;
    clearPendingProfit: (partyIndex: number) => void;
    processPendingProfit: (partyIndex: number, donation: number, deposit: number) => void;
    spendPendingProfit: (partyIndex: number, amount: number) => void;
    equipItem: (characterId: number, slotIndex: number, itemKey: string | null) => void;
    updateCharacter: (characterId: number, updates: Partial<Character>) => void;
    reorderPartyCharacter: (fromIndex: number, toIndex: number) => void;
    sellStack: (variantKey: string) => void;
    buyShopItem: (itemId: number) => void;
    refreshShopLineup: () => void;
    setVariantStatus: (variantKey: string, status: 'notown') => void;
    markItemsSeen: () => void;
    markDiaryLogSeen: (logId: string) => void;
    markAllDiaryLogsSeen: () => void;
    updateDiarySettings: (partyIndex: number, settings: Partial<DiarySettings>) => void;
    simulateAfk: (elapsedMs: number, isAutoRepeatEnabled: boolean, isLunaMode?: boolean) => void;
    resetGame: () => void;
    importGameState: (state: GameState) => void;
    resetCommonBags: () => void;
    resetUniqueBags: () => void;
    resetSuperRareBag: () => void;
    addNotification: (
      message: string,
      style?: NotificationStyle,
      category?: NotificationCategory,
      isPositive?: boolean,
      options?: { rarity?: ItemRarity; isSuperRareItem?: boolean }
    ) => void;
    addStatNotifications: (changes: Array<{ message: string; isPositive: boolean }>) => void;
  };
}

type Tab = 'party' | 'expedition' | 'base' | 'diary' | 'setting';
type BaseSubTab = 'inventory' | 'shop' | 'workshop' | 'altar';


type PartyCycleState = '休息中' | '売却中' | '宴会中' | '睡眠中' | '祈り中' | '待機中' | '移動中' | '探索中' | '帰還中';

interface PartyCycleRuntime {
  state: PartyCycleState;
  stateStartedAt: number;
  durationMs: number;
}

const PARTY_CYCLE_TICK_MS = 100;
const EXPLORING_PROGRESS_STEP_MS = 1000;
const EXPLORING_PROGRESS_TOTAL_STEPS = 24;
const AFK_RUNTIME_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-afk-runtime');
const AFK_MAX_ELAPSED_MS = 600 * 60 * 1000;
const AFK_BACKGROUND_CHUNK_MS = 120 * 1000;
const HEADER_HEIGHT_CLASS = 'pt-[108px]';
type GameMode = 'm.kemo' | 'm.luna';
const GAME_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-game-mode');
const APP_VERSION = `v${__APP_VERSION__}`;
const RACE_ICON_SOURCES = RACES
  .map((race) => race.icon)
  .filter((icon): icon is string => Boolean(icon))
  .map((icon) => (
    icon.startsWith('/')
      ? `${import.meta.env.BASE_URL}${icon.replace(/^\//, '')}`
      : icon
  ));

function preloadRaceIcons(): void {
  RACE_ICON_SOURCES.forEach((iconSrc) => {
    const image = new Image();
    image.src = iconSrc;
  });
}

function getExplorationDurationMs(entryCount?: number): number {
  const exploredSteps = Math.max(1, Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, entryCount ?? EXPLORING_PROGRESS_TOTAL_STEPS));
  return exploredSteps * EXPLORING_PROGRESS_STEP_MS;
}

function getExpeditionOutcomeLabel(outcome: 'victory' | 'return' | 'defeat' | 'retreat'): string {
  if (outcome === 'victory') return '踏破';
  if (outcome === 'return') return '帰還';
  if (outcome === 'defeat') return '敗北';
  return '撤退';
}

function getEffectiveAccuracyBonus(accuracyBonus: number, abilities: ComputedCharacterStats['abilities']): number {
  const focusLevel = abilities.find(a => a.id === 'focus')?.level ?? 0;
  if (focusLevel <= 0) return accuracyBonus;
  const focusMultiplier = focusLevel >= 2 ? 1.3 : 1.2;
  return Math.ceil((accuracyBonus * focusMultiplier + Number.EPSILON) * 1000) / 1000;
}

function renderEnemyNameWithMutedClass(enemyName: string) {
  const classSuffixMatch = enemyName.match(/^(.*?)(\([^()]+\))(.*)$/);
  if (!classSuffixMatch) return enemyName;

  const [, baseName, classSuffix, trailingText] = classSuffixMatch;
  return (
    <>
      {baseName}
      <span className="text-gray-500">{classSuffix}</span>
      {trailingText}
    </>
  );
}



function RaceIcon({ race, className = "h-8 w-8" }: { race: Race; className?: string }) {
  const [hasIconLoadError, setHasIconLoadError] = useState(false);

  useEffect(() => {
    setHasIconLoadError(false);
  }, [race.icon]);

  const iconSrc = race.icon?.startsWith('/')
    ? `${import.meta.env.BASE_URL}${race.icon.replace(/^\//, '')}`
    : race.icon;

  if (iconSrc && !hasIconLoadError) {
    return (
      <img
        src={iconSrc}
        alt={`${race.englishName} icon`}
        className={`${className} object-contain`}
        onError={() => setHasIconLoadError(true)}
      />
    );
  }

  return <span className={className}>{race.emoji}</span>;
}

const RACE_ICON_BY_EMOJI: Record<string, string | undefined> = Object.fromEntries(
  RACES.map((race) => [race.emoji, race.icon])
);

function renderTextWithRaceIcons(text: string, iconClassName = 'h-3.5 w-3.5'): ReactNode {
  if (!text) return text;

  const emojiPattern = Object.keys(RACE_ICON_BY_EMOJI)
    .map((emoji) => emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  if (!emojiPattern) return text;

  const regex = new RegExp(`(${emojiPattern})`, 'g');
  const parts = text.split(regex);

  return parts.map((part, index) => {
    const iconPath = RACE_ICON_BY_EMOJI[part];
    if (!iconPath) {
      return part;
    }

    const iconSrc = iconPath.startsWith('/')
      ? `${import.meta.env.BASE_URL}${iconPath.replace(/^\//, '')}`
      : iconPath;

    return (
      <img
        key={`icon-${index}`}
        src={iconSrc}
        alt="race icon"
        className={`${iconClassName} inline-block align-text-bottom`}
      />
    );
  });
}

function buildAfkSummaryNotification(stats: {
  victories: number;
  retreats: number;
  defeats: number;
  donatedGold: number;
  savedGold: number;
}): string | null {
  const summaryParts: string[] = [];
  if (stats.victories > 0) summaryParts.push(`踏破${formatNumber(stats.victories)}回`);
  if (stats.retreats > 0) summaryParts.push(`撤退${formatNumber(stats.retreats)}回`);
  if (stats.defeats > 0) summaryParts.push(`敗北${formatNumber(stats.defeats)}回`);

  const financeParts: string[] = [];
  if (stats.donatedGold > 0) financeParts.push(`寄付金額: ${formatNumber(stats.donatedGold)}G`);
  if (stats.savedGold > 0) financeParts.push(`貯金額:　${formatNumber(stats.savedGold)}G`);

  if (summaryParts.length === 0 && financeParts.length === 0) return null;
  return [summaryParts.join('/'), financeParts.join(', ')].filter(Boolean).join(' ');
}

type ItemRarity = 'common' | 'uncommon' | 'eliteRare' | 'bossRare' | 'mythicRare';
type RarityFilter = 'all' | ItemRarity;

const RARITY_SHORT_CODES: Record<ItemRarity, string> = {
  common: 'C',
  uncommon: 'U',
  eliteRare: 'E',
  bossRare: 'B',
  mythicRare: 'M',
};

const RARITY_FILTER_LABELS: Record<RarityFilter, string> = {
  all: 'ALL',
  common: 'C',
  uncommon: 'U',
  eliteRare: 'E',
  bossRare: 'B',
  mythicRare: 'M',
};

const RARITY_FILTER_NOTES: Record<RarityFilter, string> = {
  all: '全て',
  common: '通常',
  uncommon: 'アンコモン',
  eliteRare: 'エリートレア',
  bossRare: 'ボスレア',
  mythicRare: '神魔レア',
};

const RARITY_FILTER_OPTIONS: RarityFilter[] = ['all', 'common', 'uncommon', 'eliteRare', 'bossRare', 'mythicRare'];

const DIARY_THRESHOLD_OPTIONS: Array<{ value: DiaryRarityThreshold; label: string }> = [
  { value: 'all', label: '全て' },
  { value: 1, label: '名工以上' },
  { value: 2, label: '魔性以上' },
  { value: 3, label: '宿った以上' },
  { value: 4, label: '伝説以上' },
  { value: 5, label: '恐ろしい以上' },
  { value: 6, label: '究極' },
  { value: 'none', label: 'なし' },
];

const EXPEDITION_DEPTH_OPTIONS: Array<{ value: ExpeditionDepthLimit; label: string }> = [
  { value: 'all', label: '全て' },
  { value: 'beforeBoss', label: 'ボス前' },
  { value: '5f-4', label: '5F-4' },
  { value: '5f-3', label: '5F-3' },
  { value: '4f-4', label: '4F-4' },
  { value: '4f-3', label: '4F-3' },
  { value: '3f-4', label: '3F-4' },
  { value: '3f-3', label: '3F-3' },
  { value: '2f-4', label: '2F-4' },
  { value: '2f-3', label: '2F-3' },
  { value: '1f-4', label: '1F-4' },
  { value: '1f-3', label: '1F-3' },
];

const POTENTIAL_DEFAULT_NAMES: Record<RaceId, string[]> = {
  caninian: ['タロウ', 'コテツ', 'ハヤテ', 'シロ', 'レオ', 'アキラ', 'リク', 'ソラ', 'マル', 'ジン'],
  lupinian: ['ガルム', 'フェン', 'クロウ', 'ハク', 'レイガ', 'ヴォルフ', 'ギン', 'ランガ', 'ゼル', 'バルト'],
  vulpinian: ['キツネ丸', 'アカネ', 'イズナ', 'ヨウコ', 'センリ', 'コトネ', 'クズノハ', 'ミカゲ', 'ヒナ', 'アヤ'],
  ursan: ['ゴンタ', 'バルド', 'クマジロウ', 'ドーガ', 'グルン', 'ダン', 'ボルグ', 'ガイ', 'ザン', 'ブラム'],
  felidian: ['ミミ', 'タマ', 'ルナ', 'ネロ', 'シエル', 'レイ', 'アオ', 'カノン', 'フィン', 'ユイ'],
  mustelid: ['チョロ', 'ムサシ', 'コハク', 'レン', 'シノ', 'ハク', 'タケ', 'ツバメ', 'セン', 'カイ'],
  leporian: ['フブキ', 'ハル', 'トワ', 'ユキ', 'ナギ', 'ミナ', 'サラ', 'アオイ', 'レイナ', 'カスミ'],
  cervin: ['サイカ', 'カナエ', 'リンネ', 'ミコト', 'ユズリハ', 'シオン', 'セツナ', 'トキ', 'マヒロ', 'ツムギ'],
  murid: ['チュウタ', 'ネズミ丸', 'カゲ', 'コソネ', 'スズ', 'コマ', 'ヒソカ', 'ネム', 'チビ', 'クルミ'],
  procyonian: ['ポンタ', 'マメ', 'コウタ', 'シゲ', 'ミナト', 'コロ', 'ツヅミ', 'ハヤ', 'ノノ', 'ムジナ'],
};


function parseDiaryThreshold(value: string): DiaryRarityThreshold {
  if (value === 'all' || value === 'none') return value;
  const numericValue = Number(value);
  if (numericValue >= 1 && numericValue <= 6) return numericValue as 1 | 2 | 3 | 4 | 5 | 6;
  return 'all';
}

const numberFormatter = new Intl.NumberFormat('ja-JP');

function formatNumber(value: number): string {
  return numberFormatter.format(Math.trunc(value));
}

function formatAutoSellSummary(autoSellProfit: number, autoSellMultiplier?: number): string {
  if (autoSellMultiplier && autoSellMultiplier > 1) {
    return `自動売却額(x${autoSellMultiplier.toFixed(1)}): ${formatNumber(autoSellProfit)}G`;
  }
  return `自動売却額: ${formatNumber(autoSellProfit)}G`;
}

function getItemRarityById(itemId: number): ItemRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 500) return 'mythicRare';
  if (rarityCode >= 400) return 'bossRare';
  if (rarityCode >= 300) return 'eliteRare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

const MYTHIC_TIER_BY_NAME = new Map(GOD_MYTHIC_DROPS.map((drop) => [drop.name, drop.tier]));

function getDisplayTier(itemId: number, itemName?: string): number {
  const tier = Math.floor(itemId / 1000);
  if (getItemRarityById(itemId) === 'mythicRare' && itemName) {
    return MYTHIC_TIER_BY_NAME.get(itemName) ?? tier;
  }
  return tier;
}

function getRarityShortLabel(itemId: number, itemName?: string): string {
  const tier = getDisplayTier(itemId, itemName);
  const rarityCode = RARITY_SHORT_CODES[getItemRarityById(itemId)];
  return `[${tier}${rarityCode}]`;
}

function matchesRarityFilter(itemId: number, filter: RarityFilter): boolean {
  if (filter === 'all') return true;
  return getItemRarityById(itemId) === filter;
}

function getRarityTextClass(rarity: ItemRarity, isSuperRare: boolean): string {
  if (isSuperRare) return 'text-orange-700 font-bold';
  if (rarity === 'eliteRare') return 'text-sub';
  if (rarity === 'bossRare') return 'text-accent';
  if (rarity === 'mythicRare') return 'text-accent font-bold';
  return 'text-black';
}

function getRewardTextClass(rarity?: ItemRarity, isSuperRare?: boolean): string {
  if (isSuperRare) return 'text-accent';
  if (rarity === 'mythicRare') return 'text-accent';
  if (rarity === 'bossRare') return 'text-accent';
  if (rarity === 'eliteRare') return 'text-sub';
  return 'text-black';
}

function getRewardFontWeightClass(rarity: ItemRarity, isSuperRare: boolean): string {
  if (isSuperRare) return 'font-bold';
  if (rarity === 'mythicRare') return 'font-bold';
  return rarity === 'common' ? 'font-normal' : 'font-medium';
}

function renderEntryReward(entry: ExpeditionLogEntry): JSX.Element | null {
  if (!entry.reward) return null;

  if (entry.rewardItems && entry.rewardItems.length > 0) {
    return (
      <>
        <span className="text-black">獲得:</span>
        {entry.rewardItems.map((item, index) => {
          const rarity = getItemRarityById(item.id);
          const isSuperRare = item.superRare > 0;
          const rarityClass = getRarityTextClass(rarity, isSuperRare);
          const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
          return (
            <span key={`${item.id}-${item.enhancement}-${item.superRare}-${index}`} className={`${rarityClass} ${fontWeightClass}`}>
              {index > 0 && ' / '}
              {getItemDisplayName(item)}
            </span>
          );
        })}
      </>
    );
  }

  return (
    <span className={`${getRewardTextClass(entry.rewardRarity, entry.rewardIsSuperRare)} ${getRewardFontWeightClass(entry.rewardRarity ?? 'common', entry.rewardIsSuperRare ?? false)}`}>
      獲得:{entry.reward}
    </span>
  );
}

function getDungeonEntryGateState(
  party: Party,
  dungeon: Dungeon
): {
  locked: boolean;
  gateText: string;
} {
  if (dungeon.id === 1) {
    return { locked: false, gateText: '解放条件: なし（最初の探検地）' };
  }

  const previousDungeon = DUNGEONS.find(d => d.id === dungeon.id - 1);
  const previousDungeonName = previousDungeon?.name ?? '前回の探検地';
  const required = ENTRY_GATE_REQUIRED;
  const collected = getLootCollectionCount(party, dungeon.id - 1, 'bossRare');
  const unlocked = isLootGateUnlocked(party, getEntryGateKey(dungeon.id)) || collected >= required;

  return {
    locked: !unlocked,
    gateText: `🔒 解放条件: ${previousDungeonName}のボスレアアイテム(持ち帰り) ${collected}/${required}`,
  };
}

function getGodShortName(displayName: string): string {
  return displayName.split(' ')[0] ?? displayName;
}

function shouldDelayNextSpecialGoal(party: Party, cycleState?: PartyCycleState): boolean {
  if (cycleState !== '探索中') return false;
  const log = party.lastExpeditionLog;
  if (!log || log.finalOutcome !== 'victory') return false;
  const lastEntry = log.entries[log.entries.length - 1];
  return lastEntry?.roomType === 'battle_Boss' && lastEntry.enemyName.includes('(神魔戦)');
}

function getNextGoalText(party: Party, cycleState?: PartyCycleState): string | null {
  const currentDungeon = DUNGEONS.find(d => d.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors) return null;

  const tier = currentDungeon.enemyPoolIds[0];

  for (const floor of currentDungeon.floors) {
    const hasEliteGate = floor.floorNumber < 6;
    if (hasEliteGate) {
      const required = ELITE_GATE_REQUIREMENTS[floor.floorNumber] ?? 3;
      const collected = getLootCollectionCount(party, tier, 'uncommon');
      const unlocked = isLootGateUnlocked(party, getEliteGateKey(currentDungeon.id, floor.floorNumber)) || collected >= required;
      if (!unlocked) {
        return `次の目標: ${currentDungeon.name} ${floor.floorNumber}F-4の解放: アンコモンアイテム(持ち帰り) ${collected}/${required}（現在）`;
      }
    }
  }

  const bossRequired = BOSS_GATE_REQUIRED;
  const rareCollected = getLootCollectionCount(party, tier, 'eliteRare');
  const bossUnlocked = isLootGateUnlocked(party, getBossGateKey(currentDungeon.id)) || rareCollected >= bossRequired;
  if (!bossUnlocked) {
    return `次の目標: ${currentDungeon.name} 6F-4の解放: エリートレアアイテム(持ち帰り) ${rareCollected}/${bossRequired}（現在）`;
  }

  const nextDungeon = DUNGEONS.find(d => d.id === currentDungeon.id + 1);
  const entryRequired = ENTRY_GATE_REQUIRED;
  const bossRareCollected = getDisplayedBossRareCount(party, currentDungeon.id, cycleState);
  if (nextDungeon) {
    const entryUnlocked = isLootGateUnlocked(party, getEntryGateKey(nextDungeon.id)) || bossRareCollected >= entryRequired;
    if (!entryUnlocked) {
      return `次の目標: ${nextDungeon.name}の解放: ${currentDungeon.name}のボスレアアイテム(持ち帰り) ${bossRareCollected}/${entryRequired}（現在）`;
    }
  }

  const godsRequired = getGodsBattleRequired(getEnvironmentId());
  const godsUnlocked = bossRareCollected >= godsRequired;
  if (!godsUnlocked) {
    if (shouldDelayNextSpecialGoal(party, cycleState)) {
      return null;
    }
    const waitingGod = getGodProfileForDungeon(currentDungeon.id, currentDungeon.name);
    const waitingGodName = waitingGod ? getGodShortName(waitingGod.displayName) : '神魔';
    return `特殊目標: ${currentDungeon.name}のボスレアアイテム ${bossRareCollected}/${godsRequired} で神魔${waitingGodName}戦`;
  }

  return null;
}

function isGodsBattleAvailable(party: Party, dungeonId: number): boolean {
  return getLootCollectionCount(party, dungeonId, 'bossRare') >= getGodsBattleRequired(getEnvironmentId());
}

function getDisplayedBossRareCount(party: Party, dungeonId: number, cycleState?: PartyCycleState): number {
  const latestCount = getLootCollectionCount(party, dungeonId, 'bossRare');
  if (cycleState !== '探索中') return latestCount;
  const log = party.lastExpeditionLog;
  if (!log || log.dungeonId !== dungeonId) return latestCount;

  const newlyRecoveredBossRare = log.rewards.reduce((count, item) => {
    const rarity = getItemRarityForLootGate(item.id);
    if (rarity !== 'bossRare') return count;
    const tier = Math.floor(item.id / 1000);
    if (tier !== dungeonId) return count;
    return count + 1;
  }, 0);

  return Math.max(0, latestCount - newlyRecoveredBossRare);
}

// Helper to format item stats

function getItemStats(item: Item, categoryMultiplier: number = 1, hpScaleMultiplier: number = 1): string {
  const enhancementMultiplier = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
  const superRareMultiplier = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
  const selfCategoryBonusTypeByItemCategory: Partial<Record<ItemCategory, BonusType>> = {
    sword: 'sword_multiplier',
    katana: 'katana_multiplier',
    archery: 'archery_multiplier',
    armor: 'armor_multiplier',
    gauntlet: 'gauntlet_multiplier',
    wand: 'wand_multiplier',
    robe: 'robe_multiplier',
    shield: 'shield_multiplier',
    bolt: 'bolt_multiplier',
    grimoire: 'grimoire_multiplier',
    catalyst: 'catalyst_multiplier',
    arrow: 'arrow_multiplier',
  };
  const selfCategoryBonusType = selfCategoryBonusTypeByItemCategory[item.category];
  const selfCategoryMultiplier = selfCategoryBonusType
    ? getSuperRareBonuses(item.superRare)
      .filter((bonus) => bonus.type === selfCategoryBonusType)
      .reduce((total, bonus) => total * bonus.value, 1)
    : 1;
  const baseMultiplier = item.baseMultiplier ?? 1;
  const multiplier = enhancementMultiplier * superRareMultiplier * baseMultiplier * categoryMultiplier * selfCategoryMultiplier;
  const superRareUniqueBonusText = formatBonuses(
    SUPER_RARE_TITLES.find((title) => title.value === item.superRare)?.bonuses ?? [],
    { defenseMultiplierStyle: 'friendly' }
  );
  const itemUniqueBonusText = formatBonuses(item.bonuses ?? [], { defenseMultiplierStyle: 'friendly' });
  const multiplierPercent = Math.round((baseMultiplier - 1) * 100);
  const formatDecimal = (value: number): string => {
    const rounded = Math.round(value * 100) / 100;
    if (Number.isInteger(rounded)) return `${rounded}`;
    return rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  };
  const formatSigned = (value: number, suffix: string = ''): string =>
    `${value >= 0 ? '+' : ''}${formatDecimal(value)}${suffix}`;
  const getScaledNoA = (value: number): number => {
    // Positive NoA item bonuses scale with enhancement + super rare multipliers.
    // Penalty style values should remain fixed (same as runtime stat computation).
    return value > 0 ? value * multiplier : value;
  };
  const formatBracket = (label: string, value: number, suffix: string = ''): string =>
    `[${label}${formatSigned(value, suffix)}]`;
  const formatFixedNoA = (label: string, value: number): string =>
    value > 0 ? formatBracket(label, value) : `${label}${formatSigned(value)}`;

  const stats: string[] = [];
  // Match displayed item values with runtime stat computation (rounded, not floored).
  if (item.meleeAttack) {
    stats.push(`近攻+${Math.round(item.meleeAttack * multiplier)}`);
    if (item.category === 'sword' && multiplierPercent) stats.push(formatBracket('近攻撃', multiplierPercent, '%'));
  }
  if (item.rangedAttack) {
    stats.push(`遠攻+${Math.round(item.rangedAttack * multiplier)}`);
    if (item.category === 'arrow' && multiplierPercent) stats.push(formatBracket('遠攻撃', multiplierPercent, '%'));
  }
  if (item.magicalAttack) {
    stats.push(`魔攻+${Math.round(item.magicalAttack * multiplier)}`);
    if (item.category === 'wand' && multiplierPercent) stats.push(formatBracket('魔攻撃', multiplierPercent, '%'));
  }
  if (item.meleeNoA || item.meleeNoABonus) {
    const baseNoA = item.meleeNoA ?? 0;
    if (baseNoA !== 0) stats.push(`近回数${formatSigned(getScaledNoA(baseNoA))}`);
    if (item.meleeNoABonus) stats.push(formatFixedNoA('近回数', item.meleeNoABonus));
  }
  if (item.rangedNoA || item.rangedNoABonus) {
    const baseNoA = item.rangedNoA ?? 0;
    if (baseNoA !== 0) stats.push(`遠回数${formatSigned(getScaledNoA(baseNoA))}`);
    if (item.rangedNoABonus) stats.push(formatFixedNoA('遠回数', item.rangedNoABonus));
  }
  if (item.magicalNoA || item.magicalNoABonus) {
    const baseNoA = item.magicalNoA ?? 0;
    if (baseNoA !== 0) stats.push(`魔回数${formatSigned(getScaledNoA(baseNoA))}`);
    if (item.magicalNoABonus) stats.push(formatFixedNoA('魔回数', item.magicalNoABonus));
  }
  if (item.physicalDefense) {
    stats.push(`物防+${Math.round(item.physicalDefense * multiplier)}`);
    if (multiplierPercent) stats.push(formatBracket('物防', multiplierPercent, '%'));
  }
  if (item.magicalDefense) {
    stats.push(`魔防+${Math.round(item.magicalDefense * multiplier)}`);
    if (multiplierPercent) stats.push(formatBracket('魔防', multiplierPercent, '%'));
  }
  if (item.partyHP) {
    // Match computePartyStats HP contribution order:
    // Round each item HP bonus after category/enhancement/base/stat/growth multipliers.
    const roundedItemHp = Math.round(item.partyHP * multiplier * hpScaleMultiplier);
    stats.push(`HP+${roundedItemHp}`);
  }
  if (item.accuracyBonus) stats.push(formatBracket('命中', Math.round(item.accuracyBonus * 1000)));
  if (item.evasionBonus) stats.push(`回避${formatSigned(Math.round(item.evasionBonus * 1000))}`);
  if (item.vitalityBonus) stats.push(`体力+${item.vitalityBonus}`);
  if (item.strengthBonus) stats.push(`力+${item.strengthBonus}`);
  if (item.intelligenceBonus) stats.push(`知性+${item.intelligenceBonus}`);
  if (item.mindBonus) stats.push(`精神+${item.mindBonus}`);
  if (item.penetBonus) stats.push(formatBracket('貫通', Math.round(item.penetBonus * 100)));
  if (item.elementalOffense && item.elementalOffense !== 'none') {
    const elem = { fire: '炎', ice: '氷', thunder: '雷' }[item.elementalOffense];
    const elementalPercent = Math.round((item.elementalOffenseBonus ?? 0) * 100);
    stats.push(`${elem}属性+${elementalPercent}%`);
  }
  if (itemUniqueBonusText) stats.push(`[${itemUniqueBonusText}]`);
  if (superRareUniqueBonusText) stats.push(`[超:${superRareUniqueBonusText}]`);
  return stats.join(' ');
}

function getOffenseMultiplierSum(
  items: Item[],
  kind: 'melee' | 'ranged' | 'magical',
  initialAppliedBonusNames?: Iterable<string>
): number {
  const appliedBonusNames = new Set<string>(initialAppliedBonusNames ?? []);
  const relevant = items.filter(item => {
    if (kind === 'melee') return item.meleeAttack || item.meleeNoA || item.meleeNoABonus;
    if (kind === 'ranged') return item.rangedAttack || item.rangedNoA || item.rangedNoABonus;
    return item.magicalAttack || item.magicalNoA || item.magicalNoABonus;
  });

  const bonusSum = relevant.reduce((sum, item) => {
    const baseMultiplier = item.baseMultiplier ?? 1;
    if (baseMultiplier === 1) return sum;

    const percent = Math.round((baseMultiplier - 1) * 1000) / 10;
    const bonusName = `c.${kind}_attack+${percent}`;
    if (appliedBonusNames.has(bonusName)) return sum;
    appliedBonusNames.add(bonusName);
    return sum + (baseMultiplier - 1);
  }, 0);

  return bonusSum;
}

function getBaseOffenseScale(value: number): number {
  return getBaseMultiplier(value, 'attack');
}

function getBaseDefenseScale(value: number): number {
  return getBaseMultiplier(value, 'defense');
}

function getElementalOffenseHelpLines(character: Character, stats: ComputedCharacterStats): string[] {
  const elementalSums: Record<ElementalOffense, number> = {
    none: 0,
    fire: 0,
    ice: 0,
    thunder: 0,
  };
  const equippedItems = character.equipment
    .slice(0, stats.maxEquipSlots)
    .filter((item): item is Item => item != null);

  for (const item of equippedItems) {
    if (item.elementalOffense && item.elementalOffense !== 'none') {
      elementalSums[item.elementalOffense] += item.elementalOffenseBonus ?? 0;
    }
  }

  const elementMeta: Record<Exclude<ElementalOffense, 'none'>, { label: string; emoji: string }> = {
    fire: { label: '火', emoji: '🔥' },
    ice: { label: '氷', emoji: '❄️' },
    thunder: { label: '雷', emoji: '⚡' },
  };

  const lines: string[] = [];

  if (stats.elementalOffense === 'none') {
    lines.push('攻撃は無属性です。');
    return lines;
  }

  const selectedMeta = elementMeta[stats.elementalOffense];
  const selectedPercent = Math.round((stats.elementalOffenseValue - 1) * 100);
  lines.push(`攻撃が${selectedMeta.label}属性${selectedMeta.emoji}になり、${selectedPercent}%威力が増加する`);

  (['fire', 'ice', 'thunder'] as const).forEach((element) => {
    if (element === stats.elementalOffense) return;
    const total = elementalSums[element];
    if (total <= 0) return;
    const meta = elementMeta[element];
    lines.push(`(非採用)${meta.label}属性${meta.emoji} ${Math.round(total * 100)}%威力増加`);
  });

  return lines;
}

// Helper to format bonus descriptions
type Bonus = { type: string; value: number; abilityId?: string; abilityLevel?: number; unimplementedLabel?: string };

const MULTIPLIER_LABELS: Record<string, string> = {
  sword_multiplier: '剣',
  katana_multiplier: '刀',
  archery_multiplier: '弓',
  armor_multiplier: '鎧',
  gauntlet_multiplier: '手',
  wand_multiplier: '杖',
  robe_multiplier: '衣',
  shield_multiplier: '盾',
  bolt_multiplier: 'ボ',
  grimoire_multiplier: '書',
  catalyst_multiplier: '媒',
  arrow_multiplier: '矢',
};

const ABILITY_NAMES: Record<string, string> = {
  first_strike: '先手',
  covering_fire: '援護射撃',
  hunter: '狩人',
  defender: '守護者',
  counter: '反撃',
  re_attack: '連撃',
  iaigiri: '居合斬り',
  resonance: '共鳴',
  command: '指揮',
  m_barrier: '魔法障壁',
  deflection: '矢払い',
  unlock: '解錠',
  null_counter: '反撃無効化',
  squander: '散財',
  tithe: '十分の一税',
  seeker: '探究者',
  resurrect: '再起',
  rage: '闘志',
  re_counter: '再反撃',
  momentum: '気勢',
  cunning: '狡猾',
  bulwark: '堅守',
  cyborgization: '機械化',
  peddler: '行商',
  composure: '平静',
  magical_counter: '魔法反撃',
  focus: '集中',
  prophecy: '予言',
  stealth: '隠れ蓑',
  illusion: '幻化',
};

const C_MULTIPLIER_HELP_DESCRIPTIONS: Record<string, string> = {
  sword: '剣カテゴリ装備の効果が {value} 倍',
  katana: '刀カテゴリ装備の効果が {value} 倍',
  archery: '弓カテゴリ装備の効果が {value} 倍',
  armor: '鎧カテゴリ装備の効果が {value} 倍',
  gauntlet: '籠手カテゴリ装備の効果が {value} 倍',
  wand: '杖カテゴリ装備の効果が {value} 倍',
  robe: '法衣カテゴリ装備の効果が {value} 倍',
  shield: '盾カテゴリ装備の効果が {value} 倍',
  bolt: 'ボルトカテゴリ装備の効果が {value} 倍',
  grimoire: '魔導書カテゴリ装備の効果が {value} 倍',
  catalyst: '触媒カテゴリ装備の効果が {value} 倍',
  arrow: '矢カテゴリ装備の効果が {value} 倍',
  physical_offense_multiplier_xV: '遠距離攻撃・近接攻撃の攻撃倍率が {value} 倍',
  magical_offense_multiplier_xV: '魔法攻撃の攻撃倍率が {value} 倍',
  physical_defense_multiplier_xV: '物理防御倍率が {value} 倍',
  magical_defense_multiplier_xV: '魔法防御倍率が {value} 倍',
  fire_defense_multiplier_xV: '炎属性耐性が {value} 倍',
  ice_defense_multiplier_xV: '氷属性耐性が {value} 倍',
  thunder_defense_multiplier_xV: '雷属性耐性が {value} 倍',
};

const CATEGORY_TO_MULTIPLIER_BONUS: Record<ItemCategory, BonusType | null> = {
  sword: 'sword_multiplier',
  katana: 'katana_multiplier',
  archery: 'archery_multiplier',
  armor: 'armor_multiplier',
  gauntlet: 'gauntlet_multiplier',
  wand: 'wand_multiplier',
  robe: 'robe_multiplier',
  shield: 'shield_multiplier',
  bolt: 'bolt_multiplier',
  grimoire: 'grimoire_multiplier',
  catalyst: 'catalyst_multiplier',
  arrow: 'arrow_multiplier',
};

function getEnhancementAndSuperRareMultiplier(item: Item): number {
  const enhancementMultiplier = ENHANCEMENT_TITLES.find((t) => t.value === item.enhancement)?.multiplier ?? 1;
  const superRareMultiplier = SUPER_RARE_TITLES.find((t) => t.value === item.superRare)?.multiplier ?? 1;
  return enhancementMultiplier * superRareMultiplier;
}

function formatCBonusValue(value: number): string {
  return (Math.round(value * 1000000) / 1000000).toString();
}

function getCharacterCategoryMultiplier(character: Character, category: ItemCategory): number {
  const multiplierType = CATEGORY_TO_MULTIPLIER_BONUS[category];
  if (!multiplierType) return 1;

  const mainClassData = CLASSES.find((c) => c.id === character.mainClassId);
  const subClassData = CLASSES.find((c) => c.id === character.subClassId);
  const predispositionData = PREDISPOSITIONS.find((p) => p.id === character.predispositionId);
  const lineageData = LINEAGES.find((l) => l.id === character.lineageId);
  const raceData = RACES.find((r) => r.id === character.raceId);

  if (!mainClassData || !subClassData || !predispositionData || !lineageData || !raceData) {
    return 1;
  }

  const isMasterClass = character.mainClassId === character.subClassId;
  const allBonuses = [
    ...raceData.bonuses,
    ...mainClassData.mainSubBonuses,
    ...(isMasterClass ? mainClassData.masterBonuses : [...mainClassData.mainBonuses, ...subClassData.mainSubBonuses]),
    ...predispositionData.bonuses,
    ...lineageData.bonuses,
    ...character.equipment.flatMap((item) => (item ? getSuperRareBonuses(item.superRare) : [])),
  ];

  const appliedBonusNames = new Set<string>();
  const multipliers = allBonuses
    .filter((bonus) => bonus.type === multiplierType)
    .filter((bonus) => {
      const bonusName = `c.${multiplierType}+${formatCBonusValue(bonus.value)}`;
      if (appliedBonusNames.has(bonusName)) return false;
      appliedBonusNames.add(bonusName);
      return true;
    })
    .map((bonus) => bonus.value);

  return multipliers.reduce((total, value) => total * value, 1);
}

function getCharacterGrowthMultiplier(character: Character): number {
  const mainClassData = CLASSES.find((c) => c.id === character.mainClassId);
  const subClassData = CLASSES.find((c) => c.id === character.subClassId);
  const predispositionData = PREDISPOSITIONS.find((p) => p.id === character.predispositionId);
  const lineageData = LINEAGES.find((l) => l.id === character.lineageId);
  const raceData = RACES.find((r) => r.id === character.raceId);

  if (!mainClassData || !subClassData || !predispositionData || !lineageData || !raceData) {
    return 1;
  }

  const isMasterClass = character.mainClassId === character.subClassId;
  const allBonuses = [
    ...raceData.bonuses,
    ...mainClassData.mainSubBonuses,
    ...(isMasterClass ? mainClassData.masterBonuses : [...mainClassData.mainBonuses, ...subClassData.mainSubBonuses]),
    ...predispositionData.bonuses,
    ...lineageData.bonuses,
    ...character.equipment.flatMap((item) => (item ? getSuperRareBonuses(item.superRare) : [])),
  ];

  const appliedBonusNames = new Set<string>();
  const growthMultipliers = allBonuses
    .filter((bonus) => bonus.type === 'growth_xV')
    .filter((bonus) => {
      const bonusName = `c.growth_x${formatCBonusValue(bonus.value)}`;
      if (appliedBonusNames.has(bonusName)) return false;
      appliedBonusNames.add(bonusName);
      return true;
    })
    .map((bonus) => bonus.value);

  return growthMultipliers.reduce((total, value) => total * value, 1);
}

function formatMultiplierValue(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return `${rounded}`;
  return rounded.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatDefenseMultiplierBonus(label: string, value: number): string {
  const rounded = Math.round(value * 100) / 100;

  const precision = 100;
  const numerator = Math.round(rounded * precision);
  const denominator = precision;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.abs(numerator), denominator);
  const reducedNumerator = numerator / divisor;
  const reducedDenominator = denominator / divisor;

  if (reducedDenominator <= 12) {
    return `${label}x${reducedNumerator}/${reducedDenominator}`;
  }

  return `${label}x${rounded.toFixed(2)}`;
}

const UNLOCK_ABILITY_BONUS_LABELS: Partial<Record<BonusType, string>> = {
  unlock_caninian_ability: '🐶解放',
  unlock_lupinian_ability: '🐺解放',
  unlock_vulpinian_ability: '🦊解放',
  unlock_ursan_ability: '🐻解放',
  unlock_felidian_ability: '😺解放',
  unlock_mustelid_ability: '🦡解放',
  unlock_leporian_ability: '🐰解放',
  unlock_cervin_ability: '🦌解放',
  unlock_murid_ability: '🐭解放',
  unlock_procyonian_ability: '🦝解放',
};


function formatBonuses(bonuses: Bonus[], options?: { defenseMultiplierStyle?: 'raw' | 'friendly' }): string {
  const defenseMultiplierStyle = options?.defenseMultiplierStyle ?? 'raw';
  const parts: string[] = [];
  for (const b of bonuses) {
    if (b.type.endsWith('_multiplier') && MULTIPLIER_LABELS[b.type]) {
      parts.push(`${MULTIPLIER_LABELS[b.type]}x${b.value}`);
    } else if (b.type === 'equip_slot') {
      parts.push(`装備+${b.value}`);
    } else if (b.type === 'vitality') {
      parts.push(`体+${b.value}`);
    } else if (b.type === 'strength') {
      parts.push(`力+${b.value}`);
    } else if (b.type === 'intelligence') {
      parts.push(`知+${b.value}`);
    } else if (b.type === 'mind') {
      parts.push(`精+${b.value}`);
    } else if (b.type === 'grit') {
      parts.push(`根性+${b.value}`);
    } else if (b.type === 'caster') {
      parts.push(`術者+${b.value}`);
    } else if (b.type === 'penet') {
      parts.push(`貫通+${Math.round(b.value * 100)}`);
    } else if (b.type === 'pursuit') {
      parts.push(`追撃+${b.value}`);
    } else if (b.type === 'antagonism') {
      parts.push('⚠️敵対');
    } else if (b.type === 'accuracy') {
      const rounded = Math.round(b.value * 1000);
      parts.push(`命中${rounded >= 0 ? '+' : ''}${rounded}`);
    } else if (b.type === 'evasion') {
      const rounded = Math.round(b.value * 1000);
      parts.push(`回避${rounded >= 0 ? '+' : ''}${rounded}`);
    } else if (b.type === 'melee_attack') {
      parts.push(`近攻撃+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'ranged_attack') {
      parts.push(`遠攻撃+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'magical_attack') {
      parts.push(`魔攻撃+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'physical_attack') {
      parts.push(`物攻撃+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'physical_defense') {
      parts.push(`物防+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'magical_defense') {
      parts.push(`魔防+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'fire_offense') {
      parts.push(`炎攻+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'ice_offense') {
      parts.push(`氷攻+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'thunder_offense') {
      parts.push(`雷攻+${Math.round(b.value * 100)}%`);
    } else if (b.type === 'physical_offense_multiplier_xV') {
      parts.push(`物攻撃x${b.value.toFixed(2)}`);
    } else if (b.type === 'magical_offense_multiplier_xV') {
      parts.push(`魔攻撃x${b.value.toFixed(2)}`);
    } else if (b.type === 'physical_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? formatDefenseMultiplierBonus('物防', b.value)
          : `物防x${b.value.toFixed(2)}`
      );
    } else if (b.type === 'magical_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? formatDefenseMultiplierBonus('魔防', b.value)
          : `魔防x${b.value.toFixed(2)}`
      );
    } else if (b.type === 'fire_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? formatDefenseMultiplierBonus('炎防', b.value)
          : `炎防x${b.value.toFixed(2)}`
      );
    } else if (b.type === 'ice_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? formatDefenseMultiplierBonus('氷防', b.value)
          : `氷防x${b.value.toFixed(2)}`
      );
    } else if (b.type === 'thunder_defense_multiplier_xV') {
      parts.push(
        defenseMultiplierStyle === 'friendly'
          ? formatDefenseMultiplierBonus('雷防', b.value)
          : `雷防x${b.value.toFixed(2)}`
      );
    } else if (b.type === 'growth_xV') {
      parts.push(`成長${formatMultiplierValue(b.value)}倍`);
    } else if (b.type === 'ability' && b.abilityId) {
      const name = ABILITY_NAMES[b.abilityId] || b.abilityId;
      parts.push(`${name}Lv${b.abilityLevel || 1}`);
    } else if (b.type === 'ability_upgrade' && b.abilityId) {
      const name = ABILITY_NAMES[b.abilityId] || b.abilityId;
      parts.push(`${name}強化+${b.value}`);
    } else if (b.type === 'unimplemented_bonus') {
      parts.push(`(${b.unimplementedLabel || '未実装ボーナス'})`);
    } else if (b.type in UNLOCK_ABILITY_BONUS_LABELS) {
      parts.push(UNLOCK_ABILITY_BONUS_LABELS[b.type as BonusType] ?? '[解放]');
    }
  }
  return parts.join(', ');
}

function getRaceBonusesForSelection(race: Race, unlockAbilityActive = false): Bonus[] {
  if (!race.unlockAbility || unlockAbilityActive) {
    return race.bonuses as Bonus[];
  }

  return (race.bonuses as Bonus[]).filter(
    (bonus) => bonus.type !== 'ability' || bonus.abilityId !== race.unlockAbility?.id,
  );
}

const PREDISPOSITION_SHORT_NAMES: Record<string, string> = {
  sturdy: '頑',
  agile: '俊',
  brilliant: '聡',
  dexterous: '器',
  chivalric: '騎',
  shikon: '士',
  pursuing: '追',
  canny: '商',
  persistent: '耐',
};

const LINEAGE_SHORT_NAMES: Record<string, string> = {
  steel_oath: '鋼',
  war_spirit: '魂',
  far_sight: '眼',
  unmoving: '不',
  breaking_hand: '砕',
  guiding_thought: '導',
  hidden_principles: '秘',
  inherited_oaths: '継',
};

// Category name mapping
const CATEGORY_NAMES: Record<string, string> = {
  sword: '剣',
  katana: '刀',
  archery: '弓',
  armor: '鎧',
  gauntlet: '籠手',
  wand: 'ワンド',
  robe: '法衣',
  shield: '盾',
  bolt: 'ボルト',
  grimoire: '魔道書',
  catalyst: '霊媒',
  arrow: '矢',
};

// Category short names for tabs
const CATEGORY_SHORT_NAMES: Record<string, string> = {
  sword: '剣',
  katana: '刀',
  archery: '弓',
  armor: '鎧',
  gauntlet: '手',
  wand: '杖',
  robe: '衣',
  shield: '盾',
  bolt: 'ボ',
  grimoire: '書',
  catalyst: '媒',
  arrow: '矢',
};

// Category groups for tabs
const CATEGORY_GROUPS = [
  { id: 'durability', label: '耐久', categories: ['armor', 'robe', 'shield'] },
  { id: 'melee', label: '近距離攻撃', categories: ['sword', 'katana', 'gauntlet'] },
  { id: 'ranged', label: '遠距離攻撃', categories: ['arrow', 'bolt', 'archery'] },
  { id: 'magic', label: '魔法攻撃', categories: ['wand', 'grimoire', 'catalyst'] },
];

const MELEE_CATEGORIES = new Set<ItemCategory>(['sword', 'katana', 'gauntlet']);
const RANGED_CATEGORIES = new Set<ItemCategory>(['arrow', 'bolt', 'archery']);
const MAGIC_CATEGORIES = new Set<ItemCategory>(['wand', 'grimoire', 'catalyst']);
const ITEM_CATEGORY_ORDER: ItemCategory[] = ['armor', 'robe', 'shield', 'sword', 'katana', 'gauntlet', 'arrow', 'bolt', 'archery', 'wand', 'grimoire', 'catalyst'];

type CategoryGroup = typeof CATEGORY_GROUPS[number];

function getCharacterCombatBonusLevels(character: Character): { grit: number; pursuit: number; caster: number } {
  const race = RACES.find(r => r.id === character.raceId);
  const mainClass = CLASSES.find(c => c.id === character.mainClassId);
  const subClass = CLASSES.find(c => c.id === character.subClassId);
  const predisposition = PREDISPOSITIONS.find(p => p.id === character.predispositionId);
  const lineage = LINEAGES.find(l => l.id === character.lineageId);

  if (!race || !mainClass || !subClass || !predisposition || !lineage) {
    return { grit: 0, pursuit: 0, caster: 0 };
  }

  const isMasterClass = character.mainClassId === character.subClassId;
  const bonusSources = [
    race.bonuses,
    mainClass.mainSubBonuses,
    isMasterClass ? mainClass.masterBonuses : mainClass.mainBonuses,
    ...(isMasterClass ? [] : [subClass.mainSubBonuses]),
    predisposition.bonuses,
    lineage.bonuses,
  ];

  let grit = 0;
  let caster = 0;
  let pursuit = 0;
  for (const bonuses of bonusSources) {
    for (const bonus of bonuses) {
      if (bonus.type === 'grit') {
        grit = Math.max(grit, bonus.value);
      } else if (bonus.type === 'caster') {
        caster = Math.max(caster, bonus.value);
      } else if (bonus.type === 'pursuit') {
        pursuit += bonus.value;
      }
    }
  }

  return { grit, pursuit, caster };
}

function getAvailableCategoryGroups(character: Character): CategoryGroup[] {
  const { grit, pursuit, caster } = getCharacterCombatBonusLevels(character);
  return CATEGORY_GROUPS.filter((group) => {
    if (group.id === 'durability') return true;
    if (group.id === 'melee') return grit > 0;
    if (group.id === 'ranged') return pursuit > 0;
    if (group.id === 'magic') return caster > 0;
    return false;
  });
}

// Category priority for equipment slot sorting (lower index = higher priority)
const CATEGORY_PRIORITY: Record<string, number> = {
  armor: 0, robe: 1, shield: 2, sword: 3, katana: 4,
  gauntlet: 5, arrow: 6, bolt: 7, archery: 8, wand: 9,
  grimoire: 10, catalyst: 11,
};

// Sort items by descending priority: Item ID (higher first), SuperRare (higher first), Enhancement (higher first)
function sortInventoryItems(items: [string, InventoryVariant][]): [string, InventoryVariant][] {
  return [...items].sort((a, b) => {
    const itemA = a[1].item;
    const itemB = b[1].item;
    // 1. Higher-tier base items first (descending by ID)
    if (itemA.id !== itemB.id) return itemB.id - itemA.id;
    // 2. SuperRare titles prioritized within same ID (descending)
    if (itemA.superRare !== itemB.superRare) return itemB.superRare - itemA.superRare;
    // 3. Higher enhancement tiers first (descending)
    return itemB.enhancement - itemA.enhancement;
  });
}

export function HomeScreen({ state, actions, bags }: HomeScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>('expedition');
  const [activeBaseSubTab, setActiveBaseSubTab] = useState<BaseSubTab>('inventory');
  const [selectedCharacter, setSelectedCharacter] = useState<number>(0);
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);
  const [isAutoRepeatEnabled, setIsAutoRepeatEnabled] = useState(false);
  const [partyCycles, setPartyCycles] = useState<Record<number, PartyCycleRuntime>>({});
  const [expeditionExpandedLogParty, setExpeditionExpandedLogParty] = useState<number | null>(null);
  const [expeditionExpandedRoom, setExpeditionExpandedRoom] = useState<{ partyIndex: number; roomIndex: number } | null>(null);
  const [diaryExpandedLogs, setDiaryExpandedLogs] = useState<Record<string, boolean>>({});
  const [diaryExpandedRooms, setDiaryExpandedRooms] = useState<Record<string, boolean>>({});
  const [diarySettingsExpanded, setDiarySettingsExpanded] = useState(false);
  const [selectedBestiaryDungeonId, setSelectedBestiaryDungeonId] = useState<number>(1);
  const [expandedBestiaryEnemies, setExpandedBestiaryEnemies] = useState<Record<number, boolean>>({});
  const [bestiaryScrollTop, setBestiaryScrollTop] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('m.kemo');
  const currentEnv = getEnvironmentId();
  const isLunaEnvironment = currentEnv === 'luna';
  const tabScrollPositionsRef = useRef<Partial<Record<Tab, number>>>({});
  const tabContentRef = useRef<HTMLDivElement | null>(null);

  const currentParty = state.parties[state.selectedPartyIndex];
  const prevPartyLogsRef = useRef(state.parties.map((party) => party.lastExpeditionLog));
  const prevPartyLevelsRef = useRef(state.parties.map((party) => party.level));
  const prevShopPurchasesRef = useRef(state.global.shopPurchases);
  const prevInventoryRef = useRef(state.global.inventory);
  const notifiedRewardLogRef = useRef<Array<Party['lastExpeditionLog'] | null>>(state.parties.map(() => null));
  const prevPartyCycleStateRef = useRef<Array<PartyCycleState | null>>(state.parties.map(() => null));
  const hasHydratedAfkRef = useRef(false);
  const pendingAfkSimulationRef = useRef(true);
  const lastCheckpointAtRef = useRef(Date.now());
  const latestPartiesRef = useRef(state.parties);
  const autoRepeatEnabledRef = useRef(isAutoRepeatEnabled);
  const [pendingAfkMs, setPendingAfkMs] = useState(0);

  useEffect(() => {
    latestPartiesRef.current = state.parties;
  }, [state.parties]);

  useEffect(() => {
    autoRepeatEnabledRef.current = isAutoRepeatEnabled;
  }, [isAutoRepeatEnabled]);
  const afkSummaryBaselineRef = useRef<Array<{ victories: number; retreats: number; defeats: number; donatedGold: number; savedGold: number }> | null>(null);
  const shouldShowAfkSummaryRef = useRef(false);
  const { partyStats, characterStats } = computePartyStats(currentParty);

  useEffect(() => {
    preloadRaceIcons();
  }, []);

  useEffect(() => {
    if (isLunaEnvironment) {
      setGameMode('m.luna');
      return;
    }

    try {
      const savedMode = localStorage.getItem(GAME_MODE_STORAGE_KEY);
      if (savedMode === 'm.kemo' || savedMode === 'm.luna') {
        setGameMode(savedMode);
      }
    } catch (error) {
      console.error('Failed to load game mode:', error);
    }
  }, [isLunaEnvironment]);

  useEffect(() => {
    const modeToPersist: GameMode = isLunaEnvironment ? 'm.luna' : gameMode;
    if (isLunaEnvironment && gameMode !== 'm.luna') {
      setGameMode('m.luna');
      return;
    }

    try {
      localStorage.setItem(GAME_MODE_STORAGE_KEY, modeToPersist);
    } catch (error) {
      console.error('Failed to persist game mode:', error);
    }
  }, [gameMode, isLunaEnvironment]);

  useEffect(() => {
    if (hasHydratedAfkRef.current) return;
    hasHydratedAfkRef.current = true;

    try {
      const savedRuntime = localStorage.getItem(AFK_RUNTIME_STORAGE_KEY);
      if (!savedRuntime) return;

      const parsed = JSON.parse(savedRuntime) as {
        checkpointAt?: number;
        autoRepeatEnabled?: boolean;
        partyCycles?: Record<number, PartyCycleRuntime>;
      };

      const checkpointAt = typeof parsed.checkpointAt === 'number' ? parsed.checkpointAt : Date.now();
      const elapsedMs = Math.max(0, Math.min(Date.now() - checkpointAt, AFK_MAX_ELAPSED_MS));
      lastCheckpointAtRef.current = Date.now() - elapsedMs;

      setIsAutoRepeatEnabled(parsed.autoRepeatEnabled === true);
      if (parsed.partyCycles && typeof parsed.partyCycles === 'object') {
        const restoredCycles: Record<number, PartyCycleRuntime> = {};
        Object.entries(parsed.partyCycles).forEach(([key, value]) => {
          if (!value || typeof value !== 'object') return;
          const runtime = value as Partial<PartyCycleRuntime> & { elapsedMs?: number };
          const stateStartedAt = typeof runtime.stateStartedAt === 'number'
            ? runtime.stateStartedAt
            : Date.now() - Math.max(0, runtime.elapsedMs ?? 0);
          restoredCycles[Number(key)] = {
            state: runtime.state ?? '待機中',
            stateStartedAt,
            durationMs: typeof runtime.durationMs === 'number' ? runtime.durationMs : 1000,
          };
        });
        setPartyCycles(restoredCycles);
      }
    } catch (error) {
      console.error('Failed to restore AFK runtime state:', error);
    } finally {
      pendingAfkSimulationRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (pendingAfkSimulationRef.current) return;

    try {
      localStorage.setItem(
        AFK_RUNTIME_STORAGE_KEY,
        JSON.stringify({
          checkpointAt: lastCheckpointAtRef.current,
          autoRepeatEnabled: isAutoRepeatEnabled,
          partyCycles,
        })
      );
    } catch (error) {
      console.error('Failed to persist AFK runtime state:', error);
    }
  }, [isAutoRepeatEnabled, partyCycles]);

  useEffect(() => {
    if (pendingAfkMs > 0) return;
    if (!shouldShowAfkSummaryRef.current) return;
    const baselineStats = afkSummaryBaselineRef.current;
    if (!baselineStats) return;

    shouldShowAfkSummaryRef.current = false;
    afkSummaryBaselineRef.current = null;

    state.parties.forEach((party, partyIndex) => {
      const baseline = baselineStats[partyIndex];
      if (!baseline) return;

      const stats = {
        victories: Math.max(0, party.expeditionStats.victories - baseline.victories),
        retreats: Math.max(0, party.expeditionStats.retreats - baseline.retreats),
        defeats: Math.max(0, party.expeditionStats.defeats - baseline.defeats),
        donatedGold: Math.max(0, party.expeditionStats.donatedGold - baseline.donatedGold),
        savedGold: Math.max(0, party.expeditionStats.savedGold - baseline.savedGold),
      };

      const body = buildAfkSummaryNotification(stats);
      if (!body) return;

      actions.addNotification(`PT${partyIndex + 1}: ${body}`);
    });
  }, [actions, pendingAfkMs, state.parties]);

  useEffect(() => {
    if (pendingAfkMs <= 0) return;

    const timerId = window.setTimeout(() => {
      const autoRepeatEnabled = autoRepeatEnabledRef.current;
      const chunkElapsedMs = Math.min(pendingAfkMs, AFK_BACKGROUND_CHUNK_MS);
      actions.simulateAfk(chunkElapsedMs, autoRepeatEnabled, gameMode === 'm.luna');
      setPendingAfkMs((prev) => Math.max(0, prev - chunkElapsedMs));
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [actions, gameMode, pendingAfkMs]);

  const pendingGodsBattleByPartyRef = useRef<Record<number, boolean>>({});

  const processTimeCheckpoint = useCallback((now: number = Date.now()) => {
    const parties = latestPartiesRef.current;
    const autoRepeatEnabled = autoRepeatEnabledRef.current;
    const elapsedMs = Math.max(0, Math.min(now - lastCheckpointAtRef.current, AFK_MAX_ELAPSED_MS));
    if (elapsedMs < PARTY_CYCLE_TICK_MS) return;

    if (elapsedMs > 60_000) {
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      actions.addNotification(`(Debug)前回の更新から ${formatNumber(elapsedSeconds)}秒経過`);
    }

    if (elapsedMs >= 1000) {
      afkSummaryBaselineRef.current = parties.map((party) => ({ ...party.expeditionStats }));
      shouldShowAfkSummaryRef.current = true;
    }

    // Long background spans should be simulated inside the reducer so each expedition
    // phase reads the latest pending profit / HP values instead of stale render snapshots.
    if (elapsedMs >= 60_000) {
      setPendingAfkMs((prev) => Math.min(AFK_MAX_ELAPSED_MS, prev + elapsedMs));
      setPartyCycles((prev) => {
        const resetAt = now;
        const next: Record<number, PartyCycleRuntime> = {};
        parties.forEach((_, partyIndex) => {
          const runtime = prev[partyIndex];
          next[partyIndex] = {
            state: runtime?.state ?? '待機中',
            stateStartedAt: resetAt,
            durationMs: runtime?.durationMs ?? 1000,
          };
        });
        return next;
      });
      lastCheckpointAtRef.current = now;
      return;
    }

    const simulationNow = lastCheckpointAtRef.current + elapsedMs;

    setPartyCycles((prev) => {
      const next = { ...prev };
      parties.forEach((party, partyIndex) => {
        const runtime = next[partyIndex] ?? { state: '待機中' as PartyCycleState, stateStartedAt: simulationNow, durationMs: 1000 };
        const updated = { ...runtime };

        if (updated.state === '探索中') {
          const exploredRooms = party.lastExpeditionLog?.entries.length;
          updated.durationMs = getExplorationDurationMs(exploredRooms);
        }

        if (updated.state === '休息中') {
          const { partyStats: partyRuntimeStats } = computePartyStats(party);
          if (party.currentHp < partyRuntimeStats.hp) actions.healPartyHp(partyIndex, Math.max(1, Math.floor(partyRuntimeStats.hp * 0.01)));
          if (party.currentHp >= partyRuntimeStats.hp) {
            const hasTrophy = (party.lastExpeditionLog?.rewards.length ?? 0) > 0;
            const hasAutoSellItem = (party.lastExpeditionLog?.autoSellProfit ?? 0) > 0;
            if (hasTrophy || hasAutoSellItem) {
              updated.state = '売却中';
              updated.durationMs = 5000;
            } else {
              updated.state = party.pendingProfit > 0 ? '宴会中' : '睡眠中';
              updated.durationMs = updated.state === '宴会中' ? 5000 : 10000;
            }
            updated.stateStartedAt = simulationNow;
          }
        }

        let stateElapsedMs = Math.max(0, simulationNow - updated.stateStartedAt);
        while (updated.state !== '休息中' && stateElapsedMs >= updated.durationMs) {
          updated.stateStartedAt += updated.durationMs;
          stateElapsedMs -= updated.durationMs;

            if (updated.state === '売却中') {
              updated.state = '宴会中';
              updated.durationMs = 5000;
            } else if (updated.state === '宴会中') {
              const baseSpend = Math.floor((party.pendingProfit * (33 + Math.random() * 34)) / 100);
              const squanderLevel = getPartyAbilityLevel(party, 'squander');
              const squanderMultiplier = squanderLevel >= 2 ? 2 : squanderLevel >= 1 ? 1.5 : 1;
              const spend = Math.min(party.pendingProfit, Math.floor(baseSpend * squanderMultiplier));
              if (spend > 0) {
                if (squanderLevel > 0) {
                  const lordName = getPartyAbilityOwnerName(party, 'squander') ?? '名無し';
                  actions.addNotification(`${party.name} 君主${lordName}は贅沢に${formatNumber(spend)}G使った`);
                } else {
                  actions.addNotification(`${party.name}は${formatNumber(spend)}Gお金を使った`);
                }
              }
              actions.spendPendingProfit(partyIndex, spend);
              updated.state = '睡眠中';
              updated.durationMs = 10000;
            } else if (updated.state === '睡眠中') {
              updated.state = '祈り中';
              updated.durationMs = 5000;
            } else if (updated.state === '祈り中') {
              const donationRate = 10 + Math.random() * 23;
              const baseDonation = Math.floor((party.pendingProfit * donationRate) / 100);
              const titheLevel = getPartyAbilityLevel(party, 'tithe');
              const titheBonusRate = titheLevel >= 2 ? 0.15 : titheLevel >= 1 ? 0.1 : 0;
              const titheBonus = Math.floor(party.pendingProfit * titheBonusRate);
              const donation = Math.min(party.pendingProfit, baseDonation + titheBonus);
              const deposit = Math.max(0, party.pendingProfit - donation);
              actions.processPendingProfit(partyIndex, donation, deposit);
              if (donation > 0 || deposit > 0) {
                if (titheLevel > 0) {
                  const pilgrimName = getPartyAbilityOwnerName(party, 'tithe') ?? '名無し';
                  actions.addNotification(`${party.name} 巡礼者${pilgrimName}は祈りと共に${formatNumber(donation)}G神に捧げて、${formatNumber(deposit)}Gを貯金した`);
                } else {
                  actions.addNotification(`${party.name}は${formatNumber(donation)}G神に捧げ、${formatNumber(deposit)}Gを貯金した`);
                }
              }
              updated.state = autoRepeatEnabled ? '移動中' : '待機中';
              updated.durationMs = updated.state === '移動中' ? getPartyTravelDurationMs(party) : 1000;
            } else if (updated.state === '待機中') {
              updated.durationMs = 1000;
            } else if (updated.state === '移動中') {
              const triggerGodsBattle = pendingGodsBattleByPartyRef.current[partyIndex] === true;
              pendingGodsBattleByPartyRef.current[partyIndex] = false;
              actions.runExpedition(partyIndex, gameMode === 'm.luna', triggerGodsBattle);
              updated.state = '探索中';
              updated.durationMs = getExplorationDurationMs();
            } else if (updated.state === '探索中') {
              actions.finalizeDiaryLog(partyIndex);
              updated.state = '帰還中';
              updated.durationMs = getPartyTravelDurationMs(party);
            } else if (updated.state === '帰還中') {
              updated.state = '休息中';
              updated.durationMs = 1000;
            }

            if (updated.state === '休息中') {
              updated.stateStartedAt = simulationNow;
              stateElapsedMs = 0;
            }
        }

        next[partyIndex] = updated;
      });
      return next;
    });

    lastCheckpointAtRef.current = now;
  }, [actions]);

  useEffect(() => {
    const id = window.setInterval(() => {
      processTimeCheckpoint();
    }, PARTY_CYCLE_TICK_MS);
    return () => window.clearInterval(id);
  }, [processTimeCheckpoint]);

  useEffect(() => {
    const handleFocus = () => {
      processTimeCheckpoint();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        processTimeCheckpoint();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [processTimeCheckpoint]);

  // Item gain notifications after selling phase
  useEffect(() => {
    state.parties.forEach((party, index) => {
      const previousLog = prevPartyLogsRef.current[index] ?? null;
      const previousLevel = prevPartyLevelsRef.current[index] ?? party.level;
      const currentLog = party.lastExpeditionLog;
      const hasNewLog = !!currentLog && currentLog !== previousLog;
      const hasLevelUp = party.level > previousLevel;

      if (hasLevelUp) {
        const representativeCharacter = party.characters[0];
        const equipSlotIncrease = representativeCharacter
          ? Math.max(
              0,
              computeCharacterStats(representativeCharacter, party.level).maxEquipSlots
                - computeCharacterStats(representativeCharacter, previousLevel).maxEquipSlots
            )
          : 0;

        const levelUpMessage = equipSlotIncrease > 0
          ? `${party.name} はレベルが${party.level}に上がった(装備枠が+${equipSlotIncrease}増えた)`
          : `${party.name} はレベルが${party.level}に上がった`;
        actions.addNotification(levelUpMessage);
      }

      const cycle = partyCycles[index];
      const cycleState = cycle?.state ?? null;
      const sellingFinished = cycleState !== '売却中';
      const canAnnounceGains = cycleState !== '探索中' && cycleState !== '帰還中' && cycleState !== '休息中' && cycleState !== '売却中';
      const hasRewardsToNotify = (currentLog?.rewards.length ?? 0) > 0;
      const isAlreadyNotified = notifiedRewardLogRef.current[index] === currentLog;
      const justFinishedSelling = prevPartyCycleStateRef.current[index] === '売却中' && cycleState !== '売却中';

      if (hasRewardsToNotify && sellingFinished && canAnnounceGains && (hasNewLog || justFinishedSelling) && !isAlreadyNotified && currentLog) {
        for (const item of currentLog.rewards) {
          const isSuperRare = item.superRare > 0;
          const itemName = getItemDisplayName(item);
          const rarity = getItemRarityById(item.id);
          actions.addNotification(
            `${party.name}:${itemName}を入手！`,
            rarity === 'eliteRare' || rarity === 'bossRare' || isSuperRare ? 'rare' : 'normal',
            'item',
            undefined,
            { rarity, isSuperRareItem: isSuperRare }
          );
        }
        notifiedRewardLogRef.current[index] = currentLog;
      }

      if (hasNewLog && !hasRewardsToNotify) {
        notifiedRewardLogRef.current[index] = currentLog;
      }
    });

    prevPartyLogsRef.current = state.parties.map((party) => party.lastExpeditionLog);
    prevPartyLevelsRef.current = state.parties.map((party) => party.level);
    prevPartyCycleStateRef.current = state.parties.map((_, index) => partyCycles[index]?.state ?? null);
  }, [state.parties, partyCycles, actions]);

  useEffect(() => {
    notifiedRewardLogRef.current = notifiedRewardLogRef.current.slice(0, state.parties.length);
    while (notifiedRewardLogRef.current.length < state.parties.length) {
      notifiedRewardLogRef.current.push(null);
    }
    prevPartyCycleStateRef.current = prevPartyCycleStateRef.current.slice(0, state.parties.length);
    while (prevPartyCycleStateRef.current.length < state.parties.length) {
      prevPartyCycleStateRef.current.push(null);
    }
  }, [state.parties.length]);

  useEffect(() => {
    const newlyPurchasedItemIds: number[] = [];

    for (const [stockKey, currentPurchases] of Object.entries(state.global.shopPurchases)) {
      const previousPurchases = new Set(prevShopPurchasesRef.current[stockKey] ?? []);
      for (const itemId of currentPurchases) {
        if (!previousPurchases.has(itemId)) {
          newlyPurchasedItemIds.push(itemId);
        }
      }
    }

    if (newlyPurchasedItemIds.length > 0) {
      for (const itemId of newlyPurchasedItemIds) {
        const purchasedVariant = Object.values(state.global.inventory).find((variant) => {
          if (variant.item.id !== itemId) return false;
          const previousCount = prevInventoryRef.current[getVariantKey(variant.item)]?.count ?? 0;
          return variant.count > previousCount;
        });

        const autoSoldVariant = Object.values(state.global.inventory).find((variant) => {
          if (variant.item.id !== itemId || variant.status !== 'sold') return false;
          const previousVariant = prevInventoryRef.current[getVariantKey(variant.item)];
          return previousVariant?.status === 'sold' && previousVariant.count === variant.count;
        });

        const wasAutoSold = !purchasedVariant && Boolean(autoSoldVariant);

        const purchasedName = purchasedVariant
          ? getItemDisplayName(purchasedVariant.item)
          : autoSoldVariant
            ? getItemDisplayName(autoSoldVariant.item)
            : `${ITEMS.find((item) => item.id === itemId)?.name ?? '不明な品'} x1`;

        if (wasAutoSold) {
          actions.addNotification(`店から ${purchasedName} を購入して失望した(自動売却)`, 'normal', 'item', true);
          continue;
        }

        actions.addNotification(`店から ${purchasedName} を購入した！`, 'normal', 'item', true);
      }
    }

    prevShopPurchasesRef.current = state.global.shopPurchases;
    prevInventoryRef.current = state.global.inventory;
  }, [state.global.shopPurchases, state.global.inventory, actions]);

  useEffect(() => {
    const currentScrollTop = tabScrollPositionsRef.current[activeTab] ?? 0;
    tabContentRef.current?.scrollTo({ top: currentScrollTop, behavior: 'auto' });
  }, [activeTab]);

  const switchTab = (nextTab: Tab) => {
    const currentScrollTop = tabContentRef.current?.scrollTop ?? 0;
    tabScrollPositionsRef.current[activeTab] = currentScrollTop;
    setActiveTab(nextTab);
  };

  const transitionTo = (partyIndex: number, nextState: PartyCycleState, durationMs: number) => {
    setPartyCycles((prev) => ({
      ...prev,
      [partyIndex]: { state: nextState, stateStartedAt: Date.now(), durationMs },
    }));
  };

  const getPartyAbilityOwnerName = (party: Party, abilityId: string): string | null => {
    const { characterStats } = computePartyStats(party);
    const owner = party.characters.find((character) =>
      characterStats.find((stats) => stats.characterId === character.id)?.abilities.some((ability) => ability.id === abilityId)
    );
    return owner?.name ?? null;
  };

  const getPartyAbilityLevel = (party: Party, abilityId: string): number => {
    const { characterStats } = computePartyStats(party);
    return characterStats.reduce((maxLevel, stats) => {
      const level = stats.abilities
        .filter((ability) => ability.id === abilityId)
        .reduce((abilityMax, ability) => Math.max(abilityMax, ability.level), 0);
      return Math.max(maxLevel, level);
    }, 0);
  };

  const getPartyTravelDurationMs = (party: Party): number => {
    const peddlerLevel = getPartyAbilityLevel(party, 'peddler');
    if (peddlerLevel >= 2) return Math.floor((5000 * 3) / 5);
    if (peddlerLevel >= 1) return Math.floor((5000 * 2) / 3);
    return 5000;
  };

  const notifyExpeditionRewardsIfNeeded = (party: Party, partyIndex: number) => {
    const currentLog = party.lastExpeditionLog;
    if (!currentLog || currentLog.rewards.length <= 0) return;
    if (notifiedRewardLogRef.current[partyIndex] === currentLog) return;

    for (const item of currentLog.rewards) {
      const isSuperRare = item.superRare > 0;
      const itemName = getItemDisplayName(item);
      const rarity = getItemRarityById(item.id);
      actions.addNotification(
        `${party.name}:${itemName}を入手！`,
        rarity === 'eliteRare' || rarity === 'bossRare' || isSuperRare ? 'rare' : 'normal',
        'item',
        undefined,
        { rarity, isSuperRareItem: isSuperRare }
      );
    }

    notifiedRewardLogRef.current[partyIndex] = currentLog;
  };


  const triggerSortie = (partyIndex: number, triggerGodsBattle: boolean = false) => {
    const cycle = partyCycles[partyIndex];
    const party = state.parties[partyIndex];
    if (!party) return;
    const { partyStats } = computePartyStats(party);

    if (party.currentHp <= 0 || partyStats.hp <= 0) {
      const refusingCharacter = party.characters[Math.floor(Math.random() * party.characters.length)]?.name ?? `PT${partyIndex + 1}`;
      actions.addNotification(`${refusingCharacter} は疲弊しており出撃を拒否した`);
      return;
    }

    if (cycle?.state === '探索中') {
      actions.addNotification(`${party.name} は探索中であり、その要請には従えない`);
      return;
    }

    const stolenProfit = Math.max(0, party.pendingProfit);

    if (cycle?.state !== '待機中') {
      if (stolenProfit > 0) {
        actions.addNotification(`${party.name} は神の緊急動員に憤り、${formatNumber(stolenProfit)}Gを持ち逃げして出撃した`);
      } else {
        actions.addNotification(`${party.name} は神の緊急動員に憤りながらも出撃した`);
      }
    }

    if (cycle) {
      notifyExpeditionRewardsIfNeeded(party, partyIndex);
    }

    pendingGodsBattleByPartyRef.current[partyIndex] = triggerGodsBattle;
    actions.clearPendingProfit(partyIndex);
    transitionTo(partyIndex, '移動中', getPartyTravelDurationMs(party));
  };

  const prevActiveTabRef = useRef<Tab>(activeTab);
  useEffect(() => {
    if (prevActiveTabRef.current === 'diary' && activeTab !== 'diary') {
      actions.markAllDiaryLogsSeen();
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, actions]);

  useEffect(() => {
    if (activeTab !== 'base' || activeBaseSubTab !== 'inventory') return;
    const hasNewInventoryItems = Object.values(state.global.inventory).some((variant) => variant.isNew);
    if (!hasNewInventoryItems) return;
    actions.markItemsSeen();
  }, [activeTab, activeBaseSubTab, state.global.inventory, actions]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'party', label: 'パーティ' },
    { id: 'expedition', label: '探検' },
    { id: 'base', label: '拠点' },
    { id: 'diary', label: '日誌' },
    { id: 'setting', label: '神聖局' },
  ];

  const unreadDiaryCount = state.parties.reduce((count, party) => (
    count + party.diaryLogs.filter((log) => !log.isRead).length
  ), 0);
  const hasUnreadDiary = unreadDiaryCount > 0;
  const unreadDiaryBadgeLabel = unreadDiaryCount >= 11 ? '10+' : `${unreadDiaryCount}`;
  const envLabel = getEnvLabel();
  const versionLabel = envLabel ? `${APP_VERSION} (${envLabel})` : APP_VERSION;
  const gameTitle = isLunaEnvironment ? 'ルナの冒険' : 'ケモの冒険';

  useEffect(() => {
    document.title = gameTitle;
  }, [gameTitle]);

  return (
    <div className={`flex flex-col h-screen ${HEADER_HEIGHT_CLASS} ${gameMode === 'm.luna' ? 'theme-luna' : ''}`}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-300 p-3 z-10">
        <div className="max-w-lg mx-auto w-full">
          <div className="flex justify-between items-center gap-3">
            <div>
              <h1 className="text-lg font-bold">{gameTitle}</h1>
              <div className="text-xs text-gray-500">{versionLabel}</div>
            </div>
            <div className="flex items-center gap-2 text-right text-sm font-medium">
              <span>{formatNumber(state.global.gold)}G</span>
              <button
                onClick={() => {
                  setIsAutoRepeatEnabled((prev) => {
                    const nextEnabled = !prev;
                    if (nextEnabled) {
                      setPartyCycles((prevCycles) => {
                        const nextCycles = { ...prevCycles };
                        state.parties.forEach((_, partyIndex) => {
                          const runtime = nextCycles[partyIndex] ?? { state: '待機中' as PartyCycleState, stateStartedAt: Date.now(), durationMs: 1000 };
                          if (runtime.state === '待機中') {
                            nextCycles[partyIndex] = { state: '移動中', stateStartedAt: Date.now(), durationMs: getPartyTravelDurationMs(state.parties[partyIndex]) };
                          }
                        });
                        return nextCycles;
                      });
                    }
                    return nextEnabled;
                  });
                }}
                className={`rounded px-2 py-0.5 text-xs border ${
                  isAutoRepeatEnabled
                    ? 'bg-blue-50 border-sub text-sub'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                自動進行{isAutoRepeatEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mt-3 -mb-3 border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  switchTab(tab.id);
                }}
                className={`flex-1 py-2 text-sm font-medium relative ${
                  activeTab === tab.id
                    ? 'text-sub border-b-2 border-sub'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.id === 'diary' && hasUnreadDiary && (
                  <span className="absolute -top-0.5 right-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] leading-none text-white">
                    {unreadDiaryBadgeLabel}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div
        ref={tabContentRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={() => {
          const currentScrollTop = tabContentRef.current?.scrollTop ?? 0;
          tabScrollPositionsRef.current[activeTab] = currentScrollTop;
        }}
      >
        {activeTab === 'party' && (
          <PartyTab
            parties={state.parties}
            selectedPartyIndex={state.selectedPartyIndex}
            party={currentParty}
            partyStats={partyStats}
            characterStats={characterStats}
            selectedCharacter={selectedCharacter}
            setSelectedCharacter={setSelectedCharacter}
            editingCharacter={editingCharacter}
            setEditingCharacter={setEditingCharacter}
            onUpdateCharacter={actions.updateCharacter}
            onReorderPartyCharacter={actions.reorderPartyCharacter}
            onEquipItem={actions.equipItem}
            onAddStatNotifications={actions.addStatNotifications}
            onSelectParty={actions.selectParty}
            onUpdatePartyDeity={actions.updatePartyDeity}
            inventory={state.global.inventory}
            deityDonations={state.global.deityDonations}
          />
        )}

        {activeTab === 'expedition' && (
          <ExpeditionTab
            state={state}
            onSelectDungeon={actions.selectDungeon}
            onSetExpeditionDepthLimit={actions.setExpeditionDepthLimit}
            partyCycles={partyCycles}
            onTriggerSortie={triggerSortie}
            expandedLogParty={expeditionExpandedLogParty}
            setExpandedLogParty={setExpeditionExpandedLogParty}
            expandedRoom={expeditionExpandedRoom}
            setExpandedRoom={setExpeditionExpandedRoom}
          />
        )}

        {activeTab === 'base' && (
          <BaseTab
            inventory={state.global.inventory}
            parties={state.parties}
            gold={state.global.gold}
            shopPurchases={state.global.shopPurchases}
            shopRefreshCounts={state.global.shopRefreshCounts}
            shopIntimacy={state.global.shopIntimacy}
            shopIntimacyLastDecayAt={state.global.shopIntimacyLastDecayAt}
            onSellStack={actions.sellStack}
            onSetVariantStatus={actions.setVariantStatus}
            onBuyShopItem={actions.buyShopItem}
            onRefreshShopLineup={actions.refreshShopLineup}
            activeSubTab={activeBaseSubTab}
            onSetActiveSubTab={setActiveBaseSubTab}
          />
        )}

        {activeTab === 'diary' && (
          <DiaryTab
            parties={state.parties}
            onOpenDiaryLog={actions.markDiaryLogSeen}
            onUpdateDiarySettings={actions.updateDiarySettings}
            expandedLogs={diaryExpandedLogs}
            onSetExpandedLogs={setDiaryExpandedLogs}
            expandedRooms={diaryExpandedRooms}
            onSetExpandedRooms={setDiaryExpandedRooms}
            isSettingsExpanded={diarySettingsExpanded}
            onSetIsSettingsExpanded={setDiarySettingsExpanded}
          />
        )}

        {activeTab === 'setting' && (
          <SettingTab
            gameState={state}
            deityDonations={state.global.deityDonations}
            bags={bags}
            onResetGame={actions.resetGame}
            onImportGameState={actions.importGameState}
            onAddNotification={actions.addNotification}
            onResetCommonBags={actions.resetCommonBags}
            onResetUniqueBags={actions.resetUniqueBags}
            onResetSuperRareBag={actions.resetSuperRareBag}
            selectedBestiaryDungeonId={selectedBestiaryDungeonId}
            onSetSelectedBestiaryDungeonId={setSelectedBestiaryDungeonId}
            expandedBestiaryEnemies={expandedBestiaryEnemies}
            onSetExpandedBestiaryEnemies={setExpandedBestiaryEnemies}
            bestiaryScrollTop={bestiaryScrollTop}
            onSetBestiaryScrollTop={setBestiaryScrollTop}
            gameMode={gameMode}
            onSetGameMode={setGameMode}
            isLunaEnvironment={isLunaEnvironment}
          />
        )}
      </div>
    </div>
  );
}

function PartyTab({
  parties,
  selectedPartyIndex,
  party,
  partyStats,
  characterStats,
  selectedCharacter,
  setSelectedCharacter,
  editingCharacter,
  setEditingCharacter,
  onUpdateCharacter,
  onReorderPartyCharacter,
  onEquipItem,
  onAddStatNotifications,
  onSelectParty,
  onUpdatePartyDeity,
  inventory,
  deityDonations,
}: {
  parties: Party[];
  selectedPartyIndex: number;
  party: Party;
  partyStats: ReturnType<typeof computePartyStats>['partyStats'];
  characterStats: ReturnType<typeof computePartyStats>['characterStats'];
  selectedCharacter: number;
  setSelectedCharacter: Dispatch<SetStateAction<number>>;
  editingCharacter: number | null;
  setEditingCharacter: Dispatch<SetStateAction<number | null>>;
  onUpdateCharacter: (id: number, updates: Partial<Character>) => void;
  onReorderPartyCharacter: (fromIndex: number, toIndex: number) => void;
  onEquipItem: (characterId: number, slotIndex: number, itemKey: string | null) => void;
  onAddStatNotifications: (changes: Array<{ message: string; isPositive: boolean }>) => void;
  onSelectParty: (partyIndex: number) => void;
  onUpdatePartyDeity: (partyIndex: number, deityName: string) => void;
  inventory: InventoryRecord;
  deityDonations: Record<string, number>;
}) {
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [equipCategory, setEquipCategory] = useState('armor');
  const [showBonusHelp, setShowBonusHelp] = useState(false);
  const [partyRarityFilter, setPartyRarityFilter] = useState<RarityFilter>('all');
  const [partySuperRareOnly, setPartySuperRareOnly] = useState(false);
  const [draggingCharacterIndex, setDraggingCharacterIndex] = useState<number | null>(null);
  const selectedChar = party.characters[selectedCharacter];
  const equippedItems = selectedChar.equipment.filter((item): item is Item => item != null);
  const unlockedRaceAbilities = getUnlockedRaceAbilitiesFromBonuses(equippedItems.flatMap((item) => item.bonuses ?? []));

  // Calculate current stats for notification: HP is party-wide, others are per selected character
  const selectedStats = characterStats[selectedCharacter];
  const selectedRace = RACES.find((race) => race.id === selectedChar.raceId);
  const isSelectedRaceUnlockConditionActive = unlockedRaceAbilities.has(selectedChar.raceId);
  const selectedIaigiriLevel = selectedStats.abilities.find(a => a.id === 'iaigiri')?.level ?? 0;
  const selectedIaigiriMultiplier = selectedIaigiriLevel >= 3 ? 3.0 : selectedIaigiriLevel >= 2 ? 2.5 : selectedIaigiriLevel >= 1 ? 2.0 : 1.0;
  const selectedEffectiveAccuracyBonus = getEffectiveAccuracyBonus(selectedStats.accuracyBonus, selectedStats.abilities);
  const selectedPhysicalDefenseResist = Math.max(0.01, selectedStats.physicalDefenseAmplifier + selectedStats.deityDefenseAmplifierBonus.physical);
  const selectedMagicalDefenseResist = Math.max(0.01, selectedStats.magicalDefenseAmplifier + selectedStats.deityDefenseAmplifierBonus.magical);
  const selectedMeleeAttackAmp = ((selectedIaigiriLevel > 0
    ? selectedIaigiriMultiplier * (1 + selectedStats.meleeAttackCBonus + getOffenseMultiplierSum(equippedItems, 'melee', selectedStats.offenseCBonusNames)) * selectedStats.physicalOffenseMultiplier
    : (1 + selectedStats.meleeAttackCBonus + getOffenseMultiplierSum(equippedItems, 'melee', selectedStats.offenseCBonusNames) + selectedStats.physicalAttackCBonus) * selectedStats.physicalOffenseMultiplier
  ) + selectedStats.deityOffenseAmplifierBonus) * getBaseOffenseScale(selectedStats.baseStats.strength);
  const selectedRangedAttackAmp = ((selectedIaigiriLevel > 0
    ? selectedIaigiriMultiplier * (1 + selectedStats.rangedAttackCBonus + getOffenseMultiplierSum(equippedItems, 'ranged', selectedStats.offenseCBonusNames)) * selectedStats.physicalOffenseMultiplier
    : (1 + selectedStats.rangedAttackCBonus + getOffenseMultiplierSum(equippedItems, 'ranged', selectedStats.offenseCBonusNames) + selectedStats.physicalAttackCBonus) * selectedStats.physicalOffenseMultiplier
  ) + selectedStats.deityOffenseAmplifierBonus) * getBaseOffenseScale(selectedStats.baseStats.strength);
  const selectedMagicalAttackAmp = (((1 + selectedStats.magicalAttackCBonus + getOffenseMultiplierSum(equippedItems, 'magical', selectedStats.offenseCBonusNames)) * selectedStats.magicalOffenseMultiplier) + selectedStats.deityOffenseAmplifierBonus) * getBaseOffenseScale(selectedStats.baseStats.intelligence);
  const combatTotals = {
    vitality: selectedStats.baseStats.vitality,
    strength: selectedStats.baseStats.strength,
    intelligence: selectedStats.baseStats.intelligence,
    mind: selectedStats.baseStats.mind,
    // Keep offense notifications aligned with the values shown in the status panel.
    meleeAtk: Math.round(selectedStats.meleeAttack),
    rangedAtk: Math.round(selectedStats.rangedAttack),
    magicalAtk: Math.round(selectedStats.magicalAttack),
    meleeNoA: selectedStats.meleeNoA,
    rangedNoA: selectedStats.rangedNoA,
    magicalNoA: selectedStats.magicalNoA,
    // Keep defense notifications aligned with the values shown in the status panel.
    physDef: Math.round(selectedStats.physicalDefense),
    magDef: Math.round(selectedStats.magicalDefense),
    physicalDefenseResistPercent: Math.round(selectedPhysicalDefenseResist * 100),
    magicalDefenseResistPercent: Math.round(selectedMagicalDefenseResist * 100),
    fireDefenseResistPercent: Math.round(Math.max(0.01, selectedStats.elementalDefenseMultipliers.fire) * 100),
    iceDefenseResistPercent: Math.round(Math.max(0.01, selectedStats.elementalDefenseMultipliers.ice) * 100),
    thunderDefenseResistPercent: Math.round(Math.max(0.01, selectedStats.elementalDefenseMultipliers.thunder) * 100),
    meleeAttackAmp: selectedMeleeAttackAmp,
    rangedAttackAmp: selectedRangedAttackAmp,
    magicalAttackAmp: selectedMagicalAttackAmp,
    accuracy: Math.round(selectedEffectiveAccuracyBonus * 1000),
    evasion: Math.round(selectedStats.evasionBonus * 1000),
    penet: Math.round(selectedStats.penetMultiplier * 100),
    hp: Math.floor(partyStats.hp),
    elementalOffense: selectedStats.elementalOffense,
    elementalOffensePercent: Math.round((selectedStats.elementalOffenseValue - 1) * 100),
    unlockRaceName: selectedRace?.name ?? '',
    unlockAbilityName: selectedRace?.unlockAbility?.name ?? '',
    unlockConditionActive: isSelectedRaceUnlockConditionActive,
  };

  const prevStatsRef = useRef<typeof combatTotals | null>(null);
  const prevSelectedCharRef = useRef(selectedCharacter);
  const prevSelectedPartyRef = useRef(selectedPartyIndex);
  const touchDraggingCharacterIndexRef = useRef<number | null>(null);

  const getReorderedIndex = useCallback((currentIndex: number, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return currentIndex;
    if (currentIndex === fromIndex) return toIndex;
    if (fromIndex < toIndex && currentIndex > fromIndex && currentIndex <= toIndex) return currentIndex - 1;
    if (fromIndex > toIndex && currentIndex >= toIndex && currentIndex < fromIndex) return currentIndex + 1;
    return currentIndex;
  }, []);

  const reorderCharacter = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    onReorderPartyCharacter(fromIndex, toIndex);
    setSelectedCharacter((currentIndex) => getReorderedIndex(currentIndex, fromIndex, toIndex));
    setEditingCharacter((currentIndex) => {
      if (currentIndex === null) return null;
      return getReorderedIndex(currentIndex, fromIndex, toIndex);
    });
    setSelectingSlot(null);
  }, [getReorderedIndex, onReorderPartyCharacter, setEditingCharacter, setSelectedCharacter]);

  // Watch for stat changes after equipment - send individual notification per stat change
  useEffect(() => {
    // Skip notifications when switching party/characters (stats naturally differ)
    if (prevSelectedPartyRef.current !== selectedPartyIndex) {
      prevSelectedPartyRef.current = selectedPartyIndex;
      prevSelectedCharRef.current = selectedCharacter;
      prevStatsRef.current = combatTotals;
      return;
    }

    if (prevSelectedCharRef.current !== selectedCharacter) {
      prevSelectedCharRef.current = selectedCharacter;
      prevStatsRef.current = combatTotals;
      return;
    }
    if (prevStatsRef.current) {
      const prev = prevStatsRef.current;
      const changes: { message: string; isPositive: boolean }[] = [];

      if (combatTotals.vitality !== prev.vitality) {
        const isPositive = combatTotals.vitality > prev.vitality;
        changes.push({ message: `体力 ${formatNumber(prev.vitality)} → ${formatNumber(combatTotals.vitality)}`, isPositive });
      }
      if (combatTotals.strength !== prev.strength) {
        const isPositive = combatTotals.strength > prev.strength;
        changes.push({ message: `力 ${formatNumber(prev.strength)} → ${formatNumber(combatTotals.strength)}`, isPositive });
      }
      if (combatTotals.intelligence !== prev.intelligence) {
        const isPositive = combatTotals.intelligence > prev.intelligence;
        changes.push({ message: `知性 ${formatNumber(prev.intelligence)} → ${formatNumber(combatTotals.intelligence)}`, isPositive });
      }
      if (combatTotals.mind !== prev.mind) {
        const isPositive = combatTotals.mind > prev.mind;
        changes.push({ message: `精神 ${formatNumber(prev.mind)} → ${formatNumber(combatTotals.mind)}`, isPositive });
      }

      // Check all stat changes and collect them
      if (combatTotals.physDef !== prev.physDef) {
        const isPositive = combatTotals.physDef > prev.physDef;
        changes.push({ message: `物防 ${formatNumber(prev.physDef)} → ${formatNumber(combatTotals.physDef)}`, isPositive });
      }
      if (combatTotals.magDef !== prev.magDef) {
        const isPositive = combatTotals.magDef > prev.magDef;
        changes.push({ message: `魔防 ${formatNumber(prev.magDef)} → ${formatNumber(combatTotals.magDef)}`, isPositive });
      }
      if (combatTotals.physicalDefenseResistPercent !== prev.physicalDefenseResistPercent) {
        const isPositive = combatTotals.physicalDefenseResistPercent < prev.physicalDefenseResistPercent;
        changes.push({
          message: `物理防御耐性 ${formatNumber(prev.physicalDefenseResistPercent)}% → ${formatNumber(combatTotals.physicalDefenseResistPercent)}%`,
          isPositive,
        });
      }
      if (combatTotals.magicalDefenseResistPercent !== prev.magicalDefenseResistPercent) {
        const isPositive = combatTotals.magicalDefenseResistPercent < prev.magicalDefenseResistPercent;
        changes.push({
          message: `魔法防御耐性 ${formatNumber(prev.magicalDefenseResistPercent)}% → ${formatNumber(combatTotals.magicalDefenseResistPercent)}%`,
          isPositive,
        });
      }
      if (combatTotals.fireDefenseResistPercent !== prev.fireDefenseResistPercent) {
        const isPositive = combatTotals.fireDefenseResistPercent < prev.fireDefenseResistPercent;
        changes.push({
          message: `炎防御耐性 ${formatNumber(prev.fireDefenseResistPercent)}% → ${formatNumber(combatTotals.fireDefenseResistPercent)}%`,
          isPositive,
        });
      }
      if (combatTotals.iceDefenseResistPercent !== prev.iceDefenseResistPercent) {
        const isPositive = combatTotals.iceDefenseResistPercent < prev.iceDefenseResistPercent;
        changes.push({
          message: `氷防御耐性 ${formatNumber(prev.iceDefenseResistPercent)}% → ${formatNumber(combatTotals.iceDefenseResistPercent)}%`,
          isPositive,
        });
      }
      if (combatTotals.thunderDefenseResistPercent !== prev.thunderDefenseResistPercent) {
        const isPositive = combatTotals.thunderDefenseResistPercent < prev.thunderDefenseResistPercent;
        changes.push({
          message: `雷防御耐性 ${formatNumber(prev.thunderDefenseResistPercent)}% → ${formatNumber(combatTotals.thunderDefenseResistPercent)}%`,
          isPositive,
        });
      }
      if (combatTotals.hp !== prev.hp) {
        const isPositive = combatTotals.hp > prev.hp;
        changes.push({ message: `HP ${formatNumber(prev.hp)} → ${formatNumber(combatTotals.hp)}`, isPositive });
      }
      if (combatTotals.meleeAtk !== prev.meleeAtk) {
        const isPositive = combatTotals.meleeAtk > prev.meleeAtk;
        changes.push({ message: `近攻 ${formatNumber(prev.meleeAtk)} → ${formatNumber(combatTotals.meleeAtk)}`, isPositive });
      }
      if (combatTotals.meleeNoA !== prev.meleeNoA) {
        const isPositive = combatTotals.meleeNoA > prev.meleeNoA;
        changes.push({ message: `近回数 ${formatNumber(prev.meleeNoA)} → ${formatNumber(combatTotals.meleeNoA)}`, isPositive });
      }
      if (combatTotals.rangedAtk !== prev.rangedAtk) {
        const isPositive = combatTotals.rangedAtk > prev.rangedAtk;
        changes.push({ message: `遠攻 ${formatNumber(prev.rangedAtk)} → ${formatNumber(combatTotals.rangedAtk)}`, isPositive });
      }
      if (combatTotals.rangedNoA !== prev.rangedNoA) {
        const isPositive = combatTotals.rangedNoA > prev.rangedNoA;
        changes.push({ message: `遠回数 ${formatNumber(prev.rangedNoA)} → ${formatNumber(combatTotals.rangedNoA)}`, isPositive });
      }
      if (combatTotals.magicalAtk !== prev.magicalAtk) {
        const isPositive = combatTotals.magicalAtk > prev.magicalAtk;
        changes.push({ message: `魔攻 ${formatNumber(prev.magicalAtk)} → ${formatNumber(combatTotals.magicalAtk)}`, isPositive });
      }
      if (combatTotals.meleeAttackAmp !== prev.meleeAttackAmp) {
        const isPositive = combatTotals.meleeAttackAmp > prev.meleeAttackAmp;
        changes.push({ message: `近接攻撃倍率 x${prev.meleeAttackAmp.toFixed(2)} → x${combatTotals.meleeAttackAmp.toFixed(2)}`, isPositive });
      }
      if (combatTotals.rangedAttackAmp !== prev.rangedAttackAmp) {
        const isPositive = combatTotals.rangedAttackAmp > prev.rangedAttackAmp;
        changes.push({ message: `遠距離攻撃倍率 x${prev.rangedAttackAmp.toFixed(2)} → x${combatTotals.rangedAttackAmp.toFixed(2)}`, isPositive });
      }
      if (combatTotals.magicalAttackAmp !== prev.magicalAttackAmp) {
        const isPositive = combatTotals.magicalAttackAmp > prev.magicalAttackAmp;
        changes.push({ message: `魔法攻撃倍率 x${prev.magicalAttackAmp.toFixed(2)} → x${combatTotals.magicalAttackAmp.toFixed(2)}`, isPositive });
      }
      if (combatTotals.magicalNoA !== prev.magicalNoA) {
        const isPositive = combatTotals.magicalNoA > prev.magicalNoA;
        changes.push({ message: `魔回数 ${formatNumber(prev.magicalNoA)} → ${formatNumber(combatTotals.magicalNoA)}`, isPositive });
      }
      if (combatTotals.accuracy !== prev.accuracy) {
        const isPositive = combatTotals.accuracy > prev.accuracy;
        changes.push({ message: `命中 ${prev.accuracy >= 0 ? '+' : ''}${formatNumber(prev.accuracy)} → ${combatTotals.accuracy >= 0 ? '+' : ''}${formatNumber(combatTotals.accuracy)}`, isPositive });
      }
      if (combatTotals.evasion !== prev.evasion) {
        const isPositive = combatTotals.evasion > prev.evasion;
        changes.push({ message: `回避 ${prev.evasion >= 0 ? '+' : ''}${formatNumber(prev.evasion)} → ${combatTotals.evasion >= 0 ? '+' : ''}${formatNumber(combatTotals.evasion)}`, isPositive });
      }
      if (combatTotals.penet !== prev.penet) {
        const isPositive = combatTotals.penet > prev.penet;
        changes.push({ message: `貫通 ${formatNumber(prev.penet)} → ${formatNumber(combatTotals.penet)}`, isPositive });
      }
      const elementalLabels: Record<Exclude<ElementalOffense, 'none'>, string> = {
        fire: '火',
        ice: '氷',
        thunder: '雷',
      };
      const prevElementPercents: Record<Exclude<ElementalOffense, 'none'>, number> = {
        fire: 0,
        ice: 0,
        thunder: 0,
      };
      const currentElementPercents: Record<Exclude<ElementalOffense, 'none'>, number> = {
        fire: 0,
        ice: 0,
        thunder: 0,
      };

      if (prev.elementalOffense !== 'none') {
        prevElementPercents[prev.elementalOffense] = prev.elementalOffensePercent;
      }
      if (combatTotals.elementalOffense !== 'none') {
        currentElementPercents[combatTotals.elementalOffense] = combatTotals.elementalOffensePercent;
      }

      (['fire', 'ice', 'thunder'] as const).forEach((element) => {
        if (prevElementPercents[element] === currentElementPercents[element]) return;
        const isPositive = currentElementPercents[element] > prevElementPercents[element];
        changes.push({
          message: `${elementalLabels[element]}属性: ${prevElementPercents[element]}% → ${currentElementPercents[element]}%`,
          isPositive,
        });
      });

      if (
        combatTotals.unlockRaceName &&
        combatTotals.unlockAbilityName &&
        combatTotals.unlockConditionActive !== prev.unlockConditionActive
      ) {
        changes.push({
          message: combatTotals.unlockConditionActive
            ? `${combatTotals.unlockRaceName}の${combatTotals.unlockAbilityName}アビリティが解放されました`
            : `${combatTotals.unlockRaceName}の${combatTotals.unlockAbilityName}アビリティがロックされました`,
          isPositive: combatTotals.unlockConditionActive,
        });
      }

      // Send all stat notifications at once (clears previous stat notifications)
      if (changes.length > 0) {
        onAddStatNotifications(changes);
      }
    }
    prevStatsRef.current = combatTotals;
  }, [combatTotals.vitality, combatTotals.strength, combatTotals.intelligence, combatTotals.mind,
      combatTotals.physDef, combatTotals.magDef, combatTotals.physicalDefenseResistPercent, combatTotals.magicalDefenseResistPercent,
      combatTotals.fireDefenseResistPercent, combatTotals.iceDefenseResistPercent, combatTotals.thunderDefenseResistPercent, combatTotals.hp,
      combatTotals.meleeAtk, combatTotals.meleeNoA,
      combatTotals.rangedAtk, combatTotals.rangedNoA,
      combatTotals.magicalAtk, combatTotals.magicalNoA,
      combatTotals.meleeAttackAmp, combatTotals.rangedAttackAmp, combatTotals.magicalAttackAmp,
      combatTotals.accuracy, combatTotals.evasion, combatTotals.penet,
      combatTotals.elementalOffense, combatTotals.elementalOffensePercent,
      combatTotals.unlockRaceName, combatTotals.unlockAbilityName, combatTotals.unlockConditionActive,
      onAddStatNotifications, selectedCharacter, selectedPartyIndex]);
  const [pendingEdits, setPendingEdits] = useState<Partial<Character> | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [showBaseStatHelp, setShowBaseStatHelp] = useState(false);
  const [baseStatHelpPosition, setBaseStatHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [activeStatusHelpKey, setActiveStatusHelpKey] = useState<string | null>(null);
  const [activeStatusHelpPosition, setActiveStatusHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [editingDeity, setEditingDeity] = useState(false);
  const [pendingDeityName, setPendingDeityName] = useState(party.deity.name);
  const [lastSlotTap, setLastSlotTap] = useState<{ slot: number; time: number } | null>(null);

  // Handle equipment slot tap with double-tap detection for removal
  const handleSlotTap = (slotIndex: number) => {
    const now = Date.now();
    const item = char.equipment[slotIndex];

    // Check for double-tap on same slot with item
    if (item && lastSlotTap && lastSlotTap.slot === slotIndex && now - lastSlotTap.time < 400) {
      // Double-tap: remove item
      onEquipItem(char.id, slotIndex, null);
      setLastSlotTap(null);
      setSelectingSlot(null);
      return;
    }

    setLastSlotTap({ slot: slotIndex, time: now });

    // Single tap: toggle selection
    setSelectingSlot(selectingSlot === slotIndex ? null : slotIndex);
  };

  const getEquipTargetSlotIndex = (): number | null => {
    if (selectingSlot !== null) return selectingSlot;

    const emptySlotIndex = Array.from({ length: stats.maxEquipSlots })
      .findIndex((_, i) => !char.equipment[i]);

    return emptySlotIndex !== -1 ? emptySlotIndex : null;
  };

  // Handle inventory item tap with auto-equip support
  const handleInventoryItemTap = (itemKey: string) => {
    const targetSlotIndex = getEquipTargetSlotIndex();
    if (targetSlotIndex === null) return;

    onEquipItem(char.id, targetSlotIndex, itemKey);
    if (selectingSlot !== null) {
      setSelectingSlot(null);
    }
  };

  const getRandomDefaultNameForRace = (raceId: RaceId): string => {
    const candidates = POTENTIAL_DEFAULT_NAMES[raceId] ?? [];
    if (candidates.length === 0) return char.name;

    const usedNames = new Set(
      parties
        .flatMap((currentParty) => currentParty.characters)
        .filter((character) => character.id !== char.id)
        .map((character) => character.name)
    );

    const availableCandidates = candidates.filter((candidate) => !usedNames.has(candidate));
    const targetPool = availableCandidates.length > 0 ? availableCandidates : candidates;
    return targetPool[Math.floor(Math.random() * targetPool.length)];
  };

  const handleRaceChange = (raceId: Character['raceId']) => {
    setPendingEdits((prev) => ({
      ...prev,
      raceId,
      name: getRandomDefaultNameForRace(raceId),
    }));
  };


  useEffect(() => {
    if (!editingDeity) {
      setPendingDeityName(party.deity.name);
    }
  }, [party.deity.name, editingDeity]);

  const char = selectedChar;
  const stats = characterStats[selectedCharacter];
  const hpDisplayMultiplier = ((stats.baseStats.vitality + stats.baseStats.mind) / 20) * getCharacterGrowthMultiplier(char);
  const race = RACES.find(r => r.id === char.raceId)!;
  const mainClass = CLASSES.find(c => c.id === char.mainClassId)!;
  const subClass = CLASSES.find(c => c.id === char.subClassId)!;
  const predisposition = PREDISPOSITIONS.find(p => p.id === char.predispositionId)!;
  const lineage = LINEAGES.find(l => l.id === char.lineageId)!;

  const getChangedEditKeys = (edits: Partial<Character> | null): (keyof Character)[] => {
    if (!edits) return [];

    return (Object.keys(edits) as (keyof Character)[]).filter((key) => {
      const nextValue = edits[key];
      if (nextValue === undefined) return false;
      return nextValue !== char[key];
    });
  };

  const getEquipSlotReductionCount = (edits: Partial<Character> | null): number => {
    const changedKeys = getChangedEditKeys(edits);
    if (changedKeys.length === 0) return 0;

    const nextCharacter = { ...char, ...edits };
    const nextStats = computeCharacterStats(nextCharacter, party.level);
    return Math.max(0, stats.maxEquipSlots - nextStats.maxEquipSlots);
  };

  const hasEquippedItemInReducedSlots = (edits: Partial<Character> | null): boolean => {
    const changedKeys = getChangedEditKeys(edits);
    if (changedKeys.length === 0) return false;

    const nextCharacter = { ...char, ...edits };
    const nextStats = computeCharacterStats(nextCharacter, party.level);
    if (nextStats.maxEquipSlots >= stats.maxEquipSlots) return false;

    return char.equipment
      .slice(nextStats.maxEquipSlots, stats.maxEquipSlots)
      .some((item) => item != null);
  };

  const getCapabilityRemovalWarningState = (edits: Partial<Character> | null): { melee: boolean; ranged: boolean; magic: boolean } => {
    const changedKeys = getChangedEditKeys(edits);
    if (changedKeys.length === 0) {
      return { melee: false, ranged: false, magic: false };
    }

    const nextCharacter = { ...char, ...edits };
    const oldCombatBonuses = getCharacterCombatBonusLevels(char);
    const nextCombatBonuses = getCharacterCombatBonusLevels(nextCharacter);
    const lostMeleeAptitude = oldCombatBonuses.grit > 0 && nextCombatBonuses.grit <= 0;
    const lostRangedAptitude = oldCombatBonuses.pursuit > 0 && nextCombatBonuses.pursuit <= 0;
    const lostMagicAptitude = oldCombatBonuses.caster > 0 && nextCombatBonuses.caster <= 0;

    if (!lostMeleeAptitude && !lostRangedAptitude && !lostMagicAptitude) {
      return { melee: false, ranged: false, magic: false };
    }

    const hasMeleeEquipment = lostMeleeAptitude && char.equipment.some((item) => item != null && MELEE_CATEGORIES.has(item.category));
    const hasRangedEquipment = lostRangedAptitude && char.equipment.some((item) => item != null && RANGED_CATEGORIES.has(item.category));
    const hasMagicEquipment = lostMagicAptitude && char.equipment.some((item) => item != null && MAGIC_CATEGORIES.has(item.category));

    return { melee: hasMeleeEquipment, ranged: hasRangedEquipment, magic: hasMagicEquipment };
  };

  const getEditConfirmWarnings = (edits: Partial<Character> | null): string[] => {
    const warnings: string[] = [];
    const equipSlotReductionCount = getEquipSlotReductionCount(edits);
    if (equipSlotReductionCount > 0) {
      warnings.push(`変更を保存すると装備枠が${equipSlotReductionCount}枠減るため、該当分の装備が外れます。`);
    }

    const capabilityWarnings = getCapabilityRemovalWarningState(edits);
    if (capabilityWarnings.melee) {
      warnings.push('近距離攻撃適正がなくなったため、一部の装備が外れます。');
    }
    if (capabilityWarnings.ranged) {
      warnings.push('遠距離攻撃適正がなくなったため、一部の装備が外れます。');
    }
    if (capabilityWarnings.magic) {
      warnings.push('魔法攻撃適正がなくなったため、一部の装備が外れます。');
    }

    return warnings;
  };

  const editConfirmWarnings = getEditConfirmWarnings(pendingEdits);

  const completeCharacterEdit = () => {
    const changedKeys = getChangedEditKeys(pendingEdits);

    if (changedKeys.length === 0) {
      setPendingEdits(null);
      setEditingCharacter(null);
      setShowEditConfirm(false);
      return;
    }

    if (changedKeys.length === 1 && changedKeys[0] === 'name') {
      onUpdateCharacter(char.id, { name: pendingEdits?.name ?? char.name });
      setPendingEdits(null);
      setEditingCharacter(null);
      setShowEditConfirm(false);
      return;
    }

    const equipSlotReductionCount = getEquipSlotReductionCount(pendingEdits);
    const capabilityWarnings = getCapabilityRemovalWarningState(pendingEdits);
    const hasCapabilityRemovals = capabilityWarnings.melee || capabilityWarnings.ranged || capabilityWarnings.magic;
    if (equipSlotReductionCount === 0 && !hasCapabilityRemovals) {
      onUpdateCharacter(char.id, pendingEdits ?? {});
      setPendingEdits(null);
      setEditingCharacter(null);
      setShowEditConfirm(false);
      return;
    }

    if (equipSlotReductionCount > 0 && !hasEquippedItemInReducedSlots(pendingEdits) && !hasCapabilityRemovals) {
      onUpdateCharacter(char.id, pendingEdits ?? {});
      setPendingEdits(null);
      setEditingCharacter(null);
      setShowEditConfirm(false);
      return;
    }

    setShowEditConfirm(true);
  };

  const saveCharacterEditWithEquipmentReset = () => {
    const changedKeys = getChangedEditKeys(pendingEdits);
    if (changedKeys.length > 0 && pendingEdits) {
      onUpdateCharacter(char.id, pendingEdits);
    }

    setPendingEdits(null);
    setEditingCharacter(null);
    setShowEditConfirm(false);
  };

  const baseStatMultiplierRows = [
    { label: '体力', value: stats.baseStats.vitality, note: '物理耐性', ratio: getBaseDefenseScale(stats.baseStats.vitality) },
    { label: '力', value: stats.baseStats.strength, note: '遠距離/近接攻撃倍率', ratio: getBaseOffenseScale(stats.baseStats.strength) },
    { label: '知性', value: stats.baseStats.intelligence, note: '魔法攻撃倍率', ratio: getBaseOffenseScale(stats.baseStats.intelligence) },
    { label: '精神', value: stats.baseStats.mind, note: '魔法耐性', ratio: getBaseDefenseScale(stats.baseStats.mind) },
  ];

  const hpStatMultiplier = (stats.baseStats.vitality + stats.baseStats.mind) / 20;
  const hpGrowthMultiplier = getCharacterGrowthMultiplier(char);
  const hpBaseIncrease = Math.round(party.level * stats.baseStats.vitality * hpStatMultiplier * hpGrowthMultiplier);
  const hpItemIncrease = char.equipment.reduce((total, item) => {
    if (!item?.partyHP) return total;
    const categoryMultiplier = getCharacterCategoryMultiplier(char, item.category);
    const itemMultiplier = getEnhancementAndSuperRareMultiplier(item);
    const baseMultiplier = item.baseMultiplier ?? 1;
    return total + Math.round(item.partyHP * categoryMultiplier * itemMultiplier * baseMultiplier * hpStatMultiplier * hpGrowthMultiplier);
  }, 0);

  const availableCategoryGroups = getAvailableCategoryGroups(char);
  const availableCategories = availableCategoryGroups.flatMap(group => group.categories);

  useEffect(() => {
    if (!availableCategories.includes(equipCategory)) {
      setEquipCategory(availableCategories[0] ?? 'armor');
    }
  }, [availableCategories, equipCategory]);

  useEffect(() => {
    setShowBaseStatHelp(false);
    setBaseStatHelpPosition(null);
    setActiveStatusHelpKey(null);
    setShowBonusHelp(false);
  }, [selectedCharacter, editingCharacter]);

  const normalizedCurrentDeityName = normalizeDeityName((party.deity.name ?? '').trim());
  const xpToNextLevel = party.level < MAX_LEVEL ? Math.ceil(getXpToNextLevel(party.level)) : 0;
  const xpProgressPercent = xpToNextLevel > 0
    ? Math.min(100, Math.round((party.experience / xpToNextLevel) * 100))
    : 100;

  const handleBaseStatHelpToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (showBaseStatHelp) {
      setShowBaseStatHelp(false);
      setBaseStatHelpPosition(null);
      return;
    }

    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(320, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - tooltipWidth,
    );

    setBaseStatHelpPosition({
      top: triggerRect.bottom + 8,
      left,
      width: tooltipWidth,
    });
    setShowBaseStatHelp(true);
  };

  const handleStatusHelpToggle = (key: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(320, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - tooltipWidth,
    );

    setActiveStatusHelpKey((current) => {
      if (current === key) {
        setActiveStatusHelpPosition(null);
        return null;
      }

      setActiveStatusHelpPosition({
        top: triggerRect.bottom + 8,
        left,
        width: tooltipWidth,
      });
      return key;
    });
  };


  return (
    <div
      onPointerDown={() => {
        if (showBonusHelp) {
          setShowBonusHelp(false);
        }
        if (showBaseStatHelp) {
          setShowBaseStatHelp(false);
          setBaseStatHelpPosition(null);
        }
        if (activeStatusHelpKey) {
          setActiveStatusHelpKey(null);
          setActiveStatusHelpPosition(null);
        }
      }}
    >
      {/* Party selector - tab style */}
      <div className="flex mb-4 border-b border-gray-200">
        {[0, 1, 2, 3, 4, 5].map((partyIndex) => {
          const isAvailable = partyIndex < parties.length;
          const isSelected = partyIndex === selectedPartyIndex;
          return (
            <button
              key={partyIndex}
              onClick={() => {
                if (!isAvailable) return;
                onSelectParty(partyIndex);
                setEditingDeity(false);
                setPendingDeityName(parties[partyIndex].deity.name);
              }}
              disabled={!isAvailable}
              className={`flex-1 py-2 text-sm font-medium ${
                isSelected
                  ? 'text-sub border-b-2 border-sub'
                  : isAvailable
                  ? 'text-gray-700 hover:text-gray-900'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              PT{partyIndex + 1}
            </button>
          );
        })}
      </div>

      <div className="mb-3 text-sm flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-gray-600">
            HP {formatNumber(Math.floor(partyStats.hp))}, レベル {formatNumber(party.level)} ({party.level < MAX_LEVEL ? `${formatNumber(xpProgressPercent)}%, ${formatNumber(party.experience)}` : `100%, ${formatNumber(party.experience)}`})
          </div>
          <div className="font-medium mt-1">{party.deity.name} (ランク{getDeityRank(deityDonations[normalizedCurrentDeityName] ?? 0)})</div>
          <div className="text-xs text-gray-600 mt-1">効果:{getDeityEffectDescription(party.deity.name, deityDonations[normalizedCurrentDeityName] ?? 0)}</div>
        </div>
        {editingDeity ? (
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onUpdatePartyDeity(selectedPartyIndex, pendingDeityName);
                  setEditingDeity(false);
                }}
                className="text-sm text-sub border border-sub rounded px-4 py-1.5 min-w-[4.5rem]"
              >
                完了
              </button>
              <button
                onClick={() => {
                  setPendingDeityName(party.deity.name);
                  setEditingDeity(false);
                }}
                className="text-sm text-gray-600 border border-gray-300 rounded px-4 py-1.5 min-w-[4.5rem]"
              >
                取消
              </button>
            </div>
            <select
              value={pendingDeityName}
              onChange={(e) => setPendingDeityName(e.target.value)}
              className="text-sm border rounded px-3 py-1.5"
            >
              {DEITY_OPTIONS.map((deity) => {
                const normalizedName = normalizeDeityName(deity.name);
                const inUseByOtherParty = parties.some((partyCandidate, index) =>
                  index !== selectedPartyIndex && normalizeDeityName(partyCandidate.deity.name) === normalizedName
                );
                return (
                  <option
                    key={deity.key}
                    value={deity.name}
                    disabled={inUseByOtherParty}
                  >
                    {deity.name}
                  </option>
                );
              })}
            </select>
          </div>
        ) : (
          <button
            onClick={() => {
              setPendingDeityName(party.deity.name);
              setEditingDeity(true);
            }}
            className="text-sm text-sub flex-shrink-0"
          >
            編集
          </button>
        )}
      </div>

      {editingDeity && (
        <div className="mb-3 text-xs text-gray-500">
          キャラクターアイコン長押しで隊列変更
        </div>
      )}

      {/* Character selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {party.characters.map((c, i) => {
          const r = RACES.find(r => r.id === c.raceId)!;
          const mc = CLASSES.find(cl => cl.id === c.mainClassId)!;
          const sc = CLASSES.find(cl => cl.id === c.subClassId)!;
          const isMaster = c.mainClassId === c.subClassId;
          const mcShort = CLASS_SHORT_NAMES[mc.id] ?? mc.name;
          const scShort = CLASS_SHORT_NAMES[sc.id] ?? sc.name;
          const predispositionShort = PREDISPOSITION_SHORT_NAMES[c.predispositionId] ?? c.predispositionId;
          const lineageShort = LINEAGE_SHORT_NAMES[c.lineageId] ?? c.lineageId;
          return (
            <button
              key={c.id}
              type="button"
              draggable
              onDragStart={(event) => {
                setDraggingCharacterIndex(i);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(i));
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceIndex = Number(event.dataTransfer.getData('text/plain'));
                reorderCharacter(Number.isNaN(sourceIndex) ? i : sourceIndex, i);
                setDraggingCharacterIndex(null);
              }}
              onDragEnd={() => {
                setDraggingCharacterIndex(null);
              }}
              onTouchStart={() => {
                touchDraggingCharacterIndexRef.current = i;
                setDraggingCharacterIndex(i);
              }}
              onTouchMove={(event) => {
                const touch = event.touches[0];
                if (!touch) return;
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const dropTarget = target?.closest<HTMLButtonElement>('[data-party-character-index]');
                if (!dropTarget) return;
                const toIndex = Number(dropTarget.dataset.partyCharacterIndex);
                const fromIndex = touchDraggingCharacterIndexRef.current;
                if (fromIndex === null || Number.isNaN(toIndex) || fromIndex === toIndex) return;

                reorderCharacter(fromIndex, toIndex);
                touchDraggingCharacterIndexRef.current = toIndex;
                setDraggingCharacterIndex(toIndex);
              }}
              onTouchEnd={() => {
                touchDraggingCharacterIndexRef.current = null;
                setDraggingCharacterIndex(null);
              }}
              onClick={() => { setSelectedCharacter(i); setSelectingSlot(null); }}
              className={`flex-shrink-0 p-2 rounded-lg border ${
                i === selectedCharacter ? 'border-sub bg-blue-50' : 'border-gray-200'
              } ${draggingCharacterIndex === i ? 'opacity-70 border-sub' : ''}`}
              data-party-character-index={i}
            >
              <div className="flex justify-center"><RaceIcon race={r} className="h-8 w-8" /></div>
              <div className="text-xs text-gray-400 text-center">
                {mcShort}({isMaster ? '師' : scShort})
              </div>
              <div className="text-xs text-gray-400 text-center">
                {predispositionShort}/{lineageShort}
              </div>
            </button>
          );
        })}
      </div>

      {/* Character details */}
      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2 gap-2">
          {editingCharacter === selectedCharacter ? (
            <input
              type="text"
              value={pendingEdits?.name ?? char.name}
              onChange={(e) => setPendingEdits({ ...pendingEdits, name: e.target.value })}
              className="text-lg font-bold bg-transparent border-b border-sub focus:outline-none flex-1 min-w-0"
            />
          ) : (
            <span className="text-lg font-bold">{char.name}</span>
          )}
          {editingCharacter === selectedCharacter ? (
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={showEditConfirm ? saveCharacterEditWithEquipmentReset : completeCharacterEdit}
                className="text-sm text-white bg-sub px-3 py-1 rounded whitespace-nowrap"
              >
                {showEditConfirm ? '保存する' : '完了'}
              </button>
              <button
                onClick={() => {
                  if (showEditConfirm) {
                    setShowEditConfirm(false);
                    return;
                  }
                  setPendingEdits(null);
                  setEditingCharacter(null);
                }}
                className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded whitespace-nowrap"
              >
                {showEditConfirm ? '戻る' : '取消'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setPendingEdits({});
                setEditingCharacter(selectedCharacter);
                setShowEditConfirm(false);
              }}
              className="text-sm text-sub"
            >
              編集
            </button>
          )}
        </div>

        {/* Edit confirmation dialog */}
        {editingCharacter === selectedCharacter && showEditConfirm && (
          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
            <ul className="text-sm text-accent space-y-1">
              {editConfirmWarnings.map((warning) => (
                <li key={warning}>⚠️ {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {editingCharacter === selectedCharacter && !showEditConfirm ? (
          <div className="space-y-2 text-sm">
            <div>
              <label className="block text-gray-500">種族</label>
              <div className="mt-2 max-h-40 overflow-y-auto rounded border border-gray-200 bg-white">
                {RACES.map((race) => {
                  const s = race.stats;
                  const bonusText = formatBonuses(getRaceBonusesForSelection(race));
                  const isSelectedRace = (pendingEdits?.raceId ?? char.raceId) === race.id;

                  return (
                    <button
                      key={`race-image-${race.id}`}
                      type="button"
                      onClick={() => handleRaceChange(race.id)}
                      className={`w-full px-2 py-1.5 text-left border-b border-gray-100 last:border-b-0 text-xs ${
                        isSelectedRace ? 'bg-sub/10' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-start gap-2">
                        <RaceIcon race={race} className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          <span className="text-gray-800">{race.name}</span>
                          <span className="text-gray-500"> | 体{s.vitality},力{s.strength},知{s.intelligence},精{s.mind} | {bonusText}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-gray-500">メインクラス</label>
              <select
                value={pendingEdits?.mainClassId ?? char.mainClassId}
                onChange={(e) => setPendingEdits({ ...pendingEdits, mainClassId: e.target.value as Character['mainClassId'] })}
                className="w-full p-1 border rounded text-xs"
              >
                {CLASSES.map(c => {
                  const currentSubId = pendingEdits?.subClassId ?? char.subClassId;
                  const isMaster = c.id === currentSubId;
                  const mainBonus = isMaster ? formatBonuses(c.masterBonuses as Bonus[]) : formatBonuses(c.mainBonuses as Bonus[]);
                  const mainSubBonus = formatBonuses(c.mainSubBonuses as Bonus[]);
                  const bonusText = [mainSubBonus, mainBonus].filter(Boolean).join(', ');
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name}{isMaster ? '(師範)' : ''} | {bonusText}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-gray-500">サブクラス</label>
              <select
                value={pendingEdits?.subClassId ?? char.subClassId}
                onChange={(e) => setPendingEdits({ ...pendingEdits, subClassId: e.target.value as Character['subClassId'] })}
                className="w-full p-1 border rounded text-xs"
              >
                {CLASSES.map(c => {
                  const mainSubBonus = formatBonuses(c.mainSubBonuses as Bonus[]);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} | {mainSubBonus}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-gray-500">性格</label>
              <select
                value={pendingEdits?.predispositionId ?? char.predispositionId}
                onChange={(e) => setPendingEdits({ ...pendingEdits, predispositionId: e.target.value as Character['predispositionId'] })}
                className="w-full p-1 border rounded text-xs"
              >
                {PREDISPOSITIONS.map(p => {
                  const bonusText = formatBonuses(p.bonuses as Bonus[]);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} | {bonusText}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-gray-500">家系</label>
              <select
                value={pendingEdits?.lineageId ?? char.lineageId}
                onChange={(e) => setPendingEdits({ ...pendingEdits, lineageId: e.target.value as Character['lineageId'] })}
                className="w-full p-1 border rounded text-xs"
              >
                {LINEAGES.map(l => {
                  const bonusText = formatBonuses(l.bonuses as Bonus[]);
                  return (
                    <option key={l.id} value={l.id}>
                      {l.name} | {bonusText}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="text-gray-500 relative inline-flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <RaceIcon race={race} className="h-4 w-4" />
                <span>{race.name} / {mainClass.name}({char.mainClassId === char.subClassId ? '師範' : subClass.name}) / {predisposition.name} / {lineage.name}</span>
              </span>
              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleBaseStatHelpToggle}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] leading-none text-gray-600 hover:bg-gray-100"
                aria-label="基礎値ヘルプ"
              >
                ?
              </button>
              {showBaseStatHelp && (
                <div
                  className="fixed z-20 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs text-gray-700 space-y-2"
                  style={baseStatHelpPosition ?? undefined}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <div className="font-medium text-gray-900">現在の基礎値とその補正解説:</div>
                  <div className="space-y-1">
                    {baseStatMultiplierRows.map((row) => (
                      <div key={row.label}>
                        {row.label}: {formatNumber(row.value)} ({row.note} x{row.ratio.toFixed(2)})
                      </div>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-gray-100 space-y-1">
                    <div>HP増加基礎値: +{formatNumber(Math.floor(hpBaseIncrease))}</div>
                    <div>アイテムHP増加値: +{formatNumber(Math.floor(hpItemIncrease))}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1 mt-1 text-xs">
              <div className="bg-white rounded p-1 text-center">体力:{stats.baseStats.vitality}</div>
              <div className="bg-white rounded p-1 text-center">力:{stats.baseStats.strength}</div>
              <div className="bg-white rounded p-1 text-center">知性:{stats.baseStats.intelligence}</div>
              <div className="bg-white rounded p-1 text-center">精神:{stats.baseStats.mind}</div>
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2 text-sm">
              {(() => {
                // Calculate offense amplifiers per phase
                const iaigiri = stats.abilities.find(a => a.id === 'iaigiri');
                const iaigiriMultiplier = iaigiri ? (iaigiri.level >= 3 ? 3.0 : iaigiri.level >= 2 ? 2.5 : 2.0) : 1.0;
                const strengthScale = getBaseOffenseScale(stats.baseStats.strength);
                const intelligenceScale = getBaseOffenseScale(stats.baseStats.intelligence);
                const hasRanged = stats.rangedAttack > 0 || stats.rangedNoA > 0;
                const hasMagical = stats.magicalAttack > 0 || stats.magicalNoA > 0;
                const hasMelee = stats.meleeAttack > 0 || stats.meleeNoA > 0;
                const equippedItems = char.equipment.filter((item): item is Item => item != null);
                const baseAppliedOffenseBonusNames = stats.offenseCBonusNames;
                const baseMultMelee = stats.meleeAttackCBonus + getOffenseMultiplierSum(
                  equippedItems,
                  'melee',
                  baseAppliedOffenseBonusNames
                );
                const baseMultRanged = stats.rangedAttackCBonus + getOffenseMultiplierSum(
                  equippedItems,
                  'ranged',
                  baseAppliedOffenseBonusNames
                );
                const baseMultMagical = stats.magicalAttackCBonus + getOffenseMultiplierSum(
                  equippedItems,
                  'magical',
                  baseAppliedOffenseBonusNames
                );

                type StatusLine = {
                  key: string;
                  text: string;
                  helpTitle?: string;
                  helpLines?: string[];
                };

                // Build offense lines
                const offenseLines: StatusLine[] = [];
                if (hasRanged) {
                  const amp = ((iaigiri
                    ? iaigiriMultiplier * (1.0 + baseMultRanged) * stats.physicalOffenseMultiplier
                    : (1.0 + baseMultRanged + stats.physicalAttackCBonus) * stats.physicalOffenseMultiplier
                  ) + stats.deityOffenseAmplifierBonus) * strengthScale;
                  offenseLines.push({
                    key: 'ranged-attack',
                    text: `遠距離攻撃:${formatNumber(Math.floor(stats.rangedAttack))} x ${formatNumber(stats.rangedNoA)}回(x${amp.toFixed(2)})`,
                    helpTitle: '遠距離攻撃',
                    helpLines: [
                      `遠距離攻撃力: ${formatNumber(Math.floor(stats.rangedAttack))} ※ダメージを与えるには敵の物理防御力を超える必要があります`,
                      `遠距離攻撃回数: ${formatNumber(stats.rangedNoA)}回`,
                      `遠距離攻撃倍率: x${amp.toFixed(2)} ※値が大きいほどダメージが大きくなります`,
                    ],
                  });
                }
                if (hasMagical) {
                  const amp = ((1.0 + baseMultMagical) * stats.magicalOffenseMultiplier + stats.deityOffenseAmplifierBonus) * intelligenceScale;
                  offenseLines.push({
                    key: 'magical-attack',
                    text: `魔法攻撃:${formatNumber(Math.floor(stats.magicalAttack))} x ${formatNumber(stats.magicalNoA)}回(x${amp.toFixed(2)})`,
                    helpTitle: '魔法攻撃',
                    helpLines: [
                      `魔法攻撃力: ${formatNumber(Math.floor(stats.magicalAttack))} ※ダメージを与えるには敵の魔法防御力を超える必要があります`,
                      `魔法攻撃回数: ${formatNumber(stats.magicalNoA)}回`,
                      `魔法攻撃倍率: x${amp.toFixed(2)} ※値が大きいほどダメージが大きくなります`,
                    ],
                  });
                }
                if (hasMelee) {
                  const amp = ((iaigiri
                    ? iaigiriMultiplier * (1.0 + baseMultMelee) * stats.physicalOffenseMultiplier
                    : (1.0 + baseMultMelee + stats.physicalAttackCBonus) * stats.physicalOffenseMultiplier
                  ) + stats.deityOffenseAmplifierBonus) * strengthScale;
                  offenseLines.push({
                    key: 'melee-attack',
                    text: `近接攻撃:${formatNumber(Math.floor(stats.meleeAttack))} x ${formatNumber(stats.meleeNoA)}回(x${amp.toFixed(2)})`,
                    helpTitle: '近接攻撃',
                    helpLines: [
                      `近接攻撃力: ${formatNumber(Math.floor(stats.meleeAttack))} ※ダメージを与えるには敵の物理防御力を超える必要があります`,
                      `近接攻撃回数: ${formatNumber(stats.meleeNoA)}回`,
                      `近接攻撃倍率: x${amp.toFixed(2)} ※値が大きいほどダメージが大きくなります`,
                    ],
                  });
                }

                const baseDecay = 0.90 + getEffectiveAccuracyBonus(stats.accuracyBonus, stats.abilities);
                const decayText = baseDecay.toFixed(3);
                const hasPhysicalAttacks = stats.rangedNoA > 0 || stats.meleeNoA > 0;
                if (hasPhysicalAttacks) {
                  offenseLines.push({
                    key: 'physical-accuracy',
                    text: `物理命中率: ${Math.round(stats.accuracyPotency * 100)}% (減衰: x${decayText})`,
                    helpTitle: '物理命中率',
                    helpLines: [
                      `物理命中率: ${Math.round(stats.accuracyPotency * 100)}% ※初回の命中率`,
                      `命中減衰率: x${decayText} ※2回目以降の命中率にはこの値が掛かります`,
                    ],
                  });
                }
                if (hasMagical) {
                  offenseLines.push({
                    key: 'magical-accuracy',
                    text: `魔法命中率: 100% (減衰: x${decayText})`,
                    helpTitle: '魔法命中率',
                    helpLines: [
                      '魔法命中率: 100% ※初回の命中率',
                      `命中減衰率: x${decayText} ※2回目以降の命中率にはこの値が掛かります`,
                    ],
                  });
                }

                // Defense lines
                const defenseAmpPhysical = Math.max(0.01, stats.physicalDefenseAmplifier + stats.deityDefenseAmplifierBonus.physical);
                const defenseAmpMagical = Math.max(0.01, stats.magicalDefenseAmplifier + stats.deityDefenseAmplifierBonus.magical);
                const elementName = stats.elementalOffense === 'fire' ? '🔥' :
                  stats.elementalOffense === 'thunder' ? '⚡' :
                  stats.elementalOffense === 'ice' ? '❄️' : '無';

                const defenseLines: StatusLine[] = [
                  {
                    key: 'element',
                    text: `属性:${elementName}(x${stats.elementalOffenseValue.toFixed(2)})`,
                    helpTitle: 'e. 属性攻撃(重複有効)',
                    helpLines: getElementalOffenseHelpLines(char, stats),
                  },
                  {
                    key: 'physical-defense',
                    text: `物防:${formatNumber(stats.physicalDefense)} (${formatNumber(Math.round(defenseAmpPhysical * 100))}%)`,
                    helpTitle: '物理防御',
                    helpLines: [
                      `物理防御力: ${formatNumber(stats.physicalDefense)} ※敵の遠距離/近接攻撃力を超える物理防御力を持つとダメージをほぼ受けなくなります`,
                      `物理耐性: ${formatNumber(Math.round(defenseAmpPhysical * 100))}% ※耐性%が低いほど攻撃に強くなります`,
                    ],
                  },
                  {
                    key: 'magical-defense',
                    text: `魔防:${formatNumber(stats.magicalDefense)} (${formatNumber(Math.round(defenseAmpMagical * 100))}%)`,
                    helpTitle: '魔法防御',
                    helpLines: [
                      `魔法防御力: ${formatNumber(stats.magicalDefense)} ※敵の魔法攻撃力を超える魔法防御力を持つとダメージをほぼ受けなくなります`,
                      `魔法耐性: ${formatNumber(Math.round(defenseAmpMagical * 100))}% ※耐性%が低いほど攻撃に強くなります`,
                    ],
                  },
                  {
                    key: 'evasion',
                    text: `回避:${stats.evasionBonus >= 0 ? '+' : ''}${formatNumber(Math.round(stats.evasionBonus * 1000))}`,
                    helpTitle: '回避',
                    helpLines: [
                      `回避: ${stats.evasionBonus >= 0 ? '+' : ''}${formatNumber(Math.round(stats.evasionBonus * 1000))}`,
                      '※敵の命中減衰率を値分、減少させます(攻撃回数が多いほど回避しやすくなります)',
                    ],
                  },
                  {
                    key: 'penetration',
                    text: `貫通:+${formatNumber(Math.round(stats.penetMultiplier * 100))}%`,
                    helpTitle: '貫通',
                    helpLines: [
                      `貫通: +${formatNumber(Math.round(stats.penetMultiplier * 100))}%`,
                      `敵の防御力を ${Math.round(stats.penetMultiplier * 100)}% 分無視する`,
                    ],
                  },
                ];

                // Pad offense lines to match defense lines count
                while (offenseLines.length < defenseLines.length) {
                  offenseLines.push({ key: `offense-blank-${offenseLines.length}`, text: '', helpTitle: '', helpLines: [] });
                }

                return (
                  <div className="text-xs space-y-1">
                    {offenseLines.map((offense, i) => (
                      <div key={`${offense.key}-${defenseLines[i]?.key ?? i}`} className="flex justify-between gap-2">
                        <div className="relative">
                          {offense.text ? (
                            <button
                              type="button"
                              onPointerDown={(event) => event.stopPropagation()}
                              onClick={(event) => handleStatusHelpToggle(offense.key, event)}
                              className="text-left"
                            >
                              {offense.text}
                            </button>
                          ) : (
                            <span>{offense.text}</span>
                          )}
                          {offense.text && activeStatusHelpKey === offense.key && (
                            <div
                              className="fixed z-20 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs text-gray-700 space-y-1"
                              style={activeStatusHelpPosition ?? undefined}
                              onPointerDown={(event) => event.stopPropagation()}
                            >
                              <div className="font-semibold text-gray-800">{offense.helpTitle}</div>
                              {(offense.helpLines ?? []).map((line) => (
                                <div key={`${offense.key}-${line}`}>{line}</div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="relative text-gray-500">
                          {defenseLines[i]?.helpLines?.length ? (
                            <>
                              <button
                                type="button"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  const defense = defenseLines[i];
                                  if (!defense) return;
                                  handleStatusHelpToggle(defense.key, event);
                                }}
                                className="text-left"
                              >
                                {defenseLines[i]?.text}
                              </button>
                              {defenseLines[i] && activeStatusHelpKey === defenseLines[i].key && (
                                <div
                                  className="fixed z-20 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-xs text-gray-700 space-y-1"
                                  style={activeStatusHelpPosition ?? undefined}
                                  onPointerDown={(event) => event.stopPropagation()}
                                >
                                  <div className="font-semibold text-gray-800">{defenseLines[i].helpTitle}</div>
                                  {(defenseLines[i].helpLines ?? []).map((line) => (
                                    <div key={`${defenseLines[i].key}-${line}`}>{line}</div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <span>{defenseLines[i]?.text}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            {/* Bonuses */}
            {(() => {
              const isMasterClass = char.mainClassId === char.subClassId;
              const equippedItems = char.equipment
                .slice(0, stats.maxEquipSlots)
                .filter((item): item is Item => item != null);
              const allBonuses = [
                ...race.bonuses,
                ...mainClass.mainSubBonuses,
                ...(isMasterClass ? mainClass.masterBonuses : [...mainClass.mainBonuses, ...subClass.mainSubBonuses]),
                ...predisposition.bonuses,
                ...lineage.bonuses,
                ...equippedItems.flatMap((item) => getSuperRareBonuses(item.superRare)),
              ];

              // Aggregate bonuses - deduplicate multipliers by value before multiplying
              const multiplierValues: Record<string, Set<number>> = {};
              const additive: Record<string, number> = {};
              const uniqueCAdditiveBonusNames = new Set<string>();
              const uniqueEvasionBonusNames = new Set<string>();
              const formatCBonusValue = (value: number): string => (Math.round(value * 1000000) / 1000000).toString();

              const addUniqueCBonus = (type: string, value: number) => {
                const bonusName = `c.${type}+${formatCBonusValue(value)}`;
                if (uniqueCAdditiveBonusNames.has(bonusName)) return;
                uniqueCAdditiveBonusNames.add(bonusName);
                additive[type] = (additive[type] ?? 0) + value;
              };

              for (const b of allBonuses) {
                if (b.type.endsWith('_multiplier')) {
                  const key = b.type.replace('_multiplier', '');
                  if (!multiplierValues[key]) multiplierValues[key] = new Set();
                  multiplierValues[key].add(b.value);
                } else if (['physical_offense_multiplier_xV', 'magical_offense_multiplier_xV', 'physical_defense_multiplier_xV', 'magical_defense_multiplier_xV', 'fire_defense_multiplier_xV', 'ice_defense_multiplier_xV', 'thunder_defense_multiplier_xV'].includes(b.type)) {
                  if (!multiplierValues[b.type]) multiplierValues[b.type] = new Set();
                  multiplierValues[b.type].add(b.value);
                } else if (['vitality', 'strength', 'intelligence', 'mind'].includes(b.type)) {
                  additive[b.type] = (additive[b.type] ?? 0) + b.value;
                } else if (['equip_slot', 'grit', 'caster', 'pursuit', 'penet', 'accuracy', 'growth_xV', 'upgrade_V', 'melee_attack', 'ranged_attack', 'magical_attack', 'physical_attack', 'physical_defense', 'magical_defense', 'antagonism'].includes(b.type)) {
                  addUniqueCBonus(b.type, b.value);
                } else if (b.type === 'evasion') {
                    if (b.value < 0) {
                      additive[b.type] = (additive[b.type] ?? 0) + b.value;
                    } else {
                      const bonusName = `c.evasion+${formatCBonusValue(b.value)}`;
                      if (!uniqueEvasionBonusNames.has(bonusName)) {
                        uniqueEvasionBonusNames.add(bonusName);
                        additive[b.type] = (additive[b.type] ?? 0) + b.value;
                      }
                    }
                }
              }

              // Calculate multipliers from unique values
              const multipliers: Record<string, number> = {};
              for (const [key, values] of Object.entries(multiplierValues)) {
                multipliers[key] = Array.from(values).reduce((prod, v) => prod * v, 1);
              }

              const seekerBaseLevel = allBonuses
                .filter((b) => b.type === 'ability' && b.abilityId === 'seeker')
                .reduce((max, b) => Math.max(max, b.abilityLevel ?? 1), 0);
              const appliedSeekerUpgradeNames = new Set<string>();
              const seekerUpgradeLevel = allBonuses
                .filter((b) => b.type === 'ability_upgrade' && b.abilityId === 'seeker')
                .reduce((sum, b) => {
                  const bonusName = `c.upgrade_seeker+${formatCBonusValue(b.value)}`;
                  if (appliedSeekerUpgradeNames.has(bonusName)) return sum;
                  appliedSeekerUpgradeNames.add(bonusName);
                  return sum + b.value;
                }, 0);
              const seekerAbilityLevel = seekerBaseLevel > 0
                ? seekerBaseLevel + seekerUpgradeLevel
                : seekerBaseLevel;
              const seekerPerLevelBonus = seekerAbilityLevel >= 2 ? 0.0035 : seekerAbilityLevel >= 1 ? 0.0025 : 0;
              const seekerMultiplier = seekerAbilityLevel > 0 ? 1 + (party.level * seekerPerLevelBonus) : 1;

              // Format display
              const parts: string[] = [];
              const helpRows: Array<{ label: string; description: string }> = [];
              const mulNames: Record<string, string> = {
                sword: '剣', katana: '刀', archery: '弓', armor: '鎧',
                gauntlet: '手', wand: '杖', robe: '衣', shield: '盾',
                bolt: 'ボ', grimoire: '書', catalyst: '媒', arrow: '矢',
                physical_offense_multiplier_xV: '物攻撃', magical_offense_multiplier_xV: '魔攻撃',
                physical_defense_multiplier_xV: '物防', magical_defense_multiplier_xV: '魔防',
                fire_defense_multiplier_xV: '炎防', ice_defense_multiplier_xV: '氷防', thunder_defense_multiplier_xV: '雷防'
              };
              const addNames: Record<string, string> = {
                vitality: '体', strength: '力', intelligence: '知', mind: '精',
                equip_slot: '装備', grit: '根性', caster: '術者', penet: '貫通',
                pursuit: '追撃', accuracy: '命中', evasion: '回避', growth_xV: '成長', upgrade_V: 'V強化', antagonism: '⚠️敵対',
                melee_attack: '近攻撃', ranged_attack: '遠攻撃', magical_attack: '魔攻撃', physical_attack: '物攻撃',
                physical_defense: '物防', magical_defense: '魔防' 
              };

              for (const [key, val] of Object.entries(multipliers)) {
                if (val !== 1) {
                  const effectiveMultiplier = key === 'grimoire' ? val * seekerMultiplier : val;
                  const formattedMultiplier = key === 'grimoire'
                    ? effectiveMultiplier.toFixed(2)
                    : effectiveMultiplier.toFixed(1);
                  const label = `${mulNames[key] ?? key}x${formattedMultiplier}`;
                  parts.push(label);
                  const template = C_MULTIPLIER_HELP_DESCRIPTIONS[key];
                  if (template) {
                    helpRows.push({
                      label,
                      description: template.replace('{value}', formattedMultiplier),
                    });
                  }
                }
              }
              for (const [key, val] of Object.entries(additive)) {
                if (val !== 0) {
                  if (key === 'melee_attack' || key === 'ranged_attack' || key === 'magical_attack' || key === 'physical_attack') {
                    const label = `${addNames[key]}+${Math.round(val * 100)}%`;
                    parts.push(label);
                      if (key === 'melee_attack') helpRows.push({ label, description: '近接攻撃の攻撃倍率が上昇する' });
                    if (key === 'ranged_attack') helpRows.push({ label, description: '遠距離攻撃の攻撃倍率が上昇する' });
                    if (key === 'magical_attack') helpRows.push({ label, description: '魔法攻撃の攻撃倍率が上昇する' });
                    if (key === 'physical_attack') helpRows.push({ label, description: '遠距離攻撃・近接攻撃の攻撃倍率が上昇する' });
                  } else if (key === 'physical_defense' || key === 'magical_defense') {
                    const label = `${addNames[key]}+${Math.round(val * 100)}%`;
                    parts.push(label);
                    if (key === 'physical_defense') helpRows.push({ label, description: '物理耐性を強化する' });
                    if (key === 'magical_defense') helpRows.push({ label, description: '魔法耐性を強化する' });
                  } else if (key === 'penet') {
                    const label = `${addNames[key]}+${Math.round(val * 100)}`;
                    parts.push(label);
                    helpRows.push({ label, description: `敵の防御力を ${Math.round(val * 100)}% 分無視する` });
                  } else if (key === 'accuracy') {
                    const label = `${addNames[key]}+${Math.round(val * 1000)}`;
                    parts.push(label);
                    helpRows.push({ label, description: '値が多いほどより多くの攻撃が命中するようになる' });
                  } else if (key === 'evasion') {
                    const label = `${addNames[key]}+${Math.round(val * 1000)}`;
                    parts.push(label);
                    helpRows.push({ label, description: '値が多いほどより多くの攻撃を回避するようになる' });
                  } else if (key === 'growth_xV') {
                    const label = `${addNames[key] ?? key}${formatMultiplierValue(val)}倍`;
                    parts.push(label);
                    helpRows.push({ label, description: `キャラクター個人のHP基礎値及びアイテムHP増加値が ${formatMultiplierValue(val)} 倍になる` });
                  } else {
                    const label = `${addNames[key] ?? key}+${val}`;
                    parts.push(label);
                    if (key === 'equip_slot') helpRows.push({ label, description: `装備スロット数が ${val} 増える` });
                    if (key === 'grit') helpRows.push({ label, description: `近接攻撃の装備が出来るようになる。近接攻撃回数が ${val} 回増える` });
                    if (key === 'pursuit') helpRows.push({ label, description: `遠距離攻撃の装備が出来るようになる。遠距離攻撃回数が ${val} 回増える` });
                    if (key === 'caster') helpRows.push({ label, description: `魔法攻撃の装備が出来るようになる。魔法攻撃回数が ${val} 回増える` });
                    if (key === 'upgrade_V') helpRows.push({ label, description: `アビリティが ${val} 段階強化する` });
                    if (key === 'antagonism') helpRows.push({ label: addNames[key], description: '味方を攻撃するようになる' });
                  }
                }
              }

              const bHelpRows = [
                {
                  key: 'vitality',
                  short: '体',
                  description: '基礎体力に {value} を加算（HP/物防に影響）',
                },
                {
                  key: 'strength',
                  short: '力',
                  description: '基礎筋力に {value} を加算（近接火力に影響）',
                },
                {
                  key: 'intelligence',
                  short: '知',
                  description: '基礎知性に {value} を加算（魔法火力に影響）',
                },
                {
                  key: 'mind',
                  short: '精',
                  description: '基礎精神に {value} を加算（HP/魔防に影響）',
                },
              ]
                .map((row) => {
                  const value = additive[row.key as keyof typeof additive];
                  if (!value) return null;
                  return {
                    label: `${row.short}+${value}`,
                    description: row.description.replace('{value}', `${value}`),
                  };
                })
                .filter((row): row is { label: string; description: string } => row !== null);

              if (parts.length === 0) return null;
              return (
                <div className="text-xs text-gray-600 mt-1 relative leading-5">
                  <div className="inline-flex items-start gap-1">
                    <span className="break-words leading-5">ボーナス: {parts.join(', ')}</span>
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowBonusHelp((prev) => !prev);
                      }}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 text-[10px] leading-none text-gray-600 hover:bg-gray-100"
                      aria-label="c.ボーナスの説明を表示"
                    >
                      ?
                    </button>
                  </div>
                  {showBonusHelp && (
                    <div
                      onPointerDown={(event) => event.stopPropagation()}
                      className="absolute left-0 top-5 z-20 w-[min(38rem,88vw)] rounded-md border border-gray-200 bg-white p-3 shadow-lg"
                    >
                      <div className="mb-2 text-[11px] font-semibold text-gray-700">c. ボーナス説明 (同一名ボーナスは重複無効)</div>
                      <div className="max-h-56 space-y-1 overflow-y-auto pr-1 text-[11px] leading-4 text-gray-700">
                        {helpRows.map((row) => (
                          <div key={row.label}>
                            <span className="font-bold">{row.label}</span>
                            <span className="text-gray-500"> - {row.description}</span>
                          </div>
                        ))}
                      </div>
                      {bHelpRows.length > 0 && (
                        <div className="mb-2 rounded border border-gray-100 bg-gray-50 px-2 py-1 text-[11px] leading-4 text-gray-700">
                          <div className="font-semibold text-gray-700">b. ボーナス説明 (重複有効)</div>
                          {bHelpRows.map((row) => (
                            <div key={row.label}>
                              <span className="font-bold">{row.label}</span>
                              <span className="text-gray-500"> - {row.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
            {stats.abilities.length > 0 && (
              <div className="border-t border-gray-200 mt-2 pt-2">
                <div className="text-gray-500 text-xs">アビリティ:</div>
                {stats.abilities.map(a => (
                  <div key={a.id} className="text-xs text-sub">{a.name}: {a.description}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Equipment section */}
      <div className="bg-pane rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">装備</span>
          <span className="text-xs text-gray-500">
            {formatNumber(char.equipment.filter(e => e).length)} / {formatNumber(stats.maxEquipSlots)} スロット
          </span>
        </div>
      <div className="space-y-2">
        {(() => {
          // Build sorted list of equipment slots
          const slots = Array.from({ length: stats.maxEquipSlots }).map((_, i) => ({
            slotIndex: i,
            item: char.equipment[i],
          }));
            // Sort by category priority, then item ID, super rare, enhancement
            slots.sort((a, b) => {
              if (!a.item && !b.item) return a.slotIndex - b.slotIndex;
              if (!a.item) return 1;
              if (!b.item) return -1;
              const catA = CATEGORY_PRIORITY[a.item.category] ?? 99;
              const catB = CATEGORY_PRIORITY[b.item.category] ?? 99;
              if (catA !== catB) return catA - catB;
              if (a.item.id !== b.item.id) return b.item.id - a.item.id;
              if (a.item.superRare !== b.item.superRare) return b.item.superRare - a.item.superRare;
              return b.item.enhancement - a.item.enhancement;
            });
            return slots.map(({ slotIndex, item }) => (
              <button
                key={slotIndex}
                onClick={() => handleSlotTap(slotIndex)}
                className={`w-full p-2 text-left border rounded text-sm bg-white ${
                  selectingSlot === slotIndex ? 'border-sub' : 'border-gray-200'
                }`}
              >
                {item ? (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="font-medium">{getItemDisplayName(item)}</span>
                      <span className="text-xs text-gray-500"> {getRarityShortLabel(item.id, item.name)} {renderTextWithRaceIcons(getItemStats(item, getCharacterCategoryMultiplier(char, item.category), hpDisplayMultiplier))}</span>
                    </span>
                    <span className="text-xs text-gray-400">
                      [{CATEGORY_NAMES[item.category]}]
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-400">空きスロット</span>
                )}
              </button>
            ));
          })()}
        </div>
      </div>

      {/* Inventory Pane - Always visible */}
      {(() => {
        const hasEmptySlot = Array.from({ length: stats.maxEquipSlots }).some((_, i) => !char.equipment[i]);

        // Build combined list: inventory items + equipped items on current character
        type DisplayItem = {
          key: string;
          item: Item;
          count: number;
          isEquipped: boolean;
          slotIndex?: number;
        };

        const displayItems: DisplayItem[] = [];

        // Add equipped items for current character
        char.equipment.forEach((item, slotIndex) => {
          if (item && item.category === equipCategory) {
            displayItems.push({
              key: `equipped-${slotIndex}`,
              item,
              count: 1,
              isEquipped: true,
              slotIndex,
            });
          }
        });

        // Add inventory items (subtract equipped count for display)
        Object.entries(inventory)
          .filter(([, v]) => v.status === 'owned' && v.count > 0 && v.item.category === equipCategory)
          .forEach(([key, variant]) => {
            displayItems.push({
              key,
              item: variant.item,
              count: variant.count,
              isEquipped: false,
            });
          });

        // Sort by priority: Item ID (desc), SuperRare (desc), Enhancement (desc), equipped items BELOW normal items
        displayItems.sort((a, b) => {
          if (a.item.id !== b.item.id) return b.item.id - a.item.id;
          if (a.item.superRare !== b.item.superRare) return b.item.superRare - a.item.superRare;
          if (a.item.enhancement !== b.item.enhancement) return b.item.enhancement - a.item.enhancement;
          // Normal inventory items first, equipped items below
          if (a.isEquipped !== b.isEquipped) return a.isEquipped ? 1 : -1;
          return 0;
        });

        const handleItemTap = (displayItem: DisplayItem) => {
          if (displayItem.isEquipped && displayItem.slotIndex !== undefined) {
            // Unequip: single tap on equipped item
            onEquipItem(char.id, displayItem.slotIndex, null);
          } else {
            // Equip: use existing logic
            handleInventoryItemTap(displayItem.key);
          }
        };

        const applyProjectedDefenseToStatsText = (displayItem: DisplayItem, statsText: string): string => {
          const currentPhysicalDefense = Math.round(stats.physicalDefense);
          const currentMagicalDefense = Math.round(stats.magicalDefense);

          let targetSlotIndex: number | null = null;
          let targetItem: Item | null = null;

          if (displayItem.isEquipped && displayItem.slotIndex !== undefined) {
            targetSlotIndex = displayItem.slotIndex;
            targetItem = null;
          } else {
            targetSlotIndex = getEquipTargetSlotIndex();
            targetItem = targetSlotIndex !== null ? displayItem.item : null;
          }

          if (targetSlotIndex === null) return statsText;

          const nextCharacter = replaceCharacterEquipment(char, targetSlotIndex, targetItem);
          const nextStats = computeCharacterStats(nextCharacter, party.level);
          const nextPhysicalDefense = Math.round(nextStats.physicalDefense);
          const nextMagicalDefense = Math.round(nextStats.magicalDefense);
          const physicalDefenseDelta = nextPhysicalDefense - currentPhysicalDefense;
          const magicalDefenseDelta = nextMagicalDefense - currentMagicalDefense;
          const displaySignMultiplier = displayItem.isEquipped ? -1 : 1;
          const displayedPhysicalDefenseDelta = physicalDefenseDelta * displaySignMultiplier;
          const displayedMagicalDefenseDelta = magicalDefenseDelta * displaySignMultiplier;

          if (physicalDefenseDelta === 0 && magicalDefenseDelta === 0) return statsText;

          let nextStatsText = statsText;
          if (displayedPhysicalDefenseDelta !== 0) {
            nextStatsText = nextStatsText.replace(/物防\+[\d,]+/, `物防${displayedPhysicalDefenseDelta >= 0 ? '+' : ''}${formatNumber(displayedPhysicalDefenseDelta)}`);
          }
          if (displayedMagicalDefenseDelta !== 0) {
            nextStatsText = nextStatsText.replace(/魔防\+[\d,]+/, `魔防${displayedMagicalDefenseDelta >= 0 ? '+' : ''}${formatNumber(displayedMagicalDefenseDelta)}`);
          }
          return nextStatsText;
        };

        const filteredDisplayItems = displayItems.filter(displayItem =>
          matchesRarityFilter(displayItem.item.id, partyRarityFilter) &&
          (!partySuperRareOnly || displayItem.item.superRare >= 1)
        );

        return (
          <div className={`mt-4 border rounded-lg p-4 ${selectingSlot !== null ? 'border-sub bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="mb-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {selectingSlot !== null
                    ? `スロット ${selectingSlot + 1} に装備`
                    : hasEmptySlot
                      ? 'タップで装備/解除'
                      : 'スロットを選択してください'}
                </span>
                {selectingSlot !== null && (
                  <div className="flex gap-2">
                    {char.equipment[selectingSlot] && (
                      <button
                        onClick={() => { onEquipItem(char.id, selectingSlot, null); setSelectingSlot(null); }}
                        className="text-xs text-accent px-2 py-1 border border-orange-300 rounded bg-white"
                      >
                        外す
                      </button>
                    )}
                    <button
                      onClick={() => setSelectingSlot(null)}
                      className="text-xs text-gray-500 px-2 py-1 border border-gray-300 rounded bg-white"
                    >
                      解除
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-1 flex justify-end items-center gap-1">
                <span className="text-xs text-gray-500">{RARITY_FILTER_NOTES[partyRarityFilter]}</span>
                {RARITY_FILTER_OPTIONS.map(filter => (
                  <button
                    key={filter}
                    onClick={() => setPartyRarityFilter(filter)}
                    className={`text-xs px-1.5 py-0.5 border rounded ${
                      partyRarityFilter === filter
                        ? 'bg-sub text-white border-sub'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                    title={RARITY_FILTER_NOTES[filter]}
                  >
                    {RARITY_FILTER_LABELS[filter]}
                  </button>
                ))}
                <span className="text-xs text-gray-500"> 超レア</span>
                <button
                  onClick={() => setPartySuperRareOnly(prev => !prev)}
                  className={`text-xs px-1.5 py-0.5 border rounded ${
                    partySuperRareOnly
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {partySuperRareOnly ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
            {/* Category group tabs */}
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {availableCategoryGroups.map(group => (
                <div key={group.id} className="flex flex-col">
                  <div className="text-xs text-gray-400 text-center mb-0.5">{group.label}</div>
                  <div className="flex">
                    {group.categories.map((cat, i) => (
                      <button
                        key={cat}
                        onClick={() => setEquipCategory(cat)}
                        className={`px-2 py-1 text-xs ${
                          i === 0 ? 'rounded-l' : i === group.categories.length - 1 ? 'rounded-r' : ''
                        } ${
                          equipCategory === cat
                            ? 'bg-sub text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        {CATEGORY_SHORT_NAMES[cat]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1 min-h-[320px] max-h-96 overflow-y-auto">
              {filteredDisplayItems.map((displayItem) => (
                <button
                  key={displayItem.key}
                  onClick={() => handleItemTap(displayItem)}
                  disabled={!displayItem.isEquipped && selectingSlot === null && !hasEmptySlot}
                  className={`w-full p-2 text-left text-sm border rounded bg-white ${
                    displayItem.isEquipped
                      ? 'border-sub bg-blue-50'
                      : selectingSlot !== null || hasEmptySlot
                        ? 'border-gray-200 hover:bg-gray-50'
                        : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>
                      {displayItem.isEquipped && <RaceIcon race={race} className="h-4 w-4 inline-block mr-1 align-text-bottom" />}
                      <span className="font-medium">{getItemDisplayName(displayItem.item)}</span>
                      {!displayItem.isEquipped && <span className="text-xs text-gray-500"> x{displayItem.count}</span>}
                      <span className="text-xs text-gray-400"> {getRarityShortLabel(displayItem.item.id, displayItem.item.name)} {renderTextWithRaceIcons(applyProjectedDefenseToStatsText(displayItem, getItemStats(displayItem.item, getCharacterCategoryMultiplier(char, displayItem.item.category), hpDisplayMultiplier)))}</span>
                    </span>
                  </div>
                </button>
              ))}
              {filteredDisplayItems.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-2">このカテゴリに装備可能なアイテムがありません</div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ExpeditionTab({
  state,
  onSelectDungeon,
  onSetExpeditionDepthLimit,
  partyCycles,
  onTriggerSortie,
  expandedLogParty,
  setExpandedLogParty,
  expandedRoom,
  setExpandedRoom,
}: {
  state: GameState;
  onSelectDungeon: (partyIndex: number, dungeonId: number) => void;
  onSetExpeditionDepthLimit: (partyIndex: number, depthLimit: ExpeditionDepthLimit) => void;
  partyCycles: Record<number, PartyCycleRuntime>;
  onTriggerSortie: (partyIndex: number, triggerGodsBattle?: boolean) => void;
  expandedLogParty: number | null;
  setExpandedLogParty: Dispatch<SetStateAction<number | null>>;
  expandedRoom: { partyIndex: number; roomIndex: number } | null;
  setExpandedRoom: Dispatch<SetStateAction<{ partyIndex: number; roomIndex: number } | null>>;
}) {
  const getEstimatedStartHp = (entry: ExpeditionLogEntry) => {
    const healAmount = Math.max(0, entry.healAmount ?? 0);
    const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
    return Math.min(entry.maxPartyHP, Math.max(0, entry.remainingPartyHP + entry.damageTaken + attritionAmount - healAmount));
  };

  return (
    <div className="space-y-4">
      {[0, 1, 2, 3, 4, 5].map((partyIndex) => {
        const party = state.parties[partyIndex];
        if (!party) {
          return <div key={partyIndex} className="bg-pane rounded-lg p-4"><div className="text-sm text-gray-400">PT{partyIndex + 1}: (未開放)</div></div>;
        }

        const selectedDungeon = DUNGEONS.find(d => d.id === party.selectedDungeonId);
        const selectedDungeonGate = selectedDungeon ? getDungeonEntryGateState(party, selectedDungeon) : null;
        const cycle = partyCycles[partyIndex] ?? { state: '待機中', stateStartedAt: Date.now(), durationMs: 1000 };
        const cycleElapsedMs = Math.max(0, Date.now() - cycle.stateStartedAt);
        const { partyStats } = computePartyStats(party);
        const isLogExpanded = expandedLogParty === partyIndex;
        const currentLog = party.lastExpeditionLog;
        const headlineDungeonName = currentLog?.dungeonName ?? selectedDungeon?.name;
        const headlineState = cycle.state === '探索中'
          ? '探索中'
          : currentLog
            ? getExpeditionOutcomeLabel(currentLog.finalOutcome)
            : cycle.state;

        const displayedEntries = (() => {
          if (!currentLog) return [];
          if (cycle.state !== '探索中') return currentLog.entries;
          const visibleCount = Math.min(
            currentLog.entries.length,
            Math.max(0, Math.ceil((cycleElapsedMs / Math.max(1, cycle.durationMs)) * currentLog.entries.length)),
          );
          return currentLog.entries.slice(0, visibleCount);
        })();

        const displayedHp = (() => {
          if (cycle.state !== '探索中' || !currentLog || currentLog.entries.length === 0) return party.currentHp;
          if (displayedEntries.length === 0) return getEstimatedStartHp(currentLog.entries[0]);
          return displayedEntries[displayedEntries.length - 1].remainingPartyHP;
        })();
        const hpPercent = Math.min(100, Math.round((displayedHp / Math.max(1, partyStats.hp)) * 100));
        const progressPercent = cycle.state === '待機中'
          ? 100
          : cycle.state === '休息中'
          ? hpPercent
          : cycle.state === '探索中'
          ? Math.min(
            100,
            Math.floor(cycleElapsedMs / EXPLORING_PROGRESS_STEP_MS) * (100 / EXPLORING_PROGRESS_TOTAL_STEPS),
          )
          : Math.min(100, (cycleElapsedMs / Math.max(1, cycle.durationMs)) * 100);
        const hpForSortieCheck = cycle.state === '探索中' ? displayedHp : party.currentHp;
        const isSortieDisabled = !!selectedDungeonGate?.locked || hpForSortieCheck <= 0 || partyStats.hp <= 0;
        const canTriggerGodsBattle =
          cycle.state !== '探索中'
          && isGodsBattleAvailable(party, party.selectedDungeonId);

        return (
          <div key={partyIndex} className="bg-pane rounded-lg p-4">
            <button onClick={() => setExpandedLogParty(isLogExpanded ? null : partyIndex)} className="w-full flex justify-between items-center text-sm mb-3">
              <span><span className="font-bold text-black">{party.name}</span><span className="ml-2">{headlineDungeonName}</span><span className="ml-2 font-medium text-sub">{headlineState}</span></span>
              <span className={isLogExpanded ? 'transform transition-transform rotate-180' : ''}>▼</span>
            </button>

            <div className="mb-3 flex items-center gap-2 text-xs text-gray-600">
              <span className="shrink-0">HP</span>
              <div className="h-2 w-28 rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-500 transition-[width] duration-200" style={{ width: `${hpPercent}%` }} />
              </div>
              <span className="shrink-0">{cycle.state}</span>
              <div className="h-2 min-w-0 flex-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={`h-full bg-sub ${cycle.state === '探索中' ? '' : 'transition-[width] duration-200'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {isLogExpanded && (
              <div className="space-y-2 mb-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 text-sm text-gray-700">
                  <select
                    value={party.selectedDungeonId}
                    onChange={(e) => onSelectDungeon(partyIndex, Number(e.target.value))}
                    className="min-w-0 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {DUNGEONS.map(dungeon => {
                      const gateState = getDungeonEntryGateState(party, dungeon);
                      return <option key={dungeon.id} value={dungeon.id} disabled={gateState.locked}>{dungeon.name} {gateState.locked ? '🔒' : ''}</option>;
                    })}
                  </select>
                  <select
                    value={party.expeditionDepthLimit}
                    onChange={(e) => onSetExpeditionDepthLimit(partyIndex, e.target.value as ExpeditionDepthLimit)}
                    className="w-20 sm:w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {EXPEDITION_DEPTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onTriggerSortie(partyIndex, canTriggerGodsBattle)}
                    disabled={isSortieDisabled}
                    className={`px-3 py-2 text-white rounded font-medium text-sm leading-none whitespace-nowrap ${isSortieDisabled ? 'bg-gray-400 cursor-not-allowed' : canTriggerGodsBattle ? 'bg-accent hover:bg-orange-700' : 'bg-sub hover:bg-blue-600'}`}
                  >
                    {canTriggerGodsBattle ? '神魔戦' : '出撃'}
                  </button>
                </div>
                {['帰還中', '待機中'].includes(cycle.state) && party.currentHp <= 0 && (
                  <div className="text-xs text-accent">HPが0のため出撃できません。休息で回復してください。</div>
                )}
                {getNextGoalText(party, cycle.state) && <div className="text-sm text-gray-700">{getNextGoalText(party, cycle.state)}</div>}
              </div>
            )}

            {currentLog && isLogExpanded && (
              <div className="border-t border-gray-200 pt-3">
                <div className="space-y-2">
                  {cycle.state !== '探索中' && (
                    <div className="text-sm text-gray-500">
                      EXP: +{formatNumber(currentLog.totalExperience)}
                      {currentLog.autoSellProfit > 0 && <span> | {formatAutoSellSummary(currentLog.autoSellProfit, currentLog.autoSellMultiplier)}</span>}
                    </div>
                  )}

                  {cycle.state !== '探索中' && currentLog.rewards.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500">獲得アイテム: </span>
                      {currentLog.rewards.map((item, i) => {
                        const rarity = getItemRarityById(item.id);
                        const isSuperRare = item.superRare > 0;
                        const rarityClass = getRarityTextClass(rarity, isSuperRare);
                        const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
                        return <span key={i} className={`${rarityClass} ${fontWeightClass}`}>{i > 0 && ', '}{getItemDisplayName(item)}</span>;
                      })}
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-2 space-y-2">
                    {[...displayedEntries].reverse().map((entry, i, arr) => {
                      const originalIndex = arr.length - 1 - i;
                      const roomLabel = entry.floor && entry.roomInFloor
                        ? `${entry.floor}F-${entry.roomInFloor}`
                        : entry.room === currentLog.totalRooms + 1 ? 'BOSS' : entry.room.toString();
                      const healAmount = Math.max(0, entry.healAmount ?? 0);
                      const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
                      const estimatedStartHP = Math.min(entry.maxPartyHP, Math.max(0, entry.remainingPartyHP + entry.damageTaken + attritionAmount - healAmount));
                      const takenDamageAmount = Math.max(0, estimatedStartHP - entry.remainingPartyHP);
                      const remainingRatio = entry.maxPartyHP > 0 ? (entry.remainingPartyHP / entry.maxPartyHP) * 100 : 0;
                      const healRatio = entry.maxPartyHP > 0 ? (healAmount / entry.maxPartyHP) * 100 : 0;
                      const takenRatio = entry.maxPartyHP > 0 ? (takenDamageAmount / entry.maxPartyHP) * 100 : 0;
                      const enemyTakenAmount = Math.min(entry.enemyHP, Math.max(0, entry.damageDealt));
                      const enemyRemainingAmount = Math.max(0, entry.enemyHP - enemyTakenAmount);
                      const enemyRemainingRatio = entry.enemyHP > 0 ? (enemyRemainingAmount / entry.enemyHP) * 100 : 0;
                      const isRoomExpanded = expandedRoom?.partyIndex === partyIndex && expandedRoom?.roomIndex === originalIndex;

                      return (
                        <div key={`${partyIndex}-${originalIndex}-${entry.room}`} className="bg-white rounded overflow-hidden">
                          <button onClick={() => setExpandedRoom(isRoomExpanded ? null : { partyIndex, roomIndex: originalIndex })} className="w-full text-left p-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{roomLabel}: {renderEnemyNameWithMutedClass(entry.enemyName)}</span>
                              <span className="flex items-center gap-2">
                                <span className={entry.gateInfo ? 'text-gray-500 font-medium' : entry.outcome === 'victory' ? 'text-sub font-medium' : entry.outcome === 'defeat' ? 'text-accent font-medium' : 'text-accent font-medium'}>
                                  {entry.gateInfo ? '未到達' : entry.outcome === 'victory' ? '勝利' : entry.outcome === 'defeat' ? '敗北' : '引分'}
                                </span>
                                <span className={`transform transition-transform ${isRoomExpanded ? 'rotate-180' : ''}`}>▼</span>
                              </span>
                            </div>
                            {(entry.gateInfo || entry.reward) && (
                              <div className="text-gray-500 mt-1 flex flex-wrap items-center gap-1">
                                {entry.gateInfo && <span className="text-orange-700">解放条件: {entry.gateInfo}</span>}
                                {renderEntryReward(entry)}
                              </div>
                            )}
                            <div className="mt-1 grid grid-cols-2 gap-2 text-gray-600">
                              <div>
                                <div className="mb-0.5">自HP {formatNumber(entry.remainingPartyHP)} / {formatNumber(entry.maxPartyHP)}</div>
                                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full" style={{ width: `${Math.min(100, remainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                  <div className="h-full" style={{ width: `${Math.min(100, healRatio)}%`, backgroundColor: '#b8edb2' }} />
                                  <div className="h-full" style={{ width: `${Math.min(100, takenRatio)}%`, backgroundColor: 'rgb(var(--color-hp-taken))' }} />
                                </div>
                              </div>
                              <div>
                                <div className="mb-0.5">敵HP {formatNumber(enemyRemainingAmount)} / {formatNumber(entry.enemyHP)}</div>
                                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full" style={{ width: `${Math.min(100, enemyRemainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                </div>
                              </div>
                            </div>
                          </button>
                          {isRoomExpanded && entry.details && (
                            <div className="border-t border-gray-100 p-2 bg-gray-50 text-xs space-y-1">
                              <div className="font-medium text-gray-600 mb-1">戦闘ログ:</div>
                              {entry.details.map((log, j) => {
                                const isResurrectLog = log.action.includes('は致命ダメージを食いしばって耐えた！');
                                const isPhaseAction = log.actor !== 'deity' && log.actor !== 'effect';
                                const previousLog = j > 0 ? entry.details[j - 1] : undefined;
                                const isStealthEffectLog = log.actor === 'effect' && (log.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || log.action.includes('への攻撃はすべて幻だった！'));
                                const isCounterNegationEffectLog = log.actor === 'effect' && log.action.includes('反撃無効化により');
                                const previousWasStealthEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || previousLog.action.includes('への攻撃はすべて幻だった！'));
                                const previousWasCounterNegationEffectLog = !!previousLog && previousLog.actor === 'effect' && previousLog.action.includes('反撃無効化により');
                                const previousWasPhaseAction = !!previousLog && (previousLog.actor !== 'deity' && previousLog.actor !== 'effect');
                                const previousContinuesCurrentPhase = !!previousLog && (previousWasPhaseAction || previousWasStealthEffectLog || previousWasCounterNegationEffectLog);
                                const shouldShowPhaseHeader = isPhaseAction && (!previousLog || !previousContinuesCurrentPhase || previousLog.phase !== log.phase);
                                const shouldShowEndPhaseSpacer = !!previousLog && !isPhaseAction && previousWasPhaseAction;
                                const phaseLabel = isPhaseAction
                                  ? (log.isCounter || isResurrectLog ? '-' : `${log.initiativeRoll ?? '?'}`)
                                  : log.actor === 'deity' ? '末' : (isStealthEffectLog || isCounterNegationEffectLog) ? '-' : '効';
                                const phaseHeader = log.phase === 'long'
                                  ? '遠距離攻撃フェーズ'
                                  : log.phase === 'mid'
                                    ? '魔法攻撃フェーズ'
                                    : '近接攻撃フェーズ';
                                const emoji = log.elementalOffense === 'fire' ? '🔥' : log.elementalOffense === 'thunder' ? '⚡' : log.elementalOffense === 'ice' ? '❄️' : log.phase === 'long' ? '🏹' : log.phase === 'mid' ? '🪄' : '⚔';
                                const isEnemy = log.actor === 'enemy';
                                const hits = log.hits ?? 0;
                                const totalAttempts = log.totalAttempts ?? 0;
                                const allMissed = totalAttempts > 0 && hits === 0 && !log.wasNegated;
                                const hitDisplay = totalAttempts > 0 ? `(${hits}/${totalAttempts}回)` : '';
                                const resonanceMatch = /(\(共鳴\+\d+%\))$/.exec(log.action);
                                const rageDisplay = log.rageBonusPercent && log.rageBonusPercent > 0
                                  ? `闘志+${log.rageBonusPercent}%`
                                  : '';
                                const momentumDisplay = typeof log.momentumBonusPercent === 'number'
                                  ? `気勢${log.momentumBonusPercent >= 0 ? '+' : ''}${log.momentumBonusPercent}%`
                                  : '';

                                let actionText: string;
                                if (log.actor === 'effect') {
                                  actionText = log.action;
                                } else if (isEnemy) {
                                  if (isResurrectLog) {
                                    actionText = `敵${log.action}`;
                                  } else {
                                    actionText = allMissed ? `敵が${log.action.replace('！', 'したが外れた！')}` : `敵が${log.action}`;
                                  }
                                } else {
                                  actionText = allMissed ? `${log.action.replace(/ の.*$/, '')} の攻撃は外れた！` : log.action;
                                }

                                const extraSegments = [
                                  resonanceMatch ? resonanceMatch[1].slice(1, -1) : '',
                                  rageDisplay,
                                  momentumDisplay,
                                ].filter(Boolean);
                                const compactHitDisplay = hitDisplay && extraSegments.length > 0
                                  ? `(${hits}/${totalAttempts}回,${extraSegments.join(',')})`
                                  : hitDisplay;
                                const actionDisplay = resonanceMatch && !allMissed
                                  ? actionText.replace(/\(共鳴\+\d+%\)$/, '')
                                  : actionText;
                                const shouldRenderResurrectBeforeHeader = isResurrectLog && shouldShowPhaseHeader;

                                return (
                                  <div key={j}>
                                    {shouldRenderResurrectBeforeHeader && (
                                      <div className="flex justify-between text-gray-600">
                                        <span>
                                          <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                          {actionDisplay}
                                          {log.note && <span className="text-gray-400"> {log.note}</span>}
                                          {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                        </span>
                                        {log.damage !== undefined && log.damage > 0 && (
                                          <span className={isEnemy ? 'text-accent' : 'text-sub'}>({emoji} {formatNumber(log.damage)})</span>
                                        )}
                                      </div>
                                    )}
                                    {shouldShowPhaseHeader && <div className="text-gray-400">({phaseHeader})</div>}
                                    {(!isResurrectLog || !shouldRenderResurrectBeforeHeader) && (
                                    <div className={`flex justify-between text-gray-600 ${shouldShowEndPhaseSpacer ? 'mt-1' : ''}`}>
                                      <span>
                                        <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                        {actionDisplay}
                                        {log.note && <span className="text-gray-400"> {log.note}</span>}
                                        {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                      </span>
                                      {log.damage !== undefined && log.damage > 0 && (
                                        <span className={isEnemy ? 'text-accent' : 'text-sub'}>({emoji} {formatNumber(log.damage)})</span>
                                      )}
                                    </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {cycle.state === '探索中' && displayedEntries.length === 0 && (
                      <div className="text-xs text-gray-500">探索進行中... 1部屋ずつログを更新中</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BaseTab({
  inventory,
  parties,
  gold,
  shopPurchases,
  shopRefreshCounts,
  shopIntimacy,
  shopIntimacyLastDecayAt,
  onSellStack,
  onSetVariantStatus,
  onBuyShopItem,
  onRefreshShopLineup,
  activeSubTab,
  onSetActiveSubTab,
}: {
  inventory: InventoryRecord;
  parties: Party[];
  gold: number;
  shopPurchases: Record<string, number[]>;
  shopRefreshCounts: Record<string, number>;
  shopIntimacy: number;
  shopIntimacyLastDecayAt: number;
  onSellStack: (variantKey: string) => void;
  onSetVariantStatus: (variantKey: string, status: 'notown') => void;
  onBuyShopItem: (itemId: number) => void;
  onRefreshShopLineup: () => void;
  activeSubTab: BaseSubTab;
  onSetActiveSubTab: (tab: BaseSubTab) => void;
}) {
  const baseSubTabs = [
    { id: 'inventory' as const, label: '所持品', isAvailable: true },
    { id: 'shop' as const, label: 'お店', isAvailable: true },
    { id: 'workshop' as const, label: '工房', isAvailable: false },
    { id: 'altar' as const, label: '祭壇', isAvailable: false },
  ];

  return (
    <div>
      <div className="flex mb-4 border-b border-gray-200">
        {baseSubTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              if (!tab.isAvailable) return;
              onSetActiveSubTab(tab.id);
            }}
            disabled={!tab.isAvailable}
            className={`flex-1 py-2 text-sm font-medium ${
              activeSubTab === tab.id
                ? 'text-sub border-b-2 border-sub'
                : tab.isAvailable
                ? 'text-gray-700 hover:text-gray-900'
                : 'text-gray-300 cursor-not-allowed'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'inventory' ? (
        <InventoryTab
          inventory={inventory}
          parties={parties}
          onSellStack={onSellStack}
          onSetVariantStatus={onSetVariantStatus}
        />
      ) : activeSubTab === 'shop' ? (
        <ShopTab
          gold={gold}
          parties={parties}
          shopPurchases={shopPurchases}
          shopRefreshCounts={shopRefreshCounts}
          shopIntimacy={shopIntimacy}
          shopIntimacyLastDecayAt={shopIntimacyLastDecayAt}
          onBuyShopItem={onBuyShopItem}
          onRefreshShopLineup={onRefreshShopLineup}
        />
      ) : (
        <div className="text-sm text-gray-600">この機能は次のバージョンで利用可能になります。</div>
      )}
    </div>
  );
}

function ShopTab({
  gold,
  parties,
  shopPurchases,
  shopRefreshCounts,
  shopIntimacy,
  shopIntimacyLastDecayAt,
  onBuyShopItem,
  onRefreshShopLineup,
}: {
  gold: number;
  parties: Party[];
  shopPurchases: Record<string, number[]>;
  shopRefreshCounts: Record<string, number>;
  shopIntimacy: number;
  shopIntimacyLastDecayAt: number;
  onBuyShopItem: (itemId: number) => void;
  onRefreshShopLineup: () => void;
}) {
  const mustelidRace = RACES.find((race) => race.id === 'mustelid');
  const now = new Date();
  const elapsedRefreshes = countElapsedShopRefreshes(shopIntimacyLastDecayAt, now);
  const effectiveIntimacy = Math.max(0, Math.floor(shopIntimacy * (0.9 ** elapsedRefreshes)));
  const nextRefreshDate = getNextShopRefreshDate(now);
  const minutesToRefresh = Math.max(1, Math.ceil((nextRefreshDate.getTime() - now.getTime()) / 60000));
  const countdownText = minutesToRefresh >= 60
    ? `後${Math.floor(minutesToRefresh / 60)}時間`
    : `後${minutesToRefresh}分`;
  const hourKey = getShopHourKey(now);
  const refreshCount = shopRefreshCounts[hourKey] ?? 0;
  const refreshPrice = getShopRefreshPrice(refreshCount);
  const highestDefeatedBossTier = DUNGEONS.reduce((highestTier, dungeon) => {
    const nextDungeonId = dungeon.id + 1;
    const hasBeatenBoss = parties.some((party) => (
      party.selectedDungeonId >= nextDungeonId || isLootGateUnlocked(party, getEntryGateKey(nextDungeonId))
    ));
    return hasBeatenBoss ? Math.max(highestTier, dungeon.id) : highestTier;
  }, 1);
  const lineupSeed = getShopLineupSeed(now, refreshCount);
  const stockKey = getShopStockKey(now, refreshCount);
  const shopCategories: ItemCategory[] = ['shield', 'armor', 'sword', 'wand', 'grimoire'];
  const soldOutItemIds = shopPurchases[stockKey] ?? [];

  if (!mustelidRace) {
    return <div className="text-sm text-gray-600">お店の準備中です。</div>;
  }

  const intimacyDialogue = effectiveIntimacy >= 80
    ? '「待ってたよ。あんたには特別な品も回してるんだ。……他の客には内緒だぜ？」'
    : effectiveIntimacy >= 40
      ? '「やぁ。奥の棚も見ていいよ。運が良けりゃ掘り出し物があるかもな。」'
      : effectiveIntimacy >= 20
        ? '「お、また来たのかい。うちのガラクタも、見ていくうちに味が出てくるもんさ。」'
        : '「ひょっとしたらいいお宝が眠ってるかもしれないよ？……おっと、獲物には触らんといてな。」';

  const rarityPool: number[] = effectiveIntimacy >= 80
    ? [400, 300, 300, 200, 200]
    : effectiveIntimacy >= 40
      ? [300, 200, 200, 100, 100]
      : effectiveIntimacy >= 20
        ? [200, 100, 100, 100, 100]
        : [100, 100, 100, 100, 100];

  const seededTierForIndex = (index: number): number => {
    const x = Math.sin(lineupSeed + (index + 1) * 97) * 10000;
    const normalized = x - Math.floor(x);
    return Math.floor(normalized * highestDefeatedBossTier) + 1;
  };

  const shopItems = rarityPool.map((rarityBase, index) => {
    const tier = seededTierForIndex(index);
    const rotatedCategories = shopCategories.map((_, offset) => shopCategories[(index + offset) % shopCategories.length]);
    const baseItemId = rotatedCategories
      .map((category) => {
        const categoryIndex = ITEM_CATEGORY_ORDER.indexOf(category);
        return tier * 1000 + rarityBase + categoryIndex + 1;
      })
      .find((itemId) => ITEMS.some((item) => item.id === itemId));
    if (!baseItemId) return null;
    const baseItem = ITEMS.find((item) => item.id === baseItemId);
    if (!baseItem) return null;

    const item: Item = { ...baseItem, enhancement: 0, superRare: 0 };
    const price = getShopItemPrice(baseItemId);
    const isSoldOut = soldOutItemIds.includes(baseItemId);
    const canBuy = !isSoldOut && gold >= price;
    const rarity = getItemRarityById(baseItemId);
    const rarityClass = isSoldOut
      ? 'text-gray-400'
      : rarity === 'bossRare'
        ? 'text-accent'
        : rarity === 'eliteRare'
          ? 'text-sub'
          : rarity === 'uncommon'
            ? 'font-bold text-gray-900'
            : 'text-gray-900 font-normal';

    return {
      key: `${baseItemId}-${index}`,
      itemId: baseItemId,
      item,
      price,
      isSoldOut,
      canBuy,
      rarityClass,
    };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return (
    <div className="space-y-4">
      <div className="rounded border border-gray-200 bg-white p-3">
        <div className="text-sm font-semibold text-sub">フェリスのガラクタ屋</div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="grid flex-1 grid-cols-[auto,1fr] items-start gap-3">
            <RaceIcon race={mustelidRace} className="h-10 w-10 self-center" />
            <div className="space-y-1">
              <p className="text-sm text-gray-700">
                {intimacyDialogue}
              </p>
              <p className="text-xs text-gray-500">
                （商品洗替まであと {countdownText.replace('後', '')}）
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <button
              onClick={onRefreshShopLineup}
              disabled={gold < refreshPrice}
              className={`rounded px-3 py-1 text-xs font-semibold ${
                gold >= refreshPrice
                  ? 'bg-accent text-white hover:bg-accent/90'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="block">有償洗替</span>
              <span className="block text-[11px]">{formatNumber(refreshPrice)}G</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {shopItems.map((entry) => (
          <div key={entry.key} className="rounded border border-gray-200 bg-white px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className={`flex items-center gap-2 text-sm ${entry.rarityClass}`}>
                  <span className="truncate">?{entry.item.name}</span>
                  <span className={`shrink-0 text-xs ${entry.isSoldOut ? 'text-gray-400' : 'text-gray-500'}`}>
                    {formatNumber(entry.price)}G
                  </span>
                </div>
                <div className={`mt-0.5 text-xs leading-tight ${entry.isSoldOut ? 'text-gray-300' : 'text-gray-400'}`}>
                  {getRarityShortLabel(entry.item.id, entry.item.name)} {renderTextWithRaceIcons(getItemStats(entry.item))}
                </div>
              </div>
              <button
                onClick={() => onBuyShopItem(entry.itemId)}
                disabled={!entry.canBuy}
                className={`shrink-0 min-w-[3.25rem] whitespace-nowrap rounded px-3 py-1 text-xs font-medium ${
                  entry.isSoldOut
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : entry.canBuy
                    ? 'bg-sub text-white hover:bg-sub/90'
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                }`}
              >
                {entry.isSoldOut ? '売切' : '購入'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function InventoryTab({
  inventory,
  parties,
  onSellStack,
  onSetVariantStatus,
}: {
  inventory: InventoryRecord;
  parties: Party[];
  onSellStack: (variantKey: string) => void;
  onSetVariantStatus: (variantKey: string, status: 'notown') => void;
}) {
  const [showSold, setShowSold] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('armor');
  const [inventoryRarityFilter, setInventoryRarityFilter] = useState<RarityFilter>('all');
  const [inventorySuperRareOnly, setInventorySuperRareOnly] = useState(false);

  // Separate owned and sold/notown items, filtered by category
  const allOwnedItems = Object.entries(inventory).filter(([, v]) => v.status === 'owned' && v.count > 0);
  const filteredOwnedItems = sortInventoryItems(
    allOwnedItems.filter(([, v]) =>
      v.item.category === selectedCategory &&
      matchesRarityFilter(v.item.id, inventoryRarityFilter) &&
      (!inventorySuperRareOnly || v.item.superRare >= 1)
    )
  );

  const equippedItems = parties.flatMap((party, partyIndex) =>
    party.characters.flatMap((character, rowIndex) =>
      character.equipment.flatMap((item, slotIndex) => {
        if (!item) return [];
        if (
          item.category !== selectedCategory ||
          !matchesRarityFilter(item.id, inventoryRarityFilter) ||
          (inventorySuperRareOnly && item.superRare < 1)
        ) {
          return [];
        }

        return [{
          key: `equipped-${party.id}-${character.id}-${rowIndex}-${slotIndex}-${item.id}-${item.enhancement}-${item.superRare}`,
          item,
          partyIndex,
          rowIndex,
          slotIndex,
          characterName: character.name,
          raceId: character.raceId,
          categoryMultiplier: getCharacterCategoryMultiplier(character, item.category),
          hpScaleMultiplier: (() => {
            const characterStats = computeCharacterStats(character, party.level);
            return ((characterStats.baseStats.vitality + characterStats.baseStats.mind) / 20) * getCharacterGrowthMultiplier(character);
          })(),
        }];
      })
    )
  );

  const combinedDisplayItems = [
    ...filteredOwnedItems.map(([key, variant]) => ({
      key,
      type: 'owned' as const,
      variant,
      item: variant.item,
    })),
    ...equippedItems.map((equipped) => ({
      key: equipped.key,
      type: 'equipped' as const,
      equipped,
      item: equipped.item,
    })),
  ].sort((a, b) => {
    if (a.item.id !== b.item.id) return b.item.id - a.item.id;
    if (a.item.superRare !== b.item.superRare) return b.item.superRare - a.item.superRare;
    if (a.item.enhancement !== b.item.enhancement) return b.item.enhancement - a.item.enhancement;

    // Keep owned stacks above equipped copies of the same item variant.
    if (a.type !== b.type) return a.type === 'owned' ? -1 : 1;

    if (a.type === 'equipped' && b.type === 'equipped') {
      if (a.equipped.partyIndex !== b.equipped.partyIndex) return a.equipped.partyIndex - b.equipped.partyIndex;
      if (a.equipped.rowIndex !== b.equipped.rowIndex) return a.equipped.rowIndex - b.equipped.rowIndex;
      return a.equipped.slotIndex - b.equipped.slotIndex;
    }

    return 0;
  });

  const allSoldItems = Object.entries(inventory).filter(([, v]) => v.status === 'sold');
  const filteredSoldItems = sortInventoryItems(
    allSoldItems.filter(([, v]) =>
      v.item.category === selectedCategory &&
      matchesRarityFilter(v.item.id, inventoryRarityFilter) &&
      (!inventorySuperRareOnly || v.item.superRare >= 1)
    )
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-2 gap-2">
        <div className="text-sm text-gray-500">
          {filteredOwnedItems.reduce((sum, [, v]) => sum + v.count, 0)}個
        </div>
        <div className="flex justify-end items-center gap-1">
          <span className="text-xs text-gray-500">{RARITY_FILTER_NOTES[inventoryRarityFilter]}</span>
          {RARITY_FILTER_OPTIONS.map(filter => (
            <button
              key={filter}
              onClick={() => setInventoryRarityFilter(filter)}
              className={`text-xs px-1.5 py-0.5 border rounded ${
                inventoryRarityFilter === filter
                  ? 'bg-sub text-white border-sub'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
              title={RARITY_FILTER_NOTES[filter]}
            >
              {RARITY_FILTER_LABELS[filter]}
            </button>
          ))}
          <span className="text-xs text-gray-500"> 超レア</span>
          <button
            onClick={() => setInventorySuperRareOnly(prev => !prev)}
            className={`text-xs px-1.5 py-0.5 border rounded ${
              inventorySuperRareOnly
                ? 'bg-accent text-white border-accent'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
            }`}
          >
            {inventorySuperRareOnly ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Category group tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {CATEGORY_GROUPS.map(group => (
          <div key={group.id} className="flex flex-col">
            <div className="text-xs text-gray-400 text-center mb-0.5">{group.label}</div>
            <div className="flex">
              {group.categories.map((cat, i) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 text-sm ${
                    i === 0 ? 'rounded-l' : i === group.categories.length - 1 ? 'rounded-r' : ''
                  } ${
                    selectedCategory === cat
                      ? 'bg-sub text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {CATEGORY_SHORT_NAMES[cat]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Item list */}
      <div className="space-y-1 min-h-[364px] max-h-[26rem] overflow-y-auto mb-4">
          {combinedDisplayItems.map((entry) => {
            if (entry.type === 'owned') {
              const { item, count } = entry.variant;
              const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
              const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
              const baseMult = item.baseMultiplier ?? 1;
              const sellPrice = Math.floor(10 * enhMult * srMult * baseMult) * count;

              return (
                <div
                  key={entry.key}
                  className="px-2 py-1.5 rounded bg-pane"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${entry.variant.isNew ? 'font-bold' : 'font-normal'}`}>
                        {getItemDisplayName(item)}
                      </span>
                      <span className="text-xs text-gray-500">x{formatNumber(count)}</span>
                    </div>
                    <button
                      onClick={() => {
                        const shouldSell = window.confirm(
                          `「${getItemDisplayName(item)} x${formatNumber(count)}」を全売却します。\n${formatNumber(sellPrice)}Gを獲得します。よろしいですか？`
                        );
                        if (!shouldSell) return;
                        onSellStack(entry.key);
                      }}
                      className="text-xs text-accent px-2 py-1 border border-accent rounded flex-shrink-0"
                    >
                      全売却 {formatNumber(sellPrice)}G
                    </button>
                  </div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-400">
                    {getRarityShortLabel(item.id, item.name)} {renderTextWithRaceIcons(getItemStats(item))}
                  </div>
                </div>
              );
            }

            const race = RACES.find((raceEntry) => raceEntry.id === entry.equipped.raceId);
            return (
              <div
                key={entry.key}
                className="px-2 py-1.5 rounded bg-pane"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {race && <RaceIcon race={race} className="h-4 w-4 shrink-0" />}
                    <span className="text-sm truncate">{getItemDisplayName(entry.equipped.item)}</span>
                    <span className="text-xs text-gray-500 shrink-0">x1</span>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">
                    PT{entry.equipped.partyIndex + 1}:{entry.equipped.characterName}
                  </span>
                </div>
                <div className="mt-0.5 text-xs leading-tight text-gray-400">
                  {getRarityShortLabel(entry.equipped.item.id, entry.equipped.item.name)} {renderTextWithRaceIcons(getItemStats(entry.equipped.item, entry.equipped.categoryMultiplier, entry.equipped.hpScaleMultiplier))}
                </div>
              </div>
            );
          })}
          {combinedDisplayItems.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-4">このカテゴリにアイテムがありません</div>
          )}
      </div>

      {/* Sold items management */}
      {allSoldItems.length > 0 && (
        <div className="border-t border-gray-200 pt-3">
          <button
            onClick={() => setShowSold(!showSold)}
            className="text-xs text-gray-500 flex items-center gap-1"
          >
            <span className={`transform transition-transform ${showSold ? 'rotate-180' : ''}`}>▼</span>
            自動売却設定 ({allSoldItems.length}種類)
          </button>
          {showSold && (
            <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {filteredSoldItems.map(([key, variant]) => (
                <div key={key} className="px-2 py-1.5 rounded bg-gray-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-500">{getItemDisplayName(variant.item)}</span>
                    <button
                      onClick={() => onSetVariantStatus(key, 'notown')}
                      className="text-xs text-sub px-2 py-1 border border-sub rounded"
                    >
                      解除
                    </button>
                  </div>
                  <div className="mt-0.5 text-xs leading-tight text-gray-400">
                    {getRarityShortLabel(variant.item.id, variant.item.name)} {renderTextWithRaceIcons(getItemStats(variant.item))}
                  </div>
                </div>
              ))}
              {filteredSoldItems.length === 0 && (
                <div className="text-gray-400 text-xs text-center py-2">このカテゴリに自動売却設定はありません</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiaryTab({
  parties,
  onOpenDiaryLog,
  onUpdateDiarySettings,
  expandedLogs,
  onSetExpandedLogs,
  expandedRooms,
  onSetExpandedRooms,
  isSettingsExpanded,
  onSetIsSettingsExpanded,
}: {
  parties: Party[];
  onOpenDiaryLog: (logId: string) => void;
  onUpdateDiarySettings: (partyIndex: number, settings: Partial<DiarySettings>) => void;
  expandedLogs: Record<string, boolean>;
  onSetExpandedLogs: Dispatch<SetStateAction<Record<string, boolean>>>;
  expandedRooms: Record<string, boolean>;
  onSetExpandedRooms: Dispatch<SetStateAction<Record<string, boolean>>>;
  isSettingsExpanded: boolean;
  onSetIsSettingsExpanded: Dispatch<SetStateAction<boolean>>;
}) {

  const diaryLogs = parties
    .flatMap((party) =>
      (party.diaryLogs ?? []).map((diaryLog) => ({
        partyName: party.name,
        ...diaryLog,
      }))
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  const getDiaryTitle = (triggers: Array<'defeat' | 'eliteRare' | 'bossRare' | 'mythicRare' | 'superRare'>) => {
    if (triggers.includes('defeat') && triggers.length === 1) return '敗北の記録';
    if (triggers.includes('superRare')) return '超レア獲得の記録';
    if (triggers.includes('mythicRare')) return '神魔レア獲得の記録';
    if (triggers.includes('bossRare')) return 'ボスレア獲得の記録';
    if (triggers.includes('eliteRare')) return 'エリートレア獲得の記録';
    return '特別記録';
  };


  const getDiaryHeadline = (
    partyName: string,
    triggers: Array<'defeat' | 'eliteRare' | 'bossRare' | 'mythicRare' | 'superRare'>,
    rewards: Item[]
  ) => {
    if (triggers.includes('defeat') && triggers.length === 1) {
      return `[${partyName}] 敗北の記録`;
    }

    if (triggers.includes('superRare') || triggers.includes('mythicRare') || triggers.includes('bossRare')) {
      const rewardNames = rewards
        .filter((item) => {
          if (triggers.includes('superRare')) return item.superRare > 0;
          if (triggers.includes('mythicRare')) return getItemRarityById(item.id) === 'mythicRare';
          return getItemRarityById(item.id) === 'bossRare';
        })
        .map((item) => getItemDisplayName(item))
        .join('、');
      const triggerPrefix = triggers.includes('superRare')
        ? '超レア'
        : triggers.includes('mythicRare')
          ? '神魔レア'
          : 'ボスレア';
      return rewardNames
        ? `[${partyName}] ${triggerPrefix}(${rewardNames}) 獲得`
        : `[${partyName}] ${triggerPrefix}獲得`;
    }

    if (triggers.includes('eliteRare')) {
      const rewardNames = rewards
        .filter((item) => getItemRarityById(item.id) === 'eliteRare')
        .map((item) => getItemDisplayName(item))
        .join('、');
      return rewardNames ? `[${partyName}] エリートレア(${rewardNames}) 獲得` : `[${partyName}] エリートレア獲得`;
    }

    return `[${partyName}] ${getDiaryTitle(triggers)}`;
  };

  const formatDiaryTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const renderDiarySettings = () => (
    <div className="bg-pane rounded-lg p-3">
      <button
        onClick={() => onSetIsSettingsExpanded((prev) => !prev)}
        className="w-full text-left"
      >
        <span className="flex items-center justify-between text-sm font-medium">
          <span>日誌記録設定</span>
          <span className={`transform transition-transform ${isSettingsExpanded ? 'rotate-180' : ''}`}>▼</span>
        </span>
      </button>

      {isSettingsExpanded && (
        <div className="mt-3 space-y-3">
          {parties.map((party, partyIndex) => {
            const settings = party.diarySettings;
            return (
              <div key={party.id} className="rounded border border-gray-200 p-2.5">
                <div className="mb-2 text-xs text-gray-500">{party.name}</div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <label className="flex items-center justify-between gap-2">
                    <span>超レア通知</span>
                    <select
                      value={settings.superRareThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { superRareThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`sr-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>エリートレア通知</span>
                    <select
                      value={settings.rareThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { rareThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`ra-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>ボスレア通知</span>
                    <select
                      value={settings.bossThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { bossThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`bo-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>神魔レア通知</span>
                    <select
                      value={settings.mythicThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { mythicThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`my-${option.value}`} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>敗北通知</span>
                    <select
                      value={settings.notifyDefeat ? 'あり' : 'なし'}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { notifyDefeat: event.target.value === 'あり' })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      <option value="あり">あり</option>
                      <option value="なし">なし</option>
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (diaryLogs.length === 0) {
    return (
      <div className="space-y-3">
        {renderDiarySettings()}
        <div className="bg-pane rounded-lg p-4 text-sm text-gray-500 text-center">記録された日誌はありません</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renderDiarySettings()}
      {diaryLogs.map((diaryLog) => {
        const isExpanded = !!expandedLogs[diaryLog.id];
        const log = diaryLog.expeditionLog;
        const specialRewards = log.rewards.filter((item) => {
          const rarity = getItemRarityById(item.id);
          return rarity === 'bossRare' || rarity === 'mythicRare' || item.superRare > 0;
        });
        return (
          <div key={diaryLog.id} className="bg-pane rounded-lg p-3">
            <button
              onClick={() => {
                const nextExpanded = !isExpanded;
                onSetExpandedLogs((prev) => ({ ...prev, [diaryLog.id]: nextExpanded }));
                if (nextExpanded && !diaryLog.isRead) {
                  onOpenDiaryLog(diaryLog.id);
                }
              }}
              className="w-full text-left text-sm"
            >
              <span className="flex items-start justify-between gap-2">
                <span className={`pr-2 ${diaryLog.isRead ? 'font-normal text-gray-500' : 'font-medium text-gray-900'}`}>
                  {getDiaryHeadline(diaryLog.partyName, diaryLog.triggers, log.rewards)}
                </span>
                <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
              </span>

              <span className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
                <span className="truncate">{log.dungeonName}</span>
                <span className="whitespace-nowrap text-right">{formatDiaryTimestamp(diaryLog.createdAt)}</span>
              </span>
            </button>

            {specialRewards.length > 0 && diaryLog.triggers.includes('defeat') && (
              <div className="mt-1 text-xs text-gray-500">
                特別獲得: {specialRewards.map((item, i) => {
                  const rarity = getItemRarityById(item.id);
                  const isSuperRare = item.superRare > 0;
                  const rarityClass = getRarityTextClass(rarity, isSuperRare);
                  const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
                  return (
                    <span key={`${item.id}-${item.enhancement}-${item.superRare}-${i}`} className={`${rarityClass} ${fontWeightClass}`}>
                      {i > 0 && ', '}
                      {getItemDisplayName(item)}
                    </span>
                  );
                })}
              </div>
            )}

            {isExpanded && (
              <div className="mt-3 space-y-2">
                <div className="text-sm text-gray-500">
                  EXP: +{formatNumber(log.totalExperience)}
                  {log.autoSellProfit > 0 && (
                    <span> | {formatAutoSellSummary(log.autoSellProfit, log.autoSellMultiplier)}</span>
                  )}
                </div>

                {log.rewards.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">獲得アイテム: </span>
                    {log.rewards.map((item, i) => {
                      const rarity = getItemRarityById(item.id);
                      const isSuperRare = item.superRare > 0;
                      const rarityClass = getRarityTextClass(rarity, isSuperRare);
                      const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
                      return (
                        <span key={i} className={`${rarityClass} ${fontWeightClass}`}>
                          {i > 0 && ', '}{getItemDisplayName(item)}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-gray-200 pt-2 space-y-2">
                  {[...log.entries].reverse().map((entry, i, arr) => {
                    const originalIndex = arr.length - 1 - i;
                    let roomLabel: string;
                    if (entry.floor && entry.roomInFloor) {
                      roomLabel = `${entry.floor}F-${entry.roomInFloor}`;
                    } else {
                      const isBoss = entry.room === log.totalRooms + 1;
                      roomLabel = isBoss ? 'BOSS' : entry.room.toString();
                    }
                    const healAmount = Math.max(0, entry.healAmount ?? 0);
                    const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
                    const estimatedStartHP = Math.min(
                      entry.maxPartyHP,
                      Math.max(0, entry.remainingPartyHP + entry.damageTaken + attritionAmount - healAmount)
                    );
                    const takenDamageAmount = Math.max(0, estimatedStartHP - entry.remainingPartyHP);
                    const remainingRatio = entry.maxPartyHP > 0 ? (entry.remainingPartyHP / entry.maxPartyHP) * 100 : 0;
                    const healRatio = entry.maxPartyHP > 0 ? (healAmount / entry.maxPartyHP) * 100 : 0;
                    const takenRatio = entry.maxPartyHP > 0 ? (takenDamageAmount / entry.maxPartyHP) * 100 : 0;
                    const enemyTakenAmount = Math.min(entry.enemyHP, Math.max(0, entry.damageDealt));
                    const enemyRemainingAmount = Math.max(0, entry.enemyHP - enemyTakenAmount);
                    const enemyRemainingRatio = entry.enemyHP > 0 ? (enemyRemainingAmount / entry.enemyHP) * 100 : 0;
                    const roomKey = `${diaryLog.id}-${originalIndex}`;
                    const isRoomExpanded = !!expandedRooms[roomKey];

                    return (
                      <div key={roomKey} className="bg-white rounded overflow-hidden">
                        <button
                          onClick={() => onSetExpandedRooms((prev) => ({ ...prev, [roomKey]: !isRoomExpanded }))}
                          className="w-full text-left p-2 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span>
                              <span className="font-medium">{roomLabel}: {entry.enemyName}</span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className={
                                entry.gateInfo ? 'text-gray-500 font-medium' :
                                entry.outcome === 'victory' ? 'text-sub font-medium' :
                                entry.outcome === 'defeat' ? 'text-accent font-medium' : 'text-accent font-medium'
                              }>
                                {entry.gateInfo ? '未到達' :
                                 entry.outcome === 'victory' ? '勝利' :
                                 entry.outcome === 'defeat' ? '敗北' : '引分'}
                              </span>
                              <span className={`transform transition-transform ${isRoomExpanded ? 'rotate-180' : ''}`}>▼</span>
                            </span>
                          </div>
                          {(entry.gateInfo || entry.reward) && (
                            <div className="text-gray-500 mt-1 flex flex-wrap items-center gap-1">
                              {entry.gateInfo && <span className="text-orange-700">解放条件: {entry.gateInfo}</span>}
                              {renderEntryReward(entry)}
                            </div>
                          )}
                          <div className="mt-1 grid grid-cols-2 gap-2 text-gray-600">
                            <div>
                              <div className="mb-0.5">自HP {formatNumber(entry.remainingPartyHP)} / {formatNumber(entry.maxPartyHP)}</div>
                              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full" style={{ width: `${Math.min(100, remainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                <div className="h-full" style={{ width: `${Math.min(100, healRatio)}%`, backgroundColor: '#b8edb2' }} />
                                <div className="h-full" style={{ width: `${Math.min(100, takenRatio)}%`, backgroundColor: 'rgb(var(--color-hp-taken))' }} />
                              </div>
                            </div>
                            <div>
                              <div className="mb-0.5">敵HP {formatNumber(enemyRemainingAmount)} / {formatNumber(entry.enemyHP)}</div>
                              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full" style={{ width: `${Math.min(100, enemyRemainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                              </div>
                            </div>
                          </div>
                        </button>
                        {isRoomExpanded && entry.details && (
                          <div className="border-t border-gray-100 p-2 bg-gray-50 text-xs space-y-1">
                            <div className="font-medium text-gray-600 mb-1">戦闘ログ:</div>
                            {entry.details.map((battleLog, j) => {
                              const isResurrectLog = battleLog.action.includes('は致命ダメージを食いしばって耐えた！');
                              const isPhaseAction = battleLog.actor !== 'deity' && battleLog.actor !== 'effect';
                              const previousLog = j > 0 ? entry.details[j - 1] : undefined;
                              const isStealthEffectLog = battleLog.actor === 'effect' && (battleLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || battleLog.action.includes('への攻撃はすべて幻だった！'));
                              const isCounterNegationEffectLog = battleLog.actor === 'effect' && battleLog.action.includes('反撃無効化により');
                              const previousWasStealthEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || previousLog.action.includes('への攻撃はすべて幻だった！'));
                              const previousWasCounterNegationEffectLog = !!previousLog && previousLog.actor === 'effect' && previousLog.action.includes('反撃無効化により');
                              const previousWasPhaseAction = !!previousLog && (previousLog.actor !== 'deity' && previousLog.actor !== 'effect');
                              const previousContinuesCurrentPhase = !!previousLog && (previousWasPhaseAction || previousWasStealthEffectLog || previousWasCounterNegationEffectLog);
                              const shouldShowPhaseHeader = isPhaseAction && (!previousLog || !previousContinuesCurrentPhase || previousLog.phase !== battleLog.phase);
                              const shouldShowEndPhaseSpacer = !!previousLog && !isPhaseAction && previousWasPhaseAction;
                              const phaseLabel = isPhaseAction
                                ? (battleLog.isCounter || isResurrectLog ? '-' : `${battleLog.initiativeRoll ?? '?'}`)
                                : battleLog.actor === 'deity' ? '末' : (isStealthEffectLog || isCounterNegationEffectLog) ? '-' : '効';
                              const phaseHeader = battleLog.phase === 'long'
                                ? '遠距離攻撃フェーズ'
                                : battleLog.phase === 'mid'
                                  ? '魔法攻撃フェーズ'
                                  : '近接攻撃フェーズ';
                              const getPhaseEmoji = () => {
                                if (battleLog.elementalOffense === 'fire') return '🔥';
                                if (battleLog.elementalOffense === 'thunder') return '⚡';
                                if (battleLog.elementalOffense === 'ice') return '❄️';
                                if (battleLog.phase === 'long') return '🏹';
                                if (battleLog.phase === 'mid') return '🪄';
                                return '⚔';
                              };
                              const emoji = getPhaseEmoji();
                              const isEnemy = battleLog.actor === 'enemy';
                              const hits = battleLog.hits ?? 0;
                              const totalAttempts = battleLog.totalAttempts ?? 0;
                              const allMissed = totalAttempts > 0 && hits === 0 && !battleLog.wasNegated;
                              const hitDisplay = totalAttempts > 0 ? `(${hits}/${totalAttempts}回)` : '';
                              const resonanceMatch = /(\(共鳴\+\d+%\))$/.exec(battleLog.action);
                              const rageDisplay = battleLog.rageBonusPercent && battleLog.rageBonusPercent > 0
                                ? `闘志+${battleLog.rageBonusPercent}%`
                                : '';
                              const momentumDisplay = typeof battleLog.momentumBonusPercent === 'number'
                                ? `気勢${battleLog.momentumBonusPercent >= 0 ? '+' : ''}${battleLog.momentumBonusPercent}%`
                                : '';

                              let actionText: string;
                              if (battleLog.actor === 'effect') {
                                actionText = battleLog.action;
                              } else if (isEnemy) {
                                if (isResurrectLog) {
                                  actionText = `敵${battleLog.action}`;
                                } else if (allMissed) {
                                  actionText = `敵が${battleLog.action.replace('！', 'したが外れた！')}`;
                                } else {
                                  actionText = `敵が${battleLog.action}`;
                                }
                              } else {
                                if (allMissed) {
                                  const charName = battleLog.action.replace(/ の.*$/, '');
                                  actionText = `${charName} の攻撃は外れた！`;
                                } else {
                                  actionText = battleLog.action;
                                }
                              }

                              const extraSegments = [
                                resonanceMatch ? resonanceMatch[1].slice(1, -1) : '',
                                rageDisplay,
                                momentumDisplay,
                              ].filter(Boolean);
                              const compactHitDisplay = hitDisplay && extraSegments.length > 0
                                ? `(${hits}/${totalAttempts}回,${extraSegments.join(',')})`
                                : hitDisplay;
                              const actionDisplay = resonanceMatch && !allMissed
                                ? actionText.replace(/\(共鳴\+\d+%\)$/, '')
                                : actionText;
                              const shouldRenderResurrectBeforeHeader = isResurrectLog && shouldShowPhaseHeader;

                              return (
                                <div key={j}>
                                  {shouldRenderResurrectBeforeHeader && (
                                    <div className="flex justify-between text-gray-600"> 
                                      <span>
                                        <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                        {actionDisplay}
                                        {battleLog.note && <span className="text-gray-400"> {battleLog.note}</span>}
                                        {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                      </span>
                                      {battleLog.damage !== undefined && battleLog.damage > 0 && (
                                        <span className={isEnemy ? 'text-accent' : 'text-sub'}>
                                          ({emoji} {formatNumber(battleLog.damage)})
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {shouldShowPhaseHeader && <div className="text-gray-400">({phaseHeader})</div>}
                                  {(!isResurrectLog || !shouldRenderResurrectBeforeHeader) && (
                                  <div className={`flex justify-between text-gray-600 ${shouldShowEndPhaseSpacer ? 'mt-1' : ''}`}>
                                    <span>
                                      <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                      {actionDisplay}
                                      {battleLog.note && <span className="text-gray-400"> {battleLog.note}</span>}
                                      {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                    </span>
                                    {battleLog.damage !== undefined && battleLog.damage > 0 && (
                                      <span className={isEnemy ? 'text-accent' : 'text-sub'}>
                                        ({emoji} {formatNumber(battleLog.damage)})
                                      </span>
                                    )}
                                  </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SettingTab({
  gameState,
  deityDonations,
  bags,
  onResetGame,
  onImportGameState,
  onAddNotification,
  onResetCommonBags,
  onResetUniqueBags,
  onResetSuperRareBag,
  selectedBestiaryDungeonId,
  onSetSelectedBestiaryDungeonId,
  expandedBestiaryEnemies,
  onSetExpandedBestiaryEnemies,
  bestiaryScrollTop,
  onSetBestiaryScrollTop,
  gameMode,
  onSetGameMode,
  isLunaEnvironment,
}: {
  gameState: GameState;
  deityDonations: Record<string, number>;
  bags: GameBags;
  onResetGame: () => void;
  onImportGameState: (state: GameState) => void;
  onAddNotification: (
    message: string,
    style?: NotificationStyle,
    category?: NotificationCategory,
    isPositive?: boolean
  ) => void;
  onResetCommonBags: () => void;
  onResetUniqueBags: () => void;
  onResetSuperRareBag: () => void;
  selectedBestiaryDungeonId: number;
  onSetSelectedBestiaryDungeonId: Dispatch<SetStateAction<number>>;
  expandedBestiaryEnemies: Record<number, boolean>;
  onSetExpandedBestiaryEnemies: Dispatch<SetStateAction<Record<number, boolean>>>;
  bestiaryScrollTop: number;
  onSetBestiaryScrollTop: Dispatch<SetStateAction<number>>;
  gameMode: GameMode;
  onSetGameMode: Dispatch<SetStateAction<GameMode>>;
  isLunaEnvironment: boolean;
}) {
  type DivineBureauPanelKey = 'modeSelect' | 'donation' | 'clairvoyance' | 'glossary' | 'itemCompendium' | 'bestiary' | 'superRare' | 'gameSetting';
  const DIVINE_BUREAU_PANEL_STORAGE_KEY = 'kemo-expedition.divine-bureau.panel-expanded';
  const defaultDivineBureauPanelState: Record<DivineBureauPanelKey, boolean> = {
    modeSelect: false,
    donation: false,
    clairvoyance: false,
    glossary: false,
    itemCompendium: false,
    bestiary: false,
    superRare: false,
    gameSetting: false,
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [divineBureauPanelExpanded, setDivineBureauPanelExpanded] = useState<Record<DivineBureauPanelKey, boolean>>(defaultDivineBureauPanelState);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [compendiumCategory, setCompendiumCategory] = useState<string>('armor');
  const [compendiumRarityFilter, setCompendiumRarityFilter] = useState<RarityFilter>('all');
  const [glossaryTab, setGlossaryTab] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [expandedCompendiumItems, setExpandedCompendiumItems] = useState<Record<number, boolean>>({});
  const bestiaryListRef = useRef<HTMLDivElement | null>(null);

  const versionTag = APP_VERSION;
  const currentEnv = getEnvironmentId();
  const modeSelectionLocked = isLunaEnvironment;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DIVINE_BUREAU_PANEL_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<Record<DivineBureauPanelKey, boolean>>;
      setDivineBureauPanelExpanded({
        modeSelect: parsed.modeSelect === true,
        donation: parsed.donation === true,
        clairvoyance: parsed.clairvoyance === true,
        glossary: parsed.glossary === true,
        itemCompendium: parsed.itemCompendium === true,
        bestiary: parsed.bestiary === true,
        superRare: parsed.superRare === true,
        gameSetting: parsed.gameSetting === true,
      });
    } catch (error) {
      console.error('Failed to load Divine Bureau panel state:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DIVINE_BUREAU_PANEL_STORAGE_KEY, JSON.stringify(divineBureauPanelExpanded));
    } catch (error) {
      console.error('Failed to persist Divine Bureau panel state:', error);
    }
  }, [divineBureauPanelExpanded]);

  const toggleDivineBureauPanel = (panelKey: DivineBureauPanelKey) => {
    setDivineBureauPanelExpanded((prev) => ({ ...prev, [panelKey]: !prev[panelKey] }));
  };

  const renderDivineBureauPanelHeader = (panelKey: DivineBureauPanelKey, title: string) => {
    const expanded = divineBureauPanelExpanded[panelKey];
    return (
      <button
        type="button"
        onClick={() => toggleDivineBureauPanel(panelKey)}
        className="w-full flex items-center justify-between text-sm font-medium"
      >
        <span>{title}</span>
        <span className={`text-xs text-gray-500 transform transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>
    );
  };

  const getBackupFileName = (): string => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    return `Kemo-Expedition_Backup_${versionTag}_${currentEnv}_${yyyy}${mm}${dd}.json`;
  };

  const handleExportBackup = () => {
    const payload = {
      meta: {
        app: 'Kemo-Expedition',
        version: versionTag,
        env: currentEnv,
        exportedAt: new Date().toISOString(),
      },
      saveData: serializeGameState(gameState),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = getBackupFileName();
    anchor.click();
    URL.revokeObjectURL(url);
    onAddNotification('バックアップをエクスポートしました', 'normal', 'item', true);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;
      const source = parsed && typeof parsed === 'object' && 'saveData' in parsed
        ? (parsed as { saveData: unknown }).saveData
        : parsed;

      if (!source || typeof source !== 'object') {
        window.alert('インポート失敗: 保存データ形式が不正です。');
        return;
      }

      const saveData = source as Partial<GameState>;
      const issues: string[] = [];

      if (!Array.isArray(saveData.parties)) issues.push('parties が存在しない、または配列ではありません。');
      if (!saveData.global || typeof saveData.global !== 'object') {
        issues.push('global が存在しません。');
      } else {
        if (typeof saveData.global.gold !== 'number') issues.push('global.gold が存在しない、または数値ではありません。');
        if (!saveData.global.inventory || typeof saveData.global.inventory !== 'object') issues.push('global.inventory が存在しません。');
      }
      if (!saveData.bags || typeof saveData.bags !== 'object') {
        issues.push('bags が存在しません。');
      } else {
        const requiredBags: Array<keyof GameState['bags']> = [
          'commonRewardBag',
          'commonEnhancementBag',
          'uncommonRewardBag',
          'eliteRareRewardBag',
          'bossRareRewardBag',
          'mythicRareRewardBag',
          'enhancementBag',
          'superRareBag',
          'physicalThreatBag',
          'magicalThreatBag',
        ];
        const missingBags = requiredBags.filter((bagKey) => !(bagKey in saveData.bags!));
        if (missingBags.length > 0) {
          issues.push(`bags に不足があります: ${missingBags.join(', ')}`);
        }
      }
      if (typeof saveData.selectedPartyIndex !== 'number') issues.push('selectedPartyIndex が存在しない、または数値ではありません。');
      if (typeof saveData.buildNumber !== 'number') issues.push('buildNumber が存在しない、または数値ではありません。');

      if (Array.isArray(saveData.parties)) {
        if (saveData.parties.length === 0) {
          issues.push('parties が空です。');
        }
        saveData.parties.forEach((party, index) => {
          if (!party || typeof party !== 'object') {
            issues.push(`party[${index}] が不正です。`);
            return;
          }
          if (!Array.isArray(party.characters)) issues.push(`party[${index}].characters が存在しない、または配列ではありません。`);
        });
      }

      if (parsed && typeof parsed === 'object' && 'meta' in parsed) {
        const meta = (parsed as { meta?: { version?: string; env?: string } }).meta;
        if (meta?.version && meta.version !== versionTag) {
          issues.push(`バージョン差異: 現在 ${versionTag} / ファイル ${meta.version}`);
        }
        if (meta?.env && meta.env !== currentEnv) {
          issues.push(`環境差異: 現在 ${currentEnv} / ファイル ${meta.env}`);
        }
      }

      if (issues.length > 0) {
        const shouldContinue = window.confirm(
          `検証時に注意事項が見つかりました:\n\n- ${issues.join('\n- ')}\n\nこのままインポートを適用しますか？`
        );
        if (!shouldContinue) return;
      }

      const shouldImport = window.confirm(
        'インポートを実行すると現在のセーブデータは完全に置き換わります。\nこの操作は取り消せません。実行しますか？'
      );
      if (!shouldImport) return;

      onImportGameState(saveData as GameState);
      onAddNotification('バックアップをインポートしました', 'normal', 'item', true);
    } catch (error) {
      console.error(error);
      window.alert('インポート失敗: JSONの解析に失敗しました。');
    }
  };

  useEffect(() => {
    bestiaryListRef.current?.scrollTo({ top: bestiaryScrollTop, behavior: 'auto' });
  }, [bestiaryScrollTop]);

  const getInitialCount = (value: number) => ENHANCEMENT_TITLES.find(t => t.value === value)?.tickets ?? 0;
  const craftsmanInitial = getInitialCount(1);
  const demonicInitial = getInitialCount(2);
  const dwellingInitial = getInitialCount(3);
  const legendaryInitial = getInitialCount(4);
  const terribleInitial = getInitialCount(5);
  const ultimateInitial = getInitialCount(6);

  const commonRewardTotal = 100;
  const commonRewardRemaining = getBagTicketTotal(bags.commonRewardBag);
  const commonRewardWins = getBagEntryTickets(bags.commonRewardBag, 1);

  const commonEnhancementTotal = ENHANCEMENT_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const commonEnhancementRemaining = getBagTicketTotal(bags.commonEnhancementBag);
  const commonCraftsmanRemaining = getBagEntryTickets(bags.commonEnhancementBag, 1);
  const commonDemonicRemaining = getBagEntryTickets(bags.commonEnhancementBag, 2);
  const commonDwellingRemaining = getBagEntryTickets(bags.commonEnhancementBag, 3);
  const commonLegendaryRemaining = getBagEntryTickets(bags.commonEnhancementBag, 4);
  const commonTerribleRemaining = getBagEntryTickets(bags.commonEnhancementBag, 5);
  const commonUltimateRemaining = getBagEntryTickets(bags.commonEnhancementBag, 6);

  const uniqueRewardTotal = 100;
  const uncommonRewardRemaining = getBagTicketTotal(bags.uncommonRewardBag);
  const uncommonRewardWins = getBagEntryTickets(bags.uncommonRewardBag, 1);
  const eliteRareRewardRemaining = getBagTicketTotal(bags.eliteRareRewardBag);
  const eliteRareRewardWins = getBagEntryTickets(bags.eliteRareRewardBag, 1);
  const bossRareRewardRemaining = getBagTicketTotal(bags.bossRareRewardBag);
  const bossRareRewardWins = getBagEntryTickets(bags.bossRareRewardBag, 1);
  const mythicRareRewardRemaining = getBagTicketTotal(bags.mythicRareRewardBag);
  const mythicRareRewardWins = getBagEntryTickets(bags.mythicRareRewardBag, 1);

  const enhancementTotal = 5490 + (ENHANCEMENT_TITLES.reduce((sum, t) => sum + (t.value === 0 ? 0 : t.tickets), 0));
  const enhancementRemaining = getBagTicketTotal(bags.enhancementBag);
  const craftsmanRemaining = getBagEntryTickets(bags.enhancementBag, 1);
  const demonicRemaining = getBagEntryTickets(bags.enhancementBag, 2);
  const dwellingRemaining = getBagEntryTickets(bags.enhancementBag, 3);
  const legendaryRemaining = getBagEntryTickets(bags.enhancementBag, 4);
  const terribleRemaining = getBagEntryTickets(bags.enhancementBag, 5);
  const ultimateRemaining = getBagEntryTickets(bags.enhancementBag, 6);

  const confirmReset = (label: string, onConfirm: () => void) => {
    if (!window.confirm(`${label}を実行します。\n現在の抽選状況が初期化されます。\nよろしいですか？`)) {
      return;
    }

    onConfirm();
  };

  const superRareTotal = SUPER_RARE_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const superRareRemaining = getBagTicketTotal(bags.superRareBag);
  const superRareInitial = SUPER_RARE_TITLES.filter(t => t.value > 0).reduce((sum, t) => sum + t.tickets, 0);
  const superRareHits = SUPER_RARE_TITLES.filter(t => t.value > 0).reduce((sum, t) => sum + getBagEntryTickets(bags.superRareBag, t.value), 0);

  const donationByDeity = DEITY_OPTIONS.reduce<Record<string, number>>((totals, deity) => {
    const deityName = normalizeDeityName(deity.name);
    totals[deityName] = deityDonations[deityName] ?? 0;
    return totals;
  }, {});

  Object.entries(deityDonations).forEach(([deityName, donation]) => {
    const normalizedDeityName = normalizeDeityName(deityName);
    donationByDeity[normalizedDeityName] = Math.max(donationByDeity[normalizedDeityName] ?? 0, donation);
  });

  const donationRows = Object.entries(donationByDeity)
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0], 'ja'))
    .map(([deityName, donationGold]) => ({
      deityName,
      donationGold,
      rank: donationGold > 0 ? getDeityRank(donationGold) : 1,
      nextDonationThreshold: getNextDonationThreshold(donationGold),
    }));

  const compendiumItems = ITEMS
    .filter(item =>
      item.category === compendiumCategory &&
      matchesRarityFilter(item.id, compendiumRarityFilter)
    )
    .slice()
    .sort((a, b) => b.id - a.id);

  const glossarySectionsByTab: Record<'A' | 'B' | 'C' | 'D', string> = {
    A: 'a.',
    B: 'b.',
    C: 'c.',
    D: 'd.',
  };
  const filteredGlossarySections = GLOSSARY_SECTIONS.filter((section) =>
    section.heading.toLowerCase().includes(glossarySectionsByTab[glossaryTab])
  );

  const BESTIARY_TAB_LABELS: Record<number, string> = {
    1: '原',
    2: '崖',
    3: '樹',
    4: '峰',
    5: '茂',
    6: '巣',
    7: '園',
    8: '谷',
    9: '神',
  };

  const BESTIARY_SPECIAL_DUNGEON_ID_GODS = 9;
  const isGodBestiaryTab = selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_GODS;
  const bestiaryTabOptions = [
    ...DUNGEONS.map((dungeon) => ({ id: dungeon.id, name: dungeon.name })),
    { id: BESTIARY_SPECIAL_DUNGEON_ID_GODS, name: '神魔' },
  ];

  const selectedBestiaryDungeon = DUNGEONS.find(d => d.id === selectedBestiaryDungeonId) ?? DUNGEONS[0];

  const selectedBestiaryGroups = selectedBestiaryDungeon.floors
    ? selectedBestiaryDungeon.floors
      .slice()
      .sort((a, b) => b.floorNumber - a.floorNumber)
      .flatMap(floor => {
        const tierNormals = ENEMIES
          .filter(enemy => enemy.poolId === selectedBestiaryDungeon.id && enemy.type === 'normal')
          .sort((a, b) => a.id - b.id);
        const tierElites = ENEMIES
          .filter(enemy => enemy.poolId === selectedBestiaryDungeon.id && enemy.type === 'elite')
          .sort((a, b) => a.id - b.id);

        // pool_v has 5 enemies: pool_1 => first 5 normals ... pool_6 => last 5 normals
        const poolIndex = Math.max(1, Math.min(6, floor.floorNumber)) - 1;
        const normalEnemies = tierNormals.slice(poolIndex * 5, poolIndex * 5 + 5);

        const groups: Array<{ key: string; label: string; enemies: EnemyDef[]; floorNumber: number; groupType: 'boss' | 'elite' | 'normal' }> = [];

        if (floor.floorNumber === 6) {
          const bossEnemy = ENEMIES.find(enemy => enemy.id === selectedBestiaryDungeon.bossId);
          if (bossEnemy) {
            groups.push({
              key: 'boss',
              label: 'BOSS',
              enemies: [bossEnemy],
              floorNumber: floor.floorNumber,
              groupType: 'boss',
            });
          }
          groups.push({
            key: 'floor-6',
            label: 'Floor 6',
            enemies: normalEnemies,
            floorNumber: floor.floorNumber,
            groupType: 'normal',
          });
          return groups;
        }

        const fixedElite = tierElites[floor.floorNumber - 1];
        if (fixedElite) {
          groups.push({
            key: `floor-${floor.floorNumber}-elite`,
            label: `Floor ${floor.floorNumber} Elite`,
            enemies: [fixedElite],
            floorNumber: floor.floorNumber,
            groupType: 'elite',
          });
        }

        groups.push({
          key: `floor-${floor.floorNumber}`,
          label: `Floor ${floor.floorNumber}`,
          enemies: normalEnemies,
          floorNumber: floor.floorNumber,
          groupType: 'normal',
        });

        return groups;
      })
    : [];

  const godBestiaryRows = GOD_ENEMY_PROFILES
    .slice()
    .sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name));

  const formatEnemyAttackLine = (label: string, attack: number, noA: number, amplifier: number) =>
    `${label}: ${formatNumber(attack)} x ${formatNumber(noA)}回 (x${amplifier.toFixed(2)})`;

  const hasEnemyAttack = (attack: number, noA: number) => attack > 0 && noA > 0;

  const formatEnemyDefenseLine = (label: string, defense: number, percent: number) =>
    `${label}: ${formatNumber(defense)} (${percent.toFixed(0)}%)`;

  const ENEMY_ELEMENT_LABELS: Record<string, string> = {
    none: '無',
    fire: '炎',
    thunder: '雷',
    ice: '氷',
  };

  const formatEnemyElementalResistanceLine = (enemy: EnemyDef): string => {
    const resistanceOrder: Array<{ key: 'fire' | 'ice' | 'thunder'; emoji: string }> = [
      { key: 'fire', emoji: '🔥' },
      { key: 'ice', emoji: '❄️' },
      { key: 'thunder', emoji: '⚡' },
    ];

    const parts = resistanceOrder.map(({ key, emoji }) => {
      const value = enemy.elementalResistance[key] ?? 1;
      return `${emoji}${Math.round(value * 100)}%`;
    });

    return `属性耐性: ${parts.join(',')}`;
  };

  const getEnemyDisplayNameWithClass = (enemy: EnemyDef): string => {
    const shortName = CLASS_SHORT_NAMES[enemy.enemyClass];
    return shortName ? `${enemy.name}(${shortName})` : enemy.name;
  };

  const ENEMY_CLASS_LABELS: Record<string, string> = {
    fighter: '戦士',
    duelist: '剣士',
    ninja: '忍者',
    samurai: '侍',
    lord: '君主',
    ranger: '狩人',
    wizard: '魔法使い',
    sage: '賢者',
    rogue: '盗賊',
    pilgrim: '巡礼者',
  };

  const getDisplayEnemy = (
    enemy: EnemyDef,
    dungeon: Dungeon,
    floorNumber: number,
    groupType: 'boss' | 'elite' | 'normal'
  ): EnemyDef => {
    const roomType = groupType === 'boss' ? 'battle_Boss' : groupType === 'elite' ? 'battle_Elite' : 'battle_Normal';
    const effectiveTier = getEffectiveExpeditionTier(dungeon.id, gameMode === 'm.luna');
    const effectiveDungeon = {
      ...dungeon,
      tier: effectiveTier,
      enemyMultipliers: getEffectiveEnemyMultipliers(dungeon, gameMode === 'm.luna'),
    };
    return applyEnemyEncounterScaling(enemy, effectiveDungeon, floorNumber, roomType);
  };

  const getGodRuntimeEnemy = (god: (typeof GOD_ENEMY_PROFILES)[number]): EnemyDef | null =>
    buildGodRuntimeEnemy(god, gameMode === 'm.luna');

  const getGodDropCandidates = (godName: string): string => {
    const drops = GOD_MYTHIC_DROPS
      .filter((drop) => drop.dropBy === godName)
      .map((drop) => `${getRarityShortLabel(drop.tier * 1000 + 500)}${drop.name}`);
    return drops.length > 0 ? drops.join(' / ') : 'なし';
  };

  const formatAbilitiesWithLevels = (
    abilities: Array<{ id: string; level: number }>,
  ): string => {
    if (abilities.length === 0) return 'なし';

    return abilities
      .map((ability) => `${ABILITY_NAMES[ability.id] ?? ability.id}${ability.level}`)
      .join(', ');
  };

  return (
    <div>
      <div className="bg-pane rounded-lg p-4 mb-4">
        {renderDivineBureauPanelHeader('modeSelect', 'モード切替')}
        {divineBureauPanelExpanded.modeSelect && <div className="mt-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => !modeSelectionLocked && onSetGameMode('m.kemo')}
              disabled={modeSelectionLocked}
              className={`py-2 rounded border text-sm font-medium ${
                gameMode === 'm.kemo'
                  ? 'bg-sub text-white border-sub'
                  : 'bg-white text-gray-700 border-gray-300'
              } ${modeSelectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              ケモ
            </button>
            <button
              onClick={() => !modeSelectionLocked && onSetGameMode('m.luna')}
              disabled={modeSelectionLocked}
              className={`py-2 rounded border text-sm font-medium ${
                gameMode === 'm.luna'
                  ? 'bg-sub text-white border-sub'
                  : 'bg-white text-gray-700 border-gray-300'
              } ${modeSelectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              ルナ
            </button>
          </div>
          <div className="mt-2 rounded bg-white p-2 text-xs text-gray-600">
            {modeSelectionLocked
              ? 'ゲームモードはluna固定で変更する事は出来ません'
              : gameMode === 'm.kemo'
                ? '通常のモードです'
                : '敵が大幅に強くなります(少しだけ報酬がよくなります)'}
          </div>
        </div>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        {renderDivineBureauPanelHeader('donation', '寄付箱')}
        {divineBureauPanelExpanded.donation && <div className="bg-white rounded p-2 text-sm space-y-1 mt-3">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500 border-b border-gray-100 pb-1 mb-1">
            <span>神格</span>
            <span>寄付額</span>
          </div>
          {donationRows.length > 0 ? (
            donationRows.map(({ deityName, donationGold, rank, nextDonationThreshold }) => (
              <div key={deityName} className="flex items-center justify-between gap-3">
                <span className="text-gray-700">{deityName}(ランク{rank})</span>
                <span className="text-sub tabular-nums">{formatNumber(donationGold)}G <span className="text-xs text-gray-500">(次のランク {nextDonationThreshold !== null ? `${formatNumber(nextDonationThreshold)}G` : '到達済み'})</span></span>
              </div>
            ))
          ) : (
            <div className="text-gray-500">まだ寄付の記録がありません</div>
          )}
        </div>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        {renderDivineBureauPanelHeader('clairvoyance', '未来視')}
        {divineBureauPanelExpanded.clairvoyance && <>

        <div className="mb-4 border-b border-gray-200 pb-4">
          <div className="text-xs text-gray-600 font-medium mb-2">通常報酬 (Normal reward)</div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">common_reward_bag (通常報酬 抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{formatNumber(commonRewardRemaining)} / {formatNumber(commonRewardTotal)}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{formatNumber(commonRewardWins)}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">common_enhancement_bag (称号付与 抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>通常称号抽選</span><span>{formatNumber(commonEnhancementRemaining)} / {formatNumber(commonEnhancementTotal)}</span></div>
              <div className="flex justify-between text-sub"><span>名工の残り</span><span>{formatNumber(commonCraftsmanRemaining)} / {formatNumber(craftsmanInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>魔性の残り</span><span>{formatNumber(commonDemonicRemaining)} / {formatNumber(demonicInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>宿った残り</span><span>{formatNumber(commonDwellingRemaining)} / {formatNumber(dwellingInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>伝説の残り</span><span>{formatNumber(commonLegendaryRemaining)} / {formatNumber(legendaryInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>恐ろしい残り</span><span>{formatNumber(commonTerribleRemaining)} / {formatNumber(terribleInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>究極の残り</span><span>{formatNumber(commonUltimateRemaining)} / {formatNumber(ultimateInitial)}</span></div>
            </div>
          </div>

          <button
            onClick={() => confirmReset('通常報酬初期化', onResetCommonBags)}
            className="w-full py-2 bg-sub text-white rounded text-sm font-medium"
          >
            通常報酬初期化
          </button>
        </div>

        <div className="mb-4 border-b border-gray-200 pb-4">
          <div className="text-xs text-gray-600 font-medium mb-2">固有報酬 (Unique reward)</div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">uncommon_reward_bag (アンコモン抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{formatNumber(uncommonRewardRemaining)} / {formatNumber(uniqueRewardTotal)}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{formatNumber(uncommonRewardWins)}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">elite_rare_reward_bag (エリートレア抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{formatNumber(eliteRareRewardRemaining)} / {formatNumber(uniqueRewardTotal)}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{formatNumber(eliteRareRewardWins)}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">boss_rare_reward_bag (ボスレア抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{formatNumber(bossRareRewardRemaining)} / {formatNumber(uniqueRewardTotal)}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{formatNumber(bossRareRewardWins)}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">mythic_rare_reward_bag (神魔レア抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{formatNumber(mythicRareRewardRemaining)} / 50</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{formatNumber(mythicRareRewardWins)}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">enhancement_bag (称号付与 抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>通常称号抽選</span><span>{formatNumber(enhancementRemaining)} / {formatNumber(enhancementTotal)}</span></div>
              <div className="flex justify-between text-sub"><span>名工の残り</span><span>{formatNumber(craftsmanRemaining)} / {formatNumber(craftsmanInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>魔性の残り</span><span>{formatNumber(demonicRemaining)} / {formatNumber(demonicInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>宿った残り</span><span>{formatNumber(dwellingRemaining)} / {formatNumber(dwellingInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>伝説の残り</span><span>{formatNumber(legendaryRemaining)} / {formatNumber(legendaryInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>恐ろしい残り</span><span>{formatNumber(terribleRemaining)} / {formatNumber(terribleInitial)}</span></div>
              <div className="flex justify-between text-sub"><span>究極の残り</span><span>{formatNumber(ultimateRemaining)} / {formatNumber(ultimateInitial)}</span></div>
            </div>
          </div>

          <button
            onClick={() => confirmReset('固有報酬初期化', onResetUniqueBags)}
            className="w-full py-2 bg-sub text-white rounded text-sm font-medium"
          >
            固有報酬初期化
          </button>
        </div>

        <div className="mb-2">
          <div className="text-xs text-gray-600 font-medium mb-2">超レア報酬 (Super rare reward)</div>
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">superRare_bag (称号超レア称号付与 抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>超レア称号抽選</span><span>{formatNumber(superRareRemaining)} / {formatNumber(superRareTotal)}</span></div>
              <div className="flex justify-between text-accent"><span>超レア残り</span><span>{formatNumber(superRareHits)} / {formatNumber(superRareInitial)}</span></div>
            </div>
          </div>
          <button
            onClick={() => confirmReset('超レア報酬初期化', onResetSuperRareBag)}
            className="w-full py-2 bg-accent text-white rounded text-sm font-medium"
          >
            超レア報酬初期化
          </button>
        </div>
        </>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        {renderDivineBureauPanelHeader('glossary', '用語集')}
        {divineBureauPanelExpanded.glossary && (
          <>
          <div className="flex justify-end items-center gap-1 mt-3 mb-3">
            <span className="text-xs text-gray-500">分類</span>
            {(['A', 'B', 'C', 'D'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setGlossaryTab(tab)}
                className={`text-xs px-2 py-0.5 border rounded ${
                  glossaryTab === tab
                    ? 'bg-sub text-white border-sub'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-3 pr-1">
            {filteredGlossarySections.map((section) => (
              <div key={section.id} className="bg-white rounded p-2 border border-gray-200">
                <div className="text-xs leading-tight mb-2">
                  {(() => {
                    const suffixMatch = section.subtitle.match(/\(([^)]*)\)\s*$/);
                    const titleText = section.subtitle.replace(/\s*\([^)]*\)\s*$/, '');
                    return (
                      <>
                        <span className="font-semibold text-gray-700">{titleText}</span>
                        {suffixMatch && <span className="text-gray-500"> {suffixMatch[0]}</span>}
                      </>
                    );
                  })()}
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {section.entries.map((entry, index) => (
                    <div key={`${section.id}-${entry.key}-${index}`} className="text-xs border-t border-gray-100 pt-1 first:border-t-0 first:pt-0">
                      <div className="text-gray-700 font-medium">{renderTextWithRaceIcons(entry.label)}</div>
                      <div className="text-gray-500 whitespace-pre-line">{renderTextWithRaceIcons(entry.description)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        {renderDivineBureauPanelHeader('itemCompendium', 'アイテム図鑑')}
        {divineBureauPanelExpanded.itemCompendium && <>
        <div className="flex justify-end items-center gap-1 mt-3 mb-3">
          <span className="text-xs text-gray-500">
            {compendiumRarityFilter === 'all' ? '全て表示' : `${RARITY_FILTER_NOTES[compendiumRarityFilter]}のみ`}
          </span>
          {RARITY_FILTER_OPTIONS.map(filter => (
            <button
              key={filter}
              onClick={() => setCompendiumRarityFilter(filter)}
              className={`text-xs px-1.5 py-0.5 border rounded ${
                compendiumRarityFilter === filter
                  ? 'bg-sub text-white border-sub'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
              title={RARITY_FILTER_NOTES[filter]}
            >
              {RARITY_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {CATEGORY_GROUPS.map(group => (
            <div key={group.id} className="flex flex-col">
              <div className="text-xs text-gray-400 text-center mb-0.5">{group.label}</div>
              <div className="flex">
                {group.categories.map((cat, i) => (
                  <button
                    key={cat}
                    onClick={() => setCompendiumCategory(cat)}
                    className={`px-2 py-1 text-sm ${
                      i === 0 ? 'rounded-l' : i === group.categories.length - 1 ? 'rounded-r' : ''
                    } ${
                      compendiumCategory === cat
                        ? 'bg-sub text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {CATEGORY_SHORT_NAMES[cat]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {compendiumItems.map(item => {
            const baseItem: Item = { ...item, enhancement: 0, superRare: 0 };
            const expanded = !!expandedCompendiumItems[item.id];
            return (
              <div key={item.id} className="bg-white rounded border border-gray-200">
                <button
                  onClick={() => setExpandedCompendiumItems(prev => ({ ...prev, [item.id]: !expanded }))}
                  className="w-full text-left px-3 py-2 text-sm flex justify-between items-center"
                >
                  <span>
                    <span className="text-black">{item.name}</span>
                    <span className="text-gray-500"> {getRarityShortLabel(item.id, item.name)} {renderTextWithRaceIcons(getItemStats(baseItem))}</span>
                  </span>
                  <span className="text-xs text-gray-500">{expanded ? '▲' : '▼'}</span>
                </button>
                {expanded && (
                  <div className="px-3 pb-2 text-xs text-gray-700 space-y-1 border-t border-gray-100 pt-2">
                    <div>ID: {item.id}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        {renderDivineBureauPanelHeader('bestiary', '敵キャラクター図鑑')}
        {divineBureauPanelExpanded.bestiary && <>
        <div className="flex gap-1 mt-3 mb-3 overflow-x-auto pb-1">
          {bestiaryTabOptions.map(dungeon => (
            <button
              key={dungeon.id}
              onClick={() => onSetSelectedBestiaryDungeonId(dungeon.id)}
              className={`px-2 py-1 text-sm rounded ${
                selectedBestiaryDungeonId === dungeon.id
                  ? 'bg-sub text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={dungeon.name}
            >
              {BESTIARY_TAB_LABELS[dungeon.id] ?? dungeon.id}
            </button>
          ))}
        </div>
        <div
          ref={bestiaryListRef}
          className="space-y-2 max-h-96 overflow-y-auto pr-1"
          onScroll={() => {
            const currentScrollTop = bestiaryListRef.current?.scrollTop ?? 0;
            onSetBestiaryScrollTop(currentScrollTop);
          }}
        >
          <div className="text-xs text-gray-500">{isGodBestiaryTab ? '神魔' : selectedBestiaryDungeon.name}</div>
          {isGodBestiaryTab && godBestiaryRows.map((god, index) => {
            const godBestiaryId = 900000 + index;
            const godExpanded = !!expandedBestiaryEnemies[godBestiaryId];
            const godRuntimeEnemy = getGodRuntimeEnemy(god);
            const godClassShortName = CLASS_SHORT_NAMES[god.enemyClass];
            return (
              <div key={god.name} className="mt-2 border border-gray-100 rounded bg-white">
                <button
                  onClick={() => onSetExpandedBestiaryEnemies(prev => ({ ...prev, [godBestiaryId]: !godExpanded }))}
                  className="w-full text-left px-2 py-1 text-sm flex justify-between items-center"
                >
                  <span>{renderEnemyNameWithMutedClass(godClassShortName ? `${god.displayName}(${godClassShortName})` : god.displayName)}</span>
                  <span className="text-xs text-gray-500">{godExpanded ? '▲' : '▼'}</span>
                </button>
                {godExpanded && (
                  <div className="px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>ID: {godRuntimeEnemy ? godRuntimeEnemy.id : god.name}</div>
                      <div>レベル: {formatNumber(god.level)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>HP: {formatNumber(godRuntimeEnemy?.hp ?? 0)}</div>
                      <div>クラス: {ENEMY_CLASS_LABELS[god.enemyClass] ?? god.enemyClass}</div>
                    </div>
                    {godRuntimeEnemy && (
                      <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {(() => {
                            const hasRangedAttack = hasEnemyAttack(godRuntimeEnemy.rangedAttack, godRuntimeEnemy.rangedNoA);
                            const hasMeleeAttack = hasEnemyAttack(godRuntimeEnemy.meleeAttack, godRuntimeEnemy.meleeNoA);
                            const hasMagicalAttack = hasEnemyAttack(godRuntimeEnemy.magicalAttack, godRuntimeEnemy.magicalNoA);
                            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
                            const decay = (0.90 + godRuntimeEnemy.accuracyBonus).toFixed(3);
                            const defenseAmplifierPercent = godRuntimeEnemy.defenseAmplifier * 100;

                            const offenseRows: string[] = [];
                            if (hasRangedAttack) {
                              offenseRows.push(formatEnemyAttackLine('遠距離攻撃', godRuntimeEnemy.rangedAttack, godRuntimeEnemy.rangedNoA, godRuntimeEnemy.rangedAttackAmplifier));
                            }
                            if (hasMeleeAttack) {
                              offenseRows.push(formatEnemyAttackLine('近接攻撃', godRuntimeEnemy.meleeAttack, godRuntimeEnemy.meleeNoA, godRuntimeEnemy.meleeAttackAmplifier));
                            }
                            if (hasPhysicalAttack) {
                              offenseRows.push(`物理命中率: 100% (減衰: x${decay})`);
                            }
                            if (hasMagicalAttack) {
                              offenseRows.push(formatEnemyAttackLine('魔法攻撃', godRuntimeEnemy.magicalAttack, godRuntimeEnemy.magicalNoA, godRuntimeEnemy.magicalAttackAmplifier));
                              offenseRows.push(`魔法命中率: 100% (減衰: x${decay})`);
                            }

                            const defenseRows: string[] = [
                              `属性: ${ENEMY_ELEMENT_LABELS[godRuntimeEnemy.elementalOffense] ?? '無'} (x1.0)`,
                              formatEnemyDefenseLine('物理防御', godRuntimeEnemy.physicalDefense, defenseAmplifierPercent),
                              formatEnemyDefenseLine('魔法防御', godRuntimeEnemy.magicalDefense, defenseAmplifierPercent),
                              `回避: ${formatNumber(Math.round(godRuntimeEnemy.evasionBonus * 1000))}`,
                            ];

                            const rowCount = Math.max(offenseRows.length, defenseRows.length);
                            return Array.from({ length: rowCount }).flatMap((_, index) => [
                              <div key={`god-off-${index}`}>{offenseRows[index] ?? ''}</div>,
                              <div key={`god-def-${index}`}>{defenseRows[index] ?? ''}</div>,
                            ]);
                          })()}
                        </div>
                        <div>{formatEnemyElementalResistanceLine(godRuntimeEnemy)}</div>
                      </>
                    )}
                    <div>アビリティ: {formatAbilitiesWithLevels(god.abilities)}</div>
                    <div>待機探検地: {god.expedition}</div>
                    <div className="pt-1">ドロップ候補: {getGodDropCandidates(god.name)}</div>
                  </div>
                )}
              </div>
            );
          })}
          {!isGodBestiaryTab && selectedBestiaryGroups.map(group => (
            <div key={group.key} className="bg-white rounded border border-gray-200 p-2">
              <div className="text-xs text-gray-500 font-medium mb-1">{group.label}</div>
              {group.enemies.map(enemy => {
                const displayEnemy = getDisplayEnemy(enemy, selectedBestiaryDungeon, group.floorNumber, group.groupType);
                const enemyLevelFinal = getEffectiveEnemyLevel(selectedBestiaryDungeon.expLevel, group.floorNumber, gameMode === 'm.luna');
                const enemyClass = ENEMY_CLASS_LABELS[displayEnemy.enemyClass] ?? '不明';
                const enemyExpanded = !!expandedBestiaryEnemies[displayEnemy.id];
                const defenseAmplifierPercent = displayEnemy.defenseAmplifier * 100;
                return (
                  <div key={displayEnemy.id} className="mt-2 border border-gray-100 rounded">
                    <button
                      onClick={() => onSetExpandedBestiaryEnemies(prev => ({ ...prev, [displayEnemy.id]: !enemyExpanded }))}
                      className="w-full text-left px-2 py-1 text-sm flex justify-between items-center"
                    >
                      <span>{renderEnemyNameWithMutedClass(getEnemyDisplayNameWithClass(displayEnemy))}</span>
                      <span className="text-xs text-gray-500">{enemyExpanded ? '▲' : '▼'}</span>
                    </button>
                    {enemyExpanded && (
                      <div className="px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>ID: {displayEnemy.id}</div>
                          <div>レベル: {formatNumber(enemyLevelFinal)}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>HP: {formatNumber(displayEnemy.hp)}</div>
                          <div>クラス: {enemyClass}</div>
                          {(() => {
                            const hasRangedAttack = hasEnemyAttack(displayEnemy.rangedAttack, displayEnemy.rangedNoA);
                            const hasMeleeAttack = hasEnemyAttack(displayEnemy.meleeAttack, displayEnemy.meleeNoA);
                            const hasMagicalAttack = hasEnemyAttack(displayEnemy.magicalAttack, displayEnemy.magicalNoA);
                            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
                            const decay = (0.90 + displayEnemy.accuracyBonus).toFixed(3);

                            const offenseRows: string[] = [];
                            if (hasRangedAttack) {
                              offenseRows.push(formatEnemyAttackLine('遠距離攻撃', displayEnemy.rangedAttack, displayEnemy.rangedNoA, displayEnemy.rangedAttackAmplifier));
                            }
                            if (hasMeleeAttack) {
                              offenseRows.push(formatEnemyAttackLine('近接攻撃', displayEnemy.meleeAttack, displayEnemy.meleeNoA, displayEnemy.meleeAttackAmplifier));
                            }
                            if (hasPhysicalAttack) {
                              offenseRows.push(`物理命中率: 100% (減衰: x${decay})`);
                            }
                            if (hasMagicalAttack) {
                              offenseRows.push(formatEnemyAttackLine('魔法攻撃', displayEnemy.magicalAttack, displayEnemy.magicalNoA, displayEnemy.magicalAttackAmplifier));
                              offenseRows.push(`魔法命中率: 100% (減衰: x${decay})`);
                            }

                            // Bestiary detail keeps the compact 4-line defense block.
                            const defenseRows: string[] = [
                              `属性: ${ENEMY_ELEMENT_LABELS[displayEnemy.elementalOffense] ?? '無'} (x1.0)`,
                              formatEnemyDefenseLine('物理防御', displayEnemy.physicalDefense, defenseAmplifierPercent),
                              formatEnemyDefenseLine('魔法防御', displayEnemy.magicalDefense, defenseAmplifierPercent),
                              `回避: ${formatNumber(Math.round(displayEnemy.evasionBonus * 1000))}`,
                            ];

                            const rowCount = Math.max(offenseRows.length, defenseRows.length);
                            return Array.from({ length: rowCount }).flatMap((_, index) => [
                              <div key={`off-${index}`}>{offenseRows[index] ?? ''}</div>,
                              <div key={`def-${index}`}>{defenseRows[index] ?? ''}</div>,
                            ]);
                          })()}
                        </div>
                        <div>{formatEnemyElementalResistanceLine(displayEnemy)}</div>
                        <div>アビリティ: {formatAbilitiesWithLevels(displayEnemy.abilities)}</div>
                        <div className="pt-1">ドロップ候補: {getEnemyDropCandidates(displayEnemy).map(item => `${getRarityShortLabel(item.id, item.name)}${item.name}`).join(' / ')}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        </>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        {renderDivineBureauPanelHeader('superRare', '超レア一覧')}
        {divineBureauPanelExpanded.superRare && <>
        <div className="text-xs text-gray-500 mt-3 mb-2">Super Rare List (超レア一覧)</div>
        <div className="bg-white rounded p-2 text-sm space-y-1 max-h-72 overflow-y-auto">
          {SUPER_RARE_TITLES.filter(title => title.value > 0).map(title => {
            const uniqueBonus = formatBonuses(title.bonuses ?? [], { defenseMultiplierStyle: 'friendly' });
            return (
              <div key={title.value} className="grid grid-cols-[auto,1fr] gap-x-2 border-b border-gray-100 last:border-b-0 py-1">
                <div className="text-gray-500">{title.value}.</div>
                <div>
                  <div className="font-medium text-gray-700">{title.title}</div>
                  <div className="text-xs text-sub">{uniqueBonus || 'なし'}</div>
                </div>
              </div>
            );
          })}
        </div>
        </>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        {renderDivineBureauPanelHeader('gameSetting', 'ゲーム設定')}
        {divineBureauPanelExpanded.gameSetting && <div className="space-y-4 mt-3">
          <div>
            <div className="text-sm font-medium mb-1">バックアップ（Export）</div>
            <button
              onClick={handleExportBackup}
              className="w-full py-2 bg-sub text-white rounded font-medium"
            >
              バックアップをダウンロード
            </button>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">インポート（Import）</div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="w-full py-2 bg-sub text-white rounded font-medium"
            >
              バックアップファイルを選択
            </button>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">フルリセット（Reset）</div>
            {!showResetConfirm ? (
              <button onClick={() => setShowResetConfirm(true)} className="w-full py-2 bg-accent text-white rounded font-medium">ゲームをリセット</button>
            ) : (
              <div>
                <div className="text-sm text-accent mb-2 p-2 bg-orange-50 rounded border border-orange-200">本当にリセットしますか？全てのデータが失われます。この操作は取り消せません。</div>
                <div className="flex gap-2">
                  <button onClick={() => { onResetGame(); setShowResetConfirm(false); }} className="flex-1 py-2 bg-accent text-white rounded font-medium">リセット実行</button>
                  <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 bg-gray-300 rounded font-medium">キャンセル</button>
                </div>
              </div>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}
