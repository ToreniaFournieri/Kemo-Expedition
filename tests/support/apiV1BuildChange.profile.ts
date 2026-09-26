import assert from 'node:assert/strict';
import { ENEMIES } from '../../src/data/enemies';
import { executeApiV1CommitTransaction, type ApiV1CommitAuthorityDependencies, type ApiV1CommitAuthorityInput, type ApiV1ControlMetadata } from '../../src/api/v1/authority';
import { planCharacterBuildChange } from '../../src/api/v1/buildChange';
import { characterEditToChangeBuildParameters } from '../../src/api/v1/characterBuildParameters';
import { applyApiV1Commit, type ApiV1CommitContext } from '../../src/api/v1/commitOperations';
import { buildApiV1ReadData } from '../../src/api/v1/readModels';
import { createFreshGameState, gameReducer } from '../../src/hooks/useGameState';
import type { GameState } from '../../src/types';

// SpecRef: 8.2.3 | Character Edit Mode (selected member) | Character edit validation and equipment warnings
// SpecRef: 9.1.4.9 | Operation-specific completion rules | Party build and equipment

const now = Date.parse('2026-01-01T00:00:00.000Z');
const base = createFreshGameState('ja', now);
const characterId = base.parties[0].characters[1].id;
const uniqueCharacterId = base.parties[0].characters[0].id;
const path = (id: number, action: string) => `commit/build/character/${id}/${action}`;
const character = (state: GameState, id = characterId) => state.parties[0].characters.find((entry) => entry.id === id)!;

function context(applyAutoEquipment: ApiV1CommitContext['applyAutoEquipment'] = (state) => state): ApiV1CommitContext {
  return { simulatedAt: now, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: {}, uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment, createDeliveryId: () => 'd', now: () => now };
}
// `simulation` is required by the contract; these helpers add it so each case reads as the change it exercises.
const change = (state: GameState, id: number, parameters: Record<string, unknown>, extra: Record<string, unknown> = { simulation: false }) =>
  applyApiV1Commit(path(id, 'changeBuild'), state, { ...parameters, ...extra }, context());
function fails(state: GameState, id: number, parameters: Record<string, unknown>, marker: string, extra: Record<string, unknown> = { simulation: false }): void {
  let message = '';
  try { change(state, id, parameters, extra); } catch (error) { message = String(error); }
  assert.ok(message.includes(marker), `${JSON.stringify(parameters)} expected ${marker}, got ${message}`);
}

// Strict IDs and UI-owned immutable/duplicate rules are enforced for trusted in-process callers too.
fails(base, characterId, { mainClassId: 'unknown' }, 'invalid_request');
fails(base, characterId, { lineage: 'unascertained' }, 'invalid_request');
fails(base, uniqueCharacterId, { name: 'renamed unique' }, 'illegal_action');
// Spec 8.2.3: names are up to 20 characters.
fails(base, characterId, { name: 'x'.repeat(21) }, 'invalid_request');
assert.equal(character(change(base, characterId, { name: 'x'.repeat(20) }).state).name, 'x'.repeat(20));
fails(base, base.parties[0].characters[2].id, { racesAndGender: 'vulpinian/female' }, 'illegal_action');
fails(base, characterId, { racesAndGender: 'mimorian/male/1' }, 'illegal_action');
fails(base, characterId, { racesAndGender: 'mimorian/female/999999' }, 'illegal_action');

// The combined stable race/gender key is applied, including a validated, unlocked Mimorian form.
{
  const changed = change(base, characterId, { racesAndGender: 'murid/male' });
  assert.equal(character(changed.state).raceId, 'murid');
  assert.equal(character(changed.state).gender, 'male');
  const enemyId = ENEMIES[0].id;
  const unlocked: GameState = { ...base, global: { ...base.global, unlockedMimorianEnemyIds: [enemyId] } };
  const mimorian = change(unlocked, characterId, { racesAndGender: `mimorian/female/${enemyId}` });
  assert.equal(character(mimorian.state).raceId, 'mimorian');
  assert.equal(character(mimorian.state).gender, 'female');
  assert.equal(character(mimorian.state).mimorianEnemyId, enemyId);
}

// Switching this melee character to support-only classes invalidates equipped melee gear and needs confirmation.
const riskyParameters = { mainClassId: 'guardian', subClassId: 'guardian' };
const riskyPlan = planCharacterBuildChange(base, characterId, riskyParameters);
assert.equal(riskyPlan.requiresConfirmation, true);
assert.ok(riskyPlan.invalidEquipment > 0 || riskyPlan.equipmentSlotsRemoved > 0);

