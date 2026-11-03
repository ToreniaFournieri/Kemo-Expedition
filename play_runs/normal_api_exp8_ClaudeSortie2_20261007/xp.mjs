import {T,sim,summarize} from '/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin/lib.mjs';
const s=T.loadSave(process.argv[2]);
for(const d of [1,2,3,4,5]){ const r=await sim(structuredClone(s),0,150,7,{dest:d,depth:'all'}); const x=summarize(r); console.log('D'+d,'xp/run',Math.round(x.xp),'C',x.C.toFixed(2),'R',x.R.toFixed(2),'Df',x.Df.toFixed(2),'Rt',x.Rt.toFixed(2)); }
