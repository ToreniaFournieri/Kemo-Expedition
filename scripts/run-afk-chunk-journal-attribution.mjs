import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildSync } from 'esbuild';

function positive(name, fallback) {
  const raw = process.argv.find((value) => value.startsWith(`--${name}=`))?.split('=')[1];
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

const samples = positive('samples', 20);
const warmups = positive('warmups', 2);
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bokemo-afk-chunk-journal-'));
const outputPath = join(temporaryDirectory, 'profile.mjs');

try {
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/afkChunkJournalAttribution.profile.ts')],
    outfile: outputPath,
    bundle: true,
    platform: 'node',
    format: 'esm',
    define: {
      'import.meta.env.DEV': 'false',
      __BUILD_NUMBER__: '0',
      __PROFILE_SAMPLE_COUNT__: String(samples),
      __PROFILE_WARMUP_COUNT__: String(warmups),
    },
    logLevel: 'silent',
  });
  const result = spawnSync(process.execPath, [outputPath], { cwd: process.cwd(), stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
