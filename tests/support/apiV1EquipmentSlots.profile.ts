import assert from 'node:assert/strict';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { createFreshGameState, gameReducer } from '../../src/hooks/useGameState';
import type { GameState } from '../../src/types';

// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment
// Slot-addressed equipment commands must validate the whole request against one snapshot and report real effects.

function context(): ApiV1CommitContext {
  return {
    simulatedAt: 0, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: {},
    uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment: (state) => state, createDeliveryId: () => 'd', now: () => 0,
  };
}

const base = createFreshGameState('ja', Date.parse('2026-01-01T00:00:00.000Z'));
const characterId = base.parties[0].characters[0].id;
const path = (action: string) => `commit/build/character/${characterId}/${action}`;
const character = (state: GameState) => state.parties[0].characters.find((entry) => entry.id === characterId)!;

const filled = character(base).equipment.map((item, slot) => item ? slot : -1).filter((slot) => slot >= 0);
assert.ok(filled.length >= 2, 'fixture character has at least two equipped slots');
const armorSlot = filled.find((slot) => character(base).equipment[slot]!.category === 'armor');
assert.notEqual(armorSlot, undefined, 'fixture has an armor item');
const emptySlot = character(base).equipment.findIndex((item) => item === null);

// Seed jewels: fort (allowed for armor), might (not allowed for armor).
let seeded: GameState = { ...base, global: { ...base.global, jewels: { 'fort:3': 1, 'fort:4': 1, 'might:1': 1 } } };
const seededKeys = Object.keys(seeded.global.jewels);
assert.equal(seededKeys.length, 3);

function fails(state: GameState, action: string, parameters: Record<string, unknown>, marker: string): void {
  let message = '';
  try { applyApiV1Commit(path(action), state, parameters, context()); } catch (error) { message = String(error); }
  assert.ok(message.includes(marker), `${action} ${JSON.stringify(parameters)} expected ${marker}, got "${message}"`);
}

const armor = armorSlot as number;

// jewelAttach: shape errors.
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'fort' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'gem:3' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'fort:9' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: [armor, armor], jewelToSet: 'fort:3' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: [], jewelToSet: 'fort:3' }, 'invalid_request');
fails(seeded, 'jewelAttach', { targetEquipment: 99, jewelToSet: 'fort:3' }, 'invalid_request');
// jewelAttach: state errors.
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'might:1' }, 'illegal_action'); // incompatible category
fails(seeded, 'jewelAttach', { targetEquipment: armor, jewelToSet: 'fort:7' }, 'illegal_action'); // not owned
if (emptySlot >= 0) fails(seeded, 'jewelAttach', { targetEquipment: emptySlot, jewelToSet: 'fort:3' }, 'illegal_action');

// jewelAttach success consumes exactly one jewel and attaches it.
const attached = applyApiV1Commit(path('jewelAttach'), seeded, { targetEquipment: armor, jewelToSet: 'fort:3' }, context());
assert.deepEqual(character(attached.state).equipment[armor]!.jewel, { key: 'fort', rank: 3 });
assert.equal(attached.state.global.jewels['fort:3'], undefined, 'the attached jewel leaves the inventory');
assert.equal(seeded.global.jewels['fort:3'], 1, 'the input snapshot is untouched');

// Attaching the same jewel again is a no-op, NOT a silent removal.
const again = applyApiV1Commit(path('jewelAttach'), attached.state, { targetEquipment: armor, jewelToSet: 'fort:3' }, context());
assert.deepEqual(character(again.state).equipment[armor]!.jewel, { key: 'fort', rank: 3 });

// Replacing returns the previous jewel to the inventory.
const replaced = applyApiV1Commit(path('jewelAttach'), attached.state, { targetEquipment: armor, jewelToSet: 'fort:4' }, context());
assert.deepEqual(character(replaced.state).equipment[armor]!.jewel, { key: 'fort', rank: 4 });
assert.equal(replaced.state.global.jewels['fort:3'], 1);

// jewelRemove: really removes the attached jewel and returns it to the inventory (regression: it was a silent no-op).
const removed = applyApiV1Commit(path('jewelRemove'), attached.state, { targetEquipment: armor }, context());
assert.equal(character(removed.state).equipment[armor]!.jewel ?? null, null);
assert.equal(removed.state.global.jewels['fort:3'], 1);
// jewelRemove without an attached jewel, and atomically with one bad slot in a batch, are illegal.
fails(seeded, 'jewelRemove', { targetEquipment: armor }, 'illegal_action');
fails(attached.state, 'jewelRemove', { targetEquipment: [armor, filled.find((slot) => slot !== armor)!] }, 'illegal_action');
fails(attached.state, 'jewelRemove', { targetEquipment: [armor, armor] }, 'invalid_request');

// removeEquipment: real effect, atomic validation.
const other = filled.find((slot) => slot !== armor)!;
const unequipped = applyApiV1Commit(path('removeEquipment'), seeded, { targetEquipment: [armor, other] }, context());
assert.equal(character(unequipped.state).equipment[armor], null);
assert.equal(character(unequipped.state).equipment[other], null);
if (emptySlot >= 0) fails(seeded, 'removeEquipment', { targetEquipment: [armor, emptySlot] }, 'illegal_action');
fails(seeded, 'removeEquipment', { targetEquipment: [armor, armor] }, 'invalid_request');
fails(seeded, 'removeEquipment', { targetEquipment: -1 }, 'invalid_request');

// lock/unlock require FULL auto-equipment mode and a filled slot; already-desired state is a no-op.
const semi = gameReducer(seeded, { type: 'UPDATE_CHARACTER', partyIndex: 0, characterId, updates: { autoEquipmentMode: 1 } });
fails(semi, 'lockEquipment', { targetEquipment: armor }, 'illegal_action');
fails(semi, 'unlockEquipment', { targetEquipment: armor }, 'illegal_action');
const full = gameReducer(semi, { type: 'UPDATE_CHARACTER', partyIndex: 0, characterId, updates: { autoEquipmentMode: 2 } });
assert.equal(character(full).autoEquipmentMode, 2);
const locked = applyApiV1Commit(path('lockEquipment'), full, { targetEquipment: armor }, context());
assert.equal(character(locked.state).equipment[armor]!.isLocked, true);
const lockedAgain = applyApiV1Commit(path('lockEquipment'), locked.state, { targetEquipment: armor }, context());
assert.equal(character(lockedAgain.state).equipment[armor]!.isLocked, true);
const unlocked = applyApiV1Commit(path('unlockEquipment'), locked.state, { targetEquipment: armor }, context());
assert.equal(character(unlocked.state).equipment[armor]!.isLocked === true, false);
if (emptySlot >= 0) fails(full, 'lockEquipment', { targetEquipment: [armor, emptySlot] }, 'illegal_action');
seeded = full;

console.log('apiV1EquipmentSlots profile ok');
