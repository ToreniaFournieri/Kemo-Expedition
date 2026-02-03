import React from 'react';
import { Party, Race } from '../types';

interface PartyStatusProps {
  party: Party;
  races: Record<Race, { emoji: string; baseStats: Record<string, number> }>;
}

const PartyStatus: React.FC<PartyStatusProps> = ({ party, races }) => {
  const hpPercentage = (party.hp / party.maxHp) * 100;

  return (
    <div className="bg-ios-gray rounded-lg p-6">
      <h2 className="text-lg font-bold mb-4">PARTY STATUS</h2>

      {/* HP Bar */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <span className="font-semibold">HP</span>
          <span className="text-sm">{party.hp} / {party.maxHp}</span>
        </div>
        <div className="hp-bar">
          <div
            className="hp-bar-fill"
            style={{ width: `${hpPercentage}%` }}
          />
        </div>
      </div>

      {/* Defensive Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-gray-600">Physical Defense</span>
          <p className="font-bold text-lg">{party.physicalDefense}</p>
        </div>
        <div>
          <span className="text-gray-600">Magical Defense</span>
          <p className="font-bold text-lg">{party.magicalDefense}</p>
        </div>
      </div>

      {/* Characters Grid */}
      <div className="border-t pt-4">
        <div className="grid grid-cols-3 gap-3">
          {party.characters.map((char) => {
            const race = char.race as Race;
            const raceData = races[race];
            return (
              <div
                key={char.id}
                className="bg-white rounded p-3 text-center border border-gray-200"
              >
                <div className="text-2xl mb-1">{raceData.emoji}</div>
                <div className="text-xs font-semibold truncate">{char.mainClass}</div>
                <div className="text-xs text-gray-600 truncate">{char.name}</div>
              </div>
            );
          })}
          {[...Array(6 - party.characters.length)].map((_, i) => (
            <div
              key={`empty-${i}`}
              className="bg-white rounded p-3 text-center border-2 border-dashed border-gray-300"
            >
              <div className="text-2xl mb-1">?</div>
              <div className="text-xs text-gray-400">Empty</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Buttons */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <button className="btn-secondary text-xs">EDIT</button>
        <button className="btn-secondary text-xs">EQUIP</button>
        <button className="btn-secondary text-xs">STATS</button>
      </div>
    </div>
  );
};

export default PartyStatus;
