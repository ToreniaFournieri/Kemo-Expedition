import { Fragment,memo,useEffect,useRef,useState,type Dispatch,type SetStateAction } from 'react';
import {
DUNGEONS,
getEffectiveEnemyLevel,
getLocalizedExpeditionFloorConcept
} from '../../../data/dungeons';
import {
hasDefeatedDungeonBoss
} from '../../../game/clearGate';
import { DebugSettings,getTimeSpeedScale } from '../../../game/debugSettings';
import { getDifficultyOffsetItemChanceTickets,getDifficultyOffsetMax,getDifficultyOffsetSuperRareChanceTickets,normalizeDifficultyOffset } from '../../../game/difficultyOffset';
import { getItemDisplayName } from '../../../game/gameState';
import { EXPEDITION_SIMULATION_RUN_COUNT } from '../../../game/expeditionSimulation';
import { formatInstantExpeditionChargeDisplay,getInstantExpeditionChargeState } from '../../../game/instantExpedition';
import { computePartyStats,type ComputedPartyStatus } from '../../../game/partyComputation';
import { t } from '../../../i18n';
import { EnemyDef,ExpeditionDepthLimit,ExpeditionDestinationMode,ExpeditionLogEntry,ExpeditionSimulationResult,GameState,Item,Party } from '../../../types';


import {
aggregateBattleLifeDrainLogs,
battleLogActionIncludesEnemyName,
EnemyBestiaryBubble,
EXPLORING_PROGRESS_TOTAL_STEPS,
FloatingBubblePortal,
formatAutoSellSummary,
formatBattleLogHitDisplay,
formatDecimal,
formatNumber,
getAutoSellStepCount,
getBattleLogPhaseLabel,
getBestiaryEnemyFromLogEntry,
getCompactProgressItems,
getConditionLabel,
getDisplayedExpeditionStats,
getDungeonEntryGateState,
getEnemyLogBackgroundImagePath,
getExpeditionDepthOptions,
getExpeditionOutcomeLabel,
getExplorationVisibleRoomCount,
getItemInventoryDetailText,
getItemRarityById,
getPartyCycleStateLabel,
getRarityTextClass,
getRewardFontWeightClass,
getRewardItemBubblePosition,
getSliderProgressStyle,
IOS_GLASS_BUTTON_CLASS,
IOS_GLASS_SLIDER_CLASS,
isGodsBattleAvailable,
PartyCycleRuntime,
renderBattleLogNote,
renderBattleLogTextWithInlineChibis,
renderEnemyLogChibiBackground,
renderEnemyNameWithMutedClass,
renderEntryReward,
renderTextWithRaceIcons,
renderUiIcon,
REST_HEAL_MAX_HP_RATIO,
REST_HEAL_MIN_HP,
RewardItemBubble,
STEP_BASED_STATES,
UiIconKey
} from '../homeShared';

interface ExpeditionTabProps {
  state: GameState;
  debugSettings: DebugSettings;
  emulatedNowMs: number;
  onSelectDungeon: (partyIndex: number, dungeonId: number) => void;
  onToggleExpeditionDestinationMode: (partyIndex: number, nextMode: ExpeditionDestinationMode) => void;
  onSetExpeditionDepthLimit: (partyIndex: number, depthLimit: ExpeditionDepthLimit) => void;
  onSetExpeditionDifficultyOffset: (partyIndex: number, difficultyOffset: number) => void;
  onResetExpeditionStats: (partyIndex: number) => void;
  onSimulateExpedition: (partyIndex: number, onProgress?: (completed: number, total: number) => void) => Promise<ExpeditionSimulationResult>;
  isExpeditionStatsDisplayEnabled: boolean;
  partyCycles: Record<number, PartyCycleRuntime>;
  afkRecoveryProgressPercent: number | null;
  afkRecoveryCompletedMs: number;
  afkRecoveryTotalMs: number;
  onTriggerSortie: (partyIndex: number, triggerGodsBattle?: boolean) => void;
  expandedLogParty: number | null;
  setExpandedLogParty: Dispatch<SetStateAction<number | null>>;
  expandedRoom: { partyIndex: number; roomIndex: number; latestRoomToken: string } | null;
  setExpandedRoom: Dispatch<SetStateAction<{ partyIndex: number; roomIndex: number; latestRoomToken: string } | null>>;
  isDarkModeEnabled: boolean;
  computePartyStatus?: (party: Party) => ComputedPartyStatus;
  afkPresentationVersion: number;
  throttleAfkPublications: boolean;
}

