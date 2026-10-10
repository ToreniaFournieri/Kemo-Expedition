# ClaudeGA: v0.10.1 (35) Normal API strategy -- "In-game GA research"
Written before signup, 2026-10-10. Goals: (1) D8 boss, (2) min in-game time, (3) min API calls, (4) 8 h real time.
Reference: ClaudeItem 12.67 d / 1,786 calls (build 33, twin-tool plans).

## What is new (build 35)
- `read/build/party/{p}/gaSearch` (POST read): seeded GA over equipment, jewels, build, order, deity for the current destination;
  objectives `success`, `minDefeat`, `bossDamage`, `experience`; returns verdict, forecast, changeSummary, gaResultId.
- `commit/build/party/{p}/applyGaResult`: applies the result in ONE call (vs 5-15 equip/remove calls in earlier runs).

## Concept
Replace every offline twin/emulator plan with the in-game GA. No twin, emulator, proxyopt or hpopt this run; planning only via API.
1. Same opening as ClaudeItem (lord/guardian/3 ninja-ranger/alchemist, order 6,1,4,2,3,5, Mirage), same loop client (`run.py`).
2. At each stall: `gaSearch` (objective `success` for gate grinds, `bossDamage` when the boss gate is open), then
   `applyGaResult simulation:false` if verdict is good/veryGood. Expect ~2-3 calls per re-plan instead of 5-15 builds.
3. Use known route facts from earlier reports: farm at the depth before the first unbeatable elite (D6 2f-3, D7/D8 3f-3),
   Lv30 breakpoint at D7, Fertility deity on PT1 from D5, breakers 6309 vs D6 boss (check whether GA finds it on its own).
4. Use the `experience` objective when farming EXP (D7 to Lv30).

## What to test / look for (bugs and concerns)
- Does applyGaResult reproduce the forecast build exactly (calculatedStatus, revision, Undo steps per character)?
- Stale handling: progression between search and apply must NOT invalidate (spec); auto-equip after elapsed MAY change gear -> stale?
- Seed reproducibility, time budget vs effort, verdict honesty (forecast vs live outcomes), `bossDamage` behaviour while depth-limited.
- Does the GA consider items worn by other parties (spec says no) and race/class changes (changeableComponents)?
- Call/time cost of gaSearch (real seconds per effort).
Targets: time <= 13 d; calls <= 1,500.
