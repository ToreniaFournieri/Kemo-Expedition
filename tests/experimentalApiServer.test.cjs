const assert = require('node:assert/strict');
const test = require('node:test');
const { createExperimentalApi } = require('../desktop/experimental-api.cjs');

test('Experimental AI API enforces authentication and an exclusive lease', async () => {
  let controlled = false;
  const api = createExperimentalApi({
    environment: 'dev',
    version: '0.9.1',
    build: 42,
    invokeRenderer: async (operation) => {
      if (operation === 'status') return { status: 'ready', revision: 7 };
      if (operation === 'set-control') {
        controlled = true;
        return { status: 'ready', revision: 7 };
      }
      if (operation === 'observation') return { observation: { revision: 7 } };
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

  const released = await fetch(`${origin}/experimental/v1/control/release`, { method: 'POST', headers: { ...leaseHeaders, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(released.status, 200);
  assert.equal(controlled, false);
  assert.equal((await released.json()).runtime.controlStatus, 'available');

  await api.disable();
});
