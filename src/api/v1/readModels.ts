import { CLASSES } from '../../data/classes.ts';
import { projectDelivery, type ApiV1DeliveryRecord } from './deliveries.ts';
import { DEVELOPER_NEWS_ITEMS } from '../../data/developerNews.ts';
import { ENEMIES } from '../../data/enemies.ts';
import { ENHANCEMENT_TITLES, ITEMS, SUPER_RARE_TITLES } from '../../data/items.ts';
import { LINEAGES } from '../../data/lineages.ts';
import { PREDISPOSITIONS } from '../../data/predispositions.ts';
import { RACES } from '../../data/races.ts';
import { buildDiaryProjection, DIARY_SETTING_VALID_OPTIONS, diaryEntryContent, diarySettingsView, findDiaryEntryView } from './diaryView.ts';
import { getConditionState } from '../../game/partyCondition.ts';
import { getDungeonById } from '../../data/dungeons.ts';
import { t } from '../../i18n/index.ts';
import { getDeityId, getDeityRank, getNextRankDonationRequirement, isNoFaithDeity, normalizeDeityName } from '../../game/deity.ts';
import { getInstantExpeditionChargeState } from '../../game/instantExpedition.ts';
import { evaluateEquipmentSet, getSavedEquipmentSlot } from '../../game/equipmentSets.ts';
import { computeCharacterStatsInParty, computePartyStats } from '../../game/partyComputation.ts';
import { buildCalculatedStatus } from './calculatedStatus.ts';
import { getItemBasePower } from '../../game/itemPower.ts';
import { evaluateItemForCharacter } from '../../game/itemEvaluation.ts';
import { getItemRarityById } from '../../game/itemRarity.ts';
import { describeBonuses, describeItem, describeJewel, formatItemDetails, type ItemDetails, type ItemDetailsMode } from './itemDetails.ts';
import { formatEquipmentEntry, formatItem, parseEquipmentChange, parseEvaluatedItemFormat } from './itemFormat.ts';
import { isJewelAllowedForCategory, JEWEL_DEFS } from '../../game/jewel.ts';
import { describeEquipmentHistory, type EquipmentHistoryBag } from './equipmentHistoryFacts.ts';
import { apiExpeditionOutcomeOrNull } from './expeditionOutcome.ts';
import { buildBattleLogData, buildBattleRoomData, buildRoomResources } from './battleLogs.ts';
import { buildSimulationRunData, describeSimulationDepthReach } from './simulationView.ts';
import { describeCharacterBuildCurrent } from './buildChange.ts';
import { EQUIPMENT_EVALUATION_LIMIT } from './requestLimits.ts';
import { paginate } from './pagination.ts';
import { getItemTier } from '../../game/pricing.ts';
import { getLocalizedItemName, getLocalizedSuperRareTitle } from '../../game/gameState.ts';
import { describeUiPreferenceCatalog, listUiPreferences } from './uiPreferenceCatalog.ts';
import { getExpeditionGoals, getSideQuestFacts } from '../../game/expeditionGoals.ts';
import { getEstimatedStartHp, getPartyStateProgress } from '../../game/partyStateProgress.ts';
import { DIFFICULTY_OFFSET_STEP, EXPEDITION_DEPTH_LIMITS, getSelectableDestinationIds, getSelectableDifficultyOffsetMax } from '../../game/expeditionSettings.ts';
import { getSortieUnavailableReason } from './sortieAvailability.ts';
import { getXpToNextLevel } from '../../game/partyLevel.ts';
import { getPublicShopLineupId, getShopFacts, shopLineupInputOf } from '../../game/shopFacts.ts';
import { getStackSale } from '../../game/inventoryMutation.ts';
import { getSuperRareItemPrana, MAX_ALTAR_LEVEL } from '../../game/prana.ts';
import { getJewelOwnedCount } from '../../game/jewel.ts';
import { getAltarCategoryFacts, getAltarEnemyTypes, getEnemyFormFacts } from '../../game/altarFacts.ts';
import { getEnemyIndividualBonuses, getEnemyTypeBonuses, getMimorianEnemyAbilities } from '../../data/enemies.ts';
import { buildEnemyStatus } from './enemyStatus.ts';
import { GLOSSARY_SECTIONS } from '../../data/glossary.ts';
import {
  createCommonEnhancementBag, createCommonRewardBag, createCommonSuperRareBag, createEliteRareRewardBag, createEnhancementBag,
  createBossRareRewardBag, createMythicRareRewardBag, createRareSuperRareBag, createSideQuestBag, createSleepinessPartyBag,
  createUncommonRewardBag, getBagEntryTickets, getBagTicketTotal, normalizeSleepinessPartyBag,
} from '../../game/bags.ts';
import type { ApiV1PartyCycleView } from './commitOperations.ts';
import { describeModeSelectCurrent, selectableThemes, toThemeKey, type ApiV1DisplaySettings } from './modeSelect.ts';
import { accountDebugSettingsOf, describeDebugSettings } from './debugSettings.ts';
import { getPartyClairvoyanceAccess } from '../../game/clairvoyanceAccess.ts';
import type { DebugSettings } from '../../game/debugSettings.ts';
import type { ColosseumEnemySettings } from '../../game/colosseum.ts';
import { accountEnemyEditSettingsOf, describeEnemyEditPane, enemyEditPaneValidOptions } from './enemyEditPane.ts';
import { MAX_LEVEL, type DiaryLog, type EnemyDef, type ExpeditionLog, type Character, type ExpeditionSimulationResult, type GameState, type Item, type JewelKey, type Party, type RandomBag } from '../../types/index.ts';

// SpecRef: 9.1.4.7 | Observation projections | transport-neutral read models

export interface ApiV1HeaderRuntime {
  /** The Debug-pane time speed: `realtime`, `x1_2`, `x5`, `x20`, `x100`, or `unlimited`. */
  readonly timeSpeed: string;
  /** Wall-clock expiry of the progress-report Speed of Time bonus, or `null` when none is active. */
  readonly bonusUntilMs: number | null;
  readonly autoRepeat: boolean;
  /** Whether a progress-report destination is configured for this environment. */
  readonly progressReportConfigured: boolean;
}

export interface ApiV1ReadContext {
  readonly revision: number;
  readonly environment: string;
  readonly gameMode: 'mode.normal' | 'mode.orca';
  readonly enemyLevelOffset: number;
  readonly inGameTime: number;
  readonly simulation?: (partyIndex: number, count: number) => Promise<unknown>;
  /** The live party cycle of a party (by index) for the ordinary player's runtime; absent for an API account. */
  readonly partyCycle?: (partyIndex: number) => ApiV1PartyCycleView | undefined;
  /**
   * The expedition log the UI has disclosed for a party (by index): while a party is in `state.explore` this is the log from
   * before the running exploration, so the result is not spoiled (Spec 8.3, Update Timing). `undefined` means no runtime
   * memory, and the newest log is used.
   */
  readonly disclosedLog?: (partyIndex: number) => ExpeditionLog | null | undefined;
  /**
   * The header facts the ordinary player's runtime owns outside the save: the Debug-pane base Speed of Time, the
   * progress-report bonus expiry, and the auto-repeat switch. Absent for an API account, which has none of them.
   */
  /** The Colosseum Debug setting of the ordinary player's runtime; absent for an API account. */
  readonly colosseumEnabled?: boolean;
  readonly headerRuntime?: () => ApiV1HeaderRuntime;
  /** The ordinary player's display settings (Mode Select); absent for an API account, which reports them as `null`. */
  readonly displaySettings?: () => ApiV1DisplaySettings;
  /** The ordinary player's real Debug settings; absent for an API account, which reports its own stored values. */
  readonly debugSettings?: () => DebugSettings;
  /** The ordinary player's real Enemy Edit pane settings; absent for an API account, which reports its own stored values. */
  readonly enemyEditSettings?: () => ColosseumEnemySettings;
  /** The Instant Expedition charge clock scale (the current Speed of Time); 1 when omitted. */
  readonly chargeDurationScale?: number;
  readonly control?: { settings?: Record<string, unknown>; deliveries?: unknown[]; equipmentHistory?: Record<string, EquipmentHistoryBag> };
}

const SPEED_OF_TIME_KEYS: Record<string, string> = { realtime: 'real', x1_2: 'x1.2', x5: 'x5', x20: 'x20', x100: 'x100', unlimited: 'unlimited' };

