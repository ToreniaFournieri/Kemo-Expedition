import { useEffect, useState } from 'react';
import { GameNotification } from '../types';

interface NotificationToastProps {
  notifications: GameNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  return (
    <div className="fixed bottom-4 left-4 flex flex-col-reverse gap-2 z-50 max-w-xs">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: GameNotification;
  onDismiss: (id: string) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    // Remove bounce after first animation
    const bounceTimer = setTimeout(() => setIsNew(false), 500);

    // Auto-dismiss after 5000ms
    const dismissTimer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000);

    return () => {
      clearTimeout(bounceTimer);
      clearTimeout(dismissTimer);
    };
  }, [notification.id, onDismiss]);

  const isRare = notification.style === 'rare';

  return (
    <button
      onClick={() => onDismiss(notification.id)}
      className={`
        px-4 py-2 rounded-lg shadow-lg cursor-pointer
        text-white text-sm font-medium
        transition-all duration-300
        ${isRare
          ? 'bg-orange-600/90 hover:bg-orange-700/90'
          : 'bg-blue-600/90 hover:bg-blue-700/90'
        }
        ${isNew ? 'animate-bounce' : 'animate-pulse'}
      `}
    >
      {notification.message}
    </button>
  );
}
