import {T,sim} from './lib.mjs'; import * as O from './opt.mjs'; import {openGates} from './stages.mjs'; import {replay} from './replay.mjs'; import {readFileSync} from 'node:fs';
const [,,file,plan,dd,upTo,depth,n]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
if(plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
const p=s.parties[0]; openGates(p,+dd,+upTo);
const r=await sim(s,0,+(n||300),5,{dest:+dd,depth});
console.log('C',r.Clear,'R',r.Return,'D',r.Draw,'Rt',r.Retreat,'Df',r.Defeat);
console.log(r.rooms.map((x,i)=>[i+1,x.reached,x.Victory,x.Clear,x.Return,x.Draw,x.Retreat,x.Defeat]).filter(x=>x[1]>0).map(x=>x.join(',')).join(' | '));
