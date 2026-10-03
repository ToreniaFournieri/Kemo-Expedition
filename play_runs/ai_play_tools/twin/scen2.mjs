import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {wallObjective} from './wall.mjs'; import {mut} from './scen.mjs'; import {writeFileSync,readFileSync} from 'node:fs';
const SC={
  base:()=>{},
  selfin_sniper:(m)=>mut(m,4,{raceId:'ursan',gender:'male',mainClassId:'ninja',subClassId:'ranger',lineageId:'abyssal_sea',predispositionId:'precise'}),
  laika_ninja:(m)=>mut(m,5,{subClassId:'ninja'}),
  laika_ranger:(m)=>mut(m,5,{subClassId:'ranger'}),
  kemo_ninja:(m)=>mut(m,0,{subClassId:'ninja'}),
  lop_ursan:(m)=>mut(m,2,{raceId:'ursan',gender:'female'}),
  selfin_ranger_main:(m)=>mut(m,4,{raceId:'ursan',gender:'male',mainClassId:'ranger',subClassId:'ninja',lineageId:'abyssal_sea',predispositionId:'precise'}),
  selfin_striker:(m)=>mut(m,4,{raceId:'ursan',gender:'male',mainClassId:'ninja',subClassId:'striker',lineageId:'abyssal_sea',predispositionId:'precise'}),
};
const [,,file,dd,f,scen,seedA,itersA,out,startPlan,N]=process.argv;
const s=T.loadSave(file); const m=O.buildModel(s,0); const before=O.snapshot(m);
if(startPlan&&startPlan!=='none'){ const j=JSON.parse(readFileSync(startPlan,'utf8')); O.applyDiff(m,j.diff||j); }
const obj=wallObjective({d:+dd,f:+f,N:+(N||40),seed:7});
const base=await obj(s);
SC[scen](m);
const best=await O.climb(m,obj,{iters:+itersA,seed:+seedA,log:()=>{}});
writeFileSync(out,JSON.stringify({score:best,base,scen,diff:O.diff(before,m),builds:m.p.characters.map(c=>({id:c.id,raceId:c.raceId,gender:c.gender,main:c.mainClassId,sub:c.subClassId,lineage:c.lineageId,pred:c.predispositionId}))}));
console.log(scen,'base',base.toFixed(3),'->',best.toFixed(3));
