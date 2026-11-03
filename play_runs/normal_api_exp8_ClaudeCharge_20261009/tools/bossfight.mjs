// bossfight.mjs save d N [planjson]: boss-only fights from full HP -> outcome tally, damage fraction, HP left
import {T} from '../../ai_play_tools/twin/lib.mjs';
import * as O from '../../ai_play_tools/twin/opt.mjs';
import {replay} from '../../ai_play_tools/twin/replay.mjs';
import {readFileSync} from 'node:fs';
await T.ensureLanguageLoaded('en');
const [,,file,dS,NS,plan]=process.argv; const d=+dS, N=+NS;
const s=T.loadSave(file); if(plan){ const m=O.buildModel(s,0); replay(m,JSON.parse(readFileSync(plan,'utf8')).calls); }
const p=s.parties[0]; const dun=T.DUNGEONS.find(x=>x.id===d); const orig=dun.floors; const f6=orig.find(f=>f.floorNumber===6);
p.selectedDungeonId=d; for(let g=1;g<=6;g++) p.clearGateStatus[d*1000+g*10+4]=true; p.clearGateStatus[d*1000+604]=true; p.expeditionDepthLimit='all'; p.characters=[...p.characters];
dun.floors=[{...f6,rooms:[f6.rooms[3]]}]; const tally={}; let dmg=0, hp=0;
let v=5; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let b=0n;
T.withBattleSeedSourceForTesting(()=>(5n<<32n)|b++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<N;i++){ const out=T.simulateApiSortieBatchForTesting(s,0,1,'mode.normal',1790000000000+i,0); const bd=T.buildBattleLogData(out.runs[0].log,1,'x').battleLog; const br=bd.rooms[bd.rooms.length-1]; tally[br.outcome]=(tally[br.outcome]||0)+1; dmg+=Math.min(1,br.damageDealt/Math.max(1,br.enemyMaximumHp)); hp+=br.remainingPartyHp/br.maximumPartyHp; if(i===0) console.log('sample events', br.events?.length, 'boss maxHP', br.enemyMaximumHp, 'party max', br.maximumPartyHp); } }));
dun.floors=orig;
console.log(JSON.stringify(tally), 'dmg', (dmg/N).toFixed(3), 'hpLeft', (hp/N).toFixed(3));
