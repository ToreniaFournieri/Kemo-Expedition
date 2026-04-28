import { useEffect, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { HomeScreen } from './components/HomeScreen';
import { createEnvironmentStorageKey, getEnvironmentId } from './game/environment';

const LOADING_MESSAGES = [
  'ケモは長い夢を見る',
  'ライカは再興の為なら何でもする',
  '蒼牙破は地位より信念を選ぶ',
  '葉隠は真実よりも果実を望む',
  'レナードは人を信じない。シャチは別',
  'オルカは地上を歩きたい',
  'ルナは奇跡を信じない',
  'ノクスは宝石の心が盗めない',
  'ミシュカは祖国に帰りたい',
  'プチーツァは故郷を元に戻したい',
  'フィンはまるい石が好き',
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
  const { state, actions, bags, notifications, saveLoadWarning } = useGameState();
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

  useEffect(() => {
    // SpecRef: 5.1.4 | Save and load | display popup warning message
    if (!saveLoadWarning) return;
    window.alert(`${saveLoadWarning.message}\n\n${saveLoadWarning.errorLog}`);
  }, [saveLoadWarning]);

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-white text-black flex items-center justify-center px-6 text-center ${appThemeClasses}`}>
        <p className="text-lg font-medium">{loadingMessage}</p>
      </div>
    );
  }

  if (saveLoadWarning) {
    return (
      <div className={`min-h-screen bg-white text-black flex items-center justify-center px-6 ${appThemeClasses}`}>
        <div className="w-full max-w-3xl rounded-lg border border-red-300 bg-red-50 p-5 shadow">
          <h1 className="text-lg font-bold text-red-700">{saveLoadWarning.message}</h1>
          <p className="mt-2 text-sm text-red-700">エラーログ:</p>
          <pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded border border-red-200 bg-white p-3 text-xs text-red-900">
            {saveLoadWarning.errorLog}
          </pre>
        </div>
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
