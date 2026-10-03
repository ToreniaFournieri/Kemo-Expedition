import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {stageReport,printReport} from './stages.mjs'; import {readFileSync} from 'node:fs'; import {replay} from './replay.mjs';
const [,,file,plan,dd,n,stg]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0); if(process.env.ORD){ const byId=new Map(m.p.characters.map(c=>[c.id,c])); m.p.characters=process.env.ORD.split(',').map(i=>byId.get(+i)); m.slots=m.p.characters.map((c,i)=>T.computeCharacterStatsInParty(m.p,i).maxEquipSlots); }
if(plan!=='none'){ const j=JSON.parse(readFileSync(plan,'utf8')); replay(m,j.calls); }
printReport(await stageReport(s,0,+dd,{n:+(n||400),seed:4242,stages:stg?stg.split(',').map(Number):[1,2,3,4,5,6,7]}));
