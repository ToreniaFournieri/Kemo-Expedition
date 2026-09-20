const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createApiV1 } = require('../desktop/api-v1.cjs');

test('API v1 uses bootstrap plus session authentication and hides credentials from settings', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  let revision = 0;
  const calls = [];
  const api = createApiV1({
    allowEnable: true,
    connectionDirectory: directory,
    allowedOrigin: 'app://bokemo',
    invokeApplication: async (operationId, payload) => {
      calls.push({ operationId, payload });
      if (operationId === 'fundamental/status') return { data: { systemStatus: 'ready' } };
      if (operationId === 'fundamental/logIn') return { revision, data: { userId: 'Taro' }, identity: { userId: 'Taro' } };
      if (operationId === 'fundamental/logOut') return { revision, data: { revision } };
      if (operationId === 'read/observation/overview') return { revision, data: { headerInfo: { gold: 200 } } };
      if (operationId === 'commit/base/changeJewelPriorityParty') return { previousRevision: revision, revision: ++revision, data: {} };
      throw new Error(`unexpected ${operationId}`);
    },
  });
  t.after(() => api.shutdown());
  const settings = await api.enable();
  assert.equal('token' in settings, false);
  assert.equal(fs.statSync(settings.connectionFile).mode & 0o777, 0o600);
  const descriptor = JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8'));
  const publicStatus = await fetch(`${descriptor.endpoint}/fundamental/status`);
  assert.equal(publicStatus.status, 200);
  assert.equal((await publicStatus.json()).data.systemStatus, 'ready');
  const bootstrap = { Authorization: `Bearer ${descriptor.token}`, 'Content-Type': 'application/json' };
  const invalidLogin = await fetch(`${descriptor.endpoint}/fundamental/logIn`, { method: 'POST', headers: bootstrap, body: JSON.stringify({ userId: 'Taro', environment: 'desktop', gameMode: 'normal', unknown: true }) });
  assert.equal(invalidLogin.status, 400);
  const wrongMethod = await fetch(`${descriptor.endpoint}/fundamental/logIn`, { headers: { Authorization: `Bearer ${descriptor.token}` } });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('allow'), 'POST');
  const loginResponse = await fetch(`${descriptor.endpoint}/fundamental/logIn`, { method: 'POST', headers: bootstrap, body: JSON.stringify({ userId: 'Taro', environment: 'desktop', gameMode: 'normal' }) });
  assert.equal(loginResponse.status, 200);
  const login = await loginResponse.json();
  const session = { Authorization: `Bearer ${descriptor.token}`, 'X-BoKemo-Session': login.data.sessionToken, 'X-BoKemo-Control-Lease': login.data.controlLeaseToken };
  const overview = await fetch(`${descriptor.endpoint}/read/observation/overview`, { headers: session });
  assert.equal(overview.status, 200);
  assert.ok(overview.headers.get('etag'));
  assert.equal((await fetch(`${descriptor.endpoint}/read/observation/overview`, { headers: { ...session, 'If-None-Match': overview.headers.get('etag') } })).status, 304);
  assert.equal((await fetch(`${descriptor.endpoint}/read/observation/overview?typo=1`, { headers: session })).status, 400);
  assert.equal((await fetch(`${descriptor.endpoint}/read/expedition/7/chargeStock`, { headers: session })).status, 400);
  assert.equal((await fetch(`${descriptor.endpoint}/read/base/searchItems`, { headers: session })).status, 400);
  const invalidCommit = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: crypto.randomUUID(), parameters: {}, typo: true }) });
  assert.equal(invalidCommit.status, 400);
  const invalidCommitParameter = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: crypto.randomUUID(), parameters: { partyNumber: '1' } }) });
  assert.equal(invalidCommitParameter.status, 400);
  const invalidCommitRange = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: crypto.randomUUID(), parameters: { partyNumber: 7 } }) });
  assert.equal(invalidCommitRange.status, 400);
  const commit = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: crypto.randomUUID(), parameters: { partyNumber: 1 } }) });
  assert.equal(commit.status, 200);
  assert.equal((await commit.json()).revision, 1);
  assert.equal(calls.at(-1).operationId, 'commit/base/changeJewelPriorityParty');
});
