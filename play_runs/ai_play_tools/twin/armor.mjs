// Give attackers N defensive items each (replace their weakest weapon slots), evaluate stage, emit plan. usage: armor.mjs save d f "cid:n,cid:n" out [start]
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {bossObjective,gateObjective} from './gate.mjs'; import {readFileSync,writeFileSync} from 'node:fs';
const [,,file,dd,f,spec,out,start]=process.argv; const s=T.loadSave(file); (await import('./race.mjs')).applyRace(s); const m=O.buildModel(s,0); const before=O.snapshotJ(m); const free0={...m.jewels};
if(start&&start!=='none') replay(m,JSON.parse(readFileSync(start,'utf8')).calls);
const obj=+f===7?bossObjective({d:+dd,N:+(process.env.N||400),seed:11}):gateObjective({d:+dd,f:+f,N:+(process.env.N||400),seed:11}); const last=()=>+f===7?bossObjective.last:gateObjective.last;
await obj(s); console.log('before',JSON.stringify(last()));
const DEF=new Set(['shield','armor','robe','gauntlet']); const key=process.env.DEFKEY||'physicalDefense';
const dscore=(it)=>(it[key]||0)*(1+0.1*(it.enhancement||0))+(it.partyHP||0)*0.2; const wscore=(it)=>((it.rangedAttack||0)+(it.magicalAttack||0)+(it.rangedNoABonus||0)*30+(it.magicalNoABonus||0)*30)*(1+0.1*(it.enhancement||0));
for(const part of spec.split(',')){ const [cid,n]=part.split(':').map(Number); const ci=m.p.characters.findIndex(c=>c.id===cid); const c=m.p.characters[ci];
  const cand=[]; for(let si=0;si<m.slots[ci];si++){ const it=c.equipment[si]; if(it&&DEF.has(it.category)) continue; cand.push([si,it?wscore(it):-1]); } cand.sort((a,b)=>a[1]-b[1]);
  for(const [si] of cand.slice(0,n)){ let best=null; for(const [k,e] of m.pool){ if(e.free<=0||!DEF.has(e.item.category)||!O.canEquip(m,ci,k)) continue; if(!best||dscore(e.item)>dscore(m.pool.get(best).item)) best=k; } if(best){ O.setSlot(m,ci,si,best); } } }
await obj(s); console.log('after',JSON.stringify(last()),'HP',T.computePartyStats(m.p).partyStats.hp);
writeFileSync(out,JSON.stringify({calls:O.planCalls(before,m,free0)}));
