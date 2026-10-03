const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { build } = require('esbuild');

test('immutable API Chunks reuse computation caches with exact uncached state and RNG parity', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-chunk-caches-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const outfile = path.join(directory, 'profile.mjs');
  await build({
    entryPoints: [path.resolve('tests/support/apiV1ChunkCaches.profile.ts')], outfile, bundle: true, platform: 'node', format: 'esm',
    define: { 'import.meta.env.DEV': 'false', __BUILD_NUMBER__: '0', __API_CHUNK_CACHE_SAMPLES__: '1', __API_CHUNK_CACHE_CHUNKS__: '2', __API_CHUNK_CACHE_COMPARE_UNCACHED__: 'true' },
  });
  const result = spawnSync(process.execPath, [outfile], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