// SpecRef: 8.1.2 | Header | Speed of Time
// SpecRef: 9.1.4.7 | Observation projections | overview
function overviewProjection(state: GameState, context: ApiV1ReadContext) {
  const runtime = context.headerRuntime?.();
  const bonusActive = runtime?.bonusUntilMs != null && runtime.bonusUntilMs > Date.now();
  return {
    gameMode: context.gameMode,
    inGameTime: new Date(context.inGameTime).toISOString(),
    gold: state.global.gold,
    prana: state.global.prana,
    environment: context.environment,
    unreadDiary: state.parties.reduce((sum, party) => sum + party.diaryLogs.filter((entry) => !entry.isRead).length, 0),
    speedOfTime: runtime ? {
      base: SPEED_OF_TIME_KEYS[runtime.timeSpeed] ?? 'real',
      scale: context.chargeDurationScale ?? 1,
      bonusActive,
      bonusUntil: bonusActive ? new Date(runtime.bonusUntilMs!).toISOString() : null,
    } : null,
    autoRepeat: runtime ? runtime.autoRepeat : null,
    progressReportInfo: { available: runtime?.progressReportConfigured ?? false, bonusActive },
  };
}

function itemFormat(item: Item): string {
  return formatItem(item, item.isLocked === true);
}

function equipmentEntry(item: Item | null, slotIndex: number): string {
  return item ? formatEquipmentEntry(slotIndex, item, item.isLocked === true, item.jewel) : '0';
}

// SpecRef: 9.1.3 | 2-3-3 equipment | Array in equipment-slot order; an empty slot is `0`.
/** Every slot the character has, including trailing empty ones the saved equipment array may not store. */
function equipmentEntries(character: Character, maxEquipSlots: number): string[] {
  return Array.from({ length: Math.max(character.equipment.length, maxEquipSlots) }, (_, slot) => equipmentEntry(character.equipment[slot] ?? null, slot));
}

/** The API's one spelling of Auto Equipment mode (9.1.3 2-3-3 `mode`), shared by every projection. */
export function autoEquipmentModeName(mode: Character['autoEquipmentMode']): 'FULL' | 'SEMI' | 'OFF' {
  return mode === 2 ? 'FULL' : mode === 1 ? 'SEMI' : 'OFF';
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
    partyInfo: state.parties.map((party, partyIndex) => ({
      party: {
        partyNumber: party.id,
        level: party.level,
        experiencePoint: `${Math.floor((party.experience / Math.max(1, getXpToNextLevel(party.level))) * 100)}%/${party.experience}/${getXpToNextLevel(party.level)}`,
        deity: getDeityId(party.deity.name),
        deityRank: getDeityRank(state.global.deityDonations[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0),
        // SpecRef: 9.1.3 | 2-1-1 compact | `<conditionKey>/<conditionValue>` with the Spec 7.2 keys
        condition: `${getConditionState(party.condition).slice('condition.'.length)}/${party.condition}`,
      },
      state: partyStateKey(party, computePartyStats(party).partyStats.hp, context.partyCycle?.(partyIndex)),
      lastDestination: disclosedLogOf(state, context, partyIndex)?.dungeonId ?? party.selectedDungeonId,
      lastOutcome: apiExpeditionOutcomeOrNull(disclosedLogOf(state, context, partyIndex)),
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
        unreadDiaryTitle: party.diaryLogs.filter((entry) => !entry.isRead).map(compactDiaryTitle),
      })),
    },
  };
}

/** `YYYYMMDD HH:MM` in the game clock's display timezone (the device's local time, as the Diary tab shows it). */
function compactDiaryTimestamp(epochMs: number): string {
  const date = new Date(epochMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// SpecRef: 9.1.3 | 2-1-1 compact | unreadDiaryTitle `<diaryEntryId>/<diaryTitle>/<diarySubtitle>/<timeStamp>`
// The title and subtitle are the Diary tab's own (current language); as free text they are percent-encoded (9.1.4.14).
function compactDiaryTitle(entry: DiaryLog): string {
  const content = diaryEntryContent(entry);
  const title = content.format === 'semantic' ? t(content.title.key) : content.title;
  const subtitle = content.format === 'semantic'
    ? getDungeonById(entry.expeditionLog.dungeonId)?.name ?? String(entry.expeditionLog.dungeonId)
    : content.subtitle;
  return `${encodeURIComponent(entry.id)}/${encodeURIComponent(title)}/${encodeURIComponent(subtitle)}/${compactDiaryTimestamp(entry.createdAt)}`;
}

/** The log a client may see for a party: the disclosed log while the runtime hides a running exploration, else the newest one. */
function disclosedLogOf(state: GameState, context: ApiV1ReadContext, partyIndex: number): ExpeditionLog | null {
  const disclosed = context.disclosedLog?.(partyIndex);
  return disclosed !== undefined ? disclosed : state.parties[partyIndex].lastExpeditionLog;
}

/**
 * `state.<name>` of a party: the live cycle when the ordinary player's runtime is the actor, otherwise the resume state of
 * Spec 5.1.1 (below maximum HP the party rests, else it is idle) because an API account has no live cycle.
 */
function partyStateKey(party: Party, maximumHp: number, cycle: ApiV1PartyCycleView | undefined): string {
  if (cycle) return `state.${cycle.state}`;
  return party.currentHp < maximumHp ? 'state.rest' : 'state.idle';
}

// SpecRef: 8.3 | UI_EXPEDITION | Progress Visual Update
// SpecRef: 9.1.4.7 | Observation projections | expedition
// Everything the Expedition pane draws for a party, from the party and its live cycle. While a party is exploring, the
// rooms of the running log are revealed only as the exploration clock reaches them (server-gated): a client never receives a
// room, an HP value, or an outcome from the future, and `nextRevealAt` says when to read again.
function expeditionProjection(state: GameState, context: ApiV1ReadContext) {
  // The request's in-game clock, the same instant a sortie commit decides with: an API account's own clock, or the player's
  // real time. The wall clock here would show charge an API account's commit cannot yet spend.
  const nowMs = context.inGameTime;
  const chargeScale = context.chargeDurationScale ?? 1;
  return {
    parties: state.parties.map((party, partyIndex) => {
      const computed = computePartyStats(party);
      const maximumHp = computed.partyStats.hp;
      const charge = getInstantExpeditionChargeState(party, nowMs, chargeScale);
      const cycle = context.partyCycle?.(partyIndex);
      const timed = cycle && typeof cycle.stateStartedAt === 'number' && typeof cycle.durationMs === 'number' && cycle.state !== 'idle' && cycle.state !== 'reactivate';
      const log = disclosedLogOf(state, context, partyIndex);
      const runningLog = cycle?.state === 'explore' ? party.lastExpeditionLog : null;
      const progress = timed
        ? getPartyStateProgress({
          clock: { state: cycle.state, stateStartedAt: cycle.stateStartedAt!, durationMs: cycle.durationMs!, restInitialTotalSteps: cycle.restInitialTotalSteps },
          party,
          maximumHp,
          nowMs,
          log: runningLog,
        })
        : null;
      const revealed = runningLog && progress?.revealedRoomCount != null ? runningLog.entries.slice(0, progress.revealedRoomCount) : [];
      const displayedHp = runningLog && runningLog.entries.length > 0
        ? (revealed.length === 0 ? getEstimatedStartHp(runningLog.entries[0]) : revealed[revealed.length - 1].remainingPartyHP)
        : party.currentHp;
      const sortieReason = (godsBattle: boolean) => getSortieUnavailableReason({ party, godsBattle, hp: displayedHp, maximumHp, chargeStock: charge.stock, cycle });
      const control = (godsBattle: boolean) => {
        const reason = sortieReason(godsBattle);
        return { available: reason === null, unavailableReason: reason };
      };
      const sideQuest = getSideQuestFacts(party, chargeScale, nowMs);
      return {
        partyNumber: party.id,
        name: party.name,
        state: partyStateKey(party, maximumHp, cycle),
        // The state's own clock (the runtime's wall-clock time): clients interpolate progress between the two instants.
        stateStartedAt: timed ? new Date(cycle.stateStartedAt!).toISOString() : null,
        stateDurationMs: timed ? cycle.durationMs! : null,
        stateExpectedEndAt: timed ? new Date(cycle.stateStartedAt! + cycle.durationMs!).toISOString() : null,
        progress: progress && {
          kind: progress.kind,
          mainPercent: progress.mainPercent,
          totalSteps: progress.totalSteps,
          completedSteps: progress.completedSteps,
          subProgress: progress.subProgress && { startedAt: new Date(progress.subProgress.startedAt).toISOString(), endsAt: new Date(progress.subProgress.endsAt).toISOString() },
          nextChangeAt: progress.nextChangeAt === null ? null : new Date(progress.nextChangeAt).toISOString(),
        },
        exploration: runningLog && progress ? {
          dungeonId: runningLog.dungeonId,
          difficultyOffset: runningLog.difficultyOffset ?? 0,
          totalRooms: runningLog.totalRooms,
          revealedRoomCount: revealed.length,
          nextRevealAt: progress.nextChangeAt === null ? null : new Date(progress.nextChangeAt).toISOString(),
          // The revealed rooms in full (the same public room shape as `latestBattleLog`), so the pane renders the running
          // exploration without ever holding a room from the future.
          rooms: revealed.map(buildBattleRoomData),
          resources: { rooms: revealed.map(buildRoomResources), compact: runningLog.compactVersion === 1 },
        } : null,
        currentHp: displayedHp,
        maximumHp,
        disclosedFloor: log?.entries.at(-1)?.floor ?? null,
        disclosedOutcome: apiExpeditionOutcomeOrNull(log),
        destination: party.selectedDungeonId,
        destinationMode: party.expeditionDestinationMode,
        depthLimit: party.expeditionDepthLimit,
        difficultyOffset: party.expeditionDifficultyOffset,
        chargeStock: charge.stock,
        chargeDuration: charge.remainingMs <= 0 ? 0 : Math.ceil(charge.remainingMs / 1000),
        clearGates: getExpeditionGoals(party, cycle?.state).map((goal) => {
          if (goal.kind === 'eliteGate') return { kind: goal.kind, dungeonId: goal.dungeonId, floor: goal.floor, current: goal.current, required: goal.required };
          if (goal.kind === 'bossGate') return { kind: goal.kind, dungeonId: goal.dungeonId, floor: null, current: goal.current, required: goal.required };
          if (goal.kind === 'godGate') return { kind: goal.kind, dungeonId: goal.dungeonId, floor: null, current: goal.collected, required: goal.required };
          if (goal.kind === 'entryGate') return { kind: goal.kind, dungeonId: goal.nextDungeonId, floor: null, current: 0, required: 1 };
          return { kind: goal.kind, dungeonId: goal.dungeonId, floor: null, current: 0, required: 1 };
        }),
        sideQuest,
        controls: { sortie: control(false), godsBattle: control(true) },
      };
    }),
  };
}

// SpecRef: 9.1.4.17 | Focused projection query context | party: an explicitly invalid selection is rejected
function partyProjection(state: GameState, parameters: Record<string, unknown>) {
  const explicit = parameters.partyNumber === undefined ? null : partyByNumber(state, parameters.partyNumber);
  if (parameters.partyNumber !== undefined && !explicit) throw new Error('not_found');
  const selected = explicit ?? { party: state.parties[state.selectedPartyIndex] ?? state.parties[0], index: state.selectedPartyIndex };
  const party = selected.party;
  // An explicit character must belong to the selected party; otherwise the first member is the default.
  const characterId = parameters.characterId === undefined ? null : Number(parameters.characterId);
  if (characterId !== null && !party.characters.some((character) => character.id === characterId)) throw new Error('not_found');
  const partyStatus = computePartyStats(party);
  const computed = partyStatus.characterStats;
  return {
    effectiveSelection: { partyNumber: party.id, characterId: characterId ?? party.characters[0]?.id ?? null },
    party: {
      partyNumber: party.id,
      name: party.name,
      level: party.level,
      experience: party.experience,
      experienceToNext: party.level < MAX_LEVEL ? Math.ceil(getXpToNextLevel(party.level)) : 0,
      maxHp: Math.floor(partyStatus.partyStats.hp),
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
        isUnique: character.isUnique === true,
        mimorianEnemyId: character.mimorianEnemyId ?? null,
        calculatedStatus: buildCalculatedStatus(character, computed[index], party.level),
        equipment: equipmentEntries(character, computed[index].maxEquipSlots),
        autoEquipmentMode: autoEquipmentModeName(character.autoEquipmentMode),
      })),
    },
  };
}

