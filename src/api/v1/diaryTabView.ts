import { getDungeonById } from '../../data/dungeons.ts';
import { renderDiaryText, type DiaryText } from '../../game/compactDiary.ts';
import { getJewelNameByRank } from '../../game/jewel.ts';
import { t } from '../../i18n/index.ts';
import type { Character, DiarySettings, DiaryTrigger, JewelKey } from '../../types/index.ts';
import { buildExpeditionLogView, type ExpeditionLogView, type LatestBattleLogProjection } from './expeditionLogView.ts';
import { parseItemFormat } from './itemFormat.ts';

export interface DiaryCharacterView {
  readonly id: number;
  readonly name: string;
  readonly raceId: Character['raceId'];
  readonly gender: 'male' | 'female';
  readonly isUnique: boolean;
  readonly lineageId?: Character['lineageId'];
  readonly mimorianEnemyId?: number;
}

interface DiaryEntryProjection {
  readonly diaryEntryId: string;
  readonly occurredAt: string;
  readonly unread: boolean;
  readonly content:
    | { readonly format: 'semantic'; readonly title: unknown; readonly subtitle: unknown; readonly events: readonly unknown[] }
    | { readonly format: 'legacy'; readonly title: string; readonly subtitle: string; readonly text: string };
  readonly battleLog: { readonly logId: string; readonly availability: { readonly available: boolean } } | null;
  readonly triggers: readonly DiaryTrigger[];
  readonly expedition: { readonly dungeonId: number; readonly difficultyOffset: number };
  readonly rewards: readonly string[];
  readonly sideQuest: { readonly label: { readonly format: 'semantic'; readonly text: DiaryText } | { readonly format: 'legacy'; readonly text: string }; readonly jewelKey: JewelKey; readonly jewelRank: number } | null;
  readonly unlock: { readonly boss: boolean; readonly partySlot: number } | null;
}

export interface DiaryProjection {
  readonly effectiveSelection: { readonly partyNumber: number; readonly diaryEntryId: string | null };
  readonly unreadTotal: number;
  readonly parties: readonly {
    readonly partyNumber: number;
    readonly name: string;
    readonly unreadCount: number;
    readonly characters: readonly {
      readonly characterId: number;
      readonly name: string;
      readonly raceId: Character['raceId'];
      readonly gender: 'male' | 'female';
      readonly isUnique: boolean;
      readonly lineageId: Character['lineageId'] | null;
      readonly mimorianEnemyId: number | null;
    }[];
    readonly settings: DiarySettings;
    readonly entries: readonly DiaryEntryProjection[];
  }[];
}

export interface DiaryEntryView {
  readonly id: string;
  readonly createdAt: number;
  readonly isRead: boolean;
  readonly triggers: readonly DiaryTrigger[];
  readonly sideQuestLabel?: string;
  readonly sideQuestDetail?: string;
  readonly unlockHeadline?: string;
  readonly unlockDetail?: string;
  readonly expeditionLog: ExpeditionLogView;
}

export interface DiaryPartyView {
  readonly id: number;
  readonly name: string;
  readonly unreadCount: number;
  readonly characters: readonly DiaryCharacterView[];
  readonly diarySettings: DiarySettings;
  readonly diaryLogs: readonly DiaryEntryView[];
}

export interface DiaryTabView {
  readonly selectedPartyNumber: number;
  readonly unreadTotal: number;
  readonly parties: readonly DiaryPartyView[];
}

function placeholderLog(entry: DiaryEntryProjection): ExpeditionLogView {
  return {
    logId: entry.battleLog?.logId ?? `diary:${entry.diaryEntryId}`,
    dungeonId: entry.expedition.dungeonId,
    dungeonName: getDungeonById(entry.expedition.dungeonId)?.name ?? String(entry.expedition.dungeonId),
    difficultyOffset: entry.expedition.difficultyOffset,
    totalExperience: 0,
    totalRooms: 0,
    completedRooms: 0,
    finalOutcome: null,
    entries: [],
    rewards: entry.rewards.flatMap((value) => { const item = parseItemFormat(value); return item ? [item] : []; }),
    autoSellProfit: 0,
    autoSellCount: 0,
  };
}

function entryView(entry: DiaryEntryProjection, details: ReadonlyMap<string, ExpeditionLogView>): DiaryEntryView {
  const dungeon = getDungeonById(entry.expedition.dungeonId)?.name ?? String(entry.expedition.dungeonId);
  const sideQuestLabel = entry.sideQuest
    ? entry.sideQuest.label.format === 'semantic' ? renderDiaryText(entry.sideQuest.label.text) : entry.sideQuest.label.text
    : undefined;
  const legacy = entry.content.format === 'legacy' ? entry.content : null;
  return {
    id: entry.diaryEntryId,
    createdAt: Date.parse(entry.occurredAt),
    isRead: !entry.unread,
    triggers: entry.triggers,
    ...(entry.triggers.includes('sideQuest') ? {
      sideQuestLabel: sideQuestLabel || legacy?.title || undefined,
      sideQuestDetail: entry.sideQuest
        ? t('sideQuest.reward.jewelObtained', { dungeon, jewel: getJewelNameByRank(entry.sideQuest.jewelKey, entry.sideQuest.jewelRank) })
        : legacy?.subtitle || undefined,
    } : {}),
    ...(entry.triggers.includes('unlock') ? {
      unlockHeadline: legacy?.title || (entry.unlock ? t(entry.unlock.boss ? 'unlock.condition.dungeonCleared' : 'unlock.condition.met', { dungeon }) : undefined),
      unlockDetail: legacy?.subtitle || (entry.unlock ? t('unlock.partySlot', { slot: entry.unlock.partySlot }) : undefined),
    } : {}),
    expeditionLog: (entry.battleLog ? details.get(entry.battleLog.logId) : null) ?? placeholderLog(entry),
  };
}

/** Converts only Application API responses into the existing Diary presentation model. */
export function buildDiaryTabView(
  projection: DiaryProjection | null | undefined,
  battleLogProjections: readonly LatestBattleLogProjection[] | null | undefined,
): DiaryTabView | null {
  if (!projection) return null;
  const details = new Map<string, ExpeditionLogView>();
  for (const detail of battleLogProjections ?? []) {
    const view = buildExpeditionLogView(detail);
    if (view) details.set(view.logId, view);
  }
  return {
    selectedPartyNumber: projection.effectiveSelection.partyNumber,
    unreadTotal: projection.unreadTotal,
    parties: projection.parties.map((party) => ({
      id: party.partyNumber,
      name: party.name,
      unreadCount: party.unreadCount,
      characters: party.characters.map((character) => ({
        id: character.characterId,
        name: character.name,
        raceId: character.raceId,
        gender: character.gender,
        isUnique: character.isUnique,
        lineageId: character.lineageId ?? undefined,
        mimorianEnemyId: character.mimorianEnemyId ?? undefined,
      })),
      diarySettings: party.settings,
      diaryLogs: party.entries.map((entry) => entryView(entry, details)),
    })),
  };
}
