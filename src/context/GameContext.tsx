import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Party, Character, Item, ExpeditionState, Dungeon } from '../types';
import { initializeParty } from '../utils/partyInitializer';
import { SAMPLE_DUNGEONS } from '../constants/gameData';

interface GameContextType {
  party: Party;
  inventory: Item[];
  expedition: ExpeditionState | null;
  startExpedition: (dungeon: Dungeon) => void;
  endExpedition: () => void;
  updatePartyHp: (damage: number) => void;
  addExperience: (exp: number) => void;
  addItemToInventory: (item: Item) => void;
  equipItem: (characterId: number, slotIndex: number, itemId: number) => void;
  updateCharacter: (characterId: number, updates: Partial<Character>) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [party, setParty] = useState<Party>(initializeParty());
  const [inventory, setInventory] = useState<Item[]>([]);
  const [expedition, setExpedition] = useState<ExpeditionState | null>(null);

  const startExpedition = (dungeon: Dungeon) => {
    setExpedition({
      currentDungeon: dungeon,
      currentRoom: 0,
      battleLog: [],
      isActive: true,
      isPaused: false,
    });
  };

  const endExpedition = () => {
    setExpedition(null);
  };

  const updatePartyHp = (damage: number) => {
    setParty((prev) => ({
      ...prev,
      hp: Math.max(0, prev.hp - damage),
    }));
  };

  const addExperience = (exp: number) => {
    setParty((prev) => {
      const newExp = prev.experience + exp;
      const newLevel = Math.min(29, prev.level + Math.floor(newExp / 100));
      return {
        ...prev,
        level: newLevel,
        experience: newExp % 100,
      };
    });
  };

  const addItemToInventory = (item: Item) => {
    setInventory((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing && item.category === 'arrow') {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: (i.quantity || 0) + (item.quantity || 1) }
            : i
        );
      }
      return [...prev, item];
    });
  };

  const equipItem = (characterId: number, slotIndex: number, itemId: number) => {
    setParty((prev) => ({
      ...prev,
      characters: prev.characters.map((char) =>
        char.id === characterId
          ? {
              ...char,
              equipmentSlots: [
                ...char.equipmentSlots.slice(0, slotIndex),
                itemId,
                ...char.equipmentSlots.slice(slotIndex + 1),
              ],
            }
          : char
      ),
    }));
  };

  const updateCharacter = (characterId: number, updates: Partial<Character>) => {
    setParty((prev) => ({
      ...prev,
      characters: prev.characters.map((char) =>
        char.id === characterId ? { ...char, ...updates } : char
      ),
    }));
  };

  return (
    <GameContext.Provider
      value={{
        party,
        inventory,
        expedition,
        startExpedition,
        endExpedition,
        updatePartyHp,
        addExperience,
        addItemToInventory,
        equipItem,
        updateCharacter,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};