// SpecRef: 9.1.3 | Item category | The API's category keys are the item categories themselves (`gauntlet`, `archery`,
// `grimoire`, ...). The earlier names `glove`, `bow`, and `book` are still accepted as aliases of the same categories.
const API_CATEGORY_TO_ITEM_CATEGORY: Record<string, string> = {
  sword: 'sword', katana: 'katana', archery: 'archery', armor: 'armor', gauntlet: 'gauntlet', wand: 'wand', robe: 'robe', shield: 'shield',
  bolt: 'bolt', grimoire: 'grimoire', catalyst: 'catalyst', arrow: 'arrow', bow: 'archery', glove: 'gauntlet', book: 'grimoire',
};

/**
 * Searches the items known to the player (9.1.3, 2-4-1). Every result is one string in `items`:
 * - inventory stacks: `<Item Format>/<quantity>/<calculatedBasePower>`;
 * - character-assigned items: `<Item Format>/<characterId>/<jewelType>:<jewelRank>/<calculatedBasePower>` (`0:0` without a Jewel);
 * - the `jewel` category: unassigned Jewels as `<jewelType>:<jewelRank>/<quantity>` and assigned Jewels as character-assigned items.
 * `state` selects owned stacks, character-assigned (`equipped`) items, sold stacks, or all. The fields chosen by `details`
 * follow in the fixed order ability, cBonus, otherBonus. Equipment is sorted by higher calculated base power, then higher
 * item id, then higher Jewel rank (remaining ties: higher enhancement, higher Super Rare title, stack before
 * character-assigned, lower character id). Unassigned Jewels come first, by higher rank, then higher Jewel type. `limit`
 * (default 10, at most 5000) is applied after filtering and sorting; `totalCount` and `truncated` report what it cut.
 */
const SEARCH_ITEMS_DEFAULT_LIMIT = 10;
const SEARCH_ITEMS_MAX_LIMIT = 5000;

function searchItems(state: GameState, parameters: Record<string, unknown>) {
  const wantedState = String(parameters.state ?? 'owned');
  const category = parameters.category === undefined ? null : String(parameters.category);
  const mode = String(parameters.details ?? 'abilityAndCBonus') as ItemDetailsMode;
  const limit = parameters.limit === undefined ? SEARCH_ITEMS_DEFAULT_LIMIT : Number(parameters.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_ITEMS_MAX_LIMIT) throw new Error('invalid_request:limit');
  const includesState = (name: 'owned' | 'sold' | 'equipped') => wantedState === 'all' || wantedState === name;
  const itemFilterGiven = (parameters.rarity !== undefined && parameters.rarity !== 'all') || parameters.superRare !== undefined
    || parameters.superRareId !== undefined || parameters.itemId !== undefined;

  const matchesItem = (item: Item): boolean => {
    if (category !== null && category !== 'jewel' && item.category !== API_CATEGORY_TO_ITEM_CATEGORY[category]) return false;
    if (parameters.rarity !== undefined && parameters.rarity !== 'all' && getItemRarityById(item.id) !== parameters.rarity) return false;
    if (parameters.superRare !== undefined && (item.superRare > 0) !== (parameters.superRare === true || parameters.superRare === 'true')) return false;
    if (parameters.superRareId !== undefined && item.superRare !== Number(parameters.superRareId)) return false;
    if (parameters.itemId !== undefined && item.id !== Number(parameters.itemId)) return false;
    return true;
  };
  const matchesDetails = (details: ItemDetails): boolean => matchesDetailFilters(details, parameters);
  const withDetails = (base: string, details: ItemDetails) => [base, ...formatItemDetails(details, mode)].join('/');

  // Sort keys are compared ascending, so "higher first" values are negated.
  type Entry = { order: number[]; text: string };
  const entries: Entry[] = [];
  const jewelText = (jewel: { key: string; rank: number } | null | undefined) => jewel ? `${jewel.key}:${jewel.rank}` : '0:0';
  const equipmentOrder = (item: Item, kind: 0 | 1, characterId: number) => [1, -getItemBasePower(item), -item.id, -(item.jewel?.rank ?? 0), -item.enhancement, -item.superRare, kind, characterId];

  if (category !== 'jewel') {
    for (const variant of Object.values(state.global.inventory)) {
      const status = variant.status === 'owned' ? 'owned' : variant.status === 'sold' ? 'sold' : null;
      if (!status || !includesState(status) || (status === 'owned' && variant.count < 1) || !matchesItem(variant.item)) continue;
      const details = describeItem(variant.item);
      if (matchesDetails(details)) entries.push({ order: equipmentOrder(variant.item, 0, 0), text: withDetails(`${itemFormat(variant.item)}/${variant.count}/${getItemBasePower(variant.item)}`, details) });
    }
  } else if (!itemFilterGiven && includesState('owned')) {
    for (const [key, count] of Object.entries(state.global.jewels)) {
      const [jewelKey, rank] = key.split(':');
      if (count < 1 || !(jewelKey in JEWEL_DEFS)) continue;
      const details = describeJewel(jewelKey as JewelKey, Number(rank));
      if (matchesDetails(details)) entries.push({ order: [0, -Number(rank), -Object.keys(JEWEL_DEFS).indexOf(jewelKey), 0, 0, 0, 0, 0], text: withDetails(`${key}/${count}`, details) });
    }
  }
  if (includesState('equipped')) {
    for (const party of state.parties) {
      for (const character of party.characters) {
        for (const item of character.equipment) {
          if (!item || !matchesItem(item) || (category === 'jewel' && !item.jewel)) continue;
          const details = category === 'jewel' && item.jewel ? describeJewel(item.jewel.key, item.jewel.rank) : describeItem(item);
          if (matchesDetails(details)) entries.push({ order: equipmentOrder(item, 1, character.id), text: withDetails(`${itemFormat(item)}/${character.id}/${jewelText(item.jewel)}/${getItemBasePower(item)}`, details) });
        }
      }
    }
  }
  entries.sort((left, right) => { for (let index = 0; index < left.order.length; index += 1) { const difference = left.order[index] - right.order[index]; if (difference !== 0) return difference; } return 0; });
  // SpecRef: 9.1.4.3 | `totalCount` and `truncated` tell a cut-off list (default `limit` 10) from a complete one.
  return { items: entries.slice(0, limit).map((entry) => entry.text), totalCount: entries.length, truncated: entries.length > limit };
}

