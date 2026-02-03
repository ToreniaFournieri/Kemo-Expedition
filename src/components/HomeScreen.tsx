import { useState } from 'react';
import { GameState, GameBags, Item, Character } from '../types';
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
    equipItem: (characterId: number, slotIndex: number, item: Item | null) => void;
    updateCharacter: (characterId: number, updates: Partial<Character>) => void;
    sellItem: (itemIndex: number) => void;
    buyArrows: (arrowId: number, quantity: number) => void;
    removeQuiverSlot: (slotIndex: number) => void;
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
  const hasNewItems = state.party.inventory.some(item => item.isNew);

  return (
    <div className="flex flex-col h-screen">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white border-b border-gray-300 p-3 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">KEMO EXPEDITION</h1>
            <div className="text-xs text-gray-500">v1.0.0 / Build {state.buildNumber}</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{state.party.deityName}</div>
            <div className="text-xs text-gray-500">Lv.{state.party.level} | {state.party.gold}G</div>
          </div>
        </div>
        <div className="mt-2 flex justify-between text-xs text-gray-600">
          <span>EXP: {state.party.experience} / {nextLevelExp}</span>
          <span>HP: {partyStats.hp} | 物防: {partyStats.physicalDefense} | 魔防: {partyStats.magicalDefense}</span>
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
            partyStats={partyStats}
            onSelectDungeon={actions.selectDungeon}
            onRunExpedition={actions.runExpedition}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            inventory={state.party.inventory}
            onSellItem={actions.sellItem}
          />
        )}

        {activeTab === 'shop' && (
          <ShopTab
            gold={state.party.gold}
            quiverSlots={state.party.quiverSlots}
            onBuyArrows={actions.buyArrows}
            onRemoveQuiverSlot={actions.removeQuiverSlot}
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
  onEquipItem: (characterId: number, slotIndex: number, item: Item | null) => void;
}) {
  const [selectingSlot, setSelectingSlot] = useState<number | null>(null);

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
          const cs = characterStats[i];
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
                {Math.floor(cs.meleeAttack)}|{Math.floor(cs.magicalAttack)}|{Math.floor(cs.rangedAttack)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Character details */}
      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <input
            type="text"
            value={char.name}
            onChange={(e) => onUpdateCharacter(char.id, { name: e.target.value })}
            className="text-lg font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-sub focus:outline-none"
          />
          <button
            onClick={() => setEditingCharacter(editingCharacter === selectedCharacter ? null : selectedCharacter)}
            className="text-sm text-sub"
          >
            {editingCharacter === selectedCharacter ? '完了' : '編集'}
          </button>
        </div>

        {editingCharacter === selectedCharacter ? (
          <div className="space-y-2 text-sm">
            <div className="text-xs text-accent mb-2">※編集すると装備が外れます</div>
            <div>
              <label className="block text-gray-500">種族</label>
              <select
                value={char.raceId}
                onChange={(e) => onUpdateCharacter(char.id, { raceId: e.target.value as Character['raceId'] })}
                className="w-full p-1 border rounded"
              >
                {RACES.map(r => (
                  <option key={r.id} value={r.id}>{r.emoji} {r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-500">メインクラス</label>
              <select
                value={char.mainClassId}
                onChange={(e) => onUpdateCharacter(char.id, { mainClassId: e.target.value as Character['mainClassId'] })}
                className="w-full p-1 border rounded"
              >
                {CLASSES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-500">サブクラス</label>
              <select
                value={char.subClassId}
                onChange={(e) => onUpdateCharacter(char.id, { subClassId: e.target.value as Character['subClassId'] })}
                className="w-full p-1 border rounded"
              >
                {CLASSES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-500">性格</label>
              <select
                value={char.predispositionId}
                onChange={(e) => onUpdateCharacter(char.id, { predispositionId: e.target.value as Character['predispositionId'] })}
                className="w-full p-1 border rounded"
              >
                {PREDISPOSITIONS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-500">家系</label>
              <select
                value={char.lineageId}
                onChange={(e) => onUpdateCharacter(char.id, { lineageId: e.target.value as Character['lineageId'] })}
                className="w-full p-1 border rounded"
              >
                {LINEAGES.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-sm">
            <div className="text-gray-500">
              {race.emoji} {race.name} / {mainClass.name}
              {char.mainClassId === char.subClassId ? '(師範)' : ` + ${subClass.name}`}
            </div>
            <div className="text-gray-500">
              {predisposition.name} / {lineage.name}
            </div>
            <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
              <div className="bg-white rounded p-1 text-center">体{stats.baseStats.vitality}</div>
              <div className="bg-white rounded p-1 text-center">力{stats.baseStats.strength}</div>
              <div className="bg-white rounded p-1 text-center">知{stats.baseStats.intelligence}</div>
              <div className="bg-white rounded p-1 text-center">精{stats.baseStats.mind}</div>
            </div>
            <div className="border-t border-gray-200 mt-2 pt-2 space-y-1">
              <div className="flex justify-between">
                <span>遠距離攻撃:</span>
                <span className="font-medium">{Math.floor(stats.rangedAttack)} x {stats.rangedNoA}回</span>
              </div>
              <div className="flex justify-between">
                <span>魔法攻撃:</span>
                <span className="font-medium">{Math.floor(stats.magicalAttack)} x {stats.magicalNoA}回</span>
              </div>
              <div className="flex justify-between">
                <span>近接攻撃:</span>
                <span className="font-medium">{Math.floor(stats.meleeAttack)} x {stats.meleeNoA}回</span>
              </div>
            </div>
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
                onClick={() => setSelectingSlot(selectingSlot === i ? null : i)}
                className={`w-full p-2 text-left border rounded text-sm bg-white ${
                  selectingSlot === i ? 'border-sub' : 'border-gray-200'
                }`}
              >
                {item ? (
                  <div>
                    <div className="flex justify-between">
                      <span className="font-medium">{getItemDisplayName(item)}</span>
                      <span className="text-xs text-gray-400">[{CATEGORY_NAMES[item.category]}]</span>
                    </div>
                    <div className="text-xs text-gray-500">{getItemStats(item)}</div>
                  </div>
                ) : (
                  <span className="text-gray-400">空きスロット {i + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Item selection popup */}
      {selectingSlot !== null && (
        <div className="mt-4 border border-sub rounded-lg p-4 bg-blue-50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">スロット {selectingSlot + 1} に装備</span>
            <div className="flex gap-2">
              {char.equipment[selectingSlot] && (
                <button
                  onClick={() => { onEquipItem(char.id, selectingSlot, null); setSelectingSlot(null); }}
                  className="text-xs text-red-500 px-2 py-1 border border-red-300 rounded bg-white"
                >
                  外す
                </button>
              )}
              <button
                onClick={() => setSelectingSlot(null)}
                className="text-xs text-gray-500 px-2 py-1 border border-gray-300 rounded bg-white"
              >
                閉じる
              </button>
            </div>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {party.inventory
              .filter(item => item.category !== 'arrow')
              .map((item, i) => (
                <button
                  key={i}
                  onClick={() => { onEquipItem(char.id, selectingSlot, item); setSelectingSlot(null); }}
                  className="w-full p-2 text-left text-sm border border-gray-200 rounded bg-white hover:bg-gray-50"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{getItemDisplayName(item)}</span>
                    <span className="text-xs text-gray-400">[{CATEGORY_NAMES[item.category]}]</span>
                  </div>
                  <div className="text-xs text-gray-500">{getItemStats(item)}</div>
                </button>
              ))}
            {party.inventory.filter(item => item.category !== 'arrow').length === 0 && (
              <div className="text-gray-400 text-sm text-center py-2">装備可能なアイテムがありません</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExpeditionTab({
  state,
  partyStats,
  onSelectDungeon,
  onRunExpedition,
}: {
  state: GameState;
  partyStats: ReturnType<typeof computePartyStats>['partyStats'];
  onSelectDungeon: (dungeonId: number) => void;
  onRunExpedition: () => void;
}) {
  const [showLog, setShowLog] = useState(false);
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

      {/* Party Stats Summary */}
      <div className="bg-pane rounded-lg p-3 mb-4">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="text-xs text-gray-500">HP</div>
            <div className="font-medium">{partyStats.hp}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">物理防御</div>
            <div className="font-medium">{partyStats.physicalDefense}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">魔法防御</div>
            <div className="font-medium">{partyStats.magicalDefense}</div>
          </div>
        </div>
      </div>

      {/* Dungeon Selection */}
      <div className="text-sm font-medium mb-2">ダンジョン選択</div>
      <div className="space-y-2 mb-4">
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

      {/* Last Expedition Log */}
      {state.lastExpeditionLog && (
        <div className="mt-8 pt-4 border-t-2 border-gray-200">
          <div className="bg-pane rounded-lg p-4">
            <button
            onClick={() => setShowLog(!showLog)}
            className="w-full flex justify-between items-center text-sm font-medium"
          >
            <span>前回の探検結果: {state.lastExpeditionLog.dungeonName}</span>
            <span className={`transform transition-transform ${showLog ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {showLog && (
            <div className="mt-3 space-y-2">
              <div className="text-sm">
                <span className={`font-medium ${
                  state.lastExpeditionLog.finalOutcome === 'victory' ? 'text-green-600' :
                  state.lastExpeditionLog.finalOutcome === 'defeat' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {state.lastExpeditionLog.finalOutcome === 'victory' ? '勝利' :
                   state.lastExpeditionLog.finalOutcome === 'defeat' ? '敗北' : '撤退'}
                </span>
                <span className="text-gray-500">
                  {' '}| {state.lastExpeditionLog.completedRooms}/{state.lastExpeditionLog.totalRooms}部屋
                  {' '}| EXP: +{state.lastExpeditionLog.totalExperience}
                </span>
              </div>

              {state.lastExpeditionLog.rewards.length > 0 && (
                <div className="text-sm">
                  <div className="text-gray-500">獲得アイテム:</div>
                  {state.lastExpeditionLog.rewards.map((item, i) => (
                    <div key={i} className="text-accent font-medium">{getItemDisplayName(item)}</div>
                  ))}
                </div>
              )}

              <div className="border-t border-gray-200 pt-2 space-y-2">
                {state.lastExpeditionLog.entries.map((entry, i) => (
                  <div key={i} className="text-xs bg-white rounded p-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Room {entry.room}: {entry.enemyName}</span>
                      <span className={
                        entry.outcome === 'victory' ? 'text-green-600' :
                        entry.outcome === 'defeat' ? 'text-red-600' : 'text-yellow-600'
                      }>
                        {entry.outcome === 'victory' ? '勝利' :
                         entry.outcome === 'defeat' ? '敗北' : '引分'}
                      </span>
                    </div>
                    <div className="text-gray-500">
                      与ダメ: {entry.damageDealt} | 被ダメ: {entry.damageTaken}
                      {entry.reward && <span className="text-accent"> | 獲得: {entry.reward}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryTab({
  inventory,
  onSellItem,
}: {
  inventory: Item[];
  onSellItem: (itemIndex: number) => void;
}) {
  return (
    <div>
      <div className="text-sm text-gray-500 mb-2">所持品: {inventory.length}個</div>
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {inventory.map((item, i) => {
          const enhMult = ENHANCEMENT_TITLES.find(t => t.value === item.enhancement)?.multiplier ?? 1;
          const srMult = SUPER_RARE_TITLES.find(t => t.value === item.superRare)?.multiplier ?? 1;
          const sellPrice = Math.floor(10 * enhMult * srMult);

          return (
            <div
              key={i}
              className={`p-2 rounded bg-pane ${item.isNew ? 'border-2 border-accent' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className={`text-sm ${item.isNew ? 'font-bold' : 'font-medium'}`}>
                      {getItemDisplayName(item)}
                    </span>
                    <span className="text-xs text-gray-400">[{CATEGORY_NAMES[item.category]}]</span>
                    {item.isNew && <span className="text-xs text-accent font-bold">NEW</span>}
                  </div>
                  <div className="text-xs text-gray-500">{getItemStats(item)}</div>
                </div>
                <button
                  onClick={() => onSellItem(i)}
                  className="text-xs text-accent px-2 py-1 border border-accent rounded flex-shrink-0"
                >
                  売却 {sellPrice}G
                </button>
              </div>
            </div>
          );
        })}
        {inventory.length === 0 && (
          <div className="text-gray-400 text-sm text-center py-4">アイテムがありません</div>
        )}
      </div>
    </div>
  );
}

function ShopTab({
  gold,
  quiverSlots,
  onBuyArrows,
  onRemoveQuiverSlot,
}: {
  gold: number;
  quiverSlots: GameState['party']['quiverSlots'];
  onBuyArrows: (arrowId: number, quantity: number) => void;
  onRemoveQuiverSlot: (slotIndex: number) => void;
}) {
  const arrows = ITEMS.filter(i => i.category === 'arrow');

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">所持金: {gold}G</div>

      <div className="mb-4">
        <div className="text-sm font-medium mb-2">矢筒</div>
        <div className="space-y-2">
          {quiverSlots.map((slot, i) => (
            <div key={i} className="p-2 bg-pane rounded flex justify-between items-center">
              {slot ? (
                <>
                  <div>
                    <span className="text-sm font-medium">{slot.item.name}</span>
                    <span className="text-sm text-gray-500"> : {slot.quantity}本</span>
                    <div className="text-xs text-gray-400">{getItemStats(slot.item)}</div>
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
      </div>

      <div>
        <div className="text-sm font-medium mb-2">矢を購入 (1本 = 2G)</div>
        <div className="space-y-2">
          {arrows.map(arrow => (
            <div key={arrow.id} className="p-2 bg-pane rounded">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-sm font-medium">{arrow.name}</span>
                  <div className="text-xs text-gray-500">
                    遠攻+{arrow.rangedAttack}
                    {arrow.elementalOffense && arrow.elementalOffense !== 'none' &&
                      ` ${({ fire: '炎', ice: '氷', thunder: '雷' })[arrow.elementalOffense]}属性`
                    }
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onBuyArrows(arrow.id, 10)}
                    disabled={gold < 20}
                    className="text-xs text-sub px-2 py-1 border border-sub rounded disabled:opacity-50"
                  >
                    10本
                  </button>
                  <button
                    onClick={() => onBuyArrows(arrow.id, 50)}
                    disabled={gold < 100}
                    className="text-xs text-sub px-2 py-1 border border-sub rounded disabled:opacity-50"
                  >
                    50本
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

  const rewardTotal = 10;
  const rewardWins = bags.rewardBag.tickets.filter(t => t === 1).length;

  const enhancementTotal = ENHANCEMENT_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const enhancementRemaining = bags.enhancementBag.tickets.length;

  const superRareTotal = SUPER_RARE_TITLES.reduce((sum, t) => sum + t.tickets, 0);
  const superRareRemaining = bags.superRareBag.tickets.length;

  return (
    <div>
      <div className="bg-pane rounded-lg p-4 mb-4">
        <div className="text-sm font-medium mb-2">Debug: バッグ状態</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>報酬バッグ</span>
            <span>残り {bags.rewardBag.tickets.length}/{rewardTotal} (勝ち: {rewardWins})</span>
          </div>
          <div className="flex justify-between">
            <span>強化バッグ</span>
            <span>残り {enhancementRemaining}/{enhancementTotal}</span>
          </div>
          <div className="flex justify-between">
            <span>超レアバッグ</span>
            <span>残り {superRareRemaining}/{superRareTotal}</span>
          </div>
        </div>
      </div>

      <div className="bg-pane rounded-lg p-4">
        <div className="text-sm font-medium mb-2">データ管理</div>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2 bg-red-500 text-white rounded font-medium"
          >
            ゲームをリセット
          </button>
        ) : (
          <div>
            <div className="text-sm text-red-600 mb-2">
              本当にリセットしますか？全てのデータが失われます。
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { onResetGame(); setShowResetConfirm(false); }}
                className="flex-1 py-2 bg-red-500 text-white rounded font-medium"
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
