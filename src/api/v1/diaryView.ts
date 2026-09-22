import type { DiaryLog, DiarySettings, DiaryTrigger, GameState, Party } from '../../types';
import { formatItem } from './itemFormat';

export interface SemanticDiaryText {
  key: string;
  args: Record<string, string | number | boolean>;
}

export type DiaryEntryContent =
  | { format: 'semantic'; title: SemanticDiaryText; subtitle: SemanticDiaryText; events: SemanticDiaryText[] }
  | { format: 'legacy'; title: string; subtitle: string; text: string };

export const DIARY_THRESHOLD_OPTIONS = ['all', 1, 2, 3, 4, 5, 6, 'none'] as const;
export const DIARY_SIDE_QUEST_THRESHOLD_OPTIONS = ['all', 2, 3, 4, 5, 6, 7, 8, 'none'] as const;
export const DIARY_DEFEAT_NOTIFICATION_OPTIONS = ['defeatOnly', 'defeatAndDraw', 'defeatDrawRetreat', 'all', 'none'] as const;

export const DIARY_SETTING_VALID_OPTIONS = {
  superRareThreshold: DIARY_THRESHOLD_OPTIONS,
  bossThreshold: DIARY_THRESHOLD_OPTIONS,
  mythicThreshold: DIARY_THRESHOLD_OPTIONS,
  rareThreshold: DIARY_THRESHOLD_OPTIONS,
  sideQuestThreshold: DIARY_SIDE_QUEST_THRESHOLD_OPTIONS,
  notifyGodsBattle: [true, false] as const,
  defeatNotificationMode: DIARY_DEFEAT_NOTIFICATION_OPTIONS,
  notifyCyclePopup: [true, false] as const,
  notifyItemDropPopup: [true, false] as const,
  notifyAutoEquipmentPopup: [true, false] as const,
  notifySideQuestPopup: [true, false] as const,
};

/** Removes the legacy `notifyDefeat` migration alias and publishes the complete closed v1 setting shape. */
export function diarySettingsView(settings: DiarySettings): DiarySettings {
  return {
    superRareThreshold: settings.superRareThreshold,
    bossThreshold: settings.bossThreshold,
    mythicThreshold: settings.mythicThreshold,
    rareThreshold: settings.rareThreshold,
    sideQuestThreshold: settings.sideQuestThreshold,
    notifyGodsBattle: settings.notifyGodsBattle,
    defeatNotificationMode: settings.defeatNotificationMode,
    notifyCyclePopup: settings.notifyCyclePopup,
    notifyItemDropPopup: settings.notifyItemDropPopup,
    notifyAutoEquipmentPopup: settings.notifyAutoEquipmentPopup,
    notifySideQuestPopup: settings.notifySideQuestPopup,
  };
}

function primaryTrigger(triggers: readonly DiaryTrigger[]): DiaryTrigger | 'special' {
  if (triggers.length === 1 && ['victory', 'return', 'defeat', 'draw', 'retreat'].includes(triggers[0])) return triggers[0];
  for (const trigger of ['unlock', 'sideQuest', 'godsBattle', 'superRare', 'mythicRare', 'bossRare', 'eliteRare'] as const) {
    if (triggers.includes(trigger)) return trigger;
  }
  return 'special';
}

/**
 * Public Diary narration metadata. Compact entries remain language-neutral; old entries expose only prose that was
 * already stored in the save and are never parsed to manufacture semantic facts.
 */
export function diaryEntryContent(entry: DiaryLog): DiaryEntryContent {
  const storedLegacyText = [entry.sideQuestLabel, entry.sideQuestDetail, entry.unlockHeadline, entry.unlockDetail]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
  if (entry.expeditionLog.compactVersion !== 1 && storedLegacyText.length > 0) {
    return {
      format: 'legacy',
      title: entry.unlockHeadline ?? entry.sideQuestLabel ?? '',
      subtitle: entry.unlockDetail ?? entry.sideQuestDetail ?? entry.expeditionLog.dungeonName,
      text: storedLegacyText.join('\n'),
    };
  }

  // Old ordinary expedition entries already have structured triggers and dungeon facts. Using those is not an
  // inference from their saved battle prose; only prose-only side-quest/unlock fields take the legacy branch above.
  return {
    format: 'semantic',
    title: { key: `diary.title.${primaryTrigger(entry.triggers)}`, args: {} },
    subtitle: {
      key: 'diary.subtitle.expedition',
      args: { dungeonId: entry.expeditionLog.dungeonId, difficultyOffset: entry.expeditionLog.difficultyOffset },
    },
    events: entry.triggers.map((trigger) => ({ key: `diary.event.${trigger}`, args: {} })),
  };
}

