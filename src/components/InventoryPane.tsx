import React from 'react';
import { useGame } from '../context/GameContext';
import Modal from './Modal';

interface InventoryPaneProps {
  onClose: () => void;
}

const InventoryPane: React.FC<InventoryPaneProps> = ({ onClose }) => {
  const { inventory } = useGame();

  const categories = ['sword', 'katana', 'armor', 'amulet', 'wand', 'arrow'] as const;

  return (
    <Modal onClose={onClose}>
      <div className="max-h-96 overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">INVENTORY</h2>

        {categories.map((category) => {
          const items = inventory.filter((item) => item.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} className="mb-4">
              <h3 className="font-semibold text-ios-blue capitalize mb-2">{category}</h3>
              {items.map((item) => (
                <div key={item.id} className="bg-white border rounded p-3 mb-2 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-gray-600">Enhancement: {item.enhancement}</p>
                    </div>
                    {item.category === 'arrow' && item.quantity && (
                      <p className="font-bold">{item.quantity}x</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {inventory.length === 0 && (
          <p className="text-gray-500 text-center py-8">Inventory is empty</p>
        )}
      </div>

      <button onClick={onClose} className="w-full btn-primary mt-4">
        CLOSE
      </button>
    </Modal>
  );
};

export default InventoryPane;
