export const GAME_MODES = ['m.kemo', 'm.luna', 'm.laika'] as const;

export type GameMode = typeof GAME_MODES[number];
export type DarkModeSetting = 'off' | 'on' | 'system';
export type DesktopTheme = 'light' | 'dark' | 'laika' | 'laika-dark' | 'luna' | 'luna-dark';

type ThemeDefinition = {
  className: '' | 'theme-luna' | 'theme-laika';
  browserChrome: { light: string; dark: string };
  desktop: { light: DesktopTheme; dark: DesktopTheme };
};

export const THEME_DEFINITIONS: Record<GameMode, ThemeDefinition> = {
  'm.kemo': {
    className: '',
    browserChrome: { light: '#f3f4f6', dark: '#1f2937' },
    desktop: { light: 'light', dark: 'dark' },
  },
  'm.luna': {
    className: 'theme-luna',
    browserChrome: { light: '#f6efe2', dark: '#2f2620' },
    desktop: { light: 'luna', dark: 'luna-dark' },
  },
  'm.laika': {
    className: 'theme-laika',
    browserChrome: { light: '#e6efe7', dark: '#17281f' },
    desktop: { light: 'laika', dark: 'laika-dark' },
  },
};

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && GAME_MODES.includes(value as GameMode);
}

export function getThemeClassName(mode: GameMode): ThemeDefinition['className'] {
  return THEME_DEFINITIONS[mode].className;
}

export function getBrowserChromeColor(mode: GameMode, isDark: boolean): string {
  const colors = THEME_DEFINITIONS[mode].browserChrome;
  return isDark ? colors.dark : colors.light;
}

export function getDesktopTheme(mode: GameMode, isDark: boolean): DesktopTheme {
  const themes = THEME_DEFINITIONS[mode].desktop;
  return isDark ? themes.dark : themes.light;
}
