const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

test('target-only AFK Chunk status preserves worker results', () => {
  const result = spawnSync(process.execPath, [
    'scripts/run-afk-chunk-status-attribution.mjs',
    '--samples=2',
    '--warmups=1',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, `AFK Chunk-status attribution failed with status ${result.status}`);
  const report = JSON.parse(result.stdout);
  assert.equal(report.validation.serializedWorkerStatesByteIdenticalEverySample, true);
});
