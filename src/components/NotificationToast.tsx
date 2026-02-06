import { useEffect } from 'react';
import { GameNotification } from '../types';

interface NotificationToastProps {
  notifications: GameNotification[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  return (
    <div className="fixed bottom-4 left-4 flex flex-col-reverse gap-1 z-50 max-w-xs">
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
  useEffect(() => {
    // Auto-dismiss after 5000ms
    const dismissTimer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000);

    return () => {
      clearTimeout(dismissTimer);
    };
  }, [notification.id, onDismiss]);

  const isRare = notification.style === 'rare';

  return (
    <button
      onClick={() => onDismiss(notification.id)}
      className={`
        px-3 py-1.5 rounded-lg shadow-md cursor-pointer
        text-xs font-medium
        transition-opacity duration-300
        ${isRare
          ? 'bg-white/95 text-orange-600'
          : 'bg-white/95 text-blue-600'
        }
      `}
    >
      {notification.message}
    </button>
  );
}
