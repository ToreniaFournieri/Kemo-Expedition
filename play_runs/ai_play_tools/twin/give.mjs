// Give specific item variants to characters (replacing their weakest weapon slot), evaluate a stage, emit plan. usage: give.mjs save d f "cid=id-enh-sr,..." out [start]
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {bossObjective,gateObjective} from './gate.mjs'; import {readFileSync,writeFileSync} from 'node:fs';
const [,,file,dd,f,spec,out,start]=process.argv; const s=T.loadSave(file); (await import('./race.mjs')).applyRace(s); const m=O.buildModel(s,0); const before=O.snapshotJ(m); const free0={...m.jewels};
{ const inv={}; for(const [k,v] of Object.entries(s.global.inventory)) if(v.status==='owned'&&v.count>0) inv[O.vkey(v.item)]=v.count; m.invFree0=inv; }
if(start&&start!=='none') replay(m,JSON.parse(readFileSync(start,'utf8')).calls);
const N=+(process.env.N||400); const obj=+f===7?bossObjective({d:+dd,N,seed:11}):gateObjective({d:+dd,f:+f,N,seed:11}); const last=()=>+f===7?bossObjective.last:gateObjective.last;
await obj(s); console.log('before',JSON.stringify(last()));
const wscore=(it)=>((it.rangedAttack||0)+(it.magicalAttack||0)+(it.rangedNoABonus||0)*30+(it.magicalNoABonus||0)*30+(it.partyHP||0)*0.3+(it.physicalDefense||0)*0.3)*(1+0.1*(it.enhancement||0));
if(spec) for(const part of spec.split(',')){ const [cid,k]=part.split('='); const ci=m.p.characters.findIndex(c=>c.id===+cid); const c=m.p.characters[ci];
  let bs=-1,bv=1e9; for(let si=0;si<m.slots[ci];si++){ const it=c.equipment[si]; const v=it?wscore(it):-1; if(v<bv){bv=v;bs=si;} } if(!m.pool.get(k)||m.pool.get(k).free<=0){ console.log('unavailable',k); continue; } O.setSlot(m,ci,bs,k); }
await obj(s); console.log('after',spec,JSON.stringify(last()));
writeFileSync(out,JSON.stringify({calls:O.planCalls(before,m,free0)}));
