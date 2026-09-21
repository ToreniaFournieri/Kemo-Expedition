import { getDungeonById } from '../../data/dungeons.ts';
import { ENEMIES } from '../../data/enemies.ts';
import { formatEnemyDefName } from '../../game/enemyDisplay.ts';
import { DIARY_EVENT_CODES } from '../../game/compactBattleLog.ts';
import { renderExpeditionMetadata, type DiaryEndEvent } from '../../game/compactDiary.ts';
import { t } from '../../i18n/index.ts';
import type {
  AttackType,
  BattleLogEntry,
  ExpeditionLog,
  ExpeditionLogEntry,
  Item,
  RoomType,
} from '../../types/index.ts';
import { parseItemFormat } from './itemFormat.ts';

// SpecRef: 9.1.3 | Read | 2-2-2 {p}/latestBattleLog
// The API deliberately returns language-neutral facts. This view is the renderer-side adapter: public room and reward
// facts are authoritative, while retained narration is copied only at this boundary because the public contract does not
// publish rendered prose, replay metadata, enemy snapshots, or per-room reward labels.

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

const API_OPCODE_NAMES = new Map<number, string>(Object.entries(DIARY_EVENT_CODES).map(([name, code]) => [code, name]));

function actorName(room: ApiBattleRoom, id: number): string {
  const actor = room.actors?.find((candidate) => candidate.id === id);
  if (actor?.name) return actor.name;
  if (actor?.kind === 'enemy' && actor.enemyId !== undefined) {
    const enemy = ENEMIES.find((candidate) => candidate.id === actor.enemyId);
    if (enemy) return formatEnemyDefName(enemy);
  }
  return id === 0 ? t('battle.actor.ally') : `${t('home.battle.enemyPrefix')} ${id}`;
}

function actorKind(room: ApiBattleRoom, id: number): 'character' | 'enemy' | 'effect' {
  return room.actors?.find((candidate) => candidate.id === id)?.kind ?? 'effect';
}

function attackType(value: unknown): AttackType | undefined {
  return value === 'ranged' || value === 'magical' || value === 'melee' ? value : undefined;
}

function elementalOffense(value: unknown): BattleLogEntry['elementalOffense'] | undefined {
  return value === 'none' || value === 'fire' || value === 'thunder' || value === 'ice' ? value : undefined;
}

function abilityLabel(ability: unknown): string {
  if (typeof ability !== 'string' || ability.length === 0) return t('battleLog.action.attackName');
  return t(`ability.${ability}.label`);
}

function compactEventToBattleLogEntry(room: ApiBattleRoom, event: ApiBattleLogEvent): BattleLogEntry {
  const [, , actorId, opcodeNumber, targetId, element, hits, attempts, eventValue, eventFacts] = event;
  const opcode = API_OPCODE_NAMES.get(opcodeNumber) ?? `event ${opcodeNumber}`;
  const facts = eventFacts ?? {};
  const actor = actorKind(room, actorId);
  const target = actorName(room, targetId);
  const source = actorName(room, actorId);
  const type = attackType(facts.attackType);
  const ability = facts.ability;
  const reaction = typeof facts.reaction === 'number' ? facts.reaction : 0;
  const phaseNumber = typeof facts.phase === 'number' ? facts.phase : 2;
  const phase: BattleLogEntry['phase'] = phaseNumber >= 3 ? 'end' : phaseNumber <= 1 ? 'start' : 'combat';
  const isAttack = opcode === 'attack';
  const isEnemy = actor === 'enemy';
  const action = isAttack
    ? isEnemy
      ? type === 'magical'
        ? t('battleLog.action.targetMagicHit', { target })
        : t('battleLog.action.targetAttack', { target, attack: reaction === 3 ? t('battleLog.action.reAttackName') : t('battleLog.action.attackName') })
      : t(type === 'magical' ? 'battleLog.action.characterSpellCast' : 'battleLog.action.characterAttack', {
        actor: source,
        attack: ability ? abilityLabel(ability) : reaction === 3 ? t('battleLog.action.reAttackName') : t('battleLog.action.attackName'),
      })
    : opcode === 'terrain_effect'
      ? t('battle.action.discordDeityEffect')
      : opcode === 'ability_activated'
        ? t('battle.action.ownerAbility', { owner: source, ability: abilityLabel(ability) })
        : opcode === 'resurrected' || opcode === 'reanimated'
          ? t('battleLog.action.enemyResurrect', { action: source })
          : opcode === 'action_skipped'
            ? t('battle.action.ownerAbility', { owner: source, ability: abilityLabel(ability) })
            : `${source}: ${abilityLabel(ability)}`;

  const value = typeof facts.sourceValue === 'number' ? facts.sourceValue : eventValue;
  const secondaryValue = typeof facts.secondaryValue === 'number' ? facts.secondaryValue : undefined;
  return {
    semanticPresentation: true,
    phase,
    actor: isAttack ? (isEnemy ? 'enemy' : 'character') : actor === 'character' ? 'triggered' : actor,
    ...(actor === 'character' ? { characterId: actorId } : {}),
    action,
    ...(type ? { attackType: type } : {}),
    ...(elementalOffense(element) ? { elementalOffense: elementalOffense(element) } : {}),
    ...(hits >= 0 ? { hits } : {}),
    ...(attempts >= 0 ? { totalAttempts: attempts } : {}),
    ...(isAttack ? { damage: secondaryValue ?? value, damageTarget: isEnemy ? 'party' : 'enemy' as const } : {}),
    ...(reaction === 3 ? { isReAttack: true } : {}),
    ...(reaction >= 4 && reaction <= 7 ? { isCounter: true } : {}),
    ...(isEnemy && type === 'magical' ? { isEnemyTargetHit: true } : {}),
    ...(opcode === 'nullified' ? { wasNegated: true } : {}),
  };
}

