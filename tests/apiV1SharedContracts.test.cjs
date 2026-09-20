const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { build } = require('esbuild');

test('contracts.ts normative shared schemas match the generated JSON catalog', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-shared-contracts-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'profile.mjs');
  await build({
    entryPoints: [path.resolve('tests/support/apiV1SharedContracts.profile.ts')],
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'esm',
  });
  const result = spawnSync(process.execPath, [output], { encoding: 'utf8', cwd: process.cwd() });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
