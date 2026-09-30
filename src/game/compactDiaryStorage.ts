import type { DiaryLog, ExpeditionLog, GameState, Item } from '../types/index.ts';
import { decodeCompactBattleEvents, type CompactBattleActor } from './compactBattleLog.ts';
import { getItemById } from '../data/items.ts';

function itemRef(item: Item): Item { return { id: item.id, enhancement: item.enhancement, superRare: item.superRare, ...(item.jewel ? { jewel: item.jewel } : {}) } as Item; }
function hydrateItem(item: Item): Item {
  const base = getItemById(item.id);
  if (!base) throw new Error(`Unknown compact Diary item ${item.id}`);
  return { ...base, ...item };
}
function validateText(value: unknown, depth = 0): void {
  if (depth > 8 || !Array.isArray(value) || value.length < 1 || value.length > 2 || typeof value[0] !== 'string') throw new Error('Invalid compact Diary text');
  if (value[1] === undefined) return;
  if (!value[1] || typeof value[1] !== 'object' || Array.isArray(value[1])) throw new Error('Invalid compact Diary text arguments');
  for (const arg of Object.values(value[1])) {
    if (Array.isArray(arg)) validateText(arg, depth + 1);
    else if (typeof arg !== 'string' && (typeof arg !== 'number' || !Number.isFinite(arg))) throw new Error('Invalid compact Diary text argument');
  }
}
function validateMetadata(log: DiaryLog): void {
  const meta = log.semantic;
  if (!meta) return;
  if (meta.version !== 1) throw new Error('Unsupported compact Diary metadata version');
  if (meta.quest) {
    if (!Array.isArray(meta.quest.jewel) || meta.quest.jewel.length !== 2 || !['might', 'arcana', 'fort', 'ward', 'shade', 'focus'].includes(meta.quest.jewel[0])
      || !Number.isInteger(meta.quest.jewel[1]) || meta.quest.jewel[1] < 1 || meta.quest.jewel[1] > 8) throw new Error('Invalid Diary quest reward');
    if (meta.quest.label) validateText(meta.quest.label);
    if (meta.quest.legacyLabel !== undefined && typeof meta.quest.legacyLabel !== 'string') throw new Error('Invalid legacy quest label');
  }
  if (meta.unlock && (typeof meta.unlock.boss !== 'boolean' || !Number.isInteger(meta.unlock.slot) || meta.unlock.slot < 2 || meta.unlock.slot > 6)) throw new Error('Invalid Diary unlock');
}
function validateEndEvents(entry: ExpeditionLog['entries'][number]): void {
  if (entry.gateText) validateText(entry.gateText);
  if (!entry.endEvents) return;
  if (!Array.isArray(entry.endEvents)) throw new Error('Invalid compact Diary end events');
  const effectTypes = ['deity-restoration', 'deity-attrition', 'first-aid', 'terrain-rejuvenation', 'terrain-abundant', 'terrain-rotwood', 'terrain-leakage', 'terrain-heatwave', 'terrain-decay'];
  for (const event of entry.endEvents) {
    if (!Array.isArray(event) || ![0, 1, 2, 3, 4].includes(event[0])) throw new Error('Invalid compact Diary end event');
    if (event[0] === 3 || event[0] === 4) { if (event.length !== 1) throw new Error('Invalid Diary return event'); continue; }
    if (!event[1] || typeof event[1] !== 'object') throw new Error('Invalid Diary end fact');
    if (event[0] === 2) { if (event.length > 3 || (event[2] !== undefined && !Number.isFinite(event[2]))) throw new Error('Invalid Diary reward fact'); continue; }
    if (event.length !== 2) throw new Error('Invalid Diary effect fact');
    if (event[0] === 0 && !effectTypes.includes(event[1].type)) throw new Error('Unknown Diary effect');
    for (const [key, value] of Object.entries(event[1])) {
      if (['actorName', 'targetName', 'type'].includes(key)) { if (typeof value !== 'string') throw new Error('Invalid Diary effect identity'); }
      else if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid Diary effect amount');
    }
  }
}
// Retained expedition bodies are immutable. Weak keys bound this cache to live
// history, avoiding a complete event validation/projection at every checkpoint.
const encodedHistory = new WeakMap<ExpeditionLog, ExpeditionLog>();