/** The Debug settings in force for this read: the ordinary player's Debug pane, or an API account's own debug settings. */
function effectiveDebugSettings(context: ApiV1ReadContext): DebugSettings {
  return context.debugSettings ? context.debugSettings() : accountDebugSettingsOf(context.control?.settings);
}

/** The Enemy Edit pane in force for this read: the ordinary player's real pane, or an API account's own settings. */
function effectiveEnemyEditSettings(context: ApiV1ReadContext): ColosseumEnemySettings {
  return context.enemyEditSettings ? context.enemyEditSettings() : accountEnemyEditSettingsOf(context.control?.settings);
}

/** Whether an item's details match the `searchAbility` and `searchBonus` filters (the same matching as `searchItems`). */
function matchesDetailFilters(details: ItemDetails, parameters: Record<string, unknown>): boolean {
  const searchAbility = parameters.searchAbility === undefined ? null : String(parameters.searchAbility);
  const searchBonus = parameters.searchBonus === undefined ? null : String(parameters.searchBonus);
  return (searchAbility === null || details.ability.some((entry) => entry.split(':')[0] === searchAbility))
    && (searchBonus === null || details.cBonus.includes(searchBonus) || details.otherBonus.includes(searchBonus));
}

// SpecRef: 9.1.3 | 4-2-5 itemCompendium
// SpecRef: 8.6 | UI_SETTING | Item Compendium (アイテム図鑑)
// Lists every item, base level, regardless of ownership. `revealed` follows the Item Reveal Rule (or the Debug "Display all
// Compendium" setting). An unrevealed item is still listed, as a placeholder: only its ID, category, rarity, and tier, never
// its name or details, and the ability and bonus searches never match it (9.1.4.7: no undisclosed content).
// `details` selects which of `ability`, `cBonus`, and `otherBonus` a revealed item includes, like `searchItems`.
function itemCompendium(state: GameState, parameters: Record<string, unknown>, context: ApiV1ReadContext) {
  const category = parameters.category === undefined ? null : String(parameters.category);
  const rarity = parameters.rarity === undefined || parameters.rarity === 'all' ? null : String(parameters.rarity);
  const tier = parameters.tier === undefined ? null : Number(parameters.tier);
  const itemId = parameters.itemId === undefined ? null : Number(parameters.itemId);
  const mode = String(parameters.details ?? 'abilityAndCBonus') as ItemDetailsMode;
  const wantsAbility = mode === 'ability' || mode === 'abilityAndCBonus' || mode === 'all';
  const wantsCBonus = mode === 'cBonus' || mode === 'abilityAndCBonus' || mode === 'all';
  const wantsOtherBonus = mode === 'otherBonus' || mode === 'all';
  const revealAll = effectiveDebugSettings(context).displayAllCompendium;
  const revealed = new Set(state.global.revealedItemCompendiumItemIds);
  const items = ITEMS.flatMap((item) => {
    if (category !== null && item.category !== API_CATEGORY_TO_ITEM_CATEGORY[category]) return [];
    const itemRarity = getItemRarityById(item.id);
    if (rarity !== null && itemRarity !== rarity) return [];
    if (tier !== null && getItemTier(item.id) !== tier) return [];
    if (itemId !== null && item.id !== itemId) return [];
    const isRevealed = revealAll || revealed.has(item.id);
    const placeholder = { itemId: item.id, category: item.category, rarity: itemRarity, tier: getItemTier(item.id), revealed: isRevealed };
    const searchesDetails = parameters.searchAbility !== undefined || parameters.searchBonus !== undefined;
    if (!isRevealed) return searchesDetails ? [] : [placeholder];
    // The Compendium shows every item at base level (Spec 8.6: Enhancement = 0, SuperRare = 0), not an owned instance.
    const details = describeItem({ ...item, enhancement: 0, superRare: 0 });
    if (!matchesDetailFilters(details, parameters)) return [];
    return [{
      ...placeholder,
      name: getLocalizedItemName(item),
      ...(wantsAbility ? { ability: details.ability } : {}),
      ...(wantsCBonus ? { cBonus: details.cBonus } : {}),
      ...(wantsOtherBonus ? { otherBonus: details.otherBonus } : {}),
    }];
  });
  const { page, nextCursor } = paginate('resources/itemCompendium', items, parameters, context.revision);
  return { items: page, nextCursor };
}

// SpecRef: 8.6 | UI_SETTING | Bestiary (敵キャラクター図鑑)
// `enemyBattleStats` is already shared/global (Spec 8.6: "total... across all parties"), not per-party.
// `revealed` (encountered at least once) tells the client whether to show real details or a placeholder.
function bestiary(state: GameState, parameters: Record<string, unknown>, context: ApiV1ReadContext) {
  const enemyId = parameters.enemyId === undefined ? null : Number(parameters.enemyId);
  const enemyType = parameters.enemyType === undefined ? null : String(parameters.enemyType);
  const expedition = parameters.expedition === undefined ? null : Number(parameters.expedition);
  const revealAll = effectiveDebugSettings(context).displayAllBestiary;
  // An enemy not yet encountered (and not revealed by the Debug "Display all Bestiary" setting) is listed only as a
  // placeholder, its ID and zero counts, never its name, status, or drops; the type filter never matches it
  // (9.1.4.7: no undisclosed content).
  const enemies = ENEMIES.flatMap((enemy) => {
    if (enemyId !== null && enemy.id !== enemyId) return [];
    if (expedition !== null && enemy.poolId !== expedition) return [];
    const stats = state.global.enemyBattleStats?.[enemy.id];
    const encounters = stats?.encounters ?? 0;
    const defeats = stats?.defeats ?? 0;
    const isRevealed = revealAll || encounters > 0;
    if (enemyType !== null && (!isRevealed || enemy.enemyType !== enemyType)) return [];
    return [isRevealed
      ? { ...buildEnemyStatus(enemy, null), revealed: true, encounters, defeats }
      : { enemyId: enemy.id, revealed: false, encounters, defeats }];
  });
  const { page, nextCursor } = paginate('resources/bestiary', enemies, parameters, context.revision);
  return { enemies: page, nextCursor };
}

