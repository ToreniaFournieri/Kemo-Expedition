import { DUNGEONS } from '../data/dungeons';
import type { Party } from '../types';
import { hasGodsBattleSuffix } from './godsBattleSuffix';
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
  return lastEntry?.roomType === 'battle_Boss' && (lastEntry.godsBattle || hasGodsBattleSuffix(lastEntry.enemyName));
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

export function getSideQuestLevelFromExpId(expId: number): 1 | 2 | 3 | 4 {
  // SpecRef: 5.1.2 | Side Quest | Side quest difficulty
  if (expId <= 2) return 1;
  if (expId <= 4) return 2;
  if (expId <= 6) return 3;
  return 4;
}

const HOUR_MS = 60 * 60 * 1000;

function ordinal(value: number): string {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[value % 10] ?? 'th'}`;
}

// SpecRef: 9.1.3 | 2-1-1 compact | `clearGate`
/** The party's active Clear-Gate goals as the compact observation spells them, e.g. `4th Elite gate: 3/4`; null when none. */
export function formatCompactClearGate(goals: readonly ExpeditionGoal[]): string | null {
  const parts = goals.map((goal) => {
    switch (goal.kind) {
      case 'eliteGate': return `${ordinal(goal.floor)} Elite gate: ${goal.current}/${goal.required}`;
      case 'bossGate': return `Boss gate: ${goal.current}/${goal.required}`;
      case 'godGate': return `Gods gate: ${goal.collected}/${goal.required}`;
      case 'entryGate': return `Entry gate: 0/1`;
      case 'godEntry': return `Gods entry: 0/1`;
    }
  });
  return parts.length === 0 ? null : parts.join(', ');
}

// SpecRef: 9.1.3 | 2-1-1 compact | `sideQuest`
/**
 * The party's side quest as `<sideQuest>-<lv>: <progress>/<target>-<timeRemaining>/<timeLimit>-<startTimestamp>`
 * (hours; `YYYYMMDD HH:MM` UTC start), e.g. `q.exercise-2: 4/10-5h/12h-20261009 13:18`; a quest without a deadline omits the time part. Time-based quests count minutes.
 */
export function formatCompactSideQuest(party: Party, cycleDurationScale: number, nowMs: number): string | null {
  const facts = getSideQuestFacts(party, cycleDurationScale, nowMs);
  const quest = party.sideQuest;
  if (!facts || !quest) return null;
  const unit = TIME_BASED_SIDE_QUEST_TYPES.has(facts.type) ? 60 : 1;
  const level = getSideQuestLevelFromExpId(Math.floor(quest.rolledTier));
  const head = `${facts.type}-${level}: ${Math.floor(facts.progress / unit)}/${Math.ceil(facts.target / unit)}`;
  if (!facts.hasDeadline) return head;
  const limitHours = Math.round((quest.expiresAt - quest.assignedAt) / HOUR_MS);
  const started = new Date(quest.assignedAt);
  const pad = (value: number) => String(value).padStart(2, '0');
  const startTimestamp = `${started.getUTCFullYear()}${pad(started.getUTCMonth() + 1)}${pad(started.getUTCDate())} ${pad(started.getUTCHours())}:${pad(started.getUTCMinutes())}`;
  return `${head}-${Math.ceil(facts.remainingMs / HOUR_MS)}h/${limitHours}h-${startTimestamp}`;
}
