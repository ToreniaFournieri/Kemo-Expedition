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
} from '../src/theme/theme.ts';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const tailwind = readFileSync(new URL('../tailwind.config.js', import.meta.url), 'utf8');
const document = readFileSync(new URL('../docs/ui-color-semantic-tokens.md', import.meta.url), 'utf8');
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
  assert.deepEqual(GAME_MODES, ['m.kemo', 'm.luna', 'm.laika']);
  for (const mode of GAME_MODES) {
    assert.equal(isGameMode(mode), true);
    assert.equal(getThemeClassName(mode), THEME_DEFINITIONS[mode].className);
    assert.equal(getBrowserChromeColor(mode, false), THEME_DEFINITIONS[mode].browserChrome.light);
    assert.equal(getBrowserChromeColor(mode, true), THEME_DEFINITIONS[mode].browserChrome.dark);
    assert.equal(getDesktopTheme(mode, false), THEME_DEFINITIONS[mode].desktop.light);
    assert.equal(getDesktopTheme(mode, true), THEME_DEFINITIONS[mode].desktop.dark);
  }
  assert.equal(isGameMode('m.future'), false);
});

test('semantic token contract covers foundations, feedback, gameplay, glass, and compatibility aliases', () => {
  for (const token of [
    '--theme-sub', '--theme-accent', '--surface-canvas', '--surface-card', '--surface-pane',
    '--content-primary', '--content-muted', '--border-default', '--selection-fill', '--focus-ring',
    '--status-error', '--status-warning', '--status-unread', '--hp-current', '--hp-damage-taken',
    '--hp-healed', '--hp-track', '--outcome-success', '--rarity-super-rare',
    '--notification-surface', '--glass-surface', '--icon-theme-sub-filter',
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

test('migrated semantic surfaces no longer encode theme behavior with fixed blue utilities', () => {
  assert.doesNotMatch(migratedSources, /(?:text|bg|border|ring)-blue-/);
});
