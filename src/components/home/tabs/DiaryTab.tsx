import { Fragment,useEffect,useState,type Dispatch,type SetStateAction } from 'react';
import { GOD_ENEMY_PROFILES } from '../../../data/dropTables';
import {
DUNGEONS,
getEffectiveEnemyLevel,
getLocalizedExpeditionFloorConcept
} from '../../../data/dungeons';
import { DIARY_LOG_RETENTION_LIMIT } from '../../../game/diary';
import { getItemDisplayName } from '../../../game/gameState';
import { t } from '../../../i18n';
import { DiaryDefeatNotificationMode,DiaryLog,DiarySettings,EnemyDef,ExpeditionLog,ExpeditionLogEntry,Item,Party } from '../../../types';


import {
aggregateBattleLifeDrainLogs,
battleLogActionIncludesEnemyName,
DIARY_DEFEAT_NOTIFICATION_OPTIONS,
DIARY_SIDE_QUEST_THRESHOLD_OPTIONS,
DIARY_THRESHOLD_OPTIONS,
EnemyBestiaryBubble,
FloatingBubblePortal,
formatAutoSellSummary,
formatBattleLogHitDisplay,
formatDecimal,
formatNumber,
getBattleLogPhaseLabel,
getBestiaryEnemyFromLogEntry,
getEnemyLogBackgroundImagePath,
getItemInventoryDetailText,
getItemRarityById,
getRarityTextClass,
getRewardFontWeightClass,
getRewardItemBubblePosition,
parseDiarySideQuestThreshold,
parseDiaryThreshold,
renderBattleLogNote,
renderBattleLogTextWithInlineChibis,
renderEnemyLogChibiBackground,
renderEnemyNameWithMutedClass,
renderEntryReward,
renderTextWithRaceIcons,
renderUiIcon,
RewardItemBubble,
UiIconKey
} from '../homeShared';

