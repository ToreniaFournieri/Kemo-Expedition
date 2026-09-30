const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApiAccountStore } = require('../desktop/api-account-store.cjs');

test('API account store isolates identity and commits manifest-last files', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-accounts-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = createApiAccountStore({ userDataPath: root });
  const identity = { userId: 'Taro', environment: 'desktop', gameMode: 'normal' };
  store.create(identity, 'save-one');
  assert.equal(store.exists(identity), true);
  assert.equal(store.load(identity).savePayload, 'save-one');
  assert.throws(() => store.create(identity, 'other'), /already_exists/);
  store.commit(identity, 'save-two', { revisionHighWater: 1, receipts: [], tombstones: [] });
  assert.equal(store.load(identity).savePayload, 'save-two');
  assert.equal(store.load(identity).control.revisionHighWater, 1);
  assert.match(store.resolveAccount(identity).directory, /users\/desktop\/normal\/Taro$/);
});

test('API account store rejects unsafe identity path segments', () => {
  const store = createApiAccountStore({ userDataPath: os.tmpdir() });
  assert.throws(() => store.resolveAccount({ userId: '../escape', environment: 'desktop', gameMode: 'normal' }), /invalid_user_id/);
});

test('manifest-write failure leaves the previous generation authoritative', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-rollback-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let fail = false;
  const store = createApiAccountStore({
    userDataPath: root,
    beforeManifestWrite: () => { if (fail) throw new Error('injected_manifest_failure'); },
  });
  const identity = { userId: 'Rollback', environment: 'desktop', gameMode: 'normal' };
  store.create(identity, 'old-save');
  fail = true;
  assert.throws(() => store.commit(identity, 'new-save', { revisionHighWater: 9, receipts: [], tombstones: [] }), /injected_manifest_failure/);
  assert.equal(store.load(identity).savePayload, 'old-save');
  assert.equal(store.load(identity).control.revisionHighWater, 0);
});

test('a commit removes the generation its manifest replaced, keeping one save and control file', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-prune-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = createApiAccountStore({ userDataPath: root });
  const identity = { userId: 'Prune', environment: 'desktop', gameMode: 'normal' };
  store.create(identity, 'save-0');
  for (let revision = 1; revision <= 5; revision += 1) store.commit(identity, `save-${revision}`, { revisionHighWater: revision, receipts: [], tombstones: [] });
  const directory = store.resolveAccount(identity).directory;
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.deepEqual(fs.readdirSync(directory).sort(), [manifest.controlFile, 'manifest.json', manifest.saveFile].sort());
  assert.equal(store.load(identity).savePayload, 'save-5');
});

test('a commit writes control metadata that arrives already serialized as JSON verbatim', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-json-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = createApiAccountStore({ userDataPath: root });
  const identity = { userId: 'Json', environment: 'desktop', gameMode: 'normal' };
  store.create(identity, 'save-0');
  const controlJson = JSON.stringify({ revisionHighWater: 3, tombstones: ['old'], receipts: [{ key: 'k', operation: 'o', canonical: '{}', response: {} }] });
  store.commit(identity, 'save-1', controlJson);
  const directory = store.resolveAccount(identity).directory;
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(fs.readFileSync(path.join(directory, manifest.controlFile), 'utf8'), controlJson);
  assert.deepEqual(store.load(identity).control, JSON.parse(controlJson));
});

test('loading sweeps generations an earlier runtime or an interrupted commit left unreferenced', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-sweep-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let fail = false;
  const store = createApiAccountStore({ userDataPath: root, beforeManifestWrite: () => { if (fail) throw new Error('injected_manifest_failure'); } });
  const identity = { userId: 'Sweep', environment: 'desktop', gameMode: 'normal' };
  store.create(identity, 'kept-save');
  const directory = store.resolveAccount(identity).directory;
  const stale = ['save-00000000-0000-4000-8000-000000000000.bokemo', 'control-00000000-0000-4000-8000-000000000000.json', 'manifest.json.tmp-1-2'];
  for (const name of stale) fs.writeFileSync(path.join(directory, name), 'stale');
  fs.writeFileSync(path.join(directory, 'notes.txt'), 'not a generation file');
  fail = true;
  assert.throws(() => store.commit(identity, 'orphaned-save', { revisionHighWater: 1, receipts: [], tombstones: [] }), /injected_manifest_failure/);
  assert.equal(store.load(identity).savePayload, 'kept-save');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.deepEqual(fs.readdirSync(directory).sort(), [manifest.controlFile, 'manifest.json', manifest.saveFile, 'notes.txt'].sort());
});
