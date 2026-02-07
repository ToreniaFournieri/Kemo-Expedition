import { useEffect } from 'react';
import { GameNotification } from '../types';

interface NotificationToastProps {
  notifications: GameNotification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export function NotificationToast({ notifications, onDismiss, onDismissAll }: NotificationToastProps) {
  return (
    <div className="fixed bottom-4 left-4 flex flex-col-reverse gap-1 z-50">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          onDismissAll={onDismissAll}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: GameNotification;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

function NotificationItem({ notification, onDismiss, onDismissAll }: NotificationItemProps) {
  useEffect(() => {
    // Auto-dismiss individual notification after 5000ms
    const dismissTimer = setTimeout(() => {
      onDismiss(notification.id);
    }, 5000);

    return () => {
      clearTimeout(dismissTimer);
    };
  }, [notification.id, onDismiss]);

  const isRare = notification.style === 'rare';
  // Use bold for positive stat changes, normal weight for negative
  const fontWeight = notification.isPositive === true ? 'font-bold' : notification.isPositive === false ? 'font-normal' : 'font-medium';

  return (
    <button
      onClick={onDismissAll}
      className={`
        px-3 py-1.5 rounded-lg shadow-md cursor-pointer
        text-xs ${fontWeight} w-fit
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
