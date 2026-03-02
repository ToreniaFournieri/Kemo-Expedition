import { useEffect, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';

const LOADING_MESSAGE = '下界にいる勇敢な冒険者達を捜索中…';

export default function App() {
  const { state, actions, bags, notifications } = useGameState();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center px-6 text-center">
        <p className="text-lg font-medium">{LOADING_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-lg mx-auto">
        <HomeScreen
          state={state}
          actions={actions}
          bags={bags}
          notifications={notifications}
          onDismissNotification={actions.dismissNotification}
          onDismissAllNotifications={actions.dismissAllNotifications}
        />
      </div>
    </div>
  );
}
