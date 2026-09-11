const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');
const test = require('node:test');
const { buildSync } = require('esbuild');
test('AI Play transactions and actual engine integration', () => {
  const outputPath = resolve(require('node:os').tmpdir(), `bokemo-ai-play-${process.pid}.mjs`);
  buildSync({ entryPoints: [resolve('tests/support/experimentalApiEvaluation.profile.ts')], outfile: outputPath, bundle: true, platform: 'node', format: 'esm',
    define: { 'import.meta.env': '{}', 'import.meta.env.DEV': 'false', 'import.meta.env.BASE_URL': JSON.stringify('/orca/'), __APP_VERSION__: JSON.stringify('0.9.6'), __BUILD_NUMBER__: '12', __PUBLIC_CHARACTER_IMAGE_FILES__: '[]', __PUBLIC_CHIBI_IMAGE_FILES__: '[]' }, logLevel: 'silent' });
  const { NODE_TEST_CONTEXT: _unused, ...env } = process.env;
  const result = spawnSync(process.execPath, ['--test', outputPath], { cwd: process.cwd(), encoding: 'utf8', env });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0);
});
