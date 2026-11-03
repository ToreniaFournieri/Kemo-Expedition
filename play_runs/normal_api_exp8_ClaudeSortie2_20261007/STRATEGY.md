# ClaudeSortie2 - v0.10.1 (13) Normal API strategy (recorded before signup, 2026-10-07)
Goals: D8 boss -> min in-game days -> min API calls; 8h real cap. Reference: Slot2 29.5d/552 calls.
Concept "Sortie-Prime" (new, user wants ideas for other AIs, not a score):
- Prior runs left 3-6 Instant Expedition Charges (sorties) unused all run. A sortie = one full party cycle instantly (EXP+drops at no game time).
  EXP is the hidden clock at D6 (Lv32 needs ~550k). Hypothesis: spending every charge on the highest-EXP survivable destination
  (while HP is full and win odds are good) shifts levels ~1-2 days earlier per wall. Measure EXP per sortie vs per 12h block.
- Core build = Slot2 (Laika/Kemo/2 Ursan ninja-ranger/Lop/Selfin cervin), Mirage at D2 from the start (not day 4), proxyopt+hpopt from D2.
- Early: do the opening in 10 calls, step 12h with fewer observations; charge usage logged.
- Keep calls lean: observe every 2-3 blocks.
