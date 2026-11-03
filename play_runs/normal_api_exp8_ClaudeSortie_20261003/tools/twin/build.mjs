// Greedy role-based builder (coordinate ascent on stat proxies), output = plan for opt.mjs START / apply.mjs.
// usage: node build.mjs save.kemoz OUT.json   env: DEF (enemy defense, default 50*dest), NOFIRE / NOICE / NOTHUNDER, TANKS=6,1
import fs from 'node:fs';
import { T, loadSave } from './tw.mjs';
const [file, out] = process.argv.slice(2);
const state = loadSave(file); const base = state.parties[0];
const DEF = Number(process.env.DEF || 50 * base.selectedDungeonId);
const tanks = (process.env.TANKS || '6,1').split(',').map(Number);
const banned = ['fire', 'ice', 'thunder'].filter(e => process.env['NO' + e.toUpperCase()]);
const key = it => `${it.id}-${it.enhancement}-${it.superRare ?? 0}`;
const pool = new Map();
const addPool = (it, n) => { const k = key(it); const e = pool.get(k); if (e) e.total += n; else pool.set(k, { item: { ...it, jewel: null }, total: n }); };
for (const v of Object.values(state.global.inventory)) if (v.status === 'owned' && v.count > 0) addPool(v.item, v.count);
for (const c of base.characters) for (const it of c.equipment) if (it) addPool(it, 1);
const party = structuredClone(base);
const builds = [];
for (const spec of (process.env.CLASS || '').split(';').filter(Boolean)) { const [id, cls] = spec.split(':'); const [m, sub, pre] = cls.split('/'); const c = party.characters.find(x => x.id === Number(id)); c.mainClassId = m; c.subClassId = sub; if (pre) c.predispositionId = pre; builds.push({ id: Number(id), mainClassId: m, subClassId: sub, ...(pre ? { predisposition: pre } : {}) }); }
for (const c of party.characters) c.equipment = c.equipment.map(it => it && T.canCharacterEquipCategory(c, it.category) ? it : null);
const maxSlots = party.characters.map((c, i) => T.computeCharacterStatsInParty(party, i).maxEquipSlots);
const usedCount = new Map();
for (const c of party.characters) { c.equipment = c.equipment.slice(0, maxSlots[party.characters.indexOf(c)]); while (c.equipment.length < maxSlots[party.characters.indexOf(c)]) c.equipment.push(null); for (const it of c.equipment) if (it) usedCount.set(key(it), (usedCount.get(key(it)) || 0) + 1); }
const elemOf = it => (it.elementalOffense && it.elementalOffense !== 'none') ? it.elementalOffense : null;
function offense(i) {
  const s = T.computeCharacterStatsInParty(party, i); const c = party.characters[i];
  const magic = c.id === 5 || c.mainClassId === 'wizard' || c.mainClassId === 'alchemist' || c.mainClassId === 'sage';
  const raw = magic ? s.magicalAttack : s.rangedAttack, n = magic ? s.magicalNoA : s.rangedNoA;
  const amp = magic ? (1 + (s.magicalAttackCBonus || 0)) * (s.magicalOffenseMultiplier || 1) : (1 + (s.rangedAttackCBonus || 0) + (s.physicalAttackCBonus || 0)) * (s.physicalOffenseMultiplier || 1);
  const decay = Math.min(0.98, Math.max(0.7, 0.9 + (s.accuracyBonus || 0) - Number(process.env.EVA || 0)));
  let hits = 0; for (let k = 0; k < n; k++) hits += (magic ? 1 : (s.accuracyPotency ?? 1)) * Math.pow(decay, k);
  const per = Math.max(raw * 0.05, raw - (magic ? DEF * 0.5 : DEF) * (1 - (s.penetMultiplier || 0)));
  const eb = Object.fromEntries((process.env.ELEMBONUS || '').split(',').filter(Boolean).map(x => x.split('=')).map(([a, b]) => [a, Number(b)]));
  const em = eb[s.elementalOffense] ?? 1;
  return per * amp * hits * (s.elementalOffenseValue || 1) * em + 0.05 * Math.log(1 + T.computePartyStats(party).partyStats.hp);
}
function tank(i) {
  const s = T.computeCharacterStatsInParty(party, i);
  const [wp, wm, wh] = (process.env.TW || '1,0.7,1.2').split(',').map(Number);
  return wp * Math.log(10 + s.physicalDefense) + wm * Math.log(10 + s.magicalDefense) + wh * Math.log(T.computePartyStats(party).partyStats.hp);
}
const score = i => tanks.includes(party.characters[i].id) ? tank(i) : offense(i);
// seed ranged attackers that have no attack with the best (bow, ammo) pair so coordinate ascent can start
for (let i = 0; i < 6; i++) {
  const c = party.characters[i]; if (tanks.includes(c.id)) continue;
  const s0 = T.computeCharacterStatsInParty(party, i); if ((s0.rangedNoA || 0) > 0 || (s0.magicalNoA || 0) > 0) continue;
  const free = cat => [...pool].filter(([k, e]) => e.item.category === cat && (usedCount.get(k) || 0) < e.total && T.canCharacterEquipCategory(c, cat)).sort((a, b) => (b[1].item.id + b[1].item.enhancement * 300) - (a[1].item.id + a[1].item.enhancement * 300)).slice(0, 8);
  let best = null, bs = -Infinity; const save = [c.equipment[0], c.equipment[1]];
  for (const [ka, a] of free('archery')) for (const [kb, b] of [...free('arrow'), ...free('bolt')]) { c.equipment[0] = { ...a.item, jewel: null }; c.equipment[1] = { ...b.item, jewel: null }; const sc = offense(i); if (sc > bs) { bs = sc; best = [ka, kb]; } }
  if (best) { for (const x of save) if (x) usedCount.set(key(x), usedCount.get(key(x)) - 1); c.equipment[0] = { ...pool.get(best[0]).item, jewel: null }; c.equipment[1] = { ...pool.get(best[1]).item, jewel: null }; for (const k of best) usedCount.set(k, (usedCount.get(k) || 0) + 1); console.log('seeded', c.name, best); }
  else { c.equipment[0] = save[0]; c.equipment[1] = save[1]; }
}
// FORCE="4:6309,2:6309": pin the best owned variant of an item id into slot 0 of a character (greedy skips it)
const pinned = new Set();
for (const spec of (process.env.FORCE || '').split(',').filter(Boolean)) {
  const [cid, iid] = spec.split(':').map(Number); const i = party.characters.findIndex(x => x.id === cid); const c = party.characters[i];
  const cand = [...pool].filter(([k, e]) => e.item.id === iid && (usedCount.get(k) || 0) < e.total && T.canCharacterEquipCategory(c, e.item.category)).sort((a, b) => b[1].item.enhancement - a[1].item.enhancement)[0];
  if (!cand) { console.log('FORCE missing', spec); continue; }
  let slot = -1; for (let si = c.equipment.length - 1; si >= 0; si--) if (!pinned.has(i + ':' + si)) { slot = si; break; }
  const old = c.equipment[slot]; if (old) usedCount.set(key(old), usedCount.get(key(old)) - 1);
  c.equipment[slot] = { ...cand[1].item, jewel: null }; usedCount.set(cand[0], (usedCount.get(cand[0]) || 0) + 1); pinned.add(i + ':' + slot);
}
const order = party.characters.map((c, i) => i).sort((a, b) => (tanks.includes(party.characters[a].id) ? 1 : 0) - (tanks.includes(party.characters[b].id) ? 1 : 0));
for (let pass = 0; pass < 3; pass++) {
  let changed = 0;
  for (const i of order) {
    const c = party.characters[i];
    for (let si = 0; si < c.equipment.length; si++) {
      if (pinned.has(i + ':' + si)) continue;
      const cur = c.equipment[si];
      if (cur) usedCount.set(key(cur), usedCount.get(key(cur)) - 1);
      let bestK = cur ? key(cur) : null, bestS = -Infinity;
      for (const [k, e] of pool) {
        if ((usedCount.get(k) || 0) >= e.total) continue;
        if (!T.canCharacterEquipCategory(c, e.item.category)) continue;
        if (!tanks.includes(c.id) && elemOf(e.item) && banned.includes(elemOf(e.item))) continue;
        c.equipment[si] = { ...e.item, jewel: k === (cur && key(cur)) ? cur.jewel : null };
        const sc = score(i);
        if (sc > bestS + 1e-9) { bestS = sc; bestK = k; }
      }
      c.equipment[si] = bestK ? { ...pool.get(bestK).item, jewel: (cur && key(cur) === bestK) ? cur.jewel : null } : null;
      if (bestK) usedCount.set(bestK, (usedCount.get(bestK) || 0) + 1);
      if ((cur ? key(cur) : null) !== bestK) changed++;
    }
  }
  console.log('pass', pass, 'changed', changed);
  if (!changed) break;
}
// greedy jewel pass: every owned jewel (free + attached on PT1) goes to the slot with the best relative score gain
if (!process.env.NOJEWEL) {
  const jl = []; for (const [k, v] of Object.entries(state.global.jewels || {})) for (let n = 0; n < v; n++) jl.push(k);
  for (const c of party.characters) for (const it of c.equipment) if (it?.jewel) { jl.push(`${it.jewel.key}:${it.jewel.rank}`); it.jewel = null; }
  jl.sort((a, b) => Number(b.split(':')[1]) - Number(a.split(':')[1]));
  for (const j of jl) {
    const [jkey, rank] = j.split(':'); let best = null, gain = 0;
    for (let i = 0; i < 6; i++) { const c = party.characters[i]; const s0 = score(i);
      for (let si = 0; si < c.equipment.length; si++) { const it = c.equipment[si]; if (!it || it.jewel || !T.isJewelAllowedForCategory(it.category, jkey)) continue;
        it.jewel = { key: jkey, rank: Number(rank) }; const g = (score(i) - s0) / Math.max(1e-9, Math.abs(s0)); it.jewel = null; if (g > gain) { gain = g; best = [i, si]; } } }
    if (best) party.characters[best[0]].equipment[best[1]].jewel = { key: jkey, rank: Number(rank) };
  }
}
for (let i = 0; i < 6; i++) console.log(party.characters[i].name, score(i).toFixed(2), party.characters[i].equipment.filter(Boolean).map(it => it.id + '+' + it.enhancement).join(' '));
const toItem = it => `0/${it.id}/${it.enhancement}/${it.superRare ?? 0}`;
const ser = p => Object.fromEntries(p.characters.map(c => [c.id, c.equipment.map(x => x && { item: toItem(x), jewel: x.jewel ? `${x.jewel.key}:${x.jewel.rank}` : null })]));
fs.writeFileSync(out, JSON.stringify({ save: file, builds, order: party.characters.map(c => c.id), eq: ser(party), initialEq: ser(base), initialOrder: base.characters.map(c => c.id) }, null, 1));
