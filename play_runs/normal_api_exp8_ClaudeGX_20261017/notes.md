2026年 10月17日 土曜日 09時36分50秒 JST
- start: signup+open.py 10 calls
09:47 D1 done calls 86
09:58 D2 done calls 181
10:04 D3 done calls 276
- 10:06 replan skip rule changed to excess runs E-k<=3 (was E<=8), big when E-k>12 (D3 kill 1.15 d vs GP 1.08 d: too few re-plans)
- 10:50 hl4: forced re-plan on slot-unlock level (14/19/24/30); D4 5f two big GAs at Lv18 15 %, high GA at Lv20 21->76 %
10:32 D4 done calls 547
- 11:06 D5 boss gate 6 %, big GA noisy (0.074->0.074): low-p big GA now quickRuns 300/confirm 1000; stall budget max 24 loops
11:19 D5 done calls 825
- 12:05 D6 boss attempt 1: MARGINAL route 0.7 %, 30 loops 0 kills (20 X/10 T). Diagnosis: bossDamage build dies on the route (1f-1 9 % defeat, 2f 37 %); boss-only kill 63 %. Stopped chain; manual: GA objective progress + guard bossDamage
- 12:31 D6 boss: alternating guarded GAs reach route 0.4-0.8 % only (Lv25). Start bossloop.sh: 24-loop attack blocks + bossDamage(guard progress .45) / progress(guard bossDamage .75) big GAs
- 13:13 D6 BOSS KILLED call 1434, 7.05 d, Lv27, real 3h36 (natural run in attack loop; route 1.8 %). boss4 v2: bossDamage guarded by progress>=0.85x, then success guarded by bossDamage>=0.9x
- 13:55 D7 boss gate 5 %, big success GAs noChange x2 -> replan: low-p big GA uses objective progress (no guard), then re-meters success
- 14:36 D7 boss: guarded prep noChange/noisy (route 0 %); unguarded bossDamage (kill 94 %, progress .26) then progress GA guard bossDamage .8 -> progress .90, route 11 % READY
- 14:37 D7 BOSS KILLED call 1902, 9.60 d, Lv29, real 5h00. boss4 v3 = unguarded bossDamage then progress guarded bossDamage>=0.85x share
15:46 D8 done calls 2566
- 15:47 D8 BOSS KILLED (diary 10-30T23:18, 13.95 d, call 2562), Lv31, real 6h10; boss gate opened in the stage loop, boss4 meter route 32 % READY (no GA), killed in a natural run on attack loop 5
