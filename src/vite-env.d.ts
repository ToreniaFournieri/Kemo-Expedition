/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_NUMBER__: number;
declare const __PUBLIC_CHARACTER_IMAGE_FILES__: readonly string[];
declare const __PUBLIC_CHIBI_IMAGE_FILES__: readonly string[];
declare const __AUTO_EQUIPMENT_PROFILE_ENABLED__: boolean;
declare const __AFK_LIVE_PROFILE_ENABLED__: boolean;
declare const __AFK_LIVE_PROFILE_FIXTURE__: string;
declare const __RUNTIME_DIAGNOSTICS_DEFAULT_ENABLED__: boolean;

type AutoEquipmentProfileWorkload = import('./game/autoEquipmentAttribution').AutoEquipmentProfileWorkload;
type AutoEquipmentProfileScope = import('./game/autoEquipmentAttribution').AutoEquipmentProfileScope;
type AutoEquipmentAttributionResult = import('./game/autoEquipmentAttribution').AutoEquipmentAttributionResult;

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
  theme: import('./theme/theme').DesktopTheme;
  parties: DesktopPartyProgressPartySnapshot[];
}

interface Window {
  __BOKEMO_RENDER_PROFILE__?: {
    commitCount: number;
    p95CommitDurationMs: number;
    longestCommitDurationMs: number;
  };
  __BOKEMO_AFK_LIVE_PROFILE_RESULT__?: Promise<import('./game/afkLiveProfile').AfkLiveProfileResult>;
  __BOKEMO_AFK_LIVE_PROFILE_MEMORY__?: {
    sample: () => Promise<DesktopProcessMemoryMetrics>;
    forceGc: () => Promise<void>;
  };
  __BOKEMO_AUTO_EQUIPMENT_PROFILE__?: {
    run: (workload: AutoEquipmentProfileWorkload, scope?: AutoEquipmentProfileScope, candidateOrderOffset?: number) => Promise<{
      workload: AutoEquipmentProfileWorkload;
      scope: AutoEquipmentProfileScope;
      summary: import('./components/home/homeShared').AutoEquipmentRunSummary;
      attribution: AutoEquipmentAttributionResult;
      actions: unknown[];
      actionSequenceSha256: string;
      finalStateSha256: string;
      sequentialReducerMs: number;
      reducerAttribution: import('./game/autoEquipmentAttribution').AutoEquipmentReducerAttribution;
      reducerCandidates: Record<string, {
        reducerMs: number;
        attribution: import('./game/autoEquipmentAttribution').AutoEquipmentReducerAttribution;
      }>;
      reducerCandidateExecutionOrder: string[];
      plannerCandidates: Record<string, {
        planningMs: number;
        attribution: AutoEquipmentAttributionResult;
      }>;
      plannerCandidateExecutionOrder: string[];
      legacyPlanningMs: number;
    }>;
  };
  __BOKEMO_MEMORY_BENCHMARK__?: {
    switchPanes: (iterations: number) => Promise<void>;
    sample: () => Promise<import('./game/memoryMonitoring').MemoryDiagnosticExport>;
  };
  bokemoDesktop?: {
    getStatus: () => Promise<{ isMacDesktop: boolean; notificationSupported: boolean }>;
    getWindowVisibility: () => Promise<boolean>;
    getMemoryMetrics: () => Promise<DesktopProcessMemoryMetrics>;
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

interface DesktopProcessMemoryMetrics {
  applicationWorkingSetBytes: number | null;
  rendererWorkingSetBytes: number | null;
  processBreakdown: Array<{
    pid: number | null;
    type: string;
    name: string | null;
    serviceName: string | null;
    workingSetBytes: number | null;
  }>;
}

interface DesktopExperimentalApiSettings {
  supported: boolean;
  enabled: boolean;
  host: string;
  port: number | null;
  token: string | null;
  apiVersion: 'experimental/v1';
}
