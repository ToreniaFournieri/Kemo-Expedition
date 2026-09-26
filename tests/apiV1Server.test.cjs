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
      if (operationId === 'fundamental/status') return { data: { systemStatus: 'ready', versionBuild: '0.0.0 (0)', environment: 'desktop' } };
      if (operationId === 'fundamental/logIn') return { revision, data: { userId: 'Taro', environment: 'desktop', gameMode: 'normal', levelOffsetForOrca: null }, identity: { userId: 'Taro' } };
      if (operationId === 'fundamental/logOut') return { revision, data: { finalPersistedRevision: revision } };
      if (operationId === 'read/observation/overview') return { revision, data: { headerInfo: { gameMode: 'mode.normal', inGameTime: new Date(0).toISOString(), gold: 200, prana: 0, environment: 'desktop', unreadDiary: 0, speedOfTime: null, autoRepeat: null, progressReportInfo: { available: false, bonusActive: false } } } };
      if (operationId === 'read/base/searchItems') return { revision, data: { items: ['0/1101/0/0/1/12'], totalCount: 1, truncated: false } };
      if (operationId === 'resources/itemCompendium') return { revision, data: { items: [{ itemId: 2402, category: 'sword', rarity: 'uncommon', tier: 2, revealed: false }], nextCursor: null } };
      if (operationId === 'commit/base/changeJewelPriorityParty') {
        if (payload.idempotencyKey === 'operation-in-progress-key') return { status: 409, revision, error: { code: 'operation_in_progress', message: 'The operation is already in progress.' } };
        return { previousRevision: revision, revision: ++revision, data: { current: { partyNumber: 1 } } };
      }
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
  // SpecRef: 9.1.4.11 | A rejected request names the member it rejected, not only "The request is invalid."
  const invalidLoginError = (await invalidLogin.json()).error;
  assert.deepEqual([invalidLoginError.details.field, invalidLoginError.details.rule], ['unknown', 'additionalProperties']);
  assert.match(invalidLoginError.message, /`unknown` is not a known member/);
  const missingField = await fetch(`${descriptor.endpoint}/fundamental/logIn`, { method: 'POST', headers: bootstrap, body: JSON.stringify({ userId: 'Taro', environment: 'desktop' }) });
  const missingFieldError = (await missingField.json()).error;
  assert.deepEqual([missingField.status, missingFieldError.code, missingFieldError.details.field], [400, 'invalid_request', 'gameMode']);
  assert.match(missingFieldError.message, /`gameMode` is required/);
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
  assert.equal((await fetch(`${descriptor.endpoint}/read/base/searchItems?category=nonsense`, { headers: session })).status, 400);
  const search = await fetch(`${descriptor.endpoint}/read/base/searchItems`, { headers: session });
  assert.equal(search.status, 200, 'category is optional');
  assert.deepEqual((await search.json()).data.items, ['0/1101/0/0/1/12']);
  assert.equal((await fetch(`${descriptor.endpoint}/read/base/searchItems?limit=5001`, { headers: session })).status, 400, 'limit is at most 5000');
  assert.equal((await fetch(`${descriptor.endpoint}/read/base/searchItems?limit=0`, { headers: session })).status, 400, 'limit is at least 1');
  const compendium = await fetch(`${descriptor.endpoint}/resources/itemCompendium?itemId=2402`, { headers: session });
  assert.equal(compendium.status, 200, 'itemCompendium category is optional, so one item can be looked up by itemId');
  assert.deepEqual(calls.at(-1).payload.parameters, { itemId: 2402, rarity: 'all', details: 'abilityAndCBonus', limit: 100 });
  // SpecRef: 9.1.4.14 | GET arrays repeat the parameter name; a comma-joined array gets a hint instead of a bare pattern error.
  const commaJoined = await fetch(`${descriptor.endpoint}/read/build/character/1/equipmentEvaluation?targetItems=0/1101/0/0/0:0,0/1102/0/0/0:0`, { headers: session });
  const commaJoinedError = (await commaJoined.json()).error;
  assert.deepEqual([commaJoined.status, commaJoinedError.details.field, commaJoinedError.details.hint], [400, 'targetItems', 'repeat_parameter']);
  assert.match(commaJoinedError.message, /repeating the parameter \(`targetItems=1&targetItems=2`\)/);
  const badSingle = await fetch(`${descriptor.endpoint}/read/build/character/1/equipmentEvaluation?targetItems=nonsense`, { headers: session });
  assert.equal((await badSingle.json()).error.details.hint, undefined, 'no hint without a comma');
  const invalidCommit = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: crypto.randomUUID(), parameters: {}, typo: true }) });
  assert.equal(invalidCommit.status, 400);
  const invalidCommitParameter = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: crypto.randomUUID(), parameters: { partyNumber: '1' } }) });
  assert.equal(invalidCommitParameter.status, 400);
  const invalidCommitRange = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: crypto.randomUUID(), parameters: { partyNumber: 7 } }) });
  assert.equal(invalidCommitRange.status, 400);
  const inProgress = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: 'operation-in-progress-key', parameters: { partyNumber: 1 } }) });
  assert.equal(inProgress.status, 409);
  assert.equal(inProgress.headers.get('retry-after'), '1');
  assert.equal((await inProgress.json()).error.code, 'operation_in_progress');
  const commit = await fetch(`${descriptor.endpoint}/commit/base/changeJewelPriorityParty`, { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: 0, idempotencyKey: crypto.randomUUID(), parameters: { partyNumber: 1 } }) });
  assert.equal(commit.status, 200);
  assert.equal((await commit.json()).revision, 1);
  assert.equal(calls.at(-1).operationId, 'commit/base/changeJewelPriorityParty');
});
