import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {stageObjective} from './stageopt.mjs'; import {readFileSync} from 'node:fs';
const [,,file,plan,dd]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
if(plan!=='none'){ const j=JSON.parse(readFileSync(plan,'utf8')); O.applyDiff(m,j.diff||j); }
const p=s.parties[0]; console.log(JSON.stringify(p.deity), JSON.stringify(s.global.deityDonations));
const obj=stageObjective(+dd,{n:200,stop:0.2});
for(const name of s.global.unlockedDeities){ p.deity={...p.deity,name}; console.log(name, (await obj(s)).toFixed(2)); }
