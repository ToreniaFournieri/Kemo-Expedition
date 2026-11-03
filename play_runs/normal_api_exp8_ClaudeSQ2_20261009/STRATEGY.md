# ClaudeSQ2: v0.10.1 (26) Normal API strategy -- "Fable opening + early EXP/plan + depthLimit + side quest audit"
Written before signup, 2026-10-09.
Goals: D8 boss, min in-game time, min API calls, 8 h real. Extra: audit side quests (sideQuestStatistics), report final stats, bugs, balance.
Evidence: Fable 28.09d/449 calls (record), SQ 32.15d/680 (lost time at D8 Lv31-32; fixed by D7 beforeBoss EXP farm + pipe.sh plan C), Side (blind stepping loss).
Concept:
1. Opening = open.py (5 changeBuild + party/1 order+Mirage + sortie x3), step 12h x2, sortie x3 -> D1 boss ~day 1.
2. depthLimit Xf-3 on every elite gate from D4 (loop2.py), beforeBoss for boss gate, all for boss.
3. Reach D8 with enough level: when a D(N) wall rates <10% with plans, farm EXP at D(N-1) beforeBoss instead of a 60-call plan.
4. Plans: pipe.sh plan C (HP+attackers), scan element weights, rate with lever first; skip plans moving rating <10pts.
5. Poll cheaply (observation/diary global bossFirstClear / gates) every 6h block when boss open. No sorties at D4+.
6. Side quests: sq.py (compact) every ~4 blocks; read each party's sideQuestStatistics mid-run and at the end.
