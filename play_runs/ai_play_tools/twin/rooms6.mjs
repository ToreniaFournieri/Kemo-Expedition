import {T,sim} from './lib.mjs';
const [,,file,dd,N]=process.argv; const s=T.loadSave(file); const p=s.parties[0]; p.selectedDungeonId=+dd; for(let g=1;g<=5;g++) p.clearGateStatus[+dd*1000+g*10+4]=true; p.expeditionDepthLimit='beforeBoss';
const raw=await sim(s,0,+N,99); console.log(raw.total, 'C',raw.Clear,'R',raw.Return,'D',raw.Draw,'Df',raw.Defeat);
raw.rooms.forEach((r,i)=>{ console.log(i+1, Object.entries(r).map(([k,v])=>typeof v==='number'?k+':'+v:'').join(' ')); });