function publicEventsToBattleLog(room: ApiBattleRoom): BattleLogEntry[] {
  if (room.eventFormat === 'legacy-facts') {
    return room.events.map((event) => {
      const value = event as ApiLegacyBattleEvent;
      const actor = value.actor === 'enemy' ? 'enemy' : value.actor === 'character' ? 'character' : 'effect';
      const phase = value.phase === 'end' ? 'end' : value.phase === 'start' ? 'start' : 'combat';
      return {
        semanticPresentation: true,
        phase,
        actor,
        ...(typeof value.characterId === 'number' ? { characterId: value.characterId } : {}),
        action: typeof value.action === 'string' ? value.action : `${actor}: ${String(value.effectKind ?? 'event')}`,
        ...(attackType(value.attackType) ? { attackType: attackType(value.attackType) } : {}),
        ...(typeof value.damage === 'number' ? { damage: value.damage } : {}),
        ...(typeof value.hits === 'number' ? { hits: value.hits } : {}),
        ...(typeof value.attempts === 'number' ? { totalAttempts: value.attempts } : {}),
      } satisfies BattleLogEntry;
    });
  }
  return room.events.map((event) => compactEventToBattleLogEntry(room, event as ApiBattleLogEvent));
}

function roomEnemyName(room: ApiBattleRoom, source?: ExpeditionLogEntry): string {
  if (source?.enemyName) return source.enemyName;
  const enemy = room.enemyId === null ? undefined : ENEMIES.find((candidate) => candidate.id === room.enemyId);
  if (!enemy) return room.enemyId === null ? '-' : `${t('home.battle.enemyPrefix')} ${room.enemyId}`;
  const suffix = room.roomType === 'battle_Elite' ? ' (ELITE)' : room.roomType === 'battle_Boss' ? ' (BOSS)' : '';
  return `${formatEnemyDefName(enemy)}${suffix}`;
}

/**
 * Whether a retained room is the room the projection describes. Narration is copied from the retained log only for a room
 * that matches on every fact both sides carry, so a retained log that is newer or older than the projection (they are read
 * at different moments) can never lend its narration to another room.
 */
export function retainedRoomMatches(source: ExpeditionLogEntry, room: ApiBattleRoom): boolean {
  return source.room === room.room
    && (source.enemyId ?? null) === room.enemyId
    && source.outcome === room.outcome
    && source.damageDealt === room.damageDealt
    && source.damageTaken === room.damageTaken
    && source.remainingPartyHP === room.remainingPartyHp
    && (source.floor ?? null) === room.floor
    && (source.roomInFloor ?? null) === room.roomInFloor;
}

