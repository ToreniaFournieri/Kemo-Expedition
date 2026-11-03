// ORCA=5 [RACE=..] [ORDER=..] [DEITY=..] node openopt2.mjs save out.json iters [rooms]
import {T} from '../ai_play_tools/twin/lib.mjs'; import * as O from '../ai_play_tools/twin/opt.mjs'; import {applyRace} from '../ai_play_tools/twin/race.mjs';
import {bossOnlyObjective} from '../ai_play_tools/twin/bossonly.mjs'; import {writeFileSync} from 'node:fs';
const [,,file,out,iters]=process.argv; const s=T.loadSave(file); applyRace(s);
const rooms=(process.env.ROOMS||'1,2,3').split(',').map(Number);
const quick=bossOnlyObjective({d:+(process.env.D||1),N:24,seed:3,reachN:60}), conf=bossOnlyObjective({d:+(process.env.D||1),N:80,seed:11,reachN:200}); const mk={};
const m=O.buildModel(s,0); const before=O.snapshotJ(m); const free0={...m.jewels};
const best=await O.climb2(m,quick,conf,{iters:+iters||300,seed:+(process.env.SEED||5),log:(...a)=>console.log(...a)});
await conf(s); console.log('final',best.toFixed(3),JSON.stringify(bossOnlyObjective.last));
console.log(s.parties[0].characters.map(c=>c.id+':'+c.equipment.map(e=>e&&e.id+'+'+e.enhancement).join(',')).join(' | '));
writeFileSync(out,JSON.stringify({calls:O.planCalls(before,m,free0)}));
