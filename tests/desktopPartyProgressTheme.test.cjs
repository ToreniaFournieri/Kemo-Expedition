const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

test('desktop Party Progress pane uses the exact UI foundation theme colors and flat fills', () => {
  const css = fs.readFileSync(path.join(projectRoot, 'src', 'partyProgressPane.css'), 'utf8');
  const renderer = fs.readFileSync(path.join(projectRoot, 'src', 'partyProgressMain.tsx'), 'utf8');

  for (const color of ['#3b82f6', '#ea580c', '#c28832', '#0c3cea', '#08a645', '#dc2626']) {
    assert.match(css, new RegExp(color));
  }

  assert.match(css, /--surface:\s*#ffffff/);
  assert.match(css, /--surface-2:\s*#f3f4f6/);
  assert.match(css, /--text:\s*#000000/);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|backdrop-filter|color-mix|text-shadow|box-shadow/);
  assert.match(renderer, /document\.documentElement\.style\.colorScheme\s*=\s*theme/);
});
