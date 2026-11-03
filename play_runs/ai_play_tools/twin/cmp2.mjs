import {T,seedCrypto} from './lib.mjs';
const s=T.loadSave(process.argv[2]); const N=+(process.argv[3]||200);
function run(mode){ const cnt={}; let v=9; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let bseq=0n;
  T.withBattleSeedSourceForTesting(()=>(9n<<32n)|bseq++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<N;i++){ const r=T.resolveSimulationRunForTesting(s,0,mode); const o=r.resolution.outcome+(r.resolution.terminalBattleOutcome?'/'+r.resolution.terminalBattleOutcome:''); cnt[o]=(cnt[o]||0)+1; } }));
  return cnt; }
console.log('forecast',JSON.stringify(run('forecast')));
console.log('full    ',JSON.stringify(run('full')));
