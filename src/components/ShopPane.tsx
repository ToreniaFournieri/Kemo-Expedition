import React from 'react';
import { useGame } from '../context/GameContext';
import { ITEMS } from '../constants/gameData';
import Modal from './Modal';

interface ShopPaneProps {
  onClose: () => void;
}

const ShopPane: React.FC<ShopPaneProps> = ({ onClose }) => {
  const { addItemToInventory } = useGame();

  const handleBuyItem = (item: any) => {
    // In a real game, we'd check gold and deduct it
    addItemToInventory({ ...item, quantity: 1 });
  };

  return (
    <Modal onClose={onClose}>
      <div className="max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">SHOP</h2>

        <div className="space-y-3">
          {ITEMS.map((item) => (
            <div key={item.id} className="bg-white border rounded p-3 flex justify-between items-center">
              <div className="text-sm">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-gray-600">Category: {item.category}</p>
              </div>
              <button
                onClick={() => handleBuyItem(item)}
                className="btn-primary text-xs px-4 py-2"
              >
                BUY
              </button>
            </div>
          ))}
        </div>
      </div>

      <button onClick={onClose} className="w-full btn-primary mt-4">
        CLOSE
      </button>
    </Modal>
  );
};

export default ShopPane;
