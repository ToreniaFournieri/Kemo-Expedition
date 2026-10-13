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
- D3 boss route GA x2: 0.6 -> 3.4 % (good), then noChange; route 7.3 %, boss-only 90 %. Clear on run 12: 10-14T14:35 (1.64 d, call 510).
- D4 arrive: route 63 %, tunings 0/4 (counters a.anti-ambush / a.dryproof noItem), GA 68 -> 98 %.
- hl2 bug (mine): the initial obs did not seed the AUTOGA gate key, so the first floor change after a loop start waited for
  the NST stall (gate 2 sat 12 loops at 43 %). Fixed.
- D4 gates 2-5: one tuning accepted per re-plan (r./e. switches), GAs 43 -> 62, 51 -> 57, 66 -> 89, 73 -> 89, 31 -> 65 %.
  The GA took donors 103/105 (Party 2 unlocked, FULL mode, deity cunning). Freed PT2 (freept.py 2: 7 calls) at 10-15T04:01 (2.20 d).
- Real time 01:50 UTC (2 h 50 m used). Gate GA budget cut to 180 s (TBB) to save real time.
- D4 boss gate (2-streak): tuning + GA(180 s) noChange at 11.6 %, then 15 -> 41 %; opened 10-15T13:26 (2.60 d, call 738).
  Boss-route GA at the open boss: before 0, after 0.2 % -> verdict `noisy`, scoredBy success (one success in 500 blocks the
  build-45 progress verdict).
- D4 boss: bossDamage tuning char 5 accepted e.ice + r.fire (+20 pt share, kill 0 -> 10.5 %), GA share 0.82 -> 0.99 (kill 90 %),
  success GA route 12.6 -> 26 %. Clear on the 4th run 10-15T14:48 (2.65 d, call 761).
- D5 arrive: route 100 % (no re-plan, 2 calls).
- D5 gates 1-2 fast (tuning 1 accepted each). Gate 3 (3f, 5-streak) at 12 -> 32 % (GA), then two stall re-plans noisy 32 -> 32.
  Bottleneck 2f-4 elite with a.illusion: counter a.illusion-breaker `noItem` (6309 is a D6 drop). Step 5 also dropped recorded
  +10..14 % candidates (quick-run winner's curse). 10-16T01:26 (3.10 d).
- D5 depth probe: 2f-3 90 % / 844 EXP / 8.3 drops; all (= 3f-3) 41 % / 1,062 EXP / 9.6 drops. D5 EXP is far too low to farm
  levels (Lv22 -> 27 needs ~771 k).
- GA with quickRuns 100 (2,248 evals in 300 s, 4x the 300-run GA) and allDeities: 38 -> 45 %. Gear-limited.
  Loop at `all` (gate attempts + drops) with re-plans every 18 loops (QR=100, 240 s).
- D5 gates 4-5: re-plans 10 -> 31 %, 38 -> 54 %; gate 5 (3-streak) stuck at 14 % (GA 0 -> 6 %, then noisy). Party 3 unlocked
  (GA donor 202). Long loop at `all` (NST 4, GA quickRuns 100, allDeities): after 24 loops (Lv24) one re-plan took the route
  29 -> 73 % (veryGood) and gate 5 + boss gate fell. Boss open 10-17T05:13 (4.25 d, call 1112).
- D5 boss: no re-plan (boss-only 45.7 %, route 20.3 %). Clear on the first sortie 10-17T05:37 (4.27 d, call 1118).
- Real time 03:00 UTC (4 h used); GA is 93 % of API real time, loops ~1 real min per game day.
