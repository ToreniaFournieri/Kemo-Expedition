// Scenario climb: apply build mutations, empty affected equipment, climb, write {score,builds,diff}.
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {stageObjective} from './stageopt.mjs'; import {writeFileSync,readFileSync} from 'node:fs';
export const SCEN={
  base:()=>{},
  sniper4:(s,m)=>{ mut(m,5,{raceId:'ursan',gender:'male',mainClassId:'ninja',subClassId:'ranger',lineageId:'abyssal_sea',predispositionId:'precise'}); },
  sniper4b:(s,m)=>{ mut(m,5,{raceId:'leporian',gender:'male',mainClassId:'ninja',subClassId:'ranger',lineageId:'abyssal_sea',predispositionId:'precise'}); },
};
export function mut(m,ci,fields){ const c=m.p.characters[ci]; for(let si=0;si<c.equipment.length;si++) if(c.equipment[si]) O.setSlot(m,ci,si,null); Object.assign(c,fields); // slots recompute
  const n=T.computeCharacterStatsInParty(m.p,ci).maxEquipSlots; m.slots[ci]=n; while(c.equipment.length<n) c.equipment.push(null); c.equipment.length=Math.max(n,0); }
if(process.argv[1].endsWith('scen.mjs')){
  const [,,file,dd,scen,iters,seed,out]=process.argv;
  const s=T.loadSave(file); const m=O.buildModel(s,0);
  const before=O.snapshot(m);
  SCEN[scen](s,m);
  const best=await O.climb(m,stageObjective(+dd),{iters:+iters,seed:+seed,log:(...a)=>{}});
  writeFileSync(out,JSON.stringify({score:best,scen,diff:O.diff(before,m),builds:m.p.characters.map(c=>({id:c.id,raceId:c.raceId,gender:c.gender,main:c.mainClassId,sub:c.subClassId,lineage:c.lineageId,pred:c.predispositionId}))}));
  console.log(scen,seed,'done',best);
}
