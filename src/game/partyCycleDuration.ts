import { DUNGEONS } from '../data/dungeons';
import type { Party } from '../types';
import { getDeityStateDurationMultiplier, normalizeDeityName } from './deity';
import { getPeddlerTravelDurationMs } from './expeditionAbilityPolicies';
import { computePartyStats } from './partyComputation';
import { getFreeActionStepCount } from './partyStateDuration';
import { EXPLORING_PROGRESS_TOTAL_STEPS, getAutoSellStepCount } from './partyStateProgress';
import { BASE_STEP_DURATION_MS } from './progressTiming';
import { getRestInitialTotalSteps } from './restHealing';

// SpecRef: 5.1.1 | Party State Machine | Step Progress behavior by state
// The length of one full Cycle (`state.rest` through `state.return`) as the online state machine would run it, used to
// charge AFK catch-up time. Every state keeps its own duration and modifiers, so a deity or terrain lengthens only the
// state it affects. A Cycle's rooms, rewards, and HP are unknown until it runs, so they come from the party's last
// expedition (the Cycle a catch-up Chunk continues from).

const SOUND_SLEEP_STEP_COUNT = 16;
const PRAY_STEP_COUNT = 4;
const COLOSSEUM_DUNGEON_ID = 99;
/** `t.sleepiness_of_party_bag` holds 12 tickets, one of them sound sleep: a Cycle sleeps soundly 1 time in 12. */
const SOUND_SLEEP_SHARE = 1 / 12;

type DurationState = 'rest' | 'sell' | 'free_action' | 'sound_sleep' | 'pray' | 'explore';

export interface PartyCycleDurationOptions {
  /** Global donations by normalized deity name (God of Fate's rank); falls back to the party's own `deityGold`. */
  deityDonations?: Record<string, number>;
}

const peddlerLevelByParty = new WeakMap<Party, number>();

function getPartyPeddlerLevel(party: Party): number {
  const cached = peddlerLevelByParty.get(party);
  if (cached !== undefined) return cached;
  const level = computePartyStats(party).characterStats.reduce((best, stats) => Math.max(
    best,
    stats.abilities.reduce((max, ability) => ability.id === 'peddler' ? Math.max(max, ability.level) : max, 0),
  ), 0);
  peddlerLevelByParty.set(party, level);
  return level;
}

// SpecRef: 5.1.1 | Duration modifier | state.explore: `terrain.chill` and `terrain.looping-path` double a room's Step.
function getExploreTerrainDurationMultiplier(party: Party): number {
  const dungeon = DUNGEONS.find((entry) => entry.id === party.selectedDungeonId);
  if (!dungeon) return 1;
  const roomMultiplier = (terrainEffect?: string): number => (
    terrainEffect === 'terrain.chill' || terrainEffect === 'terrain.looping-path' ? 2 : 1
  );
  const floorByNumber = new Map(dungeon.floors.map((floor) => [floor.floorNumber, floor]));
  const loggedRooms = party.lastExpeditionLog?.dungeonId === dungeon.id ? party.lastExpeditionLog.entries : [];
  if (loggedRooms.length > 0) {
    return loggedRooms.reduce((total, room) => total + roomMultiplier(floorByNumber.get(room.floor ?? 0)?.terrainEffect), 0) / loggedRooms.length;
  }
  const total = dungeon.floors.reduce((sum, floor) => sum + (4 * roomMultiplier(floor.terrainEffect)), 0);
  const rooms = dungeon.floors.length * 4;
  return rooms > 0 ? total / rooms : 1;
}

/** One Cycle's duration in milliseconds, at `durationScale` (the Step-speed scale of the running environment). */
export function getPartyCycleDurationMs(party: Party, durationScale: number, options: PartyCycleDurationOptions = {}): number {
  const scale = Math.max(0.001, durationScale);
  const deityGold = options.deityDonations?.[normalizeDeityName(party.deity.name)] ?? party.deityGold ?? 0;
  const deity = (state: DurationState) => getDeityStateDurationMultiplier(party.deity.name, deityGold, state);
  const stepsMs = (steps: number, multiplier = 1) => steps > 0 ? Math.max(100, Math.ceil(steps * BASE_STEP_DURATION_MS * scale * multiplier)) : 0;
  const log = party.lastExpeditionLog;

  // state.rest: heal max(200, 2% MaxHP) per Step until full, from the HP the last expedition returned with.
  const restSteps = log ? getRestInitialTotalSteps(log.remainingPartyHP, log.maxPartyHP) : 1;
  // state.sell: one Step per auto-sell item, skipped when the expedition brought back nothing.
  const sells = log != null && (log.rewards.length > 0 || log.autoSellProfit > 0);
  // state.move / state.return: (1 + x.exp_tier) and (5 + x.exp_tier) Steps, one Step each at the Colosseum.
  const isColosseum = party.selectedDungeonId === COLOSSEUM_DUNGEON_ID;
  const peddlerLevel = getPartyPeddlerLevel(party);
  const travelMs = (steps: number) => getPeddlerTravelDurationMs(steps * BASE_STEP_DURATION_MS * scale, peddlerLevel);
  const tier = Math.max(0, party.selectedDungeonId);
  // state.explore: one Step per room actually explored (a defeat or retreat ends it early), 24 without a log.
  const exploredRooms = Math.max(1, Math.min(EXPLORING_PROGRESS_TOTAL_STEPS, log?.entries.length || EXPLORING_PROGRESS_TOTAL_STEPS));

  const durationMs = (restSteps * stepsMs(1, deity('rest')))
    + (sells ? stepsMs(getAutoSellStepCount(party), deity('sell')) : 0)
    + stepsMs(getFreeActionStepCount(party.condition), deity('free_action'))
    + stepsMs(SOUND_SLEEP_STEP_COUNT * SOUND_SLEEP_SHARE, deity('sound_sleep'))
    + stepsMs(PRAY_STEP_COUNT, deity('pray'))
    + (isColosseum ? travelMs(1) * 2 : travelMs(1 + tier) + travelMs(5 + tier))
    + stepsMs(exploredRooms, deity('explore') * getExploreTerrainDurationMultiplier(party));
  return Math.max(1, Math.ceil(durationMs));
}
