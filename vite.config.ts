import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildNumber = Number.parseInt(readFileSync(resolve(__dirname, 'build_number.txt'), 'utf8').trim(), 10);
const getPublicPngFileNames = (directory: string): string[] => (
  readdirSync(resolve(__dirname, 'public', directory), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => entry.name)
);

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
    },
  },
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_NUMBER__: JSON.stringify(Number.isFinite(buildNumber) ? buildNumber : 0),
    __PUBLIC_CHARACTER_IMAGE_FILES__: JSON.stringify(getPublicPngFileNames('character')),
    __PUBLIC_CHIBI_IMAGE_FILES__: JSON.stringify(getPublicPngFileNames('chibi')),
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
          if (normalizedId.includes('/src/i18n/ja.ts')) return 'locale-ja';
          if (normalizedId.includes('/src/i18n/en.ts')) return 'locale-en';
          if (normalizedId.includes('/src/i18n/zh-CN.ts')) return 'locale-zh-CN';
          if (normalizedId.includes('/src/i18n/zh-TW.ts')) return 'locale-zh-TW';
          if (normalizedId.includes('/src/game/') || normalizedId.includes('/src/data/')) return 'game-domain';
          return undefined;
        },
      },
    },
  },
})