// SpecRef: 8.5 | UI_DIARY | Compact language-neutral records
export function mapCompactExpedition(log: ExpeditionLog, hydrate = false): ExpeditionLog {
  if (log.compactVersion === undefined) {
    if (log.actorTable || log.itemTable || log.entries?.some(entry => entry.compactBattle || entry.endEvents || entry.gateText)) throw new Error('Missing compact Diary version');
    return log;
  }
  if (log.compactVersion !== 1 || !Array.isArray(log.entries)) throw new Error('Unsupported compact Diary version');
  if (!hydrate) { const cached = encodedHistory.get(log); if (cached) return cached; }
  const itemTable: Item[] = [];
  const itemKeys = new Map<string, number>();
  const item = (value: Item): Item => {
    const ref = (value as unknown as { diaryItemRef?: number }).diaryItemRef;
    const resolved = ref === undefined ? value : log.itemTable?.[ref] as Item | undefined;
    if (!resolved || !Number.isInteger(resolved.id) || !Number.isInteger(resolved.enhancement) || !Number.isInteger(resolved.superRare)) throw new Error('Invalid compact Diary item reference');
    if (hydrate) return hydrateItem(resolved);
    const reduced = itemRef(resolved);
    const key = JSON.stringify(reduced);
    let index = itemKeys.get(key);
    if (index === undefined) { index = itemTable.length; itemKeys.set(key, index); itemTable.push(reduced); }
    return { diaryItemRef: index } as unknown as Item;
  };
  const actorTable: CompactBattleActor[] = [];
  const actorKeys = new Map<string, number>();
  const { actorTable: storedActors, itemTable: _storedItems, ...baseLog } = log;
  const entries = log.entries.map(entry => {
    let compactBattle = entry.compactBattle;
    if (compactBattle) {
      const { actorSet, ...facts } = compactBattle;
      const actors = actorSet === undefined ? facts.actors : Array.isArray(actorSet) ? actorSet.map(index => storedActors?.[index]) : undefined;
      if (!actors || actors.some(actor => !actor)) throw new Error('Invalid compact Diary actor table reference');
      const resolved = { ...facts, actors: actors as CompactBattleActor[] };
      decodeCompactBattleEvents(resolved);
      if (hydrate) compactBattle = resolved;
      else {
        const actorSet = (actors as CompactBattleActor[]).map(actor => {
          const key = JSON.stringify(actor);
          let index = actorKeys.get(key);
          if (index === undefined) { index = actorTable.length; actorKeys.set(key, index); actorTable.push(actor); }
          return index;
        });
        compactBattle = { ...facts, actors: [], actorSet };
      }
    }
    validateEndEvents(entry);
    const endEvents = entry.endEvents?.map(event => event[0] === 2
      ? (event[2] === undefined ? [2, hydrate ? itemRef(item(event[1] as Item)) : item(event[1] as Item)] : [2, hydrate ? itemRef(item(event[1] as Item)) : item(event[1] as Item), event[2]]) as typeof event : event);
    return { ...entry, ...(endEvents ? { endEvents } : {}), ...(compactBattle ? { compactBattle } : {}), ...(entry.rewardItems ? { rewardItems: entry.rewardItems.map(item) } : {}) };
  });
  const rewards = log.rewards.map(item);
  const autoSellItems = log.autoSellItems.map(row => row.item ? { ...row, item: hydrate ? itemRef(item(row.item as Item)) : item(row.item as Item) } : row);
  const result = { ...baseLog, ...(!hydrate && actorTable.length ? { actorTable } : {}), ...(!hydrate && itemTable.length ? { itemTable } : {}), rewards, autoSellItems, entries };
  if (!hydrate) { encodedHistory.set(log, result); encodedHistory.set(result, result); }
  return result;
}
export function mapCompactDiary(log: DiaryLog, hydrate = false): DiaryLog {
  validateMetadata(log);
  return { ...log, expeditionLog: mapCompactExpedition(log.expeditionLog, hydrate) };
}
export function mapCompactHistories(state: GameState, hydrate = false): GameState {
  const cache = new Map<ExpeditionLog, ExpeditionLog>();
  const mapLog = (log: ExpeditionLog): ExpeditionLog => {
    const previous = cache.get(log);
    if (previous) return previous;
    const next = mapCompactExpedition(log, hydrate);
    cache.set(log, next);
    return next;
  };
  const mapDiary = (log: DiaryLog): DiaryLog => {
    // Internal AFK retention placeholders intentionally contain no history body.
    const placeholder = (log as unknown as { __afkBaseDiaryIndex?: number }).__afkBaseDiaryIndex;
    if (!hydrate && Number.isInteger(placeholder) && placeholder! >= 0) return log;
    validateMetadata(log);
    return { ...log, expeditionLog: mapLog(log.expeditionLog) };
  };
  return {
    ...state,
    parties: state.parties.map(party => ({
      ...party,
      diaryLogs: (party.diaryLogs ?? []).map(mapDiary),
      ...(party.lastExpeditionLog ? { lastExpeditionLog: mapLog(party.lastExpeditionLog) } : {}),
      ...(party.pendingDiaryLog ? { pendingDiaryLog: mapDiary(party.pendingDiaryLog) } : {}),
    })),
  };
}