const GLOSSARY_CATEGORY_KEYS = ['a.', 'b.', 'c.', 'd.', 'f.', 'g.', 'm.', 'q.', 't.'];
// Each GLOSSARY_SECTIONS heading is numbered like "2.1.2 b. bonus" (Specification_1.1_CONSTANTS_GLOSSARY.md's own section
// numbering); the single letter is the category, so it is parsed once here rather than hand-copied per section.
function glossaryCategoryOf(heading: string): string | null {
  const match = heading.match(/^\d+\.\d+\.\d+ (\w)\./);
  return match ? `${match[1]}.` : null;
}

// SpecRef: 1.0.3 | CONSTANTS | Glossary Reveal Rule
// SpecRef: 8.6 | UI_SETTING | Glossary (用語集)
// Only `a.` (ability) and `t.` (terrain effect) entries are reveal-gated; the other 7 categories are always visible.
function glossary(state: GameState, parameters: Record<string, unknown>, context: ApiV1ReadContext) {
  const category = parameters.category === undefined ? null : String(parameters.category);
  const glossaryId = parameters.glossaryId === undefined ? null : String(parameters.glossaryId);
  // The Debug "Display all Glossary" setting reveals every entry, as it does in the Glossary pane.
  const revealAll = effectiveDebugSettings(context).displayAllGlossary;
  const revealedAbilities = new Set(state.global.revealedGlossaryAbilityIds);
  const revealedTerrain = new Set<string>(state.global.revealedGlossaryTerrainKeys);
  const entries: Array<{ glossaryId: string; category: string; label: string; description: string }> = [];
  for (const section of GLOSSARY_SECTIONS) {
    const sectionCategory = glossaryCategoryOf(section.heading);
    if (!sectionCategory || (category !== null && sectionCategory !== category)) continue;
    for (const entry of section.entries) {
      if (glossaryId !== null && entry.key !== glossaryId) continue;
      if (!revealAll && sectionCategory === 'a.' && !revealedAbilities.has(entry.key)) continue;
      if (!revealAll && sectionCategory === 't.' && !revealedTerrain.has(entry.key)) continue;
      entries.push({ glossaryId: entry.key, category: sectionCategory, label: entry.label, description: entry.description });
    }
  }
  const { page, nextCursor } = paginate('resources/glossary', entries, parameters, context.revision);
  return { entries: page, validOptions: { category: GLOSSARY_CATEGORY_KEYS }, nextCursor };
}

// SpecRef: 8.6 | UI_SETTING | Character Roster (味方キャラクター図鑑)
// `status` is already a public shape (BaseStats). Ability-type bonuses are excluded from the bonus vocabulary: they are
// redundant with `defaultAbility`/`unlockAbility`, which already carry the same stable ability IDs.
function characterRoster(parameters: Record<string, unknown>, context: ApiV1ReadContext) {
  const raceId = parameters.race === undefined ? null : String(parameters.race);
  const races = RACES.filter((race) => raceId === null || race.id === raceId).map((race) => ({
    raceId: race.id,
    status: race.stats,
    ...describeBonuses(race.bonuses.filter((bonus) => bonus.type !== 'ability')),
    defaultAbility: race.defaultAbility.id === 'none' ? null : race.defaultAbility.id,
    unlockAbility: race.unlockAbility ? race.unlockAbility.id : null,
  }));
  const { page, nextCursor } = paginate('resources/characterRoster', races, parameters, context.revision);
  return { races: page, nextCursor };
}

// SpecRef: 9.1.3 | 4-2-8 superRareList | `<superRareId>/<name>/<bonus>`, the name in the current language
// Every Super Rare title (1–N; 0 is "no title", not a title). The name and the bonus IDs are free text, so each is
// percent-encoded (9.1.4.14); the bonus IDs are joined by `, ` like the `searchItems` detail fields.
function superRareList(parameters: Record<string, unknown>, context: ApiV1ReadContext) {
  const superRareId = parameters.superRareId === undefined ? null : Number(parameters.superRareId);
  const entries = SUPER_RARE_TITLES.filter((title) => title.value > 0 && (superRareId === null || title.value === superRareId)).map((title) => {
    const bonuses = describeBonuses(title.bonuses ?? []);
    const bonusIds = [...bonuses.ability, ...bonuses.cBonus, ...bonuses.otherBonus].join(', ');
    return `${title.value}/${encodeURIComponent(getLocalizedSuperRareTitle(title.value).trim())}/${encodeURIComponent(bonusIds)}`;
  });
  const { page, nextCursor } = paginate('resources/superRareList', entries, parameters, context.revision);
  return { superRare: page, nextCursor };
}

// SpecRef: 8.6 | UI_SETTING | Clairvoyance (未来視)
// Every remaining/total pair compares the party's live bag against a freshly created one of the same kind, so a bag's
// own per-slot ticket overrides (for example the general enhancement bag's boosted "untitled" slot) are never hand-copied.
export interface ApiV1ClairvoyanceBagFacts { remaining: number; total: number; hitsRemaining: number; hitsTotal: number }
export interface ApiV1ClairvoyanceEnhancementFacts { remaining: number; total: number; tiers: Array<{ tier: number; remaining: number; total: number }> }
export interface ApiV1ClairvoyanceSleepinessFacts {
  remaining: number; total: number;
  awake: { remaining: number; total: number }; nap: { remaining: number; total: number }; deepSleep: { remaining: number; total: number };
}
/** `resources/clairvoyance/{p}` (Spec 9.1.3 4-2-3): `unavailable` without a.prophecy, otherwise the facts and reset access. */
export type ApiV1ClairvoyanceResource = { available: false } | ({ available: true; canReset: boolean } & ApiV1ClairvoyanceProjection);

export interface ApiV1ClairvoyanceProjection {
  reward: { common: ApiV1ClairvoyanceBagFacts; uncommon: ApiV1ClairvoyanceBagFacts; eliteRare: ApiV1ClairvoyanceBagFacts; bossRare: ApiV1ClairvoyanceBagFacts; mythicRare: ApiV1ClairvoyanceBagFacts };
  enhancement: { common: ApiV1ClairvoyanceEnhancementFacts; general: ApiV1ClairvoyanceEnhancementFacts };
  superRare: { common: ApiV1ClairvoyanceBagFacts; rare: ApiV1ClairvoyanceBagFacts };
  sideQuest: ApiV1ClairvoyanceBagFacts;
  sleepiness: ApiV1ClairvoyanceSleepinessFacts;
}
function bagHitFacts(bag: RandomBag, defaultBag: RandomBag, hitIds: readonly number[]): ApiV1ClairvoyanceBagFacts {
  const sum = (source: RandomBag) => hitIds.reduce((total, id) => total + getBagEntryTickets(source, id), 0);
  return { remaining: getBagTicketTotal(bag), total: getBagTicketTotal(defaultBag), hitsRemaining: sum(bag), hitsTotal: sum(defaultBag) };
}
function enhancementBagFacts(bag: RandomBag, defaultBag: RandomBag): ApiV1ClairvoyanceEnhancementFacts {
  const tiers = ENHANCEMENT_TITLES.filter((title) => title.value > 0).map((title) => ({
    tier: title.value, remaining: getBagEntryTickets(bag, title.value), total: getBagEntryTickets(defaultBag, title.value),
  }));
  return { remaining: getBagTicketTotal(bag), total: getBagTicketTotal(defaultBag), tiers };
}
function sleepinessBagFacts(bag: RandomBag): ApiV1ClairvoyanceSleepinessFacts {
  const normalized = normalizeSleepinessPartyBag(bag);
  const defaultBag = createSleepinessPartyBag();
  const of = (id: number) => ({ remaining: getBagEntryTickets(normalized, id), total: getBagEntryTickets(defaultBag, id) });
  return { remaining: getBagTicketTotal(normalized), total: getBagTicketTotal(defaultBag), awake: of(0), nap: of(1), deepSleep: of(2) };
}
/** The Debug Clairvoyance override: the ordinary player's Debug pane, or an API account's own debug settings. */
export function clairvoyanceDebugOverride(context: { debugSettings?: () => { clairvoyanceEnabled: boolean }; control?: { settings?: Record<string, unknown> } }): boolean {
  if (context.debugSettings) return context.debugSettings().clairvoyanceEnabled;
  return (context.control?.settings?.debug as { clairvoyance?: unknown } | undefined)?.clairvoyance === true;
}

