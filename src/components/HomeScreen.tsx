import { useState, useEffect, useRef } from 'react';
import { GameState, GameBags, Item, Character, InventoryRecord, InventoryVariant, NotificationStyle, NotificationCategory, EnemyDef, Dungeon, Party } from '../types';
import { computePartyStats } from '../game/partyComputation';
import { DUNGEONS } from '../data/dungeons';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import { ENHANCEMENT_TITLES, SUPER_RARE_TITLES, ITEMS } from '../data/items';
import { getItemDisplayName } from '../game/gameState';
import { ENEMIES, getEnemyDropCandidates } from '../data/enemies';
import { applyEnemyEncounterScaling } from '../game/enemyScaling';
import { DEITY_OPTIONS, getDeityEffectDescription, normalizeDeityName } from '../game/deity';

interface HomeScreenProps {
  state: GameState;
  bags: GameBags;
  actions: {
    selectParty: (partyIndex: number) => void;
    selectDungeon: (partyIndex: number, dungeonId: number) => void;
    runExpedition: (partyIndex: number) => void;
    updatePartyDeity: (partyIndex: number, deityName: string) => void;
    equipItem: (characterId: number, slotIndex: number, itemKey: string | null) => void;
    updateCharacter: (characterId: number, updates: Partial<Character>) => void;
    sellStack: (variantKey: string) => void;
    setVariantStatus: (variantKey: string, status: 'notown') => void;
    markItemsSeen: () => void;
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

type Tab = 'party' | 'expedition' | 'inventory' | 'shop' | 'setting';

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

const ELITE_GATE_REQUIREMENTS: Record<number, number> = {
  1: 3,
  2: 9,
  3: 18,
  4: 30,
  5: 45,
};

const PARTY_LEVEL_EXP = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
  4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000,
  26000, 30500, 35500, 41000, 47000, 53500, 60500, 68000, 76000
];

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

function countOwnedItemsOfRarityForTier(
  inventory: InventoryRecord,
  characters: Character[],
  tier: number,
  rarity: 'uncommon' | 'rare' | 'mythic'
): number {
  const rarityItems = ITEMS.filter(item => {
    const itemTier = Math.floor(item.id / 1000);
    if (itemTier !== tier) return false;

    const rarityCode = item.id % 1000;
    if (rarity === 'mythic') return rarityCode >= 400;
    if (rarity === 'rare') return rarityCode >= 300 && rarityCode < 400;
    return rarityCode >= 200 && rarityCode < 300;
  });

  const rarityIds = new Set(rarityItems.map(item => item.id));
  let count = 0;

  for (const variant of Object.values(inventory)) {
    if (variant.status === 'owned' && variant.count > 0 && rarityIds.has(variant.item.id)) {
      count += variant.count;
    }
  }

  for (const character of characters) {
    for (const equippedItem of character.equipment) {
      if (equippedItem && rarityIds.has(equippedItem.id)) {
        count += 1;
      }
    }
  }

  return count;
}

function getDungeonEntryGateState(
  party: Party,
  globalInventory: InventoryRecord,
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
  const required = 1;
  const collected = countOwnedItemsOfRarityForTier(
    globalInventory,
    party.characters,
    dungeon.id - 1,
    'mythic'
  );

  return {
    locked: collected < required,
    gateText: `🔒 解放条件: ${previousDungeonName}の神魔レアアイテム ${collected}/${required} 収集`,
  };
}

function getNextGoalText(party: Party, globalInventory: InventoryRecord): string | null {
  const currentDungeon = DUNGEONS.find(d => d.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors) return null;

  const tier = currentDungeon.enemyPoolIds[0];

  for (const floor of currentDungeon.floors) {
    const hasEliteGate = floor.floorNumber < 6;
    if (hasEliteGate) {
      const required = ELITE_GATE_REQUIREMENTS[floor.floorNumber] ?? 3;
      const collected = countOwnedItemsOfRarityForTier(globalInventory, party.characters, tier, 'uncommon');
      if (collected < required) {
        return `次の目標: ${currentDungeon.name} ${floor.floorNumber}F-4の解放: アンコモンアイテム ${collected}/${required} 収集`;
      }
    }
  }

  const bossRequired = 3;
  const rareCollected = countOwnedItemsOfRarityForTier(globalInventory, party.characters, tier, 'rare');
  if (rareCollected < bossRequired) {
    return `次の目標: ${currentDungeon.name} 6F-4の解放: レアアイテム ${rareCollected}/${bossRequired} 収集`;
  }

  return null;
}

// Helper to format item stats

function getItemStats(item: Item): string {
  const multiplier = (ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1) *
    (SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1);
  const baseMultiplier = item.baseMultiplier ?? 1;
  const multiplierPercent = Math.round((baseMultiplier - 1) * 100);
  const formatSigned = (value: number, suffix: string = ''): string =>
    `${value >= 0 ? '+' : ''}${value}${suffix}`;
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
    if (baseNoA !== 0) stats.push(`近回数${formatSigned(baseNoA)}`);
    if (item.meleeNoABonus) stats.push(formatBracket('近回数', item.meleeNoABonus));
  }
  if (item.rangedNoA || item.rangedNoABonus) {
    const baseNoA = item.rangedNoA ?? 0;
    if (baseNoA !== 0) stats.push(`遠回数${formatSigned(baseNoA)}`);
    if (item.rangedNoABonus) stats.push(formatBracket('遠回数', item.rangedNoABonus));
  }
  if (item.magicalNoA || item.magicalNoABonus) {
    const baseNoA = item.magicalNoA ?? 0;
    if (baseNoA !== 0) stats.push(`魔回数${formatSigned(baseNoA)}`);
    if (item.magicalNoABonus) stats.push(formatBracket('魔回数', item.magicalNoABonus));
  }
  if (item.physicalDefense) stats.push(`物防+${Math.floor(item.physicalDefense * multiplier)}`);
  if (item.magicalDefense) stats.push(`魔防+${Math.floor(item.magicalDefense * multiplier)}`);
  if (item.category === 'armor' && multiplierPercent) stats.push(formatBracket('物防', multiplierPercent, '%'));
  if (item.category === 'robe' && multiplierPercent) stats.push(formatBracket('魔防', multiplierPercent, '%'));
  if (item.partyHP) stats.push(`HP+${Math.floor(item.partyHP * multiplier)}`);
  if (item.evasionBonus) stats.push(formatBracket('回避', Math.round(item.evasionBonus * 1000)));
  if (item.elementalOffense && item.elementalOffense !== 'none') {
    const elem = { fire: '炎', ice: '氷', thunder: '雷' }[item.elementalOffense];
    stats.push(`${elem}属性`);
  }
  return stats.join(' ');
}

