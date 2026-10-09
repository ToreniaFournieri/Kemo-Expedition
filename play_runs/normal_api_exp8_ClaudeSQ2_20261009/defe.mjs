import {T} from '../ai_play_tools/twin/lib.mjs';
const s=T.loadSave(process.argv[2]); console.log(JSON.stringify(s.parties[0].defeatedBossExpeditions));
