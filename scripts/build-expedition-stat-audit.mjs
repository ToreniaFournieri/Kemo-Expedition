import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const outputPath = process.argv[2];
if (!outputPath) throw new Error('Usage: node scripts/build-expedition-stat-audit.mjs <outfile> [--counter]');
const counterEnabled = process.argv.includes('--counter');

await build({
  entryPoints: [resolve(process.cwd(), 'tests/support/expeditionStatConsumerAudit.profile.ts')],
  outfile: resolve(outputPath),
  bundle: true,
  platform: 'node',
  format: 'esm',
  sourcemap: 'inline',
  define: {
    'import.meta.env.DEV': 'false',
    __BUILD_NUMBER__: '0',
  },
  plugins: counterEnabled ? [{
    name: 'expedition-stat-audit-counter',
    setup(buildApi) {
      buildApi.onLoad({ filter: /src\/game\/partyComputation\.ts$/ }, async ({ path }) => {
        const source = await readFile(path, 'utf8');
        const needle = 'export function computePartyStats(party: Party): ComputedPartyStatus {';
        if (!source.includes(needle)) throw new Error('computePartyStats audit injection point was not found');
        return {
          loader: 'ts',
          contents: source.replace(needle, `${needle}\n  globalThis.__bokemoRecordPartyStatsCall?.(party);`),
        };
      });
    },
  }] : [],
  logLevel: 'silent',
});
