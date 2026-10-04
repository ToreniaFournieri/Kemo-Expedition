// Apply an API call plan to a loaded state the way the server would (verification of planCalls) and report stages.
import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {stageReport,printReport} from './stages.mjs'; import {readFileSync} from 'node:fs';
export function replay(m,calls){
  const idx=new Map(m.p.characters.map((c,i)=>[c.id,i]));
  for(const {path,params} of calls){
    const [,,,,cid, op]=path.split('/'); const ci=idx.get(+cid); const c=m.p.characters[ci]; if(ci===undefined) continue;
    if(op==='removeEquipment'){ const sl=[].concat(params.targetEquipment); for(const si of sl){ const it=c.equipment[si]; if(!it) throw new Error('slot_empty'); O.setSlot(m,ci,si,null); } }
    else if(op==='equip'){ const items=[].concat(params.targetEquipment); const fmt=(s)=>{const [,i,e,sr]=s.split('/'); return `${i}-${e}-${sr}`;};
      if(params.targetSlot!==undefined){ O.setSlot(m,ci,params.targetSlot,fmt(items[0])); }
      else { const frees=[]; for(let si=0;si<m.slots[ci];si++) if(!c.equipment[si]) frees.push(si); items.forEach((s,i)=>{ if(frees[i]===undefined) throw new Error('no_free_slot'); O.setSlot(m,ci,frees[i],fmt(s)); }); } }
    else if(op==='jewelAttach'){ const [key,rk]=params.jewelToSet.split(':'); const it=c.equipment[params.targetEquipment]; if(!it) throw new Error('slot_empty'); if((m.jewels[params.jewelToSet]||0)<=0) throw new Error('jewel_not_owned '+params.jewelToSet); if(it.jewel) m.jewels[it.jewel.key+':'+it.jewel.rank]++; m.jewels[params.jewelToSet]--; it.jewel={key,rank:+rk}; }
    else if(op==='jewelRemove'){ const it=c.equipment[params.targetEquipment]; if(!it||!it.jewel) throw new Error('no_jewel'); m.jewels[it.jewel.key+':'+it.jewel.rank]++; it.jewel=null; }
  }
}
if(process.argv[1].endsWith('replay.mjs')){
  const [,,file,plan,dd,n]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,0);
  replay(m,JSON.parse(readFileSync(plan,'utf8')).calls);
  printReport(await stageReport(s,0,+dd,{n:+(n||400),seed:4242}));
}
