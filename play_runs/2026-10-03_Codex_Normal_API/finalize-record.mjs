import fs from 'node:fs';
import path from 'node:path';
import { runDir } from './client.mjs';

const calls=fs.readFileSync(path.join(runDir,'calls.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
for(let i=0;i<calls.length;i++){
 if(calls[i].call!==i+1)throw new Error('Call ledger is not consecutive');
 if(!fs.existsSync(path.join(runDir,calls[i].responseFile)))throw new Error('Missing recorded response');
}
const params=x=>x.method==='GET'?x.query:x.body?.parameters??x.body??{};
const percentile=(values,fraction)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.max(0,Math.ceil(sorted.length*fraction)-1)]??0;};
const category=x=>x.route.startsWith('/commit/build/')?'build commits':x.route==='/commit/progress/elapsed'?'elapsed commits':x.route.startsWith('/read/observation/')?'observation reads':x.route.endsWith('/searchItems')?'inventory reads':x.route.endsWith('/simulationRun')?'simulation forecasts':x.route.startsWith('/fundamental/')?'fundamental':x.route.includes('/changeExpedition')?'destination commits':'other reads';
const groups=new Map();
for(const call of calls){const name=category(call);if(!groups.has(name))groups.set(name,[]);groups.get(name).push(call);}
const signup=JSON.parse(fs.readFileSync(path.join(runDir,'responses/0001.json')));
const victory=JSON.parse(fs.readFileSync(path.join(runDir,'boss-victory.json')));
const diary=JSON.parse(fs.readFileSync(path.join(runDir,'final-diary.json')));
const entry=diary.diaryInfo.parties[0].entries.find(x=>x.battleLog?.logId===victory.battleLog.logId);
const elapsedCalls=calls.filter(x=>x.route==='/commit/progress/elapsed'&&x.status<400);
const summary={
 account:signup.data.userId,environment:signup.data.environment,gameMode:signup.data.gameMode,
 versionBuild:JSON.parse(fs.readFileSync(path.join(runDir,'final-status.json'))).versionBuild,
 signupAt:signup.observedAt,documentedBossVictoryAt:entry.occurredAt,
 documentedBossVictoryDays:(Date.parse(entry.occurredAt)-Date.parse(signup.observedAt))/86400000,
 verifiedAt:calls.at(-1).inGameTimeAfter,verifiedDays:(Date.parse(calls.at(-1).inGameTimeAfter)-Date.parse(signup.observedAt))/86400000,
 explicitElapsedSeconds:elapsedCalls.reduce((sum,x)=>sum+params(x).elapsedSeconds,0),
 apiCalls:calls.length,apiCallsThroughGoalObservation:447,successfulCalls:calls.filter(x=>x.status<400).length,
 errors:calls.filter(x=>x.status>=400).map(x=>({call:x.call,route:x.route,...x.error})),
 cumulativeApiDurationMs:calls.reduce((sum,x)=>sum+x.durationMs,0),
 medianApiDurationMs:percentile(calls.map(x=>x.durationMs),.5),p95ApiDurationMs:percentile(calls.map(x=>x.durationMs),.95),
 timingDefinition:'Fetch start through response-body receipt; excludes parsing, file writes, tool approvals, offline CPU, installation and idle wall time.',
 boss:{logId:victory.battleLog.logId,enemyId:387,outcome:victory.battleLog.finalOutcome,completedRooms:victory.battleLog.completedRooms,maximumHp:victory.battleLog.maximumPartyHp,remainingHp:victory.battleLog.remainingPartyHp},
 categories:[...groups].map(([name,values])=>({name,calls:values.length,apiDurationMs:values.reduce((sum,x)=>sum+x.durationMs,0),medianMs:percentile(values.map(x=>x.durationMs),.5),p95Ms:percentile(values.map(x=>x.durationMs),.95)})),
 priorReportComparison:{priorVersionBuild:'v0.9.8 (2)',priorDaysApprox:44.8,priorCalls:557,daysReductionPercent:(44.8-(Date.parse(entry.occurredAt)-Date.parse(signup.observedAt))/86400000)/44.8*100,callsReductionPercent:(557-calls.length)/557*100,controlledBenchmark:false}
};
fs.writeFileSync(path.join(runDir,'summary.json'),JSON.stringify(summary,null,2));
const metadata={account:summary.account,environment:summary.environment,gameMode:summary.gameMode,versionBuild:summary.versionBuild,timingDefinition:summary.timingDefinition};
fs.writeFileSync(path.join(runDir,'recorded-run.batch.json'),JSON.stringify({metadata,steps:calls.map(x=>({call:x.call,label:x.label,request:{method:x.method,route:x.route,query:x.query,body:x.body},durationMs:x.durationMs,status:x.status,revision:x.revision,inGameTimeBefore:x.inGameTimeBefore,inGameTimeAfter:x.inGameTimeAfter,error:x.error,responseFile:x.responseFile}))},null,2));
fs.writeFileSync(path.join(runDir,'successful-run.batch.json'),JSON.stringify(calls.filter(x=>x.status<400).map(x=>({route:x.route,parameters:params(x),label:`original call ${x.call}`,originalDurationMs:x.durationMs})),null,2));
const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';
fs.writeFileSync(path.join(runDir,'timings.csv'),[['call','method','route','durationMs','status','revision','inGameTimeAfter'].join(','),...calls.map(x=>[x.call,x.method,x.route,x.durationMs,x.status,x.revision,x.inGameTimeAfter].map(quote).join(','))].join('\n')+'\n');
const batchTimings=[];
for(const name of fs.readdirSync(runDir).filter(x=>/^d\d+-r\d+-(equipment|jewels)\.batch\.json$/.test(x))){
 const revision=Number(/-r(\d+)-/.exec(name)[1]);
 const steps=JSON.parse(fs.readFileSync(path.join(runDir,name)));
 let cursor=calls.findIndex(x=>x.revision>=revision&&x.status<400);
 const measured=steps.map(step=>{
  const index=calls.findIndex((x,i)=>i>=cursor&&x.status<400&&x.route===step.route&&JSON.stringify(params(x))===JSON.stringify(step.parameters??{}));
  if(index<0)return {...step,recordedCall:null,durationMs:null};
  cursor=index+1;return {...step,recordedCall:calls[index].call,durationMs:calls[index].durationMs};
 });
 batchTimings.push({batchFile:name,steps:measured,apiDurationMs:measured.reduce((sum,x)=>sum+(x.durationMs??0),0),matchedCalls:measured.filter(x=>x.recordedCall!==null).length});
}
fs.writeFileSync(path.join(runDir,'batch-timings.json'),JSON.stringify(batchTimings,null,2));
console.log(JSON.stringify(summary,null,2));
