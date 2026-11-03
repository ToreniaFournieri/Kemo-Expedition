// Greedy single-swap search on support characters maximizing party HP + w*physicalDefense. usage: hpopt.mjs save out "1,6" [start] [wdef]
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {readFileSync,writeFileSync} from 'node:fs';
const [,,file,out,cids,start,wd]=process.argv; const s=T.loadSave(file); (await import('./race.mjs')).applyRace(s); const m=O.buildModel(s,0);
const before=O.snapshotJ(m); const free0={...m.jewels}; { const inv={}; for(const [k,v] of Object.entries(s.global.inventory)) if(v.status==='owned'&&v.count>0) inv[O.vkey(v.item)]=v.count; m.invFree0=inv; }
if(start&&start!=='none') replay(m,JSON.parse(readFileSync(start,'utf8')).calls);
const W=+(wd||0.5); const DEF=new Set(['shield','armor','robe','gauntlet']);
const score=(ci)=>{ m.p.characters=[...m.p.characters]; const ps=T.computePartyStats(m.p); return ps.partyStats.hp+W*(ps.characterStats[ci].physicalDefense+0.5*ps.characterStats[ci].magicalDefense); };
console.log('HP before',T.computePartyStats(m.p).partyStats.hp);
for(const id of cids.split(',').map(Number)){ const ci=m.p.characters.findIndex(c=>c.id===id); let best=score(ci);
  for(let pass=0;pass<5;pass++){ let imp=false; for(let si=0;si<m.slots[ci];si++){ for(const [k,e] of m.pool){ if(e.free<=0||!DEF.has(e.item.category)||!O.canEquip(m,ci,k)) continue; const cur=m.p.characters[ci].equipment[si]; if(cur&&O.vkey(cur)===k) continue; const undo=O.setSlot(m,ci,si,k); const v=score(ci); if(v>best+0.5){best=v;imp=true;} else undo(); } } if(!imp) break; } }
m.p.characters=[...m.p.characters]; const ps=T.computePartyStats(m.p); console.log('HP after',ps.partyStats.hp, m.p.characters.map((c,i)=>c.name+':pdef'+ps.characterStats[i].physicalDefense).join(' '));
writeFileSync(out,JSON.stringify({calls:O.planCalls(before,m,free0)}));
