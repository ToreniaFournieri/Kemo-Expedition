import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {readFileSync} from 'node:fs';
await T.ensureLanguageLoaded('en');
const [,,file,plan,dd,N]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
if(plan&&plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
const p=s.parties[0]; p.selectedDungeonId=+dd; for(let g=1;g<=6;g++) p.clearGateStatus[+dd*1000+g*10+4]=true; p.clearGateStatus[+dd*1000+604]=true; p.expeditionDepthLimit='all';
const dun=T.DUNGEONS.find(x=>x.id===+dd); const orig=dun.floors; const f6=orig.find(f=>f.floorNumber===+process.env.FL); dun.floors=[{...f6,rooms:[f6.rooms[+process.env.RM-1]]}];
const names=Object.fromEntries(p.characters.map(c=>[c.id,c.name]));
let v=3; const rnd=()=>{v^=v<<13;v>>>=0;v^=v>>>17;v^=v<<5;v>>>=0;return v/4294967296;}; let b=0n;
T.withBattleSeedSourceForTesting(()=>(3n<<32n)|b++,()=>T.withGameplayRandomSourceForTesting(rnd,()=>{ for(let i=0;i<+(N||4);i++){ const out=T.simulateApiSortieBatchForTesting(s,0,1,'mode.normal',1790000000000+i,0); const d=T.buildBattleLogData(out.runs[0].log,1,'x').battleLog; const r=d.rooms[d.rooms.length-1];
  const by={}; for(const e of r.events){ const [tm,type,src,,tgt,el,hits,att,val,info]=e; if(info&&info.attackType){ const key=(src>2**30?'BOSS->'+(names[tgt]??tgt):names[src]??src)+':'+info.attackType+':'+el; const x=by[key]??={dmg:0,hits:0,att:0}; x.dmg+=val; x.hits+=hits; x.att+=att; } }
  console.log(r.outcome,'dealt',r.damageDealt,'/',r.enemyMaximumHp,'taken',r.damageTaken,'/',r.startingPartyHp,r.terrain,JSON.stringify(r.modifiers?.length));
  console.log(Object.entries(by).sort((a,b)=>b[1].dmg-a[1].dmg).map(([k,v])=>`${k} ${v.dmg} (${v.hits}/${v.att})`).join(' | ')); } }));
