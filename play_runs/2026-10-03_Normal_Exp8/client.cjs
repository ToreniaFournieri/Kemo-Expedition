const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = process.env.BOKEMO_ARTIFACT_DIR || __dirname;
const privatePath = process.env.BOKEMO_CLIENT_STATE || '/tmp/bokemo-normal-client.json';
const descriptorPath = process.env.BOKEMO_PLAY_DESCRIPTOR || '/tmp/bokemo-normal-descriptor.json';
const identity = {userId:process.env.BOKEMO_REPLAY_USER_ID || 'CodexN8Oct03', environment:'prod', gameMode:'normal'};
function scrub(value) {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,/token/i.test(k) ? '<redacted>' : scrub(v)]));
}
class Client {
  constructor() {
    fs.mkdirSync(root,{recursive:true});
    this.artifactDir=root;
    this.descriptor = JSON.parse(fs.readFileSync(descriptorPath,'utf8'));
    this.state = fs.existsSync(privatePath) ? JSON.parse(fs.readFileSync(privatePath,'utf8')) : {revision:0,calls:0};
    this.phase = 'setup';
  }
  save() {fs.writeFileSync(privatePath, JSON.stringify(this.state), {mode:0o600});}
  async call(route, parameters, method) {
    method ||= route.startsWith('commit/') || route.startsWith('fundamental/') && route !== 'fundamental/status' || route.endsWith('simulationRun') ? 'POST' : 'GET';
    const headers = {Authorization:`Bearer ${this.descriptor.token}`};
    if (this.state.sessionToken) headers['X-BoKemo-Session'] = this.state.sessionToken;
    if (this.state.controlLeaseToken) headers['X-BoKemo-Control-Lease'] = this.state.controlLeaseToken;
    let body;
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
      body = route.startsWith('commit/') ? {expectedRevision:this.state.revision,idempotencyKey:crypto.randomUUID(),parameters:parameters || {}} : parameters || {};
    }
    const startedAt = new Date().toISOString(), start = performance.now();
    const response = await fetch(this.descriptor.endpoint+'/'+route,{method,headers,body:body ? JSON.stringify(body) : undefined});
    const bytes = new Uint8Array(await response.arrayBuffer());
    const durationMs = performance.now()-start;
    const output = response.headers.get('content-type')?.includes('application/json') ? JSON.parse(new TextDecoder().decode(bytes)) : {binaryBytes:bytes.length};
    if (route === 'commit/setting/backup/export' && response.ok) {
      const filename=this.phase.startsWith('final')?'final-save.bokemo':`checkpoint-${this.state.calls+1}.bokemo`;
      fs.writeFileSync(path.join(root,filename),bytes);
      output.artifact=filename;
      output.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
      output.revision=Number(response.headers.get('x-bokemo-revision'));
    }
    this.state.calls++;
    if (typeof output.revision === 'number') this.state.revision=output.revision;
    if (output.error?.details?.currentRevision != null) this.state.revision=output.error.details.currentRevision;
    if (route === 'fundamental/logIn' && response.ok) Object.assign(this.state, output.data);
    this.save();
    const record = {index:this.state.calls,phase:this.phase,startedAt,method,route,input:scrub(body || null),durationMs,status:response.status,responseBytes:bytes.length,revision:output.revision,output:scrub(output)};
    fs.appendFileSync(path.join(root,'api-calls.jsonl'),JSON.stringify(record)+'\n');
    fs.appendFileSync(path.join(root,'batch-inputs.jsonl'),JSON.stringify({index:record.index,phase:record.phase,method,route,input:record.input,durationMs,status:record.status})+'\n');
    if (!response.ok) throw Object.assign(new Error(JSON.stringify(output)),{record});
    return output.data ?? output;
  }
  async login() {return this.call('fundamental/logIn',{...identity,headless:true});}
  async read(route) {return this.call(route);}
  async commit(route,p={}) {return this.call('commit/'+route,p);}
  async steps(count=1,seconds=43200) {
    for(let i=0;i<count;i++) {
      const d=await this.commit('progress/elapsed',{elapsedSeconds:seconds});
      console.log(JSON.stringify({call:this.state.calls,phase:this.phase,...d}));
    }
  }
}
module.exports={Client,identity,scrub};
if (require.main===module) (async()=>{
 const c=new Client(); c.phase=process.env.BOKEMO_PHASE || 'manual';
 const [action,route,raw]=process.argv.slice(2);
 if(action==='init') {console.log(await c.call('fundamental/status'));await c.call('fundamental/signUp', {...identity,language:'en'});console.log(scrub(await c.login()));}
 else if(action==='steps') await c.steps(Number(route),raw?Number(raw):43200);
 else console.log(JSON.stringify(scrub(await c.call(route,raw?JSON.parse(raw):undefined,action==='post'?'POST':'GET')),null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
