const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { build } = require('esbuild');

test('equipment slot commands validate atomically and report real effects', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-slots-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const output = path.join(directory, 'profile.mjs');
  await build({
    entryPoints: [path.resolve('tests/support/apiV1EquipmentSlots.profile.ts')], outfile: output, bundle: true, platform: 'node', format: 'esm',
    define: {
      'import.meta.env.DEV': 'false',
      'import.meta.env.BASE_URL': JSON.stringify('/'),
      __APP_VERSION__: JSON.stringify('0.9.7-test'),
      __BUILD_NUMBER__: '0',
      __PUBLIC_CHARACTER_IMAGE_FILES__: '[]',
      __PUBLIC_CHIBI_IMAGE_FILES__: '[]',
      __AUTO_EQUIPMENT_PROFILE_ENABLED__: 'false',
      __AFK_LIVE_PROFILE_ENABLED__: 'false',
      __AFK_LIVE_PROFILE_FIXTURE__: JSON.stringify(''),
      __RUNTIME_DIAGNOSTICS_DEFAULT_ENABLED__: 'false',
    },
    plugins: [{ name: 'raw-markdown', setup(build) {
      build.onResolve({ filter: /\.md\?raw$/ }, args => ({ path: path.resolve(args.resolveDir, args.path.slice(0, -4)), namespace: 'raw-markdown' }));
      build.onLoad({ filter: /.*/, namespace: 'raw-markdown' }, args => ({ contents: `export default ${JSON.stringify(fs.readFileSync(args.path, 'utf8'))}`, loader: 'js' }));
    } }],
  });
  const result = spawnSync(process.execPath, [output], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('Party equipment controls commit through the Application API, not direct reducer actions', () => {
  const partyTab = fs.readFileSync(path.resolve('src/components/home/tabs/PartyTab.tsx'), 'utf8');
  assert.doesNotMatch(partyTab, /onUpdateCharacter/, 'the Party tab has no direct reducer character update');
  assert.match(partyTab, /onSetAutoEquipmentMode\(char\.id, nextMode\)/);
  const home = fs.readFileSync(path.resolve('src/components/HomeScreen.tsx'), 'utf8');
  for (const removed of ['actions.equipItem', 'actions.toggleEquipmentLock', 'actions.attachJewel', 'actions.removeAllEquipment', 'actions.updateCharacter']) {
    assert.equal(home.includes(removed), false, `${removed} must not be reachable from HomeScreen`);
  }
  assert.match(home, /dispatchEquipmentIntent\(characterId, \{ kind: 'equip', slotIndex, itemKey \}\)/);
});

test('Party Undo and Redo use the API history and availability, not a Party-local history', () => {
  const partyTab = fs.readFileSync(path.resolve('src/components/home/tabs/PartyTab.tsx'), 'utf8');
  for (const removed of ['recordEquipmentChange', 'equipmentHistory', 'EquipmentStateHistory', 'onRestoreEquipmentState', 'undoEquipmentState', 'redoEquipmentState']) {
    assert.equal(partyTab.includes(removed), false, `${removed} must not remain in PartyTab`);
  }
  assert.match(partyTab, /onUndoEquipment\(char\.id\)/);
  const home = fs.readFileSync(path.resolve('src/components/HomeScreen.tsx'), 'utf8');
  assert.equal(home.includes('actions.restoreEquipmentState'), false);
  assert.match(home, /'read\/build\/character\/\{characterId\}\/equipment'/);
});
