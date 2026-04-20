import { useEffect, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';
import { createEnvironmentStorageKey, getEnvironmentId } from './game/environment';

const LOADING_MESSAGES = [
  'ケモは長い夢を見る',
  'ライカは復興の為ならいかなる手段も俎上にあげる',
  'ランスロットは立場よりも信念を貫く',
  'パーシヴァルは真実よりも果実を好む',
  'レナードは人を信じない。でもシャチだけは信じてる',
  'オルカは地上を歩きたい',
  'ルナは奇跡を信じない',
  'ノクスは宝石の心が盗めない',
  'ミシュカは祖国に帰りたい',
  'プチーツァは平穏に暮らしたい',
  'フィンは王女としては暮らせてない',
  'マーレは普通のふりをする',
] as const;
const DARK_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-dark-mode');
const GAME_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-game-mode');
const THEME_SYNC_EVENT = 'kemo-expedition-theme-sync';

// SpecRef: 1.2.2 | Loading message | LOADING_MESSAGE
function getRandomLoadingMessage() {
  const randomIndex = Math.floor(Math.random() * LOADING_MESSAGES.length);
  return LOADING_MESSAGES[randomIndex];
}

function getInitialGameModeClass() {
  if (typeof window === 'undefined') return '';
  if (getEnvironmentId() === 'beta') return 'theme-laika';
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
  const [loadingMessage, setLoadingMessage] = useState(() => getRandomLoadingMessage());
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
      if (getEnvironmentId() === 'beta') {
        setGameModeClass('theme-laika');
      } else {
        setGameModeClass(savedMode === 'm.luna' ? 'theme-luna' : savedMode === 'm.laika' ? 'theme-laika' : '');
      }
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
    if (!isLoading) return;
    setLoadingMessage(getRandomLoadingMessage());
  }, [isLoading]);

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
        <p className="text-lg font-medium">{loadingMessage}</p>
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
