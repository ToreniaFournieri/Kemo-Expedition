import { getDungeonById } from '../../data/dungeons.ts';
import { ENEMIES } from '../../data/enemies.ts';
import { getItemById } from '../../data/items.ts';
import { formatEnemyDefName } from '../../game/enemyDisplay.ts';
import type { CompactBattleLog } from '../../game/compactBattleLog.ts';
import { renderExpeditionMetadata, type DiaryEndEvent, type DiaryItem, type DiaryText } from '../../game/compactDiary.ts';
import { t } from '../../i18n/index.ts';
import type {
  BattleLogEntry,
  EnemyDef,
  ExpeditionLog,
  ExpeditionLogEntry,
  Item,
  ItemRarity,
  RoomType,
} from '../../types/index.ts';
import { parseItemFormat } from './itemFormat.ts';

// SpecRef: 9.1.3 | Read | 2-2-2 {p}/latestBattleLog
// The renderer-side adapter for the Expedition pane. A retained battle log is described completely by the API response: the
// public facts of `battleLog` (rooms, HP, outcome, rewards) and the supporting `resources` (the stored language-neutral
// records, the enemy as it was met, and the prose of a legacy record). This module rebuilds the view the pane draws from
// those two members alone; it reads no game state, so a view can never mix two logs.

export type ApiBattleLogEvent = readonly [
  category: number,
  timing: number,
  actorId: number,
  opcode: number,
  targetId: number,
  element: string,
  hits: number,
  attempts: number,
  value: number,
  facts: Record<string, string | number | boolean | null>,
];

export interface ApiLegacyBattleEvent {
  readonly [key: string]: string | number | boolean | Record<string, number | boolean> | undefined;
}

export interface ApiBattleRoom {
  readonly room: number;
  readonly floor: number | null;
  readonly roomInFloor: number | null;
  readonly roomType: string | null;
  readonly enemyId: number | null;
  readonly enemyMaximumHp: number;
  readonly outcome: 'victory' | 'defeat' | 'draw';
  readonly damageDealt: number;
  readonly damageTaken: number;
  readonly startingPartyHp: number | null;
  readonly remainingPartyHp: number;
  readonly maximumPartyHp: number;
  readonly healAmount: number | null;
  readonly attritionAmount: number | null;
  readonly endEvents: readonly unknown[];
  readonly eventFormat: 'compact-v1' | 'legacy-facts';
  readonly terrain?: string | null;
  readonly actors?: readonly { id: number; kind: 'character' | 'enemy'; enemyId?: number; characterId?: number; name?: string }[];
  readonly modifiers?: readonly unknown[];
  readonly events: readonly (ApiBattleLogEvent | ApiLegacyBattleEvent)[];
}

export interface ApiBattleLog {
  readonly logId: string;
  readonly partyNumber: number;
  readonly dungeonId: number;
  readonly difficultyOffset: number;
  readonly finalOutcome: 'Clear' | 'Return' | 'Draw' | 'Retreat' | 'Defeat';
  readonly totalExperience: number;
  readonly completedRooms: number;
  readonly totalRooms: number;
  readonly remainingPartyHp: number;
  readonly maximumPartyHp: number;
  readonly rewards: readonly { item: string; itemId: number; category: string; tier: number; rarity: string; enhancement: number; superRare: number }[];
  readonly autoSell: { count: number; gold: number };
  readonly rooms: readonly ApiBattleRoom[];
}

export interface LatestBattleLogProjection {
  readonly battleLog: ApiBattleLog | null;
  readonly resources?: ApiBattleLogResources | null;
  readonly bottleneckEnemies?: readonly unknown[];
}

export interface ExpeditionLogView {
  readonly logId: string;
  readonly dungeonId: number;
  readonly dungeonName: string;
  readonly difficultyOffset: number;
  readonly totalExperience: number;
  readonly totalRooms: number;
  readonly completedRooms: number;
  /** `null` while the exploration is still running: the result is not disclosed until it ends. */
  readonly finalOutcome: ApiBattleLog['finalOutcome'] | null;
  readonly entries: ExpeditionLogEntry[];
  readonly rewards: Item[];
  readonly autoSellProfit: number;
  readonly autoSellCount: number;
  readonly autoSellMultiplier?: number;
}

