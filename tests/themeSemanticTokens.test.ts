import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  GAME_MODES,
  THEME_DEFINITIONS,
  getBrowserChromeColor,
  getDesktopTheme,
  getThemeClassName,
  isGameMode,
  isGameModeAvailable,
} from '../src/theme/theme.ts';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const tailwind = readFileSync(new URL('../tailwind.config.js', import.meta.url), 'utf8');
const document = readFileSync(new URL('../docs/ui-color-semantic-tokens.md', import.meta.url), 'utf8');
const homeScreen = readFileSync(new URL('../src/components/HomeScreen.tsx', import.meta.url), 'utf8');
const homeShared = readFileSync(new URL('../src/components/home/homeShared.tsx', import.meta.url), 'utf8');
const notificationToast = readFileSync(new URL('../src/components/NotificationToast.tsx', import.meta.url), 'utf8');
const migratedSources = [
  '../src/App.tsx',
  '../src/components/NotificationToast.tsx',
  '../src/components/ExperimentalApiSettings.tsx',
  '../src/components/home/tabs/BaseTab.tsx',
  '../src/components/home/tabs/DiaryTab.tsx',
  '../src/components/home/tabs/ExpeditionTab.tsx',
  '../src/components/home/tabs/PartyTab.tsx',
  '../src/components/home/tabs/SettingTab.tsx',
].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

test('theme registry owns browser, class, and desktop mappings for every game mode', () => {
  assert.deepEqual(GAME_MODES, [
    'm.kemo', 'm.laika', 'm.leonard', 'm.orca', 'm.nox', 'm.luna', 'm.mishka',
    'm.puchitsa', 'm.hagakure', 'm.souga-ha', 'm.finn', 'm.merle', 'm.rosaria',
    'm.milly', 'm.guabi', 'm.nemea', 'm.bernetta', 'm.yone', 'm.niv', 'm.nave',
  ]);
  for (const mode of GAME_MODES) {
    assert.equal(isGameMode(mode), true);
    assert.equal(getThemeClassName(mode), THEME_DEFINITIONS[mode].className);
    assert.equal(getBrowserChromeColor(mode, false), THEME_DEFINITIONS[mode].browserChrome.light);
    assert.equal(getBrowserChromeColor(mode, true), THEME_DEFINITIONS[mode].browserChrome.dark);
    assert.equal(getDesktopTheme(mode, false), THEME_DEFINITIONS[mode].desktop.light);
    assert.equal(getDesktopTheme(mode, true), THEME_DEFINITIONS[mode].desktop.dark);
  }
  assert.equal(isGameMode('m.future'), false);
  assert.equal(isGameModeAvailable('m.leonard', 'dev'), true);
  assert.equal(isGameModeAvailable('m.leonard', 'prod'), false);
  assert.equal(isGameModeAvailable('m.luna', 'prod'), true);
  assert.equal(isGameModeAvailable('m.laika', 'beta'), true);
  assert.equal(isGameModeAvailable('m.kemo', 'beta'), false);
});

test('semantic token contract covers foundations, feedback, gameplay, glass, and compatibility aliases', () => {
  for (const token of [
    '--theme-sub', '--theme-accent', '--surface-canvas', '--surface-card', '--surface-pane',
    '--content-primary', '--content-muted', '--border-default', '--selection-fill', '--focus-ring',
    '--status-error', '--status-warning', '--status-unread', '--hp-current', '--hp-damage-taken',
    '--hp-healed', '--hp-track', '--outcome-success', '--rarity-super-rare',
    '--notification-surface', '--notification-surface-alpha', '--glass-surface', '--icon-theme-sub-filter',
  ]) {
    assert.match(css, new RegExp(`${token}:`));
    assert.match(document, new RegExp(token));
  }
  assert.match(css, /--color-sub:\s*var\(--theme-sub\)/);
  assert.match(css, /--color-accent:\s*var\(--theme-accent\)/);
  assert.match(tailwind, /surface-canvas/);
  assert.match(tailwind, /content-primary/);
  assert.match(tailwind, /status-error/);
});