function ExpeditionTab({
  state,
  debugSettings,
  emulatedNowMs,
  onSelectDungeon,
  onToggleExpeditionDestinationMode,
  onSetExpeditionDepthLimit,
  onSetExpeditionDifficultyOffset,
  onResetExpeditionStats,
  onSimulateExpedition,
  isExpeditionStatsDisplayEnabled,
  partyCycles,
  afkRecoveryProgressPercent,
  afkRecoveryCompletedMs,
  afkRecoveryTotalMs,
  onTriggerSortie,
  expandedLogParty,
  setExpandedLogParty,
  expandedRoom,
  setExpandedRoom,
  isDarkModeEnabled,
  computePartyStatus = computePartyStats,
}: ExpeditionTabProps) {
  const [liveProgressNowMs, setLiveProgressNowMs] = useState(() => Date.now());
  const [activeEnemyBestiaryBubble, setActiveEnemyBestiaryBubble] = useState<{
    key: string;
    enemy: EnemyDef;
    enemyLevel: number | null;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [activeRewardItemBubble, setActiveRewardItemBubble] = useState<RewardItemBubble | null>(null);
  const [simulationByParty, setSimulationByParty] = useState<Record<number, {
    status: 'running' | 'complete' | 'error';
    completed: number;
    total: number;
    result?: ExpeditionSimulationResult;
  }>>({});
  const simulationRequestIdByParty = useRef<Record<number, number>>({});
  const [activeSimulationResultBubble, setActiveSimulationResultBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);
  const [activeProgressBubble, setActiveProgressBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);
  const [disclosedExpeditionLogs, setDisclosedExpeditionLogs] = useState<Array<Party['lastExpeditionLog'] | null>>(() =>
    state.parties.map((party) => party.lastExpeditionLog)
  );

  useEffect(() => {
    if (afkRecoveryProgressPercent !== null) return;
    const timer = window.setInterval(() => setLiveProgressNowMs(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [afkRecoveryProgressPercent]);

  const progressNowMs = afkRecoveryProgressPercent === null ? liveProgressNowMs : emulatedNowMs;

  useEffect(() => {
    // SpecRef: 8.3 | UI_EXPEDITION | Update Timing
    // The engine prepares the latest expedition log while state.explore is still
    // animating. Keep the headline floor/outcome pinned to the last disclosed
    // log until exploration finishes so the first row does not spoil the result.
    setDisclosedExpeditionLogs((previousLogs) => {
      let changed = previousLogs.length !== state.parties.length;
      const nextLogs = state.parties.map((party, index) => {
        const cycleState = partyCycles[index]?.state ?? 'idle';
        if (cycleState === 'explore') return previousLogs[index] ?? null;
        const nextLog = party.lastExpeditionLog ?? null;
        if (previousLogs[index] !== nextLog) changed = true;
        return nextLog;
      });
      return changed ? nextLogs : previousLogs;
    });
  }, [state.parties, partyCycles]);
  const [activeRingStatusBubble, setActiveRingStatusBubble] = useState<{
    key: string;
    text: string;
    top: number;
    left: number;
    maxWidth: number;
  } | null>(null);

  const getEstimatedStartHp = (entry: ExpeditionLogEntry) => {
    if (typeof entry.startPartyHP === 'number') {
      return Math.min(entry.maxPartyHP, Math.max(0, entry.startPartyHP));
    }
    const healAmount = Math.max(0, entry.healAmount ?? 0);
    const attritionAmount = Math.max(0, entry.attritionAmount ?? 0);
    return Math.min(entry.maxPartyHP, Math.max(0, entry.remainingPartyHP + entry.damageTaken + attritionAmount - healAmount));
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

    // SpecRef: 8.3 | UI_EXPEDITION | f.battle_logs
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

  const handleProgressBubbleToggle = (
    bubbleKey: string,
    bubbleText: string,
    targetElement: HTMLElement,
  ) => {
    if (activeProgressBubble?.key === bubbleKey) {
      setActiveProgressBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleMaxWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleMaxWidth,
    );

    // SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
    setActiveProgressBubble({
      key: bubbleKey,
      text: bubbleText,
      top: triggerRect.bottom + 8,
      left,
      maxWidth: bubbleMaxWidth,
    });
  };

  const handleRingStatusBubbleToggle = (
    bubbleKey: string,
    bubbleText: string,
    targetElement: HTMLElement,
  ) => {
    if (activeRingStatusBubble?.key === bubbleKey) {
      setActiveRingStatusBubble(null);
      return;
    }

    const triggerRect = targetElement.getBoundingClientRect();
    const viewportPadding = 12;
    const bubbleMaxWidth = Math.min(360, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(triggerRect.left, viewportPadding),
      window.innerWidth - viewportPadding - bubbleMaxWidth,
    );

    setActiveRingStatusBubble({
      key: bubbleKey,
      text: bubbleText,
      top: triggerRect.bottom + 8,
      left,
      maxWidth: bubbleMaxWidth,
    });
  };

  const handleRewardItemBubbleToggle = (bubbleKey: string, item: Item, targetElement: HTMLElement) => {
    if (activeRewardItemBubble?.key === bubbleKey) {
      setActiveRewardItemBubble(null);
      return;
    }

    // SpecRef: 8.3 | UI_EXPEDITION | f.battle_logs
    setActiveRewardItemBubble({
      key: bubbleKey,
      text: getItemInventoryDetailText(item),
      ...getRewardItemBubblePosition(targetElement),
    });
  };

  const clearPartySimulation = (partyIndex: number) => {
    simulationRequestIdByParty.current[partyIndex] = (simulationRequestIdByParty.current[partyIndex] ?? 0) + 1;
    setActiveSimulationResultBubble((current) => current?.key === `simulation:${partyIndex}` ? null : current);
    setSimulationByParty((current) => {
      if (!current[partyIndex]) return current;
      const next = { ...current };
      delete next[partyIndex];
      return next;
    });
  };

  const handleSimulationRun = async (partyIndex: number) => {
    const requestId = (simulationRequestIdByParty.current[partyIndex] ?? 0) + 1;
    simulationRequestIdByParty.current[partyIndex] = requestId;
    setActiveSimulationResultBubble((current) => current?.key === `simulation:${partyIndex}` ? null : current);
    setSimulationByParty((current) => ({
      ...current,
      [partyIndex]: { status: 'running', completed: 0, total: EXPEDITION_SIMULATION_RUN_COUNT },
    }));

    try {
      const result = await onSimulateExpedition(partyIndex, (completed, total) => {
        if (simulationRequestIdByParty.current[partyIndex] !== requestId) return;
        setSimulationByParty((current) => ({
          ...current,
          [partyIndex]: { status: 'running', completed, total },
        }));
      });
      if (simulationRequestIdByParty.current[partyIndex] !== requestId) return;
      setSimulationByParty((current) => ({
        ...current,
        [partyIndex]: { status: 'complete', completed: result.total, total: result.total, result },
      }));
    } catch {
      if (simulationRequestIdByParty.current[partyIndex] !== requestId) return;
      setSimulationByParty((current) => ({
        ...current,
        [partyIndex]: { status: 'error', completed: 0, total: EXPEDITION_SIMULATION_RUN_COUNT },
      }));
    }
  };

  return (
    <div
      className="space-y-1.5"
      onPointerDown={() => {
        if (activeSimulationResultBubble) {
          setActiveSimulationResultBubble(null);
        }
        if (activeProgressBubble) {
          setActiveProgressBubble(null);
        }
        if (activeEnemyBestiaryBubble) {
          setActiveEnemyBestiaryBubble(null);
        }
        if (activeRingStatusBubble) {
          setActiveRingStatusBubble(null);
        }
        if (activeRewardItemBubble) {
          setActiveRewardItemBubble(null);
        }
      }}
    >
      {activeRewardItemBubble ? (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane fixed z-20 rounded-lg p-2 text-xs text-gray-700"
            style={{
              top: activeRewardItemBubble.top,
              left: activeRewardItemBubble.left,
              width: 'max-content',
              maxWidth: activeRewardItemBubble.maxWidth,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {renderTextWithRaceIcons(activeRewardItemBubble.text)}
          </div>
        </FloatingBubblePortal>
      ) : null}
      {activeSimulationResultBubble ? (
        <FloatingBubblePortal>
          <div
            className="floating-bubble-pane pointer-events-none fixed z-30 -translate-y-full rounded-lg p-2"
            style={{
              top: activeSimulationResultBubble.top,
              left: activeSimulationResultBubble.left,
              width: 'max-content',
              maxWidth: activeSimulationResultBubble.maxWidth,
            }}
            role="tooltip"
          >
            <div className="whitespace-nowrap text-xs leading-snug text-gray-700">
              {activeSimulationResultBubble.text}
            </div>
          </div>
        </FloatingBubblePortal>
      ) : null}
      {activeProgressBubble ? (
        <div
          className="floating-bubble-pane fixed z-20 rounded-lg p-2"
          style={{
            top: activeProgressBubble.top,
            left: activeProgressBubble.left,
            width: 'max-content',
            maxWidth: activeProgressBubble.maxWidth,
          }}
        >
          <div className="text-xs text-gray-700 leading-snug break-words">
            {activeProgressBubble.text}
          </div>
        </div>
      ) : null}
      {activeEnemyBestiaryBubble && <EnemyBestiaryBubble bubble={activeEnemyBestiaryBubble} />}
      {activeRingStatusBubble ? (
        <div
          className="floating-bubble-pane fixed z-20 rounded-lg p-2"
          style={{
            top: activeRingStatusBubble.top,
            left: activeRingStatusBubble.left,
            width: 'max-content',
            maxWidth: activeRingStatusBubble.maxWidth,
          }}
        >
          <div className="whitespace-pre-line text-xs text-gray-700 leading-snug break-words">
            {activeRingStatusBubble.text}
          </div>
        </div>
      ) : null}
      {[0, 1, 2, 3, 4, 5].map((partyIndex) => {
        const party = state.parties[partyIndex];
        if (!party) {
          const lockedPartyUnlockTextByIndex: Partial<Record<number, string>> = {
            1: t('home.party.locked.clearVarunSea'),
            2: t('home.party.locked.clearFelidyDesert'),
            3: t('home.party.locked.clearUrsanBlaze'),
            4: t('home.party.locked.clearProcyonNest'),
            5: t('home.party.locked.clearLeporianMoon'),
          };
          const lockedPartyHintVisibleRequirementByIndex: Partial<Record<number, number>> = {
            1: 2,
            2: 3,
            3: 4,
            4: 5,
            5: 6,
          };
          // SpecRef: 5.1.3.2 | Unlock party | Unlock Party
          const hintVisibleRequiredBossDungeonId = lockedPartyHintVisibleRequirementByIndex[partyIndex];
          const isHintVisible = typeof hintVisibleRequiredBossDungeonId === 'number'
            ? state.parties.some((existingParty) => hasDefeatedDungeonBoss(existingParty, hintVisibleRequiredBossDungeonId))
            : false;
          if (!isHintVisible) return null;
          const lockedPartyText = lockedPartyUnlockTextByIndex[partyIndex] ?? t('home.party.locked.unreleased');
          return <div key={partyIndex} className="bg-pane rounded-lg p-2"><div className="text-xs text-gray-400">PT{partyIndex + 1}: {lockedPartyText}</div></div>;
        }

        const selectedDungeon = DUNGEONS.find(d => d.id === party.selectedDungeonId);
        // SpecRef: 8.3 | UI_EXPEDITION | Difficulty Offset (難易度)
        const isDifficultyOffsetUnlocked = hasDefeatedDungeonBoss(party, party.selectedDungeonId);
        const difficultyOffsetMax = getDifficultyOffsetMax(selectedDungeon?.expLevel ?? 88);
        const selectedDifficultyOffset = isDifficultyOffsetUnlocked
          ? normalizeDifficultyOffset(party.expeditionDifficultyOffsetByDungeon?.[party.selectedDungeonId] ?? party.expeditionDifficultyOffset, difficultyOffsetMax)
          : 0;
        const difficultyItemChanceTickets = getDifficultyOffsetItemChanceTickets(selectedDifficultyOffset);
        const difficultySuperRareChanceTickets = getDifficultyOffsetSuperRareChanceTickets(selectedDifficultyOffset);
        const getDifficultyOffsetBubbleText = (offset: number) => t('home.expedition.difficultyOffsetBubble', { enemyLevel: formatNumber(offset), itemChance: formatNumber(getDifficultyOffsetItemChanceTickets(offset)), superRareChance: formatNumber(getDifficultyOffsetSuperRareChanceTickets(offset)) });
        const selectedDungeonGate = selectedDungeon ? getDungeonEntryGateState(party, selectedDungeon) : null;
        const cycle = partyCycles[partyIndex] ?? { state: 'idle', stateStartedAt: progressNowMs, durationMs: 1000 };
        const cycleElapsedMs = Math.max(0, progressNowMs - cycle.stateStartedAt);
        const { partyStats } = computePartyStatus(party);
        const isLogExpanded = expandedLogParty === partyIndex;
        const currentLog = party.lastExpeditionLog;
        const disclosedLog = cycle.state === 'explore'
          ? disclosedExpeditionLogs[partyIndex] ?? null
          : currentLog;
        const currentLogDungeonExpLevel = DUNGEONS.find((dungeon) => dungeon.id === currentLog?.dungeonId)?.expLevel;
        // SpecRef: 8.3 | UI_EXPEDITION | First row text / Update Timing
        const headlineFloorName = (() => {
          if (!disclosedLog) return selectedDungeon?.name ?? '-';
          const latestEntry = disclosedLog.entries[disclosedLog.entries.length - 1];
          if (!latestEntry?.floor) return disclosedLog.dungeonName;
          return getLocalizedExpeditionFloorConcept(disclosedLog.dungeonId, latestEntry.floor)
            ?? t('expedition.floor', { floor: formatNumber(latestEntry.floor) });
        })();
        const headlineState = disclosedLog
          ? getExpeditionOutcomeLabel(disclosedLog.finalOutcome)
          : getPartyCycleStateLabel(cycle.state);
        const conditionLabel = getConditionLabel(party.condition, true);
        const simulation = simulationByParty[partyIndex];
        // A locked Clear-Gate can turn a nominal "all" run back early, so use
        // the authoritative aggregate outcome instead of inferring the label
        // from the configured depth selector alone.
        const simulationUsesClearLabel = simulation?.result
          ? simulation.result.Turned_Back === 0
          : party.expeditionDepthLimit === 'all';
        const simulationResultText = simulation?.status === 'complete' && simulation.result
          ? t(simulationUsesClearLabel
            ? 'party.expedition.simulationResult.clear'
            : 'party.expedition.simulationResult.return', {
            success: formatDecimal((simulationUsesClearLabel
              ? simulation.result.Clear
              : simulation.result.Turned_Back) / simulation.result.total * 100, 1),
            draw: formatDecimal(simulation.result.Draw_Retreat / simulation.result.total * 100, 1),
            retreat: formatDecimal(simulation.result.Wounded_Retreat / simulation.result.total * 100, 1),
            defeat: formatDecimal(simulation.result.Defeat / simulation.result.total * 100, 1),
          })
          : null;

        const displayedEntries = (() => {
          if (!currentLog) return [];
          if (cycle.state !== 'explore') return currentLog.entries;
          const visibleCount = getExplorationVisibleRoomCount(cycleElapsedMs, cycle.durationMs, currentLog.entries.length);
          return currentLog.entries.slice(0, visibleCount);
        })();

        const displayedHp = (() => {
          if (cycle.state !== 'explore' || !currentLog || currentLog.entries.length === 0) return party.currentHp;
          if (displayedEntries.length === 0) return getEstimatedStartHp(currentLog.entries[0]);
          return displayedEntries[displayedEntries.length - 1].remainingPartyHP;
        })();
        const hpPercent = Math.min(100, Math.round((displayedHp / Math.max(1, partyStats.hp)) * 100));
        const normalizedCondition = Math.max(-400, Math.min(400, Math.floor(party.condition)));
        const conditionPercent = Math.min(100, Math.round((Math.abs(normalizedCondition) / 400) * 100));
        const isConditionPositive = normalizedCondition >= 0;
        const conditionRingStroke = isConditionPositive
          ? 'rgb(var(--color-sub) / 0.78)'
          : 'rgb(var(--color-accent) / 0.52)';
        const sellProgressState = (() => {
          if (cycle.state !== 'sell') return null;
          const autoSellItems = party.lastExpeditionLog?.autoSellItems ?? [];
          const sellStepCount = getAutoSellStepCount(party);
          const rawSellProgress = Math.min(1, cycleElapsedMs / Math.max(1, cycle.durationMs));
          const completedSteps = Math.min(sellStepCount, Math.floor(rawSellProgress * sellStepCount));
          const activeStep = Math.max(0, Math.min(sellStepCount - 1, completedSteps));
          const activeItem = autoSellItems[Math.min(activeStep, Math.max(0, autoSellItems.length - 1))];
          return {
            percent: (completedSteps / sellStepCount) * 100,
            completedSteps,
            activeStep,
            activeItem,
          };
        })();

        const progressPercent = afkRecoveryProgressPercent ?? (() => {
          // SpecRef: 5.1 | PROGRESS | Step Progress behavior by state
          if (cycle.state === 'idle') return 100;
          if (cycle.state === 'reactivate') return 100;
          if (cycle.state === 'explore') {
            return (Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, displayedEntries.length) / EXPLORING_PROGRESS_TOTAL_STEPS) * 100;
          }
          if (cycle.state === 'rest') {
            const totalSteps = Math.max(1, cycle.restInitialTotalSteps ?? 1);
            const healPerStep = Math.max(REST_HEAL_MIN_HP, Math.ceil(partyStats.hp * REST_HEAL_MAX_HP_RATIO));
            const missingHp = Math.max(0, partyStats.hp - party.currentHp);
            const remainingSteps = missingHp <= 0 ? 0 : Math.ceil(missingHp / healPerStep);
            const completedSteps = Math.max(0, Math.min(totalSteps, totalSteps - remainingSteps));
            return (completedSteps / totalSteps) * 100;
          }
          if (sellProgressState !== null) {
            return sellProgressState.percent;
          }
          return Math.min(100, (cycleElapsedMs / Math.max(1, cycle.durationMs)) * 100);
        })();
        const normalizedProgressPercent = Number.isFinite(progressPercent)
          ? Math.max(0, Math.min(100, progressPercent))
          : 0;
        const visualProgressPercent = afkRecoveryProgressPercent !== null && normalizedProgressPercent <= 0
          ? 1
          : normalizedProgressPercent;
        // SpecRef: 8.3 | UI_EXPEDITION | Sub progress bar
        const subProgressPercent = (() => {
          if (!STEP_BASED_STATES.has(cycle.state)) return null;
          const totalStepCount = cycle.state === 'rest'
            ? Math.max(1, cycle.restInitialTotalSteps ?? 1)
            : cycle.state === 'sell'
            ? getAutoSellStepCount(party)
            : Math.max(1, currentLog?.entries.length ?? 1);
          const stepDurationMs = cycle.state === 'rest'
            ? Math.max(1, cycle.durationMs)
            : Math.max(1, cycle.durationMs / totalStepCount);
          const elapsedWithinStepMs = cycleElapsedMs % stepDurationMs;
          return Math.min(100, (elapsedWithinStepMs / stepDurationMs) * 100);
        })();
        const progressLabel = (() => {
          if (afkRecoveryProgressPercent !== null) {
            // SpecRef: 5.1.1 | Party State Machine | Refresh Handling
            // Show AFK recovery progress as percent + completed/total seconds so refresh resumes with the same visible counts.
            const totalSeconds = Math.max(1, Math.ceil(afkRecoveryTotalMs / 1000));
            const completedSeconds = Math.max(0, Math.min(totalSeconds, Math.floor(afkRecoveryCompletedMs / 1000)));
            const percentText = `${Math.round(normalizedProgressPercent)}%`;
            return `${getPartyCycleStateLabel('reactivate')} ${percentText} (${formatNumber(completedSeconds)}/${formatNumber(totalSeconds)})`;
          }
          // SpecRef: 8.3 | UI_EXPEDITION | Party state progress bar
          return getPartyCycleStateLabel(cycle.state);
        })();
        const hpForSortieCheck = cycle.state === 'explore' ? displayedHp : party.currentHp;
        // SpecRef: 8.3 | UI_EXPEDITION | Charge
        const instantChargeState = getInstantExpeditionChargeState(party, progressNowMs);
        const instantChargeDisplay = formatInstantExpeditionChargeDisplay(instantChargeState);
        const instantChargeLabel = instantChargeDisplay.label;
        const isInstantExpeditionStockEmpty = instantChargeState.stock <= 0;
        const isColosseumSelected = selectedDungeon?.id === 99;
        // SpecRef: 8.3 | UI_EXPEDITION | "出撃" / "神魔戦" Buttons
        const isPendingGodsBattleMove = cycle.state === 'move' && cycle.isCurrentExpeditionGodsBattle === true;
        const isPartyHpDepletedForSortie = hpForSortieCheck <= 0 || partyStats.hp <= 0;
        const isSortieDisabled = !isColosseumSelected && (
          !!selectedDungeonGate?.locked
          || (isPartyHpDepletedForSortie && isInstantExpeditionStockEmpty)
          || (cycle.state === 'explore' && isInstantExpeditionStockEmpty)
        );
        const canTriggerGodsBattle = cycle.state === 'explore'
          ? cycle.isCurrentExpeditionGodsBattle === true
          : isGodsBattleAvailable(party, party.selectedDungeonId);
        const isGodsBattleButtonDisabled = isSortieDisabled || isPendingGodsBattleMove;
        const expeditionControlGridClass = canTriggerGodsBattle
          ? 'grid grid-cols-[2.75rem_minmax(0,1fr)_auto_auto_auto] items-center gap-2 text-sm text-gray-700'
          : 'grid grid-cols-[2.75rem_minmax(0,1fr)_auto_auto] items-center gap-2 text-sm text-gray-700';
        // SpecRef: 8.3 | UI_EXPEDITION | Gods Battle (神魔戦)
        // SpecRef: 8.3 | UI_EXPEDITION | Party Pane Visual State
        const isGodsBattleInProgress = (
          cycle.state === 'move'
          || cycle.state === 'explore'
        ) && cycle.isCurrentExpeditionGodsBattle === true;
        // SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
        const compactProgressItems = getCompactProgressItems(
          party,
          getTimeSpeedScale(debugSettings),
          progressNowMs,
          cycle.state,
        );
        const displayedExpeditionStats = getDisplayedExpeditionStats(party, cycle.state);
        const partyPaneExpeditionId = cycle.state === 'explore'
          ? currentLog?.dungeonId
          : party.selectedDungeonId;
        const expeditionPaneBackgroundImageById: Record<number, string> = {
          1: 'Caninian-Plains.png',
          2: 'Lupinian-Taiga.png',
          3: 'Vulpinian-Ocean.png',
          4: 'Felidian-Desert.png',
          5: 'Ursan-Pyrepeak.png',
          6: 'Procyonian-Burrow.png',
          7: 'Leporian-Moon-Palace.png',
          8: 'Cervin-Vale.png',
        };
        const expeditionPaneBackgroundImage = partyPaneExpeditionId
          ? expeditionPaneBackgroundImageById[partyPaneExpeditionId]
          : undefined;
        // SpecRef: 8.3 | UI_EXPEDITION | Background images for expedition pane
        const expeditionPaneBackgroundStyle = expeditionPaneBackgroundImage
          ? {
            backgroundColor: isDarkModeEnabled ? 'rgb(15 23 42 / 0.40)' : undefined,
            backgroundImage: isDarkModeEnabled
              ? undefined
              : 'linear-gradient(rgb(255 255 255 / 0.72), rgb(255 255 255 / 0.72))',
            backgroundSize: '100% 100%',
            backgroundPosition: 'top left',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'scroll',
          }
          : undefined;
        const expeditionPaneImageLayerStyle = expeditionPaneBackgroundImage
          ? {
            opacity: isDarkModeEnabled ? 0.34 : 0.34,
            maskImage: 'linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 72%, rgb(0 0 0 / 0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgb(0 0 0 / 1) 0%, rgb(0 0 0 / 1) 72%, rgb(0 0 0 / 0) 100%)',
            transform: 'scale(1.01)',
            transformOrigin: 'top center',
          }
          : undefined;

        return (
          <div
            key={partyIndex}
            className={`bg-pane expedition-party-pane relative rounded-lg px-1 pt-0.5 pb-0 overflow-hidden shadow-md shadow-slate-900/15 border ${
              isGodsBattleInProgress ? 'border-sub/80 shadow-[0_0_0_1px_rgb(var(--color-sub)/0.65)]' : 'border-gray-200/80'
            }`}
            style={expeditionPaneBackgroundStyle}
          >
            {expeditionPaneImageLayerStyle && expeditionPaneBackgroundImage ? (
              <img
                aria-hidden
                alt=""
                src={`${import.meta.env.BASE_URL}background/${expeditionPaneBackgroundImage}`}
                className="pointer-events-none absolute top-0 left-0 w-full h-auto"
                style={expeditionPaneImageLayerStyle}
              />
            ) : null}
            <div className={`relative z-10 rounded-md px-1 py-0.5 text-gray-900 ${isDarkModeEnabled ? '' : 'bg-white/74'}`}>
            {/* SpecRef: 8.3 | UI_EXPEDITION | Outer Ring (`###` area) */}
            {/* SpecRef: 8.3 | UI_EXPEDITION | Inner Ring (`###` area) */}
            <button
              onClick={() => {
                const nextExpanded = isLogExpanded ? null : partyIndex;
                setExpandedLogParty(nextExpanded);
                setExpandedRoom(null);
              }}
              className="w-full mb-0.5"
            >
              <span className="min-w-0 flex items-start gap-2">
                <button
                  type="button"
                  className="relative h-10 w-10 shrink-0 mt-0.5"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleRingStatusBubbleToggle(
                      `${party.id}:ring-status`,
                      `HP ${formatNumber(displayedHp)} / ${formatNumber(partyStats.hp)}\n${conditionLabel}`,
                      event.currentTarget,
                    );
                  }}
                  aria-label={`HP ${hpPercent}%, condition ${conditionPercent}%`}
                  title={`HP ${formatNumber(displayedHp)} / ${formatNumber(partyStats.hp)} ${conditionLabel}`}
                >
                  <svg
                    viewBox="0 0 36 36"
                    className="h-full w-full drop-shadow-[0_1px_1px_rgb(15_23_42/0.2)]"
                    role="img"
                    aria-label={`HP ${hpPercent}%, condition ${conditionPercent}%`}
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="rgb(var(--color-sub) / 0.24)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="rgb(var(--color-sub))"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, Math.min(100, hpPercent)) * 0.88} 100`}
                      transform="rotate(-90 18 18)"
                      className="transition-[stroke-dasharray] duration-200"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="8.5"
                      fill="none"
                      stroke="rgb(var(--color-sub) / 0.18)"
                      strokeWidth="5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="8.5"
                      fill="none"
                      stroke={conditionRingStroke}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, Math.min(100, conditionPercent)) * 0.534} 100`}
                      transform="rotate(-90 18 18)"
                      className="transition-[stroke-dasharray,stroke] duration-200"
                    />
                  </svg>
                </button>
                <span className="min-w-0 flex-1 space-y-0 text-left">
                  <span className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-1.5 text-sm">
                    <span className={`min-w-0 truncate ${isDarkModeEnabled ? 'text-gray-50' : 'text-black'}`}>
                      <span className="font-bold shrink-0 mr-1">{party.name}</span>
                      {headlineFloorName}
                    </span>
                    <span
                      className={`justify-self-end text-right font-mono text-[12px] leading-5 whitespace-nowrap ${isDarkModeEnabled ? 'text-gray-50' : 'text-black'}`}
                      title="Instant Expedition Charge"
                      aria-label={`Instant Expedition Charge ${instantChargeLabel}`}
                    >
                      <span>{instantChargeDisplay.cells}</span><i>{instantChargeDisplay.timerText}</i>
                    </span>
                    <span className="shrink-0 flex items-center gap-1.5">
                      <span className="font-medium text-gray-700 shrink-0">{headlineState}</span>
                      <span className={`${isLogExpanded ? 'transform transition-transform rotate-180' : ''}`}>▼</span>
                    </span>
                  </span>
                  <span className="block h-5 min-w-0">
                    {compactProgressItems.length > 0 ? (
                      <span className={`flex h-full items-center gap-1 overflow-hidden ${isDarkModeEnabled ? 'text-gray-200' : 'text-gray-700'}`}>
                        {compactProgressItems.map((item, index) => {
                          const fillPercent = item.progressRatio === null
                            ? 0
                            : Math.max(0, Math.min(100, item.progressRatio * 100));
                          return (
                            <span
                              key={`${party.id}-compact-progress-${index}`}
                              className="relative inline-block h-full min-w-0 max-w-[70%] overflow-hidden rounded px-1 py-0.5 cursor-pointer"
                              title={item.bubbleText}
                              aria-label={item.bubbleText}
                              onPointerDown={(event) => {
                                event.stopPropagation();
                              }}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleProgressBubbleToggle(
                                  `${party.id}:${item.key}`,
                                  item.bubbleText,
                                  event.currentTarget,
                                );
                              }}
                              >
                              <span className={`relative z-10 block truncate text-[11px] leading-tight ${isDarkModeEnabled ? 'text-gray-50' : 'text-black/85'}`}>{item.compactText}</span>
                              <span
                                aria-hidden
                                className={`absolute bottom-0 left-1 right-1 h-0.5 overflow-hidden rounded-full ${isDarkModeEnabled ? 'bg-white/20' : 'bg-black/15'}`}
                              >
                                <span className="block h-full bg-sub/70" style={{ width: `${fillPercent}%` }} />
                              </span>
                            </span>
                          );
                        })}
                      </span>
                    ) : null}
                  </span>
                </span>
              </span>
              <span className={`mt-0.5 block relative h-5 min-w-0 rounded-md overflow-hidden text-[11px] shadow-[0_2px_6px_rgb(15_23_42/0.18),inset_0_1px_0_rgb(255_255_255/0.42)] ${isDarkModeEnabled ? 'bg-slate-900/28' : 'bg-white/45'}`}>
                <span
                  className={`absolute inset-y-0 left-0 bg-sub/20 ${cycle.state === 'explore' ? '' : 'transition-[width] duration-200'}`}
                  style={{ width: `${visualProgressPercent}%`, transition: 'width 100ms linear' }}
                />
                <span className={`relative z-10 flex h-full items-center justify-center px-1.5 text-center leading-tight ${isDarkModeEnabled ? 'text-gray-50' : 'text-black'}`}>
                  <span className="w-full truncate leading-tight">
                    {progressLabel}
                  </span>
                </span>
              </span>
            </button>

            {subProgressPercent !== null ? (
              <div className="mb-1 h-1 w-full overflow-hidden rounded-full bg-transparent" aria-label="Sub progress bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(subProgressPercent)}>
                <div
                  className="h-full bg-sub/40"
                  style={{ width: `${subProgressPercent}%`, transition: 'width 100ms linear' }}
                />
              </div>
            ) : (
              <div className="mb-1 h-1 w-full" aria-hidden="true" />
            )}

            {isLogExpanded && (
              <div className="space-y-2 mb-2">
                <div className={expeditionControlGridClass}>
                  <button
                    type="button"
                    onClick={() => onToggleExpeditionDestinationMode(
                      partyIndex,
                      party.expeditionDestinationMode === 'auto' ? 'fixed' : 'auto',
                    )}
                    className="w-11 px-1 py-1 text-xs font-medium whitespace-nowrap text-center"
                  >
                    {party.expeditionDestinationMode === 'auto' ? t('party.expedition.mode.auto') : t('party.expedition.mode.fixed')}
                  </button>
                  <select
                    value={party.selectedDungeonId}
                    onChange={(e) => {
                      clearPartySimulation(partyIndex);
                      onSelectDungeon(partyIndex, Number(e.target.value));
                    }}
                    className="min-w-0 w-full border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {DUNGEONS.filter((dungeon) => debugSettings.colosseumEnabled || dungeon.id !== 99).map(dungeon => {
                      const gateState = getDungeonEntryGateState(party, dungeon);
                      const isSelectable = dungeon.id === 99 ? debugSettings.colosseumEnabled : !gateState.locked;
                      if (!isSelectable) return null;
                      return <option key={dungeon.id} value={dungeon.id}>{dungeon.name}</option>;
                    })}
                  </select>
                  <select
                    value={party.expeditionDepthLimit}
                    onChange={(e) => {
                      clearPartySimulation(partyIndex);
                      onSetExpeditionDepthLimit(partyIndex, e.target.value as ExpeditionDepthLimit);
                    }}
                    className="w-20 sm:w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {getExpeditionDepthOptions(party.selectedDungeonId).map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {canTriggerGodsBattle && (
                    <button
                      onClick={() => onTriggerSortie(partyIndex, true)}
                      disabled={isGodsBattleButtonDisabled}
                      className={`px-3 py-2 font-medium text-sm leading-none whitespace-nowrap liquid-glass-sortie-button ${isGodsBattleButtonDisabled ? '' : 'liquid-glass-sortie-button--accent'}`}
                    >
                      {t('party.expedition.godsBattle')}
                    </button>
                  )}
                  <button
                    onClick={() => onTriggerSortie(partyIndex, false)}
                    disabled={isSortieDisabled}
                    className={`px-3 py-2 font-medium text-sm leading-none whitespace-nowrap liquid-glass-sortie-button ${isSortieDisabled ? '' : 'liquid-glass-sortie-button--sub'}`}
                  >
                    {t('party.expedition.sortie')}
                  </button>
                </div>
                {isDifficultyOffsetUnlocked && (
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="shrink-0">{t('party.expedition.difficulty')}</span>
                      <button
                        type="button"
                        disabled={selectedDifficultyOffset <= 0}
                        aria-label={t('party.expedition.difficultyDecrease')}
                        onClick={() => {
                          clearPartySimulation(partyIndex);
                          onSetExpeditionDifficultyOffset(partyIndex, selectedDifficultyOffset - 2);
                        }}
                        className={`${IOS_GLASS_BUTTON_CLASS} flex h-7 w-7 shrink-0 items-center justify-center text-base font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={difficultyOffsetMax}
                        step={2}
                        value={selectedDifficultyOffset}
                        onChange={(e) => {
                          const nextOffset = Number(e.target.value);
                          clearPartySimulation(partyIndex);
                          onSetExpeditionDifficultyOffset(partyIndex, nextOffset);
                        }}
                        className={`min-w-0 flex-1 ${IOS_GLASS_SLIDER_CLASS}`}
                        style={getSliderProgressStyle(selectedDifficultyOffset, 0, difficultyOffsetMax)}
                      />
                      <button
                        type="button"
                        disabled={selectedDifficultyOffset >= difficultyOffsetMax}
                        aria-label={t('party.expedition.difficultyIncrease')}
                        onClick={() => {
                          clearPartySimulation(partyIndex);
                          onSetExpeditionDifficultyOffset(partyIndex, selectedDifficultyOffset + 2);
                        }}
                        className={`${IOS_GLASS_BUTTON_CLASS} flex h-7 w-7 shrink-0 items-center justify-center text-base font-semibold leading-none disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="shrink-0 rounded px-1 text-left hover:bg-white/20 focus:outline-none focus:ring-1 focus:ring-sub/60"
                        title={getDifficultyOffsetBubbleText(selectedDifficultyOffset)}
                        aria-label={getDifficultyOffsetBubbleText(selectedDifficultyOffset)}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleProgressBubbleToggle(
                            `${party.id}:difficulty-offset`,
                            getDifficultyOffsetBubbleText(selectedDifficultyOffset),
                            event.currentTarget,
                          );
                        }}
                      >
                        +{formatNumber(selectedDifficultyOffset)} (🍀+{formatNumber(difficultyItemChanceTickets)}, ✨+{formatNumber(difficultySuperRareChanceTickets)})
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                  <button
                    type="button"
                    disabled={simulation?.status === 'running'}
                    onClick={() => void handleSimulationRun(partyIndex)}
                    className={`${IOS_GLASS_BUTTON_CLASS} shrink-0 px-2.5 py-1.5 font-medium disabled:cursor-wait disabled:opacity-60`}
                  >
                    {t('party.expedition.simulationRun')}
                  </button>
                  <span className="min-w-0 text-right tabular-nums">
                    {simulation?.status === 'running'
                      ? t('party.expedition.simulationRunning', {
                        completed: formatNumber(simulation.completed),
                        total: formatNumber(simulation.total),
                      })
                      : simulationResultText
                      ?? (simulation?.status === 'error'
                      ? t('party.expedition.simulationError')
                      : null)}
                  </span>
                </div>
                {simulation?.status === 'complete' && simulation.result && simulationResultText ? (
                  <button
                    type="button"
                    className="block h-3 w-full overflow-visible rounded-full bg-gray-200/70 focus:outline-none focus:ring-2 focus:ring-sub/60 focus:ring-offset-1"
                    aria-label={simulationResultText}
                    title={simulationResultText}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      const key = `simulation:${partyIndex}`;
                      if (activeSimulationResultBubble?.key === key) {
                        setActiveSimulationResultBubble(null);
                        return;
                      }
                      const rect = event.currentTarget.getBoundingClientRect();
                      const viewportPadding = 12;
                      const maxWidth = Math.min(420, window.innerWidth - viewportPadding * 2);
                      setActiveSimulationResultBubble({
                        key,
                        text: simulationResultText,
                        top: rect.top - 8,
                        left: Math.min(Math.max(rect.left, viewportPadding), window.innerWidth - viewportPadding - maxWidth),
                        maxWidth,
                      });
                    }}
                  >
                    <span className="flex h-full w-full overflow-hidden rounded-full" aria-hidden="true">
                      <span
                        className="h-full"
                        style={{
                          width: `${((simulationUsesClearLabel ? simulation.result.Clear : simulation.result.Turned_Back) / simulation.result.total) * 100}%`,
                          backgroundColor: 'var(--outcome-success)',
                        }}
                      />
                      <span
                        className="h-full"
                        style={{
                          width: `${(simulation.result.Draw_Retreat / simulation.result.total) * 100}%`,
                          backgroundColor: 'var(--outcome-draw)',
                        }}
                      />
                      <span
                        className="h-full"
                        style={{
                          width: `${(simulation.result.Wounded_Retreat / simulation.result.total) * 100}%`,
                          backgroundColor: 'var(--outcome-retreat)',
                        }}
                      />
                      <span
                        className="h-full"
                        style={{
                          width: `${(simulation.result.Defeat / simulation.result.total) * 100}%`,
                          backgroundColor: 'var(--outcome-defeat)',
                        }}
                      />
                    </span>
                  </button>
                ) : null}
                {isExpeditionStatsDisplayEnabled && (
                  <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
                    <span>
                      {t('party.expedition.stats', { clear: formatNumber(displayedExpeditionStats.Clear), returned: formatNumber(displayedExpeditionStats.Turned_Back), draw: formatNumber(displayedExpeditionStats.Draw_Retreat), retreat: formatNumber(displayedExpeditionStats.Wounded_Retreat), defeat: formatNumber(displayedExpeditionStats.Defeat), total: formatNumber(displayedExpeditionStats.Clear + displayedExpeditionStats.Turned_Back + displayedExpeditionStats.Draw_Retreat + displayedExpeditionStats.Wounded_Retreat + displayedExpeditionStats.Defeat) })}
                    </span>
                    <button
                      type="button"
                      onClick={() => onResetExpeditionStats(partyIndex)}
                      className="shrink-0 underline hover:text-accent"
                    >
                      {t('party.expedition.reset')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {currentLog && isLogExpanded && (
              <div className="mx-1 border-t border-gray-200 pt-3">
                <div className="space-y-2">
                  {cycle.state !== 'explore' && (currentLog.totalExperience > 0 || currentLog.autoSellProfit > 0) && (
                    <div className="text-sm text-gray-500">
                      EXP: +{formatNumber(currentLog.totalExperience)}
                      {currentLog.autoSellProfit > 0 && <span> | {formatAutoSellSummary(currentLog.autoSellProfit, currentLog.autoSellMultiplier)}</span>}
                    </div>
                  )}

                  {cycle.state !== 'explore' && currentLog.rewards.length > 0 && (
                    <div className="text-sm">
                      <span className="text-gray-500">{t('home.battle.acquiredItemsLabel')} </span>
                      {currentLog.rewards.map((item, i) => {
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
                              onClick={(event) => handleRewardItemBubbleToggle(`expedition-reward-${partyIndex}-${i}-${item.id}-${item.enhancement}-${item.superRare}`, item, event.currentTarget)}
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
                    {[...displayedEntries].reverse().map((entry, i, arr) => {
                      const originalIndex = arr.length - 1 - i;
                      const latestVisibleRoomIndex = displayedEntries.length - 1;
                      const latestBattleRoomIndex = displayedEntries.reduce((lastBattleIndex, candidateEntry, candidateIndex) => {
                        return candidateEntry.details && candidateEntry.details.length > 0
                          ? candidateIndex
                          : lastBattleIndex;
                      }, -1);
                      const defaultExpandedRoomIndex = latestBattleRoomIndex >= 0 ? latestBattleRoomIndex : latestVisibleRoomIndex;
                      const latestRoomToken = `${currentLog.completedRooms}-${latestVisibleRoomIndex}-${displayedEntries[latestVisibleRoomIndex]?.room ?? -1}`;
                      const roomLabel = entry.floor && entry.roomInFloor
                        ? `${entry.floor}F-${entry.roomInFloor}`
                        : entry.room === currentLog.totalRooms + 1 ? 'BOSS' : entry.room.toString();
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
                      const isManualExpandedRoom = expandedRoom?.partyIndex === partyIndex && expandedRoom?.latestRoomToken === latestRoomToken && expandedRoom?.roomIndex === originalIndex;
                      const hasManualSelectionForParty = expandedRoom?.partyIndex === partyIndex && expandedRoom?.latestRoomToken === latestRoomToken;
                      const canExpandRoom = !!entry.details && entry.details.length > 0;
                      const isRoomExpanded = canExpandRoom && (isManualExpandedRoom || (!hasManualSelectionForParty && originalIndex === defaultExpandedRoomIndex));

                      return (
                        <div key={`${partyIndex}-${originalIndex}-${entry.room}`} className="bg-white rounded overflow-visible shadow-[0_6px_16px_rgba(15,23,42,0.14)]">
                        <button
                          onClick={() => {
                            if (!canExpandRoom) return;
                            setExpandedRoom(isManualExpandedRoom
                              ? { partyIndex, roomIndex: -1, latestRoomToken }
                              : { partyIndex, roomIndex: originalIndex, latestRoomToken }
                            );
                          }}
                          className={`relative isolate w-full overflow-hidden rounded text-left p-2 text-xs ${canExpandRoom ? '' : 'cursor-default'}`}
                        >
                            {renderEnemyLogChibiBackground(entry)}
                            <div className="relative z-10 flex justify-between items-center">
                              <span className="font-medium">
                                {roomLabel}:{' '}
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    const enemyLevel = typeof currentLogDungeonExpLevel === 'number' && entry.floor && entry.roomType
                                      ? getEffectiveEnemyLevel(
                                          currentLogDungeonExpLevel,
                                          entry.floor,
                                          entry.roomType,
                                          false,
                                          currentLog.difficultyOffset ?? 0,
                                        )
                                      : null;
                                    handleEnemyBestiaryBubbleToggle(`${partyIndex}-${originalIndex}-${entry.room}`, entry, enemyLevel, event.currentTarget);
                                  }}
                                  onKeyDown={(event) => {
                                    if (event.key !== 'Enter' && event.key !== ' ') return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const enemyLevel = typeof currentLogDungeonExpLevel === 'number' && entry.floor && entry.roomType
                                      ? getEffectiveEnemyLevel(
                                          currentLogDungeonExpLevel,
                                          entry.floor,
                                          entry.roomType,
                                          false,
                                          currentLog.difficultyOffset ?? 0,
                                        )
                                      : null;
                                    handleEnemyBestiaryBubbleToggle(
                                      `${partyIndex}-${originalIndex}-${entry.room}`,
                                      entry,
                                      enemyLevel,
                                      event.currentTarget,
                                    );
                                  }}
                                  className="inline cursor-pointer rounded px-0.5 -mx-0.5 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
                                >
                                  {renderEnemyNameWithMutedClass(entry.enemyName)}
                                </span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className={entry.gateInfo ? 'text-gray-500 font-medium' : entry.outcome === 'victory' ? 'text-sub font-medium' : entry.outcome === 'defeat' ? 'text-accent font-medium' : 'text-accent font-medium'}>
                                  {entry.gateInfo ? t('expedition.outcome.unreached') : entry.outcome === 'victory' ? t('expedition.outcome.victory') : entry.outcome === 'defeat' ? t('expedition.outcome.defeat') : t('expedition.outcome.draw')}
                                </span>
                                {canExpandRoom && <span className={`transform transition-transform ${isRoomExpanded ? 'rotate-180' : ''}`}>▼</span>}
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
                                  <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgb(var(--hp-track) / var(--hp-track-alpha, 1))" }}>
                                    <div className="h-full" style={{ width: `${Math.min(100, remainingRatio)}%`, backgroundColor: 'rgb(var(--hp-current))' }} />
                                    <div className="h-full" style={{ width: `${Math.min(100, healRatio)}%`, backgroundColor: 'rgb(var(--hp-healed))' }} />
                                    <div className="h-full" style={{ width: `${Math.min(100, takenRatio)}%`, backgroundColor: 'rgb(var(--hp-damage-taken))' }} />
                                  </div>
                                </div>
                                <div>
                                  <div className="mb-0.5">{t('home.battle.enemyHpLabel')} {formatNumber(enemyRemainingAmount)} / {formatNumber(entry.enemyHP)}</div>
                                  <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgb(var(--hp-track) / var(--hp-track-alpha, 1))" }}>
                                    <div className="h-full" style={{ width: `${Math.min(100, enemyRemainingRatio)}%`, backgroundColor: 'rgb(var(--hp-current))' }} />
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
                              <div className="font-medium text-gray-600 mb-1">{`${typeof entry.floor === 'number' ? (getLocalizedExpeditionFloorConcept(currentLog.dungeonId, entry.floor) ?? t('expedition.floor', { floor: formatNumber(entry.floor) })) : '-'} ${t('battleLog.title')}`}</div>
                              {aggregateBattleLifeDrainLogs(entry.details).map((log, j, battleLogs) => {
                                const isResurrectLog = log.note?.startsWith('(再起') || log.note?.startsWith('(即時蘇生)');
                                const isTriggeredLog = log.actor === 'triggered';
                                const isPhaseAction = log.actor !== 'deity' && log.actor !== 'effect';
                                const previousLog = j > 0 ? battleLogs[j - 1] : undefined;
                                const isStealthEffectLog = log.actor === 'effect' && (log.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || log.action.includes('への攻撃はすべて幻だった！'));
                                const isCounterNegationEffectLog = log.actor === 'effect' && log.action.includes('反撃無効化により');
                                const previousWasStealthEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.action.includes('物陰に隠れて攻撃をやり過ごせたのだ！') || previousLog.action.includes('への攻撃はすべて幻だった！'));
                                const previousWasCounterNegationEffectLog = !!previousLog && previousLog.actor === 'effect' && previousLog.action.includes('反撃無効化により');
                                const previousWasInPhaseEffectLog = !!previousLog && previousLog.actor === 'effect' && (previousLog.phase === 'combat');
                                const previousWasPhaseAction = !!previousLog && (previousLog.actor !== 'deity' && previousLog.actor !== 'effect');
                                const previousContinuesCurrentPhase = !!previousLog && (previousWasPhaseAction || previousWasStealthEffectLog || previousWasCounterNegationEffectLog || previousWasInPhaseEffectLog);
                                const shouldShowPhaseHeader = isPhaseAction && (!previousLog || !previousContinuesCurrentPhase || previousLog.phase !== log.phase);
                                const shouldShowEndPhaseSpacer = !!previousLog && !isPhaseAction && previousWasPhaseAction;
                                const phaseLabel = getBattleLogPhaseLabel(log, isPhaseAction, isTriggeredLog, !!isResurrectLog, !!isStealthEffectLog, !!isCounterNegationEffectLog);
                                const phaseHeader = log.phase === 'combat' ? t('battleLog.phase.combat') : '';
                                const iconKey: UiIconKey = log.elementalOffense === 'fire'
                                  ? 'fire'
                                  : log.elementalOffense === 'thunder'
                                    ? 'thunder'
                                    : log.elementalOffense === 'ice'
                                      ? 'ice'
                                      : log.attackType === 'ranged'
                                        ? 'ranged'
                                        : log.attackType === 'magical'
                                          ? 'magic'
                                          : 'melee';
                                const isEnemy = log.actor === 'enemy';
                                const hits = log.hits ?? 0;
                                const totalAttempts = log.totalAttempts ?? 0;
                                const allMissed = totalAttempts > 0 && hits === 0 && !log.wasNegated;
                                const hitDisplay = formatBattleLogHitDisplay(log);
                                const trailingEffectMatch = /\(([^()]+)\)$/.exec(log.action);
                                const trailingEffects = (trailingEffectMatch?.[1] ?? '')
                                  .split(',')
                                  .map(effect => effect.trim())
                                  .filter(effect => /^(共鳴\+\d+%|残響\+\d+%)$/.test(effect));
                                const rageDisplay = log.rageBonusPercent && log.rageBonusPercent > 0
                                  ? t('battleLog.extra.rage', { percent: log.rageBonusPercent })
                                  : '';
                                const momentumDisplay = typeof log.momentumBonusPercent === 'number'
                                  ? t('battleLog.extra.momentum', { sign: log.momentumBonusPercent >= 0 ? '+' : '', percent: log.momentumBonusPercent })
                                  : '';
                                const ambushDisplay = typeof log.ambushMultiplier === 'number' && log.ambushMultiplier > 1
                                  ? t('battleLog.extra.ambush', { multiplier: formatDecimal(log.ambushMultiplier, 2, 0) })
                                  : '';
                                const overwatchDisplay = typeof log.overwatchMultiplier === 'number' && log.overwatchMultiplier > 1
                                  ? t('battleLog.extra.overwatch', { multiplier: formatDecimal(log.overwatchMultiplier, 2, 0) })
                                  : '';
                                const executionDisplay = typeof log.executionMultiplier === 'number' && log.executionMultiplier > 1
                                  ? t('battleLog.extra.execution', { multiplier: formatDecimal(log.executionMultiplier, 2, 0) })
                                  : '';
                                const swarmActorDisplay = typeof log.swarmActorPenaltyPercent === 'number' && log.swarmActorPenaltyPercent > 0
                                  ? t('battleLog.extra.powerDown', { percent: log.swarmActorPenaltyPercent })
                                  : '';
                                const swarmOpponentDisplay = typeof log.swarmOpponentBonusPercent === 'number' && log.swarmOpponentBonusPercent > 0
                                  ? t('battleLog.extra.opponentDamageUp', { percent: log.swarmOpponentBonusPercent })
                                  : '';

                                let actionText: string;
                                if (log.actor === 'effect' || log.actor === 'triggered') {
                                  actionText = log.action;
                                } else if (isEnemy) {
                                  if (isResurrectLog) {
                                    actionText = t('battleLog.action.enemyResurrect', { action: log.action });
                                  } else if (log.isEnemyTargetHit) {
                                    actionText = allMissed ? t('battleLog.action.targetHitMissed', { action: log.action.replace('命中！', '') }) : log.action;
                                  } else {
                                    actionText = allMissed
                                      ? t('battleLog.action.enemyMissed', { action: log.action.replace('！', '') })
                                      : battleLogActionIncludesEnemyName(log.action, entry)
                                        ? log.action
                                        : t('battleLog.action.enemyActed', { action: log.action });
                                  }
                                } else {
                                  actionText = allMissed ? t('battleLog.action.partyMissed', { actor: log.action.replace(/ の.*$/, '') }) : log.action;
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
                                const actionDisplayNode = renderBattleLogTextWithInlineChibis(actionDisplay, party, entry);
                                const shouldRenderResurrectBeforeHeader = isResurrectLog && shouldShowPhaseHeader;
                                const isReflectDamageLog = !!log.reflectedDamage && log.reflectedDamage > 0;
                                const isAbsorbDamageLog = !!log.absorbedDamage && log.absorbedDamage > 0;
                                const reflectArrowClass = log.reflectTarget === 'party' ? 'text-accent' : 'text-sub';
                                const absorbArrowClass = log.absorbTarget === 'enemy' ? 'text-accent' : 'text-sub';
                                const damageColorClass = (log.damageTarget ?? (isEnemy ? 'party' : 'enemy')) === 'party' ? 'text-accent' : 'text-sub';
                                const damageEmojiClass = damageColorClass === 'text-accent' ? 'accent-theme-emoji-icon' : 'sub-theme-emoji-icon';
                                const damageDisplay = ((log.damage !== undefined && (log.damage > 0 || log.showZeroDamage)) || isReflectDamageLog || isAbsorbDamageLog) && (
                                  isReflectDamageLog
                                    ? (
                                      <span className="ml-auto shrink-0 whitespace-nowrap text-right text-gray-500">
                                        ({renderUiIcon(iconKey, damageEmojiClass)}{' '}{formatNumber(log.damage ?? 0)}, <span className={reflectArrowClass}>{t('home.battle.reflectedDamage', { damage: formatNumber(log.reflectedDamage || 0) })}</span>)
                                      </span>
                                    )
                                    : isAbsorbDamageLog
                                      ? (
                                        <span className="ml-auto shrink-0 whitespace-nowrap text-right text-gray-500">
                                          ({renderUiIcon(iconKey, damageEmojiClass)}{' '}<span className={absorbArrowClass}>{t('home.battle.absorbedDamage', { damage: formatNumber(log.absorbedDamage || 0) })}</span>)
                                        </span>
                                      )
                                      : (
                                        <span className={`ml-auto shrink-0 whitespace-nowrap text-right ${damageColorClass}`}>
                                          ({renderUiIcon(iconKey, damageEmojiClass)}{' '}{formatNumber(log.damage ?? 0)})
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
                                          {renderBattleLogNote(log.note, log.noteTone)}
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
                                        {renderBattleLogNote(log.note, log.noteTone)}
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
                    {cycle.state === 'explore' && displayedEntries.length === 0 && (
                      <div className="text-xs text-gray-500">{t('expedition.exploringLogUpdate')}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function areExpeditionTabPropsEqual(previous: ExpeditionTabProps, next: ExpeditionTabProps): boolean {
  if (!previous.throttleAfkPublications || !next.throttleAfkPublications) return false;
  if (previous.afkRecoveryProgressPercent === null || next.afkRecoveryProgressPercent === null) return false;
  return previous.afkPresentationVersion === next.afkPresentationVersion;
}

export default memo(ExpeditionTab, areExpeditionTabPropsEqual);

// SpecRef: 8.4 | UI_BASE | Base(拠点)
