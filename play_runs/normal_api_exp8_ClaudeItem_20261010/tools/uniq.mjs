// uniq.mjs save d N "cid:race:lineage:pred:uniqueId" ... -> boss-only dmg/kills + full route for each variant (gear kept)
import {T} from '../../ai_play_tools/twin/lib.mjs';
import {bossOnlyObjective} from '../../ai_play_tools/twin/bossonly.mjs';
await T.ensureLanguageLoaded('en');
const [,,file,dS,NS,...vs]=process.argv;
for (const v of ['base',...vs]) { const s=T.loadSave(file); const p=s.parties[0];
  if (v!=='base') for (const part of v.split(';')) { const [cid,race,lin,pred,uid]=part.split(':'); const c=p.characters.find(x=>x.id===+cid); if(race)c.raceId=race; if(lin)c.lineageId=lin; if(pred)c.predispositionId=pred; if(uid)c.uniqueCharacterId=uid; }
  p.characters=[...p.characters];
  const st=T.computeCharacterStatsInParty(p,p.characters.findIndex(c=>c.id===5));
  await bossOnlyObjective({d:+dS,N:+NS,seed:5,reachN:80})(s); console.log(v.padEnd(40),'Selfin M',st.magicalAttack,'x',st.magicalNoA,JSON.stringify(bossOnlyObjective.last)); }
