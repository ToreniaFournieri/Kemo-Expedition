const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { build } = require('esbuild');

// SpecRef: 9.1.4.13 | Adapter and contract-test requirements | conformance matrix (Stage 9.2)
// Runs every catalogued operation through the real HTTP transport and Application API; see the profile for the cells.
// Set MATRIX_REPORT=1 to print the per-operation cell table.
test('every catalogued operation passes its applicable conformance cells over the real HTTP transport', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-matrix-build-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'profile.mjs');
  await build({
    entryPoints: [path.resolve('tests/support/apiV1ConformanceMatrix.profile.ts')], outfile: output, bundle: true, platform: 'node', format: 'esm',
    define: {
      'import.meta.env.DEV': 'false', 'import.meta.env.BASE_URL': JSON.stringify('/'), __APP_VERSION__: JSON.stringify('0.9.7-test'), __BUILD_NUMBER__: '0',
      __PUBLIC_CHARACTER_IMAGE_FILES__: '[]', __PUBLIC_CHIBI_IMAGE_FILES__: '[]', __AUTO_EQUIPMENT_PROFILE_ENABLED__: 'false', __AFK_LIVE_PROFILE_ENABLED__: 'false',
      __AFK_LIVE_PROFILE_FIXTURE__: JSON.stringify(''), __RUNTIME_DIAGNOSTICS_DEFAULT_ENABLED__: 'false',
    },
    plugins: [{ name: 'raw-markdown', setup(build) {
      build.onResolve({ filter: /\.md\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'raw-markdown' }));
      build.onLoad({ filter: /.*/, namespace: 'raw-markdown' }, args => ({ contents: `export default ${JSON.stringify(fs.readFileSync(args.path, 'utf8'))}`, loader: 'js' }));
    } }],
  });
  const result = spawnSync(process.execPath, [output], { encoding: 'utf8', cwd: path.resolve('.'), maxBuffer: 64 * 1024 * 1024 });
  if (process.env.MATRIX_REPORT) process.stdout.write(result.stdout);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
