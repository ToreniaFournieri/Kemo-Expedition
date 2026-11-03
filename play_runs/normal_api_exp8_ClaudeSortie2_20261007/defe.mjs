import {T} from '/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/ai_play_tools/twin/lib.mjs';
const s=T.loadSave(process.argv[2]); console.log(JSON.stringify(s.parties[0].defeatedBossExpeditions),'level',s.parties[0].level);
