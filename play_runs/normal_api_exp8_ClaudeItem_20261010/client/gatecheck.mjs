import { Emu, A } from '/Users/Torenia/Documents/ChatGPT/BoKemo/play_runs/normal_api_exp8_ClaudeItem_20261010/tools/emu.mjs';
const [,, file, depth, n] = process.argv;
const s = A.loadSave(file); const p0 = s.parties[0]; p0.expeditionDepthLimit = depth;
console.log('bossGate unlocked?', !!p0.clearGateStatus?.[6604], 'progress', p0.clearGateProgress?.['6604'], 'defeated6', !!p0.defeatedBossExpeditions?.[6]);
const e = new Emu(s, Date.parse('2026-10-18T03:11:00Z'), +(process.env.SEED||3)); const tally = {}; let floors = {};
for (let i = 0; i < +n; i++) { const st0 = e.stats(); await e.elapsed(3600); const st1 = e.stats();
  const log = e.p().lastExpeditionLog; const last = log?.entries?.at(-1); const key = last ? `${last.floorNumber ?? last.floor}-${last.roomInFloor ?? last.room}` : '?';
  ['C','R','D','Rt','Df'].forEach((k, j) => { tally[k] = (tally[k] || 0) + st1[j] - st0[j]; });
  floors[key] = (floors[key] || 0) + 1; if (e.boss(6)) { console.log('BOSS DEFEATED at step', i); break; } }
console.log(JSON.stringify(tally), 'gate', e.p().clearGateProgress?.['6604'], 'lastRoomOfLastRunPerStep', JSON.stringify(floors));
