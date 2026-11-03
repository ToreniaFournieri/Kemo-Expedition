Fri Oct 16 19:33:42 JST 2026
- D1 boss call 89 (killed in boss1_1; 16 calls wasted by hl3 CLEAR->no BOSS KILLED print, fixed)
19:49 D2 done calls 218
20:02 D3 done calls 348
- LP check D4 2f gate: probe Lv16 rate 54.5% expectedRuns 82 (target 87%), but gate opened within ~12 loops (~24 runs) -> probe pessimistic (gate streak vs route success?)
- D4 3f gate wall at Lv18 (route 45 %, GA noChange). Manual GA LP steps:level count 6: Lv18 67.7 / 19 71 / 20 71.8 / 21 73.3 / 22 77 / 23 72.7 / 24 72.3 (7 slots, filled 12) -> levelNeeded null; non-monotone (noise + greedy fill); slot unlock Lv24 adds nothing. Concurrent loop GA applied first, mine got 409 illegal_action (my concurrency).
20:49 D4 done calls 794
21:07 D5 done calls 1052
- D5 boss call 1052 (3.66 d, Lv24, real 1h34). LP D5 5f gate: Lv22 20% -> Lv24 39% (slot unlock); gate fell at Lv23 anyway
- D6 4f gate at Lv25 call 1208: LP Lv24 41% -> Lv30 81% (target 68%); GA noisy x2. Gate 2/4 progressing -> keep gate loop for now
- D6 5f gate wall Lv26 call 1352: 34%, GA noisy x2, LP Lv30 59% >= 53.6% -> levelNeeded 30 -> FARM (wall rule)
- WALL RULE OVERRIDDEN: probe says levelNeeded 30 but experienceToLevel 1.15M / ~2.3-2.5k EXP per run = ~480 runs of farming vs expectedRuns 33 at Lv26. Probe lacks a farm-cost term (EXP/run of the route, runs-to-level). Keep the gate loop.
- D6 BOSS OPEN call 1520 (6.36 d, Lv27, real 1h57). boss gate LP 14% exp 57 runs -> opened in ~24 runs
- D6 boss call 1613 (6.76 d, Lv27, real 2h04) no farm; bossDamage GA 45->94 %, success GA -> route 5.7 %, killed in 27 sorties
22:27 D7 done calls 2125
- D7 boss call 2125 (8.79 d, Lv28, real 2h54). LP D7 boss gate 9.7% exp 117 runs -> opened ~30 loops
- D8 4f gate wall at call 2464 (Lv29 11%, LP exp 7673 runs; Lv30 26%). Lv30 reached; paused loop for deep re-plan
- D8 4f: tune 1,6 (+5 pt) + GA high 300s (stopped at 75 s, 24->35 %) ; big GA pop64/gen200 300 s: 36 -> 62 % (veryGood). effort high preset leaves gain on the table at walls
22:59 D8 done calls 2506
- D8 BOSS KILLED in stage loop call ~2505 (igt 10-27T08:00, 10.89 d, Lv30, real 3h26 end 22:59). Diary bossFirstClear Cervin Vale confirmed.
