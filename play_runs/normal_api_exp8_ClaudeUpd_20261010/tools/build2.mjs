// Run from the repo root: python3 <run>/tools/extract_autoequip.py && node <run>/tools/build2.mjs  -> <run>/tools/api2.mjs
import { buildSync } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const build = Number.parseInt(readFileSync('build_number.txt', 'utf8').trim(), 10);
buildSync({
  entryPoints: [join(here, 'entry2.ts')], outfile: join(here, 'api2.mjs'), bundle: true, platform: 'node', format: 'esm',
  define: { 'import.meta.env': '{"DEV":false,"MODE":"production","PROD":true,"BASE_URL":"./"}', 'import.meta.env.DEV': 'false', 'import.meta.env.MODE': '"production"', 'import.meta.env.PROD': 'true', 'import.meta.env.BASE_URL': '"./"',
    __BUILD_NUMBER__: String(build), __APP_VERSION__: '"0.10.1"', __PUBLIC_CHARACTER_IMAGE_FILES__: '[]', __PUBLIC_CHIBI_IMAGE_FILES__: '[]',
    __AUTO_EQUIPMENT_PROFILE_ENABLED__: 'false', __AFK_LIVE_PROFILE_ENABLED__: 'false', __AFK_LIVE_PROFILE_FIXTURE__: '""', __RUNTIME_DIAGNOSTICS_DEFAULT_ENABLED__: 'false' },
  loader: { '.md': 'text' }, logLevel: 'warning',
});
console.log('built', join(here, 'api2.mjs'));
