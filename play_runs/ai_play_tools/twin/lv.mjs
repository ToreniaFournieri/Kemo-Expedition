import {T} from './lib.mjs';
const s=T.loadSave(process.argv[2]); const p=s.parties[0]; console.log('level',p.level,'exp',p.experience);
