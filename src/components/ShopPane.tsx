import React from 'react';

interface ShopPaneProps {
  onClose: () => void;
}

export default function ShopPane({ onClose }: ShopPaneProps) {
  const items = [
    { id: 1, name: 'Iron Sword', price: 100 },
    { id: 2, name: 'Steel Armor', price: 150 },
    { id: 3, name: 'Fire Arrows (x20)', price: 50 },
    { id: 4, name: 'Healing Potion', price: 75 },
    { id: 5, name: 'Mana Potion', price: 60 },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50" onClick={onClose}>
      <div className="w-full bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">SHOP</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-400">×</button>
        </div>

        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="font-semibold text-sm">{item.name}</p>
                <p className="text-xs text-gray-600">{item.price}G</p>
              </div>
              <button className="bg-blue-500 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-600">
                BUY
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-blue-500 text-white rounded-lg p-3 font-semibold hover:bg-blue-600 mt-6"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
