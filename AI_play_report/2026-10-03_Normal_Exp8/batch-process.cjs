// Replay a recorded batch against an explicitly selected disposable API profile.
// Default is an offline validation, so inspecting this file never advances a game.
const fs=require('node:fs');
process.env.BOKEMO_ARTIFACT_DIR ||= '/tmp/bokemo-replay-'+Date.now();
const {Client}=require('./client.cjs');
const filename=process.argv.find(x=>x.endsWith('.jsonl'))||__dirname+'/batch-inputs.jsonl';
const phase=process.argv.find(x=>x.startsWith('--phase='))?.slice(8);
const execute=process.argv.includes('--execute');
const recorded=fs.readFileSync(filename,'utf8').trim().split('\n').map(JSON.parse).filter(x=>!phase||x.phase===phase);
// A historical failure is evidence, not a useful equipment mutation to replay.
const calls=recorded.filter(x=>!execute||process.argv.includes('--include-failed')||x.status===200);
if(execute&&(!process.env.BOKEMO_CLIENT_STATE||!process.env.BOKEMO_PLAY_DESCRIPTOR))throw new Error('Set BOKEMO_CLIENT_STATE and BOKEMO_PLAY_DESCRIPTOR for the disposable replay profile.');
(async()=>{
 const c=execute?new Client():null;
 const measurements=[];
 for(const x of calls){
  if(!['GET','POST'].includes(x.method)||!x.route||!Number.isFinite(x.durationMs)||x.durationMs<0)throw new Error('Invalid recorded request at index '+x.index);
  if(x.route.startsWith('commit/')&&(!x.input||typeof x.input.parameters!=='object'))throw new Error('Invalid commit envelope at index '+x.index);
  if(!execute)continue;
  c.phase='replay:'+x.phase;
  if(x.route==='fundamental/logIn')await c.login();
  else if(x.route==='fundamental/signUp'){
   const userId=process.env.BOKEMO_REPLAY_USER_ID;
   if(!userId)throw new Error('BOKEMO_REPLAY_USER_ID is required for signup replay.');
   await c.call(x.route,{...x.input,userId},x.method);
  }
  else await c.call(x.route,x.route.startsWith('commit/')?x.input.parameters:x.input??undefined,x.method);
  const latest=JSON.parse(fs.readFileSync(c.artifactDir+'/api-calls.jsonl','utf8').trim().split('\n').at(-1));
  measurements.push({sourceIndex:x.index,route:x.route,baselineMs:x.durationMs,replayMs:latest.durationMs});
 }
 if(execute)fs.writeFileSync(process.env.BOKEMO_REPLAY_OUTPUT||'/tmp/bokemo-replay-timings.json',JSON.stringify(measurements,null,2));
 console.log(JSON.stringify({mode:execute?'executed':'validated-offline',calls:calls.length,skippedFailedCalls:recorded.length-calls.length,recordedTotalMs:calls.reduce((sum,x)=>sum+x.durationMs,0),phase:phase||'all'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
