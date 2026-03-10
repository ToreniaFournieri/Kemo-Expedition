import { useEffect, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';
import { createEnvironmentStorageKey, getEnvironmentId } from './game/environment';

const LOADING_MESSAGE = '下界にいる勇敢な冒険者達を捜索中…';
const DARK_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-dark-mode');
const GAME_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-game-mode');

function getInitialIsLunaMode() {
  if (typeof window === 'undefined') return false;

  if (getEnvironmentId() === 'luna') return true;

  const saved = localStorage.getItem(GAME_MODE_STORAGE_KEY);
  return saved === 'm.luna';
}
function getInitialDarkModeEnabled() {
  if (typeof window === 'undefined') return false;

  const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY);
  if (saved === 'on') return true;
  if (saved === 'off') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function App() {
  const { state, actions, bags, notifications } = useGameState();
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkModeEnabled, setIsDarkModeEnabled] = useState(() => getInitialDarkModeEnabled());
  const [isLunaMode, setIsLunaMode] = useState(() => getInitialIsLunaMode());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const syncThemeState = () => {
      const savedDarkMode = localStorage.getItem(DARK_MODE_STORAGE_KEY);
      if (savedDarkMode === 'on') {
        setIsDarkModeEnabled(true);
      } else if (savedDarkMode === 'off') {
        setIsDarkModeEnabled(false);
      } else {
        setIsDarkModeEnabled(mediaQuery.matches);
      }

      if (getEnvironmentId() === 'luna') {
        setIsLunaMode(true);
      } else {
        setIsLunaMode(localStorage.getItem(GAME_MODE_STORAGE_KEY) === 'm.luna');
      }
    };

    syncThemeState();
    mediaQuery.addEventListener('change', syncThemeState);
    window.addEventListener('storage', syncThemeState);
    return () => {
      mediaQuery.removeEventListener('change', syncThemeState);
      window.removeEventListener('storage', syncThemeState);
    };
  }, []);

  const appThemeClasses = `${isLunaMode ? 'theme-luna' : ''} ${isDarkModeEnabled ? 'theme-dark' : ''}`;

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
      <div className={`min-h-screen bg-white text-black flex items-center justify-center px-6 text-center ${appThemeClasses}`}>
        <p className="text-lg font-medium">{LOADING_MESSAGE}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-white text-black ${appThemeClasses}`}>
      <HomeScreen
        state={state}
        actions={actions}
        bags={bags}
        notifications={notifications}
        onDismissNotification={actions.dismissNotification}
        onDismissAllNotifications={actions.dismissAllNotifications}
      />
    </div>
  );
}
