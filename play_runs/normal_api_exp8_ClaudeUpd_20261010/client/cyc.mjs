import { Emu, A } from '/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeUpd_20261010/tools/emu.mjs';
const s = A.loadSave(process.argv[2]); const e = new Emu(s, Date.parse(process.argv[3]||'2026-10-11T02:35:00Z'), 1);
console.log('cycle min', (e.cyc()/60000).toFixed(1), 'stock', e.stock(), 'lv', e.p().level);
