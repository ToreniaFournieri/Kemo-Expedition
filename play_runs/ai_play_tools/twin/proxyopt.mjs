// Deterministic attacker-loadout optimizer on a damage proxy. usage: proxyopt.mjs save out "cid,cid" "fire:1.5,ice:0.8,thunder:0.3,none:1" [start] [targetDef]
// proxy = A * (1+distinct c.bonus) * elem(target) * sum_{n<NoA} potency*decay^n ; A = ranged/magical attack from the game's stat function.
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {replay} from './replay.mjs'; import {readFileSync,writeFileSync} from 'node:fs';
const [,,file,out,cids,elemSpec,start,defA]=process.argv; const s=T.loadSave(file); (await import('./race.mjs')).applyRace(s); const m=O.buildModel(s,0);
const before=O.snapshotJ(m); const free0={...m.jewels}; { const inv={}; for(const [k,v] of Object.entries(s.global.inventory)) if(v.status==='owned'&&v.count>0) inv[O.vkey(v.item)]=v.count; m.invFree0=inv; }
if(start&&start!=='none') replay(m,JSON.parse(readFileSync(start,'utf8')).calls);
const EM=Object.fromEntries(elemSpec.split(',').map(x=>{const [k,v]=x.split(':');return [k,+v];})); const DEF=+(defA||0);
const OFF=new Set(['arrow','bolt','archery','wand','catalyst','grimoire']);
function proxy(ci){ const st=T.computeCharacterStatsInParty(m.p,ci); const magic=st.magicalAttack>st.rangedAttack;
  const A=magic?st.magicalAttack:st.rangedAttack; const N=magic?st.magicalNoA:st.rangedNoA; const bonus=1+(magic?st.magicalAttackCBonus:st.rangedAttackCBonus+st.physicalAttackCBonus);
  const el=EM[st.elementalOffense||'none']??1; const ev=st.elementalOffenseValue||1; const pot=magic?1:st.accuracyPotency; const decay=Math.min(0.98,Math.max(0.70,0.90+(st.accuracyBonus||0)));
  let hits=0; for(let n=0;n<N;n++) hits+=Math.min(1,pot)*Math.pow(decay,n); const perHit=Math.max(0,A*bonus*ev-DEF);
  return perHit*el*hits; }
const ids=cids.split(',').map(Number); const R=O.rng(7);
const BAN=new Set((process.env.BAN||'').split(',').filter(Boolean));
for(const [k,e] of m.pool) if(BAN.has(e.item.elementalOffense)) e.free=0;
for(const id of ids){ const ci=m.p.characters.findIndex(c=>c.id===id); const b0=proxy(ci);
  m.p.characters[ci].equipment.forEach((it,si)=>{ if(it&&BAN.has(it.elementalOffense)) O.setSlot(m,ci,si,null); }); let best=proxy(ci);
  for(let pass=0;pass<6;pass++){ let improved=false;
    for(let si=0;si<m.slots[ci];si++){ for(const [k,e] of m.pool){ if(e.free<=0||!OFF.has(e.item.category)||!O.canEquip(m,ci,k)) continue; const cur=m.p.characters[ci].equipment[si]; if(cur&&O.vkey(cur)===k) continue;
        const undo=O.setSlot(m,ci,si,k); const v=proxy(ci); if(v>best*1.0005){ best=v; improved=true; } else undo(); } }
    if(!improved) break; }
  const st=T.computeCharacterStatsInParty(m.p,ci); console.log(id,'proxy',b0.toFixed(0),'->',best.toFixed(0),'A',st.rangedAttack||st.magicalAttack,'NoA',st.rangedNoA||st.magicalNoA,'el',st.elementalOffense,(+st.elementalOffenseValue).toFixed(2), m.p.characters[ci].equipment.map(e=>e?e.id+'/'+e.enhancement:'-').join(' ')); }
if(!process.env.NOJEWEL){ for(let pass=0;pass<3;pass++){ let imp=false;
  for(const id of ids){ const ci=m.p.characters.findIndex(c=>c.id===id); const c=m.p.characters[ci];
    for(let si=0;si<m.slots[ci];si++){ const it=c.equipment[si]; if(!it) continue;
      for(const jk of Object.keys(m.jewels)){ if(m.jewels[jk]<=0) continue; const [key,rk]=jk.split(':'); if(!T.isJewelAllowedForCategory(it.category,key)) continue; if(it.jewel&&it.jewel.key===key&&it.jewel.rank===+rk) continue;
        const b=proxy(ci); const old=it.jewel; if(old) m.jewels[old.key+':'+old.rank]++; m.jewels[jk]--; it.jewel={key,rank:+rk};
        const v=proxy(ci); if(v>b*1.002){ imp=true; console.log('jewel',id,si,jk,b.toFixed(0),'->',v.toFixed(0)); } else { it.jewel=old; m.jewels[jk]++; if(old) m.jewels[old.key+':'+old.rank]--; } } } }
  if(!imp) break; } }
const calls=O.planCalls(before,m,free0); writeFileSync(out,JSON.stringify({calls})); console.log('calls',calls.length);
