// itemswap.mjs save d N basePlan itemKey "cid,..." out : put one copy of itemKey (e.g. 6309-0-0) into each slot of each listed
// character (on top of basePlan), score boss-only dmg/kills, write the best variant's plan to out. Use for ability items
// (a.illusion-breaker vs a.illusion bosses, etc.) that attack-score optimizers ignore.
import {T} from '../../ai_play_tools/twin/lib.mjs'; import * as O from '../../ai_play_tools/twin/opt.mjs'; import {replay} from '../../ai_play_tools/twin/replay.mjs';
import {bossOnlyObjective} from '../../ai_play_tools/twin/bossonly.mjs'; import {readFileSync,writeFileSync} from 'node:fs';
await T.ensureLanguageLoaded('en');
const [,,file,dS,NS,plan,key,cids,out]=process.argv; const d=+dS,N=+NS;
const s=T.loadSave(file); (await import('../../ai_play_tools/twin/race.mjs')).applyRace(s); const m=O.buildModel(s,0);
const before=O.snapshotJ(m); const free0={...m.jewels}; { const inv={}; for(const [k,v] of Object.entries(s.global.inventory)) if(v.status==='owned'&&v.count>0) inv[O.vkey(v.item)]=v.count; m.invFree0=inv; }
if(plan&&plan!=='none') replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
const obj=bossOnlyObjective({d,N,seed:5,reachN:20});
await obj(s); const base=bossOnlyObjective.last; console.log('base',JSON.stringify(base));
let best={v:base.dmg+base.kills,desc:'base',snap:null};
for(const id of cids.split(',').map(Number)){ const ci=m.p.characters.findIndex(c=>c.id===id); if(!O.canEquip(m,ci,key)) { console.log(id,'cannot equip'); continue; }
  for(let si=0;si<m.slots[ci];si++){ const cur=m.p.characters[ci].equipment[si]; const undo=O.setSlot(m,ci,si,key); m.p.characters=[...m.p.characters];
    await obj(s); const r=bossOnlyObjective.last; const v=r.dmg+r.kills; console.log(m.p.characters[ci].name,'slot',si,'was',cur?O.vkey(cur):'-',JSON.stringify(r));
    if(v>best.v) best={v,desc:`${id}:${si}`,calls:O.planCalls(before,m,free0)}; undo(); } }
console.log('best',best.desc,best.v.toFixed(3)); writeFileSync(out,JSON.stringify({calls:best.calls||O.planCalls(before,m,free0)}));
