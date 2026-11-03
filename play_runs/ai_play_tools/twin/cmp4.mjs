import {T} from './lib.mjs';
await T.ensureLanguageLoaded('en'); const s0=T.loadSave(process.argv[2]); const N=+(process.argv[3]||300);
const p0=s0.parties[0]; const cyc=T.getApproxAfkCycleDurationMs(p0,1,{deityDonations:s0.global.deityDonations});
function mk(seed){ let v=seed; return [()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}, (()=>{let b=0n;return ()=>(BigInt(seed)<<32n)|b++;})()]; }
function tally(f){ const c={}; f(c); return JSON.stringify(c); }
for(const seed of [21,22]){
 { const [rnd,bs]=mk(seed); console.log('single',seed,tally(c=>T.withBattleSeedSourceForTesting(bs,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<N;i++){ const out=T.runExpeditionTransactionForTesting(s0,0,{gameMode:'mode.normal',simulatedAt:1790000000000}); const o=(out.state||out).parties[0].lastExpeditionLog.finalOutcome; c[o]=(c[o]||0)+1; } })))); }
 { const [rnd,bs]=mk(seed); console.log('afk   ',seed,tally(c=>T.withBattleSeedSourceForTesting(bs,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ let cur=s0; for(let i=0;i<N;i++){ cur=T.simulateAfkPartyChunkForWorker(cur,{partyIndex:0,cycleDurationMs:cyc,cycleDurationScale:1,simulatedCompletedAt:1790000000000+i*1000,gameMode:'mode.normal',operationCount:1,inventoryStrategy:'immutable',workerOptimization:'optimized',compactBattleResultOutput:false}); const o=cur.parties[0].lastExpeditionLog.finalOutcome; c[o]=(c[o]||0)+1; const q=cur.parties[0]; cur={...cur,parties:[{...q,clearGateStatus:s0.parties[0].clearGateStatus,clearGateProgress:s0.parties[0].clearGateProgress,level:s0.parties[0].level,experience:s0.parties[0].experience},...cur.parties.slice(1)]}; } })))); }
}
