// fullreset.mjs in out [cids]  : set FULL mode + forceFull auto equipment for party 1 characters (all or listed), write save
import * as A from './api2.mjs';
await A.ensureLanguageLoaded('en');
const [,, inp, out, cidsS] = process.argv;
let s = A.loadSave(inp);
const p = s.parties[0];
const cids = cidsS ? cidsS.split(',').map(Number) : p.characters.map(c => c.id);
for (const c of p.characters) if (cids.includes(c.id)) c.autoEquipmentMode = 2;
for (const cid of cids) s = A.applyAutoEquipment(s, 0, cid, true);
for (const c of s.parties[0].characters) console.log(c.name, c.autoEquipmentMode, c.equipment.map(x=>x?x.id+'/'+x.enhancement:'-').join(' '));
A.writeSave(out, s);
