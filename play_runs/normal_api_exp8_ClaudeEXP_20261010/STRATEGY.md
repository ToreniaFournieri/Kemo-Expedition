# ClaudeEXP: v0.10.1 (34) Normal API strategy -- "Early Lv30"
Written before signup, 2026-10-10. Goals: D8 boss, min in-game time, min calls, 8 h real time.
Reference: ClaudeItem 12.67 d / 1,786 calls (D6 5.45 d, D7 9.65 d (4.2 d), D8 12.67 d).

## Read from reports
- Item/Upd recipe: 9-call opening, 1200->1080/2520 s elapsed loops with sortie skip logic, plan at every stall (proxyopt/hpopt/GA),
  farm at depth before first unbeatable elite, Lv30 = new slot = D7 breakpoint (boss-only kills 0-9% -> 90%).
- D7 was 33% of the run, mostly waiting for Lv30 (~36 game h of 4f-3/4f-4 farm). Gate forecasts are noisy: confirm with gatecheck.
- Build 34: sortie/elapsed return maximumHp; observation/expedition parties give level + experienceRatio (cheaper observation).

## Concept
Replay Item's recipe, with one change: **prioritise EXP toward Lv30 from the end of D6**. Farm at the deepest depth with <=5% Defeat
using cad.mjs/farm2 (EXP and drops both), don't wait for the D7 plan to stall at tier gates. Use 2520 s/k6 loops while farming (36 calls/12 h),
observe every 6 loops. Plan the boss as soon as run.py says BOSS OPEN. Re-plan right after Lv30.
Targets: <= 12.5 d, <= 1,700 calls.
