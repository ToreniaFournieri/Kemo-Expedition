import { GameState } from '../types';
import { getDungeonById } from '../data/dungeons';
import { computePartyStats } from '../game/partyComputation';

interface ExpeditionScreenProps {
  state: GameState;
  actions: {
    enterRoom: () => void;
    retreat: () => void;
  };
}

export function ExpeditionScreen({ state, actions }: ExpeditionScreenProps) {
  if (!state.expedition) return null;

  const dungeon = getDungeonById(state.expedition.dungeonId);
  if (!dungeon) return null;

  const { partyStats } = computePartyStats(state.party);
  const currentRoom = state.expedition.currentRoom;
  const totalRooms = dungeon.numberOfRooms + 1; // Including boss
  const isBossRoom = currentRoom > dungeon.numberOfRooms;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-center">{dungeon.name}</h1>
        <div className="text-center text-sm text-gray-500 mt-1">
          {isBossRoom ? 'ボス戦' : `部屋 ${currentRoom} / ${dungeon.numberOfRooms}`}
        </div>
      </div>

      {/* Status */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <div className="text-sm">
          <div className="flex justify-between">
            <span>HP:</span>
            <span>{state.expedition.partyHp} / {partyStats.hp}</span>
          </div>
          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500"
              style={{ width: `${(state.expedition.partyHp / partyStats.hp) * 100}%` }}
            />
          </div>
        </div>

        <div className="mt-3 text-sm">
          <div className="flex justify-between">
            <span>矢筒:</span>
            <span>
              {state.expedition.quiverQuantities[0]}
              {state.expedition.quiverQuantities[1] > 0 && ` + ${state.expedition.quiverQuantities[1]}`}本
            </span>
          </div>
        </div>

        <div className="mt-3 text-sm">
          <div className="flex justify-between">
            <span>獲得経験値:</span>
            <span>{state.expedition.experienceGained}</span>
          </div>
        </div>

        {state.expedition.rewards.length > 0 && (
          <div className="mt-3 text-sm">
            <div>獲得アイテム: {state.expedition.rewards.length}個</div>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalRooms }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                i + 1 < currentRoom
                  ? 'bg-green-500 text-white'
                  : i + 1 === currentRoom
                  ? 'bg-accent text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i === totalRooms - 1 ? 'B' : i + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={actions.enterRoom}
          className="w-full py-3 bg-accent text-white font-medium rounded-lg"
        >
          {isBossRoom ? 'ボスに挑む' : '次の部屋へ'}
        </button>

        {currentRoom > 1 && (
          <button
            onClick={actions.retreat}
            className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg"
          >
            撤退する
          </button>
        )}
      </div>
    </div>
  );
}
