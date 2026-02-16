import { useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction } from 'react';
import { GameState, GameBags, Item, Character, InventoryRecord, InventoryVariant, NotificationStyle, NotificationCategory, EnemyDef, Dungeon, Party, DiaryRarityThreshold, DiarySettings, ExpeditionLogEntry, ExpeditionDepthLimit } from '../types';
import { computePartyStats } from '../game/partyComputation';
import { DUNGEONS } from '../data/dungeons';
import { RACES } from '../data/races';
import { CLASSES, CLASS_SHORT_NAMES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES, ITEMS } from '../data/items';
import { getItemDisplayName } from '../game/gameState';
import { ENEMIES, getEnemyDropCandidates } from '../data/enemies';
import { applyEnemyEncounterScaling } from '../game/enemyScaling';
import { DEITY_OPTIONS, getDeityEffectDescription, getDeityRank, getNextDonationThreshold, normalizeDeityName } from '../game/deity';
import { LEVEL_EXP } from '../game/partyLevel';
import { createEnvironmentStorageKey, getEnvLabel } from '../game/environment';
import {
  ELITE_GATE_REQUIREMENTS,
  ENTRY_GATE_REQUIRED,
  BOSS_GATE_REQUIRED,
  getEntryGateKey,
  getEliteGateKey,
  getBossGateKey,
  getLootCollectionCount,
  isLootGateUnlocked,
} from '../game/lootGate';

interface HomeScreenProps {
  state: GameState;
  bags: GameBags;
  actions: {
    selectParty: (partyIndex: number) => void;
    selectDungeon: (partyIndex: number, dungeonId: number) => void;
    setExpeditionDepthLimit: (partyIndex: number, depthLimit: ExpeditionDepthLimit) => void;
    runExpedition: (partyIndex: number) => void;
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
    setVariantStatus: (variantKey: string, status: 'notown') => void;
    markDiaryLogSeen: (logId: string) => void;
    markAllDiaryLogsSeen: () => void;
    updateDiarySettings: (partyIndex: number, settings: Partial<DiarySettings>) => void;
    simulateAfk: (elapsedMs: number, isAutoRepeatEnabled: boolean) => void;
    resetGame: () => void;
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

type Tab = 'party' | 'expedition' | 'inventory' | 'diary' | 'setting';


type PartyCycleState = '休息中' | '宴会中' | '睡眠中' | '祈り中' | '待機中' | '移動中' | '探索中' | '帰還中';

interface PartyCycleRuntime {
  state: PartyCycleState;
  stateStartedAt: number;
  durationMs: number;
}

const PARTY_CYCLE_TICK_MS = 100;
const EXPLORING_PROGRESS_STEP_MS = 1000;
const EXPLORING_PROGRESS_TOTAL_STEPS = 24;
const AFK_RUNTIME_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-afk-runtime');
const AFK_MAX_ELAPSED_MS = 60 * 60 * 1000;
const HEADER_HEIGHT_CLASS = 'pt-[108px]';

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

type ItemRarity = 'common' | 'uncommon' | 'rare' | 'mythic';
type RarityFilter = 'all' | ItemRarity;

const RARITY_SHORT_LABELS: Record<ItemRarity, string> = {
  common: '[C]',
  uncommon: '[U]',
  rare: '[R]',
  mythic: '[M]',
};

const RARITY_FILTER_LABELS: Record<RarityFilter, string> = {
  all: 'ALL',
  common: 'C',
  uncommon: 'U',
  rare: 'R',
  mythic: 'M',
};

const RARITY_FILTER_NOTES: Record<RarityFilter, string> = {
  all: '全て',
  common: '通常',
  uncommon: 'アンコモン',
  rare: 'レア',
  mythic: '神魔レア',
};

const RARITY_FILTER_OPTIONS: RarityFilter[] = ['all', 'common', 'uncommon', 'rare', 'mythic'];

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

function getItemRarityById(itemId: number): ItemRarity {
  const rarityCode = itemId % 1000;
  if (rarityCode >= 400) return 'mythic';
  if (rarityCode >= 300) return 'rare';
  if (rarityCode >= 200) return 'uncommon';
  return 'common';
}

function getRarityShortLabel(itemId: number): string {
  return RARITY_SHORT_LABELS[getItemRarityById(itemId)];
}

function matchesRarityFilter(itemId: number, filter: RarityFilter): boolean {
  if (filter === 'all') return true;
  return getItemRarityById(itemId) === filter;
}

function getRarityTextClass(rarity: ItemRarity, isSuperRare: boolean): string {
  if (isSuperRare) return 'text-orange-700 font-bold';
  if (rarity === 'rare') return 'text-blue-600';
  if (rarity === 'mythic') return 'text-orange-700';
  return 'text-black';
}

function getRewardTextClass(rarity?: ItemRarity, isSuperRare?: boolean): string {
  if (isSuperRare) return 'text-orange-700';
  if (rarity === 'mythic') return 'text-orange-700';
  if (rarity === 'rare') return 'text-blue-600';
  return 'text-black';
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
          return (
            <span key={`${item.id}-${item.enhancement}-${item.superRare}-${index}`} className={`${rarityClass} ${isSuperRare ? 'font-bold' : 'font-medium'}`}>
              {index > 0 && ' / '}
              {getItemDisplayName(item)}
            </span>
          );
        })}
      </>
    );
  }

  return (
    <span className={`${getRewardTextClass(entry.rewardRarity, entry.rewardIsSuperRare)} ${entry.rewardIsSuperRare ? 'font-bold' : 'font-medium'}`}>
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
  const collected = getLootCollectionCount(party, dungeon.id - 1, 'mythic');
  const unlocked = isLootGateUnlocked(party, getEntryGateKey(dungeon.id)) || collected >= required;

  return {
    locked: !unlocked,
    gateText: `🔒 解放条件: ${previousDungeonName}の神魔レアアイテム(持ち帰り) ${collected}/${required}`,
  };
}

function getNextGoalText(party: Party): string | null {
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
  const rareCollected = getLootCollectionCount(party, tier, 'rare');
  const bossUnlocked = isLootGateUnlocked(party, getBossGateKey(currentDungeon.id)) || rareCollected >= bossRequired;
  if (!bossUnlocked) {
    return `次の目標: ${currentDungeon.name} 6F-4の解放: レアアイテム(持ち帰り) ${rareCollected}/${bossRequired}（現在）`;
  }

  const nextDungeon = DUNGEONS.find(d => d.id === currentDungeon.id + 1);
  if (nextDungeon) {
    const entryRequired = ENTRY_GATE_REQUIRED;
    const mythicCollected = getLootCollectionCount(party, currentDungeon.id, 'mythic');
    const entryUnlocked = isLootGateUnlocked(party, getEntryGateKey(nextDungeon.id)) || mythicCollected >= entryRequired;
    if (!entryUnlocked) {
      return `次の目標: ${nextDungeon.name}の解放: ${currentDungeon.name}の神魔レアアイテム(持ち帰り) ${mythicCollected}/${entryRequired}（現在）`;
    }
  }

  return null;
}

// Helper to format item stats