function getOffenseMultiplierSum(items: Item[], kind: 'melee' | 'ranged' | 'magical'): number {
  const relevant = items.filter(item => {
    if (kind === 'melee') return item.meleeAttack || item.meleeNoA || item.meleeNoABonus;
    if (kind === 'ranged') return item.rangedAttack || item.rangedNoA || item.rangedNoABonus;
    return item.magicalAttack || item.magicalNoA || item.magicalNoABonus;
  });
  const bonusSum = relevant.reduce((sum, item) => sum + ((item.baseMultiplier ?? 1) - 1), 0);
  return 1 + bonusSum;
}

function getDefenseMultiplierSum(items: Item[], kind: 'physical' | 'magical'): number {
  const relevant = items.filter(item => {
    if (kind === 'physical') return item.physicalDefense;
    return item.magicalDefense;
  });
  const bonusSum = relevant.reduce((sum, item) => sum + ((item.baseMultiplier ?? 1) - 1), 0);
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
  counter: 'カウンター',
  re_attack: '再攻撃',
  iaigiri: '居合斬り',
  resonance: '共鳴',
  command: '指揮',
  m_barrier: '魔法障壁',
  unlock: '解錠',
  null_counter: '無効化',
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
      parts.push(`追撃${Math.round(b.value * 100)}%`);
    } else if (b.type === 'accuracy') {
      parts.push(`命中+${b.value}`);
    } else if (b.type === 'evasion') {
      parts.push(`回避+${b.value}`);
    } else if (b.type === 'ability' && b.abilityId) {
      const name = ABILITY_NAMES[b.abilityId] || b.abilityId;
      parts.push(`${name}Lv${b.abilityLevel || 1}`);
    }
  }
  return parts.join(', ');
}

