import { decodeCompactBattleEvents, DIARY_EVENT_CODES, getDiaryEventCategory, type CompactBattleLog } from '../../game/compactBattleLog.ts';
import { getDungeonById, getEffectiveEnemyLevel } from '../../data/dungeons.ts';
import type { ExpeditionLog, Item, ItemRarity } from '../../types/index.ts';
import { buildEnemyStatus, type EnemyStatus } from './enemyStatus.ts';
import { apiExpeditionOutcome } from './expeditionOutcome.ts';
import { formatItem } from './itemFormat.ts';

function retainedLogRarity(item: Item): ItemRarity {
  const code = item.id % 1000;
  if (code >= 500) return 'mythicRare';
  if (code >= 400) return 'bossRare';
  if (code >= 300) return 'eliteRare';
  return code >= 200 ? 'uncommon' : 'common';
}

function serializeRetainedBattleEvent(entry: ExpeditionLog['entries'][number]['details'][number], index: number) {
  const modifiers = {
    ...(entry.rageBonusPercent !== undefined ? { rageBonusPercent: entry.rageBonusPercent } : {}),
    ...(entry.momentumBonusPercent !== undefined ? { momentumBonusPercent: entry.momentumBonusPercent } : {}),
    ...(entry.ambushMultiplier !== undefined ? { ambushMultiplier: entry.ambushMultiplier } : {}),
    ...(entry.overwatchMultiplier !== undefined ? { overwatchMultiplier: entry.overwatchMultiplier } : {}),
    ...(entry.executionMultiplier !== undefined ? { executionMultiplier: entry.executionMultiplier } : {}),
    ...(entry.swarmActorPenaltyPercent !== undefined ? { swarmActorPenaltyPercent: entry.swarmActorPenaltyPercent } : {}),
    ...(entry.swarmOpponentBonusPercent !== undefined ? { swarmOpponentBonusPercent: entry.swarmOpponentBonusPercent } : {}),
    ...(entry.isFirstStrike !== undefined ? { firstStrike: entry.isFirstStrike } : {}),
    ...(entry.isCounter !== undefined ? { counter: entry.isCounter } : {}),
    ...(entry.isReAttack !== undefined ? { reAttack: entry.isReAttack } : {}),
    ...(entry.wasNegated !== undefined ? { negated: entry.wasNegated } : {}),
    ...(entry.isAggregated !== undefined ? { aggregated: entry.isAggregated } : {}),
  };
  return {
    index: index + 1,
    phase: entry.phase,
    actor: entry.actor,
    legacyIncomplete: true,
    ...(entry.attackType !== undefined ? { attackType: entry.attackType } : {}),
    ...(entry.initiativeRoll !== undefined ? { initiative: entry.initiativeRoll } : {}),
    ...(entry.characterId !== undefined ? { characterId: entry.characterId } : {}),
    ...(entry.effectKind !== undefined ? { effectKind: entry.effectKind } : {}),
    ...(entry.effectHealAmount !== undefined ? { effectHealAmount: entry.effectHealAmount } : {}),
    ...(entry.damage !== undefined ? { damage: entry.damage } : {}),
    ...(entry.damageTarget !== undefined ? { damageTarget: entry.damageTarget } : {}),
    ...(entry.reflectedDamage !== undefined ? { reflectedDamage: entry.reflectedDamage } : {}),
    ...(entry.reflectedSourceDamage !== undefined ? { reflectedSourceDamage: entry.reflectedSourceDamage } : {}),
    ...(entry.reflectTarget !== undefined ? { reflectTarget: entry.reflectTarget } : {}),
    ...(entry.absorbedDamage !== undefined ? { absorbedDamage: entry.absorbedDamage } : {}),
    ...(entry.absorbTarget !== undefined ? { absorbTarget: entry.absorbTarget } : {}),
    ...(entry.hits !== undefined ? { hits: entry.hits } : {}),
    ...(entry.totalAttempts !== undefined ? { attempts: entry.totalAttempts } : {}),
    ...(entry.specialAttack !== undefined ? { specialAttack: entry.specialAttack } : {}),
    ...(entry.elementalOffense !== undefined ? { elementalOffense: entry.elementalOffense } : {}),
    ...(Object.keys(modifiers).length > 0 ? { modifiers } : {}),
  };
}

