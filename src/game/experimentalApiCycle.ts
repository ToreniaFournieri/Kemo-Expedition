import { getRestHealPerStep } from './restHealing';
import type { GameState, Party } from '../types';
import type { GameAction } from '../hooks/useGameState';
import type { ExperimentalPartyCycle } from './experimentalApi';
import { outcomeFromParty } from './experimentalApi';
import type { RuntimeGameMode } from './runtimeGameMode';
import { computePartyStats } from './partyComputation';
import { getDeityStateDurationMultiplier, normalizeDeityName } from './deity';
import { getPeddlerTravelDurationMs } from './expeditionAbilityPolicies';
import { BASE_STEP_DURATION_MS } from './progressTiming';
import { getFreeActionStepCount } from './partyStateDuration';
import { DUNGEONS } from '../data/dungeons';
import { getBossGateKey, getEliteGateKey, isClearGateUnlocked, isGodsBattleAvailable } from './clearGate';
import { getItemRarityById } from '../components/home/homeShared';
import { requireApi } from './experimentalApiSession';

export type CycleDependencies = {
  reduce: (state: GameState, action: GameAction) => GameState;
  equip: (state: GameState, partyIndex: number) => GameState;
  ability: (party: Party, id: string) => number;
  freeSpend: (party: Party, profit: number) => number;
  prayer: (party: Party, profit: number) => { donation: number; deposit: number; embezzled: number };
  hasGate: (party: Party) => boolean;
};
const zeroRarity = () => ({ common: 0, uncommon: 0, eliteRare: 0, bossRare: 0, mythicRare: 0 });
const questCounts = () => ({ assigned: 0, completed: 0, cancelled: 0, expired: 0 });
function jewels(state: GameState) {
  return Object.values(state.global.jewels).reduce((a, b) => a + b, 0) + state.parties.reduce((a, p) => a + p.characters.reduce((a, c) => a + c.equipment.filter(i => i?.jewel).length, 0), 0);
}
// SpecRef: 9.1.3 | Experimental AI API | API batch sortie progression
export function resolveApiCycles(input: GameState, partyIndex: number, count: number, now: number, mode: RuntimeGameMode, offset: number, deps: CycleDependencies, partial?: ExperimentalPartyCycle, scale = 1) {
  let state = input;
  let elapsed = 0;
  const dungeonId = state.parties[partyIndex].selectedDungeonId;
  const charge = { stock: state.parties[partyIndex].instantExpeditionStock, chargeStartedAt: state.parties[partyIndex].instantExpeditionChargeStartedAt };
  const current = () => state.parties[partyIndex];
  let events: string[] = [];
  const apply = (action: GameAction) => {
    const before = current().sideQuest;
    state = deps.reduce(state, action);
    const after = current().sideQuest;
    if (!before && after) events.push('assigned');
    if (before && !after) events.push(action.type === 'CANCEL_SIDE_QUEST' ? 'expired' : 'completed');
  };
  const advanceQuest = (type: string, amount: number) => {
    if (current().sideQuest?.type === type && amount > 0) apply({ type: 'ADVANCE_SIDE_QUEST', partyIndex, amount, simulatedAt: now + elapsed });
  };
  const duration = (phase: string) => {
    const p = current();
    let steps = 1;
    if (phase === 'move' || phase === 'return') {
      steps = dungeonId === 99 ? 1 : (phase === 'move' ? 1 : 5) + dungeonId;
      return getPeddlerTravelDurationMs(steps * BASE_STEP_DURATION_MS * scale, deps.ability(p, 'peddler'));
    }
    if (phase === 'free_action') steps = getFreeActionStepCount(p.condition);
    if (phase === 'sell') steps = Math.max(1, p.lastExpeditionLog?.autoSellItems?.length || p.lastExpeditionLog?.autoSellCount || 1);
    if (phase === 'sound_sleep') steps = 16;
    if (phase === 'pray') steps = 4;
    if (phase === 'explore') {
      const floors = DUNGEONS.find(d => d.id === dungeonId)?.floors ?? [];
      steps = Math.max(1, p.lastExpeditionLog?.entries.reduce((n, room) => {
        const terrain = floors.find(f => f.floorNumber === room.floor)?.terrainEffect;
        return n + (terrain === 'terrain.chill' || terrain === 'terrain.looping-path' ? 2 : 1);
      }, 0) ?? 1);
    }
    const deityGold = state.global.deityDonations[normalizeDeityName(p.deity.name)] ?? p.deityGold ?? 0;
    return Math.max(100, Math.ceil(steps * BASE_STEP_DURATION_MS * scale * getDeityStateDurationMultiplier(p.deity.name, deityGold, phase as 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray' | 'explore')));
  };
  const wait = (phase: string, remaining?: number) => {
    const ms = remaining ?? duration(phase);
    const quest = current().sideQuest;
    const deadline = quest ? quest.assignedAt + (quest.expiresAt - quest.assignedAt) * scale : Infinity;
    const usable = Math.max(0, Math.min(ms, deadline - (now + elapsed)));
    elapsed += usable;
    if (phase === 'rest') advanceQuest('q.healing', usable / scale / 1000);
    if (phase === 'move' || phase === 'return') advanceQuest('q.exercise', usable / scale / 1000);
    elapsed += ms - usable;
    if (current().sideQuest && now + elapsed >= deadline) apply({ type: 'CANCEL_SIDE_QUEST', partyIndex });
  };
  const rest = (firstRemaining?: number) => {
    let first = true;
    do {
      wait('rest', first ? firstRemaining : undefined); first = false;
      const maximum = computePartyStats(current()).partyStats.hp;
      apply({ type: 'HEAL_PARTY_HP', partyIndex, amount: getRestHealPerStep(maximum) });
    } while (current().currentHp < computePartyStats(current()).partyStats.hp);
  };
  let goldDonated = 0, goldSaved = 0;
  const runFrom = (start: string, remaining?: number) => {
    let phase = start;
    for (let guard = 0; guard < 20; guard++) {
      if (phase === 'rest' || phase === 'idle') {
        rest(remaining); remaining = undefined;
        phase = (current().lastExpeditionLog?.rewards.length || current().lastExpeditionLog?.autoSellProfit) ? 'sell' : 'free_action';
        continue;
      }
      wait(phase, remaining); remaining = undefined;
      if (phase === 'sell') phase = 'free_action';
      else if (phase === 'free_action') {
        const spend = deps.freeSpend(current(), current().pendingProfit ?? 0);
        apply({ type: 'SPEND_PENDING_PROFIT', partyIndex, amount: spend }); advanceQuest('q.squander', spend);
        phase = current().currentSleepiness === 2 ? 'sound_sleep' : 'pray';
        if (phase === 'pray') state = deps.equip(state, partyIndex);
      } else if (phase === 'sound_sleep') {
        advanceQuest('q.sleeping', 1); state = deps.equip(state, partyIndex); phase = 'pray';
      } else if (phase === 'pray') {
        const profit = deps.prayer(current(), current().pendingProfit ?? 0);
        apply({ type: 'PROCESS_PENDING_PROFIT', partyIndex, donation: profit.donation, deposit: profit.deposit });
        goldDonated += profit.donation; goldSaved += profit.deposit;
        advanceQuest('q.donation', profit.donation); advanceQuest('q.savings', profit.deposit); advanceQuest('q.embezzlement', profit.embezzled);
        // Equipment or deity changes can raise maximum HP before departure.
        if (current().currentHp < computePartyStats(current()).partyStats.hp) rest();
        phase = 'move';
      } else if (phase === 'move') {
        apply({ type: 'RUN_EXPEDITION', partyIndex, simulatedAt: now + elapsed, gameMode: mode, enemyLevelOffset: offset, triggerGodsBattle: false });
        phase = 'explore';
      } else if (phase === 'explore') {
        apply({ type: 'FINALIZE_DIARY_LOG', partyIndex, simulatedAt: now + elapsed }); phase = 'return';
      } else if (phase === 'return') {
        if (!current().sideQuest && !deps.hasGate(current())) apply({ type: 'ROLL_SIDE_QUEST', partyIndex, rolledTier: dungeonId, simulatedAt: now + elapsed });
        apply({ type: 'ROLL_PARTY_SLEEPINESS', partyIndex }); rest(); return;
      } else throw new Error('invalid_cycle_state');
    }
    throw new Error('cycle_did_not_finish');
  };
  const summary = (before: GameState, start: number, donated: number, saved: number, index: number) => {
    const p = current(); const log = p.lastExpeditionLog;
    const itemsByRarity = zeroRarity();
    for (const item of log?.rewards ?? []) itemsByRarity[getItemRarityById(item.id)] += 1;
    const bossDungeonIds = Object.keys(p.defeatedBossExpeditions).map(Number).filter(id => p.defeatedBossExpeditions[id] && !before.parties[partyIndex].defeatedBossExpeditions[id]);
    const godBattleDungeonIds = DUNGEONS.filter(d => isGodsBattleAvailable(p, d.id) && !isGodsBattleAvailable(before.parties[partyIndex], d.id)).map(d => d.id);
    const partyIds = state.parties.filter(p => !before.parties.some(old => old.id === p.id)).map(p => p.id);
    const gateIds = [...Array.from({ length: 5 }, (_, n) => getEliteGateKey(dungeonId, n + 1)), getBossGateKey(dungeonId)].filter(g => isClearGateUnlocked(p, g) && !isClearGateUnlocked(before.parties[partyIndex], g));
    return { index, dungeonId, partyElapsedStartMs: start, partyElapsedEndMs: elapsed, outcome: outcomeFromParty(p),
      completedRooms: log?.completedRooms ?? 0, totalRooms: log?.totalRooms ?? 0, latestDisclosedFloor: log?.entries.at(-1)?.floor ?? null,
      experienceGained: log?.totalExperience ?? 0, goldGained: state.global.gold - before.global.gold,
      goldDonated: donated, goldSaved: saved, itemsObtained: log?.rewards.length ?? 0, itemsByRarity,
      autoSoldItems: log?.autoSellCount ?? 0, autoSellGold: log?.autoSellProfit ?? 0,
      jewelsGained: Math.max(0, jewels(state) - jewels(before)), pranaGained: state.global.prana - before.global.prana,
      sideQuestEvents: [...events], bossDungeonIds, godBattleDungeonIds, partyIds,
      unlockedIds: [...bossDungeonIds.map(id => `boss:${id}`), ...godBattleDungeonIds.map(id => `godBattle:${id}`), ...partyIds.map(id => `party:${id}`), ...gateIds.map(id => `clearGate:${id}`)],
      endingHp: { current: p.currentHp, maximum: computePartyStats(p).partyStats.hp } };
  };
  let prelude = null;
  // Settling a frozen partial Cycle is separate from the requested attempts.
  if (partial && partial.state !== 'idle' && !(partial.state === 'rest' && partial.stateStartedAt >= now)) {
    const before = state;
    const remainder = Math.max(0, partial.durationMs - Math.max(0, now - partial.stateStartedAt));
    if (partial.state === 'rest') rest(remainder);
    else runFrom(partial.state, remainder);
    prelude = { ...summary(before, 0, goldDonated, goldSaved, 0), startingState: partial.state, completedExistingGodsBattle: partial.isCurrentExpeditionGodsBattle === true, ...(partial.state === 'rest' ? { outcome: null, experienceGained: 0, itemsObtained: 0, itemsByRarity: zeroRarity(), autoSoldItems: 0, autoSellGold: 0 } : {}) };
  }
  const runs = [];
  let firstWinningSortie: number | undefined;
  for (let i = 0; i < count; i++) {
    const before = state; const start = elapsed; events = []; goldDonated = 0; goldSaved = 0;
    runFrom('rest');
    if (!before.parties[partyIndex].defeatedBossExpeditions[1] && current().defeatedBossExpeditions[1]) firstWinningSortie ??= i + 1;
    runs.push(summary(before, start, goldDonated, goldSaved, i + 1));
  }
  // Re-anchor selected-party deadlines to the frozen global clock.
  const p = current();
  state = { ...state, parties: state.parties.map((v, i) => i !== partyIndex ? v : { ...p,
    instantExpeditionStock: charge.stock, instantExpeditionChargeStartedAt: charge.chargeStartedAt,
    sideQuest: p.sideQuest ? { ...p.sideQuest, assignedAt: p.sideQuest.assignedAt - elapsed, expiresAt: p.sideQuest.expiresAt - elapsed } : null,
  }) };
  const outcomes = { Clear: 0, Turned_Back: 0, Draw_Retreat: 0, Wounded_Retreat: 0, Defeat: 0 };
  const totals = { experienceGained: 0, goldGained: 0, goldDonated: 0, goldSaved: 0, itemsObtained: 0, itemsByRarity: zeroRarity(), autoSoldItems: 0, autoSellGold: 0, jewelsGained: 0, pranaGained: 0 };
  const sideQuests = questCounts();
  for (const run of runs) {
    outcomes[run.outcome]++;
    for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
      if (key === 'itemsByRarity') for (const rarity of Object.keys(totals.itemsByRarity) as Array<keyof typeof totals.itemsByRarity>) totals.itemsByRarity[rarity] += run.itemsByRarity[rarity];
      else totals[key] += run[key];
    }
    for (const event of run.sideQuestEvents) sideQuests[event as keyof typeof sideQuests]++;
  }
  requireApi(runs.length === count, 'sortie_failed', 'The batch did not complete.', 500);
  const unique = (values: number[]) => [...new Set(values)];
  return { state, firstWinningSortie, response: {
    sortie: { partyId: p.id, dungeonId, requestedCount: count, completedCount: runs.length, previousRevision: input.apiRuntime?.revision ?? 0, revision: (input.apiRuntime?.revision ?? 0) + 1, partyElapsedStartMs: 0, partyElapsedEndMs: elapsed },
    prelude, runs, outcomes, totals, sideQuests, charge: { before: charge, after: charge },
    unlocks: { bossDungeonIds: unique(runs.flatMap(r => r.bossDungeonIds)), godBattleDungeonIds: unique(runs.flatMap(r => r.godBattleDungeonIds)), partyIds: unique(runs.flatMap(r => r.partyIds)), deityIds: [], otherIds: runs.flatMap(r => r.unlockedIds.filter(id => id.startsWith('clearGate:'))) },
  } };
}
