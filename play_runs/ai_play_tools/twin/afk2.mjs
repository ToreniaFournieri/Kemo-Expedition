import {T} from './lib.mjs';
await T.ensureLanguageLoaded('en'); const s=T.loadSave(process.argv[2]); const p=s.parties[0];
const cyc=T.getApproxAfkCycleDurationMs(p,1,{deityDonations:s.global.deityDonations});
let v=5; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let bseq=0n;
for(const strat of ['optimized','legacy']){
 const out=T.withBattleSeedSourceForTesting(()=>(5n<<32n)|bseq++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>T.simulateAfkPartyChunkForWorker(s,{partyIndex:0,cycleDurationMs:cyc,cycleDurationScale:1,simulatedCompletedAt:1790000000000,gameMode:'mode.normal',operationCount:5,inventoryStrategy:'immutable',workerOptimization:strat,compactBattleResultOutput:false})));
 const q=out.parties[0]; const full=T.computePartyStats(q).partyStats.hp;
 console.log(strat,'currentHp after chunk',q.currentHp,'computePartyStats.hp',full,'log maxPartyHP',q.lastExpeditionLog?.maxPartyHP, 'last startHP', q.lastExpeditionLog?.entries?.[0]?.startingPartyHp);
}