/** The stored records of one room (Spec 9.1.3, 2-2-2 `resources`). */
export interface ApiRoomResources {
  readonly room: number;
  readonly godsBattle: boolean;
  readonly gateText: DiaryText | null;
  readonly postBattlePartyHp: number | null;
  readonly enemy: EnemyDef | null;
  readonly rewardItems: readonly DiaryItem[];
  readonly battle: { readonly format: 'compact-v1'; readonly log: CompactBattleLog } | { readonly format: 'legacy'; readonly details: readonly BattleLogEntry[] };
  readonly endEvents: readonly DiaryEndEvent[];
  readonly legacyText: { readonly enemyName: string; readonly gateInfo: string | null; readonly reward: string | null; readonly rewardRarity: string | null; readonly rewardIsSuperRare: boolean | null } | null;
}

export interface ApiBattleLogResources {
  readonly rooms: readonly ApiRoomResources[];
  readonly autoSellMultiplier: number | null;
  /** `true` for a compact (language-neutral) record, whose names and texts are rendered from its facts. */
  readonly compact: boolean;
}

function toItem(diary: DiaryItem): Item | null {
  const base = getItemById(diary.id);
  return base ? { ...base, enhancement: diary.enhancement, superRare: diary.superRare, jewel: diary.jewel ?? null } : null;
}

function roomEnemyName(room: ApiBattleRoom, resources: ApiRoomResources | undefined): string {
  if (resources?.legacyText) return resources.legacyText.enemyName;
  const enemy = room.enemyId === null ? undefined : ENEMIES.find((candidate) => candidate.id === room.enemyId);
  if (!enemy) return room.enemyId === null ? '-' : `${t('home.battle.enemyPrefix')} ${room.enemyId}`;
  const suffix = room.roomType === 'battle_Elite' ? ' (ELITE)' : room.roomType === 'battle_Boss' ? ' (BOSS)' : '';
  return `${formatEnemyDefName(enemy)}${suffix}`;
}

function roomEntry(room: ApiBattleRoom, resources: ApiRoomResources | undefined): ExpeditionLogEntry {
  const legacy = resources?.legacyText;
  const rewardItems = (resources?.rewardItems ?? []).flatMap((item) => { const built = toItem(item); return built ? [built] : []; });
  return {
    room: room.room,
    floor: room.floor ?? undefined,
    roomInFloor: room.roomInFloor ?? undefined,
    roomType: (room.roomType ?? undefined) as RoomType | undefined,
    enemyId: room.enemyId ?? undefined,
    enemyName: roomEnemyName(room, resources),
    enemyHP: room.enemyMaximumHp,
    enemyAttackValues: '0/0/0',
    outcome: room.outcome,
    damageDealt: room.damageDealt,
    damageTaken: room.damageTaken,
    startPartyHP: room.startingPartyHp ?? undefined,
    postBattlePartyHP: resources?.postBattlePartyHp ?? undefined,
    remainingPartyHP: room.remainingPartyHp,
    maxPartyHP: room.maximumPartyHp,
    healAmount: room.healAmount ?? undefined,
    attritionAmount: room.attritionAmount ?? undefined,
    ...(resources?.godsBattle ? { godsBattle: true } : {}),
    ...(resources?.gateText ? { gateText: resources.gateText } : {}),
    ...(resources?.enemy ? { enemySnapshot: resources.enemy } : {}),
    ...(rewardItems.length > 0 ? { rewardItems } : {}),
    ...(legacy?.gateInfo ? { gateInfo: legacy.gateInfo } : {}),
    ...(legacy?.reward ? { reward: legacy.reward } : {}),
    ...(legacy?.rewardRarity ? { rewardRarity: legacy.rewardRarity as ItemRarity } : {}),
    ...(legacy?.rewardIsSuperRare !== null && legacy?.rewardIsSuperRare !== undefined ? { rewardIsSuperRare: legacy.rewardIsSuperRare } : {}),
    ...(resources?.battle.format === 'compact-v1' ? { compactBattle: resources.battle.log } : {}),
    details: resources?.battle.format === 'legacy' ? [...resources.battle.details] : [],
    ...(resources && resources.endEvents.length > 0 ? { endEvents: [...resources.endEvents] } : {}),
  };
}

/** Rebuilds the rendered entries of `rooms` from their public facts and stored resources, in the current language. */
function buildEntries(rooms: readonly ApiBattleRoom[], resources: ApiBattleLogResources | null | undefined, header: { dungeonId: number; difficultyOffset: number; totalRooms: number; completedRooms: number; totalExperience: number; finalOutcome: ExpeditionLog['finalOutcome']; rewards: Item[]; autoSellProfit: number; autoSellCount: number; maximumPartyHp: number; remainingPartyHp: number }): ExpeditionLogEntry[] {
  const byRoom = new Map((resources?.rooms ?? []).map((entry) => [entry.room, entry]));
  const log: ExpeditionLog = {
    ...(resources?.compact ? { compactVersion: 1 as const } : {}),
    dungeonId: header.dungeonId,
    dungeonName: '',
    difficultyOffset: header.difficultyOffset,
    totalExperience: header.totalExperience,
    totalRooms: header.totalRooms,
    completedRooms: header.completedRooms,
    finalOutcome: header.finalOutcome,
    entries: rooms.map((room) => roomEntry(room, byRoom.get(room.room))),
    rewards: header.rewards,
    autoSellProfit: header.autoSellProfit,
    autoSellCount: header.autoSellCount,
    autoSellItems: [],
    remainingPartyHP: header.remainingPartyHp,
    maxPartyHP: header.maximumPartyHp,
  };
  // The compact record's enemy names, gate texts, and reward labels are rendered from its facts in the current language.
  return renderExpeditionMetadata(log).entries;
}

