import {T,sim,summarize,fmt,seedCrypto} from './lib.mjs';
const s=T.loadSave(process.argv[2]); const p=s.parties[0];
console.log('depth',p.expeditionDepthLimit,'dest',p.selectedDungeonId);
const r=summarize(await sim(s,0,600,5)); console.log('forecast  R',fmt(r.R),'C',fmt(r.C),'D',fmt(r.D),'Rt',fmt(r.Rt),'Df',fmt(r.Df));
let bseq=0n; let v=5; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;};
const out=T.withBattleSeedSourceForTesting(()=>(5n<<32n)|bseq++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>T.simulateApiSortieBatchForTesting(s,0,300,'mode.normal',1790000000000,0)));
const cnt={};for(const run of out.runs){const o=run.log.finalOutcome;cnt[o]=(cnt[o]||0)+1;} console.log('sorties',JSON.stringify(cnt));
