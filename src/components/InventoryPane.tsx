import React from 'react';

interface InventoryPaneProps {
  onClose: () => void;
}

export default function InventoryPane({ onClose }: InventoryPaneProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50" onClick={onClose}>
      <div className="w-full bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">INVENTORY</h2>
          <button onClick={onClose} className="text-2xl font-bold text-gray-400">×</button>
        </div>

        <p className="text-center text-gray-500 py-8">Inventory is empty</p>

        <button
          onClick={onClose}
          className="w-full bg-blue-500 text-white rounded-lg p-3 font-semibold hover:bg-blue-600 mt-4"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
