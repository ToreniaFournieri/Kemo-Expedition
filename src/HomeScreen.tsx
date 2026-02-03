import React, { useState, useEffect } from 'react';
import { useGame } from './GameContext';
import { DUNGEONS, RACES } from './gameData';
import BattleLog from './components/BattleLog';
import InventoryPane from './components/InventoryPane';
import ShopPane from './components/ShopPane';

type PaneType = 'inventory' | 'shop' | null;

export function HomeScreen() {
  const { state, startExpedition, battleNext, retreat, restoreHp } = useGame();
  const [activePane, setActivePane] = useState<PaneType>(null);
  const [nextBattleCountdown, setNextBattleCountdown] = useState(5);

  // Auto-progress battles every 5 seconds
  useEffect(() => {
    if (!state.dungeon?.isActive) return;

    const timer = setTimeout(() => {
      battleNext();
      setNextBattleCountdown(5);
    }, 5000);

    const countdownTimer = setInterval(() => {
      setNextBattleCountdown(prev => prev > 0 ? prev - 1 : 5);
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownTimer);
    };
  }, [state.dungeon?.isActive, battleNext]);

  const hpPercent = (state.party.hp / state.party.maxHp) * 100;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <h1 className="text-2xl font-bold">KEMO EXPEDITION</h1>
        <p className="text-sm text-gray-600">{state.party.deityName}</p>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Party Status Card */}
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <h2 className="font-semibold">Level {state.party.level}</h2>
              <span className="text-sm text-gray-600">Exp: {state.party.experience}%</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span>HP</span>
              <span>{state.party.hp} / {state.party.maxHp}</span>
            </div>
            <div className="w-full bg-gray-300 rounded-full h-6 overflow-hidden">
              <div
                className="bg-blue-500 h-full transition-all duration-300"
                style={{ width: `${hpPercent}%` }}
              />
            </div>
          </div>

          {/* Party Members Grid */}
          <div className="grid grid-cols-2 gap-2">
            {state.party.characters.map(char => {
              const race = RACES[char.race];
              return (
                <div key={char.id} className="bg-white rounded p-3 text-center border border-gray-200">
                  <div className="text-3xl">{race.emoji}</div>
                  <div className="text-xs font-semibold mt-1">{char.mainClass}</div>
                  <div className="text-xs text-gray-600">{char.name}</div>
                </div>
              );
            })}
            {[...Array(6 - state.party.characters.length)].map((_, i) => (
              <div key={`empty-${i}`} className="bg-white rounded p-3 text-center border-2 border-dashed border-gray-300">
                <div className="text-3xl opacity-30">?</div>
                <div className="text-xs text-gray-400 mt-1">Empty</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Action Buttons */}
        {!state.dungeon?.isActive && (
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => setActivePane('inventory')} className="bg-white border-2 border-gray-300 rounded-lg p-3 font-semibold text-sm hover:bg-gray-50">
              INVENTORY
            </button>
            <button onClick={() => setActivePane('shop')} className="bg-white border-2 border-gray-300 rounded-lg p-3 font-semibold text-sm hover:bg-gray-50">
              SHOP
            </button>
            <button onClick={restoreHp} className="bg-white border-2 border-gray-300 rounded-lg p-3 font-semibold text-sm hover:bg-gray-50">
              REST
            </button>
          </div>
        )}

        {/* Expedition Section */}
        {!state.dungeon?.isActive ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-600">START EXPEDITION</h3>
            {DUNGEONS.map(dungeon => (
              <button
                key={dungeon.id}
                onClick={() => startExpedition(dungeon.id)}
                className="w-full bg-blue-500 text-white rounded-lg p-4 font-semibold hover:bg-blue-600 transition text-left"
              >
                <div className="font-bold">{dungeon.name}</div>
                <div className="text-sm opacity-90">{dungeon.rooms} rooms</div>
              </button>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-lg">{state.dungeon.name}</h3>
                <p className="text-sm text-gray-600">Room {state.dungeon.currentRoom + 1} / {state.dungeon.rooms}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-blue-600">Next battle in:</p>
                <p className="text-2xl font-bold">{nextBattleCountdown}s</p>
              </div>
            </div>

            <div className="border-t border-b py-4 my-4">
              <h4 className="text-sm font-semibold mb-3">BATTLE LOG</h4>
              <BattleLog battles={state.battleLog} />
            </div>

            <button
              onClick={retreat}
              className="w-full bg-gray-300 text-black rounded-lg p-3 font-semibold hover:bg-gray-400 transition"
            >
              RETREAT
            </button>
          </div>
        )}

        {/* Detail Panes */}
        {activePane === 'inventory' && <InventoryPane onClose={() => setActivePane(null)} />}
        {activePane === 'shop' && <ShopPane onClose={() => setActivePane(null)} />}
      </div>
    </div>
  );
}
