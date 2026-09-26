import { GAME_MODES, isGameMode, isGameModeAvailable, type DarkModeSetting, type GameMode } from '../../theme/theme.ts';
import type { EnvironmentId } from '../../game/environment.ts';

// SpecRef: 9.1.3 | Read | 2-6-2 modeSelect; Commit | 3-6-2 modeSelect
// SpecRef: 8.6 | Setting | Mode Select (dark mode, 統計情報表示, theme color)
// Dark mode, the theme color, and the expedition statistics switch are display settings of the ordinary player's runtime
// (stored on the device, not in the save), exactly like auto-repeat. An API account has none of them, so they are `null`.

export type ApiV1ThemeKey = `theme.${string}`;

/** The display settings the ordinary player's runtime owns. Auto-repeat is read-only here (Spec 9.1.3, 3-6-2 note). */
export interface ApiV1DisplaySettings {
  readonly darkMode: DarkModeSetting;
  readonly theme: GameMode;
  readonly showExpeditionStats: boolean;
  readonly autoRepeat: boolean;
}

/** A display-setting change applied to the runtime after the commit is durable. */
export interface ApiV1DisplaySettingWrite {
  darkMode?: DarkModeSetting;
  theme?: GameMode;
  showExpeditionStats?: boolean;
}

export function toThemeKey(mode: GameMode): ApiV1ThemeKey {
  return `theme.${mode.slice('m.'.length)}`;
}

export function fromThemeKey(key: unknown): GameMode | null {
  if (typeof key !== 'string' || !key.startsWith('theme.')) return null;
  const mode = `m.${key.slice('theme.'.length)}`;
  return isGameMode(mode) ? mode : null;
}

function asEnvironment(environment: string): EnvironmentId {
  return environment === 'dev' || environment === 'beta' || environment === 'orca' ? environment : 'prod';
}

/**
 * The theme colors the player may pick (Spec 8.6): every theme in development, the production-available ones otherwise,
 * only Laika in beta and only Orca in the Orca environment. `mode.orca` fixes the theme to Orca, so the choice is locked.
 */
export function selectableThemes(environment: string, gameMode: 'mode.normal' | 'mode.orca', current: GameMode): GameMode[] {
  const env = asEnvironment(environment);
  if (env === 'beta' || gameMode === 'mode.orca') return [current];
  return GAME_MODES.filter((mode) => isGameModeAvailable(mode, env));
}

export interface ApiV1ModeSelectCurrent {
  mode: 'mode.normal' | 'mode.orca';
  enemyLevelOffset: number;
  language: string;
  darkMode: DarkModeSetting | null;
  autoRepeat: boolean | null;
  showExpeditionStats: boolean | null;
  theme: ApiV1ThemeKey | null;
}

export function describeModeSelectCurrent(
  base: { gameMode: 'mode.normal' | 'mode.orca'; enemyLevelOffset: number; language: string },
  display: ApiV1DisplaySettings | undefined,
): ApiV1ModeSelectCurrent {
  return {
    mode: base.gameMode,
    enemyLevelOffset: base.enemyLevelOffset,
    language: base.language,
    darkMode: display?.darkMode ?? null,
    autoRepeat: display?.autoRepeat ?? null,
    showExpeditionStats: display?.showExpeditionStats ?? null,
    theme: display ? toThemeKey(display.theme) : null,
  };
}

/**
 * Validates the display part of a `commit/setting/modeSelect` request against the runtime's current settings and returns
 * the write to apply (empty when nothing changes). Throws `illegal_action` for an API account, which has no display
 * settings, and for a theme the player could not pick in the UI.
 */
export function planDisplaySettingWrite(
  parameters: Record<string, unknown>,
  display: ApiV1DisplaySettings | undefined,
  environment: string,
  gameMode: 'mode.normal' | 'mode.orca',
): ApiV1DisplaySettingWrite {
  const requested = parameters.darkMode !== undefined || parameters.theme !== undefined || parameters.showExpeditionStats !== undefined;
  if (!requested) return {};
  if (!display) throw new Error('illegal_action:api_account_display_setting');
  const write: ApiV1DisplaySettingWrite = {};
  if (parameters.darkMode !== undefined && parameters.darkMode !== display.darkMode) write.darkMode = parameters.darkMode as DarkModeSetting;
  if (parameters.showExpeditionStats !== undefined && parameters.showExpeditionStats !== display.showExpeditionStats) write.showExpeditionStats = parameters.showExpeditionStats === true;
  if (parameters.theme !== undefined) {
    const theme = fromThemeKey(parameters.theme);
    if (!theme || !selectableThemes(environment, gameMode, display.theme).includes(theme)) throw new Error('illegal_action:theme_unavailable');
    if (theme !== display.theme) write.theme = theme;
  }
  return write;
}
