// Like wallopt2 but outputs an executable call plan (items + jewels).
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {wallObjective} from './wall.mjs'; import {writeFileSync,readFileSync} from 'node:fs'; import {SC} from './wallopt2.mjs'; import {gateObjective,multiGate,bossObjective} from './gate.mjs'; import {stageObjective} from './stageopt.mjs'; import {bossOnlyObjective,roomOnlyObjective} from './bossonly.mjs';
const [,,file,dd,f,seedA,itersA,out,startPlan,scen]=process.argv;
const s=T.loadSave(file); const m=O.buildModel(s,0);
if(scen&&scen.startsWith('ord:')){ const ids=scen.slice(4).split(',').map(Number); const byId=new Map(m.p.characters.map(c=>[c.id,c])); m.p.characters=ids.map(i=>byId.get(i)); m.slots=m.p.characters.map((c,i)=>T.computeCharacterStatsInParty(m.p,i).maxEquipSlots); }
const beforeJ=O.snapshotJ(m); const free0={...m.jewels};
import {replay} from './replay.mjs';
if(startPlan&&startPlan!=='none'){ const j=JSON.parse(readFileSync(startPlan,'utf8')); replay(m,j.calls); }
if(!(scen&&scen.startsWith('ord:'))) (SC[scen||'base'])(m);
const wB=+(process.env.WBOSS||0); let quick=wallObjective({d:+dd,f:+f,N:+(process.env.NQ||32),seed:7,wBoss:wB}), confirm=wallObjective({d:+dd,f:+f,N:+(process.env.NC||96),seed:11,wBoss:wB});
if(process.env.OBJ==='stages'){ quick=stageObjective(+dd,{n:+(process.env.NQ||100),seed:7,stop:+(process.env.STOP||0.5)}); confirm=stageObjective(+dd,{n:+(process.env.NC||300),seed:11,stop:+(process.env.STOP||0.5)}); }
if(process.env.OBJ==='combo'){ // gate5 + bossGate + boss together
  const mk=(N,seed)=>{ const FS=(process.env.COMBO||'5,6,7').split(',').map(Number); const objs=FS.map(ff=>ff===7?bossObjective({d:+dd,N,seed}):gateObjective({d:+dd,f:ff,N,seed})); return async(st)=>{ let t=0; for(const o of objs) t+=await o(st); return t; }; };
  quick=mk(+(process.env.NQ||100),7); confirm=mk(+(process.env.NC||300),11); }
if(process.env.OBJ==='room'){ await T.ensureLanguageLoaded('en'); const RS=process.env.ROOM.split(',').map(x=>x.split('-').map(Number)); const mkR=(N,seed)=>{ const os=RS.map(([fn,rn])=>roomOnlyObjective({d:+dd,floorNo:fn,roomNo:rn,N,seed})); return async(st)=>{ let t=0; for(const o of os) t+=await o(st); return t; }; }; quick=mkR(+(process.env.NQ||40),7); confirm=mkR(+(process.env.NC||120),11); }
if(process.env.OBJ==='hp'){ const hp=async(st)=>T.computePartyStats(st.parties[0]).partyStats.hp/1000; quick=hp; confirm=hp; }
if(process.env.OBJ==='bossonly'){ await T.ensureLanguageLoaded('en'); quick=bossOnlyObjective({d:+dd,N:+(process.env.NQ||50),seed:7,reachN:80}); confirm=bossOnlyObjective({d:+dd,N:+(process.env.NC||200),seed:11,reachN:240}); }
if(process.env.OBJ==='boss'){ quick=bossObjective({d:+dd,N:+(process.env.NQ||300),seed:7}); confirm=bossObjective({d:+dd,N:+(process.env.NC||1000),seed:11}); }
if(process.env.OBJ==='gate2'){ const F=process.env.FS.split(',').map(Number); quick=multiGate(F.map(ff=>({d:+dd,f:ff,N:+(process.env.NQ||100),seed:7,floor:0.004}))); confirm=multiGate(F.map(ff=>({d:+dd,f:ff,N:+(process.env.NC||300),seed:11,floor:0.004}))); }
if(process.env.OBJ==='gate'){ quick=gateObjective({d:+dd,f:+f,N:+(process.env.NQ||120),seed:7}); confirm=gateObjective({d:+dd,f:+f,N:+(process.env.NC||400),seed:11}); }
const LAM=+(process.env.LAMBDA||0);
const pen=()=>{ if(!LAM) return 0; try{ return LAM*O.planCalls(beforeJ,m,free0).length; }catch(e){ return 1; } };
const quickW=async(st)=>(await quick(st))-pen(), confirmW=async(st)=>(await confirm(st))-pen();
let best; if(process.env.ALGO==='ga'){ best=await O.genetic(m,quickW,confirmW,{pop:+(process.env.POP||24),gens:+itersA,seed:+seedA,log:(...a)=>console.log(...a)}); } else { const algo=process.env.ALGO==='sa'?O.anneal:O.climb2; best=await algo(m,quickW,confirmW,{iters:+itersA,seed:+seedA,log:(...a)=>console.log(...a)}); }
const calls=O.planCalls(beforeJ,m,free0);
writeFileSync(out,JSON.stringify({score:best,scen,calls,jfree0:free0}));
console.log('done',best,'calls',calls.length);
