# ClaudeGA37: v0.10.1 (37) Normal API strategy -- "In-game GA research, round 2"
Written before signup, 2026-10-10. Goals: (1) D8 boss, (2) min in-game time, (3) min API calls, (4) 8 h real time.
References: ClaudeItem 12.67 d / 1,786 calls (b33, twin tools); ClaudeGA 28.37 d / 3,614 calls (b35, in-game GA only).

## What is new since ClaudeGA (builds 36-37)
- 36: a sortie no longer heals to max HP; the party enters with its current HP (8.3). Forecasts and gaSearch still assume a
  full-HP start (simulation sandbox sets currentHp = max). Rest heals max(200, 2 % MaxHP) per 15 s Step (full from 0 in <= 750 s).
- 37: gaSearch `considerItemsScope` = normal | withinTargets | global. `global` takes unlocked worn items of other parties
  (fixes ClaudeGA's #1 finding: PT2/PT3 FULL auto-equip hoarding the best drops).
- Not fixed at HEAD: desktop bridge 120 s renderer timeout still applies to gaSearch (the 360 s patch from the ClaudeGA
  branch is not on main) -> keep `timeBudgetSeconds` <= 100.

## Concept
Planning only through the in-game `gaSearch` + `applyGaResult` (no twin, emulator, proxyopt, hpopt). Route knowledge from earlier
reports is allowed. Test the two new features and look for bugs.
1. Opening (9 calls, as ClaudeItem/GA): lord/lord, guardian/guardian, 3x ninja/ranger (ursan, abyssal_sea, precise),
   alchemist/wizard; order 6,1,4,2,3,5; Mirage.
2. Every gaSearch uses `considerItemsScope: global`, `considerOrderChange`, `considerDeityChange`, effort medium/high with
   timeBudget <= 100 s. Fewer searches than ClaudeGA: one at each new destination, one polish at a stall, one at boss-open.
   Stall polish = bossDamage (boss) -> build-only -> success x2 (ClaudeGA tip 3).
3. HP-aware loop for build 36: sortie only at (near) full HP; elapsed length = time to heal + charge; k=1 at gates/boss
   (forecast assumes full HP), k>1 only for safe farming where HP loss per run is small. Measure the real cost of the change.
4. Route facts: farm at the depth before the first unbeatable elite (D6 2f-3, D7 3f-3/4f-x, D8 3f-3); D6 boss needs
   a.illusion-breaker (6309) on ranged attackers (check if GA finds it); Lv30 slot at D7 -> re-GA at once; don't grind a 0 % gate.

## What to test / look for
- `global`: changeSummary donors first, applyGaResult across parties, Undo per donor, staleness when PT2/3 auto-equip moves gear.
- `global` vs `normal` vs `withinTargets` on the same state (one A/B at a wall).
- Sortie without heal: HP after sortie, heal time, whether controls.sortie/HPF logic and forecasts still match live outcomes.
- bossDamage objective: still full route? (code: opens gates, depth all, full route).
- Timeout at 120 s, verdict honesty, local optimum stalls.
Targets: <= 16 d, <= 2,500 calls.
