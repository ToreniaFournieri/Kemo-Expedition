const {app}=require('electron');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const http=require('node:http');
const {buildSync}=require('esbuild');
const root=__dirname;
const userData=fs.mkdtempSync(path.join(os.tmpdir(),'bokemo-api-benchmark-data-'));
app.setPath('userData',userData);app.getVersion=()=>require('./package.json').version;
const environment=process.env.BOKEMO_BENCHMARK_ENVIRONMENT||'prod';
const identity={userId:'ApiBenchmark',environment,gameMode:'normal'};
const fixedNow=Date.UTC(2030,0,1);
const samples=Number(process.env.BOKEMO_BENCHMARK_SAMPLES||3),warmups=Number(process.env.BOKEMO_BENCHMARK_WARMUPS||1);
const output=process.env.BOKEMO_BENCHMARK_OUTPUT;
const fixtureNames=(process.env.BOKEMO_BENCHMARK_FIXTURES||'fresh').split(',');
const only=process.env.BOKEMO_BENCHMARK_ONLY?new RegExp(process.env.BOKEMO_BENCHMARK_ONLY):null;
const heavy=process.env.BOKEMO_BENCHMARK_HEAVY==='1';
const {createApiAccountStore}=require('./desktop/api-account-store.cjs');
const store=createApiAccountStore({userDataPath:userData});
const recipes=require('./recipes.cjs');
buildSync({entryPoints:[path.join(root,'src/game/storageCompression.ts')],outfile:path.join(root,'codec.cjs'),bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const codec=require('./codec.cjs');
const contract=require('./desktop/api-v1-contract.json');
const byId=new Map(contract.operations.map(o=>[o.operationId,o]));
const baselineControl={revisionHighWater:0,inGameTime:fixedNow,rngState:0xa91f0028,receipts:[],tombstones:[],confirmations:[],popupEvents:[],deliveries:[]};
const deliveryServer=http.createServer((req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS'){res.end();return;}req.resume();req.on('end',()=>{res.end('{}');});});
const rows=[];
const outputReport={metadata:{source:process.env.BOKEMO_BENCHMARK_SOURCE,mirror:root,userData,sourceVersion:require('./package.json').version,sourceBuild:fs.readFileSync(path.join(root,'build_number.txt'),'utf8').trim(),operations:contract.operations.length,environment,samples,warmups,fixtureNames,heavy,timing:'real Desktop HTTP request/response, headless API account; controlled local delivery recipient; fresh account reset before each call',hardware:{model:os.cpus()[0]?.model,cores:os.cpus().length,totalMemoryBytes:os.totalmem()},electron:process.versions.electron,chromium:process.versions.chrome,time:new Date().toISOString()},rows};
function canonical(v){return Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;}
function hash(v){return crypto.createHash('sha256').update(typeof v==='string'?v:JSON.stringify(canonical(v??null))).digest('hex');}
function save(){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(outputReport,null,2));}
let ready=false;const timeout=setTimeout(()=>{console.error('BENCHMARK_TIMEOUT');save();app.exit(1);},1800000);
function fixturePayload(name,variant){
 let state;
 if(name==='fresh')state=recipes.matrixSave(variant);
 else{const filename=name==='d8'?'ALL_Exp8_v0.9.3_dev_20260816.kemoz':'Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz';state=JSON.parse(codec.decodePersistedState(JSON.parse(fs.readFileSync(path.join(root,'sample_savedata',filename),'utf8')).saveDataCompressed));state.global.gold=Math.max(state.global.gold,1000000);state.global.prana=Math.max(state.global.prana,10000);variant?.(state);}
 return codec.encodeStoredStateSync(JSON.stringify(state));
}
store.create(identity,fixturePayload('fresh'));
app.on('browser-window-created',(_event,window)=>{
 if(ready)return;
 window.webContents.once('did-finish-load',async()=>{
  if(ready)return;
  try{
   if(await window.webContents.executeJavaScript('typeof window.bokemoDesktop')!=='object')return;
   ready=true;
   await new Promise(resolve=>deliveryServer.listen(0,'127.0.0.1',resolve));
   await window.webContents.executeJavaScript(`window.__BENCHMARK_DELIVERY_URL__=${JSON.stringify('http://127.0.0.1:'+deliveryServer.address().port+'/delivery')}`);
   const settings=await window.webContents.executeJavaScript('window.bokemoDesktop.setApiV1Enabled(true)');
   const descriptor=JSON.parse(fs.readFileSync(settings.connectionFile,'utf8'));
   class Client{
    revision=0;headers={Authorization:`Bearer ${descriptor.token}`,Connection:'close'};sequence=0;
    async send(id,{path:params={},query={},body,files}={}){
     const op=byId.get(id),url=new URL(descriptor.endpoint+op.path.replace(/^\/api\/v1/,'').replace(/\{([^}]+)\}/g,(_,n)=>encodeURIComponent(params[n])));
     for(const[k,v]of Object.entries(query))for(const x of Array.isArray(v)?v:[v])url.searchParams.append(k,typeof x==='string'?x:JSON.stringify(x));
     let payload;const headers={...this.headers};
     if(op.method==='POST'){
      if(['commit/setting/backup/import','commit/setting/feedback'].includes(id)){const form=new FormData();form.append('metadata',JSON.stringify(body||{}));for(const[k,f]of Object.entries(files||{}))form.append(k,new Blob([f.bytes],{type:f.type}),k);payload=form;}
      else{headers['Content-Type']='application/json';payload=JSON.stringify(body||{});}
     }
     const began=performance.now();const response=await fetch(url,{method:op.method,headers,body:payload});
     if(id==='read/observation/popupEventStream'){
      const wallMs=performance.now()-began;const reader=response.body.getReader();await reader.cancel();return{status:response.status,body:{revision:this.revision},wallMs,responseBytes:0};
     }
     const bytes=new Uint8Array(await response.arrayBuffer()),type=response.headers.get('content-type')||'';
     const data=type.startsWith('application/octet-stream')?{revision:Number(response.headers.get('x-bokemo-revision'))}:JSON.parse(new TextDecoder().decode(bytes));
     if(response.ok&&typeof data.revision==='number')this.revision=data.revision;
     return{status:response.status,body:data,bytes:type.startsWith('application/octet-stream')?bytes:undefined,wallMs:performance.now()-began,responseBytes:bytes.byteLength};
    }
    async logIn(){const r=await this.send('fundamental/logIn',{body:{...identity,headless:true}});assert.equal(r.status,200,JSON.stringify(r.body));this.headers['X-BoKemo-Session']=r.body.data.sessionToken;this.headers['X-BoKemo-Control-Lease']=r.body.data.controlLeaseToken;return r;}
    async logOut(){const r=await this.send('fundamental/logOut',{body:{}});assert.equal(r.status,200,JSON.stringify(r.body));return r;}
    async read(id,p={},query={}){const r=await this.send(id,{path:p,query});assert.equal(r.status,200,JSON.stringify(r.body));return r.body.data;}
    async commitOk(id,request,key=`benchmark-${String(++this.sequence).padStart(16,'0')}`){
     let body={expectedRevision:this.revision,idempotencyKey:key,parameters:request.parameters||{}};
     let r=await this.send(id,{path:request.path,body,files:request.files});let challengeMs=0;
     if(r.body.error?.code==='confirmation_required'){challengeMs=r.wallMs;const d=r.body.error.details;body={...body,confirmationToken:d.confirmationToken,parameters:{...body.parameters,...(d.choiceField?{[d.choiceField]:d.allowedChoices[0]}:{})}};r=await this.send(id,{path:request.path,body,files:request.files});}
     assert.equal(r.status,200,`${id} ${JSON.stringify(r.body)}`);return{...r,confirmationChallengeMs:challengeMs,sent:request,replayBody:body};
    }
   }
   const probe=new Client();for(let i=0;i<60;i++){try{const status=await probe.send('fundamental/status');assert.equal(status.status,200);break;}catch(e){if(i===59)throw e;await new Promise(r=>setTimeout(r,100));}}
   const selected=contract.operations.filter(o=>!only||only.test(o.operationId));
   const cases=selected.map(o=>({id:o.operationId,label:o.operationId}));
   if(heavy){
    for(const id of ['read/observation','read/observation/compact'])if(!only||only.test(id))cases.push({id,label:id+' quick=false',query:{quick:false}});
    if(!only||only.test('read/expedition/{p}/simulationRun'))cases.push({id:'read/expedition/{p}/simulationRun',label:'simulationRun1000',body:{numberOfRun:1000}});
    if(!only||only.test('commit/progress/elapsed'))for(const seconds of[3600,43200])cases.push({id:'commit/progress/elapsed',label:'elapsed'+seconds,parameters:{elapsedSeconds:seconds}});
    if(!only||only.test('read/base/searchItems'))cases.push({id:'read/base/searchItems',label:'searchItems5000',query:{state:'owned',details:'all',limit:5000}});
   }
   for(const fixtureName of fixtureNames)for(const item of cases){
    const id=item.id,recipe=id.startsWith('commit/')?recipes.commitFixtures[id]:recipes.readFixtures[id]||{};
    if(recipe?.environment&&recipe.environment!==environment){rows.push({operationId:id,label:item.label,fixture:fixtureName,skipped:'requires '+recipe.environment+' Desktop environment'});save();continue;}
    for(let sample=-warmups;sample<samples;sample++){
     const client=new Client();let loggedIn=false;
     try{
      store.commit(identity,fixturePayload(fixtureName,recipe?.save),structuredClone(baselineControl));
      if(id==='fundamental/signUp'){
       const r=await client.send(id,{body:{...identity,userId:`Sign${fixtureName}${sample+warmups}`.slice(0,16)}});assert.equal(r.status,200,JSON.stringify(r.body));rows.push({operationId:id,label:item.label,fixture:fixtureName,sample,warmup:sample<0,status:r.status,wallMs:r.wallMs,responseBytes:r.responseBytes});save();continue;
      }
      if(id!=='fundamental/logIn'){await client.logIn();loggedIn=true;}
      if(recipe?.prepare)await recipe.prepare(client);
      const request=id.startsWith('commit/')?await recipe.request(client):null;
      const params=id.startsWith('commit/')?request.path:await recipe?.path?.(client)||{};
      await new Promise(r=>setTimeout(r,40));
      await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.resetSeed();window.__API_GAPS__=[];window.__API_TLAST__=performance.now();window.__API_INTERVAL__=setInterval(()=>{let n=performance.now();window.__API_GAPS__.push(n-window.__API_TLAST__);window.__API_TLAST__=n;},16);');
      const before=await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.snapshot()');
      const beforeStore=store.load(identity);let r;
      if(id==='fundamental/logIn'){r=await client.logIn();loggedIn=true;}
      else if(id==='fundamental/logOut'){r=await client.logOut();loggedIn=false;}
      else if(id.startsWith('commit/'))r=await client.commitOk(id,{...request,parameters:item.parameters||request.parameters});
      else r=await client.send(id,{path:params,query:item.query||recipe.query,body:item.body});
      assert.equal(r.status,200,`${id} ${JSON.stringify(r.body)}`);
      const after=await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.snapshot()');
      const gaps=await window.webContents.executeJavaScript('clearInterval(window.__API_INTERVAL__);window.__BOKEMO_API_BENCHMARK__.stopSeed();window.__API_GAPS__');
      const afterStore=store.load(identity);
      let readOnlyVerified=null;
      if(!id.startsWith('commit/')&&!id.startsWith('fundamental/')){assert.deepEqual(after,before,`${id} live snapshot mutation`);assert.deepEqual(afterStore,beforeStore,`${id} persisted snapshot mutation`);readOnlyVerified=true;}
      const record={operationId:id,label:item.label,fixture:fixtureName,sample,warmup:sample<0,status:r.status,wallMs:r.wallMs,responseBytes:r.responseBytes,confirmationChallengeMs:r.confirmationChallengeMs||0,maximumRendererGapMs:Math.max(0,...gaps),previousRevision:before.control.revisionHighWater,revision:r.body.revision,readOnlyVerified,inputHash:hash(before),outputHash:hash(r.body.data??r.bytes),stateHash:hash(after.state),rngState:after.control.rngState,persistedStateHash:hash(codec.decodePersistedState(afterStore.savePayload)),battleTelemetry:await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.telemetry()'),parameterSummary:item.parameters||item.body||item.query||request?.parameters||recipe.query||{},responseSummary:id.endsWith('/simulationRun')?{runs:r.body.data.runs,simulatedRevision:r.body.data.simulatedRevision}:undefined};
      if(id==='commit/progress/elapsed'){const replay=await client.send(id,{path:request.path,body:r.replayBody,files:request.files});assert.equal(replay.status,200);assert.equal(replay.body.revision,r.body.revision);assert.deepEqual(replay.body.data,r.body.data);assert.deepEqual(store.load(identity),afterStore);record.receiptReplayVerified=true;}
      rows.push(record);save();console.log(JSON.stringify({id:item.label,fixture:fixtureName,sample,wallMs:r.wallMs,status:r.status,responseBytes:r.responseBytes}));
     }catch(error){rows.push({operationId:id,label:item.label,fixture:fixtureName,sample,warmup:sample<0,error:String(error.stack||error)});save();console.error('CASE_FAILED',id,String(error));}
     finally{if(loggedIn)try{await client.logOut();}catch(error){console.error('LOGOUT_FAILED',String(error));}}
    }
   }
   save();console.log('BENCHMARK_DONE '+output);clearTimeout(timeout);await window.webContents.executeJavaScript('window.bokemoDesktop.setApiV1Enabled(false)');deliveryServer.close();app.quit();
  }catch(error){console.error('BENCHMARK_FAILED',error.stack||error);save();clearTimeout(timeout);deliveryServer.close();app.exit(1);}
 });
});
// Test runs start the app hidden (macOS) so repeated launches do not flash windows.
if (!process.argv.includes('--hidden')) process.argv.push('--hidden');
require('./desktop/main.cjs');
