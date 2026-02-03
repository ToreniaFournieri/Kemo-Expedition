import { useState } from 'react';
import { GameState, Item, Character } from '../types';
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
  actions: {
    startExpedition: (dungeonId: number) => void;
    equipItem: (characterId: number, slotIndex: number, item: Item | null) => void;
    updateCharacter: (characterId: number, updates: Partial<Character>) => void;
    sellItem: (item: Item) => void;
    buyArrows: (arrowId: number, quantity: number) => void;
  };
}

type Tab = 'party' | 'inventory' | 'shop' | 'expedition';

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

export function HomeScreen({ state, actions }: HomeScreenProps) {
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
    { id: 'inventory', label: '所持品' },
    { id: 'shop', label: '店' },
    { id: 'expedition', label: '探検' },
  ];

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-center">KEMO EXPEDITION</h1>
        <div className="mt-2 flex justify-between text-sm">
          <span>守護神: {state.party.deityName}</span>
          <span>Gold: {state.party.gold}</span>
        </div>
        <div className="mt-1 flex justify-between text-sm">
          <span>Lv.{state.party.level}</span>
          <span>EXP: {state.party.experience} / {nextLevelExp}</span>
        </div>
        <div className="mt-1 text-sm">
          HP: {partyStats.hp} | 物防: {partyStats.physicalDefense} | 魔防: {partyStats.magicalDefense}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'text-accent border-b-2 border-accent'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
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
        />
      )}

      {activeTab === 'expedition' && (
        <ExpeditionTab
          partyStats={partyStats}
          onStartExpedition={actions.startExpedition}
        />
      )}
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
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {party.characters.map((c, i) => {
          const r = RACES.find(r => r.id === c.raceId)!;
          const cs = characterStats[i];
          return (
            <button
              key={c.id}
              onClick={() => { setSelectedCharacter(i); setSelectingSlot(null); }}
              className={`flex-shrink-0 p-2 rounded-lg border ${
                i === selectedCharacter ? 'border-accent bg-blue-50' : 'border-gray-200'
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
      <div className="border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <input
            type="text"
            value={char.name}
            onChange={(e) => onUpdateCharacter(char.id, { name: e.target.value })}
            className="text-lg font-bold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-accent focus:outline-none"
          />
          <button
            onClick={() => setEditingCharacter(editingCharacter === selectedCharacter ? null : selectedCharacter)}
            className="text-sm text-accent"
          >
            {editingCharacter === selectedCharacter ? '完了' : '編集'}
          </button>
        </div>

        {editingCharacter === selectedCharacter ? (
          <div className="space-y-2 text-sm">
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
              <div className="bg-gray-100 rounded p-1 text-center">体{stats.baseStats.vitality}</div>
              <div className="bg-gray-100 rounded p-1 text-center">力{stats.baseStats.strength}</div>
              <div className="bg-gray-100 rounded p-1 text-center">知{stats.baseStats.intelligence}</div>
              <div className="bg-gray-100 rounded p-1 text-center">精{stats.baseStats.mind}</div>
            </div>
            <div className="border-t mt-2 pt-2 space-y-1">
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
              <div className="border-t mt-2 pt-2">
                <div className="text-gray-500 text-xs">特殊能力:</div>
                {stats.abilities.map(a => (
                  <div key={a.id} className="text-xs text-accent">{a.name}: {a.description}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Equipment section */}
      <div className="border border-gray-200 rounded-lg p-4">
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
                className={`w-full p-2 text-left border rounded text-sm ${
                  selectingSlot === i ? 'border-accent bg-blue-50' : 'border-gray-200'
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
        <div className="mt-4 border border-accent rounded-lg p-4 bg-blue-50">
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

function InventoryTab({
  inventory,
  onSellItem,
}: {
  inventory: Item[];
  onSellItem: (item: Item) => void;
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
              className="p-2 border border-gray-100 rounded"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-medium">{getItemDisplayName(item)}</span>
                    <span className="text-xs text-gray-400">[{CATEGORY_NAMES[item.category]}]</span>
                  </div>
                  <div className="text-xs text-gray-500">{getItemStats(item)}</div>
                </div>
                <button
                  onClick={() => onSellItem(item)}
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
}: {
  gold: number;
  quiverSlots: GameState['party']['quiverSlots'];
  onBuyArrows: (arrowId: number, quantity: number) => void;
}) {
  const arrows = ITEMS.filter(i => i.category === 'arrow');

  return (
    <div>
      <div className="text-sm text-gray-500 mb-4">所持金: {gold}G</div>

      <div className="mb-4">
        <div className="text-sm font-medium mb-2">矢筒</div>
        <div className="space-y-2">
          {quiverSlots.map((slot, i) => (
            <div key={i} className="p-2 border border-gray-200 rounded">
              {slot ? (
                <div>
                  <span className="text-sm font-medium">{slot.item.name}</span>
                  <span className="text-sm text-gray-500"> : {slot.quantity}本</span>
                  <div className="text-xs text-gray-400">{getItemStats(slot.item)}</div>
                </div>
              ) : (
                <span className="text-sm text-gray-400">空きスロット</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">矢を購入 (1本 = 2G)</div>
        <div className="space-y-2">
          {arrows.map(arrow => (
            <div key={arrow.id} className="p-2 border border-gray-100 rounded">
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
                    className="text-xs text-accent px-2 py-1 border border-accent rounded disabled:opacity-50"
                  >
                    10本
                  </button>
                  <button
                    onClick={() => onBuyArrows(arrow.id, 50)}
                    disabled={gold < 100}
                    className="text-xs text-accent px-2 py-1 border border-accent rounded disabled:opacity-50"
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

function ExpeditionTab({
  partyStats,
  onStartExpedition,
}: {
  partyStats: ReturnType<typeof computePartyStats>['partyStats'];
  onStartExpedition: (dungeonId: number) => void;
}) {
  return (
    <div>
      <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
        <div className="font-medium mb-1">パーティステータス</div>
        <div className="grid grid-cols-3 gap-2 text-center">
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

      <div className="text-sm font-medium mb-2">ダンジョン選択</div>
      <div className="space-y-2">
        {DUNGEONS.map(dungeon => (
          <button
            key={dungeon.id}
            onClick={() => onStartExpedition(dungeon.id)}
            className="w-full p-3 text-left border border-gray-200 rounded-lg hover:border-accent"
          >
            <div className="font-medium">{dungeon.name}</div>
            <div className="text-xs text-gray-500">部屋数: {dungeon.numberOfRooms} + ボス</div>
          </button>
        ))}
      </div>
    </div>
  );
}
