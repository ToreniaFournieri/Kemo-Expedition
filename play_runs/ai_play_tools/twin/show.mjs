import * as T from './twin.mjs';
const f=process.argv[2]; const pi=+(process.argv[3]||0);
const s=T.loadSave(f); const p=s.parties[pi];
const cs=T.computePartyStats(p);
console.log('lvl',p.level,'deity',JSON.stringify(p.deity),'gold',s.global?.gold,'dest',p.selectedDungeonId,'hp',cs.partyStats.hp);
for(const c of p.characters){console.log(c.id,c.name,c.raceId,c.mainClassId+'/'+c.subClassId,c.lineageId,c.predispositionId,'auto',c.autoEquipmentMode,'eq:',c.equipment.map(e=>e?e.id+(e.jewel?'*':''):'-').join(' '));}
console.log(Object.keys(s.global));
