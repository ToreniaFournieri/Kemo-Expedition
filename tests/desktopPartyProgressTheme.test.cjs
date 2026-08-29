const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

test('desktop Party Progress pane uses the exact UI foundation theme colors and flat fills', () => {
  const css = fs.readFileSync(path.join(projectRoot, 'src', 'partyProgressPane.css'), 'utf8');
  const renderer = fs.readFileSync(path.join(projectRoot, 'src', 'partyProgressMain.tsx'), 'utf8');
  const desktopMain = fs.readFileSync(path.join(projectRoot, 'desktop', 'main.cjs'), 'utf8');

  for (const color of ['#3b82f6', '#ea580c', '#c28832', '#0c3cea', '#60a5fa', '#08a645', '#dc2626', '#269096', '#8bab2d', '#45c1ca', '#b3d355']) {
    assert.match(css, new RegExp(color));
  }

  assert.match(css, /--surface-canvas:\s*#ffffff/);
  assert.match(css, /--surface-card:\s*#f3f4f6/);
  assert.match(css, /--content-primary:\s*#000000/);
  assert.match(css, /\.open-button\s*\{[^}]*background:\s*var\(--theme-sub\)/);
  assert.match(css, /\.compact-fill\s*\{[^}]*background:\s*var\(--theme-sub-soft\)/);
  assert.match(css, /\.sub-progress-track span\s*\{[^}]*background:\s*var\(--theme-sub-soft\)/);
  assert.match(css, /--theme-sub-soft:\s*rgb\(8 166 69 \/ 0\.2\)/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|backdrop-filter|color-mix|text-shadow|box-shadow/);
  assert.match(renderer, /document\.documentElement\.style\.colorScheme\s*=\s*theme/);
  assert.match(desktopMain, /'orca', 'orca-dark'/);
});
