import { useState } from 'react';
import { GameState, GameBags, Item, Character, InventoryRecord, InventoryVariant } from '../types';
import { computePartyStats } from '../game/partyComputation';
import { DUNGEONS } from '../data/dungeons';
import { RACES } from '../data/races';
import { CLASSES } from '../data/classes';
import { PREDISPOSITIONS } from '../data/predispositions';
import { LINEAGES } from '../data/lineages';
import { ITEMS, ENHANCEMENT_TITLES, SUPER_RARE_TITLES } from '../data/items';
import { getItemDisplayName } from '../game/gameState';

interface HomeScreenProps {
  state: GameState;
  bags: GameBags;
  actions: {
    selectDungeon: (dungeonId: number) => void;
    runExpedition: () => void;
    equipItem: (characterId: number, slotIndex: number, itemKey: string | null) => void;
    updateCharacter: (characterId: number, updates: Partial<Character>) => void;
    sellStack: (variantKey: string) => void;
    setVariantStatus: (variantKey: string, status: 'notown') => void;
    buyArrows: (arrowId: number, quantity: number) => void;
    removeQuiverSlot: (slotIndex: number) => void;
    assignArrowToQuiver: (variantKey: string, quantity: number) => void;
    markItemsSeen: () => void;
    resetGame: () => void;
  };
}

type Tab = 'party' | 'expedition' | 'inventory' | 'shop' | 'setting';

// Helper to format item stats
function getItemStats(item: Item): string {
  const multiplier = (ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1) *
    (SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1);

  const stats: string[] = [];
  if (item.meleeAttack) stats.push(`近攻+${Math.floor(item.meleeAttack * multiplier)}`);
  if (item.meleeNoA) stats.push(`近回数${item.meleeNoA > 0 ? '+' : ''}${item.meleeNoA}`);
  if (item.rangedAttack) stats.push(`遠攻+${Math.floor(item.rangedAttack * multiplier)}`);
  if (item.rangedNoA) stats.push(`遠回数+${item.rangedNoA}`);
  if (item.magicalAttack) stats.push(`魔攻+${Math.floor(item.magicalAttack * multiplier)}`);
  if (item.physicalDefense) stats.push(`物防+${Math.floor(item.physicalDefense * multiplier)}`);
  if (item.magicalDefense) stats.push(`魔防+${Math.floor(item.magicalDefense * multiplier)}`);
  if (item.partyHP) stats.push(`HP+${Math.floor(item.partyHP * multiplier)}`);
  if (item.elementalOffense && item.elementalOffense !== 'none') {
    const elem = { fire: '炎', ice: '氷', thunder: '雷' }[item.elementalOffense];
    stats.push(`${elem}属性`);
  }
  return stats.join(' ');
}

// Helper to format bonus descriptions
type Bonus = { type: string; value: number; abilityId?: string; abilityLevel?: number };

const MULTIPLIER_LABELS: Record<string, string> = {
  sword_multiplier: '剣',
  katana_multiplier: '刀',
  archery_multiplier: '弓',
  armor_multiplier: '鎧',
  gauntlet_multiplier: '籠手',
  wand_multiplier: '杖',
  robe_multiplier: '衣',
  amulet_multiplier: '護符',
};

const ABILITY_NAMES: Record<string, string> = {
  first_strike: '先手',
  hunter: '狩人',
  defender: '防御者',
  counter: 'カウンター',
  re_attack: '再攻撃',
  iaigiri: '居合斬り',
  leading: '統率',
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
    } else if (b.type === 'ability' && b.abilityId) {
      const name = ABILITY_NAMES[b.abilityId] || b.abilityId;
      parts.push(`${name}Lv${b.abilityLevel || 1}`);
    }
  }
  return parts.join(', ');
}

// Category name mapping
const CATEGORY_NAMES: Record<string, string> = {
  sword: '剣',
  katana: '刀',
  archery: '弓',
  armor: '鎧',
  gauntlet: '籠手',
  wand: 'ワンド',
  robe: '法衣',
  amulet: '護符',
  arrow: '矢',
};

