# ClaudeRec: v0.10.1 (27) Normal API strategy -- "Fable opening, rate-on-arrival, depthLimit everywhere"
Written before signup, 2026-10-09. Goals: D8 boss, min in-game time, min API calls, 8 h real.
Evidence read: Fable 28.09d/449 calls (record), SQ2 37.15d/495 (lost ~6 d farming at D8 Lv30), SQ 32.15d/680, Sortie2, Magic.
Concept:
1. Opening = open.py (5 changeBuild + party/1 order+Mirage + sortie x3), step 12h x2, sortie x3 -> D1 boss ~day 1.
2. Sorties only D1-D3 (free EXP); none afterwards (a Defeat resets the gate streak).
3. loop2.py: depthLimit Xf-3 on every elite gate, beforeBoss on boss gate, all for boss. Zero build calls where it works.
4. Rate a pipe.sh plan C (HP + attackers, 3 weight sets) the FIRST time a gate does not move in 2 blocks; on D8 arrival rate immediately, apply if >=60%. Never farm EXP for days when a 35-call plan exists.
5. Boss open = gate list godEntry only: poll with g.py 10800 (3h blocks) to stop near the kill; read diary global bossFirstClear for the exact time.
6. Skip deity levers that need releasing holders unless gain >10 pts. Observe every 2nd step, not every one.
