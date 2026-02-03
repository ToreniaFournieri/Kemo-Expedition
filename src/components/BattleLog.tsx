import React from 'react';
import { BattleResult } from '../types';

interface BattleLogProps {
  battles: BattleResult[];
}

export default function BattleLog({ battles }: BattleLogProps) {
  if (battles.length === 0) {
    return <p className="text-sm text-gray-500">No battles yet...</p>;
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {battles.map((battle, idx) => (
        <div key={idx} className="bg-white rounded p-3 text-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">
                {battle.victory ? '✓' : '✗'} Room {battle.room}
              </p>
              <p className="text-xs text-gray-600">{battle.enemy.name} Lv{battle.enemy.level}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
              battle.victory
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {battle.victory ? 'WIN' : 'LOSS'}
            </span>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <p>Exp: +{battle.expGained}</p>
            <p>HP: {battle.partyHpAfter} (was {battle.partyHpBefore})</p>
          </div>
        </div>
      ))}
    </div>
  );
}
