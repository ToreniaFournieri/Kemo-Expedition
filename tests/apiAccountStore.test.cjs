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
