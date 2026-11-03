import {T} from './lib.mjs';
await T.ensureLanguageLoaded('en'); const s=T.loadSave(process.argv[2]); const N=+(process.argv[3]||150);
let v=11; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let bseq=0n;
const cnt={}; 
T.withBattleSeedSourceForTesting(()=>(11n<<32n)|bseq++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<N;i++){ const out=T.runExpeditionTransactionForTesting(s,0,{gameMode:'mode.normal',simulatedAt:1790000000000}); const o=(out.state?out.state:out).parties[0].lastExpeditionLog.finalOutcome; cnt[o]=(cnt[o]||0)+1; } }));
console.log('runExpeditionTransaction',JSON.stringify(cnt));
