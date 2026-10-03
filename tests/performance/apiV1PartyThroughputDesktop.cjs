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
const heavy=process.env.BOKEMO_BENCHMARK_HEAVY==='1';
const storeModule=require('./desktop/api-account-store.cjs');const originalStoreFactory=storeModule.createApiAccountStore;let storeMetrics={calls:0,ms:0,lastControlBytes:0};storeModule.createApiAccountStore=(options)=>{const value=originalStoreFactory(options),commit=value.commit;value.commit=(...args)=>{const started=performance.now();try{return commit(...args);}finally{storeMetrics.calls++;storeMetrics.ms+=performance.now()-started;if(typeof args[2]==='string')storeMetrics.lastControlBytes=Buffer.byteLength(args[2]);}};return value;};const {createApiAccountStore}=storeModule;
const store=createApiAccountStore({userDataPath:userData});
const recipes=require('./recipes.cjs');
buildSync({entryPoints:[path.join(root,'src/game/storageCompression.ts')],outfile:path.join(root,'codec.cjs'),bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
const codec=require('./codec.cjs');
const contract=require('./desktop/api-v1-contract.json');
const byId=new Map(contract.operations.map(o=>[o.operationId,o]));
const baselineControl={revisionHighWater:0,inGameTime:fixedNow,rngState:0xa91f0028,receipts:[],tombstones:[],confirmations:[],popupEvents:[],deliveries:[]};
const deliveryServer=http.createServer((req,res)=>{res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type');if(req.method==='OPTIONS'){res.end();return;}req.resume();req.on('end',()=>{res.end('{}');});});
const rows=[];
const outputReport={metadata:{source:process.env.BOKEMO_BENCHMARK_SOURCE,mirror:root,userData,sourceVersion:require('./package.json').version,sourceBuild:fs.readFileSync(path.join(root,'build_number.txt'),'utf8').trim(),operations:contract.operations.length,environment,samples,warmups,fixtureNames,heavy,timing:'real Desktop HTTP request/response, headless API account; controlled local delivery recipient; long-lived account per fixture; no per-call resets; growing receipts',hardware:{model:os.cpus()[0]?.model,cores:os.cpus().length,totalMemoryBytes:os.totalmem()},electron:process.versions.electron,chromium:process.versions.chrome,time:new Date().toISOString()},rows};
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
   const reads=Number(process.env.BOKEMO_PARTY_READS),cycles=Number(process.env.BOKEMO_PARTY_CYCLES),noops=Number(process.env.BOKEMO_PARTY_NOOPS),replays=Number(process.env.BOKEMO_PARTY_REPLAYS);
   outputReport.metadata.workload={reads,cycles,noops,replays};
   for(const fixture of fixtureNames){
    const seedData=process.env.BOKEMO_PARTY_SEED?JSON.parse(fs.readFileSync(process.env.BOKEMO_PARTY_SEED,'utf8')):null;
    store.commit(identity,seedData?.savePayload??fixturePayload(fixture,s=>{s.parties[0].characters[1].isUnique=false;for(const key of ['fort','ward','shade','might','arcana','focus']){s.global.jewels[key+':1']=1000;s.global.jewels[key+':2']=1000;}s.global.prana=1e9;}),seedData?.control??structuredClone(baselineControl));
    const client=new Client();if(seedData)client.sequence=seedData.control.receipts.length;await client.logIn();
    const party=await client.read('read/build/party/{p}',{p:1});const characterId=party.current.order[0],editableId=party.current.order[1],characterPath={characterId};
    let lastCommit;let order=[...party.current.order];let total=0;
    await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.resetSeed();window.__PARTY_GAPS__=[];window.__PARTY_LAST__=performance.now();window.__PARTY_TIMER__=setInterval(()=>{let n=performance.now();window.__PARTY_GAPS__.push(n-window.__PARTY_LAST__);window.__PARTY_LAST__=n;},16);');
    const initial=await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.snapshot()');
    const itemId=initial.state.parties[0].characters.find(c=>c.id===characterId).equipment[1].id;const initialCategory=recipes.getItemById(itemId).category;const jewelKey={armor:'fort',robe:'fort',shield:'fort',sword:'fort',katana:'might',gauntlet:'fort',arrow:'might',bolt:'fort',archery:'fort',wand:'arcana',grimoire:'fort',catalyst:'fort'}[initialCategory];assert.ok(jewelKey,initialCategory);
    const initialStore=store.load(identity);storeMetrics={calls:0,ms:0,lastControlBytes:0};await window.webContents.executeJavaScript('window.__PARTY_TIMINGS__?.take()');const workflowStart=performance.now(),cpuStart=process.cpuUsage();let windowStart=workflowStart,pauseMs=0;const checkpointCpu={user:0,system:0};
    async function checkpoint(phase){
     const pauseStart=performance.now(),pauseCpu=process.cpuUsage();
     const snapshot=await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.snapshot()');const durable=store.load(identity);
     rows.push({kind:'checkpoint',fixture,phase,total,elapsedMs:pauseStart-workflowStart-pauseMs,windowElapsedMs:pauseStart-windowStart,mainStoreProfile:{...storeMetrics},rendererProfile:await window.webContents.executeJavaScript('window.__PARTY_TIMINGS__?.take()??{}'),revision:snapshot.control.revisionHighWater,receipts:snapshot.control.receipts.length,controlBytes:Buffer.byteLength(JSON.stringify(snapshot.control)),savePayloadBytes:Buffer.byteLength(durable.savePayload),stateHash:hash(snapshot.state),persistedStateHash:hash(codec.decodePersistedState(durable.savePayload)),rngState:snapshot.control.rngState,controlHash:hash(snapshot.control)});save();const used=process.cpuUsage(pauseCpu);checkpointCpu.user+=used.user;checkpointCpu.system+=used.system;pauseMs+=performance.now()-pauseStart;windowStart=performance.now();storeMetrics={calls:0,ms:0,lastControlBytes:storeMetrics.lastControlBytes};
    }
    async function request(phase,id,options={},kind='read'){
     let r;
     if(kind==='commit'){r=await client.commitOk(id,options);lastCommit={id,options,body:r.replayBody,response:r.body};}
     else if(kind==='replay'){r=await client.send(lastCommit.id,{path:lastCommit.options.path,body:lastCommit.body});assert.deepEqual(r.body.data,lastCommit.response.data);assert.equal(r.body.revision,lastCommit.response.revision);}
     else r=await client.send(id,options);
     assert.equal(r.status,200,JSON.stringify(r.body));total++;
     rows.push({kind:'request',fixture,phase,index:total,operationId:id,wallMs:r.wallMs,responseBytes:r.responseBytes,revision:r.body.revision,outputHash:hash(r.body.data??r.bytes),confirmationChallengeMs:r.confirmationChallengeMs||0});
     if(total%100===0){console.log(JSON.stringify({fixture,phase,total,wallMs:r.wallMs,revision:r.body.revision}));await checkpoint(phase);}
     return r.body.data;
    }
    const readCases=[['read/observation/party',{}],['read/build/party/{p}',{path:{p:1}}],...['status','equipment','equipmentSet','equipmentEvaluation'].map(name=>['read/build/character/{characterId}/'+name,{path:characterPath,...(name==='equipmentEvaluation'?{query:{equipmentChanges:'1=0'}}:{})}])];
    for(let i=0;i<reads;i++){const[id,options]=readCases[i%readCases.length];await request('sameRevisionReads',id,options);}
    assert.deepEqual(await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.snapshot()'),initial);assert.deepEqual(store.load(identity),initialStore);await checkpoint('sameRevisionReadsEnd');
    for(let cycle=0;cycle<cycles;cycle++){
     for(const[id,options]of readCases)await request('actualMutations',id,options);
     await request('actualMutations','commit/build/character/{characterId}/changeBuild',{path:{characterId:editableId},parameters:{name:cycle%2?'PartyBenchA':'PartyBenchB',simulation:true}},'commit');
     [order[0],order[1]]=[order[1],order[0]];await request('actualMutations','commit/build/party/{p}',{path:{p:1},parameters:{order}},'commit');
     await request('actualMutations','commit/build/character/{characterId}/changeBuild',{path:{characterId:editableId},parameters:{name:cycle%2?'PartyBenchA':'PartyBenchB',simulation:false}},'commit');
     const ops=[['jewelAttach',{targetEquipment:1,jewelToSet:jewelKey+':1'}],['jewelRemove',{targetEquipment:1}],['removeEquipment',{targetEquipment:1}],['undoEquipment',{}],['redoEquipment',{}],['undoEquipment',{}]];
     for(const[name,parameters]of ops)await request('actualMutations','commit/build/character/{characterId}/'+name,{path:characterPath,parameters},'commit');
     const set=await request('actualMutations','commit/build/character/{characterId}/saveEquipmentSet',{path:characterPath,parameters:{equipmentSet:{name:'PartyBench'}}},'commit');
     const equipmentSetId=set.equipmentSetId;
     for(const[name,parameters]of [['renameEquipmentSet',{equipmentSetId,name:'PartyBenchRenamed'}],['loadEquipmentSet',{equipmentSetId}],['deleteEquipmentSet',{equipmentSetId}]])await request('actualMutations','commit/build/character/{characterId}/'+name,{path:characterPath,parameters},'commit');
    }
    await checkpoint('actualMutationsEnd');
    const noopBefore=await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.snapshot()');const noopStoreBefore=store.load(identity).savePayload;
    for(let i=0;i<noops;i++)await request('noOpCommits','commit/build/party/{p}',{path:{p:1},parameters:{order}},'commit');
    const noopAfter=await window.webContents.executeJavaScript('window.__BOKEMO_API_BENCHMARK__.snapshot()');assert.deepEqual(noopAfter.state,noopBefore.state);assert.equal(store.load(identity).savePayload,noopStoreBefore);await checkpoint('noOpCommitsEnd');
    const replayBefore=store.load(identity);
    for(let i=0;i<replays;i++)await request('receiptReplays',lastCommit.id,{},'replay');
    assert.deepEqual(store.load(identity),replayBefore);await checkpoint('receiptReplaysEnd');
    const gaps=await window.webContents.executeJavaScript('clearInterval(window.__PARTY_TIMER__);window.__BOKEMO_API_BENCHMARK__.stopSeed();window.__PARTY_GAPS__');
    rows.push({kind:'workflow',fixture,total,wallMs:performance.now()-workflowStart-pauseMs,instrumentationWallMs:pauseMs,cpuMicros:process.cpuUsage(cpuStart),checkpointCpuMicros:checkpointCpu,maximumRendererGapMs:Math.max(...gaps),rendererGapSamples:gaps.length,initialStateHash:hash(initial.state),initialPersistedHash:hash(codec.decodePersistedState(initialStore.savePayload))});save();await client.logOut();
   }
   save();console.log('BENCHMARK_DONE '+output);clearTimeout(timeout);await window.webContents.executeJavaScript('window.bokemoDesktop.setApiV1Enabled(false)');deliveryServer.close();app.quit();
  }catch(error){console.error('BENCHMARK_FAILED',error.stack||error);save();clearTimeout(timeout);deliveryServer.close();app.exit(1);}
 });
});
// Test runs start the app hidden (macOS) so repeated launches do not flash windows.
if (!process.argv.includes('--hidden')) process.argv.push('--hidden');
require('./desktop/main.cjs');
