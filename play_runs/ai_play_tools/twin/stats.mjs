import {T} from './lib.mjs'; import * as O from './opt.mjs'; import {readFileSync} from 'node:fs';
const [,,file,plan,pi]=process.argv; const s=T.loadSave(file); const m=O.buildModel(s,+(pi||0));
if(plan&&plan!=='none'){ const j=JSON.parse(readFileSync(plan,'utf8')); O.applyDiff(m,j.diff||j); }
const p=m.p; p.characters.forEach((c,i)=>{ const st=T.computeCharacterStatsInParty(p,i);
 console.log(c.name,c.mainClassId+'/'+c.subClassId,'slots',st.maxEquipSlots,'R',st.rangedAttack,'xNoA',st.rangedNoA,'ampR',st.physicalOffenseMultiplier?.toFixed?.(2),'cR',st.rangedAttackCBonus?.toFixed?.(2),'cP',st.physicalAttackCBonus?.toFixed?.(2),'pen',st.penetMultiplier,'acc',st.accuracyBonus?.toFixed?.(3),'pd',st.physicalDefense,'md',st.magicalDefense,'M',st.magicalAttack,'xNoA_M',st.magicalNoA,'abil',st.abilities.map(a=>a.id+a.level).join(','));
 console.log('   eq',c.equipment.map(it=>it?it.id+'+'+it.enhancement:'-').join(' '));});
