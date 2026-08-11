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
      if (operation === 'status') return { status: 'ready', revision: 7 };
      if (operation === 'set-control') {
        controlled = true;
        return { status: 'ready', revision: 7 };
      }
      if (operation === 'observation') return { observation: { revision: 7 } };
      if (operation === 'latest-battle-log') return { revision: 7, source: { kind: 'latest', diaryEntryId: null }, battleLog: { partyId: payload.partyId } };
      if (operation === 'diary-entries') return { revision: 7, entries: [{ id: '123-abc123' }] };
      if (operation === 'diary-battle-log') return { revision: 7, source: { kind: 'diary', diaryEntryId: payload.diaryEntryId }, battleLog: { partyId: 1 } };
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

  const released = await fetch(`${origin}/experimental/v1/control/release`, { method: 'POST', headers: { ...leaseHeaders, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(released.status, 200);
  assert.equal(controlled, false);
  assert.equal((await released.json()).runtime.controlStatus, 'available');

  await api.disable();
});
