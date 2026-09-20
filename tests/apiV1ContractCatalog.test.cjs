const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const test = require('node:test');

test('checked-in API v1 catalog matches the normative endpoint index', () => {
  execFileSync(process.execPath, ['scripts/generate-api-v1-contract.mjs', '--check'], { cwd: process.cwd() });
  const catalog = JSON.parse(readFileSync('desktop/api-v1-contract.json', 'utf8'));
  assert.equal(catalog.apiVersion, 'v1');
  assert.equal(catalog.schemaVersion, 1);
  assert.equal(catalog.operations.length, 83);
  assert.deepEqual(Object.keys(catalog.requestSchemas).sort(), ['commit', 'logIn', 'logOut', 'signUp', 'simulationRun']);
  assert.equal(new Set(catalog.operations.map(operation => `${operation.method} ${operation.path}`)).size, 83);
  assert.equal(catalog.operations.some(operation => operation.path.startsWith('/experimental/')), false);
});
