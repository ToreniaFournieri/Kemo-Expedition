# ClaudeLuna - v0.10.1 (16) Normal API strategy (written 2026-10-07 BEFORE signup)
Goals (in order): beat Expedition 8 boss (enemy 387) -> fewest in-game days -> fewest API calls; real-time cap 8 h.
References read: Slot2 29.5 d / 552 calls (best), Sortie2 34.2 d / 531, SlotBurst 33.1 d / 533, U1 41.9 d / 538, Codex 39.9 d / 452.

## Concept "Luna Cats": Luna -> PT1, three Felidian ("cats"), Fertility, first-strike snipers
* Deity: Goddess of Fertility (`c.deity_move_first+1`) from day 0. PT3 holds it by default, so first `party/3 {deityId:"none"}` (1 call),
  then PT1 `{deityId:"fertility"}` in the same call as the order. Fertility is weak to fire (x1.5): re-test other deities only at a wall
  and only if the twin says >2x gain (user's concept = Fertility, keep unless proven bad).
* Cats (Felidian: a.first-strike 1 by race, arrow x1.1, sword x1.1, robe x1.3; ninja main adds a.first-strike):
  - Kuzunoha (id 2) Felidian/female ninja/ranger abyssal_sea precise,  Sota (id 4) Felidian/male ninja/ranger abyssal_sea precise.
  - Luna (unique, PT3 unlocked after D4 boss; sword-saint/ranger default, Felidian/female, crescent_jade) is the 3rd cat. Pull her out of PT3
    (`party/3 char 204 uniqueSelection none`) and assign to Lop (id 3) with `uniqueSelection:"luna"` (keep Lop's ninja/ranger classes).
    Spec: the same-race/same-gender rule only counts non-unique members, so Luna (F) + non-unique cat M + non-unique cat F is legal.
  - Selfin (id 5) stays Cervin alchemist/wizard (utopia/introspective or Oath/Nimble later) = caster; Laika guardian/guardian row 1; Kemo lord/lord row 2.
  - Order [Laika 6, Kemo 1, Sota 4, Kuzunoha 2, Luna/Lop 3, Selfin 5] (Defender in front, snipers rows 2-4+ for 0.85^row ranged potency).
* Trade-off to measure (report it): Felidian has +0 slots (Ursan +2) and Luna's lineage has no arrow bonus; first strike + Fertility is the compensation.
  Use the twin (`dmgspec`/`lever`) on the first export to compare cats vs Ursan snipers before committing at D2/D4; keep cats if within noise.
* Early EXP: use the 3-6 stored sorties (Sortie2 finding) on the highest destination that still returns Clear, observe before sortie.
* Per-character optimisers (`proxyopt` attackers/caster, `hpopt` Laika+Kemo) from D2, not a generic GA; judge with `dmgplan`/`lever` before spending calls.
* Cheap levers per wall: deity, race (Felidian vs Cervin caster), predisposition, order; element weights in proxyopt (fire/ice/thunder).
* Call economy: opening in ~8 calls, 12 h steps with observation every 2-3 blocks, exports only when planning, diff-only plans, no defensive logIn.
* Evidence: export `defeatedBossExpeditions[8]` + `bossRare` diary entry via `read/expedition/1/latestBattleLog?logId=diary:<id>` (read diary every <=12 entries near the boss).
