import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {stageReport,printReport} from './stages.mjs'; import {readFileSync} from 'node:fs';
const [,,file,plan,dd,n]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
if(plan!=='none'){ const j=JSON.parse(readFileSync(plan,'utf8')); O.applyDiff(m,j.diff||j); }
printReport(await stageReport(s,0,+dd,{n:+(n||400),seed:4242}));
