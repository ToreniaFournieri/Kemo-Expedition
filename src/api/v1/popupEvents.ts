import { getItemRarityById } from '../../game/itemRarity';
import type { DiaryTrigger, GameState, Item, Party } from '../../types';
import { getVariantKey } from '../../types';
import { API_V1_SCHEMA_VERSION, API_V1_VERSION } from './contracts';
import { formatEquipmentChange, formatItem } from './itemFormat';

// SpecRef: 9.1.4.8 | Popup event stream | Durable, language-neutral event production

export type ApiV1PopupEventArg = string | number | boolean;

export interface ApiV1PopupEvent {
  apiVersion: typeof API_V1_VERSION;
  schemaVersion: typeof API_V1_SCHEMA_VERSION;
  revision: number;
  sequence: number;
  eventId: string;
  eventKey: string;
  args: Record<string, ApiV1PopupEventArg>;
  partyNumber: number | null;
  diaryEntryId: string | null;
  groupKey: string | null;
  createdAt: string;
}

export interface ApiV1PopupCandidate {
  eventKey: string;
  args: Record<string, ApiV1PopupEventArg>;
  partyNumber: number | null;
  diaryEntryId: string | null;
  /** `afk` is materialized with the committed revision and Party number. */
  groupKey: string | null;
}

const RETAIN_EVENT_COUNT = 256;
const RETAIN_EVENT_AGE_MS = 5 * 60 * 1_000;

/** Upgrades the pre-D3 prototype records and drops malformed control data instead of exposing it on the wire. */
export function normalizeApiV1PopupEvents(value: unknown): ApiV1PopupEvent[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): ApiV1PopupEvent[] => {
    if (!entry || typeof entry !== 'object') return [];
    const event = entry as Partial<ApiV1PopupEvent>;
    const args = event.args && typeof event.args === 'object' && !Array.isArray(event.args)
      ? Object.fromEntries(Object.entries(event.args).filter(([, arg]) => ['string', 'number', 'boolean'].includes(typeof arg))) as Record<string, ApiV1PopupEventArg>
      : null;
    if (!Number.isSafeInteger(event.revision) || Number(event.revision) < 0
      || !Number.isSafeInteger(event.sequence) || Number(event.sequence) < 1
      || typeof event.eventId !== 'string' || typeof event.eventKey !== 'string' || !args
      || (event.partyNumber !== null && (!Number.isSafeInteger(event.partyNumber) || Number(event.partyNumber) < 1 || Number(event.partyNumber) > 6))
      || (event.diaryEntryId !== null && typeof event.diaryEntryId !== 'string')
      || (event.groupKey !== null && typeof event.groupKey !== 'string')
      || typeof event.createdAt !== 'string' || !Number.isFinite(Date.parse(event.createdAt))) return [];
    return [{
      apiVersion: API_V1_VERSION,
      schemaVersion: API_V1_SCHEMA_VERSION,
      revision: Number(event.revision),
      sequence: Number(event.sequence),
      eventId: event.eventId,
      eventKey: event.eventKey,
      args,
      partyNumber: event.partyNumber === null ? null : Number(event.partyNumber),
      diaryEntryId: event.diaryEntryId,
      groupKey: event.groupKey,
      createdAt: event.createdAt,
    }];
  });
}

function statsDelta(before: Party, after: Party): Record<'Clear' | 'Return' | 'Draw' | 'Retreat' | 'Defeat' | 'donatedGold' | 'savedGold', number> {
  return {
    Clear: Math.max(0, after.expeditionStats.Clear - before.expeditionStats.Clear),
    Return: Math.max(0, after.expeditionStats.Return - before.expeditionStats.Return),
    Draw: Math.max(0, after.expeditionStats.Draw - before.expeditionStats.Draw),
    Retreat: Math.max(0, after.expeditionStats.Retreat - before.expeditionStats.Retreat),
    Defeat: Math.max(0, after.expeditionStats.Defeat - before.expeditionStats.Defeat),
    donatedGold: Math.max(0, after.expeditionStats.donatedGold - before.expeditionStats.donatedGold),
    savedGold: Math.max(0, after.expeditionStats.savedGold - before.expeditionStats.savedGold),
  };
}

function latestNewDiaryEntryId(before: Party, after: Party, trigger?: DiaryTrigger): string | null {
  const previousIds = new Set(before.diaryLogs.map((entry) => entry.id));
  return after.diaryLogs.find((entry) => !previousIds.has(entry.id) && (!trigger || entry.triggers.includes(trigger)))?.id ?? null;
}

