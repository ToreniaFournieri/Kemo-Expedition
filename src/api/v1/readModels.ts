import { CLASSES } from '../../data/classes.ts';
import { projectDelivery, type ApiV1DeliveryRecord } from './deliveries.ts';
import { DEVELOPER_NEWS_ITEMS } from '../../data/developerNews.ts';
import { DUNGEONS } from '../../data/dungeons.ts';
import { ENEMIES } from '../../data/enemies.ts';
import { ITEMS, SUPER_RARE_TITLES } from '../../data/items.ts';
import { LINEAGES } from '../../data/lineages.ts';
import { PREDISPOSITIONS } from '../../data/predispositions.ts';
import { RACES } from '../../data/races.ts';
import { renderDiaryMetadata } from '../../game/compactDiary.ts';
import { getDeityId, getDeityRank, normalizeDeityName } from '../../game/deity.ts';
import { getInstantExpeditionChargeState } from '../../game/instantExpedition.ts';
import { getSavedEquipmentSlot } from '../../game/equipmentSets.ts';
import { computePartyStats } from '../../game/partyComputation.ts';
import { getXpToNextLevel } from '../../game/partyLevel.ts';
import { buildShopLineup, getShopRefreshPrice } from '../../game/shop.ts';
import type { GameState, Item, Party } from '../../types/index.ts';

// SpecRef: 9.1.4.7 | Observation projections | transport-neutral read models

export interface ApiV1ReadContext {
  readonly revision: number;
  readonly environment: string;
  readonly gameMode: 'mode.normal' | 'mode.orca';
  readonly enemyLevelOffset: number;
  readonly inGameTime: number;
  readonly simulation?: (partyIndex: number, count: number) => Promise<unknown>;
  readonly control?: { settings?: Record<string, unknown>; deliveries?: unknown[] };
}

function itemFormat(item: Item): string {
  return `${item.isLocked === true ? 1 : 0}/${item.id}/${item.enhancement}/${item.superRare}`;
}

function equipmentEntry(item: Item | null, slotIndex: number): string | 0 {
  if (!item) return 0;
  return `${slotIndex}/${itemFormat(item)}${item.jewel ? `/${item.jewel.key}:${item.jewel.rank}` : ''}`;
}

function partyByNumber(state: GameState, value: unknown): { party: Party; index: number } | null {
  const partyNumber = Number(value);
  const index = state.parties.findIndex((party) => party.id === partyNumber);
  return index >= 0 ? { party: state.parties[index], index } : null;
}

function findCharacter(state: GameState, value: unknown) {
  const characterId = Number(value);
  for (let partyIndex = 0; partyIndex < state.parties.length; partyIndex += 1) {
    const characterIndex = state.parties[partyIndex].characters.findIndex((character) => character.id === characterId);
    if (characterIndex >= 0) return { party: state.parties[partyIndex], partyIndex, character: state.parties[partyIndex].characters[characterIndex], characterIndex };
  }
  return null;
}