// Category short names for tabs (spec: 剣,刀,弓,鎧,手,杖,衣,護,矢)
const CATEGORY_SHORT_NAMES: Record<string, string> = {
  sword: '剣',
  katana: '刀',
  archery: '弓',
  armor: '鎧',
  gauntlet: '手',
  wand: '杖',
  robe: '衣',
  amulet: '護',
  arrow: '矢',
};

const CATEGORY_ORDER = ['arrow', 'sword', 'katana', 'archery', 'armor', 'gauntlet', 'wand', 'robe', 'amulet'];
const EQUIP_CATEGORY_ORDER = ['sword', 'katana', 'archery', 'armor', 'gauntlet', 'wand', 'robe', 'amulet']; // Excluding arrow

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

  const { partyStats, characterStats } = computePartyStats(state.party);
  const LEVEL_EXP = [
    0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200,
    4000, 5000, 6200, 7600, 9200, 11000, 13000, 15500, 18500, 22000,
    26000, 30500, 35500, 41000, 47000, 53500, 60500, 68000, 76000
  ];
  const nextLevelExp = state.party.level < 29 ? LEVEL_EXP[state.party.level] : 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'party', label: 'パーティ' },
    { id: 'expedition', label: '探検' },
    { id: 'inventory', label: '所持品' },
    { id: 'shop', label: '店' },
    { id: 'setting', label: '設定' },
  ];

  // Check for new items
  const hasNewItems = Object.values(state.party.inventory).some(variant => variant.isNew);

  // Arrow count for header
  const totalArrows = (state.party.quiverSlots[0]?.quantity ?? 0) + (state.party.quiverSlots[1]?.quantity ?? 0);

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white border-b border-gray-300 p-3 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">ケモの冒険</h1>
            <div className="text-xs text-gray-500">v0.1.0 ({state.buildNumber})</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{state.party.deityName}</div>
            <div className="text-xs text-gray-500">Lv.{state.party.level} | {state.party.gold}G | 🏹{totalArrows}</div>
          </div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-600">
          <span>EXP: {state.party.experience} / {nextLevelExp}</span>
          <span>HP: {partyStats.hp}</span>
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
            party={state.party}
            characterStats={characterStats}
            selectedCharacter={selectedCharacter}
            setSelectedCharacter={setSelectedCharacter}
            editingCharacter={editingCharacter}
            setEditingCharacter={setEditingCharacter}
            onUpdateCharacter={actions.updateCharacter}
            onEquipItem={actions.equipItem}
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
            inventory={state.party.inventory}
            gold={state.party.gold}
            quiverSlots={state.party.quiverSlots}
            onSellStack={actions.sellStack}
            onSetVariantStatus={actions.setVariantStatus}
            onRemoveQuiverSlot={actions.removeQuiverSlot}
            onAssignArrowToQuiver={actions.assignArrowToQuiver}
          />
        )}

        {activeTab === 'shop' && (
          <ShopTab
            gold={state.party.gold}
            onBuyArrows={actions.buyArrows}
          />
        )}

        {activeTab === 'setting' && (
          <SettingTab
            bags={bags}
            onResetGame={actions.resetGame}
          />
        )}
      </div>
    </div>
  );
}

