import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isExperimentalApiCommandType,
  validateExperimentalApiTrainingRequest,
} from '../src/game/experimentalApiContracts.ts';

test('training action contracts accept a current legal command', () => {
  const request = {
    method: 'POST',
    path: '/experimental/v1/command',
    body: { expectedRevision: 7, command: { type: 'run_auto_equipment', partyId: 1, characterId: 2 } },
  };
  const legal = [{ type: 'run_auto_equipment', partyId: 1, characterId: 2, constraints: {} }];
  assert.deepEqual(validateExperimentalApiTrainingRequest(request, 7, legal), []);
  assert.equal(isExperimentalApiCommandType('run_auto_equipment'), true);
});

test('training action contracts reject stale, unsupported, and absent actions', () => {
  const stale = {
    method: 'POST',
    path: '/experimental/v1/command',
    body: { expectedRevision: 6, command: { type: 'direct_gold_edit', partyId: 1 } },
  };
  const errors = validateExperimentalApiTrainingRequest(stale, 7, []);
  assert.ok(errors.includes('expectedRevision must match the observation'));
  assert.ok(errors.includes('command discriminator is unsupported'));
  assert.equal(isExperimentalApiCommandType('direct_gold_edit'), false);
});
