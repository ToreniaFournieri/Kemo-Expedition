import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  getDeployedExpeditions,
  isExpeditionDeployed,
} from '../src/game/expeditionDeployment.ts';
import { getEnvironmentIdFromPathname } from '../src/game/environment.ts';

const expeditionDefinitions = [
  { id: 1, deployStatus: 'prod' as const },
  { id: 9, deployStatus: 'test' as const },
  { id: 10, deployStatus: 'no' as const },
];

test('expedition deploy statuses follow the environment policy', () => {
  assert.equal(isExpeditionDeployed('prod', 'prod'), true);
  assert.equal(isExpeditionDeployed('prod', 'beta'), true);
  assert.equal(isExpeditionDeployed('prod', 'dev'), true);
  assert.equal(isExpeditionDeployed('test', 'prod'), false);
  assert.equal(isExpeditionDeployed('test', 'beta'), false);
  assert.equal(isExpeditionDeployed('test', 'dev'), true);
  assert.equal(isExpeditionDeployed('no', 'prod'), false);
  assert.equal(isExpeditionDeployed('no', 'beta'), false);
  assert.equal(isExpeditionDeployed('no', 'dev'), false);
});

test('Expedition 9 is available only in dev while production expeditions remain available everywhere', () => {
  assert.deepEqual(
    getDeployedExpeditions(expeditionDefinitions, 'dev').map((dungeon) => dungeon.id),
    [1, 9],
  );
  assert.deepEqual(
    getDeployedExpeditions(expeditionDefinitions, 'beta').map((dungeon) => dungeon.id),
    [1],
  );
  assert.deepEqual(
    getDeployedExpeditions(expeditionDefinitions, 'prod').map((dungeon) => dungeon.id),
    [1],
  );
});

test('runtime expedition definitions carry the specified deploy statuses', () => {
  const source = readFileSync(new URL('../src/data/dungeons.ts', import.meta.url), 'utf8');
  for (let id = 1; id <= 8; id += 1) {
    assert.match(source, new RegExp(`id: ${id},[\\s\\S]*?deployStatus: 'prod'`));
  }
  assert.match(source, /id: 9,[\s\S]*?deployStatus: 'test'/);
  assert.match(source, /id: 99,[\s\S]*?deployStatus: 'prod'/);
});

test('browser and worker pathnames resolve the same active environment', () => {
  assert.equal(getEnvironmentIdFromPathname('/dev/'), 'dev');
  assert.equal(getEnvironmentIdFromPathname('/dev/assets/afkChunkWorker.js'), 'dev');
  assert.equal(getEnvironmentIdFromPathname('/beta/'), 'beta');
  assert.equal(getEnvironmentIdFromPathname('/'), 'prod');
});
