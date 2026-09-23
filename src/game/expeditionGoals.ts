import { DUNGEONS } from '../data/dungeons';
import { t } from '../i18n';
import type { Party } from '../types';
import {
  getBossGateKey,
  getClearGateProgress,
  getClearGateRequired,
  getEliteGateKey,
  getGodsBattleProgress,
  getGodsBattleRequired,
  hasDefeatedDungeonBoss,
  isClearGateUnlocked,
  isDungeonEntryUnlocked,
} from './clearGate';

// SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
// SpecRef: 5.1.3.1 | "Clear-Gate" progression system specification | Gates and the Gods Battle goal
// SpecRef: 5.1.2 | Side Quest | Progress
// Which goals the Expedition pane shows for a party and the numbers behind them, as language-neutral facts. The UI formats
// them into text and the Application API publishes them as they are, so the two cannot select different goals.

export type ExpeditionGoal =
  | { kind: 'eliteGate'; dungeonId: number; floor: number; current: number; required: number }
  | { kind: 'bossGate'; dungeonId: number; current: number; required: number }
  | { kind: 'entryGate'; nextDungeonId: number }
  | { kind: 'godGate'; dungeonId: number; collected: number; required: number }
  | { kind: 'godEntry'; dungeonId: number };

/** After a cleared Gods Battle boss the next special goal waits until the exploration ends. */
export function shouldDelayNextSpecialGoal(party: Party, cycleState?: string): boolean {
  if (cycleState !== 'explore') return false;
  const log = party.lastExpeditionLog;
  if (!log || log.finalOutcome !== 'Clear') return false;
  const lastEntry = log.entries[log.entries.length - 1];
  return lastEntry?.roomType === 'battle_Boss' && (lastEntry.godsBattle || lastEntry.enemyName.includes(t('game.log.godsBattleSuffix')));
}

/**
 * The goals of the selected destination. Clear-Gate outcomes become visible only after the party has completed its return,
 * so the gate figures come from the pending snapshot while its rewards are pending.
 */
export function getExpeditionGoals(party: Party, cycleState?: string): ExpeditionGoal[] {
  const currentDungeon = DUNGEONS.find((dungeon) => dungeon.id === party.selectedDungeonId);
  if (!currentDungeon || !currentDungeon.floors || currentDungeon.id === 99) return [];

  const displayedParty = party.expeditionRewardsPending && party.pendingClearGateSnapshot
    ? {
        ...party,
        clearGateProgress: party.pendingClearGateSnapshot.progress,
        clearGateStatus: party.pendingClearGateSnapshot.status,
        defeatedBossExpeditions: party.pendingClearGateSnapshot.defeatedBossExpeditions,
      }
    : party;
  const goals: ExpeditionGoal[] = [];

  for (const floor of currentDungeon.floors) {
    if (floor.floorNumber >= 6) continue;
    const gateKey = getEliteGateKey(currentDungeon.id, floor.floorNumber);
    if (!isClearGateUnlocked(displayedParty, gateKey)) {
      goals.push({ kind: 'eliteGate', dungeonId: currentDungeon.id, floor: floor.floorNumber, current: getClearGateProgress(displayedParty, gateKey), required: getClearGateRequired(gateKey) });
      break;
    }
  }

  if (goals.length === 0) {
    const bossGateKey = getBossGateKey(currentDungeon.id);
    if (!isClearGateUnlocked(displayedParty, bossGateKey)) {
      goals.push({ kind: 'bossGate', dungeonId: currentDungeon.id, current: getClearGateProgress(displayedParty, bossGateKey), required: getClearGateRequired(bossGateKey) });
    }
  }

  if (goals.length === 0) {
    const nextDungeon = DUNGEONS.find((dungeon) => dungeon.id === currentDungeon.id + 1);
    if (nextDungeon && !isDungeonEntryUnlocked(displayedParty, nextDungeon.id)) goals.push({ kind: 'entryGate', nextDungeonId: nextDungeon.id });

    const godsRequired = getGodsBattleRequired();
    const bossRareCollected = getGodsBattleProgress(displayedParty, currentDungeon.id);
    const hasBossDefeat = hasDefeatedDungeonBoss(displayedParty, currentDungeon.id);
    const godsUnlocked = bossRareCollected >= godsRequired && hasBossDefeat;
    if (!godsUnlocked && !shouldDelayNextSpecialGoal(party, cycleState)) {
      goals.push(hasBossDefeat
        ? { kind: 'godGate', dungeonId: currentDungeon.id, collected: bossRareCollected, required: godsRequired }
        : { kind: 'godEntry', dungeonId: currentDungeon.id });
    }
  }
  return goals;
}

export const TIME_BASED_SIDE_QUEST_TYPES: ReadonlySet<string> = new Set(['q.exercise', 'q.healing', 'q.AFK']);

export interface SideQuestFacts {
  id: number;
  type: string;
  /** Quest units: seconds for the time-based types (`q.exercise`, `q.healing`, `q.AFK`), otherwise Gold, counts, or items. */
  target: number;
  progress: number;
  /** Whole percent of the target reached, 0 to 100. */
  percent: number;
  hasDeadline: boolean;
  /** Milliseconds until the deadline at the current Speed of Time; 0 without a deadline. */
  remainingMs: number;
}

/** The party's side quest as the pane shows it, with the deadline scaled by the current Speed of Time. */
export function getSideQuestFacts(party: Party, cycleDurationScale: number, nowMs: number): SideQuestFacts | null {
  const quest = party.sideQuest;
  if (!quest) return null;
  const safeTarget = Math.max(1, quest.target);
  const clampedProgress = Math.max(0, Math.min(quest.progress, safeTarget));
  const safeScale = Math.max(0.001, cycleDurationScale);
  const simulatedNow = quest.assignedAt + Math.max(0, nowMs - quest.assignedAt) / safeScale;
  return {
    id: quest.id,
    type: quest.type,
    target: safeTarget,
    progress: clampedProgress,
    percent: Math.floor((clampedProgress / safeTarget) * 100),
    hasDeadline: quest.expiresAt < Number.MAX_SAFE_INTEGER,
    remainingMs: Math.max(0, quest.expiresAt - simulatedNow),
  };
}