function clairvoyance(party: Party) {
  const bags = party.bags;
  const superRareHitIds = SUPER_RARE_TITLES.filter((title) => title.value > 0).map((title) => title.value);
  const sideQuestHitIds = createSideQuestBag().entries.filter((entry) => entry.id > 0).map((entry) => entry.id);
  return {
    reward: {
      common: bagHitFacts(bags.commonRewardBag, createCommonRewardBag(), [1]),
      uncommon: bagHitFacts(bags.uncommonRewardBag, createUncommonRewardBag(), [1]),
      eliteRare: bagHitFacts(bags.eliteRareRewardBag, createEliteRareRewardBag(), [1]),
      bossRare: bagHitFacts(bags.bossRareRewardBag, createBossRareRewardBag(), [1]),
      mythicRare: bagHitFacts(bags.mythicRareRewardBag, createMythicRareRewardBag(), [1]),
    },
    enhancement: {
      common: enhancementBagFacts(bags.commonEnhancementBag, createCommonEnhancementBag()),
      general: enhancementBagFacts(bags.enhancementBag, createEnhancementBag()),
    },
    superRare: {
      common: bagHitFacts(bags.commonSuperRareBag, createCommonSuperRareBag(), superRareHitIds),
      rare: bagHitFacts(bags.rareSuperRareBag, createRareSuperRareBag(), superRareHitIds),
    },
    sideQuest: bagHitFacts(bags.sideQuestBag, createSideQuestBag(), sideQuestHitIds),
    sleepiness: sleepinessBagFacts(party.sleepinessOfPartyBag),
  };
}

export function buildApiV1PartyObservationForTesting(state: GameState) {
  return { parties: state.parties.map((party) => partyProjection(state, { partyNumber: party.id }).party) };
}

// SpecRef: 8.4.1 | Shop (お店) | Lineup, Dialogue by intimacy, Paid Refresh
// The shop at one instant (the request's clock), from the same shared facts the Shop pane uses.
function shopProjection(state: GameState, nowMs: number) {
  const facts = getShopFacts(shopLineupInputOf(state), new Date(nowMs));
  return {
    lineupId: getPublicShopLineupId(facts),
    intimacy: facts.intimacy,
    dialogue: { key: facts.dialogueKey, args: {} },
    paidRefreshCountdown: facts.refreshCountdownSeconds,
    paidRefreshPrice: facts.paidRefreshPrice,
    paidRefresh: { available: facts.paidRefreshAvailable, unavailableReason: facts.paidRefreshAvailable ? null : 'insufficient_gold' },
    refreshesAt: new Date(facts.refreshesAt).toISOString(),
    entries: facts.entries.map((entry) => ({ shopItemId: entry.shopItemId, itemId: entry.itemId, price: entry.price, rarity: entry.rarity, soldOut: entry.soldOut, available: entry.available, unavailableReason: entry.unavailableReason })),
  };
}

// SpecRef: 8.4.5 | Altar (祭壇)
function altarGlobal(state: GameState) {
  return { prana: state.global.prana, altarVictoriesByEnemyType: state.global.altarVictoriesByEnemyType, unlockedMimorianEnemyIds: state.global.unlockedMimorianEnemyIds };
}

/** The Alter level and victories of every enemy category; the individual forms are read through `enemyFormList`. */
function altarProjection(state: GameState) {
  const global = altarGlobal(state);
  return {
    prana: state.global.prana,
    maximumAltarLevel: MAX_ALTAR_LEVEL,
    categories: getAltarEnemyTypes().map((enemyType) => getAltarCategoryFacts(global, enemyType)),
    unlockedEnemyIds: [...state.global.unlockedMimorianEnemyIds],
  };
}

/** One enemy form: its abilities and bonuses as a Mimorian would copy them, its cost, and why it cannot be unlocked. */
function enemyFormEntry(state: GameState, enemy: EnemyDef) {
  const facts = getEnemyFormFacts(altarGlobal(state), enemy);
  const abilities = getMimorianEnemyAbilities(enemy);
  const bonuses = describeBonuses([...getEnemyTypeBonuses(enemy.enemyType), ...getEnemyIndividualBonuses(enemy.id)]);
  return {
    enemyId: enemy.id,
    enemyName: enemy.name,
    nameKey: enemy.nameKey ?? null,
    enemyType: enemy.enemyType,
    enemyTier: enemy.isGodEnemy ? 'divine' as const : enemy.type,
    enemyAbility: abilities.map((ability) => ({ abilityId: `a.${ability.id.replace(/_/g, '-')}`, level: ability.level })),
    enemyBonus: [...bonuses.cBonus, ...bonuses.otherBonus],
    unlockCost: facts.unlockCost,
    unlockCondition: { requiredAltarLevel: facts.requiredAltarLevel, currentAltarLevel: facts.currentAltarLevel, met: facts.currentAltarLevel >= facts.requiredAltarLevel },
    unlocked: facts.unlocked,
    unlockable: { available: facts.unavailableReason === null, unavailableReason: facts.unavailableReason },
  };
}

// SpecRef: 8.4.2 | Inventory(所持品)
// The inventory as the Inventory pane shows it: every variant with its state, count, highlight, and what selling it pays; the
// Jewels held; and every item worn by a character with its owner (a Jewel is listed with the item it is attached to).
function inventoryProjection(state: GameState) {
  const authorities = { getPrana: getSuperRareItemPrana };
  const jewels = (Object.keys(JEWEL_DEFS) as JewelKey[]).flatMap((jewelKey) => Array.from({ length: 8 }, (_, index) => ({ jewelKey, rank: index + 1, quantity: getJewelOwnedCount(state.global.jewels, jewelKey, index + 1) })))
    .filter((entry) => entry.quantity > 0);
  const computedByParty = state.parties.map((party) => computePartyStats(party).characterStats);
  const equippedItems = state.parties.flatMap((party, partyIndex) => party.characters.flatMap((character, memberIndex) => {
    const maxSlots = computedByParty[partyIndex].find((entry) => entry.characterId === character.id)?.maxEquipSlots ?? character.equipment.length;
    return character.equipment.flatMap((item, slotIndex) => item ? [{
      characterId: character.id,
      partyNumber: party.id,
      member: memberIndex + 1,
      owner: { name: character.name, raceId: character.raceId, gender: character.gender, isUnique: character.isUnique === true, lineageId: character.lineageId ?? null, mimorianEnemyId: character.mimorianEnemyId ?? null },
      slotIndex,
      item: itemFormat(item),
      jewel: item.jewel ? `${item.jewel.key}:${item.jewel.rank}` : null,
      // A slot beyond the character's current slot count keeps its item but does not work, and its Jewel is not counted.
      active: slotIndex < maxSlots,
    }] : []);
  }));
  return {
    inventory: Object.entries(state.global.inventory).map(([variantKey, variant]) => ({
      variantKey,
      item: itemFormat(variant.item),
      quantity: variant.count,
      status: variant.status,
      isNew: variant.isNew === true,
      sale: variant.status === 'owned' && variant.count > 0 ? getStackSale(variant.item, variant.count, authorities) : null,
    })),
    jewels,
    equippedItems,
    jewelPriorityParty: state.global.jewelAutoEquipPriorityPartyId ?? 'none',
  };
}

function baseProjection(state: GameState, context: ApiV1ReadContext) {
  return {
    currencies: { gold: state.global.gold, prana: state.global.prana },
    ...inventoryProjection(state),
    shop: shopProjection(state, context.inGameTime),
    altar: altarProjection(state),
  };
}

