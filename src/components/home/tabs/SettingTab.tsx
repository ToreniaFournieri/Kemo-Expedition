import type { ApiV1ClairvoyanceResource } from '../../../api/v1/readModels';
import { clairvoyanceExpandedKey, GLOSSARY_TABS, SETTING_GLOSSARY_TAB_FAMILY, settingPanelExpandedKey, type GlossaryTab, type SettingPanel, type SettingTabPreferences } from '../../../api/v1/uiPreferenceCatalog';
import { Fragment,useCallback,useEffect,useMemo,useRef,useState,type ChangeEvent,type Dispatch,type MouseEvent,type ReactNode,type SetStateAction } from 'react';
import {
BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID,
LOCALIZED_BONUS_ABILITY_GLOSSARY_ENTRIES,
type BonusAbilityGlossarySubcategoryId,
} from '../../../data/bonusAbilityGlossary';
import { CLASS_SHORT_NAMES } from '../../../data/classes';
import { GOD_ENEMY_PROFILES,GOD_MYTHIC_DROPS } from '../../../data/dropTables';
import {
DUNGEONS,
getEffectiveEnemyLevel,
getEffectiveEnemyMultipliers,
getEffectiveExpeditionTier,
getLocalizedExpeditionFloorConcept,
} from '../../../data/dungeons';
import { ENEMIES,getEnemyDropCandidates } from '../../../data/enemies';
import { GLOSSARY_SECTIONS } from '../../../data/glossary';
import { ITEMS,SUPER_RARE_TITLES } from '../../../data/items';
import { RACES } from '../../../data/races';
import { getAbilityDescription } from '../../../game/characterComputation';
import { buildColosseumEnemy,COLOSSEUM_ENEMY_CLASS_OPTIONS,ColosseumEnemySettings,getStoredColosseumEnemySettings,normalizeColosseumEnemySettings,saveColosseumEnemySettings,subscribeColosseumEnemySettings } from '../../../game/colosseum';
import { DebugSettings } from '../../../game/debugSettings';
import { RuntimeDiagnostics } from '../../MemoryDiagnostics';
import { addOrcaEnemyAbilities, ORCA_ENEMY_LEVEL_OFFSET_MAX, ORCA_ENEMY_LEVEL_OFFSET_MIN, RUNTIME_GAME_MODES, type RuntimeGameMode } from '../../../game/runtimeGameMode';
import { getDeityDisplayName } from '../../../game/deity';
import { formatEnemyDefName } from '../../../game/enemyDisplay';
import { getEncounterEnemyWithScaling } from '../../../game/enemyScaling';
import { resolveEnemyPassiveAbilities } from '../../../game/enemyPassiveAbilities';
import { createEnvironmentStorageKey,getEnvironmentId,isDebugModeEnabled } from '../../../game/environment';
import { completeFeedbackSubmission,FEEDBACK_REWARD_COOLDOWN_MS,getFeedbackRewardEligibility,parseFeedbackSubmissionTimestamp,type FeedbackRewardState } from '../../../game/feedbackRewards';
import { getLocalizedEnhancementTitle,getLocalizedItemName,getLocalizedSuperRareTitle } from '../../../game/gameState';
import { buildGodRuntimeEnemy } from '../../../game/godEnemy';
import { hydrateGameState,serializeGameState } from '../../../game/saveCodec';
import { decodePersistedState } from '../../../game/storageCompression';
import { Language,SUPPORTED_LANGUAGES,t } from '../../../i18n';
import { AbilityId,Dungeon,EnemyDef,GameState,Item,NotificationCategory,NotificationStyle,RaceId } from '../../../types';
import { GAME_MODES, THEME_DEFINITIONS } from '../../../theme/theme';
import { DesktopNotificationSettings } from '../../DesktopNotificationSettings';
import { ApiV1Settings } from '../../ApiV1Settings';
import { DISPLAY_LOCALE } from '../../../i18n/displayFormat';


import {
ABILITY_NAMES,
APP_VERSION,
BONUS_ABILITY_GLOSSARY_SUBCATEGORY_META,
buildInlineBonusEntry,
CATEGORY_GROUPS,
CHARACTER_IMAGE_FILES,
DarkModeSetting,
FEEDBACK_DISCORD_WEBHOOK_URL,
FloatingBubblePortal,
formatBonusAbilityHelpDescription,
formatBonusAbilityPhaseDisplay,
formatBonuses,
formatDecimal,
formatNumber,
GameMode,
getEnemyBestiarySpellName,
getEnemyDisplayedMagicalAttackAmplifier,
getEnemyTypeCBonusText,
getItemStats,
getRarityFilterNote,
getRarityShortLabel,
getSliderProgressStyle,
IOS_GLASS_SLIDER_CLASS,
matchesRarityFilter,
normalizeRuntimeSnapshot,
PersistedRuntimeSnapshot,
RaceIcon,
RARITY_FILTER_LABELS,
RARITY_FILTER_OPTIONS,
RarityFilter,
renderCollapsedBestiaryEnemyImage,
renderElementalResistanceInline,
renderEnemyNameWithMutedClass,
renderTextWithRaceIcons,
renderUiIcon,
resolvePublicAssetPath,
TERRAIN_EFFECT_LABELS,
TERRAIN_EFFECT_OPTIONS,
UiIconKey
} from '../homeShared';

/** A party's members as the Character Roster needs them (`read/observation/party` → `partyInfo.parties`). */
export interface SettingRosterCharacter { raceId: RaceId; gender: 'male' | 'female'; isUnique: boolean; name: string }
export interface SettingRosterParty { id: number; characters: SettingRosterCharacter[] }

