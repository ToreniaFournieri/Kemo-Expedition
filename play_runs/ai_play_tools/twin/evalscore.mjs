import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {wallObjective} from './wall.mjs'; import {replay} from './replay.mjs'; import {readFileSync} from 'node:fs';
const [,,file,plan,dd,f]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
if(plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
const c=wallObjective({d:+dd,f:+f,N:96,seed:11}); console.log('confirm',(await c(s)).toFixed(4),'succ',wallObjective.last.succ);
