const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');

test('macOS desktop launches as a regular app and explicitly shows its Dock icon', () => {
  const source = fs.readFileSync(path.join(projectRoot, 'desktop', 'main.cjs'), 'utf8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

  assert.match(source, /app\.setActivationPolicy\('regular'\)/);
  assert.match(source, /app\.dock\?\.show\(\)/);
  assert.match(source, /app\.dock\?\.setIcon\(APP_ICON_PATH\)/);
  assert.equal(packageJson.build.mac.extendInfo.LSBackgroundOnly, false);
  assert.equal(packageJson.build.mac.extendInfo.LSUIElement, false);
});
