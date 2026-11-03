// Local search on the exact save: objective = expected runs over the chosen stages + LAMBDA * API calls of the plan.
// usage: node opt.mjs save.kemoz DEST STAGES(e.g. 5,6,7) ITERS SEED OUT.json   env: N (runs/eval), LAMBDA, ORDER=1, CHARS=1,2 (limit), ELEM
import fs from 'node:fs';
import { T, loadSave, stageSim, expRuns, GATE_K, bossDamage, wallProgress } from './tw.mjs';

const [file, dArg, stagesArg, itersArg, seedArg, out] = process.argv.slice(2);
const d = Number(dArg), stages = stagesArg.split(',').map(Number), iters = Number(itersArg), seed0 = Number(seedArg);
const N = Number(process.env.N || 300), LAMBDA = Number(process.env.LAMBDA ?? 0.5);
const state = loadSave(file);
const base = state.parties[0];
const key = it => `${it.id}-${it.enhancement}-${it.superRare ?? 0}`;
const jk = j => j ? `${j.key}:${j.rank}` : null;

// ---- pools
const pool = new Map(); // key -> {item, total}
const addPool = (it, n) => { const k = key(it); const e = pool.get(k); if (e) e.total += n; else pool.set(k, { item: { ...it, jewel: null }, total: n }); };
for (const v of Object.values(state.global.inventory)) if (v.status === 'owned' && v.count > 0) addPool(v.item, v.count);
for (const c of base.characters) for (const it of c.equipment) if (it) addPool(it, 1);
const jewelTotal = new Map();
for (const [k, v] of Object.entries(state.global.jewels || {})) if (v > 0) jewelTotal.set(k, (jewelTotal.get(k) || 0) + v);
for (const c of base.characters) for (const it of c.equipment) if (it?.jewel) jewelTotal.set(jk(it.jewel), (jewelTotal.get(jk(it.jewel)) || 0) + 1);

