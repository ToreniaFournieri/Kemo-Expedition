import React, { useEffect, useState } from 'react';
import { ExpeditionState, BattleResult } from '../types';

interface ExpeditionProgressProps {
  expedition: ExpeditionState;
  battleQueue: BattleResult[];
}

const ExpeditionProgress: React.FC<ExpeditionProgressProps> = ({ expedition, battleQueue }) => {
  const [nextBattleCountdown, setNextBattleCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setNextBattleCountdown((prev) => (prev > 0 ? prev - 1 : 5));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-ios-gray rounded-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">EXPEDITION IN PROGRESS</h2>
        <div className="space-x-2">
          <button className="px-2 py-1 text-sm hover:opacity-70">⏸</button>
          <button className="px-2 py-1 text-sm hover:opacity-70">⏹</button>
        </div>
      </div>

      {/* Dungeon Info */}
      <div className="mb-4">
        <p className="font-semibold mb-1">{expedition.currentDungeon.name}</p>
        <p className="text-sm text-gray-600">
          Room: {expedition.currentRoom + 1} / {expedition.currentDungeon.numberOfRooms}
        </p>
        {expedition.isActive && (
          <p className="text-sm text-ios-blue mt-2">
            Next battle in: {nextBattleCountdown}s
          </p>
        )}
      </div>

      {/* Separator */}
      <div className="border-t border-b border-gray-300 py-4 my-4">
        <h3 className="text-sm font-semibold mb-3">Battle Log (auto-scrolling):</h3>

        {battleQueue.length === 0 ? (
          <p className="text-sm text-gray-500">No battles yet...</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {battleQueue.map((battle, index) => (
              <div key={index} className="bg-white rounded p-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">
                      {battle.victory ? '✓' : '✗'} Room {battle.roomNumber}
                    </p>
                    <p className="text-xs text-gray-600">
                      Enemy: {battle.enemyName} Lv{battle.enemyLevel}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${battle.victory ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {battle.victory ? 'VICTORY' : 'DEFEAT'}
                  </span>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p>Exp: +{battle.experienceGained}</p>
                  <p>Party HP: {battle.partyHpAfter} / (was {battle.partyHpBefore})</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpeditionProgress;