test('UI foundation palette implements every exact light and dark theme color', () => {
  const palettes = {
    kemo: { light: ['59 130 246', '234 88 12', '147 197 253', '252 183 134'], dark: ['59 130 246', '234 88 12', '106 148 198', '165 136 109'] },
    laika: { light: ['8 166 69', '220 38 38', '13 195 83', '255 235 205'], dark: ['8 166 69', '220 38 38', '13 195 83', '146 103 91'] },
    leonard: { light: ['191 66 100', '239 168 76', '217 93 122', '243 183 126'], dark: ['224 96 128', '242 179 92', '185 78 105', '168 121 89'] },
    orca: { light: ['38 144 150', '139 171 45', '46 185 193', '221 232 154'], dark: ['69 193 202', '179 211 85', '78 159 165', '138 145 96'] },
    nox: { light: ['158 41 35', '213 139 32', '185 74 62', '224 168 92'], dark: ['214 90 79', '240 184 74', '169 71 64', '167 123 74'] },
    luna: { light: ['194 136 50', '12 60 234', '232 181 104', '255 237 145'], dark: ['194 136 50', '96 165 250', '170 141 93', '133 114 85'] },
    mishka: { light: ['23 105 194', '102 92 135', '67 140 212', '165 155 183'], dark: ['75 156 255', '149 137 184', '57 127 197', '119 110 138'] },
    puchitsa: { light: ['201 75 50', '22 125 141', '223 106 69', '117 169 164'], dark: ['240 120 85', '66 169 181', '185 86 64', '98 143 143'] },
    hagakure: { light: ['113 132 90', '154 112 79', '145 168 117', '216 185 154'], dark: ['164 186 130', '198 154 114', '132 155 108', '155 128 105'] },
    'souga-ha': { light: ['85 122 157', '209 60 76', '120 154 184', '217 154 159'], dark: ['131 169 202', '240 100 112', '110 143 174', '168 109 116'] },
    finn: { light: ['114 85 165', '181 138 60', '146 118 190', '214 189 138'], dark: ['168 139 210', '216 183 100', '141 117 176', '160 139 104'] },
    merle: { light: ['67 141 196', '111 155 105', '114 175 213', '169 201 157'], dark: ['114 185 226', '155 197 140', '103 159 194', '127 157 120'] },
    rosaria: { light: ['118 46 75', '81 64 120', '155 82 107', '169 138 165'], dark: ['182 91 124', '139 120 181', '141 73 98', '128 106 125'] },
    milly: { light: ['201 79 120', '184 134 47', '225 126 157', '229 185 141'], dark: ['240 128 163', '221 180 91', '189 102 131', '169 133 104'] },
    guabi: { light: ['120 149 47', '217 95 104', '157 187 80', '231 160 155'], dark: ['169 201 87', '240 131 135', '131 158 72', '166 111 112'] },
    nemea: { light: ['39 140 140', '180 119 50', '85 170 165', '211 166 111'], dark: ['85 192 187', '217 161 92', '74 149 146', '155 121 86'] },
    bernetta: { light: ['142 52 56', '154 101 53', '178 85 85', '198 154 114'], dark: ['199 90 95', '200 144 85', '152 73 76', '146 112 82'] },
    yone: { light: ['75 71 69', '197 103 46', '119 112 108', '213 154 114'], dark: ['139 133 129', '232 138 76', '105 99 95', '158 115 88'] },
    niv: { light: ['70 95 125', '128 95 67', '113 137 162', '179 154 130'], dark: ['120 150 184', '176 138 104', '100 125 152', '139 117 99'] },
    nave: { light: ['53 69 140', '232 97 24', '100 117 181', '233 154 109'], dark: ['113 134 224', '255 138 61', '93 110 173', '174 115 85'] },
  } as const;
  const declarations = ['--theme-sub', '--theme-accent', '--hp-current', '--hp-damage-taken'];
  for (const [name, palette] of Object.entries(palettes)) {
    const lightSelector = name === 'kemo' ? ':root' : `.theme-${name}`;
    const darkSelector = name === 'kemo' ? '.theme-dark' : `.theme-${name}.theme-dark`;
    for (const [appearance, selector] of [['light', lightSelector], ['dark', darkSelector]] as const) {
      const block = css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
      declarations.forEach((declaration, index) => assert.match(block, new RegExp(`${declaration}:\\s*${palette[appearance][index]};`), `${name} ${appearance} ${declaration}`));
    }
  }
  assert.match(css, /:root\s*\{[\s\S]*--surface-pane:\s*238 245 245;[\s\S]*--hp-healed:\s*var\(--theme-sub\);[\s\S]*--hp-track:\s*var\(--theme-sub\);[\s\S]*--hp-track-alpha:\s*0\.5;/);
  assert.match(css, /\.theme-dark\s*\{[\s\S]*--surface-pane:\s*30 41 59;[\s\S]*--hp-healed:\s*var\(--theme-sub\);[\s\S]*--hp-track:\s*var\(--theme-sub\);[\s\S]*--hp-track-alpha:\s*0\.5;/);
});

test('theme-scoped aliases and document portals resolve the active theme instead of inherited Kemo defaults', () => {
  const aliasRefreshBlock = css.match(/:where\(\.theme-dark, \[class\*='theme-'\]\)\s*\{[\s\S]*?\n\}/)?.[0] ?? '';
  for (const alias of ['--selection-fill', '--color-sub', '--notification-normal-text', '--notification-surface', '--outcome-success']) {
    assert.match(aliasRefreshBlock, new RegExp(`${alias}:`));
  }
  assert.match(homeScreen, /document\.body\.classList\.toggle\('theme-dark', isDarkModeEnabled\)/);
  assert.match(homeScreen, /document\.body\.classList\.toggle\(className, enabled\)/);
  assert.match(homeShared, /THEME_CLASS_NAMES\.filter/);
});

test('dark notification translucency is semantic and no longer forced to an opaque light surface', () => {
  assert.match(css, /--notification-surface-alpha:\s*0\.8/);
  assert.match(css, /\.theme-dark\s*\{[\s\S]*--notification-surface-alpha:\s*0\.52/);
  assert.match(css, /background-color:\s*rgb\(var\(--notification-surface\) \/ var\(--notification-surface-alpha\)\)/);
  assert.doesNotMatch(notificationToast, /bg-notification-surface/);
});

test('migrated semantic surfaces no longer encode theme behavior with fixed blue utilities', () => {
  assert.doesNotMatch(migratedSources, /(?:text|bg|border|ring)-blue-/);
});
