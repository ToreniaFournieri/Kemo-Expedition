import { resolve } from 'node:path';
import { build } from 'esbuild';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Usage: node scripts/build-expedition-reward-parity.mjs <outfile>');

await build({
  entryPoints: [resolve(process.cwd(), 'tests/support/expeditionRewardContextParity.profile.ts')],
  outfile: resolve(outputPath),
  bundle: true,
  platform: 'node',
  format: 'esm',
  define: {
    'import.meta.env.DEV': 'false',
    __BUILD_NUMBER__: '0',
  },
  logLevel: 'silent',
});