function PartyTab({
  party,
  characterStats,
  selectedCharacter,
  setSelectedCharacter,
  editingCharacter,
  setEditingCharacter,
  onUpdateCharacter,
  onEquipItem,
}: {
  party: GameState['party'];
  characterStats: ReturnType<typeof computePartyStats>['characterStats'];
  selectedCharacter: number;
  setSelectedCharacter: (i: number) => void;
  editingCharacter: number | null;
  setEditingCharacter: (i: number | null) => void;
  onUpdateCharacter: (id: number, updates: Partial<Character>) => void;
  onEquipItem: (characterId: number, slotIndex: number, itemKey: string | null) => void;
}) {
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);
  const [equipCategory, setEquipCategory] = useState('sword');
  const [pendingEdits, setPendingEdits] = useState<Partial<Character> | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
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
      {/* Character selector */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {party.characters.map((c, i) => {
          const r = RACES.find(r => r.id === c.raceId)!;
          const mc = CLASSES.find(cl => cl.id === c.mainClassId)!;
          const sc = CLASSES.find(cl => cl.id === c.subClassId)!;
          const isMaster = c.mainClassId === c.subClassId;
          return (
            <button
              key={c.id}
              onClick={() => { setSelectedCharacter(i); setSelectingSlot(null); }}
              className={`flex-shrink-0 p-2 rounded-lg border ${
                i === selectedCharacter ? 'border-sub bg-blue-50' : 'border-gray-200'
              }`}
            >
              <div className="text-2xl text-center">{r.emoji}</div>
              <div className="text-xs truncate w-14 text-center">{c.name}</div>
              <div className="text-xs text-gray-400 text-center">
                {mc.name}({isMaster ? '師範' : sc.name})
              </div>
            </button>
          );
        })}
      </div>

      {/* Character details */}
      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          {editingCharacter === selectedCharacter ? (
            <input
              type="text"
              value={pendingEdits?.name ?? char.name}
              onChange={(e) => setPendingEdits({ ...pendingEdits, name: e.target.value })}
              className="text-lg font-bold bg-transparent border-b border-sub focus:outline-none"
            />
          ) : (
            <span className="text-lg font-bold">{char.name}</span>
          )}
          {editingCharacter === selectedCharacter ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowEditConfirm(true)}
                className="text-sm text-white bg-sub px-3 py-1 rounded"
              >
                完了
              </button>
              <button
                onClick={() => {
                  setPendingEdits(null);
                  setEditingCharacter(null);
                }}
                className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded"
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
            <div className="border-t border-gray-200 mt-2 pt-2 space-y-1 text-sm">
              {(() => {
                // Calculate offense amplifiers per phase
                const iaigiri = stats.abilities.find(a => a.id === 'iaigiri');
                const iaigiriAmp = iaigiri ? (iaigiri.level === 2 ? 2.5 : 2.0) : 1.0;
                // LONG phase: attack potency only
                const longAmp = stats.attackPotency;
                // MID phase: always 1.0
                const midAmp = 1.0;
                // CLOSE phase: attack potency x iaigiri multiplier
                const closeAmp = stats.attackPotency * iaigiriAmp;
                const elementName = stats.elementalOffense === 'fire' ? '火' :
                  stats.elementalOffense === 'thunder' ? '雷' :
                  stats.elementalOffense === 'ice' ? '氷' : '無';

                const hasRanged = stats.rangedAttack > 0 || stats.rangedNoA > 0;
                const hasMagical = stats.magicalAttack > 0 || stats.magicalNoA > 0;
                const hasMelee = stats.meleeAttack > 0 || stats.meleeNoA > 0;

                return (
                  <>
                    {hasRanged && (
                      <div className="text-xs">
                        遠距離攻撃:{Math.floor(stats.rangedAttack)} x {stats.rangedNoA}回(x{longAmp.toFixed(2)})
                      </div>
                    )}
                    {hasMagical && (
                      <div className="text-xs">
                        魔法攻撃:{Math.floor(stats.magicalAttack)} x {stats.magicalNoA}回(x{midAmp.toFixed(2)})
                      </div>
                    )}
                    {hasMelee && (
                      <div className="text-xs">
                        近接攻撃:{Math.floor(stats.meleeAttack)} x {stats.meleeNoA}回(x{closeAmp.toFixed(2)})
                      </div>
                    )}
                    {/* Always show elemental offense and defenses */}
                    <div className="text-xs text-gray-500">
                      属性攻撃:{elementName}(x{stats.elementalOffenseValue.toFixed(1)}) | 物理防御:{stats.physicalDefense} | 魔法防御:{stats.magicalDefense}
                    </div>
                  </>
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
                } else if (['vitality', 'strength', 'intelligence', 'mind', 'equip_slot', 'grit', 'caster'].includes(b.type)) {
                  additive[b.type] = (additive[b.type] ?? 0) + b.value;
                } else if (b.type === 'penet') {
                  additive['penet'] = (additive['penet'] ?? 0) + b.value;
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
                gauntlet: '手', wand: '杖', robe: '衣', amulet: '護'
              };
              const addNames: Record<string, string> = {
                vitality: '体', strength: '力', intelligence: '知', mind: '精',
                equip_slot: '装備', grit: '根性', caster: '術者', penet: '貫通'
              };

              for (const [key, val] of Object.entries(multipliers)) {
                if (val !== 1) parts.push(`${mulNames[key] ?? key}x${val.toFixed(1)}`);
              }
              for (const [key, val] of Object.entries(additive)) {
                if (val !== 0) {
                  if (key === 'penet') {
                    parts.push(`${addNames[key]}+${Math.round(val * 100)}%`);
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
          {Array.from({ length: stats.maxEquipSlots }).map((_, i) => {
            const item = char.equipment[i];
            return (
              <button
                key={i}
                onClick={() => handleSlotTap(i)}
                className={`w-full p-2 text-left border rounded text-sm bg-white ${
                  selectingSlot === i ? 'border-sub' : 'border-gray-200'
                }`}
              >
                {item ? (
                  <div className="flex justify-between items-center">
                    <span>
                      <span className="font-medium">{getItemDisplayName(item)}</span>
                      <span className="text-xs text-gray-500"> | {getItemStats(item)}</span>
                    </span>
                    <span className="text-xs text-gray-400">[{CATEGORY_NAMES[item.category]}]</span>
                  </div>
                ) : (
                  <span className="text-gray-400">空きスロット {i + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Pane - Always visible */}
      {(() => {
        const filteredItems = sortInventoryItems(
          Object.entries(party.inventory)
            .filter(([, v]) => v.status === 'owned' && v.count > 0 && v.item.category === equipCategory)
        );
        const hasEmptySlot = Array.from({ length: stats.maxEquipSlots }).some((_, i) => !char.equipment[i]);
        return (
          <div className={`mt-4 border rounded-lg p-4 ${selectingSlot !== null ? 'border-sub bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">
                {selectingSlot !== null
                  ? `スロット ${selectingSlot + 1} に装備`
                  : hasEmptySlot
                    ? 'タップで自動装備'
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
            <div className="text-xs text-gray-500 mb-2">
              ヒント: スロットをダブルタップで装備を外す
            </div>
            {/* Category tabs */}
            <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
              {EQUIP_CATEGORY_ORDER.map(cat => (
                <button
                  key={cat}
                  onClick={() => setEquipCategory(cat)}
                  className={`px-2 py-1 text-xs rounded ${
                    equipCategory === cat
                      ? 'bg-sub text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {CATEGORY_SHORT_NAMES[cat]}
                </button>
              ))}
            </div>
            <div className="space-y-1 min-h-[320px] max-h-96 overflow-y-auto">
              {filteredItems.map(([key, variant]) => (
                <button
                  key={key}
                  onClick={() => handleInventoryItemTap(key)}
                  disabled={selectingSlot === null && !hasEmptySlot}
                  className={`w-full p-2 text-left text-sm border border-gray-200 rounded bg-white ${
                    selectingSlot !== null || hasEmptySlot ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getItemDisplayName(variant.item)}</span>
                    <span className="text-xs text-gray-500">x{variant.count}</span>
                    <span className="text-xs text-gray-400">| {getItemStats(variant.item)}</span>
                  </div>
                </button>
              ))}
              {filteredItems.length === 0 && (
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
  onSelectDungeon: (dungeonId: number) => void;
  onRunExpedition: () => void;
}) {
  const [showLog, setShowLog] = useState(false);
  const [expandedRoom, setExpandedRoom] = useState<number | null>(null);
  const selectedDungeon = DUNGEONS.find(d => d.id === state.selectedDungeonId);

  return (
    <div>
      {/* Selected Dungeon */}
      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm text-gray-500 mb-1">選択中のダンジョン</div>
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium">{selectedDungeon?.name}</div>
            <div className="text-xs text-gray-500">部屋数: {selectedDungeon?.numberOfRooms} + ボス</div>
          </div>
          <button
            onClick={onRunExpedition}
            className="px-4 py-2 bg-sub text-white rounded-lg font-medium hover:bg-blue-600"
          >
            出発
          </button>
        </div>
      </div>

      {/* Last Expedition Log */}
      {state.lastExpeditionLog && (
        <div className="bg-pane rounded-lg p-4 mb-4">
          <button
            onClick={() => setShowLog(!showLog)}
            className="w-full flex justify-between items-center text-sm"
          >
            <span>
              <span className="font-medium">前回の探検結果: {state.lastExpeditionLog.dungeonName}</span>
              <span className={`ml-2 font-medium ${
                state.lastExpeditionLog.finalOutcome === 'victory' ? 'text-sub' :
                state.lastExpeditionLog.finalOutcome === 'defeat' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {state.lastExpeditionLog.finalOutcome === 'victory' ? '勝利' :
                 state.lastExpeditionLog.finalOutcome === 'defeat' ? '敗北' : '撤退'}
              </span>
            </span>
            <span className={`transform transition-transform ${showLog ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showLog && (
            <div className="mt-3 space-y-2">
              <div className="text-sm text-gray-500">
                残HP: {state.lastExpeditionLog.remainingPartyHP}/{state.lastExpeditionLog.maxPartyHP}
                {' '}| {state.lastExpeditionLog.completedRooms}/{state.lastExpeditionLog.totalRooms}部屋
                {' '}| EXP: +{state.lastExpeditionLog.totalExperience}
                {state.lastExpeditionLog.autoSellProfit > 0 && (
                  <span> | 自動売却額: {state.lastExpeditionLog.autoSellProfit}G</span>
                )}
              </div>

              {state.lastExpeditionLog.rewards.length > 0 && (
                <div className="text-sm">
                  <span className="text-gray-500">獲得アイテム: </span>
                  {state.lastExpeditionLog.rewards.map((item, i) => (
                    <span key={i} className="text-accent font-medium">
                      {i > 0 && ', '}{getItemDisplayName(item)}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 space-y-2">
                {[...state.lastExpeditionLog.entries].reverse().map((entry, i, arr) => {
                  const originalIndex = arr.length - 1 - i;
                  const isBoss = entry.room === state.lastExpeditionLog!.totalRooms + 1;
                  const roomLabel = isBoss ? 'BOSS' : entry.room.toString();
                  const hpPercent = Math.round((entry.remainingPartyHP / entry.maxPartyHP) * 100);
                  return (
                    <div key={originalIndex} className="bg-white rounded overflow-hidden">
                      <button
                        onClick={() => setExpandedRoom(expandedRoom === originalIndex ? null : originalIndex)}
                        className="w-full text-left p-2 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span>
                            <span className="font-medium">{roomLabel}: {entry.enemyName}</span>
                            <span className="text-gray-500"> | 敵HP:{entry.enemyHP} | 残HP:{entry.remainingPartyHP}({hpPercent}%)</span>
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={
                              entry.outcome === 'victory' ? 'text-sub font-medium' :
                              entry.outcome === 'defeat' ? 'text-red-600 font-medium' : 'text-yellow-600 font-medium'
                            }>
                              {entry.outcome === 'victory' ? '勝利' :
                               entry.outcome === 'defeat' ? '敗北' : '引分'}
                            </span>
                            <span className={`transform transition-transform ${expandedRoom === originalIndex ? 'rotate-180' : ''}`}>▼</span>
                          </span>
                        </div>
                        <div className="text-gray-500 mt-1">
                          敵攻撃:{entry.enemyAttackValues} | 与ダメ:{entry.damageDealt} | 被ダメ:{entry.damageTaken}
                          {entry.reward && <span className="text-accent"> | 獲得:{entry.reward}</span>}
                        </div>
                      </button>
                      {expandedRoom === originalIndex && entry.details && (
                        <div className="border-t border-gray-100 p-2 bg-gray-50 text-xs space-y-1">
                          <div className="font-medium text-gray-600 mb-1">戦闘ログ:</div>
                          {entry.details.map((log, j) => {
                            const phaseLabel = log.phase === 'long' ? '遠' : log.phase === 'mid' ? '魔' : '近';
                            // Get emoji based on phase and elemental attribute
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
                            return (
                              <div key={j} className="text-gray-600">
                                <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                {isEnemy ? `敵が${log.action}` : log.action}
                                {log.damage !== undefined && (
                                  <span className={isEnemy ? 'text-accent' : 'text-sub'}>
                                    {' '}({emoji} {log.damage})
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

      {/* Dungeon Selection */}
      <div className="text-sm font-medium mb-2">ダンジョン選択</div>
      <div className="space-y-2">
        {DUNGEONS.map(dungeon => (
          <button
            key={dungeon.id}
            onClick={() => onSelectDungeon(dungeon.id)}
            className={`w-full p-3 text-left border rounded-lg ${
              dungeon.id === state.selectedDungeonId
                ? 'border-sub bg-blue-50'
                : 'border-gray-200 hover:border-sub'
            }`}
          >
            <div className="font-medium">{dungeon.name}</div>
            <div className="text-xs text-gray-500">部屋数: {dungeon.numberOfRooms} + ボス</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function InventoryTab({
  inventory,
  gold,
  quiverSlots,
  onSellStack,
  onSetVariantStatus,
  onRemoveQuiverSlot,
  onAssignArrowToQuiver,
}: {
  inventory: InventoryRecord;
  gold: number;
  quiverSlots: GameState['party']['quiverSlots'];
  onSellStack: (variantKey: string) => void;
  onSetVariantStatus: (variantKey: string, status: 'notown') => void;
  onRemoveQuiverSlot: (slotIndex: number) => void;
  onAssignArrowToQuiver: (variantKey: string, quantity: number) => void;
}) {
  const [showSold, setShowSold] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('arrow');

  // Separate owned and sold/notown items, filtered by category
  const allOwnedItems = Object.entries(inventory).filter(([, v]) => v.status === 'owned' && v.count > 0);
  const filteredOwnedItems = sortInventoryItems(
    allOwnedItems.filter(([, v]) => v.item.category === selectedCategory)
  );
  const allSoldItems = Object.entries(inventory).filter(([, v]) => v.status === 'sold');
  const filteredSoldItems = sortInventoryItems(
    allSoldItems.filter(([, v]) => v.item.category === selectedCategory)
  );
  const totalCount = allOwnedItems.reduce((sum, [, v]) => sum + v.count, 0);

  return (
    <div>
      <div className="text-sm text-gray-500 mb-2">
        所持品: {allOwnedItems.length}種類 ({totalCount}個) | {gold}G
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {CATEGORY_ORDER.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-1 text-sm rounded ${
              selectedCategory === cat
                ? 'bg-sub text-white'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {CATEGORY_SHORT_NAMES[cat]}
          </button>
        ))}
      </div>

      {/* Arrow category: Show quiver management and owned arrows */}
      {selectedCategory === 'arrow' && (
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">矢筒 (2スロット)</div>
          <div className="space-y-2 mb-4">
            {quiverSlots.map((slot, i) => (
              <div key={i} className="p-2 bg-pane rounded flex justify-between items-center">
                {slot ? (
                  <>
                    <div>
                      <span className="text-sm font-medium">{slot.item.name}</span>
                      <span className="text-sm text-gray-500"> : {slot.quantity}本</span>
                      <span className="text-xs text-gray-400 ml-2">| {getItemStats(slot.item)}</span>
                    </div>
                    <button
                      onClick={() => onRemoveQuiverSlot(i)}
                      className="text-xs text-red-500 px-2 py-1 border border-red-300 rounded"
                    >
                      破棄
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">空きスロット {i + 1}</span>
                )}
              </div>
            ))}
          </div>

          <div className="text-sm font-medium mb-2">所持している矢</div>
          <div className="text-xs text-gray-500 mb-2">矢は店で購入できます。</div>
          <div className="space-y-2 min-h-[150px] max-h-60 overflow-y-auto">
            {filteredOwnedItems.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-4">
                矢を所持していません
              </div>
            ) : (
              filteredOwnedItems.map(([key, variant]) => {
                const { item, count } = variant;
                const hasEmptySlot = quiverSlots.some(s => s === null);
                const maxAssign = Math.min(count, item.maxStack || 99);
                return (
                  <div key={key} className="p-2 bg-pane rounded">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{getItemDisplayName(item)}</span>
                        <span className="text-sm text-gray-500"> x{count}</span>
                        <span className="text-xs text-gray-400 ml-2">| {getItemStats(item)}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAssignArrowToQuiver(key, Math.min(10, maxAssign))}
                          disabled={!hasEmptySlot || count < 1}
                          className="text-xs text-sub px-2 py-1 border border-sub rounded disabled:opacity-50"
                        >
                          装備(10)
                        </button>
                        <button
                          onClick={() => onAssignArrowToQuiver(key, Math.min(50, maxAssign))}
                          disabled={!hasEmptySlot || count < 1}
                          className="text-xs text-sub px-2 py-1 border border-sub rounded disabled:opacity-50"
                        >
                          装備(50)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Regular item list (non-arrow categories) */}
      {selectedCategory !== 'arrow' && (
        <div className="space-y-1 min-h-[280px] max-h-80 overflow-y-auto mb-4">
          {filteredOwnedItems.map(([key, variant]) => {
            const { item, count, isNew } = variant;
            const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
            const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
            const sellPrice = Math.floor(10 * enhMult * srMult) * count;

            return (
              <div
                key={key}
                className={`p-2 rounded bg-pane flex justify-between items-center ${isNew ? 'border-2 border-accent' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${isNew ? 'font-bold' : 'font-medium'}`}>
                    {getItemDisplayName(item)}
                  </span>
                  <span className="text-xs text-gray-500">x{count}</span>
                  <span className="text-xs text-gray-400">| {getItemStats(item)}</span>
                  {isNew && <span className="text-xs text-accent font-bold">NEW</span>}
                </div>
                <button
                  onClick={() => onSellStack(key)}
                  className="text-xs text-accent px-2 py-1 border border-accent rounded flex-shrink-0"
                >
                  全売却 {sellPrice}G
                </button>
              </div>
            );
          })}
          {filteredOwnedItems.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-4">このカテゴリにアイテムがありません</div>
          )}
        </div>
      )}

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
                <div key={key} className="p-2 rounded bg-gray-100 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{getItemDisplayName(variant.item)}</span>
                    <span className="text-xs text-gray-400">| {getItemStats(variant.item)}</span>
                  </div>
                  <button
                    onClick={() => onSetVariantStatus(key, 'notown')}
                    className="text-xs text-sub px-2 py-1 border border-sub rounded"
                  >
                    解除
                  </button>
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
  onBuyArrows,
}: {
  gold: number;
  onBuyArrows: (arrowId: number, quantity: number) => void;
}) {
  const arrows = ITEMS.filter(i => i.category === 'arrow');

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">所持金: {gold}G</div>

      <div className="bg-pane rounded-lg p-4">
        <div className="text-sm font-medium mb-3">矢を購入 (1本 = 2G)</div>
        <div className="text-xs text-gray-500 mb-3">
          購入した矢は所持品に追加されます。所持品タブで矢筒に装備できます。
        </div>
        <div className="space-y-2">
          {arrows.map(arrow => (
            <div key={arrow.id} className="p-2 bg-white rounded">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">{arrow.name}</span>
                  <span className="text-xs text-gray-500 ml-2">
                    | 遠攻+{arrow.rangedAttack}
                    {arrow.elementalOffense && arrow.elementalOffense !== 'none' &&
                      ` ${({ fire: '炎', ice: '氷', thunder: '雷' })[arrow.elementalOffense]}属性`
                    }
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onBuyArrows(arrow.id, 10)}
                    disabled={gold < 20}
                    className="text-xs text-sub px-2 py-1 border border-sub rounded disabled:opacity-50"
                  >
                    10本 (20G)
                  </button>
                  <button
                    onClick={() => onBuyArrows(arrow.id, 50)}
                    disabled={gold < 100}
                    className="text-xs text-sub px-2 py-1 border border-sub rounded disabled:opacity-50"
                  >
                    50本 (100G)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingTab({
  bags,
  onResetGame,
}: {
  bags: GameBags;
  onResetGame: () => void;
}) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Reward bag stats
  const rewardTotal = 10;
  const rewardRemaining = bags.rewardBag.tickets.length;
  const rewardWins = bags.rewardBag.tickets.filter(t => t === 1).length;

  // Enhancement bag stats
  const enhancementTotal = ENHANCEMENT_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const enhancementRemaining = bags.enhancementBag.tickets.length;
  const dwellingRemaining = bags.enhancementBag.tickets.filter(t => t === 3).length;  // 宿った
  const legendaryRemaining = bags.enhancementBag.tickets.filter(t => t === 4).length; // 伝説の
  const terribleRemaining = bags.enhancementBag.tickets.filter(t => t === 5).length;  // 恐ろしい
  const ultimateRemaining = bags.enhancementBag.tickets.filter(t => t === 6).length;  // 究極の

  // Super rare bag stats
  const superRareTotal = SUPER_RARE_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const superRareRemaining = bags.superRareBag.tickets.length;
  const superRareHits = bags.superRareBag.tickets.filter(t => t > 0).length; // 超レア (value > 0)

  return (
    <div>
      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm font-medium mb-3">Debug: バッグ状態</div>

        {/* Reward Bag */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">報酬抽選 (reward_bag)</div>
          <div className="bg-white rounded p-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span>残り</span>
              <span>{rewardRemaining} / {rewardTotal}</span>
            </div>
            <div className="flex justify-between text-sub">
              <span>当たり残り</span>
              <span>{rewardWins}</span>
            </div>
          </div>
        </div>

        {/* Enhancement Bag */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">通常称号抽選 (enhancement_bag)</div>
          <div className="bg-white rounded p-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span>残り</span>
              <span>{enhancementRemaining} / {enhancementTotal}</span>
            </div>
            <div className="flex justify-between text-sub">
              <span>宿った残り</span>
              <span>{dwellingRemaining}</span>
            </div>
            <div className="flex justify-between text-sub">
              <span>伝説の残り</span>
              <span>{legendaryRemaining}</span>
            </div>
            <div className="flex justify-between text-sub">
              <span>恐ろしい残り</span>
              <span>{terribleRemaining}</span>
            </div>
            <div className="flex justify-between text-sub">
              <span>究極の残り</span>
              <span>{ultimateRemaining}</span>
            </div>
          </div>
        </div>

        {/* Super Rare Bag */}
        <div>
          <div className="text-xs text-gray-500 mb-1">超レア称号抽選 (superRare_bag)</div>
          <div className="bg-white rounded p-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span>残り</span>
              <span>{superRareRemaining} / {superRareTotal}</span>
            </div>
            <div className="flex justify-between text-accent">
              <span>超レア残り</span>
              <span>{superRareHits}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-pane rounded-lg p-4">
        <div className="text-sm font-medium mb-2">Reset</div>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2 bg-accent text-white rounded font-medium"
          >
            ゲームをリセット
          </button>
        ) : (
          <div>
            <div className="text-sm text-accent mb-2 p-2 bg-orange-50 rounded border border-orange-200">
              ⚠️ 本当にリセットしますか？全てのデータが失われます。この操作は取り消せません。
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onResetGame(); setShowResetConfirm(false); }}
                className="flex-1 py-2 bg-accent text-white rounded font-medium"
              >
                リセット実行
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 bg-gray-300 rounded font-medium"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