function control(): ApiV1ControlMetadata { return { revisionHighWater: 0, inGameTime: now, receipts: [], tombstones: [], confirmations: [], popupEvents: [], deliveries: [] }; }
function dependencies(): ApiV1CommitAuthorityDependencies {
  return { gameMode: 'mode.normal', enemyLevelOffset: 0, cycleDurationScale: 1, applyAutoEquipment: (state) => state, persist: async () => undefined, publish: async () => undefined, createOpaqueId: () => 'build-confirmation-token', createRandomSeed: () => 1, now: () => now };
}
function request(parameters: Record<string, unknown>, overrides: Partial<ApiV1CommitAuthorityInput> = {}): ApiV1CommitAuthorityInput {
  return { operation: path(characterId, 'changeBuild'), expectedRevision: 0, idempotencyKey: 'change-build-key-001', requestId: 'build', parameters, uploadedFiles: {}, state: base, simulatedAt: now, control: control(), ...overrides };
}

// The contract's own confirmation protocol (Spec 9.1.3, 3-3-2): `simulation` reports without committing, and a change
// that needs confirmation applies only with `confirmation: yes`. The generic 9.1.4.5 challenge is never issued.
{
  const simulated = change(base, characterId, riskyParameters, { simulation: true });
  assert.equal(simulated.data.confirmationRequired, true);
  assert.equal(simulated.data.applied, false);
  const warnings = simulated.data.warnings as { key: string; args: Record<string, number> }[];
  assert.ok(warnings.length > 0);
  assert.ok(warnings.every((warning) => warning.key.startsWith('api.warning.changeBuild.')));
  assert.equal(warnings.some((warning) => warning.key === 'api.warning.changeBuild.meleeAptitudeRemoved' && warning.args.items > 0), true, 'the lost melee aptitude is named with its item count');
  assert.deepEqual(simulated.state, base, 'a simulation never changes the state');

  const missing = await executeApiV1CommitTransaction(request({ ...riskyParameters, simulation: false }), dependencies());
  assert.equal(missing.ok, false);
  if (missing.ok) throw new Error('expected a rejection');
  assert.equal(missing.error.code, 'invalid_request', 'a required confirmation that is missing is a request error, not a generic challenge');

  const cancelled = await executeApiV1CommitTransaction(request({ ...riskyParameters, simulation: false, confirmation: 'no' }, { idempotencyKey: 'change-build-no-0001' }), dependencies());
  assert.equal(cancelled.ok, true);
  if (!cancelled.ok) throw new Error(cancelled.error.code);
  assert.equal(cancelled.response.revision, 0, 'a cancelled change does not advance the revision');
  assert.equal(cancelled.stateChanged, false);
  assert.equal((cancelled.response.data as { applied: boolean }).applied, false);

  const confirmed = await executeApiV1CommitTransaction(request({ ...riskyParameters, simulation: false, confirmation: 'yes' }, { idempotencyKey: 'change-build-yes-001' }), dependencies());
  assert.equal(confirmed.ok, true);
  if (!confirmed.ok) throw new Error(confirmed.error.code);
  assert.equal(character(confirmed.state).mainClassId, 'guardian');
  assert.equal(character(confirmed.state).subClassId, 'guardian');
  assert.equal(confirmed.response.revision, 1);
  assert.equal((confirmed.response.data as { applied: boolean; confirmationRequired: boolean }).applied, true);
  assert.equal(character(confirmed.state).equipment.filter(Boolean).length < character(base).equipment.filter(Boolean).length, true);

  // Simulating through the authority is a valid no-op: no revision, no state change.
  const simulatedTransaction = await executeApiV1CommitTransaction(request({ ...riskyParameters, simulation: true }, { idempotencyKey: 'change-build-sim-001' }), dependencies());
  assert.equal(simulatedTransaction.ok, true);
  if (!simulatedTransaction.ok) throw new Error(simulatedTransaction.error.code);
  assert.equal(simulatedTransaction.response.revision, 0);
  assert.equal(simulatedTransaction.stateChanged, false);
}

// Request validation of the two control parameters.
fails(base, characterId, riskyParameters, 'invalid_request', {});
fails(base, characterId, riskyParameters, 'invalid_request', { simulation: 'false' });
fails(base, characterId, riskyParameters, 'invalid_request', { simulation: false });
fails(base, characterId, riskyParameters, 'invalid_request', { simulation: false, confirmation: 'maybe' });
fails(base, characterId, riskyParameters, 'invalid_request', { simulation: true, confirmation: 'yes' });
// A change that needs no confirmation applies without one, reports no warnings, and `no` still cancels it.
{
  const rename = change(base, characterId, { name: 'Renamed' });
  assert.equal(rename.data.confirmationRequired, false);
  assert.deepEqual(rename.data.warnings, []);
  assert.equal(rename.data.applied, true);
  assert.equal(character(rename.state).name, 'Renamed');
  const declined = change(base, characterId, { name: 'Renamed' }, { simulation: false, confirmation: 'no' });
  assert.equal(declined.data.applied, false);
  assert.equal(character(declined.state).name, character(base).name);
}
// A simulation reports the same errors a commit would.
fails(base, characterId, { mainClassId: 'unknown' }, 'invalid_request', { simulation: true });
fails(base, uniqueCharacterId, { name: 'renamed unique' }, 'illegal_action', { simulation: true });

