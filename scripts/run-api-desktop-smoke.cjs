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
      const environment = process.argv.includes('--environment=prod') ? 'prod' : 'orca';
      assert.equal(observed.observation.environment,environment);
      assert.equal(observed.evaluation.mode, environment === 'prod' ? 'normal' : 'orca');
      assert.equal(observed.evaluation.regulationVersion, 2);
      assert.equal(observed.evaluation.ledger, undefined);
      const status = await call('/status');
      assert.equal(status.capabilities.aiPlay.countedApiCallLimit, 20000);
      const earlyReport = await fetch(base + '/evaluation/report', { headers: { Authorization: `Bearer ${settings.token}` } });
      assert.equal(earlyReport.status, 409);
      assert.equal(observed.evaluation.countedApiCalls,1);
      const p = observed.observation.parties[0];
      let revision=observed.observation.revision;
      const rejected = await fetch(base + '/party-preview', { method: 'POST', headers: { Authorization: `Bearer ${settings.token}`, 'X-BoKemo-Control-Lease': lease, 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, partyId: p.id, configuration: { depthLimit: 'typo' } }) });
      const rejection = await rejected.json();
      assert.equal(rejected.status, 400);
      assert.equal(rejection.error.details.field, 'configuration.depthLimit');
      assert.equal(rejection.error.details.violations[0].code, 'invalid_depth_limit');
      const preview = await call('/party-preview',{revision,partyId:p.id,configuration:{depthLimit:'1f-3',autoEquip:true}});
      assert.equal(preview.party.expedition.depthLimit,'1f-3');
      assert.equal(preview.comparison.maximumHp.before, p.hp.maximum);
      assert.equal(preview.comparison.maximumHp.after, preview.party.hp.maximum);
      assert.equal(preview.comparison.characters.length, p.characters.length);
      const configured = await call('/command',{expectedRevision:revision,command:{type:'configure_party',partyId:p.id,configuration:{depthLimit:'1f-3',autoEquip:true}}},'config');
      revision=configured.observation.revision;
      const forecast=await call('/simulation',{revision,partyId:p.id});
      assert.equal(forecast.simulation.total,1000);
      assert.equal(forecast.comparison.maximumHp.delta, 0);
      assert.ok(forecast.comparison.characters.every(c => c.combatChanges.length === 0 && c.equipmentChanges.length === 0));
      assert.deepEqual(forecast.configuration.characters, configured.observation.parties.find(v => v.id === p.id).characters);
      const compact=await call('/simulation',{revision,partyId:p.id,output:{detail:'hp',candidate:'changes'}});
      assert.equal(compact.revision, revision);
      assert.equal(compact.configuration, undefined);
      assert.deepEqual(compact.comparison, forecast.comparison);
      assert.equal(compact.evaluation.countedApiCalls, forecast.evaluation.countedApiCalls + 1);
      assert.equal(compact.evaluation.actualSorties, forecast.evaluation.actualSorties);
      assert.equal(compact.simulation.rooms.roomCount, 24);
      assert.equal(Object.values(compact.simulation.outcomes).reduce((a,b)=>a+b,0), 1000);
      compact.simulation.rooms.rows.forEach((row, index) => {
        assert.ok(row.slice(1).reduce((a,b)=>a+b,0) <= 1000);
        assert.equal(compact.simulation.hp.successful.rows[index].slice(1).reduce((a,b)=>a+b,0), row[1]+row[2]+row[3]);
        assert.equal(compact.simulation.hp.retreat.rows[index].slice(1).reduce((a,b)=>a+b,0), row[5]);
      });
      console.log('SIMULATION_RESPONSE_BYTES', JSON.stringify({legacy:Buffer.byteLength(JSON.stringify(forecast)), hpChanges:Buffer.byteLength(JSON.stringify(compact))}));
      const batch=await call('/sortie',{expectedRevision:revision,partyId:p.id,count:2},'batch');
      assert.equal(batch.sortie.completedCount,2);
      const replay=await call('/sortie',{expectedRevision:revision,partyId:p.id,count:2},'batch');
      assert.equal(replay.replayed,true);
      assert.equal(replay.evaluation.actualSorties,2);
      assert.equal(replay.evaluation.countedApiCalls,8);
      await call('/control/release',{}); lease=null;
      const summary=await call('/evaluation');
      assert.equal(summary.evaluation.scoreSoFar,82);
      const ledger = await call('/evaluation/ledger');
      assert.equal(ledger.ledger.length, 8);
      assert.equal(ledger.ledger[3].commandType, 'configure_party');
      assert.ok(batch.runs.every(r => typeof r.returnReason === 'string'));

      console.log(JSON.stringify({smoke:'passed',calls:8,sorties:2,score:82}));
      clearTimeout(timeout); app.quit();
    } catch(error) { console.error('SMOKE_FAILED',error.message);clearTimeout(timeout);app.exit(1); }
  });
});
require('../desktop/main.cjs');
