# ClaudeSQ: v0.10.1 (25) Normal API strategy -- "Side-Fable + element-safe plans + side quest sampling"
Written before signup, 2026-10-09.

Goal order: (1) D8 boss, (2) min in-game time, (3) min API calls, 8 h real cap.
Extra request: audit side quests (`party.sideQuestStatistics`, `compact.sideQuest`), report final stats, bugs/concerns, balance.

## Evidence read
Fable (28.09 d / 449 calls, record), ClaudeSide (37.9 d / 508; lost ~11 d to thunder-immunity blind stepping at D7 + slow D5/D6 plans),
Side 100d/300d follow-ups (side quests rebalanced in build 22; failed counter added; new string `<id>-ok/cancelled/failed/total`),
Slot2/Sortie2/Magic/U1 reports, tools README. Spec 5.1.2: quest rolled at end of state.return only when no Clear-Gate (excl. God battle).

## Concept
1. Opening = Fable/Side opening (5 changeBuild + party/1 order+Mirage, batch sorties). Mirage D1-D2, Fortification D3-D4, Fertility D5+.
2. `depthLimit Xf-3` on every elite gate from D4 (loop2.py), `beforeBoss` on boss gate, `all` for the boss.
3. Plans: HP-only (4 calls) first; proxyopt with EQUAL element weights as default; check `roomtab` for win-0 rooms before stepping blind;
   observe after every 1-2 blocks near walls (Side's 6.5-day blind stall was the biggest avoidable loss).
4. Side quests: new build => parse 4-field stats. Sample `compact` (1 call) every ~4 blocks; read each party's `sideQuestStatistics` at the end
   (and once mid-run). Do not sortie during gate streaks.
5. Max 3 optimiser jobs (4-core box).
