import { GameState } from '../types';
import { getDungeonById } from '../data/dungeons';
import { getEnemiesByPool, getBossEnemy } from '../data/enemies';
import { computePartyStats } from '../game/partyComputation';

interface BattleScreenProps {
  state: GameState;
  actions: {
    proceedAfterBattle: () => void;
  };
}

export function BattleScreen({ state, actions }: BattleScreenProps) {
  if (!state.expedition || !state.battle) return null;

  const dungeon = getDungeonById(state.expedition.dungeonId);
  if (!dungeon) return null;

  const { partyStats } = computePartyStats(state.party);

  // Get the enemy for current room
  const currentRoom = state.expedition.currentRoom;
  const isBossRoom = currentRoom > dungeon.numberOfRooms;

  let enemy;
  if (isBossRoom) {
    enemy = getBossEnemy(dungeon.bossId);
  } else {
    // We need to get the same enemy that was selected during battle
    // For now, just show the first enemy from the pool as a placeholder
    const enemies = getEnemiesByPool(dungeon.enemyPoolIds[0]);
    enemy = enemies[0]; // This won't match exactly but is for display
  }

  const battle = state.battle;
  const phaseNames = {
    long: 'LONG（遠距離）',
    mid: 'MID（中距離）',
    close: 'CLOSE（近距離）',
  };

  const outcomeText = {
    victory: '勝利！',
    defeat: '敗北...',
    draw: '引き分け',
  };

  const outcomeColor = {
    victory: 'text-green-600',
    defeat: 'text-red-600',
    draw: 'text-yellow-600',
  };

  return (
    <div className="p-4">
      {/* Header */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-center">
          {battle.outcome ? outcomeText[battle.outcome] : '戦闘中...'}
        </h1>
        {battle.outcome && (
          <div className={`text-center text-2xl font-bold ${outcomeColor[battle.outcome]}`}>
            {outcomeText[battle.outcome]}
          </div>
        )}
      </div>

      {/* Status bars */}
      <div className="mb-6 space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>パーティHP</span>
            <span>{battle.partyHp} / {partyStats.hp}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${Math.max(0, (battle.partyHp / partyStats.hp) * 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>{enemy?.name ?? '敵'}</span>
            <span>{Math.max(0, battle.enemyHp)} / {enemy?.hp ?? 0}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${Math.max(0, (battle.enemyHp / (enemy?.hp ?? 1)) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Battle log */}
      <div className="mb-6 border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">
        <div className="text-sm font-medium mb-2">戦闘ログ</div>
        <div className="space-y-2 text-sm">
          {battle.log.map((entry, i) => (
            <div key={i} className={`${entry.actor === 'enemy' ? 'text-red-600' : 'text-blue-600'}`}>
              <span className="text-gray-400 text-xs">[{phaseNames[entry.phase]}]</span>{' '}
              {entry.action}
              {entry.damage !== undefined && entry.damage > 0 && (
                <span className="font-medium"> → {entry.damage} ダメージ</span>
              )}
            </div>
          ))}
          {battle.log.length === 0 && (
            <div className="text-gray-400">戦闘開始</div>
          )}
        </div>
      </div>

      {/* Action button */}
      {battle.outcome && (
        <button
          onClick={actions.proceedAfterBattle}
          className={`w-full py-3 font-medium rounded-lg ${
            battle.outcome === 'victory'
              ? 'bg-accent text-white'
              : 'bg-gray-500 text-white'
          }`}
        >
          {battle.outcome === 'victory'
            ? (isBossRoom ? 'ダンジョンクリア！' : '次へ進む')
            : battle.outcome === 'defeat'
            ? '拠点に戻る'
            : '撤退する'
          }
        </button>
      )}
    </div>
  );
}
