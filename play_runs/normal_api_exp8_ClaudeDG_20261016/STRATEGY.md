# ClaudeDG: v0.10.1 (52) Normal API -- "refined directedBuild (b50-52: polish + final selection) vs gaSearch"
Written before signup, 2026-10-16. Limit 8 h real. Goals: D8 boss, least in-game time, fewest calls.
Read: Tune3 b44 record 11.63 d/2,511 calls (tuning-first + big GA); Directed b47 15.73 d; Dir2 b48 (no GA) failed; AB b49 failed D6 boss
(A/B at walls wasted ~1 h; walls at low level were the cost; GA +16.8 vs dir +12.8 mean gain; dir better at arrival/class layer).

## Concept
Question: which of directedBuild (now with Step-4 equipment polish `polishMethod` ga/stagedTuning/stagedTuningThenGa + Final selection) or gaSearch gives better outcome.
Method (cheaper than AB): paired A/B (same seed+verifySeed+budget) ONLY at (a) arrival re-plans, (b) boss prep. At walls: tuning -> GA (or dir polish when GA gives noChange), log both.
Variant sweep for directedBuild: polishMethod stagedTuningThenGa vs ga at boss prep. All logged to ab_log.jsonl.
## Recipe
1. Hand opening (open.py, ~9 calls). 2. Loop hl2.py, NST=6 re-plans (rp.py/ab.py). 3. Bosses: bossDamage then success + objectiveGuard; never attack route 0 %.
4. FARM EARLY with a surviving build: after 2 consecutive noChange/noisy re-plans at a wall -> stop re-planning and farm (D5 5f-4 ->Lv27; D6 5f-3 -> Lv30).
5. Lv30 breakpoint then re-tune. 6. Stop A/B when real time > 5 h.
Targets: D8 boss <= 14 d, <= 2,800 calls, < 7 h real. Report in AI_play_report/ as v0.10.1(52)_ClaudeDG_*.md.
