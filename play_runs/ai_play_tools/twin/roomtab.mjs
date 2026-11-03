// per-room table for a gate stage f (depth f-3 with earlier gates open). usage: roomtab.mjs save d f N [plan]
import {T,sim} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {readFileSync} from 'node:fs';
const [,,file,dd,f,N,plan]=process.argv; const s=T.loadSave(file); (await import('./race.mjs')).applyRace(s); const m=O.buildModel(s,0); if(plan&&plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
const p=s.parties[0]; const d=+dd; p.selectedDungeonId=d; for(let g=1;g<+f;g++) p.clearGateStatus[d*1000+g*10+4]=true; p.expeditionDepthLimit=(+f<=5)?`${f}f-3`:(+f===6?'beforeBoss':'all'); if(+f===7) p.clearGateStatus[d*1000+604]=true;
const raw=await sim(s,0,+N,99); console.log('C',raw.Clear,'R',raw.Return,'D',raw.Draw,'Rt',raw.Retreat,'Df',raw.Defeat);
raw.rooms.forEach((r,i)=>{ if(r.reached) console.log(`${Math.floor(i/4)+1}f-${i%4+1}`,'reached',r.reached,'win',r.Victory,'Df',r.Defeat,'D',r.Draw,'Rt',r.Retreat); });
