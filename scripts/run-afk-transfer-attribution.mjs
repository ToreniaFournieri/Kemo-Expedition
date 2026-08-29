import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildSync } from 'esbuild';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'bokemo-afk-transfer-attribution-'));
const outputPath = join(temporaryDirectory, 'profile.mjs');

try {
  buildSync({
    entryPoints: [resolve(process.cwd(), 'tests/support/afkTransferAttribution.profile.ts')],
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
  const result = spawnSync(process.execPath, [outputPath], { cwd: process.cwd(), stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
