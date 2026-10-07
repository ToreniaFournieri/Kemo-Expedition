# ClaudeFable: v0.10.1 (17) Normal API strategy
Recorded before signup: 2026-10-07 (UTC, see file mtime; signup follows immediately)

Goal order: (1) defeat Expedition 8 boss, (2) minimise in-game time, (3) minimise API calls, 8 h real-time cap.

## Evidence read
All v0.10.1 reports (Slot2 29.5 d/552, Sortie2 34.2 d/531, SlotBurst 33.1 d/533, U1 41.9 d, Magic ~50 d) + their STRATEGY/plans, ai_play_tools README.
Key takeaways: (a) Slot2 formation (Laika guardian front, Kemo lord, 2 Ursan ninja/ranger abyssal_sea+precise, Lop, Selfin cervin caster)
is the proven core; (b) Mirage on the signup `party/1` call + stored sorties is the fastest opening ever (D1 day 1.5, D2 day 2.75-3.0)
but is WORSE than Fertility/Fortification from D3 on; (c) walls (D6, D8) open on level jumps -> EXP is the hidden clock;
(d) per-character `proxyopt` (attackers/caster) + `hpopt` (supports) beat a generic GA; judge with `dmgplan`/`lever` BEFORE spending calls;
(e) build calls are ~45% of all requests -> apply diff-only plans; (f) Magic/no-guardian formation lost 19 days at D6.

## Concept: "Sortie-Prime Hybrid"
Sortie2/Slot2 formation + Mirage for D1-D2 only, then Fortification/Fertility; spend ALL stored sorties early (they refill to 6 per ~12 h)
as the cheapest EXP; NEW in build 17: `commit/expedition/{p}/sortie` accepts `numberOfSortie` (1-6) -> one call for a batch of sorties
(saves ~60 calls vs 93 single sorties in Sortie2). Observe BEFORE sorties (HP/charge), stop the batch on risk.
- Opening (9 calls): 5x changeBuild (Kemo lord/lord, Laika guardian/guardian, Ursan ninja/ranger x3, Selfin alchemist/wizard), party/1 order+mirage.
- Then 12 h steps with fewer observations; sortie batches at the highest destination that returns Clear (D1 -> D2 -> D3 -> D4).
- From D2: proxyopt (attackers 4,2,3,5) + hpopt (1,6) with element-weight scans, rate base first with lever.mjs, apply diff only.
- Deity per wall (1 call): Mirage (D1-2) -> Fortification (D3/D4) -> Fertility (D5; release PT3 holder) -> Restoration/Precision at D6-D8.
- Unique swaps (Mishka/Sougaha onto the caster) at D6/D7 only if the twin shows a gain.
- Keep Laika as guardian in front. Difficulty 0, depth all, fixed destination, advance after verified boss defeat.
- Near D8 boss use 1-hour steps so the Clear diary entry survives (diary keeps 12 entries); verify with export defeatedBossExpeditions[8].
- Compute offline with the repo engine twin; never run >3 optimiser jobs on this 4-core box.