export default function SettingTab({
  developerNewsEntries,
  rosterParties,
  onBuildFeedbackReport,
  donationRows,
  clairvoyanceProjections,
  enemyEditValidOptions,
  glossaryEntries,
  itemCompendiumEntries,
  characterRosterEntries,
  bestiaryEntries,
  superRareEntries,
  onResetGame,
  onImportGameState,
  getCompressedSavePayload,
  getRuntimeSnapshot,
  onAddNotification,
  onGrantFeedbackReward,
  onClairvoyanceReset,
  selectedBestiaryDungeonId,
  onSetSelectedBestiaryDungeonId,
  expandedBestiaryEnemies,
  onSetExpandedBestiaryEnemies,
  bestiaryScrollTop,
  onSetBestiaryScrollTop,
  gameMode,
  onSetGameMode,
  runtimeGameMode,
  onSetRuntimeGameMode,
  orcaEnemyLevelOffset,
  onSetOrcaEnemyLevelOffset,
  darkModeSetting,
  onSetDarkModeSetting,
  isAutoRepeatEnabled,
  onSetAutoRepeatEnabled,
  isExpeditionStatsDisplayEnabled,
  onSetExpeditionStatsDisplayEnabled,
  debugSettings,
  onUpdateDebugSettings,
  partyCount,
  onPartyUnlock,
  language,
  onSetLanguage,
  onMarkDeveloperNewsRead,
  onNewsPaneExpandedChange,
  settingPreferences,
  onSetUiPreference,
}: {
  developerNewsEntries: Array<{ version: string; date: string; content: string; isRead: boolean }>;
  /** Every party's members for the Character Roster, from `read/observation/party` (`partyInfo.parties`). */
  rosterParties: SettingRosterParty[];
  /** Send Feedback (reviewed local exception): the save-derived report lines and attachments, built by HomeScreen. */
  onBuildFeedbackReport: (latestBattleLogParty: number | null) => Promise<{ versionBuild: string; userId: string; files: File[] }>;
  donationRows: Array<{ deityName: string; donationGold: number; rank: number; nextRankDonationRequirement: number | null }>;
  clairvoyanceProjections: ApiV1ClairvoyanceResource[] | null;
  enemyEditValidOptions: { terrainEffect: string[]; enemyType: string[] } | null;
  glossaryEntries: Array<{ glossaryId: string; category: string; label: string; description: string }> | null;
  itemCompendiumEntries: Array<{ itemId: number; revealed: boolean }> | null;
  characterRosterEntries: Array<{ raceId: string; status: { vitality: number; strength: number; intelligence: number; mind: number }; ability: string[]; cBonus: string[]; otherBonus: string[]; defaultAbility: string | null; unlockAbility: string | null }> | null;
  bestiaryEntries: Array<{ enemyId: number; revealed: boolean; encounters: number; defeats: number }> | null;
  superRareEntries: string[] | null;
  onResetGame: () => Promise<void>;
  onImportGameState: (state: GameState, runtimeSnapshot?: unknown) => Promise<{ state: GameState | null; errorLog: string | null }>;
  getCompressedSavePayload: () => Promise<string>;
  getRuntimeSnapshot: () => PersistedRuntimeSnapshot;
  onAddNotification: (
    message: string,
    style?: NotificationStyle,
    category?: NotificationCategory,
    isPositive?: boolean
  ) => void;
  onGrantFeedbackReward: () => void;
  onClairvoyanceReset: (partyIndex: number, changes: { resetCommonRewards?: boolean; resetRewards?: boolean; resetSideQuest?: boolean }) => void;
  selectedBestiaryDungeonId: number;
  onSetSelectedBestiaryDungeonId: Dispatch<SetStateAction<number>>;
  expandedBestiaryEnemies: Record<number, boolean>;
  onSetExpandedBestiaryEnemies: Dispatch<SetStateAction<Record<number, boolean>>>;
  bestiaryScrollTop: number;
  onSetBestiaryScrollTop: Dispatch<SetStateAction<number>>;
  gameMode: GameMode;
  onSetGameMode: (mode: GameMode) => void;
  runtimeGameMode: RuntimeGameMode;
  onSetRuntimeGameMode: (mode: RuntimeGameMode) => void;
  orcaEnemyLevelOffset: number;
  onSetOrcaEnemyLevelOffset: (offset: number) => void;
  darkModeSetting: DarkModeSetting;
  onSetDarkModeSetting: (setting: DarkModeSetting) => void;
  isAutoRepeatEnabled: boolean;
  onSetAutoRepeatEnabled: (enabled: boolean) => void;
  isExpeditionStatsDisplayEnabled: boolean;
  onSetExpeditionStatsDisplayEnabled: (enabled: boolean) => void;
  debugSettings: DebugSettings;
  onUpdateDebugSettings: (updates: Partial<DebugSettings>) => void;
  partyCount: number;
  onPartyUnlock: () => void;
  language: Language;
  onSetLanguage: (language: Language) => void;
  onMarkDeveloperNewsRead: (itemIds: string[]) => void;
  onNewsPaneExpandedChange: (expanded: boolean) => void;
  /** Retained Setting-tab preferences from `read/observation/setting` (`null` until the first read arrives). */
  settingPreferences: SettingTabPreferences | null;
  /** Commits one retained preference through `commit/setting/uiPreferences`. */
  onSetUiPreference: (key: string, value: string | number | boolean) => void;
}) {
  type SettingPanelKey = SettingPanel;
  type GlossaryTabKey = GlossaryTab;
  const GLOSSARY_TAB_LABELS: Record<GlossaryTabKey, string> = {
    能: t('setting.glossary.tab.abilities'),
    基: t('setting.glossary.tab.baseStats'),
    固: t('setting.glossary.tab.fixedEffects'),
    増: t('setting.glossary.tab.bonuses'),
    機: t('setting.glossary.tab.mechanics'),
    信: t('setting.glossary.tab.faith'),
    魔: t('setting.glossary.tab.magic'),
    地: t('setting.glossary.tab.terrain'),
    求: t('setting.glossary.tab.sideQuests'),
  };
  const defaultSettingPanelState: Record<SettingPanelKey, boolean> = {
    news: false,
    modeSelect: false,
    donation: false,
    clairvoyance: false,
    glossary: false,
    itemCompendium: false,
    characterRoster: false,
    bestiary: false,
    superRare: false,
    feedback: false,
    gameSetting: false,
    debug: true,
    enemyEdit: true,
  };

  const FEEDBACK_NAME_STORAGE_KEY = createEnvironmentStorageKey('settingFeedbackName');
  const FEEDBACK_SUBMITTED_STORAGE_KEY = createEnvironmentStorageKey('settingFeedbackSubmitted');
  const FEEDBACK_LAST_SUBMITTED_AT_STORAGE_KEY = createEnvironmentStorageKey('settingFeedbackLastSubmittedAt');
  const [feedbackName, setFeedbackName] = useState(() => {
    try {
      return localStorage.getItem(FEEDBACK_NAME_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<'Feedback' | 'Question' | 'Feature Request' | 'Bug Report'>('Feedback');
  const [feedbackRewardState, setFeedbackRewardState] = useState<FeedbackRewardState>(() => {
    try {
      return {
        hasLegacySubmission: localStorage.getItem(FEEDBACK_SUBMITTED_STORAGE_KEY) === 'true',
        lastSuccessfulSubmissionAt: parseFeedbackSubmissionTimestamp(localStorage.getItem(FEEDBACK_LAST_SUBMITTED_AT_STORAGE_KEY)),
      };
    } catch {
      return { hasLegacySubmission: false, lastSuccessfulSubmissionAt: null };
    }
  });
  const [feedbackEligibilityNow, setFeedbackEligibilityNow] = useState(() => Date.now());
  const feedbackRewardEligibility = getFeedbackRewardEligibility(feedbackRewardState, feedbackEligibilityNow);
  const feedbackRewardEligible = feedbackRewardEligibility !== 'cooldown';
  const [feedbackFiles, setFeedbackFiles] = useState<File[]>([]);
  const [feedbackLatestBattleLogSelection, setFeedbackLatestBattleLogSelection] = useState<'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6' | 'None'>('PT1');
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const feedbackFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(FEEDBACK_NAME_STORAGE_KEY, feedbackName);
    } catch (error) {
      console.error('Failed to persist feedback name:', error);
    }
  }, [feedbackName, FEEDBACK_NAME_STORAGE_KEY]);

  useEffect(() => {
    if (feedbackRewardState.lastSuccessfulSubmissionAt === null || feedbackRewardEligible) return;
    const eligibleAt = feedbackRewardState.lastSuccessfulSubmissionAt + FEEDBACK_REWARD_COOLDOWN_MS;
    const timeoutId = window.setTimeout(
      () => setFeedbackEligibilityNow(Date.now()),
      Math.max(0, eligibleAt - Date.now()) + 50,
    );
    return () => window.clearTimeout(timeoutId);
  }, [feedbackRewardEligible, feedbackRewardState.lastSuccessfulSubmissionAt]);

  const formatFeedbackTimestamp = (): string => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false, timeZoneName:'short' });
    const parts = formatter.formatToParts(now);
    const year = parts.find((p) => p.type === 'year')?.value ?? '0000';
    const month = parts.find((p) => p.type === 'month')?.value ?? '00';
    const day = parts.find((p) => p.type === 'day')?.value ?? '00';
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const timezone = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'UTC';
    return `${year}/${month}/${day} ${hour}:${minute} (${timezone})`;
  };

  // SpecRef: 8.6 | UI_SETTING | フィードバック
  const handleFeedbackFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length > 4) {
      window.alert(t('setting.feedback.maxFilesWarning'));
    }
    setFeedbackFiles(selectedFiles.slice(0, 4));
  };

  const buildBackupFile = async (): Promise<File> => {
    const payload = {
      meta: {
        app: 'Kemo-Expedition',
        version: versionTag,
        env: currentEnv,
        exportedAt: new Date().toISOString(),
        format: 'compressed-v1',
      },
      saveDataCompressed: await getCompressedSavePayload(),
      runtimeSnapshot: getRuntimeSnapshot(),
    };
    return new File([JSON.stringify(payload)], getBackupFileName('compressed'), { type: 'application/json' });
  };

  // SpecRef: 8.6 | UI_SETTING | フィードバック
  const handleSendFeedback = async () => {
    if (!FEEDBACK_DISCORD_WEBHOOK_URL) { window.alert(t('setting.feedback.webhookMissing')); return; }
    if (!feedbackName.trim()) { window.alert(t('setting.feedback.nameRequired')); return; }
    if (!feedbackText.trim()) { window.alert(t('setting.feedback.bodyRequired')); return; }
    setIsSendingFeedback(true);
    try {
      const nav = typeof navigator === 'undefined' ? null : navigator;
      const userAgent = nav?.userAgent ?? 'unknown';
      const browser = userAgent.match(/(Firefox|Edg|OPR|Chrome|Safari)\/[\d.]+/)?.[0] ?? 'unknown';
      const browserVersion = userAgent.match(/(?:Firefox|Edg|OPR|Chrome|Version)\/([\d.]+)/)?.[1] ?? 'unknown';
      const osVersion = userAgent.match(/Android ([\d.]+)/i)?.[0]
        ?? userAgent.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/i)?.[0]?.replace(/_/g, '.')
        ?? userAgent.match(/Windows NT ([\d.]+)/i)?.[0]
        ?? userAgent.match(/Mac OS X ([\d_]+)/i)?.[0]?.replace(/_/g, '.')
        ?? 'unknown';
      const latestBattleLogParty = feedbackLatestBattleLogSelection === 'None' ? null : Number(feedbackLatestBattleLogSelection.replace('PT', ''));
      const report = await onBuildFeedbackReport(latestBattleLogParty);
      const payload = {
        content: [
          '**Feedback**',
          `**Version Build env:** ${report.versionBuild} ${getEnvironmentId()}`,
          `**Timestamp:** ${formatFeedbackTimestamp()}`,
          `**User ID:** ${report.userId}`,
          `**browser, version:** ${browser}, ${browserVersion}`,
          `**OS version:** ${osVersion}`,
          `**Resolution:** ${formatNumber(window.innerWidth)} px, ${formatNumber(window.innerHeight)} px`,
          `**Name:** ${feedbackName.trim() || '-'}`,
          `**Category:** ${feedbackCategory}`,
          `**Feedback text:** ${feedbackText.trim()}`,
          `**Latest Battle Log selection:** ${feedbackLatestBattleLogSelection}`
        ].join('\n'),
        username: `KEMO EXPEDITION ${currentEnv.toUpperCase()} FEEDBACK`,
      };
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify(payload));
      const generatedFiles: File[] = [await buildBackupFile(), ...report.files];
      [...generatedFiles, ...feedbackFiles].forEach((file, index) => {
        formData.append(`files[${index}]`, file, file.name);
      });
      const response = await fetch(FEEDBACK_DISCORD_WEBHOOK_URL, { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Webhook request failed: ${response.status}`);
      const submittedAt = Date.now();
      const { shouldGrantReward, nextState } = completeFeedbackSubmission(feedbackRewardState, submittedAt);
      localStorage.setItem(FEEDBACK_SUBMITTED_STORAGE_KEY, 'true');
      localStorage.setItem(FEEDBACK_LAST_SUBMITTED_AT_STORAGE_KEY, String(submittedAt));
      setFeedbackRewardState(nextState);
      setFeedbackEligibilityNow(submittedAt);
      if (shouldGrantReward) {
        onGrantFeedbackReward();
      }
      onAddNotification(
        t(shouldGrantReward ? 'setting.feedback.sentFirst' : 'setting.feedback.sent'),
        'normal',
        'item',
        true,
      );
      setFeedbackText('');
      setFeedbackFiles([]);
      if (feedbackFileInputRef.current) {
        feedbackFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      window.alert(t('setting.feedback.sendFailed'));
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // SpecRef: 9.1.4.17 | UI state ownership | Retained pane expansion, per-party Clairvoyance expansion, and the Glossary
  // tab are per-save `uiPreferences`. A click updates the view at once (local overlay) and commits the preference.
  const [panelOverrides, setPanelOverrides] = useState<Partial<Record<SettingPanelKey, boolean>>>({});
  const settingPanelExpanded = useMemo<Record<SettingPanelKey, boolean>>(
    () => ({ ...defaultSettingPanelState, ...settingPreferences?.panelExpanded, ...panelOverrides }),
    [settingPreferences, panelOverrides],
  );
  const [clairvoyanceOverrides, setClairvoyanceOverrides] = useState<Record<number, boolean>>({});
  /** Keyed by party number (1-based). */
  const clairvoyancePartyExpanded = useMemo<Record<number, boolean>>(
    () => ({ ...settingPreferences?.clairvoyanceExpanded, ...clairvoyanceOverrides }),
    [settingPreferences, clairvoyanceOverrides],
  );
  const toggleClairvoyanceParty = (partyNumber: number, expanded: boolean) => {
    setClairvoyanceOverrides((prev) => ({ ...prev, [partyNumber]: expanded }));
    onSetUiPreference(clairvoyanceExpandedKey(partyNumber), expanded);
  };
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [compendiumCategory, setCompendiumCategory] = useState<string>('armor');
  const [colosseumEnemySettings, setColosseumEnemySettings] = useState<ColosseumEnemySettings>(() => getStoredColosseumEnemySettings());
  const colosseumEnemySettingsRef = useRef(colosseumEnemySettings);
  const [compendiumRarityFilter, setCompendiumRarityFilter] = useState<RarityFilter>('all');
  const [glossaryTabOverride, setGlossaryTabOverride] = useState<GlossaryTabKey | null>(null);
  const glossaryTab: GlossaryTabKey = glossaryTabOverride ?? settingPreferences?.glossaryTab ?? '能';
  const setGlossaryTab = (tab: GlossaryTabKey) => {
    setGlossaryTabOverride(tab);
    onSetUiPreference(SETTING_GLOSSARY_TAB_FAMILY, tab);
  };
  const [bonusAbilityGlossarySubcategory, setBonusAbilityGlossarySubcategory] = useState<BonusAbilityGlossarySubcategoryId>('passive');
  // Expanded Glossary entries are local view state (8.6 retains only the tab).
  const [expandedGlossaryEntries, setExpandedGlossaryEntries] = useState<Record<string, boolean>>({});
  const [expandedCompendiumItems, setExpandedCompendiumItems] = useState<Record<number, boolean>>({});
  const [activeAbilityHelp, setActiveAbilityHelp] = useState<{ key: string; title: string; description: string } | null>(null);
  const [abilityHelpPosition, setAbilityHelpPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const bestiaryListRef = useRef<HTMLDivElement | null>(null);
  // SpecRef: 8.6 | UI_SETTING | Enemy Edit Pane
  // The pane follows the device settings, including a change committed through the Application API
  // (`commit/setting/enemyEditPane`), which saves them and notifies this subscription.
  useEffect(() => subscribeColosseumEnemySettings((settings) => {
    colosseumEnemySettingsRef.current = settings;
    setColosseumEnemySettings(settings);
  }), []);
  const updateColosseumEnemySettings = useCallback((updates: Partial<ColosseumEnemySettings>) => {
    const nextSettings = normalizeColosseumEnemySettings({ ...colosseumEnemySettingsRef.current, ...updates });
    // Persist immediately so battle execution (which reads storage) uses the latest setting
    // even when the player changes Enemy Edit values and starts a battle right away. Saving notifies the
    // subscription above, which updates this pane's state.
    saveColosseumEnemySettings(nextSettings);
  }, []);

  useEffect(() => {
    saveColosseumEnemySettings(colosseumEnemySettings);
  }, [colosseumEnemySettings]);

  useEffect(() => {
    if (!debugSettings.colosseumEnabled && selectedBestiaryDungeonId === 99) {
      onSetSelectedBestiaryDungeonId(1);
    }
  }, [debugSettings.colosseumEnabled, selectedBestiaryDungeonId, onSetSelectedBestiaryDungeonId]);


  const versionTag = APP_VERSION;

  const currentEnv = getEnvironmentId();
  const isBetaEnvironment = currentEnv === 'beta';
  const isOrcaEnvironment = currentEnv === 'orca';
  const debugModeEnabled = isDebugModeEnabled();
  const modeSelectionLocked = isBetaEnvironment || runtimeGameMode === 'mode.orca';
  const unreadDeveloperNewsItems = developerNewsEntries.filter((item) => !item.isRead);
  const hasUnreadDeveloperNews = unreadDeveloperNewsItems.length > 0;

  // SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知)
  useEffect(() => {
    onNewsPaneExpandedChange(settingPanelExpanded.news);
  }, [settingPanelExpanded.news, onNewsPaneExpandedChange]);

  const toggleSettingPanel = (panelKey: SettingPanelKey) => {
    const expanded = !settingPanelExpanded[panelKey];
    setPanelOverrides((prev) => ({ ...prev, [panelKey]: expanded }));
    onSetUiPreference(settingPanelExpandedKey(panelKey), expanded);
  };

  // SpecRef: 8.6 | UI_SETTING | Setting (設定)
  const renderSettingPanelHeader = (panelKey: SettingPanelKey, title: string) => {
    const expanded = settingPanelExpanded[panelKey];
    return (
      <button
        type="button"
        onClick={() => toggleSettingPanel(panelKey)}
        className="w-full flex items-center justify-between text-sm font-medium"
      >
        <span className="inline-flex items-center gap-2">
          <span>{title}</span>
          {panelKey === 'news' && hasUnreadDeveloperNews && (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-status-unread" aria-label="Unread developer news" />
          )}
        </span>
        <span className={`text-xs text-gray-500 transform transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
      </button>
    );
  };

  const getBackupFileName = (format: 'json' | 'compressed' = 'json'): string => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    const dd = `${now.getDate()}`.padStart(2, '0');
    const extension = format === 'compressed' ? 'kemoz' : 'json';
    return `Kemo-Expedition_Backup_${versionTag}_${currentEnv}_${yyyy}${mm}${dd}.${extension}`;
  };

  const downloadBackupFile = (content: BlobPart, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // WebKit may not start reading the object URL until after the click handler returns.
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const openBackupFileForManualSave = (file: File) => {
    const url = URL.createObjectURL(file);
    const backupWindow = window.open(url, '_blank');
    if (!backupWindow) {
      // Some Android browsers block blob popups even when they originate from a
      // button press. Keep a native download attempt as a second escape hatch.
      downloadBackupFile(file, file.name, file.type);
    } else {
      backupWindow.opener = null;
    }
    // Keep the URL alive while an embedded browser hands the new page to its viewer.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    window.alert(t('setting.backup.manualSaveInstructions'));
  };

  const saveBackupWithFilePicker = async (file: File): Promise<'saved' | 'cancelled' | 'unavailable'> => {
    const filePickerWindow = window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName: string;
        types: Array<{ description: string; accept: Record<string, string[]> }>;
      }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;
    };
    if (!filePickerWindow.showSaveFilePicker) return 'unavailable';

    try {
      const fileHandle = await filePickerWindow.showSaveFilePicker({
        suggestedName: file.name,
        types: [{
          description: 'KEMO EXPEDITION backup',
          accept: { [file.type]: ['.kemoz'] },
        }],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      return 'saved';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      console.warn('Native backup file saving failed; falling back to file download.', error);
      return 'unavailable';
    }
  };

  // SpecRef: 8.6 | UI_SETTING | 5.1 Backup (Export)
  const handleExportBackup = async () => {
    const backupFile = await buildBackupFile();
    const nav = navigator as Navigator & {
      canShare?: (data: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    const isIos = /iPad|iPhone|iPod/.test(nav.userAgent)
      || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
    const isSafari = /Safari\//.test(nav.userAgent)
      && !/(Chrome|Chromium|CriOS|Edg|OPR|FxiOS)\//.test(nav.userAgent);

    if ((isIos || isSafari) && nav.share) {
      const shareData: ShareData = { files: [backupFile] };
      let canShareBackup = !nav.canShare;
      try {
        canShareBackup ||= nav.canShare?.(shareData) === true;
      } catch (error) {
        console.warn('The browser rejected the backup share capability check.', error);
      }
      if (canShareBackup) {
        try {
          // Safari can ignore an object URL anchor's download attribute and try
          // to render the backup as a page. Its native share sheet saves the file.
          await nav.share(shareData);
          onAddNotification(t('setting.backup.exported'), 'normal', 'item', true);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.warn('Native backup sharing failed; falling back to file download.', error);
        }
      }
    }

    if (isIos) {
      // Embedded iOS browsers can omit file sharing and ignore the download
      // attribute, so use the browser viewer as a final manual-save fallback.
      openBackupFileForManualSave(backupFile);
      return;
    }

    // Chromium can disregard an object-URL anchor's download filename and save the
    // blob URL itself as an unusable link. Its native picker writes the real file.
    const filePickerResult = await saveBackupWithFilePicker(backupFile);
    if (filePickerResult === 'cancelled') return;
    if (filePickerResult === 'saved') {
      onAddNotification(t('setting.backup.exported'), 'normal', 'item', true);
      return;
    }

    downloadBackupFile(
      backupFile,
      backupFile.name,
      backupFile.type,
    );
    onAddNotification(t('setting.backup.exported'), 'normal', 'item', true);
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;
      const source = parsed && typeof parsed === 'object' && 'saveDataCompressed' in parsed
        ? JSON.parse(decodePersistedState((parsed as { saveDataCompressed: string }).saveDataCompressed)) as unknown
        : parsed && typeof parsed === 'object' && 'saveData' in parsed
          ? (parsed as { saveData: unknown }).saveData
          : parsed;

      if (!source || typeof source !== 'object') {
        window.alert(t('setting.import.invalidFormat'));
        return;
      }

      const saveData = source as Partial<GameState>;
      const issues = validateImportedSaveData(saveData);

      if (parsed && typeof parsed === 'object' && 'meta' in parsed) {
        const meta = (parsed as { meta?: { version?: string; env?: string; format?: string } }).meta;
        if (meta?.version && meta.version !== versionTag) {
          issues.push(t('setting.import.issue.versionMismatch', { current: versionTag, file: meta.version }));
        }
        if (meta?.env && meta.env !== currentEnv) {
          issues.push(t('setting.import.issue.envMismatch', { current: currentEnv, file: meta.env }));
        }
        if (meta?.format === 'compressed-v1') {
          try {
            const canonicalImported = serializeGameState(hydrateGameState(saveData as GameState));
            if (JSON.stringify(canonicalImported) !== JSON.stringify(saveData)) {
              issues.push(t('setting.import.issue.formatMismatch'));
            }
          } catch {
            issues.push(t('setting.import.issue.formatMismatch'));
          }
        }
        if ('runtimeSnapshot' in parsed && !normalizeRuntimeSnapshot(
          (parsed as { runtimeSnapshot?: unknown }).runtimeSnapshot,
          Array.isArray(saveData.parties) ? saveData.parties.length : 0,
        )) {
          issues.push(t('setting.import.issue.formatMismatch'));
        }
      }

      if (issues.length > 0) {
        const shouldContinue = window.confirm(
          t('setting.import.integrityWarning', { issues: issues.join('\n- ') })
        );
        if (!shouldContinue) return;
      }

      const shouldImport = window.confirm(
        t('setting.import.confirmReplace')
      );
      if (!shouldImport) return;

      const runtimeSnapshot = parsed && typeof parsed === 'object' && 'runtimeSnapshot' in parsed
        ? (parsed as { runtimeSnapshot?: unknown }).runtimeSnapshot
        : undefined;
      const importResult = await onImportGameState(saveData as GameState, runtimeSnapshot);
      if (!importResult.state) {
        window.alert(`${t('setting.import.invalidFormat')}\n\n${importResult.errorLog ?? ''}`);
        return;
      }
      onAddNotification(t('setting.import.imported'), 'normal', 'item', true);
    } catch (error) {
      console.error(error);
      window.alert(t('setting.import.jsonParseFailed'));
    }
  };

  const validateImportedSaveData = (saveData: Partial<GameState>): string[] => {
    // SpecRef: 9 | Environment | Import/Export format consistency check
    const issues: string[] = [];

    if (!Array.isArray(saveData.parties)) issues.push(t('setting.import.issue.partiesMissing'));
    if (!saveData.global || typeof saveData.global !== 'object') {
      issues.push(t('setting.import.issue.globalMissing'));
    } else {
      if (typeof saveData.global.gold !== 'number') issues.push(t('setting.import.issue.globalGoldMissing'));
      if (!saveData.global.inventory || typeof saveData.global.inventory !== 'object') issues.push(t('setting.import.issue.globalInventoryMissing'));
    }

    if (!saveData.bags || typeof saveData.bags !== 'object') {
      issues.push(t('setting.import.issue.bagsMissing'));
    } else {
      const requiredBags: Array<keyof GameState['bags']> = [
        'commonRewardBag',
        'commonEnhancementBag',
        'uncommonRewardBag',
        'eliteRareRewardBag',
        'bossRareRewardBag',
        'mythicRareRewardBag',
        'enhancementBag',
        'superRareBag',
        'physicalThreatBag',
        'magicalThreatBag',
        'sideQuestBag',
      ];
      const missingBags = requiredBags.filter((bagKey) => !(bagKey in saveData.bags!));
      if (missingBags.length > 0) {
        issues.push(t('setting.import.issue.bagsIncomplete', { bags: missingBags.join(', ') }));
      }
    }

    if (typeof saveData.selectedPartyIndex !== 'number') issues.push(t('setting.import.issue.selectedPartyIndexMissing'));
    if (typeof saveData.buildNumber !== 'number') issues.push(t('setting.import.issue.buildNumberMissing'));

    if (Array.isArray(saveData.parties)) {
      if (saveData.parties.length === 0) {
        issues.push(t('setting.import.issue.partiesEmpty'));
      }

      saveData.parties.forEach((party, index) => {
        if (!party || typeof party !== 'object') {
          issues.push(t('setting.importValidation.invalidParty', { index }));
          return;
        }

        if (!Array.isArray(party.characters)) {
          issues.push(t('setting.importValidation.invalidCharacters', { index }));
          return;
        }

        party.characters.forEach((character, characterIndex) => {
          if (!character || typeof character !== 'object') {
            issues.push(t('setting.importValidation.invalidCharacter', { index, characterIndex }));
          }
        });
      });
    }

    return issues;
  };

  useEffect(() => {
    bestiaryListRef.current?.scrollTo({ top: bestiaryScrollTop, behavior: 'auto' });
  }, [bestiaryScrollTop]);

  const confirmReset = (label: string, onConfirm: () => void) => {
    if (!window.confirm(t('setting.clairvoyance.resetConfirmation', { label }))) {
      return;
    }

    onConfirm();
  };

  const compendiumEntryById = new Map((itemCompendiumEntries ?? []).map((entry) => [entry.itemId, entry]));
  const compendiumItems = ITEMS
    .filter(item =>
      (debugSettings.displayAllCompendium || compendiumEntryById.get(item.id)?.revealed === true) &&
      compendiumEntryById.has(item.id) &&
      item.category === compendiumCategory &&
      matchesRarityFilter(item.id, compendiumRarityFilter)
    )
    .slice()
    .sort((a, b) => b.id - a.id);
  const CHARACTER_ROSTER_RACES: Array<{ id: RaceId; raceName: string }> = [
    { id: 'lupinian', raceName: 'Lupinian' },
    { id: 'vulpinian', raceName: 'Vulpinian' },
    { id: 'felidian', raceName: 'Felidian' },
    { id: 'caninian', raceName: 'Caninian' },
    { id: 'ursan', raceName: 'Ursan' },
    { id: 'procyonian', raceName: 'Procyonian' },
    { id: 'leporian', raceName: 'Leporian' },
    { id: 'cervin', raceName: 'Cervin' },
    { id: 'murid', raceName: 'Murid' },
    { id: 'kemoria', raceName: 'Kemoria' },
    { id: 'orcinian', raceName: 'Orcinian' },
    { id: 'avian', raceName: 'Avian' },
  ];
  const [characterRosterRaceId, setCharacterRosterRaceId] = useState<RaceId>('lupinian');
  const [characterRosterPartyId, setCharacterRosterPartyId] = useState<number>(1);
  const [characterRosterGenderFilter, setCharacterRosterGenderFilter] = useState<'male' | 'female' | 'unique'>('male');

  const availableRosterImageFiles = CHARACTER_IMAGE_FILES;
  const getCharacterRosterImageFileName = (character: SettingRosterCharacter, partyId: number): string | null => {
    const uniquePartyMemberImageByName: Partial<Record<string, string>> = {
      'ケモ': 'Unique_Kemo.png', 'ライカ': 'Unique_Laika.png', 'ルナ': 'Unique_Luna.png', 'ノクス': 'Unique_Nox.png',
      'マーレ': 'Unique_Merle.png', 'プチーツァ': 'Unique_Puchitsa.png', '蒼牙破': 'Unique_Souga-ha.png', 'レナード': 'Unique_Leonard.png',
      '葉隠': 'Unique_Hagakure.png', 'フィン': 'Unique_Finn.png', 'オルカ': 'Unique_Orca.png', 'ミシュカ': 'Unique_Mishka.png',
    };
    if (character.isUnique) return uniquePartyMemberImageByName[character.name] ?? null;
    const raceMeta = CHARACTER_ROSTER_RACES.find((race) => race.id === character.raceId);
    const genderLabel = character.gender === 'male' ? 'Male' : character.gender === 'female' ? 'Female' : null;
    if (!raceMeta || !genderLabel) return null;
    return `${partyId}_${raceMeta.raceName}_${genderLabel}.png`;
  };
  const selectedRosterParty = rosterParties.find((party) => party.id === characterRosterPartyId) ?? rosterParties[0];
  const selectedRosterRace = RACES.find((race) => race.id === characterRosterRaceId);
  const selectedRosterEntry = characterRosterEntries?.find((race) => race.raceId === characterRosterRaceId) ?? null;
  const activeRosterCharacter = characterRosterGenderFilter === 'unique'
    ? (selectedRosterParty?.characters ?? []).find((character) => character.raceId === characterRosterRaceId && character.isUnique) ?? null
    : {
      raceId: characterRosterRaceId,
      gender: characterRosterGenderFilter,
      isUnique: false,
      name: '',
    } as SettingRosterCharacter;
  const selectedRosterImageFile = activeRosterCharacter
    ? ((): string | null => {
      const raceMeta = CHARACTER_ROSTER_RACES.find((race) => race.id === characterRosterRaceId);
      if (characterRosterGenderFilter === 'unique') {
        return getCharacterRosterImageFileName(activeRosterCharacter, selectedRosterParty?.id ?? 1);
      }
      if (!raceMeta) return null;
      const genderLabel = characterRosterGenderFilter === 'male' ? 'Male' : 'Female';
      const partySpecificFile = `${selectedRosterParty?.id ?? 1}_${raceMeta.raceName}_${genderLabel}.png`;
      const fallbackFile = `${raceMeta.raceName}_${genderLabel}.png`;
      if (availableRosterImageFiles.has(partySpecificFile)) return partySpecificFile;
      if (availableRosterImageFiles.has(fallbackFile)) return fallbackFile;
      return null;
    })()
    : null;
  const selectedRosterImageSrc = selectedRosterImageFile ? `${import.meta.env.BASE_URL}character/${selectedRosterImageFile}` : null;
  const hasRosterGenderImage = useCallback((partyId: number, raceId: RaceId, gender: 'male' | 'female'): boolean => {
    const raceMeta = CHARACTER_ROSTER_RACES.find((race) => race.id === raceId);
    if (!raceMeta) return false;
    const genderLabel = gender === 'male' ? 'Male' : 'Female';
    const partySpecificFile = `${partyId}_${raceMeta.raceName}_${genderLabel}.png`;
    const fallbackFile = `${raceMeta.raceName}_${genderLabel}.png`;
    return availableRosterImageFiles.has(partySpecificFile) || availableRosterImageFiles.has(fallbackFile);
  }, [CHARACTER_ROSTER_RACES, availableRosterImageFiles]);

  const rosterBonusStatusEntries = (selectedRosterRace?.bonuses ?? [])
    .filter((bonus) => bonus.type !== 'ability')
    .map((bonus, index) => buildInlineBonusEntry('roster-race-bonus', selectedRosterRace?.id ?? 'none', bonus, index))
    .filter((entry): entry is { key: string; label: string; description: string | null } => entry !== null);

  const hasRosterUniqueCharacter = useCallback((partyId: number, raceId: RaceId): boolean => {
    const party = rosterParties.find((entry) => entry.id === partyId);
    return (party?.characters ?? []).some((character) => character.raceId === raceId && character.isUnique);
  }, [rosterParties]);
  const visibleRosterRaceIds = useMemo(() => (
    CHARACTER_ROSTER_RACES
      .filter((race) => characterRosterEntries?.some((entry) => entry.raceId === race.id) && rosterParties.some((party) =>
        hasRosterGenderImage(party.id, race.id, 'male')
        || hasRosterGenderImage(party.id, race.id, 'female')
        || hasRosterUniqueCharacter(party.id, race.id),
      ))
      .map((race) => race.id)
  ), [CHARACTER_ROSTER_RACES, characterRosterEntries, rosterParties, hasRosterGenderImage, hasRosterUniqueCharacter]);
  const visibleRosterGenders = useMemo(() => {
    const partyId = selectedRosterParty?.id ?? 1;
    const genders: Array<'male' | 'female' | 'unique'> = [];
    if (hasRosterGenderImage(partyId, characterRosterRaceId, 'male')) genders.push('male');
    if (hasRosterGenderImage(partyId, characterRosterRaceId, 'female')) genders.push('female');
    if (hasRosterUniqueCharacter(partyId, characterRosterRaceId)) genders.push('unique');
    return genders;
  }, [characterRosterRaceId, hasRosterGenderImage, hasRosterUniqueCharacter, selectedRosterParty?.id]);
  useEffect(() => {
    if (visibleRosterRaceIds.length === 0) return;
    if (!visibleRosterRaceIds.includes(characterRosterRaceId)) {
      setCharacterRosterRaceId(visibleRosterRaceIds[0]);
    }
  }, [characterRosterRaceId, visibleRosterRaceIds]);
  useEffect(() => {
    if (visibleRosterGenders.length === 0) return;
    if (!visibleRosterGenders.includes(characterRosterGenderFilter)) {
      setCharacterRosterGenderFilter(visibleRosterGenders[0]);
    }
  }, [characterRosterGenderFilter, visibleRosterGenders]);
  const [activeRosterStatusBubble, setActiveRosterStatusBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);

  const handleRosterStatusBubbleToggle = (
    bubbleKey: string,
    bubbleText: string,
    targetElement: HTMLElement,
  ) => {
    if (activeRosterStatusBubble?.key === bubbleKey) {
      setActiveRosterStatusBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleMaxWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleMaxWidth,
    );

    setActiveRosterStatusBubble({
      key: bubbleKey,
      text: bubbleText,
      top: triggerRect.bottom + 8,
      left,
      maxWidth: bubbleMaxWidth,
    });
  };

  const projectedGlossaryEntryById = useMemo(
    () => new Map((glossaryEntries ?? []).map((entry) => [entry.glossaryId, entry])),
    [glossaryEntries],
  );
  const projectedGlossaryIds = useMemo(
    () => new Set(projectedGlossaryEntryById.keys()),
    [projectedGlossaryEntryById],
  );

  // SpecRef: 8.6 | UI_SETTING | Glossary (用語集)
  const filteredGlossarySections = GLOSSARY_SECTIONS.filter((section) => {
    // Section subtitles are localized display text, so use stable master-data IDs
    // for selection instead of language-specific subtitle prefixes.
    const glossarySectionIdsByTab: Record<GlossaryTabKey, string> = {
      能: '2-1-1',
      基: '2-1-2',
      固: '2-1-3',
      増: '2-1-4',
      機: '2-1-6',
      信: '2-1-7',
      魔: '2-1-8',
      地: '2-1-10',
      求: '2-1-9',
    };

    return section.id === glossarySectionIdsByTab[glossaryTab];
  }).map((section) => ({
    ...section,
    entries: section.entries
      .filter((entry) => debugSettings.displayAllGlossary || projectedGlossaryEntryById.has(entry.key))
      .map((entry) => {
        const projected = projectedGlossaryEntryById.get(entry.key);
        return projected ? { ...entry, label: projected.label, description: projected.description } : entry;
      }),
  }));


  type GlossaryTable = {
  headers: string[];
  rows: string[][];
  };

  const parseGlossaryTable = (lines: string[]): GlossaryTable | null => {
  if (lines.length < 2) return null;
  const headerLine = lines[0]?.trim();
  const dividerLine = lines[1]?.trim();
  if (!headerLine?.startsWith('|') || !headerLine.endsWith('|')) return null;
  if (!dividerLine?.startsWith('|') || !dividerLine.endsWith('|')) return null;

  const headers = headerLine.split('|').slice(1, -1).map((cell) => cell.trim());
  const dividerCells = dividerLine.split('|').slice(1, -1).map((cell) => cell.trim());
  if (headers.length === 0 || headers.length !== dividerCells.length) return null;
  if (!dividerCells.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;

  const rows = lines
    .slice(2)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
    .filter((cells) => cells.length === headers.length);

  if (rows.length === 0) return null;

  return { headers, rows };
  };
  const BESTIARY_TAB_LABELS: Record<number, string> = {
    1: t('setting.bestiary.tab.grassland'),
    2: t('setting.bestiary.tab.frost'),
    3: t('setting.bestiary.tab.sea'),
    4: t('setting.bestiary.tab.desert'),
    5: t('setting.bestiary.tab.flame'),
    6: t('setting.bestiary.tab.nest'),
    7: t('setting.bestiary.tab.moon'),
    8: t('setting.bestiary.tab.valley'),
    9: t('setting.bestiary.tab.gods'),
    99: t('setting.bestiary.tab.colosseum'),
  };

  const BESTIARY_SPECIAL_DUNGEON_ID_GODS = 9;
  const BESTIARY_SPECIAL_DUNGEON_ID_COLOSSEUM = 99;
  const isGodBestiaryTab = selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_GODS;
  const isColosseumBestiaryTab = selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_COLOSSEUM;

  // SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
  const bestiaryEntryById = new Map((bestiaryEntries ?? []).map((entry) => [entry.enemyId, entry]));
  const unlockedBestiaryDungeonIds = new Set(
    DUNGEONS
      .filter((dungeon) => dungeon.id !== 99)
      .filter((dungeon) => debugSettings.displayAllBestiary || dungeon.id === 1 || ENEMIES.some((enemy) => (
        enemy.poolId === dungeon.id && bestiaryEntryById.get(enemy.id)?.revealed === true
      )))
      .map((dungeon) => dungeon.id)
  );

  const normalizeBestiaryGodName = (rawName: string): string => {
    const withoutBattleSuffix = rawName.replace(/\s*\(神魔戦\)\s*$/u, '').trim();
    const withoutRoleSuffix = withoutBattleSuffix.replace(/\([^)]*\)/gu, '').trim();
    const [head] = withoutRoleSuffix.split(/\s+/u);
    return (head ?? withoutRoleSuffix).trim();
  };

  const getGodBestiaryDisplayEnemyId = (god: (typeof GOD_ENEMY_PROFILES)[number]): number => god.enemyId;

  const getGodBestiaryBattleStats = (god: (typeof GOD_ENEMY_PROFILES)[number]): { defeats: number; encounters: number } => {
    const entry = bestiaryEntryById.get(god.enemyId);
    return entry ? { defeats: entry.defeats, encounters: entry.encounters } : { defeats: 0, encounters: 0 };
  };

  // SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
  // Gods tab/rows are revealed only when god encounter count is at least 1 (遭遇数 > 0).
  const revealedGodBestiaryNames = new Set(
    GOD_ENEMY_PROFILES
      .filter((god) => {
        if (debugSettings.displayAllBestiary) return true;
        const runtimeEnemy = buildGodRuntimeEnemy(god);
        if (!runtimeEnemy) return false;
        const battleStats = getGodBestiaryBattleStats(god);
        return battleStats.encounters > 0;
      })
      .flatMap((god) => [god.name, normalizeBestiaryGodName(god.displayName)])
  );

  const bestiaryTabOptions = [
    ...DUNGEONS
      .filter((dungeon) => dungeon.id !== 99 && unlockedBestiaryDungeonIds.has(dungeon.id))
      .map((dungeon) => ({ id: dungeon.id, name: dungeon.name })),
    ...(revealedGodBestiaryNames.size > 0 ? [{ id: BESTIARY_SPECIAL_DUNGEON_ID_GODS, name: t('setting.bestiary.tab.gods') }] : []),
    ...(debugSettings.colosseumEnabled ? [{ id: BESTIARY_SPECIAL_DUNGEON_ID_COLOSSEUM, name: t('setting.bestiary.tab.colosseum') }] : []),
  ];


  useEffect(() => {
    if (selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_GODS && revealedGodBestiaryNames.size === 0) {
      const fallbackDungeonId = [...unlockedBestiaryDungeonIds].sort((a, b) => a - b)[0] ?? 1;
      onSetSelectedBestiaryDungeonId(fallbackDungeonId);
      return;
    }
    if (selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_GODS || selectedBestiaryDungeonId === BESTIARY_SPECIAL_DUNGEON_ID_COLOSSEUM) return;
    if (!unlockedBestiaryDungeonIds.has(selectedBestiaryDungeonId)) {
      const fallbackDungeonId = [...unlockedBestiaryDungeonIds].sort((a, b) => a - b)[0] ?? BESTIARY_SPECIAL_DUNGEON_ID_GODS;
      onSetSelectedBestiaryDungeonId(fallbackDungeonId);
    }
  }, [revealedGodBestiaryNames.size, unlockedBestiaryDungeonIds, selectedBestiaryDungeonId, onSetSelectedBestiaryDungeonId]);

  const selectedBestiaryDungeon = DUNGEONS.find(d => d.id === selectedBestiaryDungeonId && d.id !== 99) ?? DUNGEONS[0];

  const selectedBestiaryGroups = selectedBestiaryDungeon.floors
    ? selectedBestiaryDungeon.floors
      .slice()
      .sort((a, b) => b.floorNumber - a.floorNumber)
      .flatMap(floor => {
        const normalEnemyIds = floor.rooms
          ?.slice(0, 3)
          .flatMap((room) => room.enemyIds ?? [])
          .filter((enemyId, index, allIds) => allIds.indexOf(enemyId) === index) ?? [];

        const normalEnemies = normalEnemyIds
          .map((enemyId) => ENEMIES.find((enemy) => enemy.id === enemyId))
          .filter((enemy): enemy is EnemyDef => !!enemy && enemy.type === 'normal')
          .sort((a, b) => a.id - b.id);

        const groups: Array<{ key: string; label: string; enemies: EnemyDef[]; floorNumber: number; groupType: 'boss' | 'elite' | 'normal' }> = [];
        const room3EnemyIds = floor.rooms?.[2]?.enemyIds ?? [];
        const room3SpecialElites = room3EnemyIds
          .map((enemyId) => ENEMIES.find((enemy) => enemy.id === enemyId))
          .filter((enemy): enemy is EnemyDef => !!enemy && enemy.type === 'elite')
          .sort((a, b) => a.id - b.id);
        const floorEliteEnemyIds = floor.rooms?.[3]?.enemyIds ?? [];
        const fixedFloorElites = floorEliteEnemyIds
          .map((enemyId) => ENEMIES.find((enemy) => enemy.id === enemyId))
          .filter((enemy): enemy is EnemyDef => !!enemy && enemy.type === 'elite')
          .sort((a, b) => a.id - b.id);

        const floorConcept = getLocalizedExpeditionFloorConcept(selectedBestiaryDungeon.id, floor.floorNumber);
        const baseFloorLabel = floorConcept
          ? `Floor ${floor.floorNumber} ${floorConcept}`
          : `Floor ${floor.floorNumber}`;
        const specialFloorLabel = floorConcept
          ? `Floor ${floor.floorNumber}-3 ${floorConcept} (Special)`
          : `Floor ${floor.floorNumber}-3 (Special)`;
        const eliteFloorLabel = floorConcept
          ? `Floor ${floor.floorNumber}-4 ${floorConcept} Elite`
          : `Floor ${floor.floorNumber}-4 Elite`;

        if (floor.floorNumber === 6) {
          const bossEnemy = ENEMIES.find(enemy => enemy.id === selectedBestiaryDungeon.bossId);
          if (bossEnemy) {
            groups.push({
              key: 'boss',
              label: floorConcept ? `BOSS ${floorConcept}` : 'BOSS',
              enemies: [bossEnemy],
              floorNumber: floor.floorNumber,
              groupType: 'boss',
            });
          }

          if (room3SpecialElites.length > 0) {
            groups.push({
              key: `floor-${floor.floorNumber}-room-3-special`,
              label: specialFloorLabel,
              enemies: room3SpecialElites,
              floorNumber: floor.floorNumber,
              groupType: 'elite',
            });
          }

          groups.push({
            key: 'floor-6',
            label: baseFloorLabel,
            enemies: normalEnemies,
            floorNumber: floor.floorNumber,
            groupType: 'normal',
          });
          return groups;
        }

        if (fixedFloorElites.length > 0) {
          groups.push({
            key: `floor-${floor.floorNumber}-elite`,
            label: eliteFloorLabel,
            enemies: fixedFloorElites,
            floorNumber: floor.floorNumber,
            groupType: 'elite',
          });
        }

        if (room3SpecialElites.length > 0) {
          groups.push({
            key: `floor-${floor.floorNumber}-room-3-special`,
            label: specialFloorLabel,
            enemies: room3SpecialElites,
            floorNumber: floor.floorNumber,
            groupType: 'elite',
          });
        }

        groups.push({
          key: `floor-${floor.floorNumber}`,
          label: baseFloorLabel,
          enemies: normalEnemies,
          floorNumber: floor.floorNumber,
          groupType: 'normal',
        });

        return groups;
      })
    : [];

  const godBestiaryRows = GOD_ENEMY_PROFILES
    .filter((god) => revealedGodBestiaryNames.has(god.name) || revealedGodBestiaryNames.has(normalizeBestiaryGodName(god.displayName)))
    .slice()
    .sort((a, b) => (a.tier - b.tier) || a.name.localeCompare(b.name));

  const formatEnemyAttackLine = (label: string, attack: number, noA: number, amplifier: number) =>
    t('home.enemy.attackLine', { label, attack: formatNumber(attack), count: formatNumber(noA), amplifier: formatDecimal(amplifier, 2) });

  const hasEnemyAttack = (attack: number, noA: number) => attack > 0 && noA > 0;
  const hasEnemyMagicCasting = (enemy: EnemyDef) =>
    hasEnemyAttack(enemy.magicalAttack, enemy.magicalNoA)
    || (enemy.bonuses ?? []).some((bonus) => bonus.type === 'caster' || bonus.type === 'equip_magic');

  const formatEnemyDefenseLine = (label: string, defense: number, percent: number) =>
    t('home.enemy.defenseLine', { label, defense: formatNumber(defense), percent: formatDecimal(percent, 0) });

  const ENEMY_ELEMENT_ICONS: Record<string, UiIconKey> = {
    fire: 'fire',
    thunder: 'thunder',
    ice: 'ice',
  };

  const formatEnemyElementOffenseLine = (elementalOffense: string, elementalOffenseValue: number): ReactNode => {
    const elementIcon = ENEMY_ELEMENT_ICONS[elementalOffense];
    return (
      <>
        {t('home.enemy.element')}: {elementIcon ? renderUiIcon(elementIcon) : t('home.enemy.noElement')} (x{formatDecimal(elementalOffenseValue, 2)})
      </>
    );
  };

  const renderEnemyElementalResistanceLine = (enemy: EnemyDef): JSX.Element => {
    return renderElementalResistanceInline(enemy.elementalResistance);
  };

  const ENEMY_TYPE_LABELS: Record<string, string> = {
    Beast: t('setting.bestiary.enemyType.Beast'),
    Slime_Colony: t('setting.bestiary.enemyType.Slime_Colony'),
    Plant_Fungal: t('setting.bestiary.enemyType.Plant_Fungal'),
    Insect_Swarm: t('setting.bestiary.enemyType.Insect_Swarm'),
    Aerial: t('setting.bestiary.enemyType.Aerial'),
    Frost: t('setting.bestiary.enemyType.Frost'),
    Fruit: t('setting.bestiary.enemyType.Fruit'),
    Dragon: t('setting.bestiary.enemyType.Dragon'),
    Spirit: t('setting.bestiary.enemyType.Spirit'),
    Ghost: t('setting.bestiary.enemyType.Ghost'),
    Undead: t('setting.bestiary.enemyType.Undead'),
    Golem: t('setting.bestiary.enemyType.Golem'),
    Shadowfang: t('setting.bestiary.enemyType.Shadowfang'),
    Mech: t('setting.bestiary.enemyType.Mech'),
    Chiropteran: t('setting.bestiary.enemyType.Chiropteran'),
    Chimera: t('setting.bestiary.enemyType.Chimera'),
    Titan: t('setting.bestiary.enemyType.Titan'),
    Pony: t('setting.bestiary.enemyType.Pony'),
    Origami: t('setting.bestiary.enemyType.Origami'),
    Jinma: t('setting.bestiary.enemyType.Jinma'),
    Orcinian: t('setting.bestiary.enemyType.Orcinian'),
    Caninian: t('setting.bestiary.enemyType.Caninian'),
    Lupinian: t('setting.bestiary.enemyType.Lupinian'),
    Vulpinian: t('setting.bestiary.enemyType.Vulpinian'),
    Ursan: t('setting.bestiary.enemyType.Ursan'),
    Felidian: t('setting.bestiary.enemyType.Felidian'),
    Mustelid: t('setting.bestiary.enemyType.Mustelid'),
    Leporian: t('setting.bestiary.enemyType.Leporian'),
    Cervin: t('setting.bestiary.enemyType.Cervin'),
    Procyonian: t('setting.bestiary.enemyType.Procyonian'),
    Murid: t('setting.bestiary.enemyType.Murid'),
  };

  const ENEMY_CLASS_LABELS: Record<string, string> = {
    guardian: t('masterData.class.guardian.name'),
    duelist: t('masterData.class.duelist.name'),
    samurai: t('masterData.class.samurai.name'),
    'sword-saint': t('masterData.class.sword-saint.name'),
    ranger: t('masterData.class.ranger.name'),
    striker: t('masterData.class.striker.name'),
    ninja: t('masterData.class.ninja.name'),
    wizard: t('masterData.class.wizard.name'),
    sage: t('masterData.class.sage.name'),
    alchemist: t('masterData.class.alchemist.name'),
    pilgrim: t('masterData.class.pilgrim.name'),
    lord: t('masterData.class.lord.name'),
    fighter: t('masterData.class.fighter.name'),
    rogue: t('masterData.class.rogue.name'),
  };

  const getBestiaryEnemyBattleStats = (enemyId: number) => { const entry = bestiaryEntryById.get(enemyId); return entry ? { defeats: entry.defeats, encounters: entry.encounters } : { defeats: 0, encounters: 0 }; };

  const getBestiaryClassRows = (
    mainClassId: string,
    subClassId?: string | 'none',
  ): JSX.Element[] => {
    // SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
    const mainClassLabel = ENEMY_CLASS_LABELS[mainClassId] ?? mainClassId;
    const hasSubClass = !!subClassId && subClassId !== 'none';
    if (!hasSubClass) {
      return [<div key="main">{t('setting.bestiary.mainClass', { className: mainClassLabel })}</div>];
    }

    const subClassLabel = ENEMY_CLASS_LABELS[subClassId] ?? subClassId;
    if (mainClassId === subClassId) {
      return [<div key="main">{t('setting.bestiary.masterClass', { className: mainClassLabel })}</div>];
    }

    return [
      <div key="main">{t('setting.bestiary.mainClass', { className: mainClassLabel })}</div>,
      <div key="sub">{t('setting.bestiary.subClass', { className: subClassLabel })}</div>,
    ];
  };

  const ENEMY_EDIT_CLASS_OPTIONS = COLOSSEUM_ENEMY_CLASS_OPTIONS;

  const getDisplayEnemy = (
    enemy: EnemyDef,
    dungeon: Dungeon,
    floorNumber: number,
    groupType: 'boss' | 'elite' | 'normal'
  ): EnemyDef => {
    const roomType = groupType === 'boss' ? 'battle_Boss' : groupType === 'elite' ? 'battle_Elite' : 'battle_Normal';
    const effectiveTier = getEffectiveExpeditionTier(dungeon.id, false);
    const effectiveDungeon = {
      ...dungeon,
      tier: effectiveTier,
      enemyMultipliers: getEffectiveEnemyMultipliers(dungeon, false),
    };
    return getEncounterEnemyWithScaling(enemy, effectiveDungeon, floorNumber, roomType, {
      isLunaMode: false,
      gameMode: runtimeGameMode,
      enemyLevelOffset: orcaEnemyLevelOffset,
    });
  };

  const getGodRuntimeEnemy = (god: (typeof GOD_ENEMY_PROFILES)[number]): EnemyDef | null => {
    const enemy = buildGodRuntimeEnemy(
      god,
      runtimeGameMode === 'mode.orca' ? orcaEnemyLevelOffset : 0,
    );
    if (!enemy || runtimeGameMode !== 'mode.orca') return enemy;
    const withModeAbilities = addOrcaEnemyAbilities(enemy);
    return { ...withModeAbilities, abilities: resolveEnemyPassiveAbilities(withModeAbilities.abilities) };
  };

  const getGodDropCandidates = (godName: string): string => {
    const drops = GOD_MYTHIC_DROPS
      .filter((drop) => drop.dropBy === godName)
      .map((drop) => `${getRarityShortLabel(drop.tier * 1000 + 500)}${drop.name}`);
    return drops.length > 0 ? drops.join(' / ') : t('common.none');
  };

  const getAbilityHelpDescription = (abilityId: string, level: number): string => (
    formatBonusAbilityHelpDescription(abilityId as AbilityId, level)
  );

  const getAbilityHelpText = (abilityId: string, level: number, abilityLabel: string): { title: string; description: string } => ({
    title: abilityLabel,
    description: getAbilityHelpDescription(abilityId, level),
  });

  const getBonusAbilityGlossaryDisplayLabel = (abilityId: AbilityId): string => {
    const entry = BONUS_ABILITY_GLOSSARY_ENTRY_BY_ABILITY_ID.get(abilityId);
    if (!entry) return ABILITY_NAMES[abilityId] ?? abilityId;
    return entry.label;
  };

  const parseAbilityTokens = (abilities: Array<{ id: string; level: number }>) => {
    // SpecRef: 4.1.2 | Enemy | x.ability
    if (abilities.length === 0) {
      return [{ key: 'none', label: t('common.none'), abilityId: '', level: 0, isMissing: true }];
    }

    const highestAbilityLevelById = new Map<string, number>();
    abilities.forEach((ability) => {
      highestAbilityLevelById.set(ability.id, Math.max(highestAbilityLevelById.get(ability.id) ?? 0, ability.level));
    });

    return Array.from(highestAbilityLevelById.entries()).map(([abilityId, level], index) => ({
      key: `${abilityId}-${level}-${index}`,
      label: `${ABILITY_NAMES[abilityId] ?? abilityId}${level}`,
      abilityId,
      level,
      isMissing: false,
    }));
  };

  const handleAbilityHelpToggle = (
    abilityId: string,
    level: number,
    abilityLabel: string,
    event: MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation();
    const key = `${abilityId}:${level}`;
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const tooltipWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - tooltipWidth,
    );

    setActiveAbilityHelp((current) => {
      if (current?.key === key) {
        setAbilityHelpPosition(null);
        return null;
      }

      setAbilityHelpPosition({
        top: triggerRect.bottom + 8,
        left,
        width: tooltipWidth,
      });

      return { key, ...getAbilityHelpText(abilityId, level, abilityLabel) };
    });
  };

  return (
    <div
      className="setting-tab"
      onPointerDown={() => {
        if (activeAbilityHelp) {
          setActiveAbilityHelp(null);
          setAbilityHelpPosition(null);
        }
        if (activeRosterStatusBubble) {
          setActiveRosterStatusBubble(null);
        }
      }}
    >
      {activeAbilityHelp && abilityHelpPosition && (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-50 rounded-lg p-3"
            style={{
              top: abilityHelpPosition.top,
              left: abilityHelpPosition.left,
              width: abilityHelpPosition.width,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="text-xs text-gray-700">
              <span className="font-semibold text-gray-800">{activeAbilityHelp.title}</span>
              <span>：{activeAbilityHelp.description}</span>
            </div>
          </div>
        </FloatingBubblePortal>
      )}
      {/* SpecRef: 8.6 | UI_SETTING | Developer News Notification (通知) */}
      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10" onPointerDown={() => setActiveRosterStatusBubble(null)}>
        {renderSettingPanelHeader('news', 'News')}
        {settingPanelExpanded.news && (
          <div className="mt-3 space-y-3">
            <a
              href="https://toreniafournieri.github.io/Kemo-Expedition/orca/"
              target="_blank"
              rel="noopener noreferrer"
              className="discord-community-link block rounded border p-3 text-sm font-semibold underline underline-offset-2 pane-button-shadow"
            >
              {t('app.title')} orca
            </a>
            <a
              href={language === 'zh-CN'
                ? 'https://t.me/+exLhrX12vn5iMmI1'
                : 'https://discord.gg/k9VSf2ghM'}
              target="_blank"
              rel="noopener noreferrer"
              className="discord-community-link block rounded border p-3 text-sm font-semibold underline underline-offset-2 pane-button-shadow"
            >
              {t('setting.developerNews.discordCommunity')}
            </a>
            <div className="max-h-96 overflow-y-auto overscroll-contain rounded border border-gray-200 bg-white text-sm pane-button-shadow">
              {developerNewsEntries.map((item) => (
                <button
                  key={item.version}
                  type="button"
                  onClick={() => onMarkDeveloperNewsRead([item.version])}
                  className="block w-full space-y-1 border-b border-gray-100 p-3 text-left last:border-b-0"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-gray-500">
                    <span className="font-semibold text-gray-700">{item.version}</span>
                    <span>{item.date}</span>
                  </div>
                  <p className={`text-gray-700 ${unreadDeveloperNewsItems.some((unreadItem) => unreadItem.version === item.version) ? 'font-bold' : 'font-normal'}`}>
                    {item.content}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10" onPointerDown={() => setActiveRosterStatusBubble(null)}>
        {renderSettingPanelHeader('donation', t('setting.donation.title'))}
        {settingPanelExpanded.donation && <div className="bg-white rounded p-2 text-sm space-y-1 mt-3 pane-button-shadow">
          <div className="flex items-center justify-between gap-3 text-xs text-gray-500 border-b border-gray-100 pb-1 mb-1">
            <span>{t('setting.donation.deity')}</span>
            <span>{t('setting.donation.amount')}</span>
          </div>
          {donationRows.length > 0 ? (
            donationRows.map(({ deityName, donationGold, rank, nextRankDonationRequirement }) => (
              <div key={deityName} className="flex items-center justify-between gap-3">
                <span className="text-gray-700">{t('setting.donation.deityRank', { deity: getDeityDisplayName(deityName), rank })}</span>
                <span className="text-sub tabular-nums">{formatNumber(donationGold)}G <span className="text-xs text-gray-500">{t('setting.donation.nextRequirement', { amount: nextRankDonationRequirement !== null ? `${formatNumber(nextRankDonationRequirement)}G` : t('setting.donation.maxRank') })}</span></span>
              </div>
            ))
          ) : (
            <div className="text-gray-500">{t('setting.donation.noRecords')}</div>
          )}
        </div>}
      </div>

      {/* SpecRef: 8.6 | UI_SETTING | Clairvoyance (未来視) */}
      {/* Availability and reset access come from `resources/clairvoyance/{p}` (Spec 9.1.3 4-2-3; 8.6). */}
      {(clairvoyanceProjections ?? []).some((projection) => projection.available) && <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('clairvoyance', t('setting.clairvoyance.title'))}
        {settingPanelExpanded.clairvoyance && <div className="mt-3 space-y-3">
          {(clairvoyanceProjections ?? []).map((clairvoyance, partyIndex) => {
            if (!clairvoyance.available) {
              return null;
            }
            const canResetBags = clairvoyance.canReset;
            const isExpanded = clairvoyancePartyExpanded[partyIndex + 1] === true;
            return <div key={`clairvoyance-${partyIndex + 1}`} className="rounded border border-gray-200 bg-white p-2 pane-button-shadow">
              <button type="button" className="flex w-full items-center justify-between text-left font-semibold" onClick={() => toggleClairvoyanceParty(partyIndex + 1, !isExpanded)}>
                <span>PT{partyIndex + 1} {isExpanded ? '▲' : '▼'}</span>
              </button>
              {isExpanded && (!clairvoyance ? null : <div className="mt-2 space-y-3 text-sm">
                <div className="rounded border border-gray-300 bg-gray-100 p-2 space-y-1 pane-button-shadow-soft">
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">{t('setting.clairvoyance.common')}</div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.commonRewards')}: <span className="tabular-nums">{formatNumber(clairvoyance.reward.common.remaining)} / {formatNumber(clairvoyance.reward.common.total)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(clairvoyance.reward.common.hitsRemaining)}</span></div>
                  </div>
                  <div>{t('setting.clairvoyance.commonEnhancement')}: {formatNumber(clairvoyance.enhancement.common.remaining)} / {formatNumber(clairvoyance.enhancement.common.total)}</div>
                  <div className="pl-1 text-xs text-gray-500">
                    {clairvoyance.enhancement.common.tiers.map(({ tier, remaining, total }) => (
                      <div key={`common-enhancement-${partyIndex + 1}-${tier}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)_6.5rem] items-center gap-x-4 leading-5">
                        <span className="tabular-nums text-right text-gray-400">{tier}</span>
                        <span>{t('setting.enhancementRemaining', { title: getLocalizedEnhancementTitle(tier) })}</span>
                        <span className="tabular-nums text-right">{formatNumber(remaining)} / {formatNumber(total)}</span>
                      </div>
                    ))}
                  </div>
                  <div>{t('setting.clairvoyance.commonSuperRare')}: {formatNumber(clairvoyance.superRare.common.remaining)} / {formatNumber(clairvoyance.superRare.common.total)}</div>
                  <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.superRareRemaining')} {formatNumber(clairvoyance.superRare.common.hitsRemaining)} / {formatNumber(clairvoyance.superRare.common.hitsTotal)}</div>
                  {canResetBags && <button onClick={() => confirmReset(t('setting.clairvoyance.resetCommonRewards'), () => onClairvoyanceReset(partyIndex, { resetCommonRewards: true }))} className="w-full py-1 bg-sub text-white rounded text-xs">{t('setting.clairvoyance.resetCommonRewards')}</button>}
                </div>
                <div className="rounded border border-gray-300 bg-gray-100 p-2 space-y-1 pane-button-shadow-soft">
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">{t('setting.clairvoyance.otherRarities')}</div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.uncommonRewards')}: <span className="tabular-nums">{formatNumber(clairvoyance.reward.uncommon.remaining)} / {formatNumber(clairvoyance.reward.uncommon.total)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(clairvoyance.reward.uncommon.hitsRemaining)}</span></div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.eliteRareRewards')}: <span className="tabular-nums">{formatNumber(clairvoyance.reward.eliteRare.remaining)} / {formatNumber(clairvoyance.reward.eliteRare.total)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(clairvoyance.reward.eliteRare.hitsRemaining)}</span></div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.bossRareRewards')}: <span className="tabular-nums">{formatNumber(clairvoyance.reward.bossRare.remaining)} / {formatNumber(clairvoyance.reward.bossRare.total)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(clairvoyance.reward.bossRare.hitsRemaining)}</span></div>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <div>{t('setting.clairvoyance.mythicRareRewards')}: <span className="tabular-nums">{formatNumber(clairvoyance.reward.mythicRare.remaining)} / {formatNumber(clairvoyance.reward.mythicRare.total)}</span></div>
                    <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.hitsRemaining')} <span className="tabular-nums">{formatNumber(clairvoyance.reward.mythicRare.hitsRemaining)}</span></div>
                  </div>
                  <div>{t('setting.clairvoyance.enhancement')}: {formatNumber(clairvoyance.enhancement.general.remaining)} / {formatNumber(clairvoyance.enhancement.general.total)}</div>
                  <div className="pl-1 text-xs text-gray-500">
                    {clairvoyance.enhancement.general.tiers.map(({ tier, remaining, total }) => (
                      <div key={`enhancement-${partyIndex + 1}-${tier}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)_6.5rem] items-center gap-x-4 leading-5">
                        <span className="tabular-nums text-right text-gray-400">{tier}</span>
                        <span>{t('setting.enhancementRemaining', { title: getLocalizedEnhancementTitle(tier) })}</span>
                        <span className="tabular-nums text-right">{formatNumber(remaining)} / {formatNumber(total)}</span>
                      </div>
                    ))}
                  </div>
                  <div>{t('setting.clairvoyance.superRareEnhancement')}: {formatNumber(clairvoyance.superRare.rare.remaining)} / {formatNumber(clairvoyance.superRare.rare.total)}</div>
                  <div className="text-xs text-gray-500 text-right">{t('setting.clairvoyance.superRareRemaining')} {formatNumber(clairvoyance.superRare.rare.hitsRemaining)} / {formatNumber(clairvoyance.superRare.rare.hitsTotal)}</div>
                  {canResetBags && <button onClick={() => confirmReset(t('setting.clairvoyance.resetRewards'), () => onClairvoyanceReset(partyIndex, { resetRewards: true }))} className="w-full py-1 bg-sub text-white rounded text-xs">{t('setting.clairvoyance.resetRewards')}</button>}
                </div>
                <div className="rounded border border-gray-300 bg-gray-100 p-2 space-y-1 pane-button-shadow-soft">
                  <div className="text-xs font-semibold text-gray-700 tracking-wide">{t('setting.clairvoyance.sideQuest')}</div>
                  {/* SpecRef: 8.6 | UI_SETTING | サイドクエスト */}
                  <div>{t('setting.clairvoyance.sideQuestDraw')}: {formatNumber(clairvoyance.sideQuest.remaining)} / {formatNumber(clairvoyance.sideQuest.total)}</div>
                  <div className="text-xs text-gray-500 text-right">
                    {t('setting.clairvoyance.hitsRemaining')} {formatNumber(clairvoyance.sideQuest.hitsRemaining)}
                  </div>
                  {canResetBags && <button onClick={() => confirmReset(t('setting.clairvoyance.resetSideQuest'), () => onClairvoyanceReset(partyIndex, { resetSideQuest: true }))} className="w-full py-1 bg-sub text-white rounded text-xs">{t('setting.clairvoyance.resetSideQuest')}</button>}
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>{t('setting.clairvoyance.sleepinessDraw')}: {formatNumber(clairvoyance.sleepiness.remaining)} / {formatNumber(clairvoyance.sleepiness.total)}</div>
                  <div className="text-xs text-gray-500 text-right">
                    {t('setting.clairvoyance.sleepinessOutcomes', { awake: formatNumber(clairvoyance.sleepiness.awake.remaining), nap: formatNumber(clairvoyance.sleepiness.nap.remaining), deepSleep: formatNumber(clairvoyance.sleepiness.deepSleep.remaining) })}
                  </div>
                </div>
              </div>)}
            </div>;
          })}
        </div>}
      </div>}

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('glossary', t('setting.glossary.title'))}
        {settingPanelExpanded.glossary && (
          <>
          <div className="mt-3 mb-3 flex max-h-20 flex-wrap items-center justify-start gap-1 overflow-y-auto pr-1">
            {GLOSSARY_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setGlossaryTab(tab)}
                className={`shrink-0 text-xs px-2 py-0.5 border rounded shadow-sm shadow-slate-900/10 ${
                  glossaryTab === tab
                    ? 'bg-sub text-white border-sub'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {GLOSSARY_TAB_LABELS[tab]}
              </button>
            ))}
          </div>

          <div className="space-y-3 pr-1">
            {filteredGlossarySections.map((section) => (
              <div key={section.id} className="bg-white rounded p-2 border border-gray-200 shadow-sm shadow-slate-900/10">
                {(() => {
                  const isBonusAbilityGlossarySection = section.heading === '2.1.1 a. bonus ability';
                  const activeBonusAbilitySubcategory = BONUS_ABILITY_GLOSSARY_SUBCATEGORY_META.find(
                    (subcategory) => subcategory.id === bonusAbilityGlossarySubcategory,
                  );
                  return (
                    <>
                      <div className="text-xs leading-tight mb-2">
                        {(() => {
                          const suffixMatch = section.subtitle.match(/\(([^)]*)\)\s*$/);
                          const titleText = section.subtitle.replace(/\s*\([^)]*\)\s*$/, '');
                          return (
                            <>
                              <span className="font-semibold text-gray-700">{titleText}</span>
                              {suffixMatch && <span className="text-gray-500"> {suffixMatch[0]}</span>}
                            </>
                          );
                        })()}
                      </div>
                      {isBonusAbilityGlossarySection && (
                        <div className="mb-2 flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50 px-2 py-1.5">
                          <div className="flex flex-wrap items-center gap-1">
                            {BONUS_ABILITY_GLOSSARY_SUBCATEGORY_META.map((subcategory) => {
                              const isActive = subcategory.id === bonusAbilityGlossarySubcategory;
                              return (
                                <button
                                  key={subcategory.id}
                                  type="button"
                                  onClick={() => setBonusAbilityGlossarySubcategory(subcategory.id)}
                                  className={`rounded border px-2 py-0.5 text-[11px] ${
                                    isActive
                                      ? 'border-sub bg-sub text-white'
                                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
                                  }`}
                                  title={t(subcategory.labelKey)}
                                  aria-pressed={isActive}
                                >
                                  {t(subcategory.shortLabelKey)}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-[11px] text-gray-500">{activeBonusAbilitySubcategory?.labelKey ? t(activeBonusAbilitySubcategory.labelKey) : null}</div>
                        </div>
                      )}
                      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                        {isBonusAbilityGlossarySection
                          // SpecRef: 1.0.3 | Glossary Reveal Rule | ability visibility
                          ? LOCALIZED_BONUS_ABILITY_GLOSSARY_ENTRIES
                            .filter((entry) => entry.subcategory === bonusAbilityGlossarySubcategory)
                            .filter((entry) => debugSettings.displayAllGlossary || projectedGlossaryIds.has(entry.abilityId))
                            .map((entry, index) => {
                              const entryKey = `${section.id}-${entry.abilityId}-${index}`;
                              const displayLabel = getBonusAbilityGlossaryDisplayLabel(entry.abilityId);

                              return (
                                <div key={entryKey} className="text-xs border-t border-gray-100 pt-1 first:border-t-0 first:pt-0">
                                  <div className="leading-5">
                                    <span className="font-semibold text-gray-900">{displayLabel}</span>
                                    <span className="text-gray-900"> {entry.description}</span>
                                    {entry.levelScale.length > 0 && (
                                      <span className="text-gray-500"> ({entry.levelScale.map(formatBonusAbilityPhaseDisplay).join(', ')})</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          : section.entries.map((entry, index) => {
                            // SpecRef: 1.0.3 | Glossary Reveal Rule | terrain visibility
                            const isTerrainGlossarySection = section.heading === '1.1.10 t. terrain effects';
                            if (isTerrainGlossarySection && !debugSettings.displayAllGlossary && !projectedGlossaryIds.has(entry.key)) {
                              return null;
                            }
                            const isSideQuestGlossarySection = section.id === '2-1-9';
                            if (isSideQuestGlossarySection && entry.key === 'q.none') {
                              return null;
                            }
                            const entryKey = `${section.id}-${entry.key}-${index}`;
                            const isGodGlossarySection = section.id === '2-1-7';
                            const shouldCollapseEntry = glossaryTab === '増';
                            const useDefaultGlossaryTextColor = glossaryTab === '増';
                            const isEntryExpanded = !shouldCollapseEntry || expandedGlossaryEntries[entryKey] === true;
                            const descriptionLines = entry.description.split('\n');
                            const normalizedDescriptionLines = isSideQuestGlossarySection
                              ? descriptionLines
                                .map((line) => {
                                  const trimmedLine = line.trim();
                                  if (!trimmedLine.startsWith('表示:')) {
                                    return line;
                                  }
                                  return trimmedLine.replace(/^表示:\s*/, '');
                                })
                                .filter((line) => line.trim().length > 0)
                              : descriptionLines;
                            const hasStyleMetadata = normalizedDescriptionLines[0]?.trim().startsWith('style:') ?? false;
                            const visibleDescriptionLines = hasStyleMetadata ? normalizedDescriptionLines.slice(1) : normalizedDescriptionLines;
                            const mainDescription = visibleDescriptionLines[0] ?? '';
                            const loreLines = visibleDescriptionLines.slice(1);
                            const firstTableLineIndex = loreLines.findIndex((line) => line.trim().startsWith('|'));
                            const lorePrefixLines = firstTableLineIndex >= 0 ? loreLines.slice(0, firstTableLineIndex) : loreLines;
                            const tableCandidateLines = firstTableLineIndex >= 0 ? loreLines.slice(firstTableLineIndex) : [];
                            const glossaryTable = parseGlossaryTable(tableCandidateLines);

                            return (
                              <div key={entryKey} className="text-xs border-t border-gray-100 pt-1 first:border-t-0 first:pt-0">
                                {shouldCollapseEntry ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedGlossaryEntries((prev) => ({ ...prev, [entryKey]: !isEntryExpanded }))}
                                    className="w-full flex items-center justify-between gap-2 text-left"
                                    aria-label={t(isEntryExpanded ? 'setting.glossary.collapseEntry' : 'setting.glossary.expandEntry', { label: entry.label })}
                                  >
                                    <div className="text-gray-700 font-medium">{renderTextWithRaceIcons(entry.label)}</div>
                                    <span className="text-[11px] text-gray-500 hover:text-gray-700">{isEntryExpanded ? '▼' : '▲'}</span>
                                  </button>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="text-gray-700 font-medium">{renderTextWithRaceIcons(entry.label)}</div>
                                  </div>
                                )}
                                {isEntryExpanded && (
                                  <>
                                    <div className={`${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-gray-500'} whitespace-pre-line`}>{renderTextWithRaceIcons(mainDescription)}</div>
                                    {isGodGlossarySection && loreLines.map((line, lineIndex) => (
                                      <div key={`${section.id}-${entry.key}-${index}-lore-${lineIndex}`} className={`${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-gray-500'} italic whitespace-pre-line`}>
                                        {renderTextWithRaceIcons(line)}
                                      </div>
                                    ))}
                                    {!isGodGlossarySection && lorePrefixLines.length > 0 && (
                                      <div className={`${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-gray-500'} whitespace-pre-line`}>{renderTextWithRaceIcons(lorePrefixLines.join('\n'))}</div>
                                    )}
                                    {!isGodGlossarySection && glossaryTable && (
                                      <div className="mt-1 rounded border border-gray-200 bg-white px-2 py-1">
                                        <table className="w-full table-fixed text-xs">
                                          <thead>
                                            <tr className={`border-b border-gray-100 ${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-gray-500'}`}>
                                              {glossaryTable.headers.map((header, headerIndex) => (
                                                <th
                                                  key={`${section.id}-${entry.key}-table-header-${headerIndex}`}
                                                  className={`py-1 font-medium ${
                                                    headerIndex === glossaryTable.headers.length - 1 ? 'text-right' : 'text-left'
                                                  }`}
                                                >
                                                  {renderTextWithRaceIcons(header)}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {glossaryTable.rows.map((row, rowIndex) => (
                                              <tr key={`${section.id}-${entry.key}-table-row-${rowIndex}`} className="text-gray-700">
                                                {row.map((cell, cellIndex) => (
                                                  <td
                                                    key={`${section.id}-${entry.key}-table-row-${rowIndex}-cell-${cellIndex}`}
                                                    className={`py-1 align-top ${
                                                      cellIndex === row.length - 1
                                                        ? `text-right tabular-nums ${useDefaultGlossaryTextColor ? 'text-gray-700' : 'text-sub'}`
                                                        : 'text-left'
                                                    }`}
                                                  >
                                                    {renderTextWithRaceIcons(cell)}
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('itemCompendium', t('setting.itemCompendium.title'))}
        {settingPanelExpanded.itemCompendium && <>
        <div className="flex justify-end items-center gap-1 mt-3 mb-3">
          <span className="text-xs text-gray-500">
            {compendiumRarityFilter === 'all' ? t('party.rarity.showAll') : t('party.rarity.only', { rarity: getRarityFilterNote(compendiumRarityFilter) })}
          </span>
          {RARITY_FILTER_OPTIONS.map(filter => (
            <button
              key={filter}
              onClick={() => setCompendiumRarityFilter(filter)}
              className={`text-xs px-1.5 py-0.5 border rounded shadow-sm shadow-slate-900/10 ${
                compendiumRarityFilter === filter
                  ? 'bg-sub text-white border-sub'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
              }`}
              title={getRarityFilterNote(filter)}
            >
              {RARITY_FILTER_LABELS[filter]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {CATEGORY_GROUPS.map(group => (
            <div key={group.id} className="flex flex-col">
              <div className="text-xs text-gray-400 text-center mb-0.5">{t(group.labelKey)}</div>
              <div className="flex">
                {group.categories.map((cat, i) => (
                  <button
                    key={cat}
                    onClick={() => setCompendiumCategory(cat)}
                    className={`px-2 py-1 text-sm pane-button-shadow ${
                      i === 0 ? 'rounded-l' : i === group.categories.length - 1 ? 'rounded-r' : ''
                    } ${
                      compendiumCategory === cat
                        ? 'bg-sub text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {t(`party.categoryShort.${cat}`)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {compendiumItems.map(item => {
            const baseItem: Item = { ...item, enhancement: 0, superRare: 0 };
            const expanded = !!expandedCompendiumItems[item.id];
            return (
              <div key={item.id} className="bg-white rounded border border-gray-200 shadow-sm shadow-slate-900/10">
                <button
                  onClick={() => setExpandedCompendiumItems(prev => ({ ...prev, [item.id]: !expanded }))}
                  className="w-full text-left px-3 py-2 text-sm flex justify-between items-center"
                >
                  <span>
                    <span className="text-black">{getLocalizedItemName(item)}</span>
                    <span className="text-gray-500"> {getRarityShortLabel(item.id, item.name)} {renderTextWithRaceIcons(getItemStats(baseItem))}</span>
                  </span>
                  <span className="text-xs text-gray-500">{expanded ? '▲' : '▼'}</span>
                </button>
                {expanded && (
                  <div className="px-3 pb-2 text-xs text-gray-700 space-y-1 border-t border-gray-100 pt-2">
                    <div>ID: {formatNumber(item.id)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('characterRoster', t('setting.characterRoster.title'))}
        {settingPanelExpanded.characterRoster && <>
          {activeRosterStatusBubble ? (
            <div
              className="floating-bubble-pane fixed z-20 rounded-lg p-2"
              style={{
                top: activeRosterStatusBubble.top,
                left: activeRosterStatusBubble.left,
                width: 'max-content',
                maxWidth: activeRosterStatusBubble.maxWidth,
              }}
            >
              <div className="text-xs text-gray-700 leading-snug break-words">
                {activeRosterStatusBubble.text}
              </div>
            </div>
          ) : null}
          {/* SpecRef: 8.6 | UI_SETTING | Character Roster (味方キャラクター図鑑) */}
          <div className="mt-3 mb-2 overflow-x-auto pb-1">
            <div className="flex w-max min-w-full flex-nowrap gap-2">
              {CHARACTER_ROSTER_RACES.filter((race) => visibleRosterRaceIds.includes(race.id)).map((race) => (
                <button
                  key={race.id}
                  onClick={() => setCharacterRosterRaceId(race.id)}
                  className={`shrink-0 min-w-0 px-2 py-1 text-xs rounded pane-button-shadow ${characterRosterRaceId === race.id ? 'bg-sub text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                  title={race.raceName}
                >
                  <RaceIcon race={RACES.find((r) => r.id === race.id) ?? RACES[0]} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
            {rosterParties.map((party) => (
              <button key={party.id} onClick={() => setCharacterRosterPartyId(party.id)} className={`px-2 py-1 text-xs rounded pane-button-shadow ${characterRosterPartyId === party.id ? 'bg-sub text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                PT{formatNumber(party.id)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mb-3">
            {visibleRosterGenders.includes('male') && (
              <button onClick={() => setCharacterRosterGenderFilter('male')} className={`px-2 py-1 text-xs rounded ${characterRosterGenderFilter === 'male' ? 'bg-sub text-white' : 'bg-gray-200 text-gray-700'}`}>{t('common.gender.male')}</button>
            )}
            {visibleRosterGenders.includes('female') && (
              <button onClick={() => setCharacterRosterGenderFilter('female')} className={`px-2 py-1 text-xs rounded ${characterRosterGenderFilter === 'female' ? 'bg-sub text-white' : 'bg-gray-200 text-gray-700'}`}>{t('common.gender.female')}</button>
            )}
            {visibleRosterGenders.includes('unique') && (
              <button onClick={() => setCharacterRosterGenderFilter('unique')} className={`px-2 py-1 text-xs rounded ${characterRosterGenderFilter === 'unique' ? 'bg-sub text-white' : 'bg-gray-200 text-gray-700'}`}>U</button>
            )}
          </div>
          {activeRosterCharacter && (
            <div
              className="relative overflow-visible rounded border border-gray-200 bg-white p-2 flex flex-col"
              style={{ minHeight: '500px' }}
            >
              {selectedRosterImageSrc ? (
                <img
                  src={selectedRosterImageSrc}
                  alt={activeRosterCharacter.name}
                  className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[130%] max-w-[507px] h-auto"
                />
              ) : null}
              <div className="relative z-10 rounded bg-white/25 px-2 py-1 inline-block text-xs text-gray-700">{t('setting.characterRoster.race', { race: selectedRosterRace?.name ?? activeRosterCharacter.raceId })}</div>
              <div className="relative z-10 mt-auto border-t border-gray-100 pt-2 text-xs text-gray-700 bg-white/25 rounded px-2 py-1 space-y-1">
                <div className="font-semibold">{t('setting.characterRoster.raceStats')}</div>
                <button type="button" className="w-full text-left" title={t('setting.characterRoster.raceBaseStatsHelp')} onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleRosterStatusBubbleToggle('roster-base-status', t('setting.characterRoster.baseStats', { vitality: selectedRosterEntry ? formatNumber(selectedRosterEntry.status.vitality) : '-', strength: selectedRosterEntry ? formatNumber(selectedRosterEntry.status.strength) : '-', intelligence: selectedRosterEntry ? formatNumber(selectedRosterEntry.status.intelligence) : '-', mind: selectedRosterEntry ? formatNumber(selectedRosterEntry.status.mind) : '-' }), event.currentTarget); }}>
                  <span className="grid grid-cols-4 gap-1">
                    <span className="base-stat-chip">{t('stat.vitality')}:{selectedRosterEntry ? formatNumber(selectedRosterEntry.status.vitality) : '-'}</span>
                    <span className="base-stat-chip">{t('stat.strength')}:{selectedRosterEntry ? formatNumber(selectedRosterEntry.status.strength) : '-'}</span>
                    <span className="base-stat-chip">{t('stat.intelligence')}:{selectedRosterEntry ? formatNumber(selectedRosterEntry.status.intelligence) : '-'}</span>
                    <span className="base-stat-chip">{t('stat.mind')}:{selectedRosterEntry ? formatNumber(selectedRosterEntry.status.mind) : '-'}</span>
                  </span>
                </button>
                <div className="text-xs text-gray-900 mt-1 leading-5">
                  <span className="break-words leading-5 font-medium">{t('party.status.bonus')}: </span>
                  {rosterBonusStatusEntries.length > 0 ? (
                    rosterBonusStatusEntries.map((entry, index) => (
                      <span key={entry.key}>
                        {index > 0 && <span>, </span>}
                        <button
                          type="button"
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleRosterStatusBubbleToggle(entry.key, `${entry.label} ${entry.description ?? t('home.bonus.descriptionMissing')}`, event.currentTarget); }}
                          className="text-left hover:underline"
                          title={t('setting.characterRoster.tapForDetails')}
                        >
                          {entry.label}
                        </button>
                      </span>
                    ))
                  ) : (
                    <span>-</span>
                  )}
                </div>
                <button
                  type="button"
                  className="w-full text-left"
                  title={t('setting.characterRoster.defaultAbilityHelp')}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRosterStatusBubbleToggle(
                      'roster-default-ability',
                      selectedRosterRace?.defaultAbility ? `${selectedRosterRace.defaultAbility.name} ${getAbilityDescription(selectedRosterRace.defaultAbility.id.replace(/^a\./, '').replace(/-/g, '_') as AbilityId, 1)}` : t('setting.characterRoster.defaultAbility', { ability: '-' }),
                      event.currentTarget,
                    );
                  }}
                >
                  {t('setting.characterRoster.defaultAbility', { ability: selectedRosterRace?.defaultAbility?.name ?? '-' })}
                </button>
                <button
                  type="button"
                  className="w-full text-left"
                  title={t('setting.characterRoster.unlockAbilityHelp')}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRosterStatusBubbleToggle(
                      'roster-unlock-ability',
                      selectedRosterRace?.unlockAbility ? `${selectedRosterRace.unlockAbility.name} ${getAbilityDescription(selectedRosterRace.unlockAbility.id.replace(/^a\./, '').replace(/-/g, '_') as AbilityId, 1)}` : t('setting.characterRoster.unlockAbility', { ability: '-' }),
                      event.currentTarget,
                    );
                  }}
                >
                  {t('setting.characterRoster.unlockAbility', { ability: selectedRosterRace?.unlockAbility?.name ?? '-' })}
                </button>
              </div>
            </div>
          )}
          {!activeRosterCharacter && <div className="text-xs text-gray-500">{t('setting.characterRoster.noMatches')}</div>}
          {activeRosterCharacter && !selectedRosterImageSrc && <div className="mt-2 text-xs text-gray-500">{t('setting.characterRoster.noImage')}</div>}
        </>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('bestiary', t('setting.bestiary.title'))}
        {settingPanelExpanded.bestiary && <>
        <div className="flex gap-1 mt-3 mb-3 overflow-x-auto pb-1">
          {bestiaryTabOptions.map(dungeon => (
            <button
              key={dungeon.id}
              onClick={() => onSetSelectedBestiaryDungeonId(dungeon.id)}
              className={`px-2 py-1 text-sm rounded pane-button-shadow ${
                selectedBestiaryDungeonId === dungeon.id
                  ? 'bg-sub text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={dungeon.name}
            >
              {BESTIARY_TAB_LABELS[dungeon.id] ?? dungeon.id}
            </button>
          ))}
        </div>
        <div
          ref={bestiaryListRef}
          className="space-y-2 max-h-96 overflow-y-auto pr-1"
          onScroll={() => {
            const currentScrollTop = bestiaryListRef.current?.scrollTop ?? 0;
            onSetBestiaryScrollTop(currentScrollTop);
          }}
        >
          <div className="text-xs text-gray-500">{isGodBestiaryTab ? t('setting.bestiary.godsTab') : selectedBestiaryDungeon.name}</div>
          {isGodBestiaryTab && godBestiaryRows.map((god, index) => {
            const godBestiaryId = 900000 + index;
            const godExpanded = !!expandedBestiaryEnemies[godBestiaryId];
            const godRuntimeEnemy = getGodRuntimeEnemy(god);
            const godClassShortName = CLASS_SHORT_NAMES[god.enemyClass];
            const godImageSrc = resolvePublicAssetPath(godRuntimeEnemy?.image_path ?? god.image_path);
            return (
              <div key={god.name} className="mt-2 border border-gray-100 rounded bg-white shadow-sm shadow-slate-900/10">
                <button
                  onClick={() => onSetExpandedBestiaryEnemies(prev => ({ ...prev, [godBestiaryId]: !godExpanded }))}
                  className="w-full text-left px-2 py-1 text-sm flex justify-between items-center"
                >
                  <span>{renderEnemyNameWithMutedClass(godClassShortName ? `${god.displayName}(${godClassShortName})` : god.displayName)}</span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    {!godExpanded && renderCollapsedBestiaryEnemyImage(getGodBestiaryDisplayEnemyId(god))}
                    <span>{godExpanded ? '▲' : '▼'}</span>
                  </span>
                </button>
                {godExpanded && (
                  <div className="relative overflow-hidden px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                    {godImageSrc && (
                      <>
                        {/* SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑) */}
                        <img
                          src={godImageSrc}
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none select-none absolute left-[80%] top-0 z-0 h-auto -translate-x-1/2 object-contain object-top opacity-50"
                          style={{
                            width: 'clamp(120%, calc(270% - 0.3 * 100vw), 150%)',
                            maxWidth: 'none',
                          }}
                        />
                        <div className="bestiary-image-mask pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
                      </>
                    )}
                    <div className="relative z-10 space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>ID: {getGodBestiaryDisplayEnemyId(god)}</div>
                      <div></div>
                      <div>HP: {formatNumber(godRuntimeEnemy?.hp ?? 0)}</div>
                      <div>{t('setting.bestiary.level', { value: formatNumber(god.level) })}</div>
                      <div>{t('setting.bestiary.class', { value: ENEMY_CLASS_LABELS[god.enemyClass] ?? god.enemyClass })}</div>
                      <div>{t('setting.bestiary.type', { value: ENEMY_TYPE_LABELS[godRuntimeEnemy?.enemyType ?? ''] ?? (godRuntimeEnemy?.enemyType ?? t('common.unknown')) })}</div>
                    </div>
                    {godRuntimeEnemy && (
                      <>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {(() => {
                            const hasRangedAttack = hasEnemyAttack(godRuntimeEnemy.rangedAttack, godRuntimeEnemy.rangedNoA);
                            const hasMeleeAttack = hasEnemyAttack(godRuntimeEnemy.meleeAttack, godRuntimeEnemy.meleeNoA);
                            const hasMagicalAttack = hasEnemyAttack(godRuntimeEnemy.magicalAttack, godRuntimeEnemy.magicalNoA);
                            const hasMagicCasting = hasEnemyMagicCasting(godRuntimeEnemy);
                            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
                            const decay = `${formatDecimal((0.90 + godRuntimeEnemy.accuracyBonus) * 100, 1)}%`;
                            const physicalDefenseAmplifierPercent = godRuntimeEnemy.physicalDefenseAmplifier * 100;
                            const magicalDefenseAmplifierPercent = godRuntimeEnemy.magicalDefenseAmplifier * 100;

                            const offenseRows: string[] = [];
                            if (hasRangedAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.rangedAttack'), godRuntimeEnemy.rangedAttack, godRuntimeEnemy.rangedNoA, godRuntimeEnemy.rangedAttackAmplifier));
                            }
                            if (hasMeleeAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.meleeAttack'), godRuntimeEnemy.meleeAttack, godRuntimeEnemy.meleeNoA, godRuntimeEnemy.meleeAttackAmplifier));
                            }
                            if (hasPhysicalAttack) {
                              offenseRows.push(t('setting.bestiary.accuracy', { type: t('setting.bestiary.physical'), decay }));
                            }
                            if (hasMagicalAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.magicAttack'), godRuntimeEnemy.magicalAttack, godRuntimeEnemy.magicalNoA, getEnemyDisplayedMagicalAttackAmplifier(godRuntimeEnemy)));
                              offenseRows.push(t('setting.bestiary.accuracy', { type: t('setting.bestiary.magic'), decay }));
                            }
                            if (hasMagicCasting) {
                              offenseRows.push(t('setting.bestiary.castMagic', { spell: getEnemyBestiarySpellName(godRuntimeEnemy) }));
                            }

                            const defenseRows: ReactNode[] = [
                              formatEnemyElementOffenseLine(godRuntimeEnemy.elementalOffense, godRuntimeEnemy.elementalOffenseValue),
                              formatEnemyDefenseLine(t('setting.bestiary.physicalDefense'), godRuntimeEnemy.physicalDefense, physicalDefenseAmplifierPercent),
                              formatEnemyDefenseLine(t('setting.bestiary.magicalDefense'), godRuntimeEnemy.magicalDefense, magicalDefenseAmplifierPercent),
                              t('setting.bestiary.evasion', { value: formatNumber(Math.round(godRuntimeEnemy.evasionBonus * 1000)) }),
                            ];

                            const rowCount = Math.max(offenseRows.length, defenseRows.length);
                            return Array.from({ length: rowCount }).flatMap((_, index) => [
                              <div key={`god-off-${index}`}>{offenseRows[index] ?? ''}</div>,
                              <div key={`god-def-${index}`}>{defenseRows[index] ?? ''}</div>,
                            ]);
                          })()}
                        </div>
                        <div>{renderEnemyElementalResistanceLine(godRuntimeEnemy)}</div>
                        {(() => {
                          const bonusText = getEnemyTypeCBonusText(godRuntimeEnemy);
                          return bonusText ? <div>{t('party.status.bonus')}: {bonusText}</div> : null;
                        })()}
                      </>
                    )}
                    <div className="flex items-start gap-1">
                      <div>{t('setting.bestiary.abilities')}</div>
                      <div className="flex flex-wrap items-center gap-1">
                        {parseAbilityTokens(godRuntimeEnemy?.abilities ?? god.abilities).map((token, tokenIndex) => (
                          <Fragment key={token.key}>
                            {tokenIndex > 0 && <span className="text-gray-400">,</span>}
                            {token.isMissing ? (
                              <span>{token.label}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => handleAbilityHelpToggle(token.abilityId, token.level, token.label, event)}
                                className="rounded px-1 text-left hover:bg-selection/[0.12] focus:outline-none focus:ring-1 focus:ring-focus"
                                aria-label={t('setting.bestiary.showAbilityDescription', { ability: token.label })}
                              >
                                {token.label}
                              </button>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <div>{t('setting.bestiary.waitingExpedition', { value: god.expedition })}</div>
                    <div className="pt-1">{t('setting.bestiary.dropCandidates', { value: getGodDropCandidates(god.name) })}</div>
                    {(() => {
                      const battleStats = getGodBestiaryBattleStats(god);
                      return <div>{t('setting.bestiary.battleStats', { defeats: formatNumber(battleStats.defeats), encounters: formatNumber(battleStats.encounters) })}</div>;
                    })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {isColosseumBestiaryTab && (() => {
            // Colosseum enemies are already fully computed from the editor settings.
            // Reapplying expedition encounter scaling here would double-count ability effects like colossal.
            const colosseumEnemy = buildColosseumEnemy(colosseumEnemySettings);
            const enemyExpanded = !!expandedBestiaryEnemies[colosseumEnemy.id];
            const physicalDefenseAmplifierPercent = colosseumEnemy.physicalDefenseAmplifier * 100;
            const magicalDefenseAmplifierPercent = colosseumEnemy.magicalDefenseAmplifier * 100;
            const hasRangedAttack = hasEnemyAttack(colosseumEnemy.rangedAttack, colosseumEnemy.rangedNoA);
            const hasMeleeAttack = hasEnemyAttack(colosseumEnemy.meleeAttack, colosseumEnemy.meleeNoA);
            const hasMagicalAttack = hasEnemyAttack(colosseumEnemy.magicalAttack, colosseumEnemy.magicalNoA);
            const hasMagicCasting = hasEnemyMagicCasting(colosseumEnemy);
            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
            const decay = `${formatDecimal((0.90 + colosseumEnemy.accuracyBonus) * 100, 1)}%`;
            return (
              <div className="bg-white rounded border border-gray-200 p-2 shadow-sm shadow-slate-900/10">
                <div className="text-xs text-gray-500 font-medium mb-1">Colosseum Opponent</div>
                <div className="mt-2 border border-gray-100 rounded">
                  <button onClick={() => onSetExpandedBestiaryEnemies(prev => ({ ...prev, [colosseumEnemy.id]: !enemyExpanded }))} className="w-full text-left px-2 py-1 text-sm flex justify-between items-center">
                    <span>{renderEnemyNameWithMutedClass(formatEnemyDefName(colosseumEnemy))}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      {!enemyExpanded && renderCollapsedBestiaryEnemyImage(colosseumEnemy.id)}
                      <span>{enemyExpanded ? '▲' : '▼'}</span>
                    </span>
                  </button>
                  {enemyExpanded && <div className="px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {(() => {
                        const classRows = getBestiaryClassRows(colosseumEnemy.enemyClass, colosseumEnemy.enemySubClass);
                        return (
                          <>
                            <div>ID: {formatNumber(colosseumEnemy.id)}</div><div>{t('setting.bestiary.level', { value: formatNumber(colosseumEnemySettings.level) })}</div>
                            <div>HP: {formatNumber(colosseumEnemy.hp)}</div><div>{t('setting.bestiary.type', { value: ENEMY_TYPE_LABELS[colosseumEnemy.enemyType] ?? colosseumEnemy.enemyType })}</div>
                            {classRows.map((row) => row)}
                            {classRows.length === 1 && <div></div>}
                            <div>{t('setting.bestiary.terrain', { value: TERRAIN_EFFECT_LABELS[colosseumEnemySettings.terrainEffect] ?? colosseumEnemySettings.terrainEffect })}</div><div></div>
                          </>
                        );
                      })()}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      <div>{hasRangedAttack ? formatEnemyAttackLine(t('setting.bestiary.rangedAttack'), colosseumEnemy.rangedAttack, colosseumEnemy.rangedNoA, colosseumEnemy.rangedAttackAmplifier) : ''}</div><div>{formatEnemyElementOffenseLine(colosseumEnemy.elementalOffense, colosseumEnemy.elementalOffenseValue)}</div>
                      <div>{hasMeleeAttack ? formatEnemyAttackLine(t('setting.bestiary.meleeAttack'), colosseumEnemy.meleeAttack, colosseumEnemy.meleeNoA, colosseumEnemy.meleeAttackAmplifier) : ''}</div><div>{formatEnemyDefenseLine(t('setting.bestiary.physicalDefense'), colosseumEnemy.physicalDefense, physicalDefenseAmplifierPercent)}</div>
                      <div>{hasPhysicalAttack ? t('setting.bestiary.accuracy', { type: t('setting.bestiary.physical'), decay }) : ''}</div><div>{formatEnemyDefenseLine(t('setting.bestiary.magicalDefense'), colosseumEnemy.magicalDefense, magicalDefenseAmplifierPercent)}</div>
                      <div>{hasMagicalAttack ? formatEnemyAttackLine(t('setting.bestiary.magicAttack'), colosseumEnemy.magicalAttack, colosseumEnemy.magicalNoA, getEnemyDisplayedMagicalAttackAmplifier(colosseumEnemy)) : ''}</div><div>{t('setting.bestiary.evasion', { value: formatNumber(Math.round(colosseumEnemy.evasionBonus * 1000)) })}</div>
                      <div>{hasMagicalAttack ? t('setting.bestiary.accuracy', { type: t('setting.bestiary.magic'), decay }) : ''}</div><div>{renderEnemyElementalResistanceLine(colosseumEnemy)}</div>
                      <div>{hasMagicCasting ? t('setting.bestiary.castMagic', { spell: getEnemyBestiarySpellName(colosseumEnemy) }) : ''}</div><div></div>
                    </div>
                    {(() => {
                      const bonusText = getEnemyTypeCBonusText(colosseumEnemy);
                      return bonusText ? <div>{t('party.status.bonus')}: {bonusText}</div> : null;
                    })()}
                    <div className="flex items-start gap-1">
                      <div>{t('setting.bestiary.abilities')}</div>
                      <div className="flex flex-wrap items-center gap-1">
                        {parseAbilityTokens(colosseumEnemy.abilities).map((token, tokenIndex) => (
                          <Fragment key={token.key}>
                            {tokenIndex > 0 && <span className="text-gray-400">,</span>}
                            {token.isMissing ? (
                              <span>{token.label}</span>
                            ) : (
                              <button
                                type="button"
                                onClick={(event) => handleAbilityHelpToggle(token.abilityId, token.level, token.label, event)}
                                className="rounded px-1 text-left hover:bg-selection/[0.12] focus:outline-none focus:ring-1 focus:ring-focus"
                                aria-label={t('setting.bestiary.showAbilityDescription', { ability: token.label })}
                              >
                                {token.label}
                              </button>
                            )}
                          </Fragment>
                        ))}
                      </div>
                    </div>
                    <div>{t('setting.bestiary.dropCandidates', { value: t('common.none') })}</div>
                  </div>}
                </div>
              </div>
            );
          })()}
          {!isGodBestiaryTab && !isColosseumBestiaryTab && selectedBestiaryGroups.map(group => (
            <div key={group.key} className="bg-white rounded border border-gray-200 p-2 shadow-sm shadow-slate-900/10">
              <div className="text-xs text-gray-500 font-medium mb-1">{group.label}</div>
              {group.enemies.map(enemy => {
                const displayEnemy = getDisplayEnemy(enemy, selectedBestiaryDungeon, group.floorNumber, group.groupType);
                const roomType = group.groupType === 'boss'
                  ? 'battle_Boss'
                  : group.groupType === 'elite'
                    ? 'battle_Elite'
                    : 'battle_Normal';
                const enemyLevelFinal = getEffectiveEnemyLevel(selectedBestiaryDungeon.expLevel, group.floorNumber, roomType, false);
                const classRows = getBestiaryClassRows(displayEnemy.enemyClass, displayEnemy.enemySubClass);
                const enemyExpanded = !!expandedBestiaryEnemies[displayEnemy.id];
                const physicalDefenseAmplifierPercent = displayEnemy.physicalDefenseAmplifier * 100;
                const magicalDefenseAmplifierPercent = displayEnemy.magicalDefenseAmplifier * 100;
                const bestiaryEnemyImagePath = resolvePublicAssetPath(`/enemy/E_${displayEnemy.id}.png`);
                return (
                  <div key={displayEnemy.id} className="mt-2 border border-gray-100 rounded">
                    <button
                      onClick={() => onSetExpandedBestiaryEnemies(prev => ({ ...prev, [displayEnemy.id]: !enemyExpanded }))}
                      className="w-full text-left px-2 py-1 text-sm flex justify-between items-center"
                    >
                      <span>{renderEnemyNameWithMutedClass(formatEnemyDefName(displayEnemy))}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        {!enemyExpanded && renderCollapsedBestiaryEnemyImage(displayEnemy.id)}
                        <span>{enemyExpanded ? '▲' : '▼'}</span>
                      </span>
                    </button>
                    {enemyExpanded && (
                      <div className="relative overflow-hidden px-2 pb-2 text-xs text-gray-700 border-t border-gray-100 pt-2 space-y-1">
                        {bestiaryEnemyImagePath && (
                          <>
                            <img
                              src={bestiaryEnemyImagePath}
                              alt=""
                              aria-hidden="true"
                              className="pointer-events-none select-none absolute left-[80%] top-0 z-0 h-auto -translate-x-1/2 object-contain object-top opacity-50"
                              style={{
                                width: 'clamp(120%, calc(270% - 0.3 * 100vw), 150%)',
                                maxWidth: 'none',
                              }}
                              onError={(event) => {
                                event.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="bestiary-image-mask pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
                          </>
                        )}
                        <div className="relative z-10 space-y-1">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>ID: {formatNumber(displayEnemy.id)}</div>
                          <div></div>
                          <div>HP: {formatNumber(displayEnemy.hp)}</div>
                          <div>{t('setting.bestiary.level', { value: formatNumber(enemyLevelFinal) })}</div>
                          {classRows.map((row) => row)}
                          {classRows.length === 1 && <div></div>}
                          <div>{t('setting.bestiary.type', { value: ENEMY_TYPE_LABELS[displayEnemy.enemyType] ?? displayEnemy.enemyType })}</div>
                          <div></div>
                          {(() => {
                            const hasRangedAttack = hasEnemyAttack(displayEnemy.rangedAttack, displayEnemy.rangedNoA);
                            const hasMeleeAttack = hasEnemyAttack(displayEnemy.meleeAttack, displayEnemy.meleeNoA);
                            const hasMagicalAttack = hasEnemyAttack(displayEnemy.magicalAttack, displayEnemy.magicalNoA);
                            const hasMagicCasting = hasEnemyMagicCasting(displayEnemy);
                            const hasPhysicalAttack = hasRangedAttack || hasMeleeAttack;
                            const decay = `${formatDecimal((0.90 + displayEnemy.accuracyBonus) * 100, 1)}%`;

                            const offenseRows: string[] = [];
                            if (hasRangedAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.rangedAttack'), displayEnemy.rangedAttack, displayEnemy.rangedNoA, displayEnemy.rangedAttackAmplifier));
                            }
                            if (hasMeleeAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.meleeAttack'), displayEnemy.meleeAttack, displayEnemy.meleeNoA, displayEnemy.meleeAttackAmplifier));
                            }
                            if (hasPhysicalAttack) {
                              offenseRows.push(t('setting.bestiary.accuracy', { type: t('setting.bestiary.physical'), decay }));
                            }
                            if (hasMagicalAttack) {
                              offenseRows.push(formatEnemyAttackLine(t('setting.bestiary.magicAttack'), displayEnemy.magicalAttack, displayEnemy.magicalNoA, getEnemyDisplayedMagicalAttackAmplifier(displayEnemy)));
                              offenseRows.push(t('setting.bestiary.accuracy', { type: t('setting.bestiary.magic'), decay }));
                            }
                            if (hasMagicCasting) {
                              offenseRows.push(t('setting.bestiary.castMagic', { spell: getEnemyBestiarySpellName(displayEnemy) }));
                            }
                            const basePenetration = (displayEnemy.bonuses ?? []).reduce((sum, bonus) => (
                              bonus.type === 'penet' ? sum + bonus.value : sum
                            ), 0);
                            const enemyHeavyStrike = displayEnemy.abilities.find((ability) => ability.id === 'heavy_strike' && ability.level > 0);
                            const heavyStrikePenetPerNoA = enemyHeavyStrike
                              ? (enemyHeavyStrike.level >= 2 ? 0.015 : 0.01)
                              : 0;
                            const heavyStrikeNoALoss = enemyHeavyStrike
                              ? Math.max(displayEnemy.rangedNoA, displayEnemy.magicalNoA, displayEnemy.meleeNoA)
                              : 0;
                            const penetrationPercent = Math.round((basePenetration + (heavyStrikeNoALoss * heavyStrikePenetPerNoA)) * 100);
                            if (penetrationPercent !== 0) {
                              offenseRows.push(t('setting.bestiary.penetration', { value: formatNumber(penetrationPercent) }));
                            }

                            // Bestiary detail keeps the compact 4-line defense block.
                            const defenseRows: ReactNode[] = [
                              formatEnemyElementOffenseLine(displayEnemy.elementalOffense, displayEnemy.elementalOffenseValue),
                              formatEnemyDefenseLine(t('setting.bestiary.physicalDefense'), displayEnemy.physicalDefense, physicalDefenseAmplifierPercent),
                              formatEnemyDefenseLine(t('setting.bestiary.magicalDefense'), displayEnemy.magicalDefense, magicalDefenseAmplifierPercent),
                              t('setting.bestiary.evasion', { value: formatNumber(Math.round(displayEnemy.evasionBonus * 1000)) }),
                            ];

                            const rowCount = Math.max(offenseRows.length, defenseRows.length);
                            return Array.from({ length: rowCount }).flatMap((_, index) => [
                              <div key={`off-${index}`}>{offenseRows[index] ?? ''}</div>,
                              <div key={`def-${index}`}>{defenseRows[index] ?? ''}</div>,
                            ]);
                          })()}
                          </div>
                        <div>{renderEnemyElementalResistanceLine(displayEnemy)}</div>
                        {(() => {
                          const bonusText = getEnemyTypeCBonusText(displayEnemy);
                          return bonusText ? <div>{t('party.status.bonus')}: {bonusText}</div> : null;
                        })()}
                        <div className="flex items-start gap-1">
                          <div>{t('setting.bestiary.abilities')}</div>
                          <div className="flex flex-wrap items-center gap-1">
                            {parseAbilityTokens(displayEnemy.abilities).map((token, tokenIndex) => (
                              <Fragment key={token.key}>
                                {tokenIndex > 0 && <span className="text-gray-400">,</span>}
                                {token.isMissing ? (
                                  <span>{token.label}</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(event) => handleAbilityHelpToggle(token.abilityId, token.level, token.label, event)}
                                    className="rounded px-1 text-left hover:bg-selection/[0.12] focus:outline-none focus:ring-1 focus:ring-focus"
                                    aria-label={t('setting.bestiary.showAbilityDescription', { ability: token.label })}
                                  >
                                    {token.label}
                                  </button>
                                )}
                              </Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="pt-1">{t('setting.bestiary.dropCandidates', { value: getEnemyDropCandidates(displayEnemy).map(item => `${getRarityShortLabel(item.id, item.name)}${getLocalizedItemName(item)}`).join(' / ') })}</div>
                        {(() => {
                          const battleStats = getBestiaryEnemyBattleStats(displayEnemy.id);
                          return <div>{t('setting.bestiary.battleStats', { defeats: formatNumber(battleStats.defeats), encounters: formatNumber(battleStats.encounters) })}</div>;
                        })()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        </>}
      </div>

      {debugSettings.colosseumEnabled && <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        <button
          type="button"
          onClick={() => toggleSettingPanel('enemyEdit')}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="text-sm font-semibold">Enemy Edit</div>
          <span className="text-gray-500 text-xs" aria-hidden="true">{settingPanelExpanded.enemyEdit ? '▲' : '▼'}</span>
        </button>
        {settingPanelExpanded.enemyEdit && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mt-3">
          {/* SpecRef: 8.6 | UI_SETTING | Enemy Edit Pane */}
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy level: {formatNumber(colosseumEnemySettings.level)}</div><input className={IOS_GLASS_SLIDER_CLASS} type="range" min={1} max={99} value={colosseumEnemySettings.level} onChange={(e) => updateColosseumEnemySettings({ level: Number(e.target.value) })} style={getSliderProgressStyle(colosseumEnemySettings.level, 1, 99)} /></label>
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy name</div><input className="w-full rounded border px-2 py-1" value={colosseumEnemySettings.name} onChange={(e) => updateColosseumEnemySettings({ name: e.target.value })} /></label>
          <label className="space-y-1">
            <div className="text-xs text-gray-600">Terrain effect</div>
            <select
              className="w-full rounded border px-2 py-1"
              value={colosseumEnemySettings.terrainEffect}
              onChange={(e) => updateColosseumEnemySettings({ terrainEffect: e.target.value as ColosseumEnemySettings['terrainEffect'] })}
            >
              {TERRAIN_EFFECT_OPTIONS.map((entry) => (
                <option key={entry.key} value={entry.key}>{entry.label}</option>
              ))}
            </select>
            <div className="text-[11px] text-gray-500">
              {(TERRAIN_EFFECT_OPTIONS.find((entry) => entry.key === colosseumEnemySettings.terrainEffect)?.description) ?? t('home.terrainEffect.noneDescription')}
            </div>
          </label>
          {/* SpecRef: 8.6 | UI_SETTING | `enemyType`'s option keys come from `read/setting/enemyEditPane`'s
              `validOptions` — the same `ENEMIES` master-data-derived set the server validates against — instead of
              this file's own hand-maintained `ENEMY_TYPE_LABELS` map, which only supplies display labels now and
              could otherwise silently omit a new enemy type it was never updated for. */}
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy type</div><select className="w-full rounded border px-2 py-1" value={colosseumEnemySettings.enemyType} onChange={(e) => updateColosseumEnemySettings({ enemyType: e.target.value })}>{(enemyEditValidOptions?.enemyType ?? Object.keys(ENEMY_TYPE_LABELS)).map((key) => <option key={key} value={key}>{ENEMY_TYPE_LABELS[key] ?? key}</option>)}</select></label>
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy main class</div><select className="w-full rounded border px-2 py-1" value={colosseumEnemySettings.enemyMainClass} onChange={(e) => updateColosseumEnemySettings({ enemyMainClass: e.target.value as ColosseumEnemySettings['enemyMainClass'] })}>{ENEMY_EDIT_CLASS_OPTIONS.map((key) => <option key={key} value={key}>{ENEMY_CLASS_LABELS[key] ?? key}</option>)}</select></label>
          <label className="space-y-1"><div className="text-xs text-gray-600">Enemy sub class</div><select className="w-full rounded border px-2 py-1" value={colosseumEnemySettings.enemySubClass} onChange={(e) => updateColosseumEnemySettings({ enemySubClass: e.target.value as ColosseumEnemySettings['enemySubClass'] })}><option value="none">none</option>{ENEMY_EDIT_CLASS_OPTIONS.map((key) => <option key={key} value={key}>{ENEMY_CLASS_LABELS[key] ?? key}</option>)}</select></label>
          {[0, 1, 2, 3, 4].map((slot) => {
            const slotAbility = colosseumEnemySettings.abilities[slot];
            return (
              <Fragment key={slot}>
                <label className="space-y-1">
                  <div className="text-xs text-gray-600">Enemy added ability {slot + 1}</div>
                  <select
                    className="w-full rounded border px-2 py-1"
                    value={slotAbility?.id ?? 'none'}
                    onChange={(e) => {
                      const next = [...colosseumEnemySettings.abilities];
                      const value = e.target.value as AbilityId | 'none';
                      if (value === 'none') {
                        next.splice(slot, 1);
                      } else {
                        next[slot] = { id: value as AbilityId, level: slotAbility?.level ?? 1 };
                      }
                      updateColosseumEnemySettings({ abilities: next.filter(Boolean) as ColosseumEnemySettings['abilities'] });
                    }}
                  >
                    {[<option key="none" value="none">none</option>, ...Object.entries(ABILITY_NAMES).map(([key, label]) => <option key={key} value={key}>{label}</option>)]}
                  </select>
                </label>
                <label className="space-y-1">
                  <div className="text-xs text-gray-600">Enemy added ability {slot + 1} level</div>
                  <select
                    className="w-full rounded border px-2 py-1"
                    value={slotAbility?.level ?? 1}
                    onChange={(e) => {
                      const next = [...colosseumEnemySettings.abilities];
                      const levelValue = Number(e.target.value);
                      if (slotAbility) {
                        next[slot] = { ...slotAbility, level: levelValue };
                      }
                      updateColosseumEnemySettings({ abilities: next.filter(Boolean) as ColosseumEnemySettings['abilities'] });
                    }}
                    disabled={!slotAbility}
                  >
                    {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
              </Fragment>
            );
          })}
        </div>}
      </div>}

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('superRare', t('setting.superRare'))}
        {settingPanelExpanded.superRare && <>
        <div className="text-xs text-gray-500 mt-3 mb-2">{t('setting.superRareListCaption')}</div>
        <div className="bg-white rounded p-2 text-sm space-y-1 max-h-72 overflow-y-auto pane-button-shadow">
          {(superRareEntries ?? []).map((entry) => Number(entry.split('/', 1)[0])).map((value) => SUPER_RARE_TITLES.find((title) => title.value === value)).filter((title): title is (typeof SUPER_RARE_TITLES)[number] => !!title && title.value > 0).map(title => {
            const uniqueBonus = formatBonuses(title.bonuses ?? [], { defenseMultiplierStyle: 'friendly' });
            return (
              <div key={title.value} className="grid grid-cols-[auto,1fr] gap-x-2 border-b border-gray-100 last:border-b-0 py-1">
                <div className="text-gray-500">{title.value}.</div>
                <div>
                  <div className="font-medium text-gray-700">{getLocalizedSuperRareTitle(title.value)}</div>
                  <div className="text-xs text-sub">{uniqueBonus || t('common.none')}</div>
                </div>
              </div>
            );
          })}
        </div>
        </>}
      </div>
      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('modeSelect', t('setting.modeSelect'))}
        {settingPanelExpanded.modeSelect && <div className="mt-3 space-y-4">
          {/* SpecRef: 8.6 | UI_SETTING | Mode select (モード切替) */}
          <div>
            <div className="text-sm font-medium mb-1">{t('setting.language.title')}</div>
            <p className="mb-2 text-xs text-gray-500">{t('setting.language.description')}</p>
            <select
              value={language}
              onChange={(event) => onSetLanguage(event.target.value as Language)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{t(`setting.language.${lang}`)}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              role="switch"
              aria-checked={isAutoRepeatEnabled}
              onClick={() => onSetAutoRepeatEnabled(!isAutoRepeatEnabled)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pane-button-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('setting.autoRepeat')}</span>
                <span className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isAutoRepeatEnabled ? 'text-sub' : 'text-gray-500'}`}>
                    {isAutoRepeatEnabled ? 'ON' : 'OFF'}
                  </span>
                  <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${isAutoRepeatEnabled ? 'bg-sub' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isAutoRepeatEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </span>
                </span>
              </div>
            </button>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              role="switch"
              aria-checked={isExpeditionStatsDisplayEnabled}
              onClick={() => onSetExpeditionStatsDisplayEnabled(!isExpeditionStatsDisplayEnabled)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pane-button-shadow"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('setting.expeditionStatsDisplay')}</span>
                <span className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isExpeditionStatsDisplayEnabled ? 'text-sub' : 'text-gray-500'}`}>
                    {isExpeditionStatsDisplayEnabled ? 'ON' : 'OFF'}
                  </span>
                  <span className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${isExpeditionStatsDisplayEnabled ? 'bg-sub' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isExpeditionStatsDisplayEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </span>
                </span>
              </div>
            </button>
          </div>

          <div>
            <div className="text-xs text-gray-600 font-medium mb-2">{t('setting.darkMode')}</div>
            <div className="grid grid-cols-3 gap-2">
              {(['off', 'on', 'system'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onSetDarkModeSetting(mode)}
                  className={`py-2 rounded border text-sm font-medium ${
                    darkModeSetting === mode
                      ? 'bg-sub text-white border-sub pane-button-shadow-soft'
                      : 'bg-white text-gray-700 border-gray-300 pane-button-shadow'
                  }`}
                >
                  {mode === 'off' ? 'OFF' : mode === 'on' ? 'ON' : t('setting.darkMode.system')}
                </button>
              ))}
            </div>
            <div className="mt-2 rounded bg-white p-2 text-xs text-gray-600 pane-button-shadow">
              {darkModeSetting === 'system'
                ? t('setting.darkMode.description.system')
                : darkModeSetting === 'on'
                  ? t('setting.darkMode.description.on')
                  : t('setting.darkMode.description.off')}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-600 font-medium mb-2">{t('setting.gameMode')}</div>
            <div className="grid grid-cols-2 gap-2">
              {RUNTIME_GAME_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => !isOrcaEnvironment && onSetRuntimeGameMode(mode)}
                  disabled={isOrcaEnvironment}
                  className={`py-2 rounded border text-sm font-medium ${
                    runtimeGameMode === mode
                      ? 'bg-selection text-content-inverse border-selection pane-button-shadow-soft'
                      : 'bg-surface-interactive text-content-default border-line-strong pane-button-shadow'
                  } ${isOrcaEnvironment ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  {t(mode === 'mode.orca' ? 'setting.gameMode.orca' : 'setting.gameMode.normal')}
                </button>
              ))}
            </div>
            {runtimeGameMode === 'mode.orca' && (
              <label className="mt-3 block rounded bg-white p-2 pane-button-shadow">
                <span className="flex items-center justify-between text-xs text-gray-600">
                  <span>{t('setting.gameMode.enemyLevelOffset')}</span>
                  <span className="font-semibold text-gray-700">+{orcaEnemyLevelOffset}</span>
                </span>
                <input
                  type="range"
                  min={ORCA_ENEMY_LEVEL_OFFSET_MIN}
                  max={ORCA_ENEMY_LEVEL_OFFSET_MAX}
                  step={1}
                  value={orcaEnemyLevelOffset}
                  disabled={!debugModeEnabled}
                  onChange={(event) => {
                    if (debugModeEnabled) onSetOrcaEnemyLevelOffset(Number(event.target.value));
                  }}
                  className={`mt-2 w-full disabled:cursor-not-allowed disabled:opacity-50 ${IOS_GLASS_SLIDER_CLASS}`}
                  style={getSliderProgressStyle(orcaEnemyLevelOffset, ORCA_ENEMY_LEVEL_OFFSET_MIN, ORCA_ENEMY_LEVEL_OFFSET_MAX)}
                />
              </label>
            )}
          </div>

          <div>
            <div className="text-xs text-gray-600 font-medium mb-2">{t('setting.themeColor')}</div>
            <div className="grid grid-cols-4 gap-2">
              {GAME_MODES.filter((mode) => {
                const environment = getEnvironmentId();
                if (environment === 'beta') return mode === 'm.laika';
                return environment === 'dev' || THEME_DEFINITIONS[mode].availableInProduction;
              }).map((mode) => {
                const labelKey = THEME_DEFINITIONS[mode].labelKey;
                return (
                  <button
                    key={mode}
                    onClick={() => !modeSelectionLocked && onSetGameMode(mode)}
                    disabled={modeSelectionLocked}
                    className={`py-2 rounded border text-sm font-medium ${
                      gameMode === mode
                        ? 'bg-selection text-content-inverse border-selection pane-button-shadow-soft'
                        : 'bg-surface-interactive text-content-default border-line-strong pane-button-shadow'
                    } ${modeSelectionLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {t(labelKey)}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 rounded bg-white p-2 text-xs text-gray-600 pane-button-shadow">
              {t('setting.theme.description.named', { name: t(THEME_DEFINITIONS[gameMode].labelKey) })}
            </div>
          </div>

          <DesktopNotificationSettings />
          <ApiV1Settings />
        </div>}
      </div>


      {debugModeEnabled && <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('debug', t('setting.debug'))}
        {settingPanelExpanded.debug && <div className="space-y-3 mt-3 text-sm">
          <button type="button" onClick={() => onUpdateDebugSettings({ runtimeDiagnosticsEnabled: !debugSettings.runtimeDiagnosticsEnabled })} className="w-full rounded border bg-white px-3 py-2 text-left">{t('setting.runtime.toggle', { state: t(debugSettings.runtimeDiagnosticsEnabled ? 'setting.runtime.on' : 'setting.runtime.off') })}</button>
          {debugSettings.runtimeDiagnosticsEnabled && <RuntimeDiagnostics />}
          <button type="button" onClick={() => onUpdateDebugSettings({ clairvoyanceEnabled: !debugSettings.clairvoyanceEnabled })} className="w-full rounded border bg-white px-3 py-2 text-left">Clairvoyance: {debugSettings.clairvoyanceEnabled ? 'ON' : 'OFF'}</button>
          <div className="bg-white rounded border p-2">
            <div className="text-xs text-gray-500 mb-1">Speed of time</div>
            <div className="flex gap-2">
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'realtime' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'realtime' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>Real time</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'x1_2' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'x1_2' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x1.2 bonus</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'x5' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'x5' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x5 boost</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'x20' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'x20' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x20 hyper</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'x100' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'x100' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x100 Ultra</button>
              <button onClick={() => onUpdateDebugSettings({ timeSpeed: 'unlimited' })} className={`px-2 py-1 rounded border ${debugSettings.timeSpeed === 'unlimited' ? 'bg-sub text-white border-sub' : 'border-gray-300'}`}>x∞ Unlimited</button>
            </div>
          </div>
          <button type="button" onClick={() => onUpdateDebugSettings({ godsBattleCondition: debugSettings.godsBattleCondition === 'normal' ? 'simple1' : 'normal' })} className="w-full rounded border bg-white px-3 py-2 text-left">Gods Battle condition: {debugSettings.godsBattleCondition === 'simple1' ? 'Simple(1)' : 'Normal'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ godStrength: debugSettings.godStrength === 'normal' ? 'debug' : 'normal' })} className="w-full rounded border bg-white px-3 py-2 text-left">Gods Strength: {debugSettings.godStrength === 'debug' ? 'Very Weak' : 'Normal'}</button>
          <button type="button" disabled={partyCount >= 6} onClick={onPartyUnlock} className="w-full rounded border bg-white px-3 py-2 text-left disabled:opacity-50">Party unlock +1 PT unlock ({partyCount}/6)</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ jewelShopOpen: !debugSettings.jewelShopOpen })} className="w-full rounded border bg-white px-3 py-2 text-left">Ashen Route Vault open: {debugSettings.jewelShopOpen ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayCondition: !debugSettings.displayCondition })} className="w-full rounded border bg-white px-3 py-2 text-left">Display condition: {debugSettings.displayCondition ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayAfkDuration: !debugSettings.displayAfkDuration })} className="w-full rounded border bg-white px-3 py-2 text-left">Display AFK duration: {debugSettings.displayAfkDuration ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ colosseumEnabled: !debugSettings.colosseumEnabled })} className="w-full rounded border bg-white px-3 py-2 text-left">Colosseum mode: {debugSettings.colosseumEnabled ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayAllBestiary: !debugSettings.displayAllBestiary })} className="w-full rounded border bg-white px-3 py-2 text-left">Display all Bestiary: {debugSettings.displayAllBestiary ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayAllCompendium: !debugSettings.displayAllCompendium })} className="w-full rounded border bg-white px-3 py-2 text-left">Display all Compendium: {debugSettings.displayAllCompendium ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => onUpdateDebugSettings({ displayAllGlossary: !debugSettings.displayAllGlossary })} className="w-full rounded border bg-white px-3 py-2 text-left">Display all Glossary: {debugSettings.displayAllGlossary ? 'ON' : 'OFF'}</button>
        </div>}
      </div>}


      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('feedback', t('setting.feedback'))}
        {settingPanelExpanded.feedback && <div className="space-y-3 mt-3">
          <div className="text-sm text-gray-600">{t(feedbackRewardEligible ? 'setting.feedback.descriptionFirst' : 'setting.feedback.description')}</div>
          <input required value={feedbackName} onChange={(e) => setFeedbackName(e.target.value)} className="w-full rounded border border-gray-300 bg-white px-3 py-2" placeholder={t('setting.feedback.namePlaceholder')} />
          <select value={feedbackCategory} onChange={(e) => setFeedbackCategory(e.target.value as typeof feedbackCategory)} className="w-full rounded border border-gray-300 bg-white px-3 py-2">
            <option value="Feedback">{t('setting.feedback.category.feedback')}</option>
            <option value="Question">{t('setting.feedback.category.question')}</option>
            <option value="Feature Request">{t('setting.feedback.category.featureRequest')}</option>
            <option value="Bug Report">{t('setting.feedback.category.bugReport')}</option>
          </select>
          <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} className="w-full min-h-24 rounded border border-gray-300 bg-white px-3 py-2" placeholder={t('setting.feedback.bodyPlaceholder')} />
          <div>
            <label className="text-sm font-medium">{t('setting.feedback.latestBattleLog')}</label>
            <select value={feedbackLatestBattleLogSelection} onChange={(e) => setFeedbackLatestBattleLogSelection(e.target.value as 'PT1' | 'PT2' | 'PT3' | 'PT4' | 'PT5' | 'PT6' | 'None')} className="w-full rounded border border-gray-300 bg-white px-3 py-2 mt-1">
              <option value="PT1">PT1</option>
              <option value="PT2">PT2</option>
              <option value="PT3">PT3</option>
              <option value="PT4">PT4</option>
              <option value="PT5">PT5</option>
              <option value="PT6">PT6</option>
              <option value="None">None</option>
            </select>
          </div>
          <div>
            <input
              ref={feedbackFileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFeedbackFileChange}
              className="w-full text-sm"
            />
            <div className="mt-1 text-xs text-gray-500">{t('setting.feedback.attachedImages', { count: formatNumber(feedbackFiles.length) })}</div>
          </div>
          <button onClick={handleSendFeedback} disabled={isSendingFeedback} className="w-full py-2 bg-sub text-white rounded font-medium disabled:opacity-60">{isSendingFeedback ? t('setting.feedback.sending') : t('setting.feedback.send')}</button>
        </div>}
      </div>

      <div className="bg-pane rounded-lg p-4 mb-4 shadow-md shadow-slate-900/10">
        {renderSettingPanelHeader('gameSetting', t('setting.backupReset'))}
        {settingPanelExpanded.gameSetting && <div className="space-y-4 mt-3">
          <div>
            <div className="text-sm font-medium mb-1">{t('setting.backup.title')}</div>
            <button
              onClick={handleExportBackup}
              className="w-full py-2 bg-sub text-white rounded font-medium"
            >
              {t('setting.backup.download')}
            </button>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">{t('setting.import.title')}</div>
            <input
              ref={importInputRef}
              type="file"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="w-full py-2 bg-sub text-white rounded font-medium"
            >
              {t('setting.import.select')}
            </button>
          </div>

          <div>
            <div className="text-sm font-medium mb-1">{t('setting.reset.title')}</div>
            {!showResetConfirm ? (
              <button onClick={() => setShowResetConfirm(true)} className="w-full py-2 bg-accent text-white rounded font-medium">{t('setting.reset.button')}</button>
            ) : (
              <div>
                <div className="text-sm text-accent mb-2 p-2 bg-accent/10 rounded border border-accent/25">{t('setting.reset.confirm')}</div>
                <div className="flex gap-2">
                  <button onClick={() => { onResetGame(); setShowResetConfirm(false); }} className="flex-1 py-2 bg-accent text-white rounded font-medium">{t('setting.reset.execute')}</button>
                  <button onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 bg-gray-300 rounded font-medium">{t('common.cancel')}</button>
                </div>
              </div>
            )}
          </div>
        </div>}
      </div>

    </div>
  );
}
