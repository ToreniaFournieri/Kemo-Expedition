import type { BattleLogEntry, DiaryLog, ExpeditionLog, ExpeditionLogEntry, Item, JewelKey } from '../types/index.ts';
import { t } from '../i18n/index.ts';
import { getDungeonById } from '../data/dungeons.ts';
import { getItemById } from '../data/items.ts';
import { getItemDisplayName } from './gameState.ts';
import { getJewelNameByRank } from './jewel.ts';
import { formatEnemyDefName } from './enemyDisplay.ts';
import { renderCompactBattle } from './battleCandidate.ts';
import { buildPostBattleEffectLogs } from './expeditionEffects/postBattleEffectNarration.ts';
import { buildAuriferousLogEntry } from './expeditionEffects/auriferousNarration.ts';
import type { PostBattleEffectNarrationFact } from './expeditionEffects/postBattleEffects.ts';
import type { AuriferousNarrationFact } from './expeditionEffects/auriferousEffect.ts';

export type DiaryText = [key: string, params?: Record<string, string | number | DiaryText>];
export type DiaryItem = Pick<Item, 'id' | 'enhancement' | 'superRare' | 'jewel'>;
export type DiaryEndEvent = [0, PostBattleEffectNarrationFact] | [1, AuriferousNarrationFact] | [2, DiaryItem, number?] | [3] | [4];
export function diaryItem(item: Item): DiaryItem { return { id: item.id, enhancement: item.enhancement, superRare: item.superRare, ...(item.jewel ? { jewel: { ...item.jewel } } : {}) }; }
export function diaryItemName(item: DiaryItem): string {
  const base = getItemById(item.id);
  if (!base) throw new Error(`Unknown Diary item ${item.id}`);
  return getItemDisplayName({ ...base, ...item });
}
export function renderDiaryText(text: DiaryText): string {
  const [key, params] = text;
  return t(key, params ? Object.fromEntries(Object.entries(params).map(([name, value]) => [name, Array.isArray(value) ? renderDiaryText(value) : value])) : undefined);
}
// SpecRef: 8.5 | UI_DIARY | Compact language-neutral records
export function renderDiaryMetadata<T extends DiaryLog>(diary: T): T {
  const meta = diary.semantic;
  if (!meta) return diary;
  const dungeon = getDungeonById(diary.expeditionLog.dungeonId)?.name ?? diary.expeditionLog.dungeonName;
  return { ...diary,
    ...(meta.quest ? { sideQuestLabel: meta.quest.label ? renderDiaryText(meta.quest.label) : meta.quest.legacyLabel,
      sideQuestDetail: t('sideQuest.reward.jewelObtained', { dungeon, jewel: getJewelNameByRank(meta.quest.jewel[0], meta.quest.jewel[1]) }) } : {}),
    ...(meta.unlock ? { unlockHeadline: t(meta.unlock.boss ? 'unlock.condition.dungeonCleared' : 'unlock.condition.met', { dungeon }),
      unlockDetail: t('unlock.partySlot', { slot: meta.unlock.slot }) } : {}),
  };
}
export interface DiaryMetadata {
  version: 1;
  quest?: { label?: DiaryText; legacyLabel?: string; jewel: [JewelKey, number] };
  unlock?: { boss: boolean; slot: number };
}
export function renderExpeditionMetadata(log: ExpeditionLog): ExpeditionLog {
  if (log.compactVersion !== 1) return log;
  return { ...log, dungeonName: getDungeonById(log.dungeonId)?.name ?? log.dungeonName,
    autoSellItems: log.autoSellItems.map(item => item.item ? { ...item, itemName: diaryItemName(item.item) } : item),
    entries: log.entries.map(entry => {
      const suffix = entry.roomType === 'battle_Elite' ? ' (ELITE)' : entry.roomType === 'battle_Boss' ? (entry.godsBattle ? ` ${t('game.log.godsBattleSuffix')}` : ' (BOSS)') : '';
      return { ...entry,
        enemyName: entry.enemySnapshot ? formatEnemyDefName(entry.enemySnapshot) + suffix : entry.gateText ? t('auto.jp.270d06353e') : entry.enemyName,
        ...(entry.gateText ? { gateInfo: renderDiaryText(entry.gateText) } : {}),
        ...(entry.rewardItems?.length ? { reward: entry.rewardItems.map(diaryItemName).join(' / ') } : {}),
      };
    }),
  };
}
// Stateless decoding: only expanded rooms allocate narration; no retained cache or RNG.
export function renderDiaryBattle(entry: ExpeditionLogEntry): BattleLogEntry[] {
  const battle = entry.compactBattle ? renderCompactBattle(entry.compactBattle) : entry.details;
  const end = (entry.endEvents ?? []).flatMap((event): BattleLogEntry[] => {
    switch (event[0]) {
      case 0: return buildPostBattleEffectLogs([event[1]]);
      case 1: return [buildAuriferousLogEntry(event[1])];
      case 2: return [{ phase: 'end', actor: 'effect', action: t('game.log.itemObtained', { item: diaryItemName(event[1]) }), ...(event[2] ? { note: t('game.log.autoSellTarget', { amount: event[2] }) } : {}) }];
      case 3: return [{ phase: 'end', actor: 'deity', action: t('auto.jp.2660ad39fa'), note: t('auto.jp.36cbc2e27f') }];
      case 4: return [{ phase: 'end', actor: 'deity', action: t('auto.jp.96b6003d0c') }];
    }
  });
  return [...battle, ...end];
}
export function hasDiaryBattle(entry: ExpeditionLogEntry): boolean { return !!(entry.compactBattle?.events.length || entry.endEvents?.length || entry.details.length); }

export function semanticBattleAction(entry: BattleLogEntry): string {
  if (entry.actor === 'effect' || entry.actor === 'triggered') return entry.action;
  const missed = (entry.totalAttempts ?? 0) > 0 && entry.hits === 0 && !entry.wasNegated;
  if (entry.actor === 'enemy') {
    if (entry.isResurrection) return t('battleLog.action.enemyResurrect', { action: entry.action });
    if (entry.isEnemyTargetHit) return missed ? t('battleLog.action.targetHitMissed', { action: entry.targetDisplayName ?? entry.action }) : entry.action;
    if (missed) return t('battleLog.action.enemyMissed', { action: entry.action.replace(/[！!]$/u, '') });
    return entry.actionIncludesActor ? entry.action : t('battleLog.action.enemyActed', { action: entry.action });
  }
  return missed ? t('battleLog.action.partyMissed', { actor: entry.actorDisplayName ?? t('battle.actor.ally') }) : entry.action;
}

/** Explicit semantic flags for new entries; prose compatibility is legacy-only. */
export function diaryBattleFlags(entry: BattleLogEntry | undefined): { stealth: boolean; counterNegated: boolean } {
  if (!entry || entry.actor !== 'effect') return { stealth: false, counterNegated: false };
  if (entry.semanticPresentation) return { stealth: entry.effectKind === 'stealth', counterNegated: false };
  return { stealth: entry.effectKind === 'stealth' || entry.action.includes('物陰に隠れて') || entry.action.includes('への攻撃はすべて幻だった！'), counterNegated: entry.action.includes('反撃無効化により') };
}
