# ClaudeCharge: v0.10.1 (27) Normal API strategy -- "Charge-Clock"
Written before signup, 2026-10-09. Goals: (1) D8 boss, (2) min in-game time, (3) min API calls, 8 h real time.
Records to beat: Fable 28.09 d / 449 calls (fastest), Slot2 29.5 d / 552.

## Evidence (reports + engine code read this session)
- All v0.10.1 reports (Fable, Slot2, SQ, SQ2, Rec, Sortie2, Magic, U1) and the ai_play_tools README.
- Final builds of all 5 successful runs converged on: Laika guardian/guardian (front), Kemo lord/lord,
  Sota/Kuzunoha Ursan ninja/ranger abyssal_sea precise, Lop ninja/ranger, Selfin Cervin alchemist/wizard; order [6,1,4,2,3,5].
- D8 boss needed PT1 Lv31-33 (3.2-3.8M total EXP). Fable averaged ~135k EXP/day; EXP is the clock.
- Fable PT1 lifetime: 2,138 runs, 70% of them Draw/Retreat/Defeat.

## New mechanics found in the code (not used by earlier runs)
1. Sortie charge refill depends on the CURRENT stock (instantExpedition.ts): before D1 boss 1/2/4 min (max 3),
   after D1 2/4/8/15 (max 4), after D2 4/8/15/30/60 (max 5), after D3 6/12/24/48/96/192 min (max 6).
   Refilling 0->k is fast: k=3 in 42 min, k=4 in 90, k=5 in 186, k=6 in 378 min.
   => "elapsed C(k) + sortie k" loops multiply the run rate: at a 26 min D8 cycle k=4 gives 7 runs/90 min (2.1x natural)
   for 2 calls; k=5 gives 12 runs/186 min (1.7x); k=3 gives 4 runs/42 min (2.5x).
2. Every run (natural or sortie) starts at full HP; sortie outcomes count for Clear-Gates like natural runs.
3. commit/progress/elapsed runs floor(elapsed/cycle) cycles, the remainder is dropped; party stats are frozen per call.
4. depthLimit is a no-op for Clear-Gates: a locked X,4 gate already ends the run as Return after X,3
   (expeditionService.ts). Skip all depthLimit calls (earlier runs spent ~40 calls on them).
5. Cycle = rest + sell + free action (40 + condition/10 steps!) + sleep + pray 4 + travel (6+2*tier) + rooms, 15 s/step.
   Fortification doubles rest; Fertility x1.2 free action; Precision x1.2 explore.
6. Difficulty offset farming of a cleared dungeon (unlocked only after its boss) gave <= 70k/12h at Lv24 in the twin:
   not a main lever. EXP = 5 x class mods x enemy level x room mult (same base in every dungeon).

## Concept
- Opening: proven 9-call build (5 changeBuild + party/1 order + Mirage). Export once, plan the D1 phase in the offline twin.
- Use the cheap early charges (1/2/4, 2/4/8/15, 4/8/15/30) with short steps + batch sorties for D1-D3.
- After D3: default loop "elapsed 186 min + sortie 5" (k=5, cheap); k=3-4 when the boss is open or a gate streak is
  close; plain 12 h steps only when the party is clearly too weak (sorties would just fail).
- No depthLimit calls. destination fixed; changeExpedition only when the next dungeon unlocks.
- Walls: export -> twin (pipe.sh proxyopt+hpopt, 3 weight sets, deity lever) -> apply only if > +10 pts.
  Rate at the FIRST stall (2 blocks without gate progress) and on every dungeon arrival from D4.
- Observe with compact/expedition reads every 2-3 loops; sortie outcomes are the cheap signal (Clear with boss open = kill).
- Exact kill time from Global Diary bossFirstClear.
