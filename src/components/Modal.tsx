import React, { ReactNode } from 'react';

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, children }) => {
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50"
      onClick={handleBackgroundClick}
    >
      <div className="w-full bg-white rounded-t-lg p-6 max-h-[80vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default Modal;
