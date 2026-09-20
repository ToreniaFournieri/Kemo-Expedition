import type { ApiV1DeliveryRecord } from './deliveries';
import { DEVELOPER_NEWS_ITEMS } from '../../data/developerNews';
import { getDeityNameFromId, normalizeDeityName } from '../../game/deity';
import { isDebugModeEnabled } from '../../game/environment';
import { computePartyStats } from '../../game/partyComputation';
import { hydrateGameState, serializeGameState } from '../../game/saveCodec';
import { buildShopLineup } from '../../game/shop';
import { isEquipmentSlotAction, planEquipmentSlotOperation } from './equipmentSlots';
import { decodePersistedState, encodePersistedState } from '../../game/storageCompression';
import { createFreshGameState, gameReducer } from '../../hooks/useGameState';
import type { Character, GameState, Item, Party, SavedEquipmentSet } from '../../types';
import { getVariantKey } from '../../types';

// SpecRef: 9.1 | Desktop distribution | Application API
// This is the transport-neutral gameplay-mutation slice of the `/api/v1` commit dispatcher. It owns exactly the
// gameplay logic previously inlined in HomeScreen.tsx's `processApiV1Request` (the section between resolving the
// idempotency/revision/confirmation transaction and building the final envelope). It receives an explicit
// authoritative snapshot plus injected dependencies for the few pieces that are not pure functions of
// (operation, state, parameters) alone, and returns the next state and any control-plane side effects the caller
// (`src/api/v1/authority.ts`, responsible for revision, idempotency, receipts, and persistence) must apply.

export function decodeApiSavePayload(payload: string): GameState {
  return hydrateGameState(JSON.parse(decodePersistedState(payload)) as GameState);
}

export interface ApiV1CommitContext {
  /** In-game clock at the start of this transaction (epoch ms); `commit/progress/elapsed` may advance a local copy. */
  readonly simulatedAt: number;
  readonly gameMode: 'mode.normal' | 'mode.orca';
  readonly enemyLevelOffset: number;
  /** The API control settings bag (`stagedControl.settings`); may be mutated in place and is always echoed back. */
  readonly settings: Record<string, unknown>;
  /** The API control equipment-history bag (`stagedControl.equipmentHistory`); mutated in place and echoed back. */
  readonly equipmentHistory: Record<string, { undo: SavedEquipmentSet[]; redo: SavedEquipmentSet[] }>;
  readonly uploadedFiles: Record<string, Record<string, unknown>>;
  /** Canonicalized upload metadata, precomputed by the caller (also used for idempotency canonicalization). */
  readonly canonicalFiles: Record<string, unknown>;
  readonly applyAutoEquipment: (state: GameState, partyIndex: number, characterId: number | undefined, forceFull: boolean) => GameState;
  readonly createDeliveryId: () => string;
  /** Real wall-clock epoch ms, used only for delivery record timestamps (distinct from the in-game `simulatedAt`). */
  readonly now: () => number;
}

export interface ApiV1CommitOutcome {
  state: GameState;
  data: Record<string, unknown>;
  simulatedAt: number;
  settings: Record<string, unknown>;
  equipmentHistory: Record<string, { undo: SavedEquipmentSet[]; redo: SavedEquipmentSet[] }>;
  /** `commit/setting/backup/import` and `commit/setting/backup/reset` invalidate outstanding popups and confirmations. */
  resetControlEvents: boolean;
  delivery: ApiV1DeliveryRecord | null;
}

/**
 * Applies one already-authorized `/api/v1` commit operation to `state` and returns the next state plus any
 * control-plane side effects. Throws an `Error` whose message is one of the stable markers already recognized by
 * the caller's error-code classification (`not_found`, `illegal_action`, or any other message maps to
 * `invalid_request`).
 */