function compactApiBattle(log: CompactBattleLog) {
  const events = decodeCompactBattleEvents(log);
  const actors = new Map(log.actors.map(actor => [actor.id, actor]));
  return {
    eventFormat: 'compact-v1' as const,
    terrain: log.terrain ?? null,
    actors: log.actors.map(actor => ({ id: actor.id, kind: actor.kind,
      ...(actor.kind === 'enemy' ? { enemyId: actor.id - 0x80000000 } : { characterId: actor.id, name: actor.name }),
    })),
    modifiers: events.filter(event => event.opcode === 'diagnostic').map(event => [
      event.actorId, event.targetId, event.timing, event.attackType, event.aux0,
      event.flags, event.aux1, event.value0, event.value1, event.value2,
    ]),
    events: events.filter(event => !['random_flavor', 'initiative', 'diagnostic'].includes(event.opcode)).map(event => {
      const attack = event.opcode === 'attack';
      const special = ['gravity_well', 'armor_break', 'mana_break'].includes(event.abilityId ?? '');
      const element = event.abilityId === 'burn' ? 'fire'
        : event.opcode === 'terrain_effect' && ['terrain.conduction', 'terrain.sacred-judgement', 'terrain.chain-lightning'].includes(log.terrain ?? '') ? 'thunder'
        : attack ? actors.get(event.actorId)?.elementalOffense ?? 'none' : 'none';
      const value = attack && !special ? event.value1 : event.value0;
      const facts = {
        ...(event.phase !== 2 ? { phase: event.phase } : {}),
        ...(event.attackType ? { attackType: event.attackType } : {}),
        ...(event.abilityId ? { ability: event.abilityId } : {}),
        ...(event.aux0 ? (attack ? { reaction: event.aux0 } : { subtype: event.aux0 }) : {}),
        ...(event.flags ? { flags: event.flags } : {}),
        ...(attack && event.value0 !== value ? { sourceValue: event.value0 } : {}),
        ...(!attack && event.value1 ? { secondaryValue: event.value1 } : {}),
        ...(event.value2 ? { tertiaryValue: event.value2 } : {}),
      };
      return [getDiaryEventCategory(event), event.timing, event.actorId, DIARY_EVENT_CODES[event.opcode as keyof typeof DIARY_EVENT_CODES],
        event.targetId, element, event.hits, event.attempts, value, facts];
    }),
  };
}

/** The room's Bestiary status is derived from the enemy as it was scaled for the battle (`enemySnapshot`). */
function roomEnemyStatus(log: ExpeditionLog, entry: ExpeditionLog['entries'][number]): EnemyStatus | null {
  if (!entry.enemySnapshot) return null;
  const dungeon = getDungeonById(log.dungeonId);
  const level = dungeon && entry.floor && entry.roomType
    ? getEffectiveEnemyLevel(dungeon.expLevel, entry.floor, entry.roomType, false, log.difficultyOffset ?? 0)
    : null;
  return buildEnemyStatus(entry.enemySnapshot, level);
}

const BOTTLENECK_DAMAGE_PERCENT = 35;

// SpecRef: 9.1.3 | Read | 2-2-2 {p}/latestBattleLog
// The retained battle log of one expedition in its public, language-neutral shape (compact semantic events or the
// original legacy facts, never rendered narration), plus the enemies that were bottlenecks: a room where the party took
// at least 35% of its maximum HP in damage, or that ended in a draw or a defeat. Replay seeds are not published.
export function buildBattleLogData(log: ExpeditionLog | null, partyNumber: number, logId: string) {
  if (!log) return { battleLog: null, bottleneckEnemies: [] as never[] };
  const rooms = log.entries;
  return {
    battleLog: {
      logId,
      partyNumber,
      dungeonId: log.dungeonId,
      difficultyOffset: log.difficultyOffset,
      finalOutcome: apiExpeditionOutcome(log),
      totalExperience: log.totalExperience,
      completedRooms: log.completedRooms,
      totalRooms: log.totalRooms,
      remainingPartyHp: log.remainingPartyHP,
      maximumPartyHp: log.maxPartyHP,
      rewards: log.rewards.map((item) => ({
        item: formatItem(item, false),
        itemId: item.id,
        category: item.category,
        tier: Math.max(1, Math.floor(item.id / 1000)),
        rarity: retainedLogRarity(item),
        enhancement: item.enhancement,
        superRare: item.superRare,
      })),
      autoSell: { count: log.autoSellCount, gold: log.autoSellProfit },
      rooms: rooms.map((entry) => ({
        room: entry.room,
        floor: entry.floor ?? null,
        roomInFloor: entry.roomInFloor ?? null,
        roomType: entry.roomType ?? null,
        enemyId: entry.enemyId ?? null,
        enemyMaximumHp: entry.enemyHP,
        outcome: entry.outcome,
        damageDealt: entry.damageDealt,
        damageTaken: entry.damageTaken,
        startingPartyHp: entry.startPartyHP ?? null,
        remainingPartyHp: entry.remainingPartyHP,
        maximumPartyHp: entry.maxPartyHP,
        healAmount: entry.healAmount ?? null,
        attritionAmount: entry.attritionAmount ?? null,
        ...(entry.compactBattle ? compactApiBattle(entry.compactBattle) : {
          eventFormat: 'legacy-facts' as const,
          legacyIncomplete: true,
          events: entry.details.map(serializeRetainedBattleEvent),
        }),
        endEvents: (entry.endEvents ?? []).map((event) => {
          if (event[0] === 0) { const { flavorIndex: _flavor, ...facts } = event[1] as typeof event[1] & { flavorIndex?: number }; return [0, facts]; }
          if (event[0] === 1) { const { flavorIndex: _flavor, ...facts } = event[1]; return [1, facts]; }
          return event;
        }),
      })),
    },
    bottleneckEnemies: rooms.flatMap((entry) => {
      const damageTakenPercent = entry.maxPartyHP > 0 ? Math.round((entry.damageTaken / entry.maxPartyHP) * 1000) / 10 : 0;
      const byDamage = damageTakenPercent >= BOTTLENECK_DAMAGE_PERCENT;
      const byOutcome = entry.outcome === 'draw' || entry.outcome === 'defeat';
      if (!byDamage && !byOutcome) return [];
      return [{ room: entry.room, outcome: entry.outcome, damageTakenPercent, reasons: [...(byDamage ? ['damage' as const] : []), ...(byOutcome ? ['outcome' as const] : [])], enemy: roomEnemyStatus(log, entry) }];
    }),
  };
}
