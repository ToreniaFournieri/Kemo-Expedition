const assert = require('node:assert/strict');
const test = require('node:test');
const { createExperimentalApi } = require('../desktop/experimental-api.cjs');

test('Experimental AI API enforces authentication and an exclusive lease', async () => {
  let controlled = false;
  const rendererRequests = [];
  const api = createExperimentalApi({
    environment: 'dev',
    version: '0.9.1',
    build: 42,
    invokeRenderer: async (operation, payload) => {
      rendererRequests.push({ operation, payload });
      if (operation === 'invalid-request') return { status: 400, error: { code: 'invalid_request' } };
      if (operation === 'status') return { status: 'ready', revision: 7 };
      if (operation === 'set-control') {
        controlled = true;
        return { status: 'ready', revision: 7 };
      }
      if (operation === 'observation') return { observation: { revision: 7 } };
      if (operation === 'latest-battle-log') return { revision: 7, source: { kind: 'latest', diaryEntryId: null }, battleLog: { partyId: payload.partyId } };
      if (operation === 'diary-entries') return { revision: 7, entries: [{ id: '123-abc123' }] };
      if (operation === 'diary-battle-log') return { revision: 7, source: { kind: 'diary', diaryEntryId: payload.diaryEntryId }, battleLog: { partyId: 1 } };
      if (operation === 'command') return { command: { type: payload.command.type, status: 'applied', previousRevision: payload.expectedRevision, revision: payload.expectedRevision + 1 }, effects: {}, observation: { revision: payload.expectedRevision + 1 } };
      if (operation === 'release') {
        controlled = false;
        return { revision: 7 };
      }
      throw new Error('unexpected operation');
    },
  });
  const settings = await api.enable();
  const origin = `http://${settings.host}:${settings.port}`;

  const publicStatus = await fetch(`${origin}/experimental/v1/status`);
  assert.equal(publicStatus.status, 200);
  assert.deepEqual(await publicStatus.json(), { apiVersion: 'experimental/v1', authenticationRequired: true, status: 'available' });

  const unauthorized = await fetch(`${origin}/experimental/v1/observation`);
  assert.equal(unauthorized.status, 401);

  const auth = { Authorization: `Bearer ${settings.token}` };
  const acquired = await fetch(`${origin}/experimental/v1/control/acquire`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(acquired.status, 200);
  const acquisition = await acquired.json();
  assert.equal(controlled, true);
  assert.equal(acquisition.runtime.revision, 7);
  assert.equal(acquisition.lease.idleTimeoutMs, 300_000);

  const secondAcquire = await fetch(`${origin}/experimental/v1/control/acquire`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(secondAcquire.status, 409);
  assert.equal((await secondAcquire.json()).error.code, 'control_already_leased');

  const leaseHeaders = { ...auth, 'X-BoKemo-Control-Lease': acquisition.lease.token };
  const observation = await fetch(`${origin}/experimental/v1/observation`, { headers: leaseHeaders });
  assert.equal(observation.status, 200);
  assert.equal((await observation.json()).observation.revision, 7);

  const unauthorizedBattleLog = await fetch(`${origin}/experimental/v1/parties/1/battle-log/latest`);
  assert.equal(unauthorizedBattleLog.status, 401);

  const latestBattleLog = await fetch(`${origin}/experimental/v1/parties/1/battle-log/latest`, { headers: leaseHeaders });
  assert.equal(latestBattleLog.status, 200);
  assert.equal((await latestBattleLog.json()).battleLog.partyId, 1);
  assert.deepEqual(rendererRequests.at(-1), { operation: 'latest-battle-log', payload: { partyId: 1 } });

  const diaryEntries = await fetch(`${origin}/experimental/v1/diary-entries`, { headers: leaseHeaders });
  assert.equal(diaryEntries.status, 200);
  assert.equal((await diaryEntries.json()).entries[0].id, '123-abc123');
  assert.deepEqual(rendererRequests.at(-1), { operation: 'diary-entries', payload: {} });

  const diaryBattleLog = await fetch(`${origin}/experimental/v1/diary-entries/123-abc123/battle-log`, { headers: leaseHeaders });
  assert.equal(diaryBattleLog.status, 200);
  assert.equal((await diaryBattleLog.json()).source.diaryEntryId, '123-abc123');
  assert.deepEqual(rendererRequests.at(-1), { operation: 'diary-battle-log', payload: { diaryEntryId: '123-abc123' } });

  const unsupportedQuery = await fetch(`${origin}/experimental/v1/diary-entries?limit=1`, { headers: leaseHeaders });
  assert.equal(unsupportedQuery.status, 400);
  assert.equal((await unsupportedQuery.json()).error.code, 'invalid_request');

  const wrongMethod = await fetch(`${origin}/experimental/v1/diary-entries`, { method: 'POST', headers: leaseHeaders });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('allow'), 'GET');

  const wholePartyAutoEquipment = { expectedRevision: 7, command: { type: 'run_auto_equipment', partyId: 1 } };
  const wholePartyResponse = await fetch(`${origin}/experimental/v1/command`, { method: 'POST', headers: { ...leaseHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(wholePartyAutoEquipment) });
  assert.equal(wholePartyResponse.status, 200);
  assert.deepEqual(rendererRequests.at(-1), { operation: 'command', payload: wholePartyAutoEquipment });

  const characterAutoEquipment = { expectedRevision: 8, command: { type: 'run_auto_equipment', partyId: 1, characterId: 101 } };
  const characterResponse = await fetch(`${origin}/experimental/v1/command`, { method: 'POST', headers: { ...leaseHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(characterAutoEquipment) });
  assert.equal(characterResponse.status, 200);
  assert.deepEqual(rendererRequests.at(-1), { operation: 'command', payload: characterAutoEquipment });

  const removeAllEquipment = { expectedRevision: 9, command: { type: 'remove_all_equipment', partyId: 1, characterId: 101 } };
  const removeAllResponse = await fetch(`${origin}/experimental/v1/command`, { method: 'POST', headers: { ...leaseHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(removeAllEquipment) });
  assert.equal(removeAllResponse.status, 200);
  assert.deepEqual(rendererRequests.at(-1), { operation: 'command', payload: removeAllEquipment });

  const released = await fetch(`${origin}/experimental/v1/control/release`, { method: 'POST', headers: { ...leaseHeaders, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(released.status, 200);
  assert.equal(controlled, false);
  assert.equal((await released.json()).runtime.controlStatus, 'available');

  await api.disable();
});

test('evaluation report and ledger routes require authentication but no lease and expose capabilities privately', async () => {
  let calls = 0;
  const capabilities = { mode: 'normal', regulationVersion: 2, rulesId: 'test', countedApiCallLimit: 20000 };
  const api = createExperimentalApi({ environment: 'prod', version: '0.9.6', build: 14, aiPlayCapabilities: capabilities,
    invokeRenderer: async operation => {
      calls++;
      if (operation === 'status') return { status: 'ready', revision: 0 };
      if (operation === 'evaluation-report') return { status: 409, error: { code: 'evaluation_active' } };
      if (operation === 'evaluation-ledger') return { ledger: [] };
      return {};
    } });
  try {
    const settings = await api.enable();
    const base = `http://${settings.host}:${settings.port}/experimental/v1`;
    const headers = { Authorization: `Bearer ${settings.token}` };
    assert.equal((await fetch(`${base}/evaluation/report`)).status, 401);
    assert.equal(calls, 0);
    assert.equal((await fetch(`${base}/status`).then(r => r.json())).capabilities, undefined);
    assert.deepEqual((await fetch(`${base}/status`, { headers }).then(r => r.json())).capabilities.aiPlay, capabilities);
    assert.equal((await fetch(`${base}/evaluation/report`, { headers })).status, 409);
    assert.deepEqual(await fetch(`${base}/evaluation/ledger`, { headers }).then(r => r.json()), { apiVersion: 'experimental/v1', schemaVersion: 1, ledger: [] });
    const before = calls;
    assert.equal((await fetch(`${base}/evaluation/report?extra=1`, { headers })).status, 400);
    assert.equal((await fetch(`${base}/evaluation/ledger`, { headers, method: 'POST' })).status, 405);
    assert.equal(calls, before);
  } finally { await api.shutdown(); }
});

test('report storage failure preserves the committed evaluation response', async () => {
  const api = createExperimentalApi({ environment: 'orca', version: '0.9.6', build: 14,
    invokeRenderer: async operation => operation === 'evaluation' ? { evaluation: { status: 'succeeded', finalScore: 42 } } : {},
    onEvaluationFinished: async () => { throw new Error('disk unavailable'); } });
  try {
    const settings = await api.enable();
    const response = await fetch(`http://${settings.host}:${settings.port}/experimental/v1/evaluation`, { headers: { Authorization: `Bearer ${settings.token}` } });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.evaluation.finalScore, 42);
    assert.equal(result.error, undefined);
    assert.equal(result.reportError.code, 'report_write_failed');
  } finally { await api.shutdown(); }
});
