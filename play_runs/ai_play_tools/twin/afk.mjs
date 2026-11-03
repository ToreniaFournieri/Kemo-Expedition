import {T,seedCrypto} from './lib.mjs';
await T.ensureLanguageLoaded('en'); const s=T.loadSave(process.argv[2]); const n=+(process.argv[3]||100); const seed=+(process.argv[4]||5);
const p=s.parties[0]; const cyc=T.getApproxAfkCycleDurationMs(p,1,{deityDonations:s.global.deityDonations});
console.log('cycleMs',cyc,'min',cyc/60000);
let v=seed; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let bseq=0n;
const before=JSON.stringify(p.expeditionStats);
const out=T.withBattleSeedSourceForTesting(()=>(BigInt(seed)<<32n)|bseq++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>T.simulateAfkPartyChunkForWorker(s,{partyIndex:0,cycleDurationMs:cyc,cycleDurationScale:1,simulatedCompletedAt:1790000000000,gameMode:'mode.normal',operationCount:n,inventoryStrategy:'immutable',workerOptimization:'optimized',compactBattleResultOutput:false})));
const a=s.parties[0].expeditionStats, b=out.parties[0].expeditionStats;
console.log('delta',['Clear','Return','Draw','Retreat','Defeat'].map(k=>k+':'+(b[k]-a[k])).join(' '),'level',s.parties[0].level,'->',out.parties[0].level);
