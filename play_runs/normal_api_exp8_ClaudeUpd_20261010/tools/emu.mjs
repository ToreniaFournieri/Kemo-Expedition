// Offline API emulator: exact elapsed (stageApiV1ElapsedProgression, carry) + exact commits (applyApiV1Commit). No auto-equip.
import * as A from './api2.mjs';
export { A };
await A.ensureLanguageLoaded('en');
export class Emu {
  constructor(state, t0, seed = 1) { this.state = state; this.t = t0; this.carry = {}; this.seed = seed >>> 0; this.rng = A.createApiRandom(seed * 2654435761 >>> 0); this.bseq = 0n; this.calls = 0; this.log = []; }
  run(fn) { return A.withBattleSeedSourceForTesting(() => (BigInt(this.seed) << 32n) | this.bseq++, () => A.withGameplayRandomSource(() => this.rng.next(), fn)); }
  async elapsed(sec) {
    this.calls++;
    const r = await A.stageApiV1ElapsedProgression(this.state, { elapsedSeconds: sec }, { simulatedAt: this.t, realNow: this.t, gameMode: 'mode.normal', enemyLevelOffset: 0, cycleDurationScale: 1, applyAutoEquipment: (s, pi, ci, ff) => A.applyAutoEquipment(s, pi, ci, ff), runWithRandom: (op) => this.run(op), carriedMsByPartyId: this.carry });
    this.state = r.state; this.t = r.simulatedAt; this.carry = r.carriedMsByPartyId; return r.data;
  }
  commit(op, params = {}) {
    this.calls++;
    let out;
    try {
      out = this.run(() => A.applyApiV1Commit(op, this.state, params, { simulatedAt: this.t, gameMode: 'mode.normal', enemyLevelOffset: 0, settings: {}, equipmentHistory: {}, uploadedFiles: {}, canonicalFiles: {}, applyAutoEquipment: (s, pi, ci, ff) => A.applyAutoEquipment(s, pi, ci, ff), createDeliveryId: () => 'x', now: () => this.t, chargeDurationScale: 1 }));
    } catch (e) { return { error: e.message }; }
    this.state = out.state;
    const m = op.match(/^commit\/expedition\/(\d+)\/(sortie|godsBattle)$/);
    if (m) { const pid = this.state.parties[+m[1] - 1]?.id; delete this.carry[String(pid)]; delete this.carry[m[1]]; }
    return out.data;
  }
  sortie(k, p = 1) { return this.commit(`commit/expedition/${p}/sortie`, { numberOfSortie: k }); }
  p(i = 0) { return this.state.parties[i]; }
  stock(i = 0) { return A.getInstantExpeditionChargeState(this.p(i), this.t, 1).stock; }
  cyc(i = 0) { return A.getApproxAfkCycleDurationMs(this.p(i), 1, { deityDonations: this.state.global.deityDonations }); }
  boss(d, i = 0) { return !!this.p(i).defeatedBossExpeditions?.[d]; }
  gates(d, i = 0) { const p = this.p(i); const r = []; for (let f = 1; f <= 5; f++) { const k = d * 1000 + f * 10 + 4; r.push((p.clearGateStatus?.[k] ? 'U' : (p.clearGateProgress?.[String(k)] ?? 0))); } const b = d * 1000 + 604; r.push(p.clearGateStatus?.[b] ? 'U' : (p.clearGateProgress?.[String(b)] ?? 0)); return r.join(','); }
  stats(i = 0) { const s = this.p(i).expeditionStats || {}; return ['Clear', 'Return', 'Draw', 'Retreat', 'Defeat'].map(k => s[k] || 0); }
}
function g(l){l=Math.max(1,Math.min(99,l));return 1.259-Math.max(0,0.0007*(l-7))-Math.max(0,0.00035*(l-14))-Math.max(0,0.00018*(l-21))-Math.max(0,0.00008*(l-28))-Math.max(0,0.00004*(l-35))-Math.max(0,0.00002*(l-42))-Math.max(0,0.00001*(l-49));}
export const xpNext = l => Math.ceil(1000*Math.pow(g(l),Math.max(0,l-1)));
export const cumXp = (lv, xp) => { let c = 0; for (let l = 1; l < lv; l++) c += xpNext(l); return c + xp; };
