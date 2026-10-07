import {T,sim,summarize} from './lib.mjs';
const s=T.loadSave(process.argv[2]);
for(const d of [3,4,5,6]){ const r=await sim(structuredClone(s),0,150,7,{dest:d,depth:'all'}); const x=summarize(r); console.log('D'+d,'xp/run',Math.round(x.xp),'C',x.C.toFixed(2),'R',x.R.toFixed(2),'Df',x.Df.toFixed(2),'Rt',x.Rt.toFixed(2)); }
