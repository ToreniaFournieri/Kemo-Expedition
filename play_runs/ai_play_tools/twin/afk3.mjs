import {T} from './lib.mjs';
await T.ensureLanguageLoaded('en'); const s0=T.loadSave(process.argv[2]); const p0=s0.parties[0];
const cyc=T.getApproxAfkCycleDurationMs(p0,1,{deityDonations:s0.global.deityDonations});
const opts=(n)=>({partyIndex:0,cycleDurationMs:cyc,cycleDurationScale:1,simulatedCompletedAt:1790000000000,gameMode:'mode.normal',operationCount:n,inventoryStrategy:'immutable',workerOptimization:'optimized',compactBattleResultOutput:false});
function stats(a,b){return ['Clear','Return','Draw','Retreat','Defeat'].map(k=>k+':'+(b.parties[0].expeditionStats[k]-a.parties[0].expeditionStats[k])).join(' ');}
function mk(seed){ let v=seed; return [()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}, (()=>{let b=0n;return ()=>(BigInt(seed)<<32n)|b++;})()]; }
{ const [rnd,bs]=mk(5); const out=T.withBattleSeedSourceForTesting(bs,()=>T.withGameplayRandomSourceForTesting(rnd,()=>T.simulateAfkPartyChunkForWorker(s0,opts(60)))); console.log('single chunk 60:',stats(s0,out)); }
{ const [rnd,bs]=mk(5); let cur=s0; T.withBattleSeedSourceForTesting(bs,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<60;i++) cur=T.simulateAfkPartyChunkForWorker(cur,opts(1)); })); console.log('60 x chunk 1  :',stats(s0,cur)); }
{ const [rnd,bs]=mk(5); let cur=s0; T.withBattleSeedSourceForTesting(bs,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<60;i++) cur=T.simulateAfkPartyChunkForWorker(cur,{...opts(1),workerOptimization:'legacy'}); })); console.log('60 x legacy 1 :',stats(s0,cur)); }