// A semantic no-op bypasses confirmation and retains the revision.
{
  const noOp = await executeApiV1CommitTransaction(request({ mainClassId: character(base).mainClassId, simulation: false }, { idempotencyKey: 'change-build-noop-01' }), dependencies());
  assert.equal(noOp.ok, true);
  if (!noOp.ok) throw new Error(noOp.error.code);
  assert.equal(noOp.response.revision, 0);
  assert.equal(noOp.stateChanged, false);
}

// Auto Equipment reports exactly which slots its immediate pass changed; mode-only requests report that no pass ran.
{
  const runAuto: ApiV1CommitContext['applyAutoEquipment'] = (state, partyIndex, id) => gameReducer(state, { type: 'REMOVE_ALL_EQUIPMENT', partyIndex, characterId: id! });
  const immediate = applyApiV1Commit(path(characterId, 'autoEquipment'), base, { mode: 'FULL', immediateAutoEquipment: true }, context(runAuto));
  const report = immediate.data.autoEquipmentReport as { ran: boolean; changes: Array<{ slotIndex: number; before: string | null; after: string | null }> };
  assert.equal(report.ran, true);
  assert.equal(report.changes.length, character(base).equipment.filter(Boolean).length);
  assert.ok(report.changes.every((entry) => entry.before !== null && entry.after === null));
  const deferred = applyApiV1Commit(path(characterId, 'autoEquipment'), base, { mode: 'SEMI' }, context(runAuto));
  assert.deepEqual(deferred.data.autoEquipmentReport, { ran: false, changes: [] });
}

// The status projection advertises the same currently legal stable options accepted by changeBuild.
{
  const enemyId = ENEMIES[0].id;
  const unlocked: GameState = { ...base, global: { ...base.global, unlockedMimorianEnemyIds: [enemyId] } };
  const status = await buildApiV1ReadData(`read/build/character/${characterId}/status`, unlocked, {}, {
    revision: 0, environment: 'dev', gameMode: 'mode.normal', enemyLevelOffset: 0, inGameTime: now,
  }) as { current: { racesAndGender: string }; validOptions: { racesAndGender: string[]; lineage: string[]; predisposition: string[] } };
  assert.ok(status.validOptions.racesAndGender.includes(`mimorian/female/${enemyId}`));
  assert.equal(status.validOptions.racesAndGender.includes('vulpinian/female'), true, 'the current combination remains selectable');
  assert.equal(status.validOptions.racesAndGender.includes('leporian/female'), false, 'a combination used by another non-unique member is excluded');
  assert.ok(status.validOptions.lineage.every((id) => id !== 'unascertained'));
  assert.ok(status.validOptions.predisposition.every((id) => id !== 'none'));

  const uniqueStatus = await buildApiV1ReadData(`read/build/character/${uniqueCharacterId}/status`, base, {}, {
    revision: 0, environment: 'dev', gameMode: 'mode.normal', enemyLevelOffset: 0, inGameTime: now,
  }) as { validOptions: { racesAndGender: string[]; lineage: string[]; predisposition: string[] } };
  assert.deepEqual(uniqueStatus.validOptions.racesAndGender, ['none']);
  assert.deepEqual(uniqueStatus.validOptions.lineage, ['none']);
  assert.deepEqual(uniqueStatus.validOptions.predisposition, ['none']);
}

// The Party editor's pending edits map to exactly the changed changeBuild parameters, and the mapped request applies.
{
  const target = character(base);
  assert.deepEqual(characterEditToChangeBuildParameters(target, {}), {});
  assert.deepEqual(characterEditToChangeBuildParameters(target, { name: target.name, raceId: target.raceId, gender: target.gender }), {}, 'unchanged values are omitted');
  assert.deepEqual(characterEditToChangeBuildParameters(target, { name: 'Renamed' }), { name: 'Renamed' });
  assert.deepEqual(characterEditToChangeBuildParameters(target, { gender: target.gender === 'male' ? 'female' : 'male' }).racesAndGender,
    `${target.raceId}/${target.gender === 'male' ? 'female' : 'male'}`);
  assert.deepEqual(characterEditToChangeBuildParameters(target, { mainClassId: 'guardian', lineageId: 'oath', predispositionId: 'Stubborn' }),
    { mainClassId: 'guardian', lineage: 'oath', predisposition: 'Stubborn' });
  const enemyId = ENEMIES[0].id;
  assert.equal(characterEditToChangeBuildParameters(target, { raceId: 'mimorian', gender: 'female', mimorianEnemyId: enemyId, name: 'x' }).racesAndGender, `mimorian/female/${enemyId}`);
  assert.throws(() => characterEditToChangeBuildParameters(target, { autoEquipmentMode: 2 }), /unsupported_character_edit:autoEquipmentMode/);

  const parameters = characterEditToChangeBuildParameters(target, { name: 'Renamed', mainClassId: 'guardian', subClassId: 'guardian' });
  const applied = change(base, characterId, parameters, { simulation: false, confirmation: 'yes' });
  assert.equal(character(applied.state).name, 'Renamed');
  assert.equal(character(applied.state).mainClassId, 'guardian');
}

console.log('apiV1BuildChange profile ok');
