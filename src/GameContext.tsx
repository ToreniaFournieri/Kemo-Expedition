import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameState } from './types';
import { initializeGame, startDungeon, resolveBattle, retreat, restorePartyHp } from './gameEngine';

interface GameContextType {
  state: GameState;
  startExpedition: (dungeonId: number) => void;
  battleNext: () => void;
  retreat: () => void;
  restoreHp: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(initializeGame());

  const handleStartExpedition = useCallback((dungeonId: number) => {
    setState(prev => startDungeon(dungeonId, prev));
  }, []);

  const handleBattleNext = useCallback(() => {
    setState(prev => resolveBattle(prev));
  }, []);

  const handleRetreat = useCallback(() => {
    setState(prev => retreat(prev));
  }, []);

  const handleRestoreHp = useCallback(() => {
    setState(prev => restorePartyHp(prev));
  }, []);

  return (
    <GameContext.Provider value={{
      state,
      startExpedition: handleStartExpedition,
      battleNext: handleBattleNext,
      retreat: handleRetreat,
      restoreHp: handleRestoreHp,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