export function applyApiV1Commit(operation: string, state: GameState, parameters: Record<string, unknown>, context: ApiV1CommitContext): ApiV1CommitOutcome {
  let next = state;
  let simulatedAt = context.simulatedAt;
  let data: Record<string, unknown> = {};
  const settings = context.settings;
  let resetControlEvents = false;
  let delivery: ApiV1DeliveryRecord | null = null;
  const reduce = (action: Parameters<typeof gameReducer>[1]) => { next = gameReducer(next, action); };
  const partyMatch = operation.match(/^commit\/expedition\/(\d+)\/(changeExpedition|sortie|godsBattle)$/);
  const characterMatch = operation.match(/^commit\/build\/character\/(\d+)\/(.+)$/);

  if (operation === 'commit/setting/backup/export') {
    data = { savePayload: encodePersistedState(JSON.stringify(serializeGameState(next))) };
  } else if (operation === 'commit/setting/backup/import') {
    const backup = context.uploadedFiles.backup;
    if (!backup || typeof backup.contentBase64 !== 'string') throw new Error('invalid_backup');
    const imported = decodeApiSavePayload(atob(backup.contentBase64));
    next = imported;
    resetControlEvents = true;
    data = { imported: true };
  } else if (operation === 'commit/progress/elapsed') {
    const elapsedSeconds = parameters.elapsedSeconds === undefined ? 0 : Number(parameters.elapsedSeconds);
    if (elapsedSeconds !== 0 && (!Number.isInteger(elapsedSeconds) || elapsedSeconds < 60 || elapsedSeconds > 43_200)) throw new Error('invalid_elapsed');
    if (elapsedSeconds > 0) reduce({ type: 'SIMULATE_AFK', elapsedMs: elapsedSeconds * 1000, isAutoRepeatEnabled: true, gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, simulatedEndAt: simulatedAt + elapsedSeconds * 1000 });
    simulatedAt += elapsedSeconds * 1000;
    data = { requestedElapsedSeconds: elapsedSeconds, acceptedElapsedSeconds: elapsedSeconds, cappedElapsedSeconds: elapsedSeconds, elapsedSeconds, inGameTime: new Date(simulatedAt).toISOString() };
  } else if (operation === 'commit/progress/progressReport' || operation === 'commit/setting/feedback') {
    const deliveryId = context.createDeliveryId();
    const deliveryTime = new Date(context.now()).toISOString();
    delivery = { deliveryId, status: 'queued', createdAt: deliveryTime, updatedAt: deliveryTime, failureReason: null, rewardApplied: false, operation, parameters: structuredClone(parameters), files: context.canonicalFiles };
    data = { deliveryId, status: 'queued' };
  } else if (partyMatch) {
    const partyNumber = Number(partyMatch[1]);
    const partyIndex = next.parties.findIndex((entry) => entry.id === partyNumber);
    if (partyIndex < 0) throw new Error('not_found');
    if (partyMatch[2] === 'changeExpedition') {
      if (parameters.destination !== undefined) reduce({ type: 'SELECT_DUNGEON', partyIndex, dungeonId: Number(parameters.destination), selectionMode: parameters.destinationMode === 'auto' ? 'auto' : 'manual' });
      if (parameters.destinationMode !== undefined) reduce({ type: 'SET_EXPEDITION_DESTINATION_MODE', partyIndex, mode: String(parameters.destinationMode) as Party['expeditionDestinationMode'] });
      if (parameters.depthLimit !== undefined) reduce({ type: 'SET_EXPEDITION_DEPTH_LIMIT', partyIndex, depthLimit: String(parameters.depthLimit) as Party['expeditionDepthLimit'] });
      if (parameters.difficultyOffset !== undefined) reduce({ type: 'SET_EXPEDITION_DIFFICULTY_OFFSET', partyIndex, difficultyOffset: Number(parameters.difficultyOffset) });
      const party = next.parties[partyIndex];
      data = { current: { destination: party.selectedDungeonId, destinationMode: party.expeditionDestinationMode, depthLimit: party.expeditionDepthLimit, difficultyOffset: party.expeditionDifficultyOffset } };
    } else {
      const party = next.parties[partyIndex];
      const maximumHp = computePartyStats(party).partyStats.hp;
      reduce({ type: 'CONSUME_INSTANT_EXPEDITION_STOCK', partyIndex, now: context.simulatedAt });
      reduce({ type: 'CLEAR_PENDING_PROFIT', partyIndex });
      reduce({ type: 'HEAL_PARTY_HP', partyIndex, amount: maximumHp });
      reduce({ type: 'RESOLVE_INSTANT_EXPEDITION', partyIndex, simulatedAt: context.simulatedAt, gameMode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, triggerGodsBattle: partyMatch[2] === 'godsBattle' });
      const resolved = next.parties[partyIndex];
      data = { outcome: resolved.lastExpeditionLog?.finalOutcome ?? null, rewards: resolved.lastExpeditionLog?.rewards.map((item) => getVariantKey(item)) ?? [], diaryEntryId: resolved.diaryLogs[0]?.id ?? null, logId: resolved.diaryLogs[0]?.id ?? null };
    }
  } else if (operation.match(/^commit\/build\/party\/(\d+)$/)) {
    const partyNumber = Number(operation.split('/').at(-1));
    const partyIndex = next.parties.findIndex((entry) => entry.id === partyNumber);
    if (partyIndex < 0) throw new Error('not_found');
    if (parameters.deityId !== undefined) { const deityName = getDeityNameFromId(String(parameters.deityId)); if (!deityName) throw new Error('invalid_deity'); reduce({ type: 'UPDATE_PARTY_DEITY', partyIndex, deityName }); }
    if (Array.isArray(parameters.order)) {
      const target = parameters.order.map(Number);
      for (let destination = 0; destination < target.length; destination += 1) {
        const source = next.parties[partyIndex].characters.findIndex((entry) => entry.id === target[destination]);
        if (source < 0) throw new Error('invalid_order');
        if (source !== destination) reduce({ type: 'REORDER_PARTY_CHARACTER', partyIndex, fromIndex: source, toIndex: destination });
      }
    }
    data = { current: { deityId: parameters.deityId ?? normalizeDeityName(next.parties[partyIndex].deity.name), order: next.parties[partyIndex].characters.map((entry) => entry.id) } };
  } else if (characterMatch) {
    const characterId = Number(characterMatch[1]);
    const partyIndex = next.parties.findIndex((party) => party.characters.some((entry) => entry.id === characterId));
    if (partyIndex < 0) throw new Error('not_found');
    const action = characterMatch[2];
    const characterBefore = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
    const history = context.equipmentHistory;
    const characterHistory = history[String(characterId)] ??= { undo: [], redo: [] };
    const snapshotEquipment = (): SavedEquipmentSet => ({ slot: 0, name: 'API history', createdAt: simulatedAt, equipment: characterBefore.equipment.filter((item): item is Item => item !== null).map((item) => ({ item: structuredClone(item), isLocked: item.isLocked === true })) });
    const recordsEquipmentHistory = !['saveEquipmentSet', 'deleteEquipmentSet', 'renameEquipmentSet', 'undoEquipment', 'redoEquipment'].includes(action);
    if (recordsEquipmentHistory) { characterHistory.undo.push(snapshotEquipment()); characterHistory.redo = []; }
    if (action === 'changeBuild') reduce({ type: 'UPDATE_CHARACTER', partyIndex, characterId, updates: { ...(parameters.name === undefined ? {} : { name: String(parameters.name) }), ...(parameters.mainClassId === undefined ? {} : { mainClassId: String(parameters.mainClassId) as Character['mainClassId'] }), ...(parameters.subClassId === undefined ? {} : { subClassId: String(parameters.subClassId) as Character['subClassId'] }), ...(parameters.lineage === undefined ? {} : { lineageId: String(parameters.lineage) as Character['lineageId'] }), ...(parameters.predisposition === undefined ? {} : { predispositionId: String(parameters.predisposition) as Character['predispositionId'] }) } });
    else if (action === 'removeAllEquipment') reduce({ type: 'REMOVE_ALL_EQUIPMENT', partyIndex, characterId });
    else if (isEquipmentSlotAction(action)) {
      const character = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
      for (const step of planEquipmentSlotOperation(action, character, next.global.jewels, parameters)) reduce({ ...step, partyIndex, characterId });
    }
    else if (action === 'saveEquipmentSet') { const equipmentSet = parameters.equipmentSet as { name?: string } | undefined; reduce({ type: 'SAVE_EQUIPMENT_SET', partyIndex, characterId, name: equipmentSet?.name ?? `Set ${next.global.savedEquipmentSets.length + 1}`, createdAt: context.simulatedAt }); data = { equipmentSetId: next.global.savedEquipmentSets.at(-1)?.slot }; }
    else if (action === 'loadEquipmentSet') reduce({ type: 'LOAD_EQUIPMENT_SET', partyIndex, characterId, slot: Number(parameters.equipmentSetId), mode: parameters.loadMode === 'equipSimilar' ? 'similar' : 'exact' });
    else if (action === 'deleteEquipmentSet') reduce({ type: 'DELETE_EQUIPMENT_SET', slot: Number(parameters.equipmentSetId) });
    else if (action === 'renameEquipmentSet') reduce({ type: 'RENAME_EQUIPMENT_SET', slot: Number(parameters.equipmentSetId), name: String(parameters.name) });
    else if (action === 'autoEquipment') { const mode = String(parameters.mode); reduce({ type: 'UPDATE_CHARACTER', partyIndex, characterId, updates: { autoEquipmentMode: mode === 'FULL' ? 2 : mode === 'SEMI' ? 1 : 0 } }); if (parameters.immediateAutoEquipment === true) next = context.applyAutoEquipment(next, partyIndex, characterId, true); }
    else if (action === 'equip') {
      const requested = (Array.isArray(parameters.targetEquipment) ? parameters.targetEquipment : [parameters.targetEquipment]).map(String);
      if (requested.length === 0 || new Set(requested).size !== requested.length) throw new Error('invalid_items');
      for (const format of requested) {
        const parts = format.split('/').map(Number);
        const [lock, itemId, enhancement, superRare] = parts;
        const key = Object.keys(next.global.inventory).find((variantKey) => { const candidate = next.global.inventory[variantKey]; return candidate.count > 0 && candidate.status === 'owned' && candidate.item.id === itemId && candidate.item.enhancement === enhancement && candidate.item.superRare === superRare && Number(candidate.item.isLocked === true) === lock; });
        const character = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
        const slotIndex = character.equipment.findIndex((item) => item === null);
        if (!key || slotIndex < 0) throw new Error('illegal_action');
        reduce({ type: 'EQUIP_ITEM', partyIndex, characterId, slotIndex, itemKey: key });
      }
    } else if (action === 'undoEquipment' || action === 'redoEquipment') {
      const source = action === 'undoEquipment' ? characterHistory.undo : characterHistory.redo;
      const target = action === 'undoEquipment' ? characterHistory.redo : characterHistory.undo;
      const restore = source.pop();
      if (!restore) throw new Error('illegal_action');
      const current = next.parties[partyIndex].characters.find((entry) => entry.id === characterId)!;
      target.push({ slot: 0, name: 'API history', createdAt: simulatedAt, equipment: current.equipment.filter((item): item is Item => item !== null).map((item) => ({ item: structuredClone(item), isLocked: item.isLocked === true })) });
      reduce({ type: 'RESTORE_EQUIPMENT_STATE', partyIndex, characterId, set: restore });
    }
    data = data.equipmentSetId ? data : { current: { equipment: next.parties[partyIndex].characters.find((entry) => entry.id === characterId)?.equipment.map((item, slot) => item ? `${slot}/${item.isLocked ? 1 : 0}/${item.id}/${item.enhancement}/${item.superRare}` : 0) ?? [] } };
  } else if (operation === 'commit/base/changeJewelPriorityParty') {
    reduce({ type: 'SET_JEWEL_AUTO_EQUIP_PRIORITY_PARTY', partyId: parameters.partyNumber === 'none' ? null : Number(parameters.partyNumber) });
    data = { current: { partyNumber: next.global.jewelAutoEquipPriorityPartyId ?? 'none' } };
  } else if (operation === 'commit/base/sellInventoryItems') {
    for (const item of parameters.items as string[]) { const [, itemId, enhancement, superRare] = item.split('/').map(Number); const key = Object.keys(next.global.inventory).find((variantKey) => { const candidate = next.global.inventory[variantKey].item; return candidate.id === itemId && candidate.enhancement === enhancement && candidate.superRare === superRare; }); if (!key) throw new Error('not_found'); reduce({ type: 'SELL_STACK', variantKey: key }); }
  } else if (operation === 'commit/base/purchaseShopItems') {
    const items = parameters.items;
    const requested = (Array.isArray(items) ? items : []).map((item) => String(item && typeof item === 'object' ? (item as Record<string, unknown>).shopItemId : ''));
    if (requested.length === 0 || new Set(requested).size !== requested.length) throw new Error('invalid_items');
    const lineup = buildShopLineup({ parties: next.parties, gold: next.global.gold, shopPurchases: next.global.shopPurchases, shopRefreshCounts: next.global.shopRefreshCounts, shopIntimacy: next.global.shopIntimacy, shopIntimacyLastDecayAt: next.global.shopIntimacyLastDecayAt }, new Date(simulatedAt));
    const entries = requested.map((id) => lineup.entries.find((entry) => entry.stockEntryId === id));
    if (entries.some((entry) => !entry || entry.soldOut) || entries.reduce((sum, entry) => sum + (entry?.price ?? 0), 0) > next.global.gold) throw new Error('illegal_action');
    for (const entry of entries) reduce({ type: 'BUY_SHOP_ITEM', itemId: entry!.itemId, stockItemKey: entry!.stockEntryId });
    data = { purchased: entries.map((entry) => entry!.stockEntryId), gold: next.global.gold };
  } else if (operation === 'commit/base/unlockSoldItems') {
    const items = parameters.items as string[];
    const keys = Array.isArray(items) ? items.map((format) => { const [, itemId, enhancement, superRare] = String(format).split('/').map(Number); return Object.keys(next.global.inventory).find((variantKey) => { const candidate = next.global.inventory[variantKey]; return candidate.status === 'sold' && candidate.item.id === itemId && candidate.item.enhancement === enhancement && candidate.item.superRare === superRare; }); }) : [];
    if (keys.length === 0 || keys.some((key) => !key) || new Set(keys).size !== keys.length) throw new Error('invalid_items');
    for (const variantKey of keys) reduce({ type: 'SET_VARIANT_STATUS', variantKey: variantKey!, status: 'notown' });
    data = { items };
  } else if (operation === 'commit/base/paidShopRefresh') reduce({ type: 'REFRESH_SHOP_LINEUP' });
  else if (operation === 'commit/base/unlockForm') reduce({ type: 'UNLOCK_MIMORIAN_ENEMY', enemyId: Number(parameters.enemyId) });
  else if (operation === 'commit/base/markItemsAsSeen') {
    const keys = parameters.items as string[];
    if (!Array.isArray(keys) || keys.some((key) => !next.global.inventory[key])) throw new Error('invalid_items');
    next = { ...next, global: { ...next.global, inventory: Object.fromEntries(Object.entries(next.global.inventory).map(([key, variant]) => [key, keys.includes(key) ? { ...variant, isNew: false } : variant])) } };
    data = { items: keys };
  } else if (operation.match(/^commit\/diary\/(\d+)\/diarySetting$/)) {
    const partyNumber = Number(operation.split('/')[2]); const partyIndex = next.parties.findIndex((entry) => entry.id === partyNumber); if (partyIndex < 0) throw new Error('not_found'); reduce({ type: 'UPDATE_DIARY_SETTINGS', partyIndex, settings: parameters }); data = { current: next.parties[partyIndex].diarySettings };
  } else if (operation === 'commit/diary/diaryEntry/markAsRead') {
    const ids = parameters.diaryEntryId === 'ALL' ? next.parties.flatMap((party) => party.diaryLogs.map((entry) => entry.id)) : (Array.isArray(parameters.diaryEntryId) ? parameters.diaryEntryId : [parameters.diaryEntryId]).map(String);
    for (const id of ids) reduce({ type: 'MARK_DIARY_LOG_SEEN', logId: id });
    data = { diaryEntryId: ids, unreadTotal: next.parties.reduce((sum, party) => sum + party.diaryLogs.filter((entry) => !entry.isRead).length, 0) };
  } else if (operation === 'commit/setting/markNewsAsRead') {
    const versions = parameters.version === undefined ? DEVELOPER_NEWS_ITEMS.map((entry) => entry.id) : (Array.isArray(parameters.version) ? parameters.version : [parameters.version]).map(String);
    reduce({ type: 'MARK_DEVELOPER_NEWS_READ', itemIds: versions }); data = { versions, unreadCount: DEVELOPER_NEWS_ITEMS.filter((entry) => !next.global.readDeveloperNewsItemIds.includes(entry.id)).length };
  } else if (operation === 'commit/setting/clairvoyanceReset') {
    const partyNumber = Number(parameters.partyNumber);
    const partyIndex = next.parties.findIndex((entry) => entry.id === partyNumber);
    if (partyIndex < 0) throw new Error('not_found');
    if (parameters.resetCommonRewards === true) reduce({ type: 'RESET_COMMON_BAGS', partyIndex });
    if (parameters.resetRewards === true) { reduce({ type: 'RESET_UNIQUE_BAGS', partyIndex }); reduce({ type: 'RESET_COMMON_SUPER_RARE_BAG', partyIndex }); reduce({ type: 'RESET_RARE_SUPER_RARE_BAG', partyIndex }); }
    if (parameters.resetSideQuest === true) { reduce({ type: 'RESET_SIDE_QUEST_BAG', partyIndex }); reduce({ type: 'SET_SIDE_QUEST_PROGRESS', partyIndex, progress: 0 }); }
    data = { partyNumber, resetCommonRewards: parameters.resetCommonRewards === true, resetRewards: parameters.resetRewards === true, resetSideQuest: parameters.resetSideQuest === true };
  } else if (operation === 'commit/setting/backup/reset') {
    next = createFreshGameState(next.global.language); resetControlEvents = true; data = {};
  } else if (operation === 'commit/setting/modeSelect') {
    if (parameters.mode !== undefined && parameters.mode !== context.gameMode) throw new Error('illegal_action');
    if (parameters.enemyLevelOffset !== undefined && Number(parameters.enemyLevelOffset) !== context.enemyLevelOffset) throw new Error('illegal_action');
    if (parameters.language !== undefined) reduce({ type: 'SET_LANGUAGE', language: String(parameters.language) as GameState['global']['language'] });
    const current = { ...((settings.modeSelect as Record<string, unknown> | undefined) ?? {}), ...parameters, mode: context.gameMode, enemyLevelOffset: context.enemyLevelOffset, language: next.global.language };
    if (Object.keys(parameters).length > 0) settings.modeSelect = current;
    data = { current };
  } else if (operation === 'commit/setting/enemyEditPane' || operation === 'commit/setting/debug') {
    if (!isDebugModeEnabled()) throw new Error('illegal_action');
    const key = operation.endsWith('/debug') ? 'debug' : 'enemyEditPane';
    const current = { ...((settings[key] as Record<string, unknown> | undefined) ?? {}), ...parameters };
    if (Object.keys(parameters).length > 0) settings[key] = current;
    data = { current };
  } else if (operation === 'commit/setting/uiPreferences') {
    const catalog = new Set(['settingPanelExpanded', 'clairvoyancePartyExpanded', 'glossaryTab', 'glossaryExpandedEntries', 'previousFeedbackName', 'selectedPartyNumber', 'selectedCharacterId', 'selectedDiaryPartyNumber', 'selectedDiaryEntryId', 'basePane', 'inventoryFilter']);
    const changes = parameters.changes as Array<{ key?: unknown; value?: unknown }>;
    if (!Array.isArray(changes) || changes.length === 0 || new Set(changes.map((entry) => entry?.key)).size !== changes.length || changes.some((entry) => !entry || !catalog.has(String(entry.key)) || !['string', 'number', 'boolean'].includes(typeof entry.value))) throw new Error('invalid_preferences');
    const current = new Map((((settings.uiPreferences as Array<{ key: string; value: string | number | boolean }> | undefined) ?? []).map((entry) => [entry.key, entry.value])));
    for (const change of changes) current.set(String(change.key), change.value as string | number | boolean);
    settings.uiPreferences = [...current].map(([key, value]) => ({ key, value }));
    data = { uiPreferences: settings.uiPreferences };
  }
  else throw new Error('invalid_request');

  return { state: next, data, simulatedAt, settings: context.settings, equipmentHistory: context.equipmentHistory, resetControlEvents, delivery };
}
