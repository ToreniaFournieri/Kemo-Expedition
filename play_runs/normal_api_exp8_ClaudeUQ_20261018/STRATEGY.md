# ClaudeUQ: v0.10.1 (59) Normal API -- "Unique Pool" (free PT2-PT6 uniques, PT1 GA picks them)
Written before signup, 2026-10-18 15:30 JST. Limit 8 h real. Goals: D8 boss, least in-game time, fewest calls.

## What earlier reports say
- Record: ClaudeGP b54 10.89 d / ~2,506 calls / 3h26. ClaudeSS b56 13.85 d / 2,642 calls / 7h23 (fastest D1-D4 and
  D6-D7 pace: D4 1.67 d, D7 7.63 d; lost ~1.4 d at the D5 4f-4 Salvata elite and 6.2 d at the D8 gates).
- ClaudeU1 b10 (only earlier unique test, by hand): uniques unlock with PT2-PT6 (D3..D7 boss); best use was the caster
  (Mishka +29 %, Sougaha +13 % more); uniques were worse than Ursan precise snipers. Uniques have predisposition `none`
  (no x1.1 / penet bonus), but some have strong lineages: `almighty` (x1.3 sword/arrow/wand/growth, +1 all), `apostate`
  (grimoire x1.3, bolt x1.2, mind +3), `incarnation` (boost 2, resonance, prophecy), `unascertained` (slot +3, Kemo).
- Recipe that works (GX/SS): GA only; skip a search when E-k <= 3; re-plan on each new gate floor and at slot unlock
  levels (Lv24/30); progress objective for the first GA below 15 % route; boss = max boss-damage GA (now `gateDamage`
  `gateRoom: boss`) to share >= 0.97, then progress GA guarded gateDamage >= 0.85 x share, then attack regardless.
- New since SS: build 57 `gateDamage` on the X-4 elite (fixes SS Finding 1: check the elite after a gate floor),
  seed fill keeps current equipment; build 58 bossDamage -> gateDamage; build 59 `gaSearch` `uniqueCharacter`.
- Real time is search time (SS: 90 GAs = 5.9 h). Keep big GAs at 240 s.

## Concept
1. **Unique pool.** Right after each boss kill that unlocks a party (D3 -> PT2 Leonard/Orca, D4 -> PT3 Nox/Luna,
   D5 -> PT4 Mishka/Ptitsa, D6 -> PT5 Hagakure/Sougaha, D7 -> PT6 Finn/Merle), release that party's two unique
   characters (`changeBuild uniqueSelection: none`, 2 calls). They become unassigned, so PT1 can take them.
2. Every PT1 GA sends `uniqueCharacter: true` for all six members (plus all other components, global items,
   allDeities, order). The GA decides who becomes which unique (including releasing Kemo/Laika if better).
3. **Unique seeds.** At the first re-plan after a release, the GA gets `seedBuilds`: each newly freed unique on each
   of the non-support members (one change per seed, current classes and gear kept by the build-57 fill), so the
   search starts with the unique options instead of finding them by mutation. Logged: `seeds[].inBest`, applied
   unique selections.
4. Rest of the loop = SS chain (stage.sh/hl4 gate loop, replan.py E-based GA, boss7x recipe on gateDamage),
   plus SS tip: after a gate re-plan check the X-4 elite with `gateDamage` (crossCheck reports it).
5. No farming. Level only from the loop.

## Targets
D8 boss < 10.9 d, < 2,500 calls, < 6 h real. Workspace: this folder, Electron ud /tmp/bk-uq, account ClaudeUQ.
