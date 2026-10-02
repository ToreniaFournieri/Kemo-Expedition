const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
// Keep the real Desktop shutdown/expiry path, with only the lease duration shortened for this isolated test.
const apiModule = require('../desktop/api-v1.cjs');
const createApiV1 = apiModule.createApiV1;
apiModule.createApiV1 = options => createApiV1({ ...options, leaseIdleTimeoutMs: 5_000 });

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
      const wasVisible = window.isVisible();
      const paneWindow = BrowserWindow.getAllWindows().find(candidate => candidate !== window && candidate.webContents.getURL().includes('party-progress.html'));
      // A rejected headless request must preserve the player's existing presentation.
      const missing = await fetch(descriptor.endpoint + '/fundamental/logIn', { method: 'POST', headers: json, body: JSON.stringify({ ...identity, userId: 'Missing', headless: true }) });
      assert.equal(missing.status, 404);
      assert.ok(await window.webContents.executeJavaScript('document.getElementById("root").childElementCount > 0'));
      let login;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        try { login = await call('/fundamental/logIn', { method: 'POST', headers: json, body: JSON.stringify({ ...identity, headless: true }) }); break; }
        catch (error) { if (attempt === 29) throw error; await new Promise(resolve => setTimeout(resolve, 100)); }
      }
      const session = { ...bootstrap, 'X-BoKemo-Session': login.data.sessionToken, 'X-BoKemo-Control-Lease': login.data.controlLeaseToken };
      assert.equal(await window.webContents.executeJavaScript('document.getElementById("root").childElementCount'), 0, 'headless login unmounts the entire game presentation');
      assert.equal(window.isVisible(), false, 'headless hides the Desktop window');
      if (paneWindow) {
        assert.equal(paneWindow.isVisible(), false);
        assert.equal(await paneWindow.webContents.executeJavaScript('window.bokemoPartyProgress.getSnapshot()'), null, 'headless clears the Party Progress presentation');
      }
      await window.webContents.executeJavaScript('window.__headlessMutations = 0; window.__headlessObserver = new MutationObserver(records => { window.__headlessMutations += records.length; }); window.__headlessObserver.observe(document.getElementById("root"), { subtree: true, childList: true, attributes: true, characterData: true });');
      const overview = await call('/read/observation/overview', { headers: session });
      const evaluationTargets = ['0/1101/0/0/fort:1', '0/1101/1/0/shade:2'];
      const evaluationQuery = evaluationTargets.map((item) => `targetItems=${encodeURIComponent(item)}`).join('&');
      const evaluation = await call(`/read/build/character/1/equipmentEvaluation?${evaluationQuery}`, { headers: session });
      assert.equal(evaluation.revision, overview.revision, 'equipment evaluation is a revision-neutral read');
      assert.deepEqual(evaluation.data.calculatedItemStatus.map((entry) => entry.item), evaluationTargets);
      const equipmentChanges = ['0=0/1101/0/0/0:0', '0=0'];
      const changeQuery = equipmentChanges.map((change) => `equipmentChanges=${encodeURIComponent(change)}`).join('&');
      const changeEvaluation = await call(`/read/build/character/1/equipmentEvaluation?${changeQuery}`, { headers: session });
      assert.equal(changeEvaluation.revision, overview.revision, 'equipment-change evaluation is a revision-neutral read');
      assert.deepEqual(changeEvaluation.data.calculatedEquipmentChange.map((entry) => entry.change), equipmentChanges);
      const obsoleteEvaluation = await fetch(`${descriptor.endpoint}/commit/build/character/1/equipmentEvaluation`, {
        method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: '{}',
      });
      assert.equal(obsoleteEvaluation.status, 404, 'the obsolete Commit route has no compatibility alias');
      const committed = await call('/commit/base/changeJewelPriorityParty', { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: overview.revision, idempotencyKey: crypto.randomUUID(), parameters: { partyNumber: 'none' } }) });
      assert.ok(committed.revision >= overview.revision);
      const elapsed = await call('/commit/progress/elapsed', { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: committed.revision, idempotencyKey: crypto.randomUUID(), parameters: { elapsedSeconds: 60 } }) });
      assert.equal(elapsed.data.elapsedSeconds, 60);
      assert.ok(elapsed.revision > committed.revision);
      if (paneWindow) assert.equal(await paneWindow.webContents.executeJavaScript('window.bokemoPartyProgress.getSnapshot()'), null, 'headless commits do not update Party Progress');
      assert.equal(await window.webContents.executeJavaScript('window.__headlessMutations'), 0, 'API reads and commits do not update the unmounted UI');
      await window.webContents.executeJavaScript('window.__headlessObserver.disconnect()');
      await call('/fundamental/logOut', { method: 'POST', headers: { ...session, 'Content-Type': 'application/json' }, body: '{}' });
      assert.ok(await window.webContents.executeJavaScript('document.getElementById("root").childElementCount > 0'), 'logout remounts the player presentation');
      assert.equal(window.isVisible(), wasVisible, 'logout restores the prior window visibility');
      const visibleLogin = await call('/fundamental/logIn', { method: 'POST', headers: json, body: JSON.stringify(identity) });
      assert.ok(await window.webContents.executeJavaScript('document.getElementById("root").childElementCount > 0'), 'omitted headless defaults to a visible session');
      assert.equal(visibleLogin.revision, elapsed.revision, 'headless commits survive logout and account reload');
      await call('/fundamental/logOut', { method: 'POST', headers: { ...bootstrap, 'Content-Type': 'application/json', 'X-BoKemo-Session': visibleLogin.data.sessionToken, 'X-BoKemo-Control-Lease': visibleLogin.data.controlLeaseToken }, body: '{}' });
      const expiringLogin = await call('/fundamental/logIn', { method: 'POST', headers: json, body: JSON.stringify({ ...identity, headless: true }) });
      assert.equal(await window.webContents.executeJavaScript('document.getElementById("root").childElementCount'), 0);
      let restoredAfterExpiry = false;
      for (let attempt = 0; attempt < 150; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
        restoredAfterExpiry = await window.webContents.executeJavaScript('document.getElementById("root").childElementCount > 0');
        if (restoredAfterExpiry) break;
      }
      assert.ok(restoredAfterExpiry, 'idle lease expiry durably restores the player presentation');
      assert.equal(window.isVisible(), wasVisible, 'expiry restores the prior window visibility');
      const expiredRead = await fetch(descriptor.endpoint + '/read/observation/overview', { headers: { ...bootstrap, 'X-BoKemo-Session': expiringLogin.data.sessionToken, 'X-BoKemo-Control-Lease': expiringLogin.data.controlLeaseToken } });
      assert.equal(expiredRead.status, 401);
      assert.equal((await expiredRead.json()).error.code, 'control_lease_expired');
      await window.webContents.executeJavaScript('window.bokemoDesktop.setApiV1Enabled(false)');
      assert.equal(fs.existsSync(settings.connectionFile), false);
      console.log(JSON.stringify({ smoke: 'passed', apiVersion: 'v1', operations: 85 }));
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
