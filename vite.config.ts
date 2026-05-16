import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const buildNumber = Number.parseInt(readFileSync(resolve(__dirname, 'build_number.txt'), 'utf8').trim(), 10);

export default defineConfig({
  plugins: [react()],
  base: './',
  envPrefix: ['VITE_', 'BETA_'],
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    __BUILD_NUMBER__: JSON.stringify(Number.isFinite(buildNumber) ? buildNumber : 0),
  },
})
