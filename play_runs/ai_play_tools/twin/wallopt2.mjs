import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {wallObjective} from './wall.mjs'; import {writeFileSync,readFileSync} from 'node:fs';
import {mut} from './scen.mjs';
export const SC={
  base:()=>{},
  selfin_sniper:(m)=>mut(m,4,{raceId:'ursan',gender:'male',mainClassId:'ninja',subClassId:'ranger',lineageId:'abyssal_sea',predispositionId:'precise'}),
  laika_ninja:(m)=>mut(m,5,{subClassId:'ninja'}),
  laika_ranger:(m)=>mut(m,5,{subClassId:'ranger'}),
  kemo_ninja:(m)=>mut(m,0,{subClassId:'ninja'}),
  selfin_tank:(m)=>mut(m,4,{raceId:'ursan',gender:'male',mainClassId:'guardian',subClassId:'lord',lineageId:'firmament',predispositionId:'stubborn'}),
  selfin_tank2:(m)=>mut(m,4,{raceId:'ursan',gender:'male',mainClassId:'lord',subClassId:'guardian',lineageId:'firmament',predispositionId:'stubborn'}),
  selfin_cleric:(m)=>mut(m,4,{raceId:'ursan',gender:'male',mainClassId:'pilgrim',subClassId:'guardian',lineageId:'fragment',predispositionId:'stubborn'}),
  lop_ss:(m)=>mut(m,2,{mainClassId:'sword-saint',subClassId:'ranger'}),
  lopkuz_ss:(m)=>{mut(m,2,{mainClassId:'sword-saint',subClassId:'ranger'}); mut(m,1,{mainClassId:'sword-saint',subClassId:'ranger'});},
  trio_ss:(m)=>{mut(m,2,{mainClassId:'sword-saint',subClassId:'ranger'}); mut(m,1,{mainClassId:'sword-saint',subClassId:'ranger'}); mut(m,3,{mainClassId:'sword-saint',subClassId:'ranger'});},
  laika_pg:(m)=>mut(m,5,{mainClassId:'pilgrim',subClassId:'guardian'}),
  laika_gl:(m)=>mut(m,5,{subClassId:'lord'}),
  laika_pl:(m)=>mut(m,5,{mainClassId:'pilgrim',subClassId:'lord'}),
  selfin_pa:(m)=>mut(m,4,{mainClassId:'pilgrim',subClassId:'alchemist'}),
  kemo_lg:(m)=>mut(m,0,{subClassId:'guardian'}),
  lop_ranger_main:(m)=>mut(m,2,{mainClassId:'ranger',subClassId:'ninja'}),
  lop_ursan:(m)=>mut(m,2,{raceId:'ursan',gender:'female'}),
};
if(process.argv[1].endsWith('wallopt2.mjs')){
const [,,file,dd,f,seedA,itersA,out,startPlan,scen]=process.argv;
const s=T.loadSave(file); const m=O.buildModel(s,0); const before=O.snapshot(m);
if(startPlan&&startPlan!=='none'){ const j=JSON.parse(readFileSync(startPlan,'utf8')); O.applyDiff(m,j.diff||j); }
(SC[scen||'base'])(m);
const wB=+(process.env.WBOSS||0); const quick=wallObjective({d:+dd,f:+f,N:32,seed:7,wBoss:wB}), confirm=wallObjective({d:+dd,f:+f,N:96,seed:11,wBoss:wB});
const best=await O.climb2(m,quick,confirm,{iters:+itersA,seed:+seedA,log:(...a)=>console.log(...a)});
writeFileSync(out,JSON.stringify({score:best,scen,diff:O.diff(before,m),builds:m.p.characters.map(c=>({id:c.id,raceId:c.raceId,gender:c.gender,main:c.mainClassId,sub:c.subClassId,lineage:c.lineageId,pred:c.predispositionId}))}));
console.log('done',best);
}
