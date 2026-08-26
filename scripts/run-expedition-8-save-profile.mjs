import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { buildSync } from 'esbuild';

const outputPath = resolve(tmpdir(), `bokemo-expedition-8-save-profile-${process.pid}.mjs`);
buildSync({
  entryPoints: [resolve(process.cwd(), 'tests/support/expedition8SaveBaseline.profile.ts')],
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

const result = spawnSync(process.execPath, [outputPath, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'inherit', 'inherit'],
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
