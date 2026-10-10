# ClaudeUpd live notes (build 31)
Workspace: session scratchpad play/ (t.py, run.py with build-31 skip logic, plan.sh, d6eval.sh, cad.mjs, gatecheck.mjs). T0 signup 2026-10-10T00:43:40Z.
- D1 boss <=10-10 05:03 (0.18 d) c52: 1200s/k6 loops, proxyopt plan (8 calls) 94% boss-only.
- D2 <=10-10 10:23 (0.40 d) c132: gate-3 GA (25 calls), boss plan none:2 weights (12 calls). 1st sortie at HP 1 -> added HPF guard.
- D3 <=10-11 00:47 (1.00 d) c266: Fertility + GA for gate 5 (40%), ice boss plan 57% route.
- D4 <=10-11 15:47 (1.63 d) c453: farm 7h (tier4 24->279), C+Fortification GA gates 97/87%, thunder+HP boss plan 19%/run.
- D5 <=10-12 19:11 (2.77 d) c654: PT3 held Fertility -> set PT3 none first. Ice plans. Farm at 4f-4. Boss gate+boss with ice plan.
- Cadence finding (cad.mjs exact emulator): natural cycle (19.5 min at D5) > 18-min loop and a sortie wipes the carry, so 1080 s loops lose natural runs; 2520 s ~= same runs at half the calls.
- D6 <=10-18 08:17 (8.32 d) c1524. Gates 1-5 fell while farming at 'all' after 2f-3 farm (2f-3 = skip the 2F-4 elite: 654 vs 453 tier-6/12h).
  Boss Procyonian has a.illusion (voids the first ranged attack); item 6309 (tier-6 arrow) has a.illusion-breaker. A breaker on each of the 3 ranged
  attackers took boss-only dmg 0.50 -> 0.61 (1 copy) -> 0.73 (3 copies). Kills came from more tier-6: boss-only kills 7% (2.5k tier6) -> 57% (4.1k).
  Boss gate (2-streak) was the wall: twin forecast said 18%, live/exact emulator ~10% with the boss plan; route plan A (proxyopt) ~25% in the emulator, opened in 15 loops.
