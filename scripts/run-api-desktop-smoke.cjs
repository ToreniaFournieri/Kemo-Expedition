const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'bokemo-api-smoke-'));
app.setPath('userData', root);
app.getVersion = () => require('../package.json').version;
let tested = false;
const timeout = setTimeout(() => { console.error('SMOKE_TIMEOUT'); app.exit(1); }, 90000);
app.on('browser-window-created', (_event, win) => {
  if (tested) return;
  win.webContents.on('console-message', (event) => { if (/Error|failed|Unable/i.test(event.message)) console.error('RENDERER', event.message.slice(0,500)); });
  win.webContents.on('preload-error', (_event, file, error) => console.error('PRELOAD',file,error.message));
  win.webContents.once('did-finish-load', async () => {
    try {
      const bridge = await win.webContents.executeJavaScript('typeof window.bokemoDesktop');
      console.log('SMOKE_WINDOW',win.id,bridge);
      if (tested || bridge === 'undefined') return; tested = true;
      let settings;
      for (let n=0;n<30;n++) {
        settings = await win.webContents.executeJavaScript('window.bokemoDesktop.getExperimentalApiSettings()');
        if (settings.enabled) break;
        await new Promise(r=>setTimeout(r,100));
      }
      const base = `http://${settings.host}:${settings.port}/experimental/v1`;
      let lease;
      const call = async (endpoint, body, key) => {
        console.log('SMOKE_CALL',endpoint);
        const response = await fetch(base + endpoint, { method: body === undefined ? 'GET' : 'POST', headers: { Authorization: `Bearer ${settings.token}`, ...(lease ? {'X-BoKemo-Control-Lease':lease}:{}), ...(body !== undefined ? {'Content-Type':'application/json'}:{}), ...(key ? {'Idempotency-Key':key}: {}) }, ...(body !== undefined ? {body:JSON.stringify(body)}:{}) });
        const result = await response.json();
        if (!response.ok) throw new Error(`${endpoint}: ${response.status} ${result.error?.code}`);
        return result;
      };
      let acquired;
      for(let n=0;n<30;n++) {
        try { acquired = await call('/control/acquire',{}); break; }
        catch { await new Promise(r=>setTimeout(r,100)); }
      }
      assert.ok(acquired, 'renderer ready'); lease = acquired.lease.token;
      let observed = await call('/observation');
      assert.equal(observed.observation.environment,'orca');
      assert.equal(observed.evaluation.countedApiCalls,1);
      const p = observed.observation.parties[0];
      let revision=observed.observation.revision;
      const preview = await call('/party-preview',{revision,partyId:p.id,configuration:{depthLimit:'1f-3',autoEquip:true}});
      assert.equal(preview.party.expedition.depthLimit,'1f-3');
      const configured = await call('/command',{expectedRevision:revision,command:{type:'configure_party',partyId:p.id,configuration:{depthLimit:'1f-3',autoEquip:true}}},'config');
      revision=configured.observation.revision;
      const forecast=await call('/simulation',{revision,partyId:p.id});
      assert.equal(forecast.simulation.total,1000);
      const batch=await call('/sortie',{expectedRevision:revision,partyId:p.id,count:2},'batch');
      assert.equal(batch.sortie.completedCount,2);
      const replay=await call('/sortie',{expectedRevision:revision,partyId:p.id,count:2},'batch');
      assert.equal(replay.replayed,true);
      assert.equal(replay.evaluation.actualSorties,2);
      assert.equal(replay.evaluation.countedApiCalls,6);
      await call('/control/release',{}); lease=null;
      const summary=await call('/evaluation');
      assert.equal(summary.evaluation.scoreSoFar,62);

      console.log(JSON.stringify({smoke:'passed',calls:6,sorties:2,score:62}));
      clearTimeout(timeout); app.quit();
    } catch(error) { console.error('SMOKE_FAILED',error.message);clearTimeout(timeout);app.exit(1); }
  });
});
require('../desktop/main.cjs');
