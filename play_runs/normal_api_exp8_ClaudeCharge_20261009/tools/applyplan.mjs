// applyplan.mjs in plan.json out [deityId]  : apply plan calls with the exact commit code, optional deity, write save
import { Emu, A } from './emu.mjs';
import { readFileSync } from 'node:fs';
const [,, inp, plan, out, deity] = process.argv;
const e = new Emu(A.loadSave(inp), Date.now(), 1);
if (plan && plan !== 'none') for (const c of JSON.parse(readFileSync(plan, 'utf8')).calls) { const r = e.commit(c.path.replace('/api/v1/', '').replace(/^\//, ''), c.params); if (r.error) console.log('FAIL', c.path, r.error); }
if (deity) { const r = e.commit('commit/build/party/1', { deityId: deity }); if (r.error) console.log('deity FAIL', r.error); }
A.writeSave(out, e.state); console.log('wrote', out);
