// Race experiment on a frozen checkpoint: swap one character's race (keep class/lineage/trait + gear), trim surplus gear greedily, measure gate/boss success.
import {T} from './lib.mjs'; import {gateObjective,bossObjective} from './gate.mjs';
const [,,file,f,N,who,races]=process.argv;
const base=T.loadSave(file);
const obj=(+f===7)?bossObjective({d:+(process.env.D||8),N:+N,seed:11}):gateObjective({d:+(process.env.D||8),f:+f,N:+N,seed:11});
const succ=()=>(+f===7)?bossObjective.last.clear:gateObjective.last.succ;
async function evalState(s){ await obj(s); return succ(); }
console.log('baseline',(await evalState(structuredClone(base))*100).toFixed(1));
for(const race of races.split(',')){
  for(const id of who.split(',').map(Number)){
    const s=structuredClone(base); const p=s.parties[0]; const ci=p.characters.findIndex(c=>c.id===id); const c=p.characters[ci];
    const [r,mc,sc,ln,pr]=race.split(':'); c.raceId=r; if(mc)c.mainClassId=mc; if(sc)c.subClassId=sc; if(ln)c.lineageId=ln; if(pr)c.predispositionId=pr;
    const slots=T.computeCharacterStatsInParty(p,ci).maxEquipSlots;
    // drop incompatible
    c.equipment=c.equipment.map(it=>it&&T.canCharacterEquipCategory(c,it.category)?it:null);
    let items=c.equipment.filter(Boolean);
    while(items.length>slots){ let best=-1,bi=0; for(let k=0;k<items.length;k++){ c.equipment=items.filter((_,j)=>j!==k); const v=await evalState(s); if(v>best){best=v;bi=k;} } items=items.filter((_,j)=>j!==bi); }
    c.equipment=[...items]; while(c.equipment.length<slots) c.equipment.push(null);
    const st=T.computeCharacterStatsInParty(p,ci); const hp=T.computePartyStats(p).partyStats.hp;
    console.log(id,c.name,race,'slots',slots,'items',items.length,'HP',hp,'succ',(await evalState(s)*100).toFixed(1));
  }
}
