# ClaudePF: v0.10.1 (59) Normal API -- "Party Farm" (side parties farm items with Discord + Difficulty Offset)
Written before signup, 2026-10-19. Limit 8 h real. Goals: D8 boss, least in-game time, fewest calls.

## What earlier reports say
- Record: ClaudeGP b54 10.89 d / ~2,506 calls / 3h26. Latest: ClaudeUQ b59 12.75 d / 2,529 calls / 5h19.
- Walls are item tiers and slot levels: attack comes from gear; level only adds HP and slots (Lv24 at D5, Lv30 at D8).
  D6-D8 walls broke when a new item tier piled up (ClaudeCharge). Real time = GA search time.
- Recipe that works (GX/SS/UQ client, reused here): GA-only loop (`hl4.py` + `replan.py` E-based re-plans, big GA
  at walls), boss = max `gateDamage gateRoom:boss` GA then progress GA guarded >= 0.85 x share, then attack;
  `wall.sh` for X-4 elites; release side-party uniques after each party unlock + `uniqueCharacter: true` + seeds.
- gaSearch `considerItemsScope: global` takes items from every party (side party keeps an empty slot).
  New side parties start Lv1 in FULL auto-equip with a default deity (by design).

## Drop mechanics (Spec 6.1.6, 8.3, 1.2; src/game/deity.ts)
- Base 2 reward tickets per drop-list item. Goddess of Discord: +rank tickets (rank 1 at 0 G donated = +1 -> 3 draws,
  +50 % drops; rank 2 at 1,000 G donated). Downside: one random member gets `c.antagonism` each battle -> bad on PT1,
  fine on a farm party. God of Oblivion: floor(rank/2) SR tickets -> 0 at rank 1, useless early.
- Difficulty Offset (after that boss is beaten): +2 -> +1 item ticket, +4 -> +1 item +1 SR, +6 -> +2/+1, ... (enemy level +N).
- Enhancement: ~22 % of common drops enhanced; x1.33 / x1.58 / x2.10 ... (one tier ~ x1.33), so an enhanced item of a
  lower tier competes with the next tier. SR is ~1/1,500 per enhanced roll: a lottery, not a plan.

## Concept
1. PT1 = UQ recipe unchanged (GA-only, big GA at walls, boss7x/wall.sh, unique release, uniqueCharacter seeds).
2. **PT2 = item farm.** At the D3 kill (PT2 unlock): deity -> Goddess of Discord, fixed destination at the newest
   dungeon it can survive, FULL auto-equip kept (it wears its drops; PT1's global-scope GA takes what it wants).
   Offset +2 (then +4/+6) as soon as PT2 survives it, preferring tier (newer dungeon) over offset.
   PT2 levels and farms only through its natural Cycles inside PT1's elapsed calls (0 extra calls); a PT2 sortie batch
   (all charges, 1 call) is allowed only if natural progress is too slow to reach a useful tier.
3. PT3+ (D4.. kills): same idea when cheap (fixed destination + offset), default deities (PT2 holds Discord).
4. PT1 GAs use `allDeities`; after each GA apply check that PT2 still has Discord (PT1 should never want antagonism).
5. Measure: PT2 level/dest over time, items in PT1 builds that came from side-party drops (enhanced/SR), and whether
   item-tier walls (D6-D8) open faster than in UQ/GP.

## Targets
D8 boss < 10.9 d, < 2,500 calls, < 6 h real. Workspace: this folder, Electron ud /tmp/bk-pf (app snapshot /tmp/bk-pf/app),
account ClaudePF.
