import {T} from '../../ai_play_tools/twin/lib.mjs';
await T.ensureLanguageLoaded('en');
const [,,file,dS,NS]=process.argv; const d=+dS, N=+NS;
const s=T.loadSave(file); const p=s.parties[0]; const dun=T.DUNGEONS.find(x=>x.id===d); const orig=dun.floors; const f6=orig.find(f=>f.floorNumber===6);
p.selectedDungeonId=d; for(let g=1;g<=6;g++) p.clearGateStatus[d*1000+g*10+4]=true; p.clearGateStatus[d*1000+604]=true; p.expeditionDepthLimit='all'; p.characters=[...p.characters];
dun.floors=[{...f6,rooms:[f6.rooms[3]]}];
let v=5; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let b=0n; const by={}; let shown=false;
T.withBattleSeedSourceForTesting(()=>(5n<<32n)|b++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<N;i++){ const out=T.simulateApiSortieBatchForTesting(s,0,1,'mode.normal',1790000000000+i,0); const bd=T.buildBattleLogData(out.runs[0].log,1,'x').battleLog; const br=bd.rooms[bd.rooms.length-1];
  const names=Object.fromEntries(br.actors.map(a=>[a.id,a.name||('enemy')]));
  for(const ev of br.events){ if(ev[1]===10 || ev[1]===7 || ev[1]===5 || ev[1]===1){ } const [ph,kind,src,tgt,dst]=ev; if(typeof ev[8]==='number' && ev[4]!==undefined){ const target=ev[4]; const amount=ev[8]; if(names[target]==='enemy' && src!==target){ by[names[src]]=(by[names[src]]||0)+amount; } } }
  if(!shown){ shown=true; console.log(JSON.stringify(br.events).slice(0,1500)); }
} }));
dun.floors=orig;
for(const [k,vv] of Object.entries(by)) console.log(k, Math.round(vv/N));
