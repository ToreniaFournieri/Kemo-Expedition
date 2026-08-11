import type { DiaryLog, ExpeditionLog, Item, ItemRarity, Party } from '../types/index.ts';

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
    actionText: entry.action,
    noteText: entry.note ?? null,
    ...(entry.attackType !== undefined ? { attackType: entry.attackType } : {}),
    ...(entry.initiativeRoll !== undefined ? { initiative: entry.initiativeRoll } : {}),
    ...(entry.characterId !== undefined ? { characterId: entry.characterId } : {}),
    ...(entry.effectKind !== undefined ? { effectKind: entry.effectKind } : {}),
    ...(entry.effectSourceName !== undefined ? { effectSourceDisplayName: entry.effectSourceName } : {}),
    ...(entry.effectTargetName !== undefined ? { effectTargetDisplayName: entry.effectTargetName } : {}),
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

// SpecRef: 9.1.3 | Experimental AI API | Retained battle-log read model
export function buildExperimentalBattleLog(
  revision: number,
  partyId: number,
  log: ExpeditionLog,
  source: { kind: 'latest'; diaryEntryId: null } | { kind: 'diary'; diaryEntryId: string },
  getDisplayName: (item: Item) => string = (item) => item.name,
) {
  return {
    revision,
    source,
    battleLog: {
      partyId,
      dungeonId: log.dungeonId,
      difficultyOffset: log.difficultyOffset,
      finalOutcome: log.finalOutcome,
      totalExperience: log.totalExperience,
      completedRooms: log.completedRooms,
      totalRooms: log.totalRooms,
      remainingPartyHp: log.remainingPartyHP,
      maximumPartyHp: log.maxPartyHP,
      rewards: log.rewards.map((item) => ({
        itemId: item.id,
        category: item.category,
        tier: Math.max(1, Math.floor(item.id / 1000)),
        rarity: retainedLogRarity(item),
        enhancement: item.enhancement,
        superRare: item.superRare,
        displayName: getDisplayName(item),
      })),
      autoSell: { count: log.autoSellCount, gold: log.autoSellProfit },
      rooms: log.entries.map((entry) => ({
        room: entry.room,
        floor: entry.floor ?? null,
        roomInFloor: entry.roomInFloor ?? null,
        roomType: entry.roomType ?? null,
        enemyId: entry.enemyId ?? null,
        enemyDisplayName: entry.enemyName || null,
        enemyMaximumHp: entry.enemyHP,
        outcome: entry.outcome,
        damageDealt: entry.damageDealt,
        damageTaken: entry.damageTaken,
        startingPartyHp: entry.startPartyHP ?? null,
        remainingPartyHp: entry.remainingPartyHP,
        maximumPartyHp: entry.maxPartyHP,
        healAmount: entry.healAmount ?? null,
        attritionAmount: entry.attritionAmount ?? null,
        events: entry.details.map(serializeRetainedBattleEvent),
      })),
    },
  };
}

// SpecRef: 9.1.3 | Experimental AI API | GET diary entries
export function buildExperimentalDiaryEntries(
  parties: Party[],
  revision: number,
  getTitleText: (party: Party, diaryLog: DiaryLog) => string = (party, diaryLog) => `[${party.name}] ${diaryLog.triggers.join(', ')}`,
) {
  return {
    revision,
    entries: parties
      .flatMap((party, partyOrder) => (party.diaryLogs ?? []).map((diaryLog, entryOrder) => ({
        party,
        diaryLog,
        partyOrder,
        entryOrder,
      })))
      .sort((left, right) => (
        right.diaryLog.createdAt - left.diaryLog.createdAt
        || left.party.id - right.party.id
        || left.partyOrder - right.partyOrder
        || left.entryOrder - right.entryOrder
      ))
      .slice(0, 24)
      .map(({ party, diaryLog }) => ({
        id: diaryLog.id,
        partyId: party.id,
        partyDisplayName: party.name,
        createdAt: diaryLog.createdAt,
        isRead: diaryLog.isRead,
        triggers: [...diaryLog.triggers],
        titleText: getTitleText(party, diaryLog),
        detailText: diaryLog.unlockDetail ?? diaryLog.sideQuestDetail ?? diaryLog.expeditionLog.dungeonName ?? null,
        expedition: {
          dungeonId: diaryLog.expeditionLog.dungeonId,
          difficultyOffset: diaryLog.expeditionLog.difficultyOffset,
          finalOutcome: diaryLog.expeditionLog.finalOutcome,
          completedRooms: diaryLog.expeditionLog.completedRooms,
          totalRooms: diaryLog.expeditionLog.totalRooms,
        },
      })),
  };
}
