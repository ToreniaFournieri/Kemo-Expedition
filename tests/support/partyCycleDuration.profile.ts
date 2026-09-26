import assert from 'node:assert/strict';
import { createFreshGameState } from '../../src/hooks/useGameState';
import { getPartyCycleDurationMs } from '../../src/game/partyCycleDuration';
import { getDeityStateDurationMultiplier } from '../../src/game/deity';
import type { ExpeditionLog, Party } from '../../src/types';

// SpecRef: 5.1.1 | Party State Machine | A catch-up Cycle costs every state's own Steps; each modifier lengthens only
// the state it names (Spec 5.1: catch-up resolves the Cycle's actual state transitions).
const STEP = 15_000;
const base = createFreshGameState('en', Date.UTC(2026, 8, 26)).parties[0];
const log = (rooms: number[], overrides: Partial<ExpeditionLog> = {}): ExpeditionLog => ({
  dungeonId: 1, entries: rooms.map((floor) => ({ floor, remainingPartyHP: 1_000, maxPartyHP: 1_000 })),
  rewards: [], autoSellProfit: 0, autoSellCount: 0, autoSellItems: [], remainingPartyHP: 1_000, maxPartyHP: 1_000,
  ...overrides,
} as unknown as ExpeditionLog);
const fullRun = Array.from({ length: 24 }, (_, room) => Math.floor(room / 4) + 1);
const party = (overrides: Partial<Party> = {}): Party => ({
  ...base, deity: { ...base.deity, name: 'None' }, deityGold: 0, condition: 0, selectedDungeonId: 1,
  lastExpeditionLog: log(fullRun), ...overrides,
});
const cycle = (overrides: Partial<Party> = {}) => getPartyCycleDurationMs(party(overrides), 1);

// A full-HP, nothing-to-sell Cycle at Expedition 1: rest 1, free action 40, sound sleep 16 x 1/12 (rounded up to the
// millisecond), pray 4, move 2, explore 24, return 6 Steps.
const plain = cycle();
assert.equal(plain, (1 + 40 + 4 + 2 + 24 + 6) * STEP + Math.ceil(16 / 12 * STEP));

// Rest heals max(200, 2% MaxHP) per Step from the HP the last expedition returned with; God of Fortification doubles it.
const wounded = log(fullRun, { remainingPartyHP: 0, maxPartyHP: 50_000 });
assert.equal(cycle({ lastExpeditionLog: wounded }) - plain, 49 * STEP, '50 rest Steps instead of 1');
assert.equal(cycle({ lastExpeditionLog: wounded, deity: { ...base.deity, name: 'God of Fortification' } }) - cycle({ lastExpeditionLog: wounded }), 50 * STEP);

// Selling costs one Step per auto-sell item (God of Dusk doubles it) and is skipped when nothing came back.
const loot = log(fullRun, { autoSellProfit: 90, autoSellCount: 3, autoSellItems: [{}, {}, {}] as ExpeditionLog['autoSellItems'] });
assert.equal(cycle({ lastExpeditionLog: loot }) - plain, 3 * STEP);
assert.equal(cycle({ lastExpeditionLog: loot, deity: { ...base.deity, name: 'God of Dusk' } }) - plain, 6 * STEP);

// Every other deity lengthens only its own state.
assert.equal(cycle({ deity: { ...base.deity, name: 'Goddess of Fertility' } }) - plain, 8 * STEP, 'free action x1.2');
assert.equal(cycle({ deity: { ...base.deity, name: 'Goddess of Restoration' } }) - plain, Math.ceil(32 / 12 * STEP) - Math.ceil(16 / 12 * STEP), 'sound sleep x2');
const fate = getDeityStateDurationMultiplier('God of Fate', 0, 'pray');
assert.equal(cycle({ deity: { ...base.deity, name: 'God of Fate' } }) - plain, Math.ceil(4 * STEP * fate) - 4 * STEP, 'pray x1.5-2 by rank');
assert.equal(cycle({ deity: { ...base.deity, name: 'Goddess of Precision' } }) - plain, Math.ceil(24 * 1.2 * STEP) - 24 * STEP, 'explore x1.2 only');

// Condition changes free action: 40 + round(condition / 10) Steps.
assert.equal(cycle({ condition: 200 }) - plain, 20 * STEP);

// Exploring costs the rooms actually explored: a run that ended in room 5 costs 5 Steps.
assert.equal(plain - cycle({ lastExpeditionLog: log([1, 1, 1, 1, 2], { finalOutcome: 'Defeat' }) }), 19 * STEP);

// Chill and looping-path floors double only their own rooms' Steps (Expedition 2: floors 1 and 4 are chill).
const exp2 = (rooms: number[]) => cycle({ selectedDungeonId: 2, lastExpeditionLog: log(rooms, { dungeonId: 2 }) });
assert.equal(exp2(fullRun) - exp2([2, 2, 2, 2, 3, 3, 3, 3, 5, 5, 5, 5, 6, 6, 6, 6, 2, 2, 2, 2, 3, 3, 3, 3]), 8 * STEP, 'eight chill rooms double');

console.log('partyCycleDuration profile ok');