function getItemStats(item: Item): string {
  const multiplier = (ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1) *
    (SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1);
  const baseMultiplier = item.baseMultiplier ?? 1;
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

  const stats: string[] = [];
  if (item.meleeAttack) {
    stats.push(`近攻+${Math.floor(item.meleeAttack * multiplier)}`);
    if (item.category === 'sword' && multiplierPercent) stats.push(formatBracket('近攻撃', multiplierPercent, '%'));
  }
  if (item.rangedAttack) {
    stats.push(`遠攻+${Math.floor(item.rangedAttack * multiplier)}`);
    if (item.category === 'arrow' && multiplierPercent) stats.push(formatBracket('遠攻撃', multiplierPercent, '%'));
  }
  if (item.magicalAttack) {
    stats.push(`魔攻+${Math.floor(item.magicalAttack * multiplier)}`);
    if (item.category === 'wand' && multiplierPercent) stats.push(formatBracket('魔攻撃', multiplierPercent, '%'));
  }
  if (item.meleeNoA || item.meleeNoABonus) {
    const baseNoA = item.meleeNoA ?? 0;
    if (baseNoA !== 0) stats.push(`近回数${formatSigned(getScaledNoA(baseNoA))}`);
    if (item.meleeNoABonus) stats.push(formatBracket('近回数', item.meleeNoABonus));
  }
  if (item.rangedNoA || item.rangedNoABonus) {
    const baseNoA = item.rangedNoA ?? 0;
    if (baseNoA !== 0) stats.push(`遠回数${formatSigned(getScaledNoA(baseNoA))}`);
    if (item.rangedNoABonus) stats.push(formatBracket('遠回数', item.rangedNoABonus));
  }
  if (item.magicalNoA || item.magicalNoABonus) {
    const baseNoA = item.magicalNoA ?? 0;
    if (baseNoA !== 0) stats.push(`魔回数${formatSigned(getScaledNoA(baseNoA))}`);
    if (item.magicalNoABonus) stats.push(formatBracket('魔回数', item.magicalNoABonus));
  }
  if (item.physicalDefense) stats.push(`物防+${Math.floor(item.physicalDefense * multiplier)}`);
  if (item.magicalDefense) stats.push(`魔防+${Math.floor(item.magicalDefense * multiplier)}`);
  if (item.category === 'armor' && multiplierPercent) stats.push(formatBracket('物防', multiplierPercent, '%'));
  if (item.category === 'robe' && multiplierPercent) stats.push(formatBracket('魔防', multiplierPercent, '%'));
  if (item.partyHP) stats.push(`HP+${Math.floor(item.partyHP * multiplier)}`);
  if (item.accuracyBonus) stats.push(formatBracket('命中', Math.round(item.accuracyBonus * 1000)));
  if (item.evasionBonus) stats.push(formatBracket('回避', Math.round(item.evasionBonus * 1000)));
  if (item.vitalityBonus) stats.push(`体力+${item.vitalityBonus}`);
  if (item.strengthBonus) stats.push(`腕力+${item.strengthBonus}`);
  if (item.intelligenceBonus) stats.push(`知力+${item.intelligenceBonus}`);
  if (item.mindBonus) stats.push(`精神+${item.mindBonus}`);
  if (item.penetBonus) stats.push(formatBracket('貫通', Math.round(item.penetBonus * 100)));
  if (item.elementalOffense && item.elementalOffense !== 'none') {
    const elem = { fire: '炎', ice: '氷', thunder: '雷' }[item.elementalOffense];
    stats.push(`${elem}属性`);
  }
  return stats.join(' ');
}

function getOffenseMultiplierSum(items: Item[], kind: 'melee' | 'ranged' | 'magical'): number {
  const appliedBonusNames = new Set<string>();
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

  return 1 + bonusSum;
}

function getDefenseMultiplierSum(items: Item[], kind: 'physical' | 'magical'): number {
  const appliedBonusNames = new Set<string>();
  const relevant = items.filter(item => {
    if (kind === 'physical') return item.physicalDefense;
    return item.magicalDefense;
  });

  const bonusSum = relevant.reduce((sum, item) => {
    const baseMultiplier = item.baseMultiplier ?? 1;
    if (baseMultiplier === 1) return sum;

    const percent = Math.round((baseMultiplier - 1) * 1000) / 10;
    const bonusName = `c.${kind}_defense+${percent}`;
    if (appliedBonusNames.has(bonusName)) return sum;
    appliedBonusNames.add(bonusName);
    return sum + (baseMultiplier - 1);
  }, 0);

  return Math.max(0.01, 1 - bonusSum);
}

// Helper to format bonus descriptions
type Bonus = { type: string; value: number; abilityId?: string; abilityLevel?: number };

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
  hunter: '狩人',
  defender: '防御者',
  counter: '反撃',
  re_attack: '再攻撃',
  iaigiri: '居合斬り',
  resonance: '共鳴',
  command: '指揮',
  m_barrier: '魔法障壁',
  deflection: '矢払い',
  unlock: '解錠',
  null_counter: '反撃無効化',
  squander: '散財',
  tithe: '十分の一税',
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
};

