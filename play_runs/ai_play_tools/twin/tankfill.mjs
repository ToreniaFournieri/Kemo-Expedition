// Replace a support character's weapon items with the best available HP/defense items (shield/armor/robe/gauntlet), emit a plan.
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {bossObjective,gateObjective} from './gate.mjs'; import {readFileSync,writeFileSync} from 'node:fs';
const [,,file,dd,f,cids,out,start]=process.argv; const s=T.loadSave(file); (await import('./race.mjs')).applyRace(s); const m=O.buildModel(s,0); const before=O.snapshotJ(m); const free0={...m.jewels};
if(start&&start!=='none') replay(m,JSON.parse(readFileSync(start,'utf8')).calls);
const obj=+f===7?bossObjective({d:+dd,N:400,seed:11}):gateObjective({d:+dd,f:+f,N:400,seed:11}); const last=()=>+f===7?bossObjective.last:gateObjective.last;
await obj(s); console.log('before',JSON.stringify(last()));
const DEF=new Set(['shield','armor','robe','gauntlet']); const score=(it)=>(it.partyHP||0)*(1+0.1*(it.enhancement||0))+(it.physicalDefense||0)*0.5;
for(const cid of cids.split(',').map(Number)){ const ci=m.p.characters.findIndex(c=>c.id===cid); const c=m.p.characters[ci];
  for(let si=0;si<m.slots[ci];si++){ const it=c.equipment[si]; if(it&&DEF.has(it.category)) continue;
    let best=null; for(const [k,e] of m.pool){ if(e.free<=0||!DEF.has(e.item.category)||!O.canEquip(m,ci,k)) continue; if(!best||score(e.item)>score(m.pool.get(best).item)) best=k; }
    if(best){ console.log('slot',cid,si,it?it.id+'/'+it.category:'-','->',best); O.setSlot(m,ci,si,best);} } }
await obj(s); console.log('after',JSON.stringify(last()),'HP',T.computePartyStats(m.p).partyStats.hp);
const calls=O.planCalls(before,m,free0); writeFileSync(out,JSON.stringify({calls})); console.log('calls',calls.length);
