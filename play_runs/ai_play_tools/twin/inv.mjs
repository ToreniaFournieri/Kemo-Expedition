import * as T from './twin.mjs';
const s=T.loadSave(process.argv[2]);
console.log(JSON.stringify(s.global.inventory).slice(0,1500));
console.log('jewels',JSON.stringify(s.global.jewels).slice(0,800));
