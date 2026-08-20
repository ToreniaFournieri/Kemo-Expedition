/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_NUMBER__: number;
declare const __BATTLE_SHADOW_MODE__: boolean;
declare const __PUBLIC_CHARACTER_IMAGE_FILES__: readonly string[];
declare const __PUBLIC_CHIBI_IMAGE_FILES__: readonly string[];

interface ImportMetaEnv {
  readonly VITE_DEV_DISCORD_WEBHOOK_URL?: string;
  readonly VITE_BETA_DISCORD_WEBHOOK_URL?: string;
  readonly VITE_PROD_DISCORD_WEBHOOK_URL?: string;
  readonly VITE_FEEDBACK_DISCORD_WEBHOOK_URL?: string;
}

type DesktopNotificationMode = 'hiddenOnly' | 'always';

interface DesktopNotificationPayload {
  id: string;
  title: string;
  body: string;
  kind: 'diary' | 'afkSummary';
  partyId?: number;
  diaryLogId?: string;
}

type DesktopPartyProgressValue =
  | { kind: 'none' }
  | { kind: 'continuous'; startedAt: number; endsAt: number }
  | { kind: 'steps'; completed: number; total: number };

interface DesktopPartyProgressPartySnapshot {
  id: number;
  name: string;
  state: string;
  stateLabel: string;
  headlineFloorName: string;
  outcomeLabel: string;
  chargeCells: string;
  chargeTimerText: string;
  compactProgressItems: Array<{ text: string; progressRatio: number | null }>;
  currentHp: number;
  maxHp: number;
  progress: DesktopPartyProgressValue;
  subProgress: DesktopPartyProgressValue;
}

interface DesktopPartyProgressSnapshot {
  schemaVersion: 1;
  environment: 'dev' | 'beta' | 'prod';
  language: 'ja' | 'en' | 'zh-CN' | 'zh-TW';
  updatedAt: number;
  unreadDiaryCount: number;
  theme: 'light' | 'dark' | 'laika' | 'laika-dark' | 'luna' | 'luna-dark';
  parties: DesktopPartyProgressPartySnapshot[];
}

interface Window {
  bokemoDesktop?: {
    getStatus: () => Promise<{ isMacDesktop: boolean; notificationSupported: boolean }>;
    getWindowVisibility: () => Promise<boolean>;
    getLaunchAtLogin: () => Promise<boolean>;
    setLaunchAtLogin: (enabled: boolean) => Promise<boolean>;
    showNotification: (payload: DesktopNotificationPayload) => Promise<boolean>;
    updatePartyProgressPane: (snapshot: DesktopPartyProgressSnapshot) => Promise<boolean>;
    getExperimentalApiSettings: () => Promise<DesktopExperimentalApiSettings>;
    setExperimentalApiEnabled: (enabled: boolean) => Promise<DesktopExperimentalApiSettings>;
    onExperimentalApiRequest: (callback: (operation: string, payload: unknown) => unknown | Promise<unknown>) => () => void;
    onNotificationActivated: (callback: (payload: DesktopNotificationPayload) => void) => () => void;
    onPartyProgressPartyActivated: (callback: (partyId: number) => void) => () => void;
  };
  bokemoPartyProgress?: {
    getSnapshot: () => Promise<DesktopPartyProgressSnapshot | null>;
    openMainWindow: () => Promise<boolean>;
    selectParty: (partyId: number) => Promise<boolean>;
    onSnapshot: (callback: (snapshot: DesktopPartyProgressSnapshot) => void) => () => void;
  };
}

interface DesktopExperimentalApiSettings {
  supported: boolean;
  enabled: boolean;
  host: string;
  port: number | null;
  token: string | null;
  apiVersion: 'experimental/v1';
}