function DiaryPartyTabs({ parties, selectedIndex, onSelect }: {
  parties: Party[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  // SpecRef: 8.5 | UI_DIARY | If only one Party is unlocked, the subcategory tabs are hidden.
  if (parties.length <= 1) return null;

  return (
    <div className="grid grid-cols-6 gap-1 rounded-lg bg-pane p-1 shadow-md shadow-slate-900/10" role="tablist" aria-label={t('diary.partyTabs.label')}>
      {parties.map((party, index) => (
        <button
          key={party.id}
          type="button"
          role="tab"
          aria-selected={index === selectedIndex}
          aria-label={t('diary.partyTabs.party', { number: index + 1 })}
          onClick={() => onSelect(index)}
          className={`relative rounded-md px-2 py-1.5 text-sm font-semibold transition-colors ${
            // SpecRef: 8.5 | UI_DIARY | The selected tab is highlighted using the sub-theme color.
            index === selectedIndex ? 'bg-sub text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
          }`}
        >
          {/* SpecRef: 8.5 | UI_DIARY | The Diary has six subcategory tabs: PT1, PT2, PT3, PT4, PT5, PT6. */}
          {`PT${index + 1}`}
          {(() => {
            const unreadCount = party.diaryLogs.filter((log) => !log.isRead).length;
            if (unreadCount === 0) return null;
            return (
              <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 py-0.5 text-[9px] leading-none text-white">
                {Math.min(unreadCount, DIARY_LOG_RETENTION_LIMIT)}
              </span>
            );
          })()}
        </button>
      ))}
    </div>
  );
}

export default function DiaryTab({
  parties,
  onOpenDiaryLog,
  onMarkPartyDiaryLogsSeen,
  onSelectedPartyIndexChange,
  onUpdateDiarySettings,
  expandedLogs,
  onSetExpandedLogs,
  expandedRooms,
  onSetExpandedRooms,
  isSettingsExpanded,
  onSetIsSettingsExpanded,
  isDarkModeEnabled,
}: {
  parties: Party[];
  onOpenDiaryLog: (logId: string) => void;
  onMarkPartyDiaryLogsSeen: (partyIndex: number) => void;
  onSelectedPartyIndexChange: (partyIndex: number) => void;
  onUpdateDiarySettings: (partyIndex: number, settings: Partial<DiarySettings>) => void;
  expandedLogs: Record<string, boolean>;
  onSetExpandedLogs: Dispatch<SetStateAction<Record<string, boolean>>>;
  expandedRooms: Record<string, boolean>;
  onSetExpandedRooms: Dispatch<SetStateAction<Record<string, boolean>>>;
  isSettingsExpanded: boolean;
  onSetIsSettingsExpanded: Dispatch<SetStateAction<boolean>>;
  isDarkModeEnabled: boolean;
}) {
  const availableParties = parties;
  const diaryPartyStorageKey = `bokemo:${window.location.pathname}:selected-diary-party`;
  const [selectedDiaryPartyIndex, setSelectedDiaryPartyIndex] = useState(() => {
    const stored = Number.parseInt(window.localStorage.getItem(diaryPartyStorageKey) ?? '0', 10);
    return Number.isInteger(stored) && stored >= 0 ? Math.min(stored, availableParties.length - 1) : 0;
  });
  const safeDiaryPartyIndex = Math.min(selectedDiaryPartyIndex, availableParties.length - 1);
  const selectedDiaryParty = availableParties[safeDiaryPartyIndex];

  useEffect(() => {
    if (selectedDiaryPartyIndex !== safeDiaryPartyIndex) setSelectedDiaryPartyIndex(safeDiaryPartyIndex);
    window.localStorage.setItem(diaryPartyStorageKey, String(safeDiaryPartyIndex));
    onSelectedPartyIndexChange(safeDiaryPartyIndex);
  }, [diaryPartyStorageKey, onSelectedPartyIndexChange, safeDiaryPartyIndex, selectedDiaryPartyIndex]);

  const selectDiaryParty = (partyIndex: number) => {
    if (partyIndex === safeDiaryPartyIndex) return;
    onMarkPartyDiaryLogsSeen(safeDiaryPartyIndex);
    onSelectedPartyIndexChange(partyIndex);
    setSelectedDiaryPartyIndex(partyIndex);
  };
  const [activeEnemyBestiaryBubble, setActiveEnemyBestiaryBubble] = useState<{
    key: string;
    enemy: EnemyDef;
    enemyLevel: number | null;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [activeRewardItemBubble, setActiveRewardItemBubble] = useState<RewardItemBubble | null>(null);

  const handleRewardItemBubbleToggle = (bubbleKey: string, item: Item, targetElement: HTMLElement) => {
    if (activeRewardItemBubble?.key === bubbleKey) {
      setActiveRewardItemBubble(null);
      return;
    }

    // SpecRef: 8.5 | UI_DIARY | Diary log
    setActiveRewardItemBubble({
      key: bubbleKey,
      text: getItemInventoryDetailText(item),
      ...getRewardItemBubblePosition(targetElement),
    });
  };

  const handleEnemyBestiaryBubbleToggle = (
    bubbleKey: string,
    entry: ExpeditionLogEntry,
    enemyLevel: number | null,
    targetElement: HTMLElement,
  ) => {
    const enemy = getBestiaryEnemyFromLogEntry(entry);
    if (!enemy) return;

    if (activeEnemyBestiaryBubble?.key === bubbleKey) {
      setActiveEnemyBestiaryBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleWidth,
    );

    // SpecRef: 8.5 | UI_DIARY | Diary log
    // Tap enemy’s name part to show floating bubble of its bestiary.
    setActiveEnemyBestiaryBubble({
      key: bubbleKey,
      enemy,
      enemyLevel,
      top: triggerRect.bottom + 8,
      left,
      width: bubbleWidth,
    });
  };

  const diaryLogs = (selectedDiaryParty?.diaryLogs ?? [])
    .map((diaryLog) => ({ partyName: selectedDiaryParty.name, ...diaryLog }))
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, DIARY_LOG_RETENTION_LIMIT);

  const getDiaryTitle = (triggers: DiaryLog['triggers']) => {
    if (triggers.includes('victory') && triggers.length === 1) return t('diary.title.victory');
    if (triggers.includes('return') && triggers.length === 1) return t('diary.title.return');
    if (triggers.includes('defeat') && triggers.length === 1) return t('diary.title.defeat');
    if (triggers.includes('draw') && triggers.length === 1) return t('diary.title.draw');
    if (triggers.includes('retreat') && triggers.length === 1) return t('diary.title.retreat');
    if (triggers.includes('unlock')) return t('diary.title.unlock');
    if (triggers.includes('sideQuest')) return t('diary.title.sideQuest');
    if (triggers.includes('godsBattle')) return t('diary.title.godsBattle');
    if (triggers.includes('superRare')) return t('diary.title.superRare');
    if (triggers.includes('mythicRare')) return t('diary.title.mythicRare');
    if (triggers.includes('bossRare')) return t('diary.title.bossRare');
    if (triggers.includes('eliteRare')) return t('diary.title.eliteRare');
    return t('diary.title.special');
  };


  const getGodsBattleOutcomeLabel = (expeditionLog: ExpeditionLog) => {
    const hasGodsBattleEntry = expeditionLog.entries.some((entry) => entry.enemyName.includes('(神魔戦)'));
    if (!hasGodsBattleEntry) return t('diary.outcome.notReached');
    if (expeditionLog.finalOutcome === 'Clear') return t('diary.outcome.victory');
    if (expeditionLog.finalOutcome === 'Defeat') return t('diary.outcome.defeat');
    return t('diary.outcome.draw');
  };


  const getGodsBattleDiaryDisplayName = (rawName: string): string => {
    const withoutBattleSuffix = rawName.replace(/\s*\(神魔戦\)\s*$/u, '').trim();
    const withoutLegacySuffix = withoutBattleSuffix.replace(/\([^()]*神[^()]*\)$/u, '').trim();
    const matchedGodProfile = GOD_ENEMY_PROFILES.find((profile) => {
      const profileHead = profile.displayName.split(' ')[0]?.trim() ?? '';
      return profile.displayName === withoutBattleSuffix
        || profileHead === withoutBattleSuffix
        || profileHead === withoutLegacySuffix;
    });
    if (matchedGodProfile) return matchedGodProfile.displayName;
    return withoutLegacySuffix || withoutBattleSuffix;
  };

  const getDiaryHeadline = (
    partyName: string,
    triggers: DiaryLog['triggers'],
    rewards: Item[],
    expeditionLog: ExpeditionLog,
    sideQuestLabel?: string,
    unlockHeadline?: string
  ) => {
    // SpecRef: 8.5 | UI_DIARY | 神魔戦通知
    if (triggers.includes('godsBattle')) {
      const godsBattleEnemyName = expeditionLog.entries
        .find((entry) => entry.enemyName.includes('(神魔戦)'))
        ?.enemyName.replace(/\s*\(神魔戦\)\s*$/u, '')
        .trim();
      const normalizedGodsBattleEnemyName = godsBattleEnemyName
        ? getGodsBattleDiaryDisplayName(godsBattleEnemyName)
        : null;
      const godsBattleOutcome = getGodsBattleOutcomeLabel(expeditionLog);
      if (normalizedGodsBattleEnemyName) {
        return `[${partyName}] ${normalizedGodsBattleEnemyName} ${godsBattleOutcome}`;
      }
      return t('diary.headline.godsBattleGeneric', { party: partyName, outcome: godsBattleOutcome });
    }


    if (triggers.includes('unlock')) {
      return unlockHeadline
        ? t('diary.headline.unlockNamed', { party: partyName, headline: unlockHeadline })
        : t('diary.headline.unlock', { party: partyName });
    }

    if (triggers.includes('sideQuest')) {
      return sideQuestLabel
        ? t('diary.headline.sideQuestNamed', { party: partyName, quest: sideQuestLabel })
        : t('diary.headline.sideQuest', { party: partyName });
    }

    if (triggers.includes('defeat') && triggers.length === 1) {
      return t('diary.headline.defeat', { party: partyName });
    }

    if (triggers.includes('draw') && triggers.length === 1) {
      return t('diary.headline.draw', { party: partyName });
    }

    if (triggers.includes('retreat') && triggers.length === 1) {
      return t('diary.headline.retreat', { party: partyName });
    }

    if (triggers.includes('return') && triggers.length === 1) {
      return t('diary.headline.return', { party: partyName });
    }

    if (triggers.includes('victory') && triggers.length === 1) {
      return t('diary.headline.victory', { party: partyName });
    }

    if (triggers.includes('superRare') || triggers.includes('mythicRare') || triggers.includes('bossRare')) {
      const rewardNames = rewards
        .filter((item) => {
          if (triggers.includes('superRare')) return item.superRare > 0;
          if (triggers.includes('mythicRare')) return getItemRarityById(item.id) === 'mythicRare';
          return getItemRarityById(item.id) === 'bossRare';
        })
        .map((item) => getItemDisplayName(item))
        .join('、');
      const triggerPrefix = triggers.includes('superRare')
        ? t('diary.reward.superRare')
        : triggers.includes('mythicRare')
          ? t('diary.reward.mythicRare')
          : t('diary.reward.bossRare');
      return rewardNames
        ? t('diary.headline.rewardNamed', { party: partyName, rewardType: triggerPrefix, rewards: rewardNames })
        : t('diary.headline.reward', { party: partyName, rewardType: triggerPrefix });
    }

    if (triggers.includes('eliteRare')) {
      const rewardNames = rewards
        .filter((item) => getItemRarityById(item.id) === 'eliteRare')
        .map((item) => getItemDisplayName(item))
        .join('、');
      return rewardNames ? t('diary.headline.rewardNamed', { party: partyName, rewardType: t('diary.reward.eliteRare'), rewards: rewardNames }) : t('diary.headline.reward', { party: partyName, rewardType: t('diary.reward.eliteRare') });
    }

    const fallbackBossNames = rewards
      .filter((item) => getItemRarityById(item.id) === 'bossRare')
      .map((item) => getItemDisplayName(item))
      .join('、');
    if (fallbackBossNames) {
      return t('diary.headline.rewardNamed', { party: partyName, rewardType: t('diary.reward.bossRare'), rewards: fallbackBossNames });
    }

    return t('diary.headline.title', { party: partyName, title: getDiaryTitle(triggers) });
  };

  const formatDiaryTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const renderDiarySettings = () => (
    <div className="bg-pane rounded-lg p-3 shadow-md shadow-slate-900/10">
      <button
        onClick={() => onSetIsSettingsExpanded((prev) => !prev)}
        className="w-full text-left"
      >
        <span className="flex items-center justify-between text-sm font-medium">
          <span>{t('diary.settings.title')}</span>
          <span className={`transform transition-transform ${isSettingsExpanded ? 'rotate-180' : ''}`}>▼</span>
        </span>
      </button>

      {isSettingsExpanded && (
        <div className="mt-3 space-y-3">
          {selectedDiaryParty && (() => {
            const partyIndex = safeDiaryPartyIndex;
            const party = selectedDiaryParty;
            const settings = party.diarySettings;
            return (
              <div key={party.id} className="rounded border border-gray-200 p-2.5">
                <div className="mb-2 text-xs text-gray-500">{party.name}</div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.superRareNotification')}</span>
                    <select
                      value={settings.superRareThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { superRareThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`sr-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.eliteRareNotification')}</span>
                    <select
                      value={settings.rareThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { rareThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`ra-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.bossRareNotification')}</span>
                    <select
                      value={settings.bossThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { bossThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`bo-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.godsBattleNotification')}</span>
                    <select
                      value={settings.notifyGodsBattle ? 'yes' : 'no'}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { notifyGodsBattle: event.target.value === 'yes' })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      <option value="yes">{t('common.yes')}</option>
                      <option value="no">{t('common.no')}</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.mythicRareNotification')}</span>
                    <select
                      value={settings.mythicThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { mythicThreshold: parseDiaryThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`my-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.defeatNotification')}</span>
                    <select
                      value={settings.defeatNotificationMode}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { defeatNotificationMode: event.target.value as DiaryDefeatNotificationMode })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_DEFEAT_NOTIFICATION_OPTIONS.map((option) => (
                        <option key={`df-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                  {/* SpecRef: 8.5 | UI_DIARY | Setting. */}
                  <label className="flex items-center justify-between gap-2">
                    <span>{t('diary.settings.sideQuestNotification')}</span>
                    <select
                      value={settings.sideQuestThreshold}
                      onChange={(event) => onUpdateDiarySettings(partyIndex, { sideQuestThreshold: parseDiarySideQuestThreshold(event.target.value) })}
                      className="rounded border border-gray-300 bg-white px-2 py-1"
                    >
                      {DIARY_SIDE_QUEST_THRESHOLD_OPTIONS.map((option) => (
                        <option key={`sq-${option.value}`} value={option.value}>{t(option.labelKey)}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );

  if (diaryLogs.length === 0) {
    return (
      <div
        className="space-y-3 diary-tab-surface"
        onPointerDown={() => {
          if (activeEnemyBestiaryBubble) {
            setActiveEnemyBestiaryBubble(null);
          }
          if (activeRewardItemBubble) {
            setActiveRewardItemBubble(null);
          }
        }}
      >
        {activeEnemyBestiaryBubble && <EnemyBestiaryBubble bubble={activeEnemyBestiaryBubble} />}
        {activeRewardItemBubble && (
          <FloatingBubblePortal>
            <div
              className="floating-bubble-pane fixed z-20 rounded-lg p-2 text-xs text-gray-700"
              style={{ top: activeRewardItemBubble.top, left: activeRewardItemBubble.left, width: 'max-content', maxWidth: activeRewardItemBubble.maxWidth }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {renderTextWithRaceIcons(activeRewardItemBubble.text)}
            </div>
          </FloatingBubblePortal>
        )}
        <DiaryPartyTabs parties={availableParties} selectedIndex={safeDiaryPartyIndex} onSelect={selectDiaryParty} />
        {renderDiarySettings()}
        <div className="bg-pane rounded-lg p-4 text-sm text-gray-500 text-center shadow-md shadow-slate-900/10">{t('diary.empty')}</div>
      </div>
    );
  }

  return (
    <div
      className="space-y-3 diary-tab-surface"
      onPointerDown={() => {
        if (activeEnemyBestiaryBubble) {
          setActiveEnemyBestiaryBubble(null);
        }
        if (activeRewardItemBubble) {
          setActiveRewardItemBubble(null);
        }
      }}
    >
      {activeEnemyBestiaryBubble && <EnemyBestiaryBubble bubble={activeEnemyBestiaryBubble} />}
      {activeRewardItemBubble && (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-20 rounded-lg p-2 text-xs text-gray-700"
            style={{ top: activeRewardItemBubble.top, left: activeRewardItemBubble.left, width: 'max-content', maxWidth: activeRewardItemBubble.maxWidth }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {renderTextWithRaceIcons(activeRewardItemBubble.text)}
          </div>
        </FloatingBubblePortal>
      )}
      <DiaryPartyTabs parties={availableParties} selectedIndex={safeDiaryPartyIndex} onSelect={selectDiaryParty} />
      {renderDiarySettings()}
      {diaryLogs.map((diaryLog) => {
        const isSideQuestLog = diaryLog.triggers.includes('sideQuest');
        const isExpanded = isSideQuestLog ? false : !!expandedLogs[diaryLog.id];
        const log = diaryLog.expeditionLog;
        const diaryParty = parties.find((candidate) => candidate.name === diaryLog.partyName) ?? parties[0];
        const specialRewards = log.rewards.filter((item) => {
          const rarity = getItemRarityById(item.id);
          return rarity === 'bossRare' || rarity === 'mythicRare' || item.superRare > 0;
        });
        return (
          <div key={diaryLog.id} className="bg-pane rounded-lg p-3 shadow-md shadow-slate-900/10">
            <button
              onClick={() => {
                if (isSideQuestLog) {
                  if (!diaryLog.isRead) onOpenDiaryLog(diaryLog.id);
                  return;
                }
                const nextExpanded = !isExpanded;
                onSetExpandedLogs((prev) => ({ ...prev, [diaryLog.id]: nextExpanded }));
                if (nextExpanded && !diaryLog.isRead) {
                  onOpenDiaryLog(diaryLog.id);
                }
              }}
              className="w-full text-left text-sm"
            >
              <span className="flex items-start justify-between gap-2">
                <span className={`pr-2 ${diaryLog.isRead ? 'font-normal text-gray-500' : 'font-medium text-gray-900'}`}>
                  {getDiaryHeadline(diaryLog.partyName, diaryLog.triggers, log.rewards, log, diaryLog.sideQuestLabel, diaryLog.unlockHeadline)}
                </span>
                {!isSideQuestLog && <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>}
              </span>

              <span className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
                <span className="truncate">{diaryLog.unlockDetail ?? diaryLog.sideQuestDetail ?? log.dungeonName}</span>
                <span className="whitespace-nowrap text-right">{formatDiaryTimestamp(diaryLog.createdAt)}</span>
              </span>
            </button>

            {specialRewards.length > 0 && diaryLog.triggers.includes('defeat') && (
              <div className="mt-1 text-xs text-gray-500">
                {t('diary.specialRewards')}: {specialRewards.map((item, i) => {
                  const rarity = getItemRarityById(item.id);
                  const isSuperRare = item.superRare > 0;
                  const rarityClass = getRarityTextClass(rarity, isSuperRare);
                  const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
                  return (
                    <span key={`${item.id}-${item.enhancement}-${item.superRare}-${i}`} className={`${rarityClass} ${fontWeightClass}`}>
                      {i > 0 && ', '}
                      {getItemDisplayName(item)}
                    </span>
                  );
                })}
              </div>
            )}

            {isExpanded && (
              <div className="mt-3 space-y-2">
                <div className="text-sm text-gray-500">
                  EXP: +{formatNumber(log.totalExperience)}
                  {log.autoSellProfit > 0 && (
                    <span> | {formatAutoSellSummary(log.autoSellProfit, log.autoSellMultiplier)}</span>
                  )}
                </div>

                {log.rewards.length > 0 && (
                  <div className="text-sm">
                    <span className="text-gray-500">{t('home.battle.acquiredItemsLabel')} </span>
                    {log.rewards.map((item, i) => {
                      const rarity = getItemRarityById(item.id);
                      const isSuperRare = item.superRare > 0;
                      const rarityClass = getRarityTextClass(rarity, isSuperRare);
                      const fontWeightClass = getRewardFontWeightClass(rarity, isSuperRare);
                      return (
                        <Fragment key={i}>
                          {i > 0 && ', '}
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => handleRewardItemBubbleToggle(`diary-reward-${diaryLog.id}-${i}-${item.id}-${item.enhancement}-${item.superRare}`, item, event.currentTarget)}
                            className={`${rarityClass} ${fontWeightClass} align-baseline hover:underline`}
                          >
                            {getItemDisplayName(item)}
                          </button>
                        </Fragment>
                      );
                    })}
                  </div>
                )}

                <div className="border-t border-gray-200 pt-2 space-y-2">
                  {[...log.entries].reverse().map((entry, i, arr) => {
                    const originalIndex = arr.length - 1 - i;
                    let roomLabel: string;
                    if (entry.floor && entry.roomInFloor) {
                      roomLabel = `${entry.floor}F-${entry.roomInFloor}`;
                    } else {
                      const isBoss = entry.room === log.totalRooms + 1;
                      roomLabel = isBoss ? 'BOSS' : entry.room.toString();
                    }
                    const healAmount = Math.max(0, entry.healAmount ?? 0);
                    const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
                    const postBattleHP = typeof entry.postBattlePartyHP === 'number'
                      ? Math.min(entry.maxPartyHP, Math.max(0, entry.postBattlePartyHP))
                      : Math.min(entry.maxPartyHP, Math.max(0, entry.remainingPartyHP + attritionAmount - healAmount));
                    const startPartyHP = typeof entry.startPartyHP === 'number'
                      ? Math.min(entry.maxPartyHP, Math.max(0, entry.startPartyHP))
                      : Math.min(entry.maxPartyHP, Math.max(0, postBattleHP + entry.damageTaken));
                    const netLossAmount = Math.max(0, startPartyHP - entry.remainingPartyHP);
                    const currentHpWithoutHeal = Math.max(0, entry.remainingPartyHP - healAmount);
                    const remainingRatio = entry.maxPartyHP > 0 ? (currentHpWithoutHeal / entry.maxPartyHP) * 100 : 0;
                    const healRatio = entry.maxPartyHP > 0 ? (healAmount / entry.maxPartyHP) * 100 : 0;
                    const takenRatio = entry.maxPartyHP > 0 ? (netLossAmount / entry.maxPartyHP) * 100 : 0;
                    const enemyTakenAmount = Math.min(entry.enemyHP, Math.max(0, entry.damageDealt));
                    const enemyRemainingAmount = Math.max(0, entry.enemyHP - enemyTakenAmount);
                    const enemyRemainingRatio = entry.enemyHP > 0 ? (enemyRemainingAmount / entry.enemyHP) * 100 : 0;
                    const roomKey = `${diaryLog.id}-${originalIndex}`;
                    const isRoomExpanded = !!expandedRooms[roomKey];

                    return (
                      <div key={roomKey} className="bg-white rounded overflow-hidden shadow-[0_6px_16px_rgba(15,23,42,0.14)]">
                        <button
                          onClick={() => onSetExpandedRooms((prev) => ({ ...prev, [roomKey]: !isRoomExpanded }))}
                          className="relative isolate w-full overflow-hidden rounded text-left p-2 text-xs"
                        >
                          {renderEnemyLogChibiBackground(entry)}
                          <div className="relative z-10 flex justify-between items-center">
                            <span>
                              <span className="font-medium">
                                {roomLabel}:{' '}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const diaryDungeonExpLevel = DUNGEONS.find((dungeon) => dungeon.id === log.dungeonId)?.expLevel;
                                    const enemyLevel = typeof diaryDungeonExpLevel === 'number' && entry.floor && entry.roomType
                                      ? getEffectiveEnemyLevel(
                                          diaryDungeonExpLevel,
                                          entry.floor,
                                          entry.roomType,
                                          false,
                                          log.difficultyOffset ?? 0,
                                        )
                                      : null;
                                    handleEnemyBestiaryBubbleToggle(roomKey, entry, enemyLevel, event.currentTarget);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const diaryDungeonExpLevel = DUNGEONS.find((dungeon) => dungeon.id === log.dungeonId)?.expLevel;
                                    const enemyLevel = typeof diaryDungeonExpLevel === 'number' && entry.floor && entry.roomType
                                      ? getEffectiveEnemyLevel(
                                          diaryDungeonExpLevel,
                                          entry.floor,
                                          entry.roomType,
                                          false,
                                          log.difficultyOffset ?? 0,
                                        )
                                      : null;
                                    handleEnemyBestiaryBubbleToggle(roomKey, entry, enemyLevel, event.currentTarget);
                                  }}
                                  className="inline cursor-pointer rounded px-0.5 -mx-0.5 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                                >
                                  {renderEnemyNameWithMutedClass(entry.enemyName)}
                                </span>
                              </span>
                            </span>
                            <span className="flex items-center gap-2">
                              <span className={
                                entry.gateInfo ? 'text-gray-500 font-medium' :
                                entry.outcome === 'victory' ? 'text-sub font-medium' :
                                entry.outcome === 'defeat' ? 'text-accent font-medium' : 'text-accent font-medium'
                              }>
                                {entry.gateInfo ? t('diary.outcome.notReached') :
                                 entry.outcome === 'victory' ? t('diary.outcome.victory') :
                                 entry.outcome === 'defeat' ? t('diary.outcome.defeat') : t('diary.outcome.draw')}
                              </span>
                              <span className={`transform transition-transform ${isRoomExpanded ? 'rotate-180' : ''}`}>▼</span>
                            </span>
                          </div>
                          {(entry.gateInfo || entry.reward) && (
                            <div className="relative z-10 text-gray-500 mt-1 flex flex-wrap items-center gap-1">
                              {entry.gateInfo && <span className="text-accent">{entry.gateInfo}</span>}
                              {renderEntryReward(entry)}
                            </div>
                          )}
                          {!entry.gateInfo && (
                            <div className="relative z-10 mt-1 grid grid-cols-2 gap-2 text-gray-600">
                              <div>
                                <div className="mb-0.5">{t('home.battle.partyHpLabel')} {formatNumber(entry.remainingPartyHP)} / {formatNumber(entry.maxPartyHP)}</div>
                                <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgb(var(--color-hp-bar-empty) / var(--color-hp-bar-empty-alpha, 1))" }}>
                                  <div className="h-full" style={{ width: `${Math.min(100, remainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                  <div className="h-full" style={{ width: `${Math.min(100, healRatio)}%`, backgroundColor: 'rgb(var(--color-heal-bar))' }} />
                                  <div className="h-full" style={{ width: `${Math.min(100, takenRatio)}%`, backgroundColor: 'rgb(var(--color-hp-taken))' }} />
                                </div>
                              </div>
                              <div>
                                <div className="mb-0.5">{t('home.battle.enemyHpLabel')} {formatNumber(enemyRemainingAmount)} / {formatNumber(entry.enemyHP)}</div>
                                <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgb(var(--color-hp-bar-empty) / var(--color-hp-bar-empty-alpha, 1))" }}>
                                  <div className="h-full" style={{ width: `${Math.min(100, enemyRemainingRatio)}%`, backgroundColor: 'rgb(var(--color-hp-bar-mild))' }} />
                                </div>
                              </div>
                            </div>
                          )}
                        </button>
                        {isRoomExpanded && entry.details && (
                          <div className={`relative isolate overflow-hidden border-t border-gray-100 p-2 text-xs space-y-1 shadow-[0_8px_20px_rgba(15,23,42,0.14)] ${getEnemyLogBackgroundImagePath(entry.enemySnapshot) ? 'bg-gray-50 dark:bg-transparent' : 'bg-gray-50'}`}>
                            {getEnemyLogBackgroundImagePath(entry.enemySnapshot) && (
                              <>
                                <img
                                  src={getEnemyLogBackgroundImagePath(entry.enemySnapshot) ?? ''}
                                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
                                  alt=""
                                  aria-hidden="true"
                                  className="pointer-events-none select-none absolute left-1/2 top-0 h-auto -translate-x-1/2 object-contain object-top opacity-20 dark:opacity-25"
                                  style={{
                                    width: 'clamp(120%, calc(270% - 0.3 * 100vw), 150%)',
                                    maxWidth: 'none',
                                  }}
                                />
                                {!isDarkModeEnabled && <div className="pointer-events-none absolute inset-0 bg-white/35" aria-hidden="true" />}
                              </>
                            )}
                            <div className="relative z-10">
                            <div className="font-medium text-gray-600 mb-1">{`${typeof entry.floor === 'number' ? (getLocalizedExpeditionFloorConcept(log.dungeonId, entry.floor) ?? t('expedition.floor', { floor: formatNumber(entry.floor) })) : '-'} ${t('battleLog.title')}`}</div>
                            {aggregateBattleLifeDrainLogs(entry.details).map((battleLog, j, battleLogs) => {
                              const isResurrectLog = battleLog.note?.startsWith('(再起') || battleLog.note?.startsWith('(即時蘇生)');
                              const isTriggeredLog = battleLog.actor === 'triggered';
                              const isPhaseAction = battleLog.actor !== 'deity' && battleLog.actor !== 'effect';
                              const previousLog = j > 0 ? battleLogs[j - 1] : undefined;
                              const isStealthEffectLog = battleLog.actor === 'effect' && (battleLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || battleLog.action.includes('への攻撃はすべて幻だった！'));
                              const isCounterNegationEffectLog = battleLog.actor === 'effect' && battleLog.action.includes('反撃無効化により');
                              const previousWasStealthEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || previousLog.action.includes('への攻撃はすべて幻だった！'));
                              const previousWasCounterNegationEffectLog = !!previousLog && previousLog.actor === 'effect' && previousLog.action.includes('反撃無効化により');
                              const previousWasInPhaseEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.phase === 'combat');
                              const previousWasPhaseAction = !!previousLog && (previousLog.actor !== 'deity' && previousLog.actor !== 'effect');
                              const previousContinuesCurrentPhase = !!previousLog && (previousWasPhaseAction || previousWasStealthEffectLog || previousWasCounterNegationEffectLog || previousWasInPhaseEffectLog);
                              const shouldShowPhaseHeader = isPhaseAction && (!previousLog || !previousContinuesCurrentPhase || previousLog.phase !== battleLog.phase);
                              const shouldShowEndPhaseSpacer = !!previousLog && !isPhaseAction && previousWasPhaseAction;
                              const phaseLabel = getBattleLogPhaseLabel(battleLog, isPhaseAction, isTriggeredLog, !!isResurrectLog, !!isStealthEffectLog, !!isCounterNegationEffectLog);
                              const phaseHeader = battleLog.phase === 'combat' ? t('battleLog.phase.combat') : '';
                              const getPhaseIcon = (): UiIconKey => {
                                if (battleLog.elementalOffense === 'fire') return 'fire';
                                if (battleLog.elementalOffense === 'thunder') return 'thunder';
                                if (battleLog.elementalOffense === 'ice') return 'ice';
                                if (battleLog.attackType === 'ranged') return 'ranged';
                                if (battleLog.attackType === 'magical') return 'magic';
                                return 'melee';
                              };
                              const iconKey = getPhaseIcon();
                              const isEnemy = battleLog.actor === 'enemy';
                              const hits = battleLog.hits ?? 0;
                              const totalAttempts = battleLog.totalAttempts ?? 0;
                              const allMissed = totalAttempts > 0 && hits === 0 && !battleLog.wasNegated;
                              const hitDisplay = formatBattleLogHitDisplay(battleLog);
                              const trailingEffectMatch = /\(([^()]+)\)$/.exec(battleLog.action);
                              const trailingEffects = (trailingEffectMatch?.[1] ?? '')
                                .split(',')
                                .map(effect => effect.trim())
                                .filter(effect => /^(共鳴\+\d+%|残響\+\d+%)$/.test(effect));
                              const rageDisplay = battleLog.rageBonusPercent && battleLog.rageBonusPercent > 0
                                ? t('battleLog.extra.rage', { percent: battleLog.rageBonusPercent })
                                : '';
                              const momentumDisplay = typeof battleLog.momentumBonusPercent === 'number'
                                ? t('battleLog.extra.momentum', { sign: battleLog.momentumBonusPercent >= 0 ? '+' : '', percent: battleLog.momentumBonusPercent })
                                : '';
                              const ambushDisplay = typeof battleLog.ambushMultiplier === 'number' && battleLog.ambushMultiplier > 1
                                ? t('battleLog.extra.ambush', { multiplier: formatDecimal(battleLog.ambushMultiplier, 2, 0) })
                                : '';
                              const overwatchDisplay = typeof battleLog.overwatchMultiplier === 'number' && battleLog.overwatchMultiplier > 1
                                ? t('battleLog.extra.overwatch', { multiplier: formatDecimal(battleLog.overwatchMultiplier, 2, 0) })
                                : '';
                              const executionDisplay = typeof battleLog.executionMultiplier === 'number' && battleLog.executionMultiplier > 1
                                ? t('battleLog.extra.execution', { multiplier: formatDecimal(battleLog.executionMultiplier, 2, 0) })
                                : '';
                              const swarmActorDisplay = typeof battleLog.swarmActorPenaltyPercent === 'number' && battleLog.swarmActorPenaltyPercent > 0
                                ? t('battleLog.extra.powerDown', { percent: battleLog.swarmActorPenaltyPercent })
                                : '';
                              const swarmOpponentDisplay = typeof battleLog.swarmOpponentBonusPercent === 'number' && battleLog.swarmOpponentBonusPercent > 0
                                ? t('battleLog.extra.opponentDamageUp', { percent: battleLog.swarmOpponentBonusPercent })
                                : '';

                              let actionText: string;
                              if (battleLog.actor === 'effect' || battleLog.actor === 'triggered') {
                                actionText = battleLog.action;
                              } else if (isEnemy) {
                                if (isResurrectLog) {
                                  actionText = t('battleLog.action.enemyResurrect', { action: battleLog.action });
                                } else if (battleLog.isEnemyTargetHit) {
                                  actionText = allMissed
                                    ? t('battleLog.action.targetHitMissed', { action: battleLog.action.replace('命中！', '') })
                                    : battleLog.action;
                                } else if (allMissed) {
                                  actionText = t('battleLog.action.enemyMissed', { action: battleLog.action.replace('！', '') });
                                } else if (battleLogActionIncludesEnemyName(battleLog.action, entry)) {
                                  actionText = battleLog.action;
                                } else {
                                  actionText = t('battleLog.action.enemyActed', { action: battleLog.action });
                                }
                              } else {
                                if (allMissed) {
                                  const charName = battleLog.action.replace(/ の.*$/, '');
                                  actionText = t('battleLog.action.partyMissed', { actor: charName });
                                } else {
                                  actionText = battleLog.action;
                                }
                              }

                              const extraSegments = [
                                ...trailingEffects,
                                rageDisplay,
                                momentumDisplay,
                                ambushDisplay,
                                overwatchDisplay,
                                executionDisplay,
                                swarmActorDisplay,
                                swarmOpponentDisplay,
                              ].filter(Boolean);
                              const mergedExtraSegments = Array.from(new Set(extraSegments));
                              const compactHitDisplay = hitDisplay && mergedExtraSegments.length > 0
                                ? t('battleLog.hitsWithExtras', { hits, total: totalAttempts, extras: mergedExtraSegments.join(', ') })
                                : hitDisplay;
                              const actionDisplay = trailingEffects.length > 0 && !allMissed
                                ? actionText.replace(/\([^()]+\)$/, '')
                                : actionText;
                              const actionDisplayNode = renderBattleLogTextWithInlineChibis(actionDisplay, diaryParty, entry);
                              const shouldRenderResurrectBeforeHeader = isResurrectLog && shouldShowPhaseHeader;
                              const isReflectDamageLog = !!battleLog.reflectedDamage && battleLog.reflectedDamage > 0;
                              const isAbsorbDamageLog = !!battleLog.absorbedDamage && battleLog.absorbedDamage > 0;
                              const reflectArrowClass = battleLog.reflectTarget === 'party' ? 'text-accent' : 'text-sub';
                              const absorbArrowClass = battleLog.absorbTarget === 'enemy' ? 'text-accent' : 'text-sub';
                              const damageColorClass = (battleLog.damageTarget ?? (isEnemy ? 'party' : 'enemy')) === 'party' ? 'text-accent' : 'text-sub';
                              const damageEmojiClass = damageColorClass === 'text-accent' ? 'accent-theme-emoji-icon' : 'sub-theme-emoji-icon';
                              const damageDisplay = ((battleLog.damage !== undefined && (battleLog.damage > 0 || battleLog.showZeroDamage)) || isReflectDamageLog || isAbsorbDamageLog) && (
                                isReflectDamageLog
                                  ? (
                                    <span className="ml-auto shrink-0 whitespace-nowrap text-right text-gray-500">
                                      ({renderUiIcon(iconKey, damageEmojiClass)}{' '}{formatNumber(battleLog.damage ?? 0)}, <span className={reflectArrowClass}>{t('battleLog.damage.reflected')} {formatNumber(battleLog.reflectedDamage || 0)}</span>)
                                    </span>
                                  )
                                  : isAbsorbDamageLog
                                    ? (
                                      <span className="ml-auto shrink-0 whitespace-nowrap text-right text-gray-500">
                                        ({renderUiIcon(iconKey, damageEmojiClass)}{' '}<span className={absorbArrowClass}>{t('battleLog.damage.absorbed')} {formatNumber(battleLog.absorbedDamage || 0)}</span>)
                                      </span>
                                    )
                                    : (
                                      <span className={`ml-auto shrink-0 whitespace-nowrap text-right ${damageColorClass}`}>
                                        ({renderUiIcon(iconKey, damageEmojiClass)}{' '}{formatNumber(battleLog.damage ?? 0)})
                                      </span>
                                    )
                              );

                              return (
                                <div key={j}>
                                  {shouldRenderResurrectBeforeHeader && (
                                    <div className="flex items-start justify-between gap-2 text-gray-600">
                                      <span className="min-w-0">
                                        <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                        {actionDisplayNode}
                                        {renderBattleLogNote(battleLog.note, battleLog.noteTone)}
                                        {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                      </span>
                                      {damageDisplay}
                                    </div>
                                  )}
                                  {shouldShowPhaseHeader && <div className="text-gray-400">({phaseHeader})</div>}
                                  {(!isResurrectLog || !shouldRenderResurrectBeforeHeader) && (
                                  <div className={`flex items-start justify-between gap-2 text-gray-600 ${shouldShowEndPhaseSpacer ? 'mt-1' : ''}`}>
                                    <span className="min-w-0">
                                      <span className="text-gray-400">[{phaseLabel}]</span>{' '}
                                      {actionDisplayNode}
                                      {renderBattleLogNote(battleLog.note, battleLog.noteTone)}
                                      {compactHitDisplay && <span className="text-gray-400">{compactHitDisplay}</span>}
                                    </span>
                                    {damageDisplay}
                                  </div>
                                  )}
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