// Short class names for party list
const CLASS_SHORT_NAMES: Record<string, string> = {
  fighter: '戦',
  duelist: '剣',
  ninja: '忍',
  samurai: '侍',
  lord: '君',
  ranger: '狩',
  wizard: '魔',
  sage: '賢',
  rogue: '盗',
  pilgrim: '巡',
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
  const [activeTab, setActiveTab] = useState<Tab>('party');
  const [selectedCharacter, setSelectedCharacter] = useState<number>(0);
  const [editingCharacter, setEditingCharacter] = useState<number | null>(null);

  const currentParty = state.parties[state.selectedPartyIndex];
  const prevLogRef = useRef<typeof currentParty.lastExpeditionLog>(null);
  const prevSelectedPartyRef = useRef(state.selectedPartyIndex);
  const { partyStats, characterStats } = computePartyStats(currentParty);

  // Item drop notifications after expedition
  useEffect(() => {
    if (prevSelectedPartyRef.current !== state.selectedPartyIndex) {
      prevSelectedPartyRef.current = state.selectedPartyIndex;
      prevLogRef.current = currentParty.lastExpeditionLog;
      return;
    }

    if (currentParty.lastExpeditionLog && currentParty.lastExpeditionLog !== prevLogRef.current) {
      // Show notification for each reward (non-auto-sold items)
      for (const item of currentParty.lastExpeditionLog.rewards) {
        const isSuperRare = item.superRare > 0;
        const itemName = getItemDisplayName(item);
        const rarity = getItemRarityById(item.id);
        actions.addNotification(
          `${currentParty.name}:${itemName}を入手！`,
          rarity === 'rare' || rarity === 'mythic' || isSuperRare ? 'rare' : 'normal',
          'item',
          undefined,
          { rarity, isSuperRareItem: isSuperRare }
        );
      }
    }
    prevLogRef.current = currentParty.lastExpeditionLog;
  }, [currentParty.lastExpeditionLog, actions, currentParty, state.selectedPartyIndex]);
  const tabs: { id: Tab; label: string }[] = [
    { id: 'party', label: 'パーティ' },
    { id: 'expedition', label: '探検' },
    { id: 'inventory', label: '所持品' },
    { id: 'shop', label: '店' },
    { id: 'setting', label: '神聖局' },
  ];

  // Check for new items
  const hasNewItems = Object.values(state.global.inventory).some(variant => variant.isNew);

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white border-b border-gray-300 p-3 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">ケモの冒険</h1>
            <div className="text-xs text-gray-500">v0.2.2 ({state.buildNumber})</div>
          </div>
          <div className="text-right text-sm font-medium">{state.global.gold}G</div>
        </div>
        
        {/* Tabs */}
        <div className="flex mt-3 -mb-3 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                // Mark items as seen when going to inventory
                if (tab.id === 'inventory' && hasNewItems) {
                  actions.markItemsSeen();
                }
              }}
              className={`flex-1 py-2 text-sm font-medium relative ${
                activeTab === tab.id
                  ? 'text-sub border-b-2 border-sub'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.id === 'inventory' && hasNewItems && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-accent rounded-full"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
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
            onEquipItem={actions.equipItem}
            onAddStatNotifications={actions.addStatNotifications}
            onSelectParty={actions.selectParty}
            onUpdatePartyDeity={actions.updatePartyDeity}
            inventory={state.global.inventory}
          />
        )}

        {activeTab === 'expedition' && (
          <ExpeditionTab
            state={state}
            onSelectDungeon={actions.selectDungeon}
            onRunExpedition={actions.runExpedition}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            inventory={state.global.inventory}
            onSellStack={actions.sellStack}
            onSetVariantStatus={actions.setVariantStatus}
          />
        )}

        {activeTab === 'shop' && (
          <ShopTab
            gold={state.global.gold}
          />
        )}

        {activeTab === 'setting' && (
          <SettingTab
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
  onEquipItem,
  onAddStatNotifications,
  onSelectParty,
  onUpdatePartyDeity,
  inventory,
}: {
  parties: Party[];
  selectedPartyIndex: number;
  party: Party;
  partyStats: ReturnType<typeof computePartyStats>['partyStats'];
  characterStats: ReturnType<typeof computePartyStats>['characterStats'];
  selectedCharacter: number;
  setSelectedCharacter: (i: number) => void;
  editingCharacter: number | null;
  setEditingCharacter: (i: number | null) => void;
  onUpdateCharacter: (id: number, updates: Partial<Character>) => void;
  onEquipItem: (characterId: number, slotIndex: number, itemKey: string | null) => void;
  onAddStatNotifications: (changes: Array<{ message: string; isPositive: boolean }>) => void;
  onSelectParty: (partyIndex: number) => void;
  onUpdatePartyDeity: (partyIndex: number, deityName: string) => void;
  inventory: InventoryRecord;
}) {
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [equipCategory, setEquipCategory] = useState('armor');
  const [partyRarityFilter, setPartyRarityFilter] = useState<RarityFilter>('all');
  const [partySuperRareOnly, setPartySuperRareOnly] = useState(false);

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
    hp: Math.floor(partyStats.hp),
  };

  const prevStatsRef = useRef<typeof combatTotals | null>(null);
  const prevSelectedCharRef = useRef(selectedCharacter);
  const prevSelectedPartyRef = useRef(selectedPartyIndex);

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
        changes.push({ message: `物防 ${prev.physDef} → ${combatTotals.physDef}`, isPositive });
      }
      if (combatTotals.magDef !== prev.magDef) {
        const isPositive = combatTotals.magDef > prev.magDef;
        changes.push({ message: `魔防 ${prev.magDef} → ${combatTotals.magDef}`, isPositive });
      }
      if (combatTotals.hp !== prev.hp) {
        const isPositive = combatTotals.hp > prev.hp;
        changes.push({ message: `HP ${prev.hp} → ${combatTotals.hp}`, isPositive });
      }
      if (combatTotals.meleeAtk !== prev.meleeAtk) {
        const isPositive = combatTotals.meleeAtk > prev.meleeAtk;
        changes.push({ message: `近攻 ${prev.meleeAtk} → ${combatTotals.meleeAtk}`, isPositive });
      }
      if (combatTotals.meleeNoA !== prev.meleeNoA) {
        const isPositive = combatTotals.meleeNoA > prev.meleeNoA;
        changes.push({ message: `近回数 ${prev.meleeNoA} → ${combatTotals.meleeNoA}`, isPositive });
      }
      if (combatTotals.rangedAtk !== prev.rangedAtk) {
        const isPositive = combatTotals.rangedAtk > prev.rangedAtk;
        changes.push({ message: `遠攻 ${prev.rangedAtk} → ${combatTotals.rangedAtk}`, isPositive });
      }
      if (combatTotals.rangedNoA !== prev.rangedNoA) {
        const isPositive = combatTotals.rangedNoA > prev.rangedNoA;
        changes.push({ message: `遠回数 ${prev.rangedNoA} → ${combatTotals.rangedNoA}`, isPositive });
      }
      if (combatTotals.magicalAtk !== prev.magicalAtk) {
        const isPositive = combatTotals.magicalAtk > prev.magicalAtk;
        changes.push({ message: `魔攻 ${prev.magicalAtk} → ${combatTotals.magicalAtk}`, isPositive });
      }
      if (combatTotals.magicalNoA !== prev.magicalNoA) {
        const isPositive = combatTotals.magicalNoA > prev.magicalNoA;
        changes.push({ message: `魔回数 ${prev.magicalNoA} → ${combatTotals.magicalNoA}`, isPositive });
      }

      // Send all stat notifications at once (clears previous stat notifications)
      if (changes.length > 0) {
        onAddStatNotifications(changes);
      }
    }
    prevStatsRef.current = combatTotals;
  }, [combatTotals.physDef, combatTotals.magDef, combatTotals.hp,
      combatTotals.meleeAtk, combatTotals.meleeNoA,
      combatTotals.rangedAtk, combatTotals.rangedNoA,
      combatTotals.magicalAtk, combatTotals.magicalNoA, onAddStatNotifications, selectedCharacter, selectedPartyIndex]);
  const [pendingEdits, setPendingEdits] = useState<Partial<Character> | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [editingDeity, setEditingDeity] = useState(false);
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

  const char = party.characters[selectedCharacter];
  const stats = characterStats[selectedCharacter];
  const race = RACES.find(r => r.id === char.raceId)!;
  const mainClass = CLASSES.find(c => c.id === char.mainClassId)!;
  const subClass = CLASSES.find(c => c.id === char.subClassId)!;
  const predisposition = PREDISPOSITIONS.find(p => p.id === char.predispositionId)!;
  const lineage = LINEAGES.find(l => l.id === char.lineageId)!;

  return (
    <div>
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

      <div className="mb-3 text-sm flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="font-medium">{party.deity.name}</span>
          <span className="text-gray-500"> (Level: {party.deity.level}, Experience {party.deity.experience}/{party.deity.level < 29 ? PARTY_LEVEL_EXP[party.deity.level] : party.deity.experience})</span>
          <div className="text-xs text-gray-600 mt-1">効果:{getDeityEffectDescription(party.deity.name)}</div>
        </div>
        {editingDeity ? (
          <div className="flex items-center gap-2">
            <select
              value={party.deity.name}
              onChange={(e) => onUpdatePartyDeity(selectedPartyIndex, e.target.value)}
              className="text-xs border rounded px-2 py-1"
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
            <button
              onClick={() => setEditingDeity(false)}
              className="text-xs text-sub"
            >
              完了
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingDeity(true)}
            className="text-sm text-sub flex-shrink-0"
          >
            編集
          </button>
        )}
      </div>

      {/* Character selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {party.characters.map((c, i) => {
          const r = RACES.find(r => r.id === c.raceId)!;
          const mc = CLASSES.find(cl => cl.id === c.mainClassId)!;
          const sc = CLASSES.find(cl => cl.id === c.subClassId)!;
          const isMaster = c.mainClassId === c.subClassId;
          const mcShort = CLASS_SHORT_NAMES[mc.id] ?? mc.name;
          const scShort = CLASS_SHORT_NAMES[sc.id] ?? sc.name;
          return (
            <button
              key={c.id}
              onClick={() => { setSelectedCharacter(i); setSelectingSlot(null); }}
              className={`flex-shrink-0 p-2 rounded-lg border ${
                i === selectedCharacter ? 'border-sub bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="text-2xl text-center">{r.emoji}</div>
              <div className="text-xs text-gray-400 text-center">
                {mcShort}({isMaster ? '師' : scShort})
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
                // LONG phase: 1.0
                const longAmp = 1.0;
                // MID phase: 1.0
                const midAmp = 1.0;
                // CLOSE phase: 2.0 if iaigiri, otherwise 1.0
                const closeAmp = iaigiri ? 2.0 : 1.0;
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
                  offenseLines.push(`遠距離攻撃:${Math.floor(stats.rangedAttack)} x ${stats.rangedNoA}回(x${amp.toFixed(2)})`);
                }
                if (hasMagical) {
                  const amp = midAmp * baseMultMagical;
                  offenseLines.push(`魔法攻撃:${Math.floor(stats.magicalAttack)} x ${stats.magicalNoA}回(x${amp.toFixed(2)})`);
                }
                if (hasMelee) {
                  const amp = closeAmp * baseMultMelee;
                  offenseLines.push(`近接攻撃:${Math.floor(stats.meleeAttack)} x ${stats.meleeNoA}回(x${amp.toFixed(2)})`);
                }

                // Add accuracy display if character has ranged or melee NoA (physical attacks)
                // 命中率: d.accuracy_potency x 100 % (減衰: x (0.90 + c.accuracy+v))
                const hasPhysicalAttacks = stats.rangedNoA > 0 || stats.meleeNoA > 0;
                if (hasPhysicalAttacks) {
                  const baseDecay = 0.90 + stats.accuracyBonus;
                  offenseLines.push(`命中率: ${Math.round(stats.accuracyPotency * 100)}% (減衰: x${baseDecay.toFixed(2)})`);
                }

                // Defense lines
                const defenseAmpPhysical = Math.max(0.01, defenseMultPhysical + stats.deityDefenseAmplifierBonus.physical);
                const defenseAmpMagical = Math.max(0.01, defenseMultMagical + stats.deityDefenseAmplifierBonus.magical);
                const defenseLines = [
                  `属性:${elementName}(x${stats.elementalOffenseValue.toFixed(1)})`,
                  `物防:${stats.physicalDefense} (${Math.round(defenseAmpPhysical * 100)}%)`,
                  `魔防:${stats.magicalDefense} (${Math.round(defenseAmpMagical * 100)}%)`,
                ];
                defenseLines.push(`回避:${stats.evasionBonus >= 0 ? '+' : ''}${Math.round(stats.evasionBonus * 1000)}`);

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

              for (const b of allBonuses) {
                if (b.type.endsWith('_multiplier')) {
                  const key = b.type.replace('_multiplier', '');
                  if (!multiplierValues[key]) multiplierValues[key] = new Set();
                  multiplierValues[key].add(b.value);
                } else if (['vitality', 'strength', 'intelligence', 'mind', 'equip_slot', 'grit', 'caster', 'pursuit'].includes(b.type)) {
                  additive[b.type] = (additive[b.type] ?? 0) + b.value;
                } else if (b.type === 'penet' || b.type === 'accuracy' || b.type === 'evasion') {
                  additive[b.type] = (additive[b.type] ?? 0) + b.value;
                }
              }

              // Calculate multipliers from unique values
              const multipliers: Record<string, number> = {};
              for (const [key, values] of Object.entries(multiplierValues)) {
                multipliers[key] = Array.from(values).reduce((prod, v) => prod * v, 1);
              }

              // Format display
              const parts: string[] = [];
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
                if (val !== 1) parts.push(`${mulNames[key] ?? key}x${val.toFixed(1)}`);
              }
              for (const [key, val] of Object.entries(additive)) {
                if (val !== 0) {
                  if (key === 'penet') {
                    parts.push(`${addNames[key]}+${Math.round(val * 100)}%`);
                  } else if (key === 'accuracy' || key === 'evasion') {
                    // Show as decimal like +0.01
                    parts.push(`${addNames[key]}+${val.toFixed(2)}`);
                  } else {
                    parts.push(`${addNames[key] ?? key}+${val}`);
                  }
                }
              }

              if (parts.length === 0) return null;
              return (
                <div className="text-xs text-gray-600 mt-1">
                  ボーナス: {parts.join(', ')}
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
            {char.equipment.filter(e => e).length} / {stats.maxEquipSlots} スロット
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
              {CATEGORY_GROUPS.map(group => (
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
  onRunExpedition,
}: {
  state: GameState;
  onSelectDungeon: (partyIndex: number, dungeonId: number) => void;
  onRunExpedition: (partyIndex: number) => void;
}) {
  const [expandedLogParty, setExpandedLogParty] = useState<number | null>(null);
  const [expandedRoom, setExpandedRoom] = useState<{ partyIndex: number; roomIndex: number } | null>(null);

  const handleRunAllExpeditions = () => {
    state.parties.forEach((party, partyIndex) => {
      const selectedDungeon = DUNGEONS.find(d => d.id === party.selectedDungeonId);
      if (!selectedDungeon) return;
      const gateState = getDungeonEntryGateState(party, state.global.inventory, selectedDungeon);
      if (!gateState.locked) {
        onRunExpedition(partyIndex);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={handleRunAllExpeditions}
          className="px-3 py-1 text-white rounded font-medium text-sm bg-sub hover:bg-blue-600"
        >
          一括出撃
        </button>
      </div>

      {/* Party Expedition Slots */}
      {[0, 1, 2, 3, 4, 5].map((partyIndex) => {
        const party = state.parties[partyIndex];

        if (!party) {
          // Locked party slot
          return (
            <div key={partyIndex} className="bg-pane rounded-lg p-4">
              <div className="text-gray-400">PT{partyIndex + 1}: (未開放)</div>
            </div>
          );
        }

        const selectedDungeon = DUNGEONS.find(d => d.id === party.selectedDungeonId);
        const selectedDungeonGate = selectedDungeon ? getDungeonEntryGateState(party, state.global.inventory, selectedDungeon) : null;
        const { partyStats } = computePartyStats(party);

        return (
          <div key={partyIndex} className="bg-pane rounded-lg p-4">
            <div className="text-sm mb-2 flex justify-between items-center">
              <span className="font-bold text-black">{party.name} {party.deity.name}(Level: {party.deity.level})</span>
              <span className="text-gray-500">HP: {partyStats.hp}</span>
            </div>
            {/* Party Expedition Header */}
            <div className="flex items-center gap-2 mb-3">
              <select
                value={party.selectedDungeonId}
                onChange={(e) => onSelectDungeon(partyIndex, Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
              >
                {DUNGEONS.map(dungeon => {
                  const gateState = getDungeonEntryGateState(party, state.global.inventory, dungeon);
                  return (
                    <option key={dungeon.id} value={dungeon.id} disabled={gateState.locked}>
                      {dungeon.name} {gateState.locked ? '🔒' : ''}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={() => onRunExpedition(partyIndex)}
                disabled={selectedDungeonGate?.locked}
                className={`px-3 py-1 text-white rounded font-medium text-sm ${
                  selectedDungeonGate?.locked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-sub hover:bg-blue-600'
                }`}
              >
                出撃
              </button>
            </div>

            {(() => {
              const nextGoalText = getNextGoalText(party, state.global.inventory);
              if (!nextGoalText) return null;
              return <div className="mt-3 text-sm text-gray-700">{nextGoalText}</div>;
            })()}

            {/* Last Expedition Log */}
            {party.lastExpeditionLog && (
              <div className="border-t border-gray-200 pt-3">
                <button
                  onClick={() => setExpandedLogParty(expandedLogParty === partyIndex ? null : partyIndex)}
                  className="w-full flex justify-between items-center text-sm"
                >
                  <span>
                    <span className="font-medium">結果: {party.lastExpeditionLog.dungeonName} (残HP {Math.round((party.lastExpeditionLog.remainingPartyHP / Math.max(1, party.lastExpeditionLog.maxPartyHP)) * 100)}%)</span>
                    <span className={`ml-2 font-medium ${
                      party.lastExpeditionLog.finalOutcome === 'victory' ? 'text-sub' :
                      party.lastExpeditionLog.finalOutcome === 'defeat' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {party.lastExpeditionLog.finalOutcome === 'victory' ? '勝利' :
                       party.lastExpeditionLog.finalOutcome === 'defeat' ? '敗北' : '撤退'}
                    </span>
                  </span>
                  <span className={`transform transition-transform ${expandedLogParty === partyIndex ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {expandedLogParty === partyIndex && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm text-gray-500">
                      残HP: {party.lastExpeditionLog.remainingPartyHP}/{party.lastExpeditionLog.maxPartyHP}
                      {' '}| {party.lastExpeditionLog.completedRooms}/{party.lastExpeditionLog.totalRooms}部屋
                      {' '}| EXP: +{party.lastExpeditionLog.totalExperience}
                      {party.lastExpeditionLog.autoSellProfit > 0 && (
                        <span> | 自動売却額: {party.lastExpeditionLog.autoSellProfit}G</span>
                      )}
                    </div>

                    {party.lastExpeditionLog.rewards.length > 0 && (
                      <div className="text-sm">
                        <span className="text-gray-500">獲得アイテム: </span>
                        {party.lastExpeditionLog.rewards.map((item, i) => {
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
                      {[...party.lastExpeditionLog.entries].reverse().map((entry, i, arr) => {
                        const originalIndex = arr.length - 1 - i;
                        let roomLabel: string;
                        if (entry.floor && entry.roomInFloor) {
                          roomLabel = `${entry.floor}F-${entry.roomInFloor}`;
                        } else {
                          const isBoss = entry.room === party.lastExpeditionLog!.totalRooms + 1;
                          roomLabel = isBoss ? 'BOSS' : entry.room.toString();
                        }
                        const hpPercent = Math.round((entry.remainingPartyHP / entry.maxPartyHP) * 100);
                        const isRoomExpanded = expandedRoom?.partyIndex === partyIndex && expandedRoom?.roomIndex === originalIndex;

                        return (
                          <div key={originalIndex} className="bg-white rounded overflow-hidden">
                            <button
                              onClick={() => setExpandedRoom(isRoomExpanded ? null : { partyIndex, roomIndex: originalIndex })}
                              className="w-full text-left p-2 text-xs"
                            >
                              <div className="flex justify-between items-center">
                                <span>
                                  <span className="font-medium">{roomLabel}: {entry.enemyName}</span>
                                  <span className="text-gray-500"> | 敵HP:{entry.enemyHP} | 残HP:{entry.remainingPartyHP}({hpPercent}%)</span>
                                </span>
                                <span className="flex items-center gap-2">
                                  <span className={
                                    entry.gateInfo ? 'text-gray-500 font-medium' :
                                    entry.outcome === 'victory' ? 'text-sub font-medium' :
                                    entry.outcome === 'defeat' ? 'text-red-600 font-medium' : 'text-yellow-600 font-medium'
                                  }>
                                    {entry.gateInfo ? '未到達' :
                                     entry.outcome === 'victory' ? '勝利' :
                                     entry.outcome === 'defeat' ? '敗北' : '引分'}
                                  </span>
                                  <span className={`transform transition-transform ${isRoomExpanded ? 'rotate-180' : ''}`}>▼</span>
                                </span>
                              </div>
                              <div className="text-gray-500 mt-1">
                                敵攻撃:{entry.enemyAttackValues} | 与ダメ:{entry.damageDealt} | 被ダメ:{entry.damageTaken}
                                {entry.healAmount && entry.healAmount > 0 && <span className="text-green-600"> | 回復:+{entry.healAmount}HP</span>}
                                {entry.gateInfo && <span className="text-orange-700"> | 解放条件: {entry.gateInfo}</span>}
                                {entry.reward && <span className={` ${getRewardTextClass(entry.rewardRarity, entry.rewardIsSuperRare)} ${entry.rewardIsSuperRare ? 'font-bold' : 'font-medium'}`}> | 獲得:{entry.reward}</span>}
                              </div>
                            </button>
                            {isRoomExpanded && entry.details && (
                              <div className="border-t border-gray-100 p-2 bg-gray-50 text-xs space-y-1">
                                <div className="font-medium text-gray-600 mb-1">戦闘ログ:</div>
                                {entry.details.map((log, j) => {
                                  const phaseLabel = log.phase === 'long' ? '遠' : log.phase === 'mid' ? '魔' : '近';
                                  const getPhaseEmoji = () => {
                                    if (log.elementalOffense === 'fire') return '🔥';
                                    if (log.elementalOffense === 'thunder') return '⚡';
                                    if (log.elementalOffense === 'ice') return '❄️';
                                    if (log.phase === 'long') return '🏹';
                                    if (log.phase === 'mid') return '🪄';
                                    return '⚔';
                                  };
                                  const emoji = getPhaseEmoji();
                                  const isEnemy = log.actor === 'enemy';
                                  const hits = log.hits ?? 0;
                                  const totalAttempts = log.totalAttempts ?? 0;
                                  const allMissed = totalAttempts > 0 && hits === 0;
                                  const hitDisplay = totalAttempts > 0 ? `(${hits}/${totalAttempts}回)` : '';

                                  let actionText: string;
                                  if (isEnemy) {
                                    if (allMissed) {
                                      actionText = `敵が${log.action.replace('！', 'したが外れた！')}`;
                                    } else {
                                      actionText = `敵が${log.action}`;
                                    }
                                  } else {
                                    if (allMissed) {
                                      const charName = log.action.split(' の')[0];
                                      actionText = `${charName} の攻撃は外れた！`;
                                    } else {
                                      actionText = log.action;
                                    }
                                  }

                                  return (
                                    <div key={j} className="flex justify-between text-gray-600">
                                      <span>
                                        <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                        {actionText}
                                        {hitDisplay && <span className="text-gray-400">{hitDisplay}</span>}
                                      </span>
                                      {log.damage !== undefined && log.damage > 0 && (
                                        <span className={isEnemy ? 'text-accent' : 'text-sub'}>
                                          ({emoji} {log.damage})
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
            const { item, count, isNew } = variant;
            const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
            const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
            const baseMult = item.baseMultiplier ?? 1;
            const sellPrice = Math.floor(10 * enhMult * srMult * baseMult) * count;

            return (
              <div
                key={key}
                className={`px-2 py-1.5 rounded bg-pane ${isNew ? 'border-2 border-accent' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${isNew ? 'font-bold' : 'font-medium'}`}>
                      {getItemDisplayName(item)}
                    </span>
                    <span className="text-xs text-gray-500">x{count}</span>
                    {isNew && <span className="text-xs text-accent font-bold">NEW</span>}
                  </div>
                  <button
                    onClick={() => onSellStack(key)}
                    className="text-xs text-accent px-2 py-1 border border-accent rounded flex-shrink-0"
                  >
                    全売却 {sellPrice}G
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

function ShopTab({
  gold,
}: {
  gold: number;
}) {
  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">所持金: {gold}G</div>

      <div className="bg-pane rounded-lg p-4">
        <div className="text-sm text-gray-500 text-center py-8">
          現在販売しているアイテムはありません
        </div>
      </div>
    </div>
  );
}

function SettingTab({
  bags,
  onResetGame,
  onResetCommonBags,
  onResetUniqueBags,
  onResetSuperRareBag,
}: {
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

  const superRareTotal = SUPER_RARE_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const superRareRemaining = bags.superRareBag.tickets.length;
  const superRareInitial = SUPER_RARE_TITLES.filter(t => t.value > 0).reduce((sum, t) => sum + t.tickets, 0);
  const superRareHits = bags.superRareBag.tickets.filter(t => t > 0).length;

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
    `${label}: ${attack} x ${noA}回(x${amplifier.toFixed(2)})`;

  const formatEnemyDefenseLine = (label: string, defense: number, percent: number) =>
    `${label}: ${defense} (${percent.toFixed(0)}%)`;

  const ENEMY_ELEMENT_LABELS: Record<string, string> = {
    none: '無',
    fire: '炎',
    thunder: '雷',
    ice: '氷',
  };

  const ENEMY_ABILITY_LABELS: Record<string, string> = {
    counter: 'カウンター:CLOSEフェーズで反撃',
    re_attack: '連撃:攻撃時に1回追加攻撃',
    null_counter: '無効化:カウンター攻撃を無効化',
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
      <div className="text-lg font-bold mb-3">神の執務室</div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm font-medium mb-3">1. 未来視</div>

        <div className="mb-4 border-b border-gray-200 pb-4">
          <div className="text-xs text-gray-600 font-medium mb-2">通常報酬 (Normal reward)</div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">common_reward_bag (通常報酬 抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{commonRewardRemaining} / {commonRewardTotal}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{commonRewardWins}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">common_enhancement_bag (称号付与 抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>通常称号抽選</span><span>{commonEnhancementRemaining} / {commonEnhancementTotal}</span></div>
              <div className="flex justify-between text-sub"><span>名工の残り</span><span>{commonCraftsmanRemaining} / {craftsmanInitial}</span></div>
              <div className="flex justify-between text-sub"><span>魔性の残り</span><span>{commonDemonicRemaining} / {demonicInitial}</span></div>
              <div className="flex justify-between text-sub"><span>宿った残り</span><span>{commonDwellingRemaining} / {dwellingInitial}</span></div>
              <div className="flex justify-between text-sub"><span>伝説の残り</span><span>{commonLegendaryRemaining} / {legendaryInitial}</span></div>
              <div className="flex justify-between text-sub"><span>恐ろしい残り</span><span>{commonTerribleRemaining} / {terribleInitial}</span></div>
              <div className="flex justify-between text-sub"><span>究極の残り</span><span>{commonUltimateRemaining} / {ultimateInitial}</span></div>
            </div>
          </div>

          <button onClick={onResetCommonBags} className="w-full py-2 bg-sub text-white rounded text-sm font-medium">通常報酬初期化</button>
        </div>

        <div className="mb-4 border-b border-gray-200 pb-4">
          <div className="text-xs text-gray-600 font-medium mb-2">固有報酬 (Unique reward)</div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">uncommon_reward_bag (アンコモン抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{uncommonRewardRemaining} / {uniqueRewardTotal}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{uncommonRewardWins}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">rare_reward_bag (レア抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{rareRewardRemaining} / {uniqueRewardTotal}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{rareRewardWins}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">mythic_reward_bag (神魔レア抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>報酬抽選</span><span>{mythicRewardRemaining} / {uniqueRewardTotal}</span></div>
              <div className="flex justify-between text-sub"><span>当たり残り</span><span>{mythicRewardWins}</span></div>
            </div>
          </div>

          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">enhancement_bag (称号付与 抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>通常称号抽選</span><span>{enhancementRemaining} / {enhancementTotal}</span></div>
              <div className="flex justify-between text-sub"><span>名工の残り</span><span>{craftsmanRemaining} / {craftsmanInitial}</span></div>
              <div className="flex justify-between text-sub"><span>魔性の残り</span><span>{demonicRemaining} / {demonicInitial}</span></div>
              <div className="flex justify-between text-sub"><span>宿った残り</span><span>{dwellingRemaining} / {dwellingInitial}</span></div>
              <div className="flex justify-between text-sub"><span>伝説の残り</span><span>{legendaryRemaining} / {legendaryInitial}</span></div>
              <div className="flex justify-between text-sub"><span>恐ろしい残り</span><span>{terribleRemaining} / {terribleInitial}</span></div>
              <div className="flex justify-between text-sub"><span>究極の残り</span><span>{ultimateRemaining} / {ultimateInitial}</span></div>
            </div>
          </div>

          <button onClick={onResetUniqueBags} className="w-full py-2 bg-sub text-white rounded text-sm font-medium">固有報酬初期化</button>
        </div>

        <div className="mb-2">
          <div className="text-xs text-gray-600 font-medium mb-2">超レア報酬 (Super rare reward)</div>
          <div className="mb-2">
            <div className="text-xs text-gray-500 mb-1">superRare_bag (称号超レア称号付与 抽選確率)</div>
            <div className="bg-white rounded p-2 text-sm space-y-1">
              <div className="flex justify-between"><span>超レア称号抽選</span><span>{superRareRemaining} / {superRareTotal}</span></div>
              <div className="flex justify-between text-accent"><span>超レア残り</span><span>{superRareHits} / {superRareInitial}</span></div>
            </div>
          </div>
          <button onClick={onResetSuperRareBag} className="w-full py-2 bg-accent text-white rounded text-sm font-medium">超レア報酬初期化</button>
        </div>
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm font-medium mb-3">2. アイテム図鑑</div>
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
        <div className="text-sm font-medium mb-3">3. 敵キャラクター図鑑</div>
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
                const physicalDefensePercent = 100;
                const magicalDefensePercent = displayEnemy.physicalDefense > 0
                  ? (displayEnemy.magicalDefense / displayEnemy.physicalDefense) * 100
                  : 100;
                return (
                  <div key={displayEnemy.id} className="mt-2 border border-gray-100 rounded">
                    <button
                      onClick={() => setExpandedEnemies(prev => ({ ...prev, [displayEnemy.id]: !enemyExpanded }))}
                      className="w-full text-left px-2 py-1 text-sm flex justify-between items-center"
                    >
                      <span>{displayEnemy.name}</span>
                      <span className="text-xs text-gray-500">{enemyExpanded ? '▲' : '▼'}</span>
                    </button>
                    {enemyExpanded && (
                      <div className="px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>ID: {displayEnemy.id}</div>
                          <div>クラス: {enemyClass}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>HP: {displayEnemy.hp}</div>
                          <div>経験値: {displayEnemy.experience}</div>
                          <div>{formatEnemyAttackLine('遠攻', displayEnemy.rangedAttack, displayEnemy.rangedNoA, displayEnemy.rangedAttackAmplifier)}</div>
                          <div>
                            属性: {ENEMY_ELEMENT_LABELS[displayEnemy.elementalOffense] ?? '無'}
                            ({displayEnemy.elementalOffense === 'none' ? 'x1.0' : 'x1.2'})
                          </div>
                          <div>{formatEnemyAttackLine('魔攻', displayEnemy.magicalAttack, displayEnemy.magicalNoA, displayEnemy.magicalAttackAmplifier)}</div>
                          <div>{formatEnemyDefenseLine('魔防', displayEnemy.magicalDefense, magicalDefensePercent)}</div>
                          <div>{formatEnemyAttackLine('近攻', displayEnemy.meleeAttack, displayEnemy.meleeNoA, displayEnemy.meleeAttackAmplifier)}</div>
                          <div>{formatEnemyDefenseLine('物防', displayEnemy.physicalDefense, physicalDefensePercent)}</div>
                          <div>
                            命中率: 100% (減衰: x{(0.90 + displayEnemy.accuracyBonus).toFixed(2)})
                          </div>
                          <div>回避: {Math.round(displayEnemy.evasionBonus * 1000)}</div>
                        </div>
                        <div>スキル: {displayEnemy.abilities.length > 0 ? displayEnemy.abilities.map(a => ENEMY_ABILITY_LABELS[a] ?? a).join('、 ') : 'なし'}</div>
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
          <button onClick={() => setShowResetConfirm(true)} className="w-full py-2 bg-red-600 text-white rounded font-medium">ゲームをリセット</button>
        ) : (
          <div>
            <div className="text-sm text-accent mb-2 p-2 bg-orange-50 rounded border border-orange-200">本当にリセットしますか？全てのデータが失われます。この操作は取り消せません。</div>
            <div className="flex gap-2">
              <button onClick={() => { onResetGame(); setShowResetConfirm(false); }} className="flex-1 py-2 bg-red-600 text-white rounded font-medium">リセット実行</button>
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 bg-gray-300 rounded font-medium">キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
