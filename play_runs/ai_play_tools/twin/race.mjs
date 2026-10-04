// RACE env: "cid:race[:main:sub:lineage:pred];..." applied to party 0 in place (as changeBuild does when gear stays valid).
export function applyRace(state,spec=process.env.RACE){
  const p=state.parties[0]; if(process.env.DEITY) p.deity={...p.deity,name:process.env.DEITY};
  if(process.env.ORDER){ const ids=process.env.ORDER.split(',').map(Number); const by=new Map(p.characters.map(c=>[c.id,c])); p.characters=ids.map(i=>by.get(i)); }
  if(!spec) return;
  for(const part of spec.split(';')){ const [cid,r,mc,sc,ln,pr]=part.split(':'); const c=p.characters.find(x=>x.id===+cid);
    if(r)c.raceId=r; if(mc)c.mainClassId=mc; if(sc)c.subClassId=sc; if(ln)c.lineageId=ln; if(pr)c.predispositionId=pr; }
}
