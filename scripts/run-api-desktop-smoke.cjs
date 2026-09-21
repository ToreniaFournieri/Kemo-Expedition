const { app } = require('electron');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bokemo-api-v1-smoke-'));
app.setPath('userData', root);
app.getVersion = () => require('../package.json').version;
let tested = false;
const timeout = setTimeout(() => { console.error('SMOKE_TIMEOUT'); app.exit(1); }, 90_000);

app.on('browser-window-created', (_event, window) => {
  if (tested) return;
  window.webContents.once('did-finish-load', async () => {
    if (tested) return;
    try {
      const bridgeType = await window.webContents.executeJavaScript('typeof window.bokemoDesktop');
      if (bridgeType === 'undefined') return;
      assert.equal(bridgeType, 'object');
      tested = true;
      const settings = await window.webContents.executeJavaScript('window.bokemoDesktop.setApiV1Enabled(true)');
      assert.equal(settings.enabled, true);
      assert.equal('token' in settings, false);
      const descriptor = JSON.parse(fs.readFileSync(settings.connectionFile, 'utf8'));
      const bootstrap = { Authorization: `Bearer ${descriptor.token}` };
      const json = { ...bootstrap, 'Content-Type': 'application/json' };
      const call = async (route, options = {}) => {
        const response = await fetch(descriptor.endpoint + route, options);
        const body = await response.json();
        if (!response.ok) throw new Error(`${route}: ${response.status} ${body.error?.code}`);
        return body;
      };
      let status;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try { status = await call('/fundamental/status'); break; }
        catch (error) { if (attempt === 29) throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
      }
      assert.equal(status.apiVersion, 'v1');
      const environment = process.argv.includes('--environment=prod') ? 'prod' : process.argv.includes('--environment=dev') ? 'dev' : 'orca';
      const identity = { userId: 'ApiSmoke', environment, gameMode: environment === 'orca' ? 'orca' : 'normal', ...(environment === 'orca' ? { levelOffsetForOrca: 5 } : {}) };
      await call('/fundamental/signUp', { method: 'POST', headers: json, body: JSON.stringify(identity) });
      let login;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try { login = await call('/fundamental/logIn', { method: 'POST', headers: json, body: JSON.stringify(identity) }); break; }
        catch (error) { if (attempt === 29) throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
      }
      const session = { ...bootstrap, 'X-BoKemo-Session': login.data.sessionToken, 'X-BoKemo-Control-Lease': login.data.controlLeaseToken };
      const overview = await call('/read/observation/overview', { headers: session });
      const committed = await call('/commit/base/changeJewelPriorityParty', { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: overview.revision, idempotencyKey: crypto.randomUUID(), parameters: { partyNumber: 'none' } }) });
      assert.ok(committed.revision >= overview.revision);
      const elapsed = await call('/commit/progress/elapsed', { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: committed.revision, idempotencyKey: crypto.randomUUID(), parameters: { elapsedSeconds: 60 } }) });
      assert.equal(elapsed.data.elapsedSeconds, 60);
      assert.ok(elapsed.revision > committed.revision);
      await call('/fundamental/logOut', { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: '{}' });
      await window.webContents.executeJavaScript('window.bokemoDesktop.setApiV1Enabled(false)');
      assert.equal(fs.existsSync(settings.connectionFile), false);
      console.log(JSON.stringify({ smoke: 'passed', apiVersion: 'v1', operations: 84 }));
      clearTimeout(timeout);
      app.quit();
    } catch (error) {
      console.error('SMOKE_FAILED', error.stack || error.message);
      clearTimeout(timeout);
      app.exit(1);
    }
  });
});

require('../desktop/main.cjs');
