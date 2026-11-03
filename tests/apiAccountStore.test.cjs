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

test('control-only commits retain save bytes, durable receipts, and identity isolation across reload and sweep', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-reuse-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let fail = false;
  const store = createApiAccountStore({ userDataPath: root, beforeManifestWrite: () => { if (fail) throw new Error('injected_manifest_failure'); } });
  const identity = { userId: 'Reuse', environment: 'desktop', gameMode: 'normal' };
  const other = { ...identity, environment: 'dev' };
  store.create(identity, 'original-save');
  store.create(other, 'other-save');
  const directory = store.resolveAccount(identity).directory;
  const manifestPath = path.join(directory, 'manifest.json');
  const original = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const control = { revisionHighWater: 0, receipts: [{ key: 'noop', response: { revision: 0 } }], confirmations: [{ token: 'reserved' }], tombstones: [] };
  store.commit(identity, null, JSON.stringify(control));
  const reused = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(reused.saveFile, original.saveFile);
  assert.notEqual(reused.controlFile, original.controlFile);
  assert.deepEqual(createApiAccountStore({ userDataPath: root }).load(identity).control, control);
  assert.equal(store.load(identity).savePayload, 'original-save');
  assert.equal(store.load(other).savePayload, 'other-save');
  fail = true;
  assert.throws(() => store.commit(identity, null, { ...control, revisionHighWater: 9 }), /injected_manifest_failure/);
  assert.deepEqual(store.load(identity).control, control);
  assert.deepEqual(fs.readdirSync(directory).sort(), [reused.saveFile, reused.controlFile, 'manifest.json'].sort());
  fail = false;
  store.commit(identity, 'changed-save', { ...control, revisionHighWater: 1 });
  assert.equal(store.load(identity).savePayload, 'changed-save');
  assert.equal(fs.existsSync(path.join(directory, original.saveFile)), false);
  store.commit(identity, null, { ...control, revisionHighWater: 1 });
  assert.equal(store.load(identity).savePayload, 'changed-save');
});

test('control-only commits refuse missing saves and invalid manifests before writing', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-invalid-reuse-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = createApiAccountStore({ userDataPath: root });
  const identity = { userId: 'Invalid', environment: 'desktop', gameMode: 'normal' };
  assert.throws(() => store.commit(identity, null, {}), /not_found/);
  store.create(identity, 'original-save');
  const directory = store.resolveAccount(identity).directory;
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const invalid of [{ ...manifest, saveFile: '../escape' }, { ...manifest, schemaVersion: 2 }, { ...manifest, identity: { ...identity, userId: 'Other' } }]) {
    fs.writeFileSync(manifestPath, JSON.stringify(invalid));
    const before = fs.readdirSync(directory).sort();
    assert.throws(() => store.commit(identity, null, {}), /invalid_manifest/);
    assert.deepEqual(fs.readdirSync(directory).sort(), before);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  fs.unlinkSync(path.join(directory, manifest.saveFile));
  const before = fs.readdirSync(directory).sort();
  assert.throws(() => store.commit(identity, null, {}), /ENOENT/);
  assert.deepEqual(fs.readdirSync(directory).sort(), before);
});

test('receipt journal appends, evicts, compacts, and survives interrupted commits', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-journal-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  let fail = false;
  const store = createApiAccountStore({ userDataPath: root, beforeManifestWrite: () => { if (fail) throw new Error('injected_manifest_failure'); } });
  const identity = { userId: 'Journal', environment: 'desktop', gameMode: 'normal' };
  store.create(identity, 'save-0');
  const directory = store.resolveAccount(identity).directory;
  const receipt = number => ({ key: `k${number}`, operation: 'op', canonical: '{}', response: { revision: number, text: 'line\nbreak' } });
  const lines = (from, to) => Array.from({ length: to - from }, (_, index) => JSON.stringify(receipt(from + index)));
  const control = revision => JSON.stringify({ revisionHighWater: revision, tombstones: [] });
  const receiptsOf = () => store.load(identity).control.receipts.map(value => value.key);
  const names = () => fs.readdirSync(directory).filter(name => name.startsWith('receipts-'));

  assert.throws(() => store.commit(identity, null, control(1), { baseCount: 0, evicted: 0, appended: lines(0, 1) }), /receipt_journal_mismatch/);
  store.commit(identity, null, control(1), { full: true, baseCount: 0, evicted: 0, appended: lines(0, 3) });
  assert.deepEqual(receiptsOf(), ['k0', 'k1', 'k2']);
  assert.deepEqual(store.load(identity).control.receipts[0], receipt(0));
  store.commit(identity, 'save-1', control(2), { baseCount: 3, evicted: 1, appended: lines(3, 5) });
  assert.deepEqual(receiptsOf(), ['k1', 'k2', 'k3', 'k4']);
  assert.equal(names().length, 1);

  // A mismatched picture is refused without touching the durable state.
  assert.throws(() => store.commit(identity, null, control(3), { baseCount: 9, evicted: 0, appended: lines(5, 6) }), /receipt_journal_mismatch/);
  assert.deepEqual(receiptsOf(), ['k1', 'k2', 'k3', 'k4']);

  // Bytes appended by a commit that never reached its manifest are ignored and overwritten.
  fail = true;
  assert.throws(() => store.commit(identity, null, control(3), { baseCount: 4, evicted: 0, appended: lines(5, 7) }), /injected_manifest_failure/);
  fail = false;
  assert.deepEqual(receiptsOf(), ['k1', 'k2', 'k3', 'k4']);
  store.commit(identity, null, control(3), { baseCount: 4, evicted: 2, appended: lines(5, 6) });
  assert.deepEqual(receiptsOf(), ['k3', 'k4', 'k5']);

  // Evicting past the compaction threshold rewrites a fresh journal and removes the old file.
  const before = names()[0];
  let next = 6;
  let base = 3;
  for (let step = 0; step < 5000; step += 1) {
    store.commit(identity, null, control(10 + step), { baseCount: base, evicted: 1, appended: lines(next, next + 1) });
    next += 1;
  }
  assert.equal(receiptsOf().length, 3);
  assert.deepEqual(receiptsOf(), [`k${next - 3}`, `k${next - 2}`, `k${next - 1}`]);
  assert.equal(names().length, 1);
  assert.notEqual(names()[0], before);

  // A commit without a sync (receipts inside the control) retires the journal.
  store.commit(identity, null, JSON.stringify({ revisionHighWater: 99, tombstones: [], receipts: [receipt(7)] }));
  assert.deepEqual(receiptsOf(), ['k7']);
  assert.equal(names().length, 0);
});
