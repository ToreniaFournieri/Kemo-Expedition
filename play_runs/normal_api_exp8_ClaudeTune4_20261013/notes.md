# ClaudeTune4 notes (build 45)
- Game start (in-game) 2026-10-12T23:09:11Z; real start 23:00 UTC (08:00 JST). Linux container, Electron under xvfb-run.
- hl2.py (secondsToNextCycle exact heal): healMiss 0 so far; one elapsed per loop, no top-ups.
- D1 tuning diagnostic (char 4, success, 3f-4 fog bottleneck): candidatesTried {0,0,0}, bottleneckCounters a.true-sight noItem.
  Tier-1 items have no element/resistance/ability, which explains ClaudeTune3's empty D1 tunings. Skip D1 tuning.
- D1 boss open 10-13T06:01 (call 78). boss-only share 0.33 (all Draw) -> bossDamage GA (all comp, 120 s) 0.34 -> 0.999, route 66 %.
  Clear on first sortie 10-13T06:22 (0.30 d, call 87).
- D2 (dest 2 at 10-13T06:46): 1f-x/2f-x gates at 78-90 % (tunings 0/8 accepted: D1 items only). 2f-4 elite gate 1 % (Draw 70 %) ->
  big success GA 1.4 -> 81 % (veryGood). 4f gate: tuning-first chars 2,3 accepted r.ice switches (+8.6 pt, +8.1 pt), GA 86 -> 99 %.
- healMiss twice, both right after a reprice: changeExpedition (call 92) and GA applyBuildResult (call 133). Spec says exact
  "while the party stays as it is"; but neither response returns a fresh secondsToNextCycle, and observation/expedition has none.
- tw.py at high rates: four tunings at 80-90 % recorded nothing (rarer-side noise); added STOPHI (skip remaining tunings when
  the first one is rejected at >= 95 %).
- D2 boss open 10-13T15:39 (0.69 d, call 207). bossDamage tunings: chars 2, 5 accepted resistance switches (share +3 pt each;
  counters a.rage-breaker / a.null-life-drain / a.domain-breaker all noItem). Big bossDamage GA share 0.23 -> 0.97 (kill 84 %).
  Big success GA x2: route 0.4 -> 6.2 -> 8.4 % (boss-only kill fell to 32 %). Clear on the 6th run 10-13T17:42 (0.77 d, call 238).
- D3 arrive: route 58 %; tunings 0/4 (char 2 counter a.null-bind status `owned`, others `noItem`); big GA 63 -> 73 %.
- D3 gates: 1f gate stalled 12 loops at 72 % (7-streak) before the stall trigger re-planned (GA 76 -> 99 %). Lesson: right after
  arrival, repeat the GA until >= 85 % instead of waiting for NST. Gates 2-5: tuning accepted 1 per re-plan (3 of 12), GAs
  72 -> 86, 71 -> 90, 21 -> 44 %. Boss gate (6f-4, 2-streak) at 13-20 % per run, Retreat 70-76 % from 4f-4 to 5f-4 (attrition).
  In-game 10-14T02:46 (1.15 d, call 370). GA noisy 18.6 -> 22.4 (not applied by default).
- D3 boss gate: GA x2 (noisy applied) 13 -> 21 %; deity sweep on seed 5: fertility 20.7, restoration 21.7, fortification 16.0 %.
  Grinding the 2-streak at ~20 % opened it within 6 loops (lucky), 10-14T~04:40.
- D3 boss: bossDamage tunings 0/4 (counter a.momentum-breaker noItem); big bossDamage GA share 0.39 -> 0.86 but kill only 8 %
  (Draw 89 %: damage race). Big success GA scoredBy **progress** (build-45): 0.29 -> 0.74 progress, veryGood, applied -> route
  success still 0 %, only 28/300 runs reach the boss (attrition on 4f-4..5f-4). Gear/level wall.
- Depth probe (seed 5): 4f-3 83 % / 1,219 EXP / 16.6 drops; 5f-3 30 % / 1,482; all 0 % / ~1,650. `5f-1` is invalid (400).
  Farm 4f-3 with K=3, HPF2 0.75.
- D3 farm 4f-3 (K=3, HPF2 0.75): 10-14T04:40 -> 10:34, Lv16 57 % -> Lv18, 25 sortie runs + natural runs, 23 R / 2 T.
- **Container restart** at real 00:50 UTC during the D3 boss re-plan (after the bossDamage GA apply, call 470).
  Electron restarted with the same userData; first logIn returned 503 `runtime_unavailable` for a few seconds, then 200.
  The save kept everything up to the last commit (depth `all`, tuning + GA applies). Boss-only after farm + GA: kill 98.3 %; route 1.3 %.
