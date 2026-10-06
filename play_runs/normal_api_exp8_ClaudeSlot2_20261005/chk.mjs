import {T,sim,summarize,fmt} from '/home/user/Kemo-Expedition/play_runs/ai_play_tools/twin/lib.mjs';
const [,,file,d,n]=process.argv; const s=T.loadSave(file);
const p=s.parties[0];
console.log('gates',JSON.stringify(p.clearGateStatus), 'lvl',p.level, p.characters.map(c=>[c.id,c.race,c.mainClass,c.subClass,T.computeCharacterStatsInParty(p,p.characters.indexOf(c)).maxEquipSlots,c.equipment.filter(Boolean).length].join(':')).join(' '));
for(const dd of [+d]){ const r=summarize(await sim(s,0,+(n||300),1,{dest:dd,depth:'all'})); console.log(dd,JSON.stringify(Object.fromEntries(Object.entries(r).map(([k,v])=>[k,+fmt(v)]))));}
