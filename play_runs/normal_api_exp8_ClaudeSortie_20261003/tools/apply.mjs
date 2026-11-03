// Apply an optimizer plan with the fewest calls: per character keep matching items, 1-call targetSlot replacement,
// otherwise removeEquipment(list) + equip(array); then jewel attaches on the resulting slot layout.
// usage: node apply.mjs plan.json save.kemoz [--dry]
import fs from 'node:fs';
import { Client } from './client.mjs';
import { loadSave } from './twin/tw.mjs';
const [planFile, saveFile, flag] = process.argv.slice(2);
const dry = flag === '--dry';
const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
const guardFile = '/tmp/bk/applied_saves.json';
const appliedSaves = fs.existsSync(guardFile) ? JSON.parse(fs.readFileSync(guardFile, 'utf8')) : [];
if (!dry && appliedSaves.includes(saveFile) && !process.env.FORCE_REAPPLY) { console.log('REFUSED: a plan was already applied on top of', saveFile, '- export a fresh save first'); process.exit(2); }
if (!dry) fs.writeFileSync(guardFile, JSON.stringify([...appliedSaves, saveFile]));
let state = loadSave(saveFile);
const pendingBuilds = (plan.builds || []).filter(b => { const c = state.parties[0].characters.find(x => x.id === b.id); return c.mainClassId !== b.mainClassId || c.subClassId !== b.subClassId || (b.predisposition && c.predispositionId !== b.predisposition); });
if (pendingBuilds.length && !dry) {
  const cb = new Client();
  for (const b of pendingBuilds) await cb.call(`/commit/build/character/${b.id}/changeBuild`, { mainClassId: b.mainClassId, subClassId: b.subClassId, ...(b.predisposition ? { predisposition: b.predisposition } : {}), simulation: false, confirmation: 'yes' }, { label: 'apply-build' });
  await cb.exportSave('/tmp/bk/saves/after_build.kemoz'); state = loadSave('/tmp/bk/saves/after_build.kemoz');
}
const toItemS = it => `0/${it.id}/${it.enhancement}/${it.superRare ?? 0}`;
plan.initialEq = Object.fromEntries(state.parties[0].characters.map(c => [c.id, c.equipment.map(x => x && { item: toItemS(x), jewel: x.jewel ? `${x.jewel.key}:${x.jewel.rank}` : null })]));
plan.initialOrder = state.parties[0].characters.map(c => c.id);
const ik = s => s.split('/').slice(1, 4).join('/'); // id/enh/sr
const free = new Map(); // id/enh/sr -> free inventory count
for (const v of Object.values(state.global.inventory)) if (v.status === 'owned' && v.count > 0) { const k = `${v.item.id}/${v.item.enhancement}/${v.item.superRare ?? 0}`; free.set(k, (free.get(k) || 0) + v.count); }
const freeJ = new Map(Object.entries(state.global.jewels || {}).filter(([, v]) => v > 0));
const ops = []; // {cid, kind, rem:[slots], add:[items], slotsAfter}
const layout = new Map(); // cid -> array of {k, j} current (simulated) layout
for (const [cid, cur] of Object.entries(plan.initialEq)) layout.set(Number(cid), cur.map(x => x && { k: ik(x.item), j: x.jewel }));
const want = new Map(Object.entries(plan.eq).map(([cid, t]) => [Number(cid), t.filter(Boolean).map(x => ({ k: ik(x.item), j: x.jewel }))]));
for (const [cid, tgt] of want) {
  const cur = layout.get(cid); const usedSlots = new Set(); const add = [];
  for (const t of tgt) {
    let si = cur.findIndex((x, i) => x && !usedSlots.has(i) && x.k === t.k && x.j === t.j);
    if (si < 0) si = cur.findIndex((x, i) => x && !usedSlots.has(i) && x.k === t.k);
    if (si >= 0) usedSlots.add(si); else add.push(t.k);
  }
  const rem = cur.map((x, i) => x && !usedSlots.has(i) ? i : -1).filter(i => i >= 0);
  if (rem.length || add.length) ops.push({ cid, rem, add });
}
const calls = [];
const pending = [...ops];
// phase A: multi-slot removals (free items first so other characters can take them)
for (const op of pending) if (op.rem.length && !(op.rem.length === 1 && op.add.length === 1)) {
  calls.push({ route: `/commit/build/character/${op.cid}/removeEquipment`, parameters: { targetEquipment: op.rem.length === 1 ? op.rem[0] : op.rem } });
  for (const s of op.rem) { const x = layout.get(op.cid)[s]; free.set(x.k, (free.get(x.k) || 0) + 1); if (x.j) freeJ.set(x.j, (freeJ.get(x.j) || 0) + 1); layout.get(op.cid)[s] = null; }
  op.rem = []; op.removed = true;
}
// phase B: equips in dependency order
let guard = 0;
while (pending.some(o => o.add.length) && guard++ < 50) {
  let progressed = false;
  for (const op of pending) {
    if (!op.add.length) continue;
    const need = new Map(); for (const k of op.add) need.set(k, (need.get(k) || 0) + 1);
    if ([...need].some(([k, n]) => (free.get(k) || 0) < n)) continue;
    const L = layout.get(op.cid);
    if (op.rem.length === 1 && op.add.length === 1) {
      const s = op.rem[0], old = L[s];
      calls.push({ route: `/commit/build/character/${op.cid}/equip`, parameters: { targetEquipment: '0/' + op.add[0], targetSlot: s } });
      free.set(old.k, (free.get(old.k) || 0) + 1); if (old.j) freeJ.set(old.j, (freeJ.get(old.j) || 0) + 1);
      free.set(op.add[0], free.get(op.add[0]) - 1); L[s] = { k: op.add[0], j: null };
    } else {
      calls.push({ route: `/commit/build/character/${op.cid}/equip`, parameters: { targetEquipment: op.add.length === 1 ? '0/' + op.add[0] : op.add.map(k => '0/' + k) } });
      for (const k of op.add) { free.set(k, free.get(k) - 1); const e = L.findIndex(x => !x); L[e] = { k, j: null, placed: true }; }
    }
    op.add = []; op.rem = []; progressed = true;
  }
  if (!progressed) { // break a cycle: turn one pending single replacement into removal first
    const op = pending.find(o => o.add.length && o.rem.length);
    if (!op) throw new Error('unresolvable plan');
    calls.push({ route: `/commit/build/character/${op.cid}/removeEquipment`, parameters: { targetEquipment: op.rem[0] } });
    const x = layout.get(op.cid)[op.rem[0]]; free.set(x.k, (free.get(x.k) || 0) + 1); if (x.j) freeJ.set(x.j, (freeJ.get(x.j) || 0) + 1); layout.get(op.cid)[op.rem[0]] = null; op.rem = [];
  }
}
const orderChanged = plan.order.join() !== plan.initialOrder.join();
const c = dry ? null : new Client();
const live = new Map(); // cid -> equipment strings returned by the server
async function run(step) {
  if (dry) { console.log('DRY', JSON.stringify(step)); return null; }
  const d = await c.call(step.route, step.parameters, { label: 'apply' });
  return d;
}
for (const step of calls) {
  const d = await run(step);
  const cid = Number(step.route.split('/')[4]);
  const cur = d?.current?.equipment ?? d?.current ?? d?.equipment;
  if (Array.isArray(cur)) live.set(cid, cur);
}
if (orderChanged) await run({ route: '/commit/build/party/1', parameters: { order: plan.order } });
// jewels: work on server layouts when available (equip response), else simulated layout
const parseSlot = s => { if (!s || s === '0' || s === 0) return null; const a = String(s).split('/'); if (a.length < 5 || a[2] === '0') return null; return { k: a.slice(2, 5).join('/'), j: a[5] || null }; };
if (!dry && live.size) console.log('server layout sample', JSON.stringify([...live][0]).slice(0, 300));
const jcalls = [];
for (const [cid, tgt] of want) {
  const L = live.has(cid) ? live.get(cid).map(parseSlot) : layout.get(cid).map(x => x && { k: x.k, j: x.j });
  const used = new Set();
  // first pass: items already carrying the wanted jewel
  const todo = [];
  for (const t of tgt) {
    let si = L.findIndex((x, i) => x && !used.has(i) && x.k === t.k && x.j === t.j);
    if (si >= 0) { used.add(si); continue; }
    todo.push(t);
  }
  for (const t of todo) {
    let si = L.findIndex((x, i) => x && !used.has(i) && x.k === t.k && !x.j);
    if (si < 0) si = L.findIndex((x, i) => x && !used.has(i) && x.k === t.k);
    if (si < 0) { console.log('WARN no slot for', cid, t); continue; }
    used.add(si);
    if (t.j && L[si].j !== t.j) jcalls.push({ route: `/commit/build/character/${cid}/jewelAttach`, parameters: { targetEquipment: si, jewelToSet: t.j }, frees: L[si].j });
    else if (!t.j && L[si].j) jcalls.push({ route: `/commit/build/character/${cid}/jewelRemove`, parameters: { targetEquipment: si }, frees: L[si].j, remove: true });
  }
}
// order: removals, then attaches whose jewel is free, repeating
const jq = [...jcalls.filter(x => x.remove), ...jcalls.filter(x => !x.remove)];
let g2 = 0;
while (jq.length && g2++ < 100) {
  const i = jq.findIndex(x => x.remove || (freeJ.get(x.parameters.jewelToSet) || 0) > 0);
  if (i < 0) { // swap cycle: detach one blocking jewel first, then retry
    const x0 = jq[0]; await run({ route: x0.route.replace('jewelAttach', 'jewelRemove'), parameters: { targetEquipment: x0.parameters.targetEquipment } });
    if (x0.frees) freeJ.set(x0.frees, (freeJ.get(x0.frees) || 0) + 1); x0.frees = null; continue; }
  const x = jq.splice(i, 1)[0];
  if (!x.remove) freeJ.set(x.parameters.jewelToSet, freeJ.get(x.parameters.jewelToSet) - 1);
  if (x.frees) freeJ.set(x.frees, (freeJ.get(x.frees) || 0) + 1);
  await run({ route: x.route, parameters: x.parameters });
}
console.log('done; equipment calls', calls.length, 'jewel calls', jcalls.length, 'order', orderChanged, dry ? '' : 'total calls ' + c.s.calls);
