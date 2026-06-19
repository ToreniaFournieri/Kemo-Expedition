import { useEffect } from 'react';
import { GameNotification } from '../types';

interface NotificationToastProps {
  notifications: GameNotification[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export function NotificationToast({ notifications, onDismiss, onDismissAll }: NotificationToastProps) {
  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-4 flex flex-col-reverse gap-1 z-50">
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
    ? 'text-accent'
    : notification.rarity === 'eliteRare'
      ? 'text-sub'
      : notification.rarity === 'bossRare' || notification.rarity === 'mythicRare'
        ? 'text-accent'
        : notification.rarity === 'common' || notification.rarity === 'uncommon'
          ? 'text-gray-800'
          : 'text-gray-800';

  // For drop notifications: Super Rare overrides to bold dark orange.
  const fontWeight = isItem
    ? (notification.isSuperRareItem || notification.rarity === 'mythicRare' ? 'font-bold' : 'font-medium')
    : notification.isPositive === true
      ? 'font-bold'
      : notification.isPositive === false
        ? 'font-normal'
        : 'font-medium';

  const nonItemColor = notification.style === 'rare' ? 'text-accent' : 'text-sub';

  return (
    <button
      onClick={onDismissAll}
      className={`
        notification-toast-item
        px-3 py-1.5 rounded-lg shadow-md cursor-pointer
        text-xs ${fontWeight} w-fit text-left
        transition-opacity duration-300
        bg-white/80 ${isItem ? itemTextColor : nonItemColor}
      `}
    >
      {notification.message}
    </button>
  );
}