function battleLogReference(entry: DiaryLog) {
  return {
    logId: `diary:${entry.id}`,
    availability: { available: true, unavailableReason: null },
  };
}

export function diaryEntryView(entry: DiaryLog, partyNumber: number) {
  return {
    diaryEntryId: entry.id,
    partyNumber,
    occurredAt: new Date(entry.createdAt).toISOString(),
    unread: !entry.isRead,
    content: diaryEntryContent(entry),
    battleLog: entry.expeditionLog ? battleLogReference(entry) : null,
  };
}

function diaryEntrySummary(entry: DiaryLog, partyNumber: number) {
  const semantic = entry.semantic;
  return {
    ...diaryEntryView(entry, partyNumber),
    triggers: [...entry.triggers],
    expedition: {
      dungeonId: entry.expeditionLog.dungeonId,
      difficultyOffset: entry.expeditionLog.difficultyOffset,
    },
    rewards: entry.expeditionLog.rewards.map((item) => formatItem(item, item.isLocked === true)),
    sideQuest: semantic?.quest ? {
      label: semantic.quest.label
        ? { format: 'semantic' as const, text: semantic.quest.label }
        : { format: 'legacy' as const, text: semantic.quest.legacyLabel ?? entry.sideQuestLabel ?? '' },
      jewelKey: semantic.quest.jewel[0],
      jewelRank: semantic.quest.jewel[1],
    } : null,
    unlock: semantic?.unlock ? { boss: semantic.unlock.boss, partySlot: semantic.unlock.slot } : null,
  };
}

function findEntry(state: GameState, diaryEntryId: string): { party: Party; entry: DiaryLog } | null {
  for (const party of state.parties) {
    const entry = party.diaryLogs.find((candidate) => candidate.id === diaryEntryId);
    if (entry) return { party, entry };
  }
  return null;
}

export function buildDiaryProjection(state: GameState, parameters: Record<string, unknown>) {
  const explicitPartyNumber = parameters.partyNumber === undefined ? null : Number(parameters.partyNumber);
  const explicitEntryId = parameters.diaryEntryId === undefined ? null : String(parameters.diaryEntryId);
  const selectedParty = explicitPartyNumber === null ? state.parties[state.selectedPartyIndex] ?? state.parties[0] : state.parties.find((party) => party.id === explicitPartyNumber);
  if (!selectedParty) throw new Error('not_found');

  let selectedEntry: DiaryLog | null = null;
  if (explicitEntryId !== null) {
    const found = findEntry(state, explicitEntryId);
    if (!found || found.party.id !== selectedParty.id) throw new Error('not_found');
    selectedEntry = found.entry;
  }

  return {
    effectiveSelection: { partyNumber: selectedParty.id, diaryEntryId: selectedEntry?.id ?? null },
    unreadTotal: state.parties.reduce((total, party) => total + party.diaryLogs.filter((entry) => !entry.isRead).length, 0),
    parties: state.parties.map((party) => ({
      partyNumber: party.id,
      name: party.name,
      unreadCount: party.diaryLogs.filter((entry) => !entry.isRead).length,
      settings: diarySettingsView(party.diarySettings),
      entries: [...party.diaryLogs]
        .sort((left, right) => right.createdAt - left.createdAt)
        .map((entry) => diaryEntrySummary(entry, party.id)),
    })),
  };
}

export function findDiaryEntryView(state: GameState, diaryEntryId: string) {
  const found = findEntry(state, diaryEntryId);
  if (!found) throw new Error('not_found');
  return diaryEntryView(found.entry, found.party.id);
}
