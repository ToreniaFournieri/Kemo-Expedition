import {T} from '/home/user/Kemo-Expedition/play_runs/ai_play_tools/twin/lib.mjs';
const [,,d,f,r]=process.argv; const dun=T.DUNGEONS.find(x=>x.id===+d); const fl=dun.floors.find(x=>x.floorNumber===+f); console.log(JSON.stringify(fl.rooms[+r-1]).slice(0,1500));
