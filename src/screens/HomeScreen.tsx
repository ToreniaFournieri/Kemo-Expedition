import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { SAMPLE_DUNGEONS, RACES } from '../constants/gameData';
import { resolveBattle } from '../utils/battleCalculator';
import { BattleResult } from '../types';
import PartyStatus from '../components/PartyStatus';
import ExpeditionProgress from '../components/ExpeditionProgress';
import InventoryPane from '../components/InventoryPane';
import ShopPane from '../components/ShopPane';

type PaneType = null | 'inventory' | 'shop' | 'settings';

const HomeScreen: React.FC = () => {
  const { party, expedition, startExpedition, endExpedition, updatePartyHp, addExperience, addItemToInventory } = useGame();
  const [activePane, setActivePane] = useState<PaneType>(null);
  const [battleQueue, setBattleQueue] = useState<BattleResult[]>([]);
  const [isProcessingBattle, setIsProcessingBattle] = useState(false);

  // Auto-progress expedition every 5 seconds
  useEffect(() => {
    if (!expedition || expedition.isPaused) return;

    const interval = setInterval(() => {
      if (expedition && expedition.isActive) {
        processNextBattle();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [expedition]);

  const processNextBattle = () => {
    if (!expedition || isProcessingBattle) return;

    setIsProcessingBattle(true);

    // Determine which enemy to fight
    const currentRoom = expedition.currentRoom;
    const dungeonData = expedition.currentDungeon;
    let enemy;

    if (currentRoom < dungeonData.numberOfRooms - 1) {
      // Normal enemy
      const poolIndex = currentRoom % (dungeonData.poolsOfEnemies.length);
      const enemyPool = dungeonData.poolsOfEnemies[poolIndex];
      const randomEnemyId = enemyPool[Math.floor(Math.random() * enemyPool.length)];
      enemy = SAMPLE_DUNGEONS[0].bossEnemy; // Placeholder - should get from actual enemy data
    } else {
      // Boss
      enemy = dungeonData.bossEnemy;
    }

    // Resolve battle
    const result = resolveBattle(party, enemy);
    const battleResult: BattleResult = {
      roomNumber: currentRoom + 1,
      enemyName: enemy.name,
      enemyLevel: enemy.level,
      victory: result.enemyHpRemaining <= 0 && result.partyHpRemaining > 0,
      partyHpBefore: party.hp,
      partyHpAfter: result.partyHpRemaining,
      experienceGained: enemy.experience,
    };

    // Update party state
    updatePartyHp(party.hp - result.partyHpRemaining);
    addExperience(enemy.experience);

    // Add to battle queue
    setBattleQueue((prev) => [...prev, battleResult]);

    // Check if expedition should continue
    if (battleResult.victory) {
      if (currentRoom < dungeonData.numberOfRooms - 1) {
        // Continue to next room
        // This would be handled in a real implementation by updating expedition state
      } else {
        // Dungeon complete
        endExpedition();
      }
    } else {
      // Party defeated
      endExpedition();
    }

    setIsProcessingBattle(false);
  };

  const handleStartExpedition = () => {
    const dungeon = SAMPLE_DUNGEONS[0];
    startExpedition(dungeon);
    setBattleQueue([]);
  };

  const handleRetreat = () => {
    endExpedition();
    setBattleQueue([]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">KEMO EXPEDITION</h1>
        <p className="text-gray-600">
          {party.deityName} - Lv {party.level} Exp: {party.experience}%
        </p>
      </div>

      {/* Party Status */}
      <PartyStatus party={party} races={RACES} />

      {/* Quick Access Buttons */}
      <div className="grid grid-cols-3 gap-3 my-6">
        <button
          onClick={() => setActivePane('inventory')}
          className="btn-secondary text-sm"
        >
          INVENTORY
        </button>
        <button
          onClick={() => setActivePane('shop')}
          className="btn-secondary text-sm"
        >
          SHOP
        </button>
        <button
          onClick={() => setActivePane('settings')}
          className="btn-secondary text-sm"
        >
          SETTINGS
        </button>
      </div>

      {/* Expedition Progress or Start Button */}
      {expedition ? (
        <>
          <ExpeditionProgress expedition={expedition} battleQueue={battleQueue} />
          <div className="mt-6 space-y-3">
            <button
              onClick={handleRetreat}
              className="w-full btn-secondary"
            >
              RETREAT
            </button>
          </div>
        </>
      ) : (
        <button
          onClick={handleStartExpedition}
          className="w-full btn-primary mt-6"
        >
          START NEW EXPEDITION
        </button>
      )}

      {/* Detail Panes */}
      {activePane === 'inventory' && (
        <InventoryPane onClose={() => setActivePane(null)} />
      )}
      {activePane === 'shop' && (
        <ShopPane onClose={() => setActivePane(null)} />
      )}
    </div>
  );
};

export default HomeScreen;
