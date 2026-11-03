import {T} from '/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin/lib.mjs';
const s=T.loadSave(process.argv[2]); const p=s.parties[0];
for(const e of p.diaryLogs.slice(0,14)) console.log(JSON.stringify(e,(k,v)=>Array.isArray(v)&&v.length>6?'[arr]':(typeof v==='object'&&v&&JSON.stringify(v).length>200?'{..}':v)).slice(0,330));
