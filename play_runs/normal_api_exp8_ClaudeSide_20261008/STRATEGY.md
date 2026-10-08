# ClaudeSide: v0.10.1 (19) Normal API strategy -- "Fable-Prime + depthLimit gates + side-quest audit"
Written before signup, 2026-10-08.

Goal order: (1) D8 boss, (2) min in-game time, (3) min API calls, 8 h real cap. Extra request: audit side quests
(`read/observation/party` -> `party.sideQuestStatistics`, `compact.sideQuest`), report final statistics, bugs/concerns, balance.

## Evidence read
Fable (28.09 d / 449 calls, record), Slot2 (29.5 d), Sortie2, Magic (negative: no guardian, Mirage kept), Orca5, tools README.
Key: Slot2 formation + Mirage only for D1-D2 + batch sorties (`numberOfSortie`) = fastest opening; `depthLimit Xf-3` discovered late by
Fable (D8 gate 5: 2 days stuck -> 1 block); proxyopt+hpopt with weight scans beat GA; don't sortie during a gate streak.

## Concept
1. Opening identical to Fable (9 calls: 5 changeBuild + party/1 order+Mirage, sortie x3 batches). Reuse recorded call list.
2. Deity: Mirage D1-D2, Fortification D3-D4, Fertility D5+, Precision only if twin says so.
3. **NEW vs Fable: set `depthLimit` = `Xf-3` on every elite gate stage from D4 (and `beforeBoss` for boss gate), `all` for the boss** *before*
   spending build calls. Only rebuild with proxyopt/hpopt when the twin rating moves >10 pts.
4. Poll boss flag via Global Diary only (cheap), 6 h blocks near D8.
5. Side quests: poll `read/observation/party` rarely (about every ~10th block + at end) -> sample sideQuestStatistics progression; side quests are
   only assigned when no Clear-Gate is active (excl. gods battle) so they show up between gates / on open stages. Final export read at the end.
6. Offline twin only for compute; max 3 optimiser jobs (4-core box).
