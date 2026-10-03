import fs from 'node:fs';
import path from 'node:path';
import { Client, runDir } from './client.mjs';
const file=process.argv[2];
if(!file)throw new Error('Usage: node equipment-test.mjs plan.json [--dry-run]');
const plan=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(plan.candidates)||!plan.candidates.length)throw new Error('plan.candidates must be a nonempty array');
const party=plan.partyNumber??1;
const runs=plan.numberOfRun??1000;
if(!Number.isInteger(runs)||runs<1||runs>1000)throw new Error('numberOfRun must be 1..1000');
for(const candidate of plan.candidates)if(!Array.isArray(candidate.steps)||!candidate.name)throw new Error('Each candidate needs name and steps');
if(process.argv.includes('--dry-run')){
 console.log(JSON.stringify({preconditionCalls:plan.preconditions?2:0,candidates:plan.candidates.map(x=>({name:x.name,calls:x.steps.length+1})),restoreCalls:plan.restoreSteps?.length??0,numberOfRun:runs},null,2));
 process.exit(0);
}
const c=new Client();const results=[];let failure,restoreFailure,attemptedMutation=false;
if(plan.preconditions){
 const partyData=await c.read('observation/party',{partyNumber:party},'equipment test: validate original slots');
 const owned=await c.read('base/searchItems',{state:'owned',details:'all',limit:5000},'equipment test: validate owned replacement items');
 for(const requirement of plan.preconditions.equipment??[]){
  const character=partyData.partyInfo.party.characters.find(x=>x.characterId===requirement.characterId);
  const actual=character?.equipment[requirement.slot];
  if(actual?.split('/').slice(1).join('/')!==requirement.item)throw new Error(`Precondition failed: character ${requirement.characterId} slot ${requirement.slot} changed`);
 }
 for(const requirement of plan.preconditions.ownedItems??[]){
  const actual=owned.items.find(x=>x.split('/').slice(0,4).join('/')===requirement.item);
  if(Number(actual?.split('/')[4]??0)<(requirement.quantity??1))throw new Error(`Precondition failed: ${requirement.item} is not owned in sufficient quantity`);
 }
}
const startedAt=new Date().toISOString();
try {
 for(const candidate of plan.candidates){
  const firstCall=c.state.calls+1,start=performance.now();
  if(candidate.steps.some(x=>x.route.startsWith('/commit/')))attemptedMutation=true;
  await c.batch(candidate.steps);
  const forecast=await c.read(`expedition/${party}/simulationRun`,{numberOfRun:runs},`equipment test: ${candidate.name}`);
  results.push({name:candidate.name,firstCall,lastCall:c.state.calls,durationMs:performance.now()-start,simulatedRevision:forecast.simulatedRevision,seedDomain:forecast.seedDomain,depthLimit:forecast.depthLimit,overviewPercent:forecast.overviewPercent,expectedPerRun:forecast.expectedPerRun});
 }
}catch(error){failure=error;}
finally {
 try {if(attemptedMutation&&plan.restoreSteps?.length)await c.batch(plan.restoreSteps);}catch(error){restoreFailure=error;}
 const recorded=fs.readFileSync(path.join(runDir,'calls.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
 for(const result of results){
  result.requests=recorded.filter(x=>x.call>=result.firstCall&&x.call<=result.lastCall).map(x=>({call:x.call,route:x.route,parameters:x.method==='GET'?x.query:x.body?.parameters??x.body,durationMs:x.durationMs,status:x.status,responseFile:x.responseFile}));
  result.apiDurationMs=result.requests.reduce((sum,x)=>sum+x.durationMs,0);
 }
 fs.writeFileSync(path.join(runDir,'equipment-test-results.json'),JSON.stringify({startedAt,endedAt:new Date().toISOString(),results,error:failure?.message??null,restorationAttempted:attemptedMutation&&Boolean(plan.restoreSteps?.length),restoreError:restoreFailure?.message??null},null,2));
}
if(failure)throw failure;
if(restoreFailure)throw restoreFailure;
console.log(JSON.stringify(results,null,2));
