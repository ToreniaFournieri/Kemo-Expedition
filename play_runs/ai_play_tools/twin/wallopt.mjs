import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {wallObjective} from './wall.mjs'; import {writeFileSync,readFileSync} from 'node:fs';
const [,,file,dd,f,seedA,itersA,out,startPlan,N]=process.argv;
const s=T.loadSave(file); const m=O.buildModel(s,0); const before=O.snapshot(m);
if(startPlan&&startPlan!=='none'){ const j=JSON.parse(readFileSync(startPlan,'utf8')); O.applyDiff(m,j.diff||j); }
const best=await O.climb(m,wallObjective({d:+dd,f:+f,N:+(N||40),seed:7}),{iters:+itersA,seed:+seedA,log:(...a)=>console.log(...a)});
writeFileSync(out,JSON.stringify({score:best,diff:O.diff(before,m)})); console.log('done',best);
