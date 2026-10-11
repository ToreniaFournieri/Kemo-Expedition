# ClaudeGA37 run notes (live)

## Findings
- N1 (build 36, API parity): `commit/progress/elapsed` only processes whole AFK Cycles (sub-Cycle time is carried) and
  each processed Cycle ends with a full heal; a sortie resets the carry. So after a sortie that lost HP, the API party
  stays at that HP until one whole Cycle (~18-25 min game time, incl. one natural run) has passed. A UI player heals
  max(200, 2 %) per 15 s Step in state.rest and can sortie again after a few minutes. Observed: 351/449 HP unchanged
  after 4 x 60 s elapsed at D1; healed only after ~1,440 s.
  The elapsed response does not expose the carried seconds or the Cycle length, so a client must guess S.
- N2: forecasts/gaSearch assume a full-HP start (simulation sandbox sets currentHp = max) -> only sortie at full HP at gates.
- N3: `considerItemsScope: global` works: donors 101-105 (PT2) appeared in changeSummary 4 times by D4; applyGaResult OK.
- N4: Deity time cost is invisible to the GA: Fortification (rest x2) is often picked; in build 36 the rest length is
  the loop length after a damaging sortie. An objective like "success per game hour" would capture it.
- N5: gaSearch effort high + timeBudgetSeconds 100 returned at 104 s total (verification adds ~4 s); keep <= 90 under
  the 120 s bridge timeout (the 360 s patch from the ClaudeGA branch is not on main).
- N6: D4 boss #243 Maura: fire ranged volley (3 hits ~3,100 on a ninja + 537 on guardian) kills the party at 70 % HP
  before it acts; GA bossDamage 7 -> 11 %, success stays 0 % (noChange x3).
- N7: depthLimit `6f-3` is rejected (`invalid_depth_limit`); valid values are `Xf-3`, `Xf-4` up to 5f, `beforeBoss`, `all`.
- N8: one full-component search (equipment+jewels+mainClass+subClass+lineage+predisposition+raceGender) beat split
  passes: D4 boss success 0 % (build-only noChange, gear-only 1.2 %) -> 5.8 % -> 7.6 % -> 34.6 % in 3 full passes; boss died next loop.
- N9: `considerDeityChange` only offers deities that no other party holds. New parties auto-take deities (PT2 Cunning,
  PT3 Fertility, PT4 Fortification), silently removing them from PT1's search. Freed PT3/PT4 manually (2 calls).
- N10: scope A/B on the same state and seed (D6 gate 4, medium): normal +6.8 pt (good), withinTargets noChange, global
  noChange. A bigger pool does not guarantee a better result in a short search (the random path differs).
- N11: `bossDamage` still runs the full route (code: opens gates, depth all). At the D6 boss it reports 2-6 % share because
  ~80 % of runs die on the route (5f-4 elite). The GA never chose the 6309 illusion-breakers.
- N12: effort medium ends in ~15 s (40 generations), far below its 60 s budget; high always hits the 90 s budget.
- N13: per-room table of `simulationRun` is very useful to find the wall room (D6: 5f-4 elite wins 74/165).
- N14: the GA left char 2's 11th slot (Lv30) EMPTY through 8+ full searches (equipment true, global scope). Filling it by
  hand with 6309 (+2) took bossDamage 42 -> 57 % and success 0 -> 1.4 %. Possible search gap (cf. ClaudeGA: guardian slot).
- N15: GA never picks a.illusion-breaker 6309 (low base power, value only in the boss room). Manual seeding + `equipment:false`
  on the two rangers (FREEZE) -> bossDamage 67 %, success 9.8 %; D6 boss died on the 18th attempt. Locks need FULL mode
  (lockEquipment requires autoEquipment FULL), so "freeze via equipment:false" is the practical way to pin an item.
- N16: D6 took 6.2 d (4.75 -> 10.99). Lv28->30 at D6 5f-3 took ~2 d of farming.
- N17 (BUG, code-confirmed): gaSearch builds the current genome from `character.equipment.map(...)`
  (src/api/v1/gaSearch.ts ~l.333), but the stored equipment array can be shorter than `maxEquipSlots`
  (readModels.ts l.1001 says so). `mutate` 'replace' picks `slot < slots.length` and crossover maps over the child's array,
  so a slot past the stored array (new Lv30 slot, or extra slots from a class/race change) is never filled. Only the two
  heuristic seeds use maxSlots, and their extra gene is lost in crossover. Fix: pad current.equipment to maxEquipSlots
  (and re-pad after a build gene changes the slot count).
- N18: D7 gates fell in 0.6 d right after Lv30 (boss open 11.6 d). D7 boss route: 37/500 reach the boss
  (4f-4 draws, 5f-4 elite, 6f-1/6f-2 defeats); AUTOGA with `success` gives noChange at 0 %.
- N19: D7 local optimum: the GA had turned ninja/ranger char 3 into an 8-armor tank (e.none) -> only 2 damage dealers,
  Origami (a.thunder-null, r.fire x1.5) rooms timed out (Draw 23 %). Manual restart (char 3 = 5 x 7107 + 1 fire arrow
  + 2 NoA bows) dropped Draw to 4 % but raised Retreat; the GA from that start reached 23.6 % beforeBoss (old basin
  11-13 %). After a 12 h farm, bossDamage 22 -> 39 -> 59 -> 72 %, then success 1.4 -> 15 %; boss died on the 3rd loop.
- N20: element = argmax of summed e.* over all worn items; a single 6213 thunder arrow keeps a ranger on thunder.
  The GA's one-slot mutations rarely flip a character's element (needs several coordinated swaps).