function formatBonuses(bonuses: Bonus[]): string {
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
      parts.push(`詠唱+${b.value}`);
    } else if (b.type === 'penet') {
      parts.push(`貫通${Math.round(b.value * 100)}%`);
    } else if (b.type === 'pursuit') {
      parts.push(`追撃+${b.value}`);
    } else if (b.type === 'accuracy') {
      parts.push(`命中+${Math.round(b.value * 1000)}`);
    } else if (b.type === 'evasion') {
      parts.push(`回避+${Math.round(b.value * 1000)}`);
    } else if (b.type === 'ability' && b.abilityId) {
      const name = ABILITY_NAMES[b.abilityId] || b.abilityId;
      parts.push(`${name}Lv${b.abilityLevel || 1}`);
    }
  }
  return parts.join(', ');
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
  const [selectedCharacter, setSelectedCharacter] = useState<number>(0);
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);
  const [isAutoRepeatEnabled, setIsAutoRepeatEnabled] = useState(false);
  const [partyCycles, setPartyCycles] = useState<Record<number, PartyCycleRuntime>>({});
  const [expeditionExpandedLogParty, setExpeditionExpandedLogParty] = useState<number | null>(null);
  const [expeditionExpandedRoom, setExpeditionExpandedRoom] = useState<{ partyIndex: number; roomIndex: number } | null>(null);
  const [diaryExpandedLogs, setDiaryExpandedLogs] = useState<Record<string, boolean>>({});
  const [diaryExpandedRooms, setDiaryExpandedRooms] = useState<Record<string, boolean>>({});
  const [diarySettingsExpanded, setDiarySettingsExpanded] = useState(false);
  const tabScrollPositionsRef = useRef<Partial<Record<Tab, number>>>({});
  const tabContentRef = useRef<HTMLDivElement | null>(null);

  const currentParty = state.parties[state.selectedPartyIndex];
  const prevPartyLogsRef = useRef(state.parties.map((party) => party.lastExpeditionLog));
  const pendingNotificationTimersRef = useRef<Record<number, number>>({});
  const hasHydratedAfkRef = useRef(false);
  const pendingAfkSimulationRef = useRef(true);
  const lastCheckpointAtRef = useRef(Date.now());
  const afkSummaryBaselineRef = useRef<Array<{ victories: number; retreats: number; defeats: number; donatedGold: number; savedGold: number }> | null>(null);
  const shouldShowAfkSummaryRef = useRef(false);
  const { partyStats, characterStats } = computePartyStats(currentParty);

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
  }, [actions, state.parties]);

  const processTimeCheckpoint = useCallback((now: number = Date.now()) => {
    const elapsedMs = Math.max(0, Math.min(now - lastCheckpointAtRef.current, AFK_MAX_ELAPSED_MS));
    if (elapsedMs < PARTY_CYCLE_TICK_MS) return;

    if (elapsedMs > 60_000) {
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      actions.addNotification(`(Debug)前回の更新から ${formatNumber(elapsedSeconds)}秒経過`);
    }

    if (elapsedMs >= 1000) {
      afkSummaryBaselineRef.current = state.parties.map((party) => ({ ...party.expeditionStats }));
      shouldShowAfkSummaryRef.current = true;
    }

    // Long background spans should be simulated inside the reducer so each expedition
    // phase reads the latest pending profit / HP values instead of stale render snapshots.
    if (elapsedMs >= 60_000) {
      actions.simulateAfk(elapsedMs, isAutoRepeatEnabled);
      setPartyCycles((prev) => {
        const resetAt = now;
        const next: Record<number, PartyCycleRuntime> = {};
        state.parties.forEach((_, partyIndex) => {
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
      state.parties.forEach((party, partyIndex) => {
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
            updated.state = party.pendingProfit > 0 ? '宴会中' : '睡眠中';
            updated.stateStartedAt = simulationNow;
            updated.durationMs = updated.state === '宴会中' ? 5000 : 10000;
          }
        }

        let stateElapsedMs = Math.max(0, simulationNow - updated.stateStartedAt);
        while (updated.state !== '休息中' && stateElapsedMs >= updated.durationMs) {
          updated.stateStartedAt += updated.durationMs;
          stateElapsedMs -= updated.durationMs;

            if (updated.state === '宴会中') {
              const baseSpend = Math.floor((party.pendingProfit * (33 + Math.random() * 34)) / 100);
              const hasSquander = !!getPartyAbilityOwnerName(party, 'squander');
              const spend = Math.min(party.pendingProfit, hasSquander ? baseSpend * 2 : baseSpend);
              if (spend > 0) {
                if (hasSquander) {
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
              const titheBonus = getPartyAbilityOwnerName(party, 'tithe') ? Math.floor(party.pendingProfit * 0.1) : 0;
              const donation = Math.min(party.pendingProfit, baseDonation + titheBonus);
              const deposit = Math.max(0, party.pendingProfit - donation);
              actions.processPendingProfit(partyIndex, donation, deposit);
              if (donation > 0 || deposit > 0) {
                if (titheBonus > 0) {
                  const pilgrimName = getPartyAbilityOwnerName(party, 'tithe') ?? '名無し';
                  actions.addNotification(`${party.name} 巡礼者${pilgrimName}は祈りと共に${formatNumber(donation)}G神に捧げて、${formatNumber(deposit)}Gを貯金した`);
                } else {
                  actions.addNotification(`${party.name}は${formatNumber(donation)}G神に捧げ、${formatNumber(deposit)}Gを貯金した`);
                }
              }
              updated.state = isAutoRepeatEnabled ? '移動中' : '待機中';
              updated.durationMs = updated.state === '移動中' ? 5000 : 1000;
            } else if (updated.state === '待機中') {
              updated.durationMs = 1000;
            } else if (updated.state === '移動中') {
              actions.runExpedition(partyIndex);
              updated.state = '探索中';
              updated.durationMs = getExplorationDurationMs();
            } else if (updated.state === '探索中') {
              actions.finalizeDiaryLog(partyIndex);
              updated.state = '帰還中';
              updated.durationMs = 5000;
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
  }, [actions, isAutoRepeatEnabled, state.parties]);

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
    const handleUserAction = () => {
      processTimeCheckpoint();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', handleUserAction);
    window.addEventListener('keydown', handleUserAction);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointerdown', handleUserAction);
      window.removeEventListener('keydown', handleUserAction);
    };
  }, [processTimeCheckpoint]);

  // Item drop notifications after expedition
  useEffect(() => {
    state.parties.forEach((party, index) => {
      const previousLog = prevPartyLogsRef.current[index] ?? null;
      const currentLog = party.lastExpeditionLog;
      if (!currentLog || currentLog === previousLog) {
        return;
      }

      const existingTimer = pendingNotificationTimersRef.current[index];
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      // Delay reward notifications until exploration visually finishes.
      pendingNotificationTimersRef.current[index] = window.setTimeout(() => {
        for (const item of currentLog.rewards) {
          const isSuperRare = item.superRare > 0;
          const itemName = getItemDisplayName(item);
          const rarity = getItemRarityById(item.id);
          actions.addNotification(
            `${party.name}:${itemName}を入手！`,
            rarity === 'rare' || rarity === 'mythic' || isSuperRare ? 'rare' : 'normal',
            'item',
            undefined,
            { rarity, isSuperRareItem: isSuperRare }
          );
        }
        delete pendingNotificationTimersRef.current[index];
      }, EXPLORING_PROGRESS_TOTAL_STEPS * EXPLORING_PROGRESS_STEP_MS);
    });

    prevPartyLogsRef.current = state.parties.map((party) => party.lastExpeditionLog);
  }, [state.parties, actions]);

  useEffect(() => () => {
    Object.values(pendingNotificationTimersRef.current).forEach((timerId) => {
      window.clearTimeout(timerId);
    });
  }, []);

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

  const triggerSortie = (partyIndex: number) => {
    const cycle = partyCycles[partyIndex];
    const party = state.parties[partyIndex];
    if (!party) return;

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

    actions.clearPendingProfit(partyIndex);
    transitionTo(partyIndex, '移動中', 5000);
  };

  const prevActiveTabRef = useRef<Tab>(activeTab);
  useEffect(() => {
    if (prevActiveTabRef.current === 'diary' && activeTab !== 'diary') {
      actions.markAllDiaryLogsSeen();
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, actions]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'party', label: 'パーティ' },
    { id: 'expedition', label: '探検' },
    { id: 'inventory', label: '所持品' },
    { id: 'diary', label: '日誌' },
    { id: 'setting', label: '神聖局' },
  ];

  const unreadDiaryCount = state.parties.reduce((count, party) => (
    count + party.diaryLogs.filter((log) => !log.isRead).length
  ), 0);
  const hasUnreadDiary = unreadDiaryCount > 0;
  const unreadDiaryBadgeLabel = unreadDiaryCount >= 11 ? '10+' : `${unreadDiaryCount}`;
  const envLabel = getEnvLabel();
  const versionLabel = envLabel ? `v0.2.6 (${envLabel})` : 'v0.2.6';

  return (
    <div className={`flex flex-col h-screen ${HEADER_HEIGHT_CLASS}`}>
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-300 p-3 z-10">
        <div className="max-w-lg mx-auto w-full">
          <div className="flex justify-between items-center gap-3">
            <div>
              <h1 className="text-lg font-bold">ケモの冒険</h1>
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
                            nextCycles[partyIndex] = { state: '移動中', stateStartedAt: Date.now(), durationMs: 5000 };
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
                自動周回{isAutoRepeatEnabled ? 'ON' : 'OFF'}
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

        {activeTab === 'inventory' && (
          <InventoryTab
            inventory={state.global.inventory}
            onSellStack={actions.sellStack}
            onSetVariantStatus={actions.setVariantStatus}
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
            deityDonations={state.global.deityDonations}
            bags={bags}
            onResetGame={actions.resetGame}
            onResetCommonBags={actions.resetCommonBags}
            onResetUniqueBags={actions.resetUniqueBags}
            onResetSuperRareBag={actions.resetSuperRareBag}
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
  const equippedItems = selectedChar.equipment.filter((item): item is Item => item !== null);

  // Calculate current stats for notification: HP is party-wide, others are per selected character
  const selectedStats = characterStats[selectedCharacter];
  const combatTotals = {
    meleeAtk: Math.floor(selectedStats.meleeAttack),
    rangedAtk: Math.floor(selectedStats.rangedAttack),
    magicalAtk: Math.floor(selectedStats.magicalAttack),
    meleeNoA: selectedStats.meleeNoA,
    rangedNoA: selectedStats.rangedNoA,
    magicalNoA: selectedStats.magicalNoA,
    physDef: Math.floor(selectedStats.physicalDefense),
    magDef: Math.floor(selectedStats.magicalDefense),
    physicalDefenseResistPercent: Math.round(getDefenseMultiplierSum(equippedItems, 'physical') * 100),
    magicalDefenseResistPercent: Math.round(getDefenseMultiplierSum(equippedItems, 'magical') * 100),
    meleeAttackAmp: getOffenseMultiplierSum(equippedItems, 'melee'),
    rangedAttackAmp: getOffenseMultiplierSum(equippedItems, 'ranged'),
    magicalAttackAmp: getOffenseMultiplierSum(equippedItems, 'magical'),
    accuracy: Math.round(selectedStats.accuracyBonus * 1000),
    evasion: Math.round(selectedStats.evasionBonus * 1000),
    hp: Math.floor(partyStats.hp),
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

      // Send all stat notifications at once (clears previous stat notifications)
      if (changes.length > 0) {
        onAddStatNotifications(changes);
      }
    }
    prevStatsRef.current = combatTotals;
  }, [combatTotals.physDef, combatTotals.magDef, combatTotals.physicalDefenseResistPercent, combatTotals.magicalDefenseResistPercent, combatTotals.hp,
      combatTotals.meleeAtk, combatTotals.meleeNoA,
      combatTotals.rangedAtk, combatTotals.rangedNoA,
      combatTotals.magicalAtk, combatTotals.magicalNoA,
      combatTotals.meleeAttackAmp, combatTotals.rangedAttackAmp, combatTotals.magicalAttackAmp,
      combatTotals.accuracy, combatTotals.evasion,
      onAddStatNotifications, selectedCharacter, selectedPartyIndex]);
  const [pendingEdits, setPendingEdits] = useState<Partial<Character> | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
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

  // Handle inventory item tap with auto-equip support
  const handleInventoryItemTap = (itemKey: string) => {
    // If a slot is selected, equip to that slot
    if (selectingSlot !== null) {
      onEquipItem(char.id, selectingSlot, itemKey);
      setSelectingSlot(null);
      return;
    }

    // Auto-equip: find first empty slot
    const emptySlotIndex = Array.from({ length: stats.maxEquipSlots })
      .findIndex((_, i) => !char.equipment[i]);

    if (emptySlotIndex !== -1) {
      onEquipItem(char.id, emptySlotIndex, itemKey);
    }
  };


  useEffect(() => {
    if (!editingDeity) {
      setPendingDeityName(party.deity.name);
    }
  }, [party.deity.name, editingDeity]);

  const char = selectedChar;
  const stats = characterStats[selectedCharacter];
  const race = RACES.find(r => r.id === char.raceId)!;
  const mainClass = CLASSES.find(c => c.id === char.mainClassId)!;
  const subClass = CLASSES.find(c => c.id === char.subClassId)!;
  const predisposition = PREDISPOSITIONS.find(p => p.id === char.predispositionId)!;
  const lineage = LINEAGES.find(l => l.id === char.lineageId)!;

  const availableCategoryGroups = getAvailableCategoryGroups(char);
  const availableCategories = availableCategoryGroups.flatMap(group => group.categories);

  useEffect(() => {
    if (!availableCategories.includes(equipCategory)) {
      setEquipCategory(availableCategories[0] ?? 'armor');
    }
  }, [availableCategories, equipCategory]);

  const normalizedCurrentDeityName = normalizeDeityName((party.deity.name ?? '').trim());


  return (
    <div
      onPointerDown={() => {
        if (showBonusHelp) {
          setShowBonusHelp(false);
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
          <div className="text-gray-600">PTレベル: {formatNumber(party.level)}, 経験値: {formatNumber(party.experience)}/{party.level < 29 ? formatNumber(LEVEL_EXP[party.level]) : '（レベル上限）'}</div>
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
              <div className="text-2xl text-center">{r.emoji}</div>
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
                onClick={() => setShowEditConfirm(true)}
                className="text-sm text-white bg-sub px-3 py-1 rounded whitespace-nowrap"
              >
                完了
              </button>
              <button
                onClick={() => {
                  setPendingEdits(null);
                  setEditingCharacter(null);
                }}
                className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded whitespace-nowrap"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setPendingEdits({});
                setEditingCharacter(selectedCharacter);
              }}
              className="text-sm text-sub"
            >
              編集
            </button>
          )}
        </div>

        {/* Edit confirmation dialog */}
        {showEditConfirm && (
          <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
            <div className="text-sm text-accent mb-2">
              ⚠️ 変更を保存すると装備が全て外れます。よろしいですか？
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Apply pending edits
                  if (pendingEdits && Object.keys(pendingEdits).length > 0) {
                    onUpdateCharacter(char.id, pendingEdits);
                  }
                  // Unequip all items
                  for (let i = 0; i < 4; i++) {
                    if (char.equipment[i]) {
                      onEquipItem(char.id, i, null);
                    }
                  }
                  setPendingEdits(null);
                  setEditingCharacter(null);
                  setShowEditConfirm(false);
                }}
                className="flex-1 py-1 bg-accent text-white rounded text-sm font-medium"
              >
                保存する
              </button>
              <button
                onClick={() => setShowEditConfirm(false)}
                className="flex-1 py-1 bg-gray-300 rounded text-sm font-medium"
              >
                戻る
              </button>
            </div>
          </div>
        )}

        {editingCharacter === selectedCharacter && !showEditConfirm ? (
          <div className="space-y-2 text-sm">
            <div>
              <label className="block text-gray-500">種族</label>
              <select
                value={pendingEdits?.raceId ?? char.raceId}
                onChange={(e) => setPendingEdits({ ...pendingEdits, raceId: e.target.value as Character['raceId'] })}
                className="w-full p-1 border rounded text-xs"
              >
                {RACES.map(r => {
                  const s = r.stats;
                  const bonusText = formatBonuses(r.bonuses as Bonus[]);
                  return (
                    <option key={r.id} value={r.id}>
                      {r.emoji}{r.name} | 体{s.vitality},力{s.strength},知{s.intelligence},精{s.mind} | {bonusText}
                    </option>
                  );
                })}
              </select>
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
            <div className="text-gray-500">
              {race.emoji} {race.name} / {mainClass.name}({char.mainClassId === char.subClassId ? '師範' : subClass.name}) / {predisposition.name} / {lineage.name}
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
                // LONG phase: 1.0 + deity bonus
                const longAmp = 1.0 + stats.deityOffenseAmplifierBonus;
                // MID phase: 1.0 + deity bonus
                const midAmp = 1.0 + stats.deityOffenseAmplifierBonus;
                // CLOSE phase: iaigiri multiplier, then deity bonus
                const closeAmp = (iaigiri ? (iaigiri.level >= 2 ? 2.5 : 2.0) : 1.0) * (1.0 + stats.deityOffenseAmplifierBonus);
                const elementName = stats.elementalOffense === 'fire' ? '火' :
                  stats.elementalOffense === 'thunder' ? '雷' :
                  stats.elementalOffense === 'ice' ? '氷' : '無';

                const hasRanged = stats.rangedAttack > 0 || stats.rangedNoA > 0;
                const hasMagical = stats.magicalAttack > 0 || stats.magicalNoA > 0;
                const hasMelee = stats.meleeAttack > 0 || stats.meleeNoA > 0;
                const equippedItems = char.equipment.filter((item): item is Item => item !== null);
                const baseMultMelee = getOffenseMultiplierSum(
                  equippedItems,
                  'melee'
                );
                const baseMultRanged = getOffenseMultiplierSum(
                  equippedItems,
                  'ranged'
                );
                const baseMultMagical = getOffenseMultiplierSum(
                  equippedItems,
                  'magical'
                );
                const defenseMultPhysical = getDefenseMultiplierSum(
                  equippedItems,
                  'physical'
                );
                const defenseMultMagical = getDefenseMultiplierSum(
                  equippedItems,
                  'magical'
                );

                // Build offense lines
                const offenseLines: string[] = [];
                if (hasRanged) {
                  const amp = longAmp * baseMultRanged;
                  offenseLines.push(`遠距離攻撃:${formatNumber(Math.floor(stats.rangedAttack))} x ${formatNumber(stats.rangedNoA)}回(x${amp.toFixed(2)})`);
                }
                if (hasMagical) {
                  const amp = midAmp * baseMultMagical;
                  offenseLines.push(`魔法攻撃:${formatNumber(Math.floor(stats.magicalAttack))} x ${formatNumber(stats.magicalNoA)}回(x${amp.toFixed(2)})`);
                }
                if (hasMelee) {
                  const amp = closeAmp * baseMultMelee;
                  offenseLines.push(`近接攻撃:${formatNumber(Math.floor(stats.meleeAttack))} x ${formatNumber(stats.meleeNoA)}回(x${amp.toFixed(2)})`);
                }

                const baseDecay = 0.90 + stats.accuracyBonus;
                const hasPhysicalAttacks = stats.rangedNoA > 0 || stats.meleeNoA > 0;
                if (hasPhysicalAttacks) {
                  offenseLines.push(`物理命中率: ${Math.round(stats.accuracyPotency * 100)}% (減衰: x${baseDecay.toFixed(2)})`);
                }
                if (hasMagical) {
                  offenseLines.push(`魔法命中率: 100% (減衰: x${baseDecay.toFixed(2)})`);
                }

                // Defense lines
                const defenseAmpPhysical = Math.max(0.01, defenseMultPhysical + stats.deityDefenseAmplifierBonus.physical);
                const defenseAmpMagical = Math.max(0.01, defenseMultMagical + stats.deityDefenseAmplifierBonus.magical);
                const defenseLines = [
                  `属性:${elementName}(x${stats.elementalOffenseValue.toFixed(1)})`,
                  `物防:${formatNumber(stats.physicalDefense)} (${formatNumber(Math.round(defenseAmpPhysical * 100))}%)`,
                  `魔防:${formatNumber(stats.magicalDefense)} (${formatNumber(Math.round(defenseAmpMagical * 100))}%)`,
                ];
                defenseLines.push(`回避:${stats.evasionBonus >= 0 ? '+' : ''}${formatNumber(Math.round(stats.evasionBonus * 1000))}`);

                // Pad offense lines to match defense lines count
                while (offenseLines.length < defenseLines.length) {
                  offenseLines.push('');
                }

                return (
                  <div className="text-xs space-y-1">
                    {offenseLines.map((offense, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{offense}</span>
                        <span className="text-gray-500">{defenseLines[i]}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            {/* Bonuses */}
            {(() => {
              const isMasterClass = char.mainClassId === char.subClassId;
              const allBonuses = [
                ...race.bonuses,
                ...mainClass.mainSubBonuses,
                ...(isMasterClass ? mainClass.masterBonuses : [...mainClass.mainBonuses, ...subClass.mainSubBonuses]),
                ...predisposition.bonuses,
                ...lineage.bonuses,
              ];

              // Aggregate bonuses - deduplicate multipliers by value before multiplying
              const multiplierValues: Record<string, Set<number>> = {};
              const additive: Record<string, number> = {};
              const uniqueEvasionBonusNames = new Set<string>();

              for (const b of allBonuses) {
                if (b.type.endsWith('_multiplier')) {
                  const key = b.type.replace('_multiplier', '');
                  if (!multiplierValues[key]) multiplierValues[key] = new Set();
                  multiplierValues[key].add(b.value);
                } else if (['vitality', 'strength', 'intelligence', 'mind', 'equip_slot', 'grit', 'caster', 'pursuit'].includes(b.type)) {
                  additive[b.type] = (additive[b.type] ?? 0) + b.value;
                } else if (b.type === 'penet' || b.type === 'accuracy' || b.type === 'evasion') {
                  if (b.type === 'evasion') {
                    const bonusName = `c.evasion+${b.value}`;
                    if (!uniqueEvasionBonusNames.has(bonusName)) {
                      uniqueEvasionBonusNames.add(bonusName);
                      additive[b.type] = (additive[b.type] ?? 0) + b.value;
                    }
                  } else {
                    additive[b.type] = (additive[b.type] ?? 0) + b.value;
                  }
                }
              }

              // Calculate multipliers from unique values
              const multipliers: Record<string, number> = {};
              for (const [key, values] of Object.entries(multiplierValues)) {
                multipliers[key] = Array.from(values).reduce((prod, v) => prod * v, 1);
              }

              // Format display
              const parts: string[] = [];
              const helpRows: Array<{ label: string; description: string }> = [];
              const mulNames: Record<string, string> = {
                sword: '剣', katana: '刀', archery: '弓', armor: '鎧',
                gauntlet: '手', wand: '杖', robe: '衣', shield: '盾',
                bolt: 'ボ', grimoire: '書', catalyst: '媒', arrow: '矢'
              };
              const addNames: Record<string, string> = {
                vitality: '体', strength: '力', intelligence: '知', mind: '精',
                equip_slot: '装備', grit: '根性', caster: '術者', penet: '貫通',
                pursuit: '追撃', accuracy: '命中', evasion: '回避'
              };

              for (const [key, val] of Object.entries(multipliers)) {
                if (val !== 1) {
                  const label = `${mulNames[key] ?? key}x${val.toFixed(1)}`;
                  parts.push(label);
                  const template = C_MULTIPLIER_HELP_DESCRIPTIONS[key];
                  if (template) {
                    helpRows.push({
                      label,
                      description: template.replace('{value}', val.toFixed(1)),
                    });
                  }
                }
              }
              for (const [key, val] of Object.entries(additive)) {
                if (val !== 0) {
                  if (key === 'penet') {
                    const label = `${addNames[key]}+${Math.round(val * 100)}%`;
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
                  } else {
                    const label = `${addNames[key] ?? key}+${val}`;
                    parts.push(label);
                    if (key === 'equip_slot') helpRows.push({ label, description: `装備スロット数が ${val} 増える` });
                    if (key === 'grit') helpRows.push({ label, description: `近接攻撃の装備が出来るようになる。近接攻撃回数が ${val} 回増える` });
                    if (key === 'pursuit') helpRows.push({ label, description: `遠距離攻撃の装備が出来るようになる。遠距離攻撃回数が ${val} 回増える` });
                    if (key === 'caster') helpRows.push({ label, description: `魔法攻撃の装備が出来るようになる。魔法攻撃回数が ${val} 回増える` });
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
                <div className="text-xs text-gray-600 mt-1 relative">
                  <div className="inline-flex items-center gap-1">
                    <span>ボーナス: {parts.join(', ')}</span>
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
                          <div className="font-semibold text-gray-700">b.ボーナス説明(重複有効)</div>
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
                <div className="text-gray-500 text-xs">特殊能力:</div>
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
                      <span className="text-xs text-gray-500"> {getRarityShortLabel(item.id)} {getItemStats(item)}</span>
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
                      {displayItem.isEquipped && <span>{race.emoji}</span>}
                      <span className="font-medium">{getItemDisplayName(displayItem.item)}</span>
                      {!displayItem.isEquipped && <span className="text-xs text-gray-500"> x{displayItem.count}</span>}
                      <span className="text-xs text-gray-400"> {getRarityShortLabel(displayItem.item.id)} {getItemStats(displayItem.item)}</span>
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
  onTriggerSortie: (partyIndex: number) => void;
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
        const progressPercent = cycle.state === '待機中'
          ? 100
          : cycle.state === '探索中'
          ? Math.min(
            100,
            Math.floor(cycleElapsedMs / EXPLORING_PROGRESS_STEP_MS) * (100 / EXPLORING_PROGRESS_TOTAL_STEPS),
          )
          : Math.min(100, (cycleElapsedMs / Math.max(1, cycle.durationMs)) * 100);
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
        const hpPercent = Math.round((displayedHp / Math.max(1, partyStats.hp)) * 100);

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
                  <button onClick={() => onTriggerSortie(partyIndex)} disabled={selectedDungeonGate?.locked} className={`px-3 py-2 text-white rounded font-medium text-sm leading-none whitespace-nowrap ${selectedDungeonGate?.locked ? 'bg-gray-400 cursor-not-allowed' : 'bg-sub hover:bg-blue-600'}`}>出撃</button>
                </div>
                {getNextGoalText(party) && <div className="text-sm text-gray-700">{getNextGoalText(party)}</div>}
              </div>
            )}

            {currentLog && isLogExpanded && (
              <div className="border-t border-gray-200 pt-3">
                <div className="space-y-2">
                  {cycle.state !== '探索中' && (
                    <div className="text-sm text-gray-500">
                      EXP: +{formatNumber(currentLog.totalExperience)}
                      {currentLog.autoSellProfit > 0 && <span> | 自動売却額: {formatNumber(currentLog.autoSellProfit)}G</span>}
                    </div>
                  )}

                  {cycle.state !== '探索中' && currentLog.rewards.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500">獲得アイテム: </span>
                      {currentLog.rewards.map((item, i) => {
                        const rarity = getItemRarityById(item.id);
                        const isSuperRare = item.superRare > 0;
                        const rarityClass = getRarityTextClass(rarity, isSuperRare);
                        return <span key={i} className={`${rarityClass} font-medium`}>{i > 0 && ', '}{getItemDisplayName(item)}</span>;
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
                                <span className={entry.gateInfo ? 'text-gray-500 font-medium' : entry.outcome === 'victory' ? 'text-sub font-medium' : entry.outcome === 'defeat' ? 'text-accent font-medium' : 'text-yellow-600 font-medium'}>
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
                                  <div className="h-full" style={{ width: `${Math.min(100, remainingRatio)}%`, backgroundColor: '#93c5fd' }} />
                                  <div className="h-full" style={{ width: `${Math.min(100, healRatio)}%`, backgroundColor: '#b8edb2' }} />
                                  <div className="h-full" style={{ width: `${Math.min(100, takenRatio)}%`, backgroundColor: '#fcb786' }} />
                                </div>
                              </div>
                              <div>
                                <div className="mb-0.5">敵HP {formatNumber(enemyRemainingAmount)} / {formatNumber(entry.enemyHP)}</div>
                                <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div className="h-full" style={{ width: `${Math.min(100, enemyRemainingRatio)}%`, backgroundColor: '#93c5fd' }} />
                                </div>
                              </div>
                            </div>
                          </button>
                          {isRoomExpanded && entry.details && (
                            <div className="border-t border-gray-100 p-2 bg-gray-50 text-xs space-y-1">
                              <div className="font-medium text-gray-600 mb-1">戦闘ログ:</div>
                              {entry.details.map((log, j) => {
                                const phaseBaseLabel = log.actor === 'deity' ? '末' : log.actor === 'effect' ? '効' : log.phase === 'long' ? '遠' : log.phase === 'mid' ? '魔' : '近';
                                const phaseLabel = log.initiativeRoll !== undefined && log.actor !== 'deity' && log.actor !== 'effect' ? `${phaseBaseLabel}${log.initiativeRoll}` : phaseBaseLabel;
                                const emoji = log.elementalOffense === 'fire' ? '🔥' : log.elementalOffense === 'thunder' ? '⚡' : log.elementalOffense === 'ice' ? '❄️' : log.phase === 'long' ? '🏹' : log.phase === 'mid' ? '🪄' : '⚔';
                                const isEnemy = log.actor === 'enemy';
                                const hits = log.hits ?? 0;
                                const totalAttempts = log.totalAttempts ?? 0;
                                const allMissed = totalAttempts > 0 && hits === 0;
                                const hitDisplay = totalAttempts > 0 ? `(${hits}/${totalAttempts}回)` : '';
                                const resonanceMatch = /(\(共鳴\+\d+%\))$/.exec(log.action);

                                let actionText: string;
                                if (log.actor === 'effect') {
                                  actionText = log.action;
                                } else if (isEnemy) {
                                  actionText = allMissed ? `敵が${log.action.replace('！', 'したが外れた！')}` : `敵が${log.action}`;
                                } else {
                                  actionText = allMissed ? `${log.action.replace(/ の.*$/, '')} の攻撃は外れた！` : log.action;
                                }

                                const compactHitDisplay = hitDisplay && resonanceMatch
                                  ? `(${hits}/${totalAttempts}回, ${resonanceMatch[1].slice(1, -1)})`
                                  : hitDisplay;
                                const actionDisplay = resonanceMatch && !allMissed
                                  ? actionText.replace(/\(共鳴\+\d+%\)$/, '')
                                  : actionText;

                                return (
                                  <div key={j} className="flex justify-between text-gray-600">
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

function InventoryTab({
  inventory,
  onSellStack,
  onSetVariantStatus,
}: {
  inventory: InventoryRecord;
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
          {filteredOwnedItems.map(([key, variant]) => {
            const { item, count } = variant;
            const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
            const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
            const baseMult = item.baseMultiplier ?? 1;
            const sellPrice = Math.floor(10 * enhMult * srMult * baseMult) * count;

            return (
              <div
                key={key}
                className="px-2 py-1.5 rounded bg-pane"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
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
                      onSellStack(key);
                    }}
                    className="text-xs text-accent px-2 py-1 border border-accent rounded flex-shrink-0"
                  >
                    全売却 {formatNumber(sellPrice)}G
                  </button>
                </div>
                <div className="mt-0.5 text-xs leading-tight text-gray-400">
                  {getRarityShortLabel(item.id)} {getItemStats(item)}
                </div>
              </div>
            );
          })}
          {filteredOwnedItems.length === 0 && (
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
                    {getRarityShortLabel(variant.item.id)} {getItemStats(variant.item)}
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

  const getDiaryTitle = (triggers: Array<'defeat' | 'rare' | 'mythic' | 'superRare'>) => {
    if (triggers.includes('defeat') && triggers.length === 1) return '敗北の記録';
    if (triggers.includes('superRare')) return '超レア獲得の記録';
    if (triggers.includes('mythic')) return '神魔レア獲得の記録';
    if (triggers.includes('rare')) return 'レア獲得の記録';
    return '特別記録';
  };

  const getDiaryHeadline = (
    partyName: string,
    triggers: Array<'defeat' | 'rare' | 'mythic' | 'superRare'>,
    rewards: Item[]
  ) => {
    if (triggers.includes('defeat') && triggers.length === 1) {
      return `[${partyName}] 敗北の記録`;
    }

    if (triggers.includes('superRare') || triggers.includes('mythic')) {
      const rewardNames = rewards
        .filter((item) => item.superRare > 0 || getItemRarityById(item.id) === 'mythic')
        .map((item) => getItemDisplayName(item))
        .join('、');
      const triggerPrefix = triggers.includes('superRare') ? '超レア' : '神魔レア';
      return rewardNames
        ? `[${partyName}] ${triggerPrefix}(${rewardNames}) 獲得`
        : `[${partyName}] ${triggerPrefix}獲得`;
    }

    if (triggers.includes('rare')) {
      const rewardNames = rewards
        .filter((item) => getItemRarityById(item.id) === 'rare')
        .map((item) => getItemDisplayName(item))
        .join('、');
      return rewardNames ? `[${partyName}] レア(${rewardNames}) 獲得` : `[${partyName}] レア獲得`;
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
                    <span>レア通知</span>
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
          return rarity === 'mythic' || item.superRare > 0;
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
                  return (
                    <span key={`${item.id}-${item.enhancement}-${item.superRare}-${i}`} className={`${rarityClass} font-medium`}>
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
                    <span> | 自動売却額: {formatNumber(log.autoSellProfit)}G</span>
                  )}
                </div>

                {log.rewards.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">獲得アイテム: </span>
                    {log.rewards.map((item, i) => {
                      const rarity = getItemRarityById(item.id);
                      const isSuperRare = item.superRare > 0;
                      const rarityClass = getRarityTextClass(rarity, isSuperRare);
                      return (
                        <span key={i} className={`${rarityClass} font-medium`}>
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
                                entry.outcome === 'defeat' ? 'text-accent font-medium' : 'text-yellow-600 font-medium'
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
                                <div className="h-full" style={{ width: `${Math.min(100, remainingRatio)}%`, backgroundColor: '#93c5fd' }} />
                                <div className="h-full" style={{ width: `${Math.min(100, healRatio)}%`, backgroundColor: '#b8edb2' }} />
                                <div className="h-full" style={{ width: `${Math.min(100, takenRatio)}%`, backgroundColor: '#fcb786' }} />
                              </div>
                            </div>
                            <div>
                              <div className="mb-0.5">敵HP {formatNumber(enemyRemainingAmount)} / {formatNumber(entry.enemyHP)}</div>
                              <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full" style={{ width: `${Math.min(100, enemyRemainingRatio)}%`, backgroundColor: '#93c5fd' }} />
                              </div>
                            </div>
                          </div>
                        </button>
                        {isRoomExpanded && entry.details && (
                          <div className="border-t border-gray-100 p-2 bg-gray-50 text-xs space-y-1">
                            <div className="font-medium text-gray-600 mb-1">戦闘ログ:</div>
                            {entry.details.map((battleLog, j) => {
                              const phaseBaseLabel = battleLog.actor === 'deity'
                                ? '末'
                                : battleLog.actor === 'effect'
                                  ? '効'
                                  : battleLog.phase === 'long'
                                    ? '遠'
                                    : battleLog.phase === 'mid'
                                      ? '魔'
                                      : '近';
                              const phaseLabel = battleLog.initiativeRoll !== undefined && battleLog.actor !== 'deity' && battleLog.actor !== 'effect'
                                ? `${phaseBaseLabel}${battleLog.initiativeRoll}`
                                : phaseBaseLabel;
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
                              const allMissed = totalAttempts > 0 && hits === 0;
                              const hitDisplay = totalAttempts > 0 ? `(${hits}/${totalAttempts}回)` : '';
                              const resonanceMatch = /(\(共鳴\+\d+%\))$/.exec(battleLog.action);

                              let actionText: string;
                              if (battleLog.actor === 'effect') {
                                actionText = battleLog.action;
                              } else if (isEnemy) {
                                if (allMissed) {
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

                              const compactHitDisplay = hitDisplay && resonanceMatch
                                ? `(${hits}/${totalAttempts}回, ${resonanceMatch[1].slice(1, -1)})`
                                : hitDisplay;
                              const actionDisplay = resonanceMatch && !allMissed
                                ? actionText.replace(/\(共鳴\+\d+%\)$/, '')
                                : actionText;

                              return (
                                <div key={j} className="flex justify-between text-gray-600">
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
  deityDonations,
  bags,
  onResetGame,
  onResetCommonBags,
  onResetUniqueBags,
  onResetSuperRareBag,
}: {
  deityDonations: Record<string, number>;
  bags: GameBags;
  onResetGame: () => void;
  onResetCommonBags: () => void;
  onResetUniqueBags: () => void;
  onResetSuperRareBag: () => void;
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [compendiumCategory, setCompendiumCategory] = useState<string>('armor');
  const [compendiumRarityFilter, setCompendiumRarityFilter] = useState<RarityFilter>('all');
  const [expandedCompendiumItems, setExpandedCompendiumItems] = useState<Record<number, boolean>>({});
  const [selectedBestiaryDungeonId, setSelectedBestiaryDungeonId] = useState<number>(1);
  const [expandedEnemies, setExpandedEnemies] = useState<Record<number, boolean>>({});

  const getInitialCount = (value: number) => ENHANCEMENT_TITLES.find(t => t.value === value)?.tickets ?? 0;
  const craftsmanInitial = getInitialCount(1);
  const demonicInitial = getInitialCount(2);
  const dwellingInitial = getInitialCount(3);
  const legendaryInitial = getInitialCount(4);
  const terribleInitial = getInitialCount(5);
  const ultimateInitial = getInitialCount(6);

  const commonRewardTotal = 100;
  const commonRewardRemaining = bags.commonRewardBag?.tickets.length ?? 0;
  const commonRewardWins = bags.commonRewardBag?.tickets.filter(t => t === 1).length ?? 0;

  const commonEnhancementTotal = ENHANCEMENT_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const commonEnhancementRemaining = bags.commonEnhancementBag?.tickets.length ?? 0;
  const commonCraftsmanRemaining = bags.commonEnhancementBag?.tickets.filter(t => t === 1).length ?? 0;
  const commonDemonicRemaining = bags.commonEnhancementBag?.tickets.filter(t => t === 2).length ?? 0;
  const commonDwellingRemaining = bags.commonEnhancementBag?.tickets.filter(t => t === 3).length ?? 0;
  const commonLegendaryRemaining = bags.commonEnhancementBag?.tickets.filter(t => t === 4).length ?? 0;
  const commonTerribleRemaining = bags.commonEnhancementBag?.tickets.filter(t => t === 5).length ?? 0;
  const commonUltimateRemaining = bags.commonEnhancementBag?.tickets.filter(t => t === 6).length ?? 0;

  const uniqueRewardTotal = 100;
  const uncommonRewardRemaining = bags.uncommonRewardBag.tickets.length;
  const uncommonRewardWins = bags.uncommonRewardBag.tickets.filter(t => t === 1).length;
  const rareRewardRemaining = bags.rareRewardBag.tickets.length;
  const rareRewardWins = bags.rareRewardBag.tickets.filter(t => t === 1).length;
  const mythicRewardRemaining = bags.mythicRewardBag.tickets.length;
  const mythicRewardWins = bags.mythicRewardBag.tickets.filter(t => t === 1).length;

  const enhancementTotal = 5490 + (ENHANCEMENT_TITLES.reduce((sum, t) => sum + (t.value === 0 ? 0 : t.tickets), 0));
  const enhancementRemaining = bags.enhancementBag.tickets.length;
  const craftsmanRemaining = bags.enhancementBag.tickets.filter(t => t === 1).length;
  const demonicRemaining = bags.enhancementBag.tickets.filter(t => t === 2).length;
  const dwellingRemaining = bags.enhancementBag.tickets.filter(t => t === 3).length;
  const legendaryRemaining = bags.enhancementBag.tickets.filter(t => t === 4).length;
  const terribleRemaining = bags.enhancementBag.tickets.filter(t => t === 5).length;
  const ultimateRemaining = bags.enhancementBag.tickets.filter(t => t === 6).length;

  const confirmReset = (label: string, onConfirm: () => void) => {
    if (!window.confirm(`${label}を実行します。\n現在の抽選状況が初期化されます。\nよろしいですか？`)) {
      return;
    }

    onConfirm();
  };

  const superRareTotal = SUPER_RARE_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const superRareRemaining = bags.superRareBag.tickets.length;
  const superRareInitial = SUPER_RARE_TITLES.filter(t => t.value > 0).reduce((sum, t) => sum + t.tickets, 0);
  const superRareHits = bags.superRareBag.tickets.filter(t => t > 0).length;

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

  const BESTIARY_TAB_LABELS: Record<number, string> = {
    1: '原',
    2: '崖',
    3: '樹',
    4: '峰',
    5: '茂',
    6: '巣',
    7: '園',
    8: '谷',
  };

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

  const ENEMY_ABILITY_LABELS: Record<string, string> = {
    first_strike: '先制攻撃1:行動が早くなる',
    counter: '反撃1:相手の近距離攻撃を受けたとき反撃(攻撃回数半減)',
    re_attack: '連撃1:攻撃時に追加攻撃を1回行う(攻撃回数半減)',
    deflection: '矢払い:相手の遠距離攻撃の命中率を10%低下させる',
    null_counter: '反撃無効化:カウンター攻撃を無効化',
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
    return applyEnemyEncounterScaling(enemy, dungeon, floorNumber, roomType);
  };

  return (
    <div>
      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm font-medium mb-3">1. 寄付箱</div>
        <div className="bg-white rounded p-2 text-sm space-y-1">
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
        </div>
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm font-medium mb-3">2. 未来視</div>

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
            <div className="text-xs text-gray-500 mb-1">rare_reward_bag (レア抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{formatNumber(rareRewardRemaining)} / {formatNumber(uniqueRewardTotal)}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{formatNumber(rareRewardWins)}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">mythic_reward_bag (神魔レア抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{formatNumber(mythicRewardRemaining)} / {formatNumber(uniqueRewardTotal)}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{formatNumber(mythicRewardWins)}</span></div>
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
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm font-medium mb-3">3. アイテム図鑑</div>
        <div className="flex justify-end items-center gap-1 mb-3">
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
                    <span className="text-gray-500"> {getRarityShortLabel(item.id)} {getItemStats(baseItem)}</span>
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
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm font-medium mb-3">4. 敵キャラクター図鑑</div>
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {DUNGEONS.map(dungeon => (
            <button
              key={dungeon.id}
              onClick={() => setSelectedBestiaryDungeonId(dungeon.id)}
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
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          <div className="text-xs text-gray-500">{selectedBestiaryDungeon.name}</div>
          {selectedBestiaryGroups.map(group => (
            <div key={group.key} className="bg-white rounded border border-gray-200 p-2">
              <div className="text-xs text-gray-500 font-medium mb-1">{group.label}</div>
              {group.enemies.map(enemy => {
                const displayEnemy = getDisplayEnemy(enemy, selectedBestiaryDungeon, group.floorNumber, group.groupType);
                const enemyClass = ENEMY_CLASS_LABELS[displayEnemy.enemyClass] ?? '不明';
                const enemyExpanded = !!expandedEnemies[displayEnemy.id];
                const defenseAmplifierPercent = displayEnemy.defenseAmplifier * 100;
                return (
                  <div key={displayEnemy.id} className="mt-2 border border-gray-100 rounded">
                    <button
                      onClick={() => setExpandedEnemies(prev => ({ ...prev, [displayEnemy.id]: !enemyExpanded }))}
                      className="w-full text-left px-2 py-1 text-sm flex justify-between items-center"
                    >
                      <span>{renderEnemyNameWithMutedClass(getEnemyDisplayNameWithClass(displayEnemy))}</span>
                      <span className="text-xs text-gray-500">{enemyExpanded ? '▲' : '▼'}</span>
                    </button>
                    {enemyExpanded && (
                      <div className="px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>ID: {displayEnemy.id}</div>
                          <div>クラス: {enemyClass}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>HP: {formatNumber(displayEnemy.hp)}</div>
                          <div>経験値: {formatNumber(displayEnemy.experience)}</div>
                          {(() => {
                            const hasRangedAttack = hasEnemyAttack(displayEnemy.rangedAttack, displayEnemy.rangedNoA);
                            const hasMeleeAttack = hasEnemyAttack(displayEnemy.meleeAttack, displayEnemy.meleeNoA);
                            const hasMagicalAttack = hasEnemyAttack(displayEnemy.magicalAttack, displayEnemy.magicalNoA);
                            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
                            const decay = (0.90 + displayEnemy.accuracyBonus).toFixed(2);

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
                        <div>特殊能力: {displayEnemy.abilities.length > 0 ? displayEnemy.abilities.map(a => ENEMY_ABILITY_LABELS[a] ?? a).join(', ') : 'なし'}</div>
                        <div className="pt-1">ドロップ候補: {getEnemyDropCandidates(displayEnemy).map(item => `${getRarityShortLabel(item.id)}${item.name}`).join(' / ')}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-pane rounded-lg p-4">
        <div className="text-sm font-medium mb-2">4. ゲームリセット</div>
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
    </div>
  );
}