export async function buildApiV1ReadData(operationId: string, state: GameState, parameters: Record<string, unknown>, context: ApiV1ReadContext): Promise<Record<string, unknown>> {
  if (operationId === 'read/observation' || operationId === 'read/observation/compact') {
    const simulations: string[] = [];
    for (let index = 0; index < state.parties.length; index += 1) {
      const result = await context.simulation?.(index, 100) as { Clear?: number; Return?: number; Draw?: number; Retreat?: number; Defeat?: number; total?: number } | undefined;
      const total = result?.total ?? 100;
      const percent = (value: number | undefined) => Math.round(((value ?? 0) / total) * 100);
      simulations.push(`PT${state.parties[index].id} / Clear ${percent(result?.Clear)}% / Return ${percent(result?.Return)}% / Draw ${percent(result?.Draw)}% / Retreat ${percent(result?.Retreat)}% / Defeat ${percent(result?.Defeat)}%`);
    }
    return compactObservation(state, context, simulations);
  }
  if (operationId === 'read/observation/overview') return { headerInfo: overviewProjection(state, context) };
  if (operationId === 'read/observation/expedition') return { expeditionInfo: expeditionProjection(state, context) };
  if (operationId === 'read/observation/party') {
    // `parties` lists every unlocked party's deity and members so the party selector and the deity and Mimorian
    // assignment rules do not need the other parties' full projections.
    const parties = state.parties.map((party) => ({
      partyNumber: party.id,
      deityId: getDeityId(party.deity.name),
      characters: party.characters.map((character) => ({ characterId: character.id, name: character.name, raceId: character.raceId, gender: character.gender, isUnique: character.isUnique === true, mimorianEnemyId: character.mimorianEnemyId ?? null })),
    }));
    return { partyInfo: { ...partyProjection(state, parameters), parties, unlockedMimorianEnemyIds: [...state.global.unlockedMimorianEnemyIds] } };
  }
  if (operationId === 'read/observation/base') return { baseInfo: baseProjection(state, context) };
  if (operationId === 'read/observation/diary') return { diaryInfo: buildDiaryProjection(state, parameters) };
  if (operationId === 'read/observation/setting') {
    // SpecRef: 9.1.4.15 | "The setting/overview projection includes relevant pending IDs."
    const pendingDeliveryIds = ((context.control?.deliveries as ApiV1DeliveryRecord[] | undefined) ?? [])
      .filter((entry) => entry.status === 'queued' || entry.status === 'sending' || entry.status === 'unknown')
      .map((entry) => entry.deliveryId);
    return { settingInfo: { language: state.global.language, environment: context.environment, gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, ...(context.control?.settings ?? {}), modeSelect: describeModeSelectCurrent({ gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, language: state.global.language }, context.displaySettings?.()), debug: describeDebugSettings(effectiveDebugSettings(context)), enemyEditPane: describeEnemyEditPane(effectiveEnemyEditSettings(context)), uiPreferences: listUiPreferences(state.global.uiPreferences), uiPreferenceCatalog: describeUiPreferenceCatalog(), pendingDeliveryIds } };
  }

  const expedition = operationId.match(/^read\/expedition\/(\d+)\/(setting|latestBattleLog|simulationRun|chargeStock)$/);
  if (expedition) {
    const selected = partyByNumber(state, expedition[1]);
    if (!selected) throw new Error('not_found');
    const { party, index } = selected;
    if (expedition[2] === 'setting') {
      // SpecRef: 9.1.3 | Read | 2-2-1 {p}/setting
      // The choices are the same shared rules the commit validates against: unlocked destinations (the Colosseum only when
      // enabled), the fixed depth limits, and a difficulty range that stays at 0 until the destination's boss was defeated.
      const maximumOffset = getSelectableDifficultyOffsetMax(party, party.selectedDungeonId);
      return {
        current: { destination: party.selectedDungeonId, destinationMode: party.expeditionDestinationMode, depthLimit: party.expeditionDepthLimit, difficultyOffset: party.expeditionDifficultyOffset },
        validOptions: {
          destination: getSelectableDestinationIds(party, context.colosseumEnabled ?? (context.control?.settings?.debug as { colosseumMode?: unknown } | undefined)?.colosseumMode === true),
          depthLimit: [...EXPEDITION_DEPTH_LIMITS],
          difficultyOffset: { min: 0, max: maximumOffset, step: DIFFICULTY_OFFSET_STEP },
        },
      };
    }
    if (expedition[2] === 'latestBattleLog') {
      // Omitted `logId` or `latest` selects the party's latest retained log (the `logId` a sortie without a Diary entry
      // returns); `diary:<id>` selects the log of one retained Diary entry.
      if (parameters.logId === undefined || parameters.logId === 'latest') return buildBattleLogData(disclosedLogOf(state, context, index), party.id, 'latest');
      const diaryId = /^diary:(.+)$/.exec(String(parameters.logId))?.[1];
      const diary = diaryId === undefined ? undefined : party.diaryLogs.find((entry) => String(entry.id) === diaryId);
      if (!diary) throw new Error('not_found');
      return buildBattleLogData(diary.expeditionLog, party.id, String(parameters.logId));
    }
    if (expedition[2] === 'simulationRun') {
      if (!context.simulation) throw new Error('runtime_unavailable');
      return buildSimulationRunData(await context.simulation(index, 1_000) as ExpeditionSimulationResult, context.revision, crypto.randomUUID(), describeSimulationDepthReach(party));
    }
    const charge = getInstantExpeditionChargeState(party, context.inGameTime, context.chargeDurationScale ?? 1);
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
  const characterRead = operationId.match(/^read\/build\/character\/(\d+)\/(status|equipment|equipmentSet|equipmentEvaluation)$/);
  if (characterRead) {
    const found = findCharacter(state, characterRead[1]);
    if (!found) throw new Error('not_found');
    const { party, character, characterIndex } = found;
    if (characterRead[2] === 'status') {
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
        calculatedStatus: buildCalculatedStatus(party.characters[characterIndex], computePartyStats(party).characterStats[characterIndex], party.level),
        current: describeCharacterBuildCurrent(character),
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
    if (characterRead[2] === 'equipment') {
      // Empty slots are counted against the character's real slot count: the equipment array may be shorter.
      const maxSlots = computePartyStats(party).characterStats[characterIndex].maxEquipSlots;
      const emptySlots = Array.from({ length: maxSlots }, (_, slot) => slot).filter((slot) => !character.equipment[slot]).length;
      return {
        current: { mode: autoEquipmentModeName(character.autoEquipmentMode), equipment: equipmentEntries(character, maxSlots) },
        validOptions: { mode: ['FULL', 'SEMI', 'OFF'], numberOfEmptyEquipmentSlots: emptySlots, ...describeEquipmentHistory(state, character.id, context.control?.equipmentHistory) },
      };
    }
    if (characterRead[2] === 'equipmentEvaluation') {
      // SpecRef: 9.1.3 | Read | 2-3-5 character/{characterId}/equipmentEvaluation
      const requested = parameters.targetItems === undefined ? [] : Array.isArray(parameters.targetItems) ? parameters.targetItems : [parameters.targetItems];
      const requestedChanges = parameters.equipmentChanges === undefined ? [] : Array.isArray(parameters.equipmentChanges) ? parameters.equipmentChanges : [parameters.equipmentChanges];
      if (requested.length === 0 && requestedChanges.length === 0) throw new Error('invalid_request:targetItems.or_equipmentChanges_required');
      if (new Set(requested).size !== requested.length) throw new Error('invalid_request:targetItems');
      if (new Set(requestedChanges).size !== requestedChanges.length) throw new Error('invalid_request:equipmentChanges');
      if (requested.length > EQUIPMENT_EVALUATION_LIMIT) throw new Error('invalid_request:targetItems');
      if (requestedChanges.length > EQUIPMENT_EVALUATION_LIMIT) throw new Error('invalid_request:equipmentChanges');
      const currentStats = computeCharacterStatsInParty(party, characterIndex);
      return {
        calculatedItemStatus: requested.map((entry) => {
          const item = typeof entry === 'string' ? parseEvaluatedItemFormat(entry) : null;
          if (!item || (item.jewel && !isJewelAllowedForCategory(item.category, item.jewel.key))) throw new Error('invalid_request:targetItems');
          return { item: entry as string, ...evaluateItemForCharacter(character, item, party.level), abilities: describeItem(item).ability };
        }),
        calculatedEquipmentChange: requestedChanges.map((entry) => {
          const change = typeof entry === 'string' ? parseEquipmentChange(entry) : null;
          if (!change || change.slotIndex >= currentStats.maxEquipSlots
            || (change.item?.jewel && !isJewelAllowedForCategory(change.item.category, change.item.jewel.key))) {
            throw new Error('invalid_request:equipmentChanges');
          }
          const equipment = [...character.equipment];
          equipment[change.slotIndex] = change.item;
          const nextStats = computeCharacterStatsInParty(party, characterIndex, { ...character, equipment });
          return {
            change: entry as string,
            equippable: change.item === null || evaluateItemForCharacter(character, change.item, party.level).equippable,
            physicalDefenseDelta: Math.round(nextStats.physicalDefense) - Math.round(currentStats.physicalDefense),
            magicalDefenseDelta: Math.round(nextStats.magicalDefense) - Math.round(currentStats.magicalDefense),
          };
        }),
      };
    }
    const ids = Array.isArray(parameters.equipmentSetId) ? parameters.equipmentSetId.map(Number) : parameters.equipmentSetId ? [Number(parameters.equipmentSetId)] : null;
    const maxSlots = computePartyStats(party).characterStats[characterIndex].maxEquipSlots;
    return {
      equipmentSets: state.global.savedEquipmentSets.filter((set) => !ids || ids.includes(set.slot)).map((set) => {
        const availability = evaluateEquipmentSet(set, character, state.global.inventory, maxSlots);
        return {
          equipmentSetId: set.slot,
          equipmentSet: {
            equipmentSetId: set.slot,
            name: set.name,
            createdAt: new Date(set.createdAt).toISOString(),
            ...(parameters.isEquipmentSetDetail === true || parameters.isEquipmentSetDetail === 'true'
              ? { equipment: set.equipment.map((entry, index) => formatEquipmentEntry(getSavedEquipmentSlot(entry, index), entry.item, entry.isLocked, null)) }
              : {}),
            availability: {
              allAvailable: availability.allAvailable,
              entries: availability.entries.map(({ entry, available, unavailableReason }, index) => ({
                slotIndex: getSavedEquipmentSlot(entry, index),
                item: formatEquipmentEntry(getSavedEquipmentSlot(entry, index), entry.item, entry.isLocked, null),
                available,
                unavailableReason,
              })),
            },
          },
        };
      }),
    };
  }

  if (operationId === 'read/base/searchItems') return searchItems(state, parameters);
  if (operationId === 'read/base/jewelPriorityParty') return { current: { partyNumber: state.global.jewelAutoEquipPriorityPartyId ?? 'none' }, validOptions: { partyNumber: [...state.parties.map((party) => party.id), 'none'] } };
  if (operationId === 'read/base/shopInfo') {
    const { lineupId: _lineupId, refreshesAt: _refreshesAt, entries: _entries, ...info } = shopProjection(state, context.inGameTime);
    return info;
  }
  if (operationId === 'read/base/shopItemsList') {
    const shop = shopProjection(state, context.inGameTime);
    // `items` are the compact `<shopItemId>/<itemId>/<price>/<availability>` strings of 9.1.3; `entries` carry the same facts
    // structured, including why a slot cannot be bought.
    return {
      current: { lineupId: shop.lineupId, refreshesAt: shop.refreshesAt, items: shop.entries.map((entry) => `${entry.shopItemId}/${entry.itemId}/${entry.price}/${entry.available}`), entries: shop.entries },
      // `lineupId` is repeated here because `purchaseShopItems` requires it together with the `items` below.
      validOptions: { lineupId: shop.lineupId, items: shop.entries.filter((entry) => entry.available).map((entry) => entry.shopItemId) },
    };
  }
  if (operationId === 'read/base/altarInfo') return { altarOverview: altarProjection(state) };
  if (operationId === 'read/base/enemyFormList') {
    // Optional intersecting filters; omission lists every enemy form.
    const enemyId = parameters.enemyId === undefined ? undefined : Number(parameters.enemyId);
    const forms = ENEMIES.filter((enemy) => (enemyId === undefined || enemy.id === enemyId) && (parameters.enemyType === undefined || enemy.enemyType === parameters.enemyType));
    if (enemyId !== undefined && forms.length === 0) throw new Error('not_found');
    const entries = forms.map((enemy) => enemyFormEntry(state, enemy));
    return { current: { enemyFormList: entries }, validOptions: { enemyId: entries.filter((entry) => entry.unlockable.available).map((entry) => entry.enemyId) } };
  }

  const diarySetting = operationId.match(/^read\/diary\/(\d+)\/diarySetting$/);
  if (diarySetting) { const selected = partyByNumber(state, diarySetting[1]); if (!selected) throw new Error('not_found'); return { current: diarySettingsView(selected.party.diarySettings), validOptions: DIARY_SETTING_VALID_OPTIONS }; }
  const diaryEntry = operationId.match(/^read\/diary\/diaryEntry\/(.+)$/);
  if (diaryEntry) return { entry: findDiaryEntryView(state, decodeURIComponent(diaryEntry[1])) };

  if (operationId === 'read/setting/modeSelect') {
    // SpecRef: 9.1.3 | Read | 2-6-2 modeSelect — the real runtime values, never an echo of an earlier request.
    const display = context.displaySettings?.();
    return {
      current: describeModeSelectCurrent({ gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, language: state.global.language }, display),
      validOptions: {
        mode: ['mode.normal', 'mode.orca'], enemyLevelOffset: { min: 0, max: 20, step: 1 }, language: ['ja', 'en', 'zh-CN', 'zh-TW', 'ko'], darkMode: ['off', 'on', 'system'],
        // Auto-repeat is reported but never controlled through the API (9.1.3, 3-6-2), so no value is accepted. The display
        // settings belong to the ordinary player's runtime, so an API account can select none of them.
        autoRepeat: [],
        showExpeditionStats: display ? [true, false] : [],
        theme: display ? selectableThemes(context.environment, context.gameMode, display.theme).map(toThemeKey) : [],
      },
    };
  }
  // SpecRef: 9.1.3 | Read | 2-6-1 enemyEditPane — the ordinary player's real Enemy Edit pane; an API account's own settings.
  if (operationId === 'read/setting/enemyEditPane') return { current: describeEnemyEditPane(effectiveEnemyEditSettings(context)), validOptions: enemyEditPaneValidOptions() };
  // SpecRef: 9.1.3 | Read | 2-6-3 debug — the ordinary player's real Debug settings; an API account's own stored values.
  // An API account's settings not stored yet report their defaults, never an empty object.
  if (operationId === 'read/setting/debug') {
    const booleans = [true, false];
    return {
      current: describeDebugSettings(effectiveDebugSettings(context)),
      validOptions: {
        runtimeDiagnostics: booleans, clairvoyance: booleans, speedOfTime: ['real', 'x1.2', 'x5', 'x20', 'x100', 'unlimited'],
        godsBattleCondition: ['normal', 'simple'], godsStrength: ['normal', 'veryWeak'], debugStoreOpen: booleans, displayFlavorCondition: booleans,
        displayAfkDuration: booleans, displayAllBestiary: booleans, displayAllCompendium: booleans, displayAllGlossary: booleans, colosseumMode: booleans,
      },
    };
  }
  if (operationId.startsWith('read/setting/delivery/')) { const deliveryId = operationId.split('/').at(-1); const delivery = (context.control?.deliveries as ApiV1DeliveryRecord[] | undefined)?.find((entry) => entry.deliveryId === deliveryId); if (!delivery) throw new Error('not_found'); return projectDelivery(delivery); }

  // SpecRef: 9.1.3, 4-2-1 | "content is returned in the currently selected language."
  // `isRead` is the save's read state, which `commit/setting/markNewsAsRead` changes (Spec 8.6 News; 9.1.4.9).
  if (operationId === 'resources/developerNewsNotification') return { entries: DEVELOPER_NEWS_ITEMS.map((entry) => ({ version: entry.id, date: entry.date, content: entry.content[state.global.language], isRead: (state.global.readDeveloperNewsItemIds ?? []).includes(entry.id) })) };
  if (operationId === 'resources/donationBox') {
    // Every unlocked god with its rank, donated Gold, and the total needed for the next rank.
    const gods = state.global.unlockedDeities.flatMap((name) => {
      if (isNoFaithDeity(name)) return [];
      const donated = state.global.deityDonations[normalizeDeityName(name)] ?? 0;
      const next = getNextRankDonationRequirement(donated);
      return [`${getDeityId(name)}/${getDeityRank(donated)}/${donated}/${next ?? 'MAX'}`];
    });
    return { gods };
  }
  const clairvoyanceMatch = operationId.match(/^resources\/clairvoyance\/(\d+)$/);
  if (clairvoyanceMatch) {
    const selected = partyByNumber(state, clairvoyanceMatch[1]);
    if (!selected) throw new Error('not_found');
    const access = getPartyClairvoyanceAccess(selected.party, clairvoyanceDebugOverride(context));
    if (!access.isVisible) return { available: false };
    return { available: true, canReset: access.canResetBags, ...clairvoyance(selected.party) };
  }
  if (operationId === 'resources/glossary') return glossary(state, parameters, context);
  if (operationId === 'resources/itemCompendium') return itemCompendium(state, parameters, context);
  if (operationId === 'resources/characterRoster') return characterRoster(parameters, context);
  if (operationId === 'resources/bestiary') return bestiary(state, parameters, context);
  if (operationId === 'resources/superRareList') return superRareList(parameters, context);
  return {};
}
