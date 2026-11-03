// Bundle the repo's real game engine into twin.mjs (run from the repo root: node play_runs/ai_play_tools/twin/build.mjs).
import { buildSync } from 'esbuild';
import { readFileSync } from 'node:fs';
const build = Number.parseInt(readFileSync('build_number.txt', 'utf8').trim(), 10);
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
buildSync({
  entryPoints: ['play_runs/ai_play_tools/twin/entry.ts'],
  outfile: 'play_runs/ai_play_tools/twin/twin.mjs', // git-ignored build product
  bundle: true, platform: 'node', format: 'esm',
  define: {
    'import.meta.env.DEV': 'false', 'import.meta.env.MODE': '"production"', 'import.meta.env.PROD': 'true', 'import.meta.env.BASE_URL': '"./"',
    __BUILD_NUMBER__: String(build), __APP_VERSION__: JSON.stringify(version),
    __PUBLIC_CHARACTER_IMAGE_FILES__: '[]', __PUBLIC_CHIBI_IMAGE_FILES__: '[]', __AUTO_EQUIPMENT_PROFILE_ENABLED__: 'false',
    __AFK_LIVE_PROFILE_ENABLED__: 'false', __AFK_LIVE_PROFILE_FIXTURE__: '""', __RUNTIME_DIAGNOSTICS_DEFAULT_ENABLED__: 'false',
  },
  loader: { '.md': 'text' }, logLevel: 'warning',
});
console.log('built play_runs/ai_play_tools/twin/twin.mjs');
