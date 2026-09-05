import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildNumber = Number.parseInt(readFileSync(resolve(__dirname, 'build_number.txt'), 'utf8').trim(), 10);
const afkLiveProfileEnabled = process.env.BOKEMO_AFK_LIVE_PROFILE === '1';
const afkLiveProfileFixture = afkLiveProfileEnabled
  ? readFileSync(resolve(__dirname, 'sample_savedata/ALL_Exp8_v0.9.3_dev_20260816.kemoz'), 'utf8')
  : '';
const getPublicPngFileNames = (directory: string): string[] => (
  readdirSync(resolve(__dirname, 'public', directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => entry.name)
);

const getLocaleChunkName = (id: string): string | undefined => {
  const normalizedId = id.replaceAll('\\', '/');
  if (normalizedId.includes('/src/i18n/ja.ts')) return 'locale-ja';
  if (normalizedId.includes('/src/i18n/en.ts')) return 'locale-en';
  if (normalizedId.includes('/src/i18n/zh-CN.ts')) return 'locale-zh-CN';
  if (normalizedId.includes('/src/i18n/zh-TW.ts')) return 'locale-zh-TW';
  return undefined;
};

const getSharedChunkName = (id: string): string | undefined => {
  const normalizedId = id.replaceAll('\\', '/');
  return getLocaleChunkName(normalizedId)
    ?? (normalizedId.includes('/src/game/battleKernelBinary.ts') ? 'battle-kernel-binary' : undefined);
};

export default defineConfig({
  plugins: [react({ babel: { compact: true } })],
  worker: {
    format: 'es',
    rollupOptions: {
      treeshake: {
        moduleSideEffects(id) {
          const normalizedId = id.replaceAll('\\', '/');
          return !normalizedId.includes('/node_modules/react/');
        },
      },
      output: {
        manualChunks: getSharedChunkName,
      },
    },
  },
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_NUMBER__: JSON.stringify(Number.isFinite(buildNumber) ? buildNumber : 0),
    __PUBLIC_CHARACTER_IMAGE_FILES__: JSON.stringify(getPublicPngFileNames('character')),
    __PUBLIC_CHIBI_IMAGE_FILES__: JSON.stringify(getPublicPngFileNames('chibi')),
    __AUTO_EQUIPMENT_PROFILE_ENABLED__: JSON.stringify(process.env.BOKEMO_AUTO_EQUIPMENT_PROFILE === '1'),
    __AFK_LIVE_PROFILE_ENABLED__: JSON.stringify(afkLiveProfileEnabled),
    __AFK_LIVE_PROFILE_FIXTURE__: JSON.stringify(afkLiveProfileFixture),
    __RUNTIME_DIAGNOSTICS_DEFAULT_ENABLED__: JSON.stringify(process.env.BOKEMO_RUNTIME_DIAGNOSTICS === '1'),
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        partyProgress: resolve(__dirname, 'party-progress.html'),
      },
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll('\\', '/');
          if (normalizedId.includes('/node_modules/')) return 'vendor';
          const sharedChunkName = getSharedChunkName(normalizedId);
          if (sharedChunkName) return sharedChunkName;
          if (normalizedId.includes('/src/game/') || normalizedId.includes('/src/data/')) return 'game-domain';
          return undefined;
        },
      },
    },
  },
})
