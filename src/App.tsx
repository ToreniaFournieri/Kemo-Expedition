import { useEffect, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';
import { createEnvironmentStorageKey } from './game/environment';

const LOADING_MESSAGE = '下界にいる勇敢な冒険者達を捜索中…';
const DARK_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-dark-mode');
const GAME_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-game-mode');
const THEME_SYNC_EVENT = 'kemo-expedition-theme-sync';

function getInitialGameModeClass() {
  if (typeof window === 'undefined') return '';
  const saved = localStorage.getItem(GAME_MODE_STORAGE_KEY);
  return saved === 'm.luna' ? 'theme-luna' : saved === 'm.laika' ? 'theme-laika' : '';
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
  const [gameModeClass, setGameModeClass] = useState(() => getInitialGameModeClass());

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

      const savedMode = localStorage.getItem(GAME_MODE_STORAGE_KEY);
      setGameModeClass(savedMode === 'm.luna' ? 'theme-luna' : savedMode === 'm.laika' ? 'theme-laika' : '');
    };

    syncThemeState();
    mediaQuery.addEventListener('change', syncThemeState);
    window.addEventListener('storage', syncThemeState);
    window.addEventListener(THEME_SYNC_EVENT, syncThemeState);
    return () => {
      mediaQuery.removeEventListener('change', syncThemeState);
      window.removeEventListener('storage', syncThemeState);
      window.removeEventListener(THEME_SYNC_EVENT, syncThemeState);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    document.body.classList.toggle('app-dark', isDarkModeEnabled);
    document.documentElement.classList.toggle('app-dark', isDarkModeEnabled);

    return () => {
      document.body.classList.remove('app-dark');
      document.documentElement.classList.remove('app-dark');
    };
  }, [isDarkModeEnabled]);

  const appThemeClasses = `${gameModeClass} ${isDarkModeEnabled ? 'theme-dark' : ''}`;

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
