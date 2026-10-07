import {T} from './lib.mjs';
const s=T.loadSave(process.argv[2]);
s.parties.forEach((p,i)=>p.characters.forEach(c=>{if(c.isUnique)console.log('PT'+(i+1),c.id,c.name,c.uniqueCharacterId)}));