export function buildExpeditionLogView(projection: LatestBattleLogProjection | null | undefined): ExpeditionLogView | null {
  const log = projection?.battleLog;
  if (!log) return null;
  const rewards = log.rewards.flatMap((reward) => {
    const item = parseItemFormat(reward.item);
    return item ? [item] : [];
  });
  const entries = buildEntries(log.rooms, projection?.resources, {
    dungeonId: log.dungeonId, difficultyOffset: log.difficultyOffset, totalRooms: log.totalRooms, completedRooms: log.completedRooms, totalExperience: log.totalExperience,
    finalOutcome: log.finalOutcome === 'Draw' ? 'Retreat' : log.finalOutcome, rewards, autoSellProfit: log.autoSell.gold, autoSellCount: log.autoSell.count,
    maximumPartyHp: log.maximumPartyHp, remainingPartyHp: log.remainingPartyHp,
  });
  return {
    logId: log.logId,
    dungeonId: log.dungeonId,
    dungeonName: getDungeonById(log.dungeonId)?.name ?? `${t('expedition.floor', { floor: log.dungeonId })}`,
    difficultyOffset: log.difficultyOffset,
    totalExperience: log.totalExperience,
    totalRooms: log.totalRooms,
    completedRooms: log.completedRooms,
    finalOutcome: log.finalOutcome,
    entries,
    rewards,
    autoSellProfit: log.autoSell.gold,
    autoSellCount: log.autoSell.count,
    ...(projection?.resources?.autoSellMultiplier != null ? { autoSellMultiplier: projection.resources.autoSellMultiplier } : {}),
  };
}

/** The running exploration in the Expedition projection: only rooms revealed as of the read. */
export interface ExplorationProjection {
  readonly dungeonId: number;
  readonly difficultyOffset: number;
  readonly totalRooms: number;
  readonly revealedRoomCount: number;
  readonly nextRevealAt: string | null;
  readonly rooms: readonly ApiBattleRoom[];
  readonly resources: { readonly rooms: readonly ApiRoomResources[]; readonly compact: boolean };
}

/**
 * The view of a party's running exploration: its revealed rooms and nothing else. The result, experience, and rewards of the
 * exploration are not disclosed until it ends, so they are empty and `finalOutcome` is `null`.
 */
export function buildExploringLogView(exploration: ExplorationProjection): ExpeditionLogView {
  const entries = buildEntries(exploration.rooms, { ...exploration.resources, autoSellMultiplier: null }, {
    dungeonId: exploration.dungeonId, difficultyOffset: exploration.difficultyOffset, totalRooms: exploration.totalRooms, completedRooms: exploration.rooms.length, totalExperience: 0,
    finalOutcome: 'Return', rewards: [], autoSellProfit: 0, autoSellCount: 0, maximumPartyHp: 0, remainingPartyHp: 0,
  });
  return {
    logId: 'exploring',
    dungeonId: exploration.dungeonId,
    dungeonName: getDungeonById(exploration.dungeonId)?.name ?? `${t('expedition.floor', { floor: exploration.dungeonId })}`,
    difficultyOffset: exploration.difficultyOffset,
    totalExperience: 0,
    totalRooms: exploration.totalRooms,
    completedRooms: exploration.rooms.length,
    finalOutcome: null,
    entries,
    rewards: [],
    autoSellProfit: 0,
    autoSellCount: 0,
  };
}

/**
 * The view the Expedition pane renders for one party: the running exploration's revealed rooms while it explores, otherwise
 * the newest disclosed log. Both come from the API alone.
 */
export function buildPartyExpeditionLogView(input: {
  exploration: ExplorationProjection | null | undefined;
  latestBattleLog: LatestBattleLogProjection | null | undefined;
}): ExpeditionLogView | null {
  if (input.exploration) return buildExploringLogView(input.exploration);
  return buildExpeditionLogView(input.latestBattleLog);
}
