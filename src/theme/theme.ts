export const GAME_MODES = [
  'm.kemo', 'm.laika', 'm.leonard', 'm.orca', 'm.nox', 'm.luna', 'm.mishka',
  'm.puchitsa', 'm.hagakure', 'm.souga-ha', 'm.finn', 'm.merle', 'm.rosaria',
  'm.milly', 'm.guabi', 'm.nemea', 'm.bernetta', 'm.yone', 'm.niv', 'm.nave',
] as const;

export type GameMode = typeof GAME_MODES[number];
export type DarkModeSetting = 'off' | 'on' | 'system';
export type ThemeName = GameMode extends `m.${infer Name}` ? Name : never;
export type DesktopTheme = 'light' | 'dark' | Exclude<ThemeName, 'kemo'> | `${Exclude<ThemeName, 'kemo'>}-dark`;

type ThemeDefinition = {
  className: '' | `theme-${Exclude<ThemeName, 'kemo'>}`;
  labelKey: string;
  availableInProduction: boolean;
  browserChrome: { light: string; dark: string };
  desktop: { light: DesktopTheme; dark: DesktopTheme };
};

const SHARED_BROWSER_CHROME = { light: '#eef5f5', dark: '#1e293b' } as const;

function namedTheme(
  name: Exclude<ThemeName, 'kemo'>,
  labelKey: string,
  availableInProduction = false,
): ThemeDefinition {
  return {
    className: `theme-${name}`,
    labelKey,
    availableInProduction,
    browserChrome: SHARED_BROWSER_CHROME,
    desktop: { light: name, dark: `${name}-dark` },
  };
}

export const THEME_DEFINITIONS: Record<GameMode, ThemeDefinition> = {
  'm.kemo': {
    className: '',
    labelKey: 'character.default.n1',
    availableInProduction: true,
    browserChrome: SHARED_BROWSER_CHROME,
    desktop: { light: 'light', dark: 'dark' },
  },
  'm.laika': namedTheme('laika', 'character.default.n2', true),
  'm.leonard': namedTheme('leonard', 'character.default.n3'),
  'm.orca': namedTheme('orca', 'character.default.n4'),
  'm.nox': namedTheme('nox', 'character.default.n5'),
  'm.luna': namedTheme('luna', 'character.default.n6', true),
  'm.mishka': namedTheme('mishka', 'character.default.n7'),
  'm.puchitsa': namedTheme('puchitsa', 'character.default.n8'),
  'm.hagakure': namedTheme('hagakure', 'character.default.n9'),
  'm.souga-ha': namedTheme('souga-ha', 'character.default.n10'),
  'm.finn': namedTheme('finn', 'character.default.n11'),
  'm.merle': namedTheme('merle', 'character.default.n12'),
  'm.rosaria': namedTheme('rosaria', 'masterData.enemyName.171'),
  'm.milly': namedTheme('milly', 'masterData.enemyName.17'),
  'm.guabi': namedTheme('guabi', 'masterData.enemyName.173'),
  'm.nemea': namedTheme('nemea', 'masterData.enemyName.239'),
  'm.bernetta': namedTheme('bernetta', 'masterData.enemyName.259'),
  'm.yone': namedTheme('yone', 'masterData.enemyName.305'),
  'm.niv': namedTheme('niv', 'masterData.enemyName.348'),
  'm.nave': namedTheme('nave', 'masterData.enemyName.375'),
};

export const THEME_CLASS_NAMES = GAME_MODES
  .map((mode) => THEME_DEFINITIONS[mode].className)
  .filter((className): className is Exclude<ThemeDefinition['className'], ''> => className !== '');

export function isGameMode(value: unknown): value is GameMode {
  return typeof value === 'string' && GAME_MODES.includes(value as GameMode);
}

export function isGameModeAvailable(value: unknown, environment: 'dev' | 'beta' | 'orca' | 'prod'): value is GameMode {
  if (!isGameMode(value)) return false;
  if (environment === 'beta') return value === 'm.laika';
  if (environment === 'orca') return value === 'm.orca';
  return environment === 'dev' || THEME_DEFINITIONS[value].availableInProduction;
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