function compactObservation(state: GameState, context: ApiV1ReadContext, simulations: string[]) {
  return {
    globalInfo: { gameMode: context.gameMode, inGameTime: new Date(context.inGameTime).toISOString(), gold: state.global.gold, prana: state.global.prana },
    partyInfo: state.parties.map((party) => ({
      party: {
        partyNumber: party.id,
        level: party.level,
        experiencePoint: `${Math.floor((party.experience / Math.max(1, getXpToNextLevel(party.level))) * 100)}%/${party.experience}/${getXpToNextLevel(party.level)}`,
        deity: getDeityId(party.deity.name),
        deityRank: getDeityRank(state.global.deityDonations[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0),
        condition: party.condition,
      },
      state: party.currentHp <= 0 ? 'state.rest' : 'state.idle',
      lastDestination: party.lastExpeditionLog?.dungeonId ?? party.selectedDungeonId,
      lastOutcome: party.lastExpeditionLog?.finalOutcome ?? null,
    })),
    attention: {
      latestSimulationResult: simulations,
      emptyEquipmentSlot: state.parties.flatMap((party) => party.characters.flatMap((character) => {
        const empty = Math.max(0, computePartyStats(party).characterStats.find((entry) => entry.characterId === character.id)!.maxEquipSlots - character.equipment.filter(Boolean).length);
        return empty > 0 ? [`${character.id}/${empty}`] : [];
      })),
      notification: state.parties.map((party) => ({
        partyNumber: party.id,
        unreadDiary: party.diaryLogs.filter((entry) => !entry.isRead).length,
        unreadDiaryTitle: party.diaryLogs.filter((entry) => !entry.isRead).map((entry) => `${entry.id}/${entry.triggers.join('+')}/${entry.expeditionLog.dungeonName}/${new Date(entry.createdAt).toISOString()}`),
      })),
    },
  };
}

function expeditionProjection(state: GameState) {
  return {
    parties: state.parties.map((party) => {
      const computed = computePartyStats(party);
      const charge = getInstantExpeditionChargeState(party);
      return {
        partyNumber: party.id,
        name: party.name,
        state: party.currentHp <= 0 ? 'state.rest' : 'state.idle',
        currentHp: party.currentHp,
        maximumHp: computed.partyStats.hp,
        disclosedFloor: party.lastExpeditionLog?.entries.at(-1)?.floor ?? null,
        disclosedOutcome: party.lastExpeditionLog?.finalOutcome ?? null,
        destination: party.selectedDungeonId,
        destinationMode: party.expeditionDestinationMode,
        depthLimit: party.expeditionDepthLimit,
        difficultyOffset: party.expeditionDifficultyOffset,
        chargeStock: charge.stock,
        chargeDuration: charge.remainingMs <= 0 ? 0 : Math.ceil(charge.remainingMs / 1000),
      };
    }),
  };
}

function partyProjection(state: GameState, parameters: Record<string, unknown>) {
  const selected = partyByNumber(state, parameters.partyNumber) ?? { party: state.parties[state.selectedPartyIndex] ?? state.parties[0], index: state.selectedPartyIndex };
  const party = selected.party;
  return {
    effectiveSelection: { partyNumber: party.id, characterId: Number(parameters.characterId) || party.characters[0]?.id || null },
    party: {
      partyNumber: party.id,
      name: party.name,
      level: party.level,
      deityId: getDeityId(party.deity.name),
      deityRank: getDeityRank(state.global.deityDonations[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0),
      condition: party.condition,
      order: party.characters.map((character) => character.id),
      characters: party.characters.map((character, index) => ({
        characterId: character.id,
        name: character.name,
        raceId: character.raceId,
        gender: character.gender,
        mainClassId: character.mainClassId,
        subClassId: character.subClassId,
        lineageId: character.lineageId,
        predispositionId: character.predispositionId,
        calculatedStatus: computePartyStats(party).characterStats[index],
        equipment: character.equipment.map(equipmentEntry),
        autoEquipmentMode: character.autoEquipmentMode,
      })),
    },
  };
}

export function buildApiV1PartyObservationForTesting(state: GameState) {
  return { parties: state.parties.map((party) => partyProjection(state, { partyNumber: party.id }).party) };
}

function baseProjection(state: GameState) {
  return {
    currencies: { gold: state.global.gold, prana: state.global.prana },
    inventory: Object.entries(state.global.inventory).map(([variantKey, variant]) => ({ variantKey, item: itemFormat(variant.item), quantity: variant.count, status: variant.status, isNew: variant.isNew === true })),
    jewelPriorityParty: state.global.jewelAutoEquipPriorityPartyId ?? 'none',
    shop: { intimacy: state.global.shopIntimacy, paidRefreshPrice: getShopRefreshPrice(state.global.shopIntimacy) },
  };
}

function diaryProjection(state: GameState) {
  return {
    unreadTotal: state.parties.reduce((total, party) => total + party.diaryLogs.filter((entry) => !entry.isRead).length, 0),
    parties: state.parties.map((party) => ({ partyNumber: party.id, settings: party.diarySettings, entries: party.diaryLogs.map((entry) => ({ diaryEntryId: entry.id, partyNumber: party.id, occurredAt: new Date(entry.createdAt).toISOString(), unread: !entry.isRead, metadata: renderDiaryMetadata(entry), battleLog: entry.expeditionLog ? { logId: entry.id, availability: { available: true, unavailableReason: null } } : null })) })),
  };
}

export async function buildApiV1ReadData(operationId: string, state: GameState, parameters: Record<string, unknown>, context: ApiV1ReadContext): Promise<Record<string, unknown>> {
  if (operationId === 'read/observation' || operationId === 'read/observation/compact') {
    const simulations: string[] = [];
    for (let index = 0; index < state.parties.length; index += 1) {
      const result = await context.simulation?.(index, 100) as { Clear?: number; Turned_Back?: number; Draw_Retreat?: number; Wounded_Retreat?: number; Defeat?: number; total?: number } | undefined;
      const total = result?.total ?? 100;
      const percent = (value: number | undefined) => Math.round(((value ?? 0) / total) * 100);
      simulations.push(`PT${state.parties[index].id} / Clear ${percent(result?.Clear)}% / Return ${percent(result?.Turned_Back)}% / Draw ${percent(result?.Draw_Retreat)}% / Retreat ${percent(result?.Wounded_Retreat)}% / Defeat ${percent(result?.Defeat)}%`);
    }
    return compactObservation(state, context, simulations);
  }
  if (operationId === 'read/observation/overview') return { headerInfo: { gameMode: context.gameMode, inGameTime: new Date(context.inGameTime).toISOString(), gold: state.global.gold, prana: state.global.prana, environment: context.environment, unreadDiary: state.parties.reduce((sum, party) => sum + party.diaryLogs.filter((entry) => !entry.isRead).length, 0) } };
  if (operationId === 'read/observation/expedition') return { expeditionInfo: expeditionProjection(state) };
  if (operationId === 'read/observation/party') return { partyInfo: partyProjection(state, parameters) };
  if (operationId === 'read/observation/base') return { baseInfo: baseProjection(state) };
  if (operationId === 'read/observation/diary') return { diaryInfo: diaryProjection(state) };
  if (operationId === 'read/observation/setting') return { settingInfo: { language: state.global.language, environment: context.environment, gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, ...(context.control?.settings ?? {}), uiPreferences: (context.control?.settings?.uiPreferences as unknown[] | undefined) ?? [] } };

  const expedition = operationId.match(/^read\/expedition\/(\d+)\/(setting|latestBattleLog|simulationRun|chargeStock)$/);
  if (expedition) {
    const selected = partyByNumber(state, expedition[1]);
    if (!selected) throw new Error('not_found');
    const { party, index } = selected;
    if (expedition[2] === 'setting') return { current: { destination: party.selectedDungeonId, destinationMode: party.expeditionDestinationMode, depthLimit: party.expeditionDepthLimit, difficultyOffset: party.expeditionDifficultyOffset }, validOptions: { destination: DUNGEONS.map((entry) => entry.id), depthLimit: ['1f-3', '1f-4', '2f-3', '2f-4', '3f-3', '3f-4', '4f-3', '4f-4', '5f-3', '5f-4', 'beforeBoss', 'all'], difficultyOffset: { min: 0, max: 68, step: 2 } } };
    if (expedition[2] === 'latestBattleLog') return { battleLog: party.lastExpeditionLog, bottleneckEnemies: [] };
    if (expedition[2] === 'simulationRun') return { simulatedRevision: context.revision, seedDomain: crypto.randomUUID(), result: await context.simulation?.(index, 1_000) };
    const charge = getInstantExpeditionChargeState(party);
    return { chargeStock: charge.stock, chargeDuration: charge.remainingMs <= 0 ? 0 : Math.ceil(charge.remainingMs / 1000) };
  }

  const partyBuild = operationId.match(/^read\/build\/party\/(\d+)$/);
  if (partyBuild) {
    const selected = partyByNumber(state, partyBuild[1]);
    if (!selected) throw new Error('not_found');
    const currentDeityId = getDeityId(selected.party.deity.name);
    const usedByOtherParties = new Set(state.parties.filter((party) => party.id !== selected.party.id).map((party) => getDeityId(party.deity.name)));
    const deityId = Array.from(new Set(['none', currentDeityId, ...state.global.unlockedDeities.map(getDeityId)]))
      .filter((id) => id === 'none' || id === currentDeityId || !usedByOtherParties.has(id));
    return { current: { deityId: currentDeityId, order: selected.party.characters.map((entry) => entry.id) }, validOptions: { deityId, order: selected.party.characters.map((entry) => entry.id) } };
  }
  const characterRead = operationId.match(/^read\/build\/character\/(\d+)\/(status|equipment|equipmentSet)$/);
  if (characterRead) {
    const found = findCharacter(state, characterRead[1]);
    if (!found) throw new Error('not_found');
    const { party, character, characterIndex } = found;
    if (characterRead[2] === 'status') {
      const racesAndGender = character.raceId === 'mimorian' && character.mimorianEnemyId != null
        ? `${character.raceId}/${character.gender}/${character.mimorianEnemyId}`
        : `${character.raceId}/${character.gender}`;
      const editableRaceIds = new Set(['lupinian', 'vulpinian', 'felidian', 'caninian', 'ursan', 'procyonian', 'leporian', 'cervin', 'murid']);
      const normalRaceOptions = RACES.filter((race) => editableRaceIds.has(race.id)).flatMap((race) => (['male', 'female'] as const)
        .filter((gender) => !party.characters.some((candidate) => candidate.id !== character.id && candidate.isUnique !== true && candidate.raceId === race.id && candidate.gender === gender))
        .map((gender) => `${race.id}/${gender}`));
      const assignedMimorianForms = new Set(state.parties.flatMap((entry) => entry.characters)
        .filter((candidate) => candidate.id !== character.id && candidate.raceId === 'mimorian')
        .map((candidate) => candidate.mimorianEnemyId));
      const mimorianOptions = state.global.unlockedMimorianEnemyIds
        .filter((enemyId) => ENEMIES.some((enemy) => enemy.id === enemyId) && !assignedMimorianForms.has(enemyId))
        .map((enemyId) => `mimorian/female/${enemyId}`);
      return {
        calculatedStatus: computePartyStats(party).characterStats[characterIndex],
        current: { unique: character.isUnique === true, name: character.name, racesAndGender, mainClassId: character.mainClassId, subClassId: character.subClassId, lineage: character.lineageId, predisposition: character.predispositionId },
        editableFields: { name: character.isUnique !== true, unique: character.isUnique === true },
        validOptions: {
          racesAndGender: character.isUnique ? ['none'] : [...normalRaceOptions, ...mimorianOptions],
          mainClassId: CLASSES.map((entry) => entry.id),
          subClassId: CLASSES.map((entry) => entry.id),
          lineage: character.isUnique ? ['none'] : LINEAGES.filter((entry) => entry.selectable === true).map((entry) => entry.id),
          predisposition: character.isUnique ? ['none'] : PREDISPOSITIONS.filter((entry) => entry.selectable === true).map((entry) => entry.id),
        },
      };
    }
    if (characterRead[2] === 'equipment') return { current: { mode: character.autoEquipmentMode === 2 ? 'FULL' : character.autoEquipmentMode === 1 ? 'SEMI' : 'OFF', equipment: character.equipment.map(equipmentEntry) }, validOptions: { mode: ['FULL', 'SEMI', 'OFF'], numberOfEmptyEquipmentSlots: character.equipment.filter((entry) => !entry).length } };
    const ids = Array.isArray(parameters.equipmentSetId) ? parameters.equipmentSetId.map(Number) : parameters.equipmentSetId ? [Number(parameters.equipmentSetId)] : null;
    return { equipmentSets: state.global.savedEquipmentSets.filter((set) => !ids || ids.includes(set.slot)).map((set) => ({ equipmentSetId: set.slot, equipmentSet: { equipmentSetId: set.slot, name: set.name, createdAt: new Date(set.createdAt).toISOString(), ...(parameters.isEquipmentSetDetail === 'true' ? { equipment: set.equipment.map((entry, index) => equipmentEntry(entry.item, getSavedEquipmentSlot(entry, index))) } : {}) } })) };
  }

  if (operationId === 'read/base/searchItems') return { items: Object.values(state.global.inventory).filter((variant) => variant.status === (parameters.state ?? 'owned') || parameters.state === 'all').map((variant) => `${itemFormat(variant.item)}/${variant.count}`), equippedItems: state.parties.flatMap((party) => party.characters.flatMap((character) => character.equipment.filter(Boolean).map((item) => `${party.id}/${character.id}/${itemFormat(item!)}`))), details: {} };
  if (operationId === 'read/base/jewelPriorityParty') return { current: { partyNumber: state.global.jewelAutoEquipPriorityPartyId ?? 'none' }, validOptions: { partyNumber: [...state.parties.map((party) => party.id), 'none'] } };
  if (operationId === 'read/base/shopInfo') return { intimacy: state.global.shopIntimacy, dialogue: { key: 'shop.dialogue.default', args: {} }, paidRefreshCountdown: 0, paidRefreshPrice: getShopRefreshPrice(state.global.shopIntimacy) };
  if (operationId === 'read/base/shopItemsList') {
    const lineup = buildShopLineup({ parties: state.parties, gold: state.global.gold, shopPurchases: state.global.shopPurchases, shopRefreshCounts: state.global.shopRefreshCounts, shopIntimacy: state.global.shopIntimacy, shopIntimacyLastDecayAt: state.global.shopIntimacyLastDecayAt }, new Date(context.inGameTime));
    const items = lineup.entries.map((entry) => ({ shopItemId: entry.stockEntryId, itemId: entry.itemId, item: itemFormat(entry.item), price: entry.price, soldOut: entry.soldOut, available: entry.canPurchase, unavailableReason: entry.canPurchase ? null : entry.soldOut ? 'soldOut' : 'insufficientGold' }));
    return { current: { lineupId: lineup.lineupId, refreshesAt: new Date(lineup.refreshesAt).toISOString(), items }, validOptions: { shopItemId: items.filter((entry) => entry.available).map((entry) => entry.shopItemId) } };
  }
  if (operationId === 'read/base/altarInfo') return { altarOverview: { donations: state.global.deityDonations, victories: state.global.altarVictoriesByEnemyType } };
  if (operationId === 'read/base/enemyFormList') return { current: { enemyFormList: ENEMIES.filter((enemy) => !parameters.enemyId || enemy.id === Number(parameters.enemyId)).map((enemy) => ({ enemyId: enemy.id, enemyName: enemy.name, enemyType: enemy.type, enemyAbility: enemy.abilities ?? [], enemyBonus: [], unlockCost: 0, unlockCondition: null })) }, validOptions: { enemyId: ENEMIES.map((enemy) => enemy.id) } };

  const diarySetting = operationId.match(/^read\/diary\/(\d+)\/diarySetting$/);
  if (diarySetting) { const selected = partyByNumber(state, diarySetting[1]); if (!selected) throw new Error('not_found'); return { current: selected.party.diarySettings, validOptions: { superRareThreshold: ['all', 1, 2, 3, 4, 5, 6, 'none'], defeatNotificationMode: ['defeatOnly', 'defeatAndDraw', 'defeatDrawRetreat', 'all', 'none'] } }; }
  const diaryEntry = operationId.match(/^read\/diary\/diaryEntry\/(.+)$/);
  if (diaryEntry) { for (const party of state.parties) { const entry = party.diaryLogs.find((candidate) => candidate.id === diaryEntry[1]); if (entry) return { entry: { diaryEntryId: entry.id, partyNumber: party.id, occurredAt: new Date(entry.createdAt).toISOString(), unread: !entry.isRead, content: { format: 'semantic', title: { key: 'diary.title', args: {} }, subtitle: { key: 'diary.subtitle', args: {} }, events: [] }, battleLog: { logId: entry.id, availability: { available: true, unavailableReason: null } } } }; } throw new Error('not_found'); }

  if (operationId === 'read/setting/modeSelect') return { current: { mode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, language: state.global.language, ...((context.control?.settings?.modeSelect as Record<string, unknown> | undefined) ?? {}) }, validOptions: { mode: ['mode.normal', 'mode.orca'], enemyLevelOffset: { min: 0, max: 20, step: 1 }, language: ['ja', 'en', 'zh-CN', 'zh-TW', 'ko'], darkMode: ['off', 'on', 'system'], theme: ['theme.kemo', 'theme.laika', 'theme.leonard', 'theme.orca', 'theme.nox', 'theme.luna', 'theme.mishka', 'theme.puchitsa', 'theme.hagakure', 'theme.souga-ha', 'theme.finn', 'theme.merle', 'theme.rosaria', 'theme.milly', 'theme.guabi', 'theme.nemea', 'theme.bernetta', 'theme.yone', 'theme.niv', 'theme.nave'] } };
  if (operationId === 'read/setting/enemyEditPane') return { current: (context.control?.settings?.enemyEditPane as Record<string, unknown> | undefined) ?? {}, validOptions: { enemyLevel: { min: 1, max: 99, step: 1 }, terrainEffect: ['none'], enemyType: [], mainClass: CLASSES.map((entry) => entry.id), subClass: ['none', ...CLASSES.map((entry) => entry.id)], addedAbilities: { maximumEntries: 5, level: { min: 1, max: 5 } } } };
  if (operationId === 'read/setting/debug') return { current: (context.control?.settings?.debug as Record<string, unknown> | undefined) ?? {}, validOptions: { speedOfTime: ['real', 'x1.2', 'x5', 'x20', 'x100', 'unlimited'], godsBattleCondition: ['normal', 'simple'], godsStrength: ['normal', 'veryWeak'] } };
  if (operationId.startsWith('read/setting/delivery/')) { const deliveryId = operationId.split('/').at(-1); const delivery = (context.control?.deliveries as ApiV1DeliveryRecord[] | undefined)?.find((entry) => entry.deliveryId === deliveryId); if (!delivery) throw new Error('not_found'); return projectDelivery(delivery); }

  if (operationId === 'resources/developerNewsNotification') return { entries: DEVELOPER_NEWS_ITEMS.map((entry) => ({ version: entry.id, date: entry.date, content: entry.content })) };
  if (operationId === 'resources/donationBox') return { gods: Object.entries(state.global.deityDonations).map(([id, gold]) => `${id}/1/${gold}/MAX`) };
  if (operationId.startsWith('resources/clairvoyance/')) return { reward: {}, enhancement: {}, superRare: {}, sideQuest: {}, sleepiness: {} };
  if (operationId === 'resources/glossary') return { entries: [], validOptions: { category: ['Ab.', 'Base.', 'Fixed.', 'Inc.', 'Mech.', 'Faith.', 'Magic.', 'Quest.', 'Terrain.'] } };
  if (operationId === 'resources/itemCompendium') return { items: ITEMS.filter((item) => !parameters.itemId || item.id === Number(parameters.itemId)).map((item) => ({ itemId: item.id, name: item.name, category: item.category, ability: [], cBonus: item.bonuses ?? [], otherBonus: [] })) };
  if (operationId === 'resources/characterRoster') return { races: RACES.map((race) => ({ raceId: race.id, status: race.stats, bonus: race.bonuses, defaultAbility: race.defaultAbility, unlockAbility: race.unlockAbility })) };
  if (operationId === 'resources/bestiary') return { enemies: ENEMIES.filter((enemy) => !parameters.enemyId || enemy.id === Number(parameters.enemyId)) };
  if (operationId === 'resources/superRareList') return { superRare: SUPER_RARE_TITLES.map((entry) => `${entry.value}/${entry.title}/${entry.multiplier}`) };
  return {};
}
