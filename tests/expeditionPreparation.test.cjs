const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { resolve } = require('node:path');
const test = require('node:test');
const { buildSync } = require('esbuild');

test('expedition preparation regressions', () => {
  const outputPath = resolve(tmpdir(), `bokemo-expedition-preparation-${process.pid}.mjs`);
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/expeditionPreparation.profile.ts')],
    outfile: outputPath,
    bundle: true,
    platform: 'node',
    format: 'esm',
    define: {
      'import.meta.env.DEV': 'false',
      __BUILD_NUMBER__: '0',
    },
    logLevel: 'silent',
  });
  const { NODE_TEST_CONTEXT: _nodeTestContext, ...childEnv } = process.env;
  const result = spawnSync(process.execPath, ['--test', outputPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: childEnv,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, `Bundled expedition preparation profile failed with status ${result.status}`);
});
