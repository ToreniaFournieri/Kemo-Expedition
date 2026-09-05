import { useEffect, useState } from 'react';
import { useGameState } from './hooks/useGameState';
import { HomeScreen, preloadInitialHomeTab, preloadRemainingHomeTabs } from './components/HomeScreen';
import { createEnvironmentStorageKey, getEnvironmentId } from './game/environment';
import { setLanguage, t } from './i18n';
import { getThemeClassName, isGameModeAvailable } from './theme/theme';

const LOADING_MESSAGE_KEYS = [
  'loading.kemoDream',
  'loading.laika',
  'loading.sogaha',
  'loading.hagakure',
  'loading.leonard',
  'loading.orca',
  'loading.luna',
  'loading.nox',
  'loading.mishka',
  'loading.ptitsa',
  'loading.finn',
  'loading.mare',
] as const;
const DARK_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-dark-mode');
const GAME_MODE_STORAGE_KEY = createEnvironmentStorageKey('kemo-expedition-game-mode');
const THEME_SYNC_EVENT = 'kemo-expedition-theme-sync';

// SpecRef: 1.2.2 | Loading message | LOADING_MESSAGE
function getRandomLoadingMessage() {
  const randomIndex = Math.floor(Math.random() * LOADING_MESSAGE_KEYS.length);
  return t(LOADING_MESSAGE_KEYS[randomIndex]);
}

function getInitialGameModeClass() {
  if (typeof window === 'undefined') return '';
  const environment = getEnvironmentId();
  if (environment === 'beta') return 'theme-laika';
  if (environment === 'orca') return 'theme-orca';
  const saved = localStorage.getItem(GAME_MODE_STORAGE_KEY);
  return isGameModeAvailable(saved, environment) ? getThemeClassName(saved) : '';
}
function getInitialDarkModeEnabled() {
  if (typeof window === 'undefined') return false;

  const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY);
  if (saved === 'on') return true;
  if (saved === 'off') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function App() {
  const { state, actions, bags, notifications, saveLoadWarning, saveWriteWarning } = useGameState();
  const saveWriteWarningMessage = saveWriteWarning?.message;
  const saveWriteErrorLog = saveWriteWarning?.errorLog;
  const [isLoading, setIsLoading] = useState(true);
  setLanguage(state.global.language);
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
      } else if (getEnvironmentId() === 'orca') {
        setGameModeClass('theme-orca');
      } else {
        setGameModeClass(isGameModeAvailable(savedMode, getEnvironmentId()) ? getThemeClassName(savedMode) : '');
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

    document.documentElement.lang = state.global.language;
  }, [state.global.language]);

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
  }, [isLoading, state.global.language]);

  useEffect(() => {
    // Fetch only the initial panel on the startup critical path. Remaining tabs
    // fill the persistent cache when the browser becomes idle.
    void preloadInitialHomeTab().catch((error) => {
      console.warn('Unable to preload the initial home tab:', error);
    });

    const preloadRemaining = () => void preloadRemainingHomeTabs().catch((error) => {
      console.warn('Unable to preload inactive home tabs:', error);
    });
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleHandle = idleWindow.requestIdleCallback?.(preloadRemaining, { timeout: 4_000 });
    const fallbackHandle = idleHandle === undefined ? window.setTimeout(preloadRemaining, 1_500) : null;

    const timer = window.setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => {
      window.clearTimeout(timer);
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (fallbackHandle !== null) window.clearTimeout(fallbackHandle);
    };
  }, []);

  useEffect(() => {
    // SpecRef: 5.1.4 | Save and load | display popup warning message
    if (!saveLoadWarning) return;
    window.alert(`${saveLoadWarning.message}\n\n${saveLoadWarning.errorLog}`);
  }, [saveLoadWarning]);

  useEffect(() => {
    // A failed write must remain pending for retry and be visible to the player.
    if (!saveWriteWarningMessage || !saveWriteErrorLog) return;
    window.alert(`${saveWriteWarningMessage}\n\n${saveWriteErrorLog}`);
  }, [saveWriteWarningMessage, saveWriteErrorLog]);

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-surface-canvas text-content-primary flex items-center justify-center px-6 text-center ${appThemeClasses}`}>
        <p className="text-lg font-medium">{loadingMessage}</p>
      </div>
    );
  }

  if (saveLoadWarning) {
    return (
      <div className={`min-h-screen bg-surface-canvas text-content-primary flex items-center justify-center px-6 ${appThemeClasses}`}>
        <div className="w-full max-w-3xl rounded-lg border border-status-error-border bg-status-error-surface p-5 shadow">
          <h1 className="text-lg font-bold text-status-error">{saveLoadWarning.message}</h1>
          <p className="mt-2 text-sm text-status-error">{t('save.errorLog')}</p>
          <pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded border border-status-error-border/70 bg-surface-card p-3 text-xs text-status-error-strong">
            {saveLoadWarning.errorLog}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-surface-canvas text-content-primary ${appThemeClasses}`}>
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
