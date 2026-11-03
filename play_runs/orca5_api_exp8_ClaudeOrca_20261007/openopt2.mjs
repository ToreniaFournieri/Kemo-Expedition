// ORCA=5 [RACE=..] [ORDER=..] [DEITY=..] node openopt2.mjs save out.json iters [rooms]
import {T} from '../ai_play_tools/twin/lib.mjs'; import * as O from '../ai_play_tools/twin/opt.mjs'; import {applyRace} from '../ai_play_tools/twin/race.mjs';
import {roomOnlyObjective} from '../ai_play_tools/twin/bossonly.mjs'; import {writeFileSync} from 'node:fs';
const [,,file,out,iters]=process.argv; const s=T.loadSave(file); applyRace(s);
const rooms=(process.env.ROOMS||'1,2,3').split(',').map(Number);
const mk=(N,seed)=>{const os=rooms.map(r=>roomOnlyObjective({d:+(process.env.D||1),floorNo:+(process.env.FL||1),roomNo:r,N,seed})); return async(st)=>{let sc=0,L=[];for(const o of os){sc+=await o(st);L.push(roomOnlyObjective.last);}mk.last=L;return sc;};};
const quick=mk(16,3), conf=mk(48,11);
const m=O.buildModel(s,0); const before=O.snapshotJ(m); const free0={...m.jewels};
const best=await O.climb2(m,quick,conf,{iters:+iters||300,seed:5,log:(...a)=>console.log(...a)});
await conf(s); console.log('final',best.toFixed(3),JSON.stringify(mk.last.map(x=>[+x.dmg.toFixed(2),x.kills])));
console.log(s.parties[0].characters.map(c=>c.id+':'+c.equipment.map(e=>e&&e.id+'+'+e.enhancement).join(',')).join(' | '));
writeFileSync(out,JSON.stringify({calls:O.planCalls(before,m,free0)}));
