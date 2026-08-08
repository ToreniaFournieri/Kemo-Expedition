/// <reference types="vite/client" />

declare const __APP_VERSION__: string;
declare const __BUILD_NUMBER__: number;
declare const __PUBLIC_CHARACTER_IMAGE_FILES__: readonly string[];
declare const __PUBLIC_CHIBI_IMAGE_FILES__: readonly string[];

interface ImportMetaEnv {
  readonly VITE_DEV_DISCORD_WEBHOOK_URL?: string;
  readonly VITE_BETA_DISCORD_WEBHOOK_URL?: string;
  readonly VITE_PROD_DISCORD_WEBHOOK_URL?: string;
  readonly VITE_FEEDBACK_DISCORD_WEBHOOK_URL?: string;
}