function itemDropCandidates(party: Party, diaryEntryId: string | null, rewards: readonly Item[], state: GameState): ApiV1PopupCandidate[] {
  if (!party.diarySettings.notifyItemDropPopup) return [];
  return rewards.flatMap((item) => {
    // Spec 8.1.1 uses the final inventory count and suppresses the popup above 20.
    if ((state.global.inventory[getVariantKey(item)]?.count ?? 0) > 20) return [];
    return [{
      eventKey: 'popup.itemDrop',
      args: {
        partyName: party.name,
        item: formatItem(item, item.isLocked === true),
        rarity: getItemRarityById(item.id),
        isSuperRare: item.superRare > 0,
      },
      partyNumber: party.id,
      diaryEntryId,
      groupKey: null,
    }];
  });
}

function addedJewel(before: GameState, after: GameState): { jewelKey: string; jewelRank: number } | null {
  for (const [jewel, count] of Object.entries(after.global.jewels)) {
    if (count <= (before.global.jewels[jewel] ?? 0)) continue;
    const [jewelKey, rank] = jewel.split(':');
    return { jewelKey, jewelRank: Number(rank) };
  }
  return null;
}

function planAfkCandidates(before: GameState, after: GameState): ApiV1PopupCandidate[] {
  return after.parties.flatMap((party) => {
    const previous = before.parties.find((entry) => entry.id === party.id);
    if (!previous || !party.diarySettings.notifyCyclePopup) return [];
    const delta = statsDelta(previous, party);
    if (Object.values(delta).every((value) => value === 0)) return [];
    // Existing AFK presentation emits one Cycle summary per Party and suppresses per-Cycle, item, side-quest, and
    // automatic-equipment bursts. Diary detail remains independently durable in the game state.
    return [{
      eventKey: 'popup.afkSummary',
      args: { partyName: party.name, ...delta },
      partyNumber: party.id,
      diaryEntryId: null,
      groupKey: 'afk',
    }];
  });
}

/**
 * Derives the configured popup events from the transaction's immutable before/after snapshots. No localized prose or
 * random choice enters the durable buffer. `commit/progress/elapsed` deliberately follows the existing grouped AFK rule.
 */
