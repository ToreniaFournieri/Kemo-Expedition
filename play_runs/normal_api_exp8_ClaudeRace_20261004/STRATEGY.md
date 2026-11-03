# Run concept — "Shapeshifter party" (Claude, Normal API, Exp8 boss, 2026/10/04)

Written before signup. Baselines from the reports: Codex 39.9 d / 452 calls (best), CodexBurst 46.25 d / 595,
CodexN8 41.9 d / 747, Claude run 4 44.8 d / 557, Claude run 6 78 d / 545.

## Pre-play race experiment (offline twin, prior run checkpoints, nothing on the live account)
`play_runs/ai_play_tools/twin/racetest.mjs`: swap ONE character's race (classes, lineage, gear kept; surplus gear trimmed greedily),
measure the exact gate success over 1000 seeded runs.

* Checkpoint 683 (D8 gate 5, baseline 17.3%):
  * Caster Selfin Cervin -> **Felidian 27.9%**, Felidian+Nimble **31.9%**, +Inquisitive 31.2%; boss clear 5.2% -> **12.7%**.
    Felidian has native `a.first-strike` 1, so the caster acts earlier (same effect CodexBurst found with Ninja/Wizard, but
    without giving up the Alchemist/Wizard classes).
  * Snipers: every non-Ursan race lost (9–14%). Reason: `c.equip_slot+1` of Lupinian/Vulpinian/Procyonian/Felidian is the
    SAME bonus name as Ninja's, so it does not stack; only Ursan's `+2` adds to Ninja's `+1` (11 slots vs 9).
  * Lop (Leporian) -> Felidian Ranger/Ninja 16.8% (≈ equal; hunter main + racial first strike).
* Checkpoint 561 (D8 gate 4): Felidian caster 4.3% -> 0.0% (worse). The race effect is stage-specific.

## Concept
1. Proven class core: Kemo lord/lord (Command), Laika guardian/guardian (Defender), Sota/Kuzunoha Ursan ninja/ranger
   abyssal_sea precise, Lop Leporian ninja/ranger abyssal_sea precise.
2. **Underused race as the caster: Selfin = Felidian alchemist/wizard utopia nimble** from the opening (first-strike caster).
3. **Race is a 1-call lever**: `changeBuild` keeps equipment when classes are unchanged. At every wall, run the twin race/trait
   sweep (≈1 min) next to the equipment search, and switch races per gate when the gain is large (e.g. Cervin at D8 gate 4,
   Felidian at D8 gate 5/boss). Report which races help where.
4. Precision deity + order in one `build/party` call at the start; FULL auto equipment until the first wall, then SEMI + offline
   GA plans (seeded from the previous plan), diff-only edits.
5. Economy: 12 h `elapsed` steps chained, read gates every 1–2 steps (every half-day near the boss), one export per search.
   PT2+ on FULL auto for jewels (6 calls each, only once).
6. Stop at the first verified boss kill (boss flag / difficulty max 48 / bossRare log). No debug, imports, resets, or source changes.
