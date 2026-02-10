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

  const isItem = notification.category === 'item';
  const itemTextColor = notification.isSuperRareItem
    ? 'text-orange-700'
    : notification.rarity === 'rare'
      ? 'text-blue-600'
      : notification.rarity === 'mythic'
        ? 'text-orange-700'
        : notification.rarity === 'common' || notification.rarity === 'uncommon'
          ? 'text-black'
          : 'text-black';

  // For drop notifications: Super Rare overrides to bold dark orange.
  const fontWeight = isItem
    ? (notification.isSuperRareItem ? 'font-bold' : 'font-medium')
    : notification.isPositive === true
      ? 'font-bold'
      : notification.isPositive === false
        ? 'font-normal'
        : 'font-medium';

  const nonItemColor = notification.style === 'rare' ? 'text-orange-600' : 'text-blue-600';

  return (
    <button
      onClick={onDismissAll}
      className={`
        px-3 py-1.5 rounded-lg shadow-md cursor-pointer
        text-xs ${fontWeight} w-fit
        transition-opacity duration-300
        bg-white/80 ${isItem ? itemTextColor : nonItemColor}
      `}
    >
      {notification.message}
    </button>
  );
}
