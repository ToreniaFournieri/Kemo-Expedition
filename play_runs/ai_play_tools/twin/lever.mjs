// Evaluate cheap levers (deity, race specs) on a stage. usage: lever.mjs save d f N "label|DEITY|RACE" ...
import {T} from './lib.mjs'; import {gateObjective,bossObjective} from './gate.mjs'; import {applyRace} from './race.mjs';
import {replay} from './replay.mjs'; import * as O from './opt.mjs'; import {readFileSync} from 'node:fs';
const [,,file,dd,f,N,...vs]=process.argv;
for(const v of ['base||',...vs]){ const [label,deity,race]=v.split('|'); const s=T.loadSave(file); applyRace(s,race);
  if(process.env.PLAN){ const m=O.buildModel(s,0); replay(m,JSON.parse(readFileSync(process.env.PLAN,'utf8')).calls); }
  if(deity) s.parties[0].deity={...s.parties[0].deity,name:deity};
  let r; if(+f===7){ await bossObjective({d:+dd,N:+N,seed:11})(s); r=bossObjective.last; } else { await gateObjective({d:+dd,f:+f,N:+N,seed:11})(s); r=gateObjective.last; }
  console.log(label.padEnd(14),JSON.stringify(r)); }
