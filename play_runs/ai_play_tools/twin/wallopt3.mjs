// Like wallopt2 but outputs an executable call plan (items + jewels).
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {wallObjective} from './wall.mjs'; import {writeFileSync,readFileSync} from 'node:fs'; import {SC} from './wallopt2.mjs';
const [,,file,dd,f,seedA,itersA,out,startPlan,scen]=process.argv;
const s=T.loadSave(file); const m=O.buildModel(s,0);
const beforeJ=O.snapshotJ(m); const free0={...m.jewels};
import {replay} from './replay.mjs';
if(startPlan&&startPlan!=='none'){ const j=JSON.parse(readFileSync(startPlan,'utf8')); replay(m,j.calls); }
(SC[scen||'base'])(m);
const wB=+(process.env.WBOSS||0); const quick=wallObjective({d:+dd,f:+f,N:+(process.env.NQ||32),seed:7,wBoss:wB}), confirm=wallObjective({d:+dd,f:+f,N:+(process.env.NC||96),seed:11,wBoss:wB});
const LAM=+(process.env.LAMBDA||0);
const pen=()=>{ if(!LAM) return 0; try{ return LAM*O.planCalls(beforeJ,m,free0).length; }catch(e){ return 1; } };
const quickW=async(st)=>(await quick(st))-pen(), confirmW=async(st)=>(await confirm(st))-pen();
const algo=process.env.ALGO==='sa'?O.anneal:O.climb2; const best=await algo(m,quickW,confirmW,{iters:+itersA,seed:+seedA,log:(...a)=>console.log(...a)});
const calls=O.planCalls(beforeJ,m,free0);
writeFileSync(out,JSON.stringify({score:best,scen,calls,jfree0:free0}));
console.log('done',best,'calls',calls.length);