// ---- genome: order (char ids) + per char id: slots [{k, j}|null]
const startPlan = process.env.START ? JSON.parse(fs.readFileSync(process.env.START, 'utf8')) : null;
const builds = startPlan?.builds || [];
for (const b of builds) { const c = base.characters.find(x => x.id === b.id); Object.assign(c, { mainClassId: b.mainClassId, subClassId: b.subClassId }, b.predisposition ? { predispositionId: b.predisposition } : {}); }
const chars = new Map(base.characters.map(c => [c.id, c]));
const maxSlots = new Map(base.characters.map((c, i) => [c.id, T.computeCharacterStatsInParty(base, i).maxEquipSlots]));
const initial = { order: base.characters.map(c => c.id), eq: new Map(base.characters.map(c => [c.id, Array.from({ length: maxSlots.get(c.id) }, (_, i) => c.equipment[i] ? { k: key(c.equipment[i]), j: jk(c.equipment[i].jewel) } : null)])) };
const clone = g => ({ order: [...g.order], eq: new Map([...g.eq].map(([id, s]) => [id, s.map(x => x && { ...x })])) });
function used(g) { const u = new Map(), uj = new Map(); for (const s of g.eq.values()) for (const x of s) if (x) { u.set(x.k, (u.get(x.k) || 0) + 1); if (x.j) uj.set(x.j, (uj.get(x.j) || 0) + 1); } return { u, uj }; }
function party(g) {
  return { ...base, characters: g.order.map(id => ({ ...chars.get(id), equipment: g.eq.get(id).map(x => x ? { ...pool.get(x.k).item, jewel: x.j ? { key: x.j.split(':')[0], rank: Number(x.j.split(':')[1]) } : null } : null) })) };
}
// ---- plan cost (calls)
function planCalls(g) {
  let calls = builds.length;
  if (g.order.join() !== initial.order.join()) calls++;
  for (const [id, s] of g.eq) {
    const cur = initial.eq.get(id);
    const curK = cur.filter(Boolean).map(x => x.k).sort(), tgtK = s.filter(Boolean).map(x => x.k).sort();
    const rem = [...curK], add = [];
    for (const k of tgtK) { const i = rem.indexOf(k); if (i >= 0) rem.splice(i, 1); else add.push(k); }
    if (rem.length === 0 && add.length === 0) {} else if (rem.length <= 1 && add.length <= 1) calls += 1; else if (rem.length === 0) calls += 1; else calls += 2;
    // jewels: count target jewels not already sitting on an identical kept item
    const curJ = cur.filter(x => x?.j).map(x => x.k + '|' + x.j);
    for (const x of s) if (x?.j) { const i = curJ.indexOf(x.k + '|' + x.j); if (i >= 0) curJ.splice(i, 1); else calls++; }
  }
  return calls;
}
// ---- objective
const cache = new Map();
async function evaluate(g, n = N, seed = 4242) {
  const p = party(g);
  let runs = 0; const ps = [];
  for (const f of stages) {
    if (f === 7 && process.env.BOSSDMG) {
      const b = await bossDamage(state, p, d, Math.round(n / 2), seed + f);
      // smooth surrogate: real kill rate plus a damage term that only matters while kills are rare
      const pe = Math.max(b.kills, 0.002) + 0.05 * b.reach * Math.pow(b.frac, 3);
      ps.push(`k${b.kills.toFixed(3)} r${b.reach.toFixed(2)} f${b.frac.toFixed(3)}`); runs += expRuns(pe, 1);
      continue;
    }
    const { succ, r } = await stageSim(state, p, d, f, n, seed + f);
    let pe = (succ * n + 0.3) / (n + 1);
    if (process.env.WALL && f === stages[0]) { const pr = await wallProgress(state, p, d, f, Math.round(n / 3), seed + 50 + f); pe += 0.05 * Math.pow(pr, 4); ps.push('prog' + pr.toFixed(3)); }
    ps.push(+succ.toFixed(4)); runs += expRuns(pe, GATE_K[f]);
  }
  const calls = planCalls(g);
  return { score: -(runs + LAMBDA * calls), runs, calls, ps };
}
// ---- moves
let rs = seed0 >>> 0 || 1; const R = () => { rs ^= rs << 13; rs >>>= 0; rs ^= rs >>> 17; rs ^= rs << 5; rs >>>= 0; return rs / 4294967296; };
const pick = a => a[Math.floor(R() * a.length)];
const ids = initial.order;
const limitChars = process.env.CHARS ? process.env.CHARS.split(',').map(Number) : ids;
const candByChar = new Map(ids.map(id => { const c = chars.get(id); const list = []; for (const [k, e] of pool) if (T.canCharacterEquipCategory(c, e.item.category)) { const w = 1 + Math.max(0, e.item.tier || Math.floor(e.item.id / 1000)) + (e.item.enhancement || 0); for (let i = 0; i < w; i++) list.push(k); } return [id, list]; }));
const jewelKeys = [...jewelTotal.keys()];
function mutate(g) {
  const h = clone(g); const r = R();
  const { u, uj } = used(h);
  if (r < 0.55) { // replace a slot
    const id = pick(limitChars), s = h.eq.get(id), si = Math.floor(R() * s.length);
    const k = pick(candByChar.get(id)); if ((u.get(k) || 0) >= pool.get(k).total) return null;
    if (s[si]?.k === k) return null; s[si] = { k, j: null };
    if (R() < 0.3) { const sj = Math.floor(R() * s.length); if (sj !== si && s[sj]) { /* also clear neighbour for variety */ } }
    return h;
  }
  if (r < 0.75) { // swap between characters
    const a = pick(limitChars), b = pick(ids); if (a === b) return null;
    const sa = h.eq.get(a), sb = h.eq.get(b), i = Math.floor(R() * sa.length), j = Math.floor(R() * sb.length);
    const x = sa[i], y = sb[j]; if (!x && !y) return null;
    if (x && !T.canCharacterEquipCategory(chars.get(b), pool.get(x.k).item.category)) return null;
    if (y && !T.canCharacterEquipCategory(chars.get(a), pool.get(y.k).item.category)) return null;
    sa[i] = y; sb[j] = x; return h;
  }
  if (r < 0.92 && jewelKeys.length) { // jewel attach/move
    const jkey = pick(jewelKeys); const id = pick(ids); const s = h.eq.get(id); const si = Math.floor(R() * s.length); const x = s[si];
    if (!x || x.j === jkey || !T.isJewelAllowedForCategory(pool.get(x.k).item.category, jkey.split(':')[0])) return null;
    if ((uj.get(jkey) || 0) >= jewelTotal.get(jkey)) { // take it from another holder
      const holders = []; for (const [hid, hs] of h.eq) hs.forEach((y, yi) => { if (y?.j === jkey) holders.push([hid, yi]); });
      const [hid, yi] = pick(holders); h.eq.get(hid)[yi].j = null;
    }
    x.j = jkey; return h;
  }
  if (process.env.ORDER) { const i = Math.floor(R() * 6), j = Math.floor(R() * 6); if (i === j) return null; [h.order[i], h.order[j]] = [h.order[j], h.order[i]]; return h; }
  return null;
}
// ---- search
let best = clone(initial);
if (process.env.START) { const sp = JSON.parse(fs.readFileSync(process.env.START, 'utf8')); const fromItem = s => { const [, id, enh, sr] = s.split('/'); return `${id}-${enh}-${sr}`; };
  best = { order: sp.order.map(Number), eq: new Map(Object.entries(sp.eq).map(([id, sl]) => [Number(id), sl.map(x => x && { k: fromItem(x.item), j: x.jewel })])) }; }
let bestE = await evaluate(best);
const startE = bestE; let bestV = null;
console.log('start', JSON.stringify(startE));
const t0 = Date.now();
for (let it = 0; it < iters; it++) {
  const h = mutate(best); if (!h) continue;
  const e = await evaluate(h);
  if (e.score > bestE.score + 1e-9) {
    if (process.env.VERIFY) { if (!bestV) bestV = await evaluate(best, N, 9191); const v = await evaluate(h, N, 9191); if (v.score <= bestV.score) continue; bestV = v; }
    best = h; bestE = e; console.log('it', it, JSON.stringify(e), Math.round((Date.now() - t0) / 1000) + 's'); }
}
// ---- confirm on an independent seed
const NC = Number(process.env.NC || 1000);
const c0 = await evaluate(initial, NC, 777), c1 = await evaluate(best, NC, 777);
console.log('confirm base', JSON.stringify(c0), 'best', JSON.stringify(c1));
const toItem = k => { const [id, enh, sr] = k.split('-'); return `0/${id}/${enh}/${sr}`; };
fs.writeFileSync(out, JSON.stringify({ save: file, builds, d, stages, confirm: { base: c0, best: c1 }, order: best.order, eq: Object.fromEntries([...best.eq].map(([id, s]) => [id, s.map(x => x && { item: toItem(x.k), jewel: x.j })])), initialEq: Object.fromEntries([...initial.eq].map(([id, s]) => [id, s.map(x => x && { item: toItem(x.k), jewel: x.j })])), initialOrder: initial.order }, null, 1));
