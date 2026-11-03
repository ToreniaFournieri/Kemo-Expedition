// Print one boss-only fight's action timeline (from full HP).
import {T} from './lib.mjs'; await T.ensureLanguageLoaded('en');
const [,,file,dd,seed]=process.argv; const s=T.loadSave(file); (await import('./race.mjs')).applyRace(s);
const d=+dd; const dun=T.DUNGEONS.find(x=>x.id===d); const f6=dun.floors.find(f=>f.floorNumber===6); dun.floors=[{...f6,rooms:[f6.rooms[3]]}];
const p=s.parties[0]; p.selectedDungeonId=d; for(let g=1;g<=6;g++) p.clearGateStatus[d*1000+g*10+4]=true; p.clearGateStatus[d*1000+604]=true; p.expeditionDepthLimit='all';
let v=+seed||5; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let b=0n;
T.withBattleSeedSourceForTesting(()=>(BigInt(+seed||5)<<32n)|b++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ const out=T.simulateApiSortieBatchForTesting(s,0,1,'mode.normal',1790000000000,0); const bd=T.buildBattleLogData(out.runs[0].log,1,'x').battleLog; const r=bd.rooms[bd.rooms.length-1];
 console.log(JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k,v])=>typeof v!=='object'))));
 const ev=r.entries||r.events||r.turns||r.log||[]; console.log(Object.keys(r)); console.log(JSON.stringify(r.actors).slice(0,800)); for(const e of ev) console.log(JSON.stringify(e)); }));
