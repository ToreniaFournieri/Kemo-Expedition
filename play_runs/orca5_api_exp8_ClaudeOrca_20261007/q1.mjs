import {T,sim,summarize,fmt} from '../ai_play_tools/twin/lib.mjs';
const [,,file,d,depth,n]=process.argv; const s=T.loadSave(file); (await import('../ai_play_tools/twin/race.mjs')).applyRace(s);
const r=await sim(s,0,+n||200,5,{dest:+d,depth});
console.log(JSON.stringify(summarize(r)), r.rooms.slice(0,12).map(x=>x.reached));