function roomNarrationEntry(retainedSource: ExpeditionLogEntry | undefined, room: ApiBattleRoom): ExpeditionLogEntry {
  const source = retainedSource && retainedRoomMatches(retainedSource, room) ? retainedSource : undefined;
  const details = source?.details?.length ? source.details : publicEventsToBattleLog(room);
  const endEvents = source?.endEvents ?? room.endEvents as DiaryEndEvent[];
  return {
    ...(source ?? {}),
    room: room.room,
    floor: room.floor ?? undefined,
    roomInFloor: room.roomInFloor ?? undefined,
    roomType: (room.roomType ?? source?.roomType) as RoomType | undefined,
    enemyId: room.enemyId ?? source?.enemyId,
    enemyName: roomEnemyName(room, source),
    enemyHP: room.enemyMaximumHp,
    enemyAttackValues: source?.enemyAttackValues ?? '0/0/0',
    outcome: room.outcome,
    damageDealt: room.damageDealt,
    damageTaken: room.damageTaken,
    startPartyHP: room.startingPartyHp ?? undefined,
    remainingPartyHP: room.remainingPartyHp,
    maxPartyHP: room.maximumPartyHp,
    healAmount: room.healAmount ?? undefined,
    attritionAmount: room.attritionAmount ?? undefined,
    details,
    ...(endEvents.length > 0 ? { endEvents: [...endEvents] } : {}),
  };
}

export function buildExpeditionLogView(
  projection: LatestBattleLogProjection | null | undefined,
  retainedNarration?: ExpeditionLog | null,
): ExpeditionLogView | null {
  const log = projection?.battleLog;
  if (!log) return null;
  const narrated = retainedNarration && retainedNarration.dungeonId === log.dungeonId ? renderExpeditionMetadata(retainedNarration) : null;
  const sourceByRoom = new Map((narrated?.entries ?? []).map((entry) => [entry.room, entry]));
  const dungeonName = getDungeonById(log.dungeonId)?.name ?? narrated?.dungeonName ?? `${t('expedition.floor', { floor: log.dungeonId })}`;
  return {
    logId: log.logId,
    dungeonId: log.dungeonId,
    dungeonName,
    difficultyOffset: log.difficultyOffset,
    totalExperience: log.totalExperience,
    totalRooms: log.totalRooms,
    completedRooms: log.completedRooms,
    finalOutcome: log.finalOutcome,
    rewards: log.rewards.flatMap((reward) => {
      const item = parseItemFormat(reward.item);
      return item ? [item] : [];
    }),
    autoSellProfit: log.autoSell.gold,
    autoSellCount: log.autoSell.count,
    entries: log.rooms.map((room) => roomNarrationEntry(sourceByRoom.get(room.room), room)),
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
}

/**
 * The view of a party's running exploration: its revealed rooms and nothing else. The result, experience, and rewards of the
 * exploration are not disclosed until it ends, so they are empty and `finalOutcome` is `null`.
 */
export function buildExploringLogView(exploration: ExplorationProjection, retainedNarration?: ExpeditionLog | null): ExpeditionLogView {
  const narrated = retainedNarration && retainedNarration.dungeonId === exploration.dungeonId ? renderExpeditionMetadata(retainedNarration) : null;
  const sourceByRoom = new Map((narrated?.entries ?? []).map((entry) => [entry.room, entry]));
  return {
    logId: 'exploring',
    dungeonId: exploration.dungeonId,
    dungeonName: getDungeonById(exploration.dungeonId)?.name ?? `${t('expedition.floor', { floor: exploration.dungeonId })}`,
    difficultyOffset: exploration.difficultyOffset,
    totalExperience: 0,
    totalRooms: exploration.totalRooms,
    completedRooms: exploration.rooms.length,
    finalOutcome: null,
    entries: exploration.rooms.map((room) => roomNarrationEntry(sourceByRoom.get(room.room), room)),
    rewards: [],
    autoSellProfit: 0,
    autoSellCount: 0,
  };
}

/**
 * The view the Expedition pane renders for one party. While the party is exploring it is the running exploration's revealed
 * rooms (from the same Expedition projection that gates them); otherwise it is the newest disclosed log. The retained log is
 * only a source of narration, and only for rooms it matches.
 */
export function buildPartyExpeditionLogView(input: {
  exploration: ExplorationProjection | null | undefined;
  latestBattleLog: LatestBattleLogProjection | null | undefined;
  retained: ExpeditionLog | null | undefined;
}): ExpeditionLogView | null {
  if (input.exploration) return buildExploringLogView(input.exploration, input.retained);
  return buildExpeditionLogView(input.latestBattleLog, input.retained);
}
