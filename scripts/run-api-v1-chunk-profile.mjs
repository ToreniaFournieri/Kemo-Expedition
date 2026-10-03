import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const option = (name, fallback) => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const samples = Number(option('samples', '5'));
const chunks = Number(option('chunks', '10'));
if (!Number.isInteger(samples) || samples < 1 || !Number.isInteger(chunks) || chunks < 1) throw new Error('samples and chunks must be positive integers');
const sourceRoot = resolve(option('source-root', process.cwd()));
const currentSource = join(process.cwd(), 'src');
const directory = mkdtempSync(join(tmpdir(), 'bokemo-api-chunk-profile-'));
try {
  const outfile = join(directory, 'profile.mjs');
  await build({
    entryPoints: [resolve('tests/support/apiV1ChunkCaches.profile.ts')], outfile, bundle: true, platform: 'node', format: 'esm',
    define: { 'import.meta.env.DEV': 'false', __BUILD_NUMBER__: '0', __API_CHUNK_CACHE_SAMPLES__: String(samples), __API_CHUNK_CACHE_CHUNKS__: String(chunks), __API_CHUNK_CACHE_COMPARE_UNCACHED__: String(process.argv.includes('--compare-uncached')) },
    plugins: [{ name: 'comparison-source', setup(build) {
      build.onResolve({ filter: /^\.\.?\// }, args => {
        const resolved = resolve(dirname(args.importer), args.path);
        if (sourceRoot !== process.cwd() && resolved.startsWith(currentSource + '/')) return { path: join(sourceRoot, resolved.slice(process.cwd().length)) };
      });
    } }],
  });
  const result = spawnSync(process.execPath, [outfile], { cwd: process.cwd(), stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
