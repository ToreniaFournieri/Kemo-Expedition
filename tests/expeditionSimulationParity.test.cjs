const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const test = require('node:test');
const { buildSync } = require('esbuild');

test('forecast/full expedition parity profile', () => {
  const outputPath = resolve(require('node:os').tmpdir(), `bokemo-expedition-simulation-parity-${process.pid}.mjs`);
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/expeditionSimulationParity.profile.ts')],
    outfile: outputPath,
    bundle: true,
    platform: 'node',
    format: 'esm',
    define: {
      'import.meta.env.DEV': 'false',
      'import.meta.env.BASE_URL': JSON.stringify('/dev/'),
      __APP_VERSION__: JSON.stringify('0.9.4-test'),
      __BUILD_NUMBER__: '0',
      __PUBLIC_CHARACTER_IMAGE_FILES__: '[]',
      __PUBLIC_CHIBI_IMAGE_FILES__: '[]',
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
  assert.equal(result.status, 0, `Expedition simulation parity profile failed with status ${result.status}`);
});
