import {T,seedCrypto} from './lib.mjs'; import * as O from './opt.mjs'; import {openGates} from './stages.mjs'; import {replay} from './replay.mjs'; import {readFileSync} from 'node:fs';
const [,,file,plan,dd,upTo,depth,N]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
if(plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
const p=s.parties[0]; openGates(p,+dd,+upTo); p.selectedDungeonId=+dd; p.expeditionDepthLimit=depth;
seedCrypto(9);
const out=T.simulateApiSortieBatchForTesting(s,0,+(N||20),'mode.normal',Date.now(),0);
const names=Object.fromEntries(p.characters.map(c=>[c.id,c.name]));
let shown=0;
for(const run of out.runs){
  const d=T.buildBattleLogData(run.log,1,'x').battleLog; const r=d.rooms[d.rooms.length-1];
  if(d.finalOutcome!=='Defeat') continue; if(shown++>=4) break;
  const by={}; for(const e of r.events){ const [tm,type,src,,tgt,el,hits,att,val,info]=e; if(info&&info.attackType){ const key=(src>2**30?'ENEMY->'+(names[tgt]??tgt):names[src]??src)+':'+info.attackType+':'+el; const x=by[key]??={dmg:0,hits:0,att:0}; x.dmg+=val; x.hits+=hits; x.att+=att; } }
  console.log('room',r.room,r.roomType,'enemy',r.enemyId,'HP',r.enemyMaximumHp,r.outcome,'dealt',r.damageDealt,'taken',r.damageTaken,'startHP',r.startingPartyHp,r.terrain);
  console.log(Object.entries(by).map(([k,v])=>`${k} ${v.dmg} (${v.hits}/${v.att})`).join(' | '));
}