export function planApiV1PopupCandidates(
  operation: string,
  before: GameState,
  after: GameState,
  outcomeData: Record<string, unknown>,
): ApiV1PopupCandidate[] {
  if (operation === 'commit/progress/elapsed') return planAfkCandidates(before, after);

  const events: ApiV1PopupCandidate[] = [];
  const sortie = operation.match(/^commit\/expedition\/(\d+)\/(sortie|godsBattle)$/);
  if (sortie) {
    const partyNumber = Number(sortie[1]);
    const previous = before.parties.find((entry) => entry.id === partyNumber);
    const party = after.parties.find((entry) => entry.id === partyNumber);
    if (previous && party) {
      const diaryEntryId = typeof outcomeData.diaryEntryId === 'string' ? outcomeData.diaryEntryId : null;
      if (party.diarySettings.notifyCyclePopup) {
        events.push({
          eventKey: 'popup.cycle.instantExpedition',
          args: {
            partyName: party.name,
            godsBattle: sortie[2] === 'godsBattle',
            stolenGold: Math.max(0, previous.pendingProfit),
          },
          partyNumber,
          diaryEntryId,
          groupKey: null,
        });
        if (party.level > previous.level) {
          events.push({
            eventKey: 'popup.cycle.levelUp',
            args: { partyName: party.name, previousLevel: previous.level, level: party.level },
            partyNumber,
            diaryEntryId,
            groupKey: null,
          });
        }
        for (const unlocked of after.parties.slice(before.parties.length)) {
          events.push({
            eventKey: 'popup.cycle.partyUnlocked',
            args: { partyName: unlocked.name },
            partyNumber: unlocked.id,
            diaryEntryId: latestNewDiaryEntryId(previous, party, 'unlock'),
            groupKey: null,
          });
        }
      }
      events.push(...itemDropCandidates(party, diaryEntryId, party.lastExpeditionLog?.rewards ?? [], after));
    }
  }

  // Keep the Side Quest producer transition-based so every API transaction that gains or ends a quest follows the
  // configured popup rule. A completion is identified by its durable Jewel award even when the Diary threshold omits it.
  for (const party of after.parties) {
    const previous = before.parties.find((entry) => entry.id === party.id);
    if (!previous || !party.diarySettings.notifySideQuestPopup) continue;
    if (!previous.sideQuest && party.sideQuest) {
      events.push({
        eventKey: 'popup.sideQuest.accepted',
        args: { partyName: party.name, questId: party.sideQuest.id, questType: party.sideQuest.type },
        partyNumber: party.id,
        diaryEntryId: null,
        groupKey: null,
      });
    } else if (previous.sideQuest && !party.sideQuest) {
      const completedEntryId = latestNewDiaryEntryId(previous, party, 'sideQuest');
      const reward = addedJewel(before, after);
      const cancelledByGodsBattle = sortie?.[2] === 'godsBattle' && Number(sortie[1]) === party.id;
      events.push({
        eventKey: cancelledByGodsBattle
          ? 'popup.sideQuest.cancelledByGodsBattle'
          : reward ? 'popup.sideQuest.completed' : 'popup.sideQuest.failed',
        args: {
          partyName: party.name,
          questId: previous.sideQuest.id,
          questType: previous.sideQuest.type,
          ...(reward ?? {}),
        },
        partyNumber: party.id,
        diaryEntryId: completedEntryId,
        groupKey: null,
      });
    }
  }

  const automaticEquipment = operation.match(/^commit\/build\/character\/(\d+)\/autoEquipment$/);
  if (automaticEquipment) {
    const characterId = Number(automaticEquipment[1]);
    const previousParty = before.parties.find((party) => party.characters.some((character) => character.id === characterId));
    const party = after.parties.find((entry) => entry.id === previousParty?.id);
    const previousCharacter = previousParty?.characters.find((character) => character.id === characterId);
    const character = party?.characters.find((entry) => entry.id === characterId);
    if (previousParty && party && previousCharacter && character && party.diarySettings.notifyAutoEquipmentPopup) {
      const slotCount = Math.max(previousCharacter.equipment.length, character.equipment.length);
      for (let slotIndex = 0; slotIndex < slotCount; slotIndex += 1) {
        const beforeItem = previousCharacter.equipment[slotIndex] ?? null;
        const afterItem = character.equipment[slotIndex] ?? null;
        const beforeFormat = formatEquipmentChange(slotIndex, beforeItem);
        const afterFormat = formatEquipmentChange(slotIndex, afterItem);
        if (beforeFormat === afterFormat || !afterItem) continue;
        events.push({
          eventKey: 'popup.autoEquipment',
          args: {
            partyName: party.name,
            characterId,
            characterName: character.name,
            slotIndex,
            before: beforeFormat,
            after: afterFormat,
          },
          partyNumber: party.id,
          diaryEntryId: null,
          groupKey: null,
        });
      }
    }
  }

  return events;
}

/** Allocates deterministic `revision:sequence` IDs, then enforces the count-or-age retention floor. */
export function appendApiV1PopupEvents(
  retained: readonly ApiV1PopupEvent[],
  candidates: readonly ApiV1PopupCandidate[],
  revision: number,
  createdAt: string,
): ApiV1PopupEvent[] {
  const normalizedRetained = normalizeApiV1PopupEvents(retained);
  if (candidates.length === 0) return normalizedRetained;
  const firstSequence = normalizedRetained.reduce((highest, event) => event.revision === revision ? Math.max(highest, event.sequence) : highest, 0) + 1;
  const appended = candidates.map((candidate, index): ApiV1PopupEvent => {
    const sequence = firstSequence + index;
    return {
      apiVersion: API_V1_VERSION,
      schemaVersion: API_V1_SCHEMA_VERSION,
      revision,
      sequence,
      eventId: `${revision}:${sequence}`,
      eventKey: candidate.eventKey,
      args: candidate.args,
      partyNumber: candidate.partyNumber,
      diaryEntryId: candidate.diaryEntryId,
      groupKey: candidate.groupKey === 'afk' ? `${revision}:afk:${candidate.partyNumber ?? 'all'}` : candidate.groupKey,
      createdAt,
    };
  });
  const combined = [...normalizedRetained, ...appended];
  const cutoff = Date.parse(createdAt) - RETAIN_EVENT_AGE_MS;
  const countFloor = Math.max(0, combined.length - RETAIN_EVENT_COUNT);
  return combined.filter((event, index) => index >= countFloor || Date.parse(event.createdAt) >= cutoff);
}
