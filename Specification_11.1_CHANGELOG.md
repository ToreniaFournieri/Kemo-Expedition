## 11. CHANGELOG
- Date format: YYYY/MM/DD

|Version  | Build | date | Changes                                                                               |
|---------|------|------|--------------------------------------------------------------------------------------|
| 0.6.0 | 480 | 2026/4/19 | Implement passive abilities `a.fire-protect-breaker`, `a.ice-protect-breaker`, `a.thunder-protect-breaker`, and `a.m-barrier-breaker` in runtime/master text: add ability ids/names/glossary/help descriptions, make intercept resolution skip matching elemental reflect/absorb and magical absorb when breaker is owned by attacker, and make MID `a.m-barrier` defense amplification ignored when opponent has `a.m-barrier-breaker` with start log `敵名は魔法障壁を打ち破り無効化した(魔法障壁破り)`. |
| 0.6.0 | 479 | 2026/4/19 | Update timed ability `a.flying` in runtime to Spec 6.1 behavior: trigger at CLOSE timing 9 to grant self evasion (`Lv1:+40`, `Lv2:+45`, `Lv3:+50`), emit `log.flying` note `(飛行:回避+N)`, and align related ability/race tooltip glossary text from old close NoA reduction to evasion bonus. |
| 0.6.0 | 478 | 2026/4/19 | Update runtime lineage `frozen_forest` bonus ability to `a.coldproof`1 (from `a.frostbite`1) while keeping existing selectable flag and other c-bonuses (`c.archery_x1.2`, `c.robe_x1.2`, `c.ice-defense-multiplier_x4/5`) aligned to Spec 2.1 lineage table. |
| 0.6.0 | 477 | 2026/4/19 | Align runtime lineage/race master data to Spec 2.1 tables: add selectable lineage bonus abilities `a.siege` (`firmament`), `a.frostbite`1 (`frozen_forest`), `a.wind-rider` (`windcross`), and update non-selectable `Avian` race to include unlock ability `a.wind-rider`1 while keeping `a.flying`1 default and existing c-bonuses/selectable flag. |
| 0.6.0 | 476 | 2026/4/19 | Implement passive abilities `a.wind-rider`, `a.siege`, and `a.coldproof` in runtime/master data: add ability ids/names/descriptions/glossary/help text, apply tailwind initiative bonus split (+1d3 default party, +2d3 for `a.wind-rider`), apply heavy-wind LONG NoA penalty split (0.75 default, 0.50 for `a.wind-rider`), make `terrain.fortified` terrain amplifier ignore when actor has `a.siege`, and make `a.frostbite` initiative penalty bypass actors with `a.coldproof` (except `terrain.machine-logic` behavior). |
| 0.6.0 | 475 | 2026/4/19 | Implement passive ability `a.domain-breaker` in runtime/master data: add ability id/name/descriptions/glossary/help text, ignore domain terrain overrides (`terrain.floor-domain`/`terrain.cap-domain`), ignore echo-domain amplification and logs for owners, bypass domain guaranteed-hit handling (`terrain.sniper-domain`/`terrain.spell-domain`/`terrain.duelist-domain`), allow `[効]` abilities under `terrain.silence-field`, and emit start log `name はNの影響を受けない` for domain owners. |
| 0.6.0 | 474 | 2026/4/19 | Update battle runtime reactive resolution order for Spec 6.1.3.2 priority: resolve On-strike effects before Counter, and keep Ally-follow-up (`a.covering-fire`) after counter chains (`On-strike > Counter > Ally-follow-up`) for both character and enemy CLOSE actions. |
| 0.6.0 | 473 | 2026/4/19 | Refine Diary aggregated life-drain text generation to reuse canonical flavor text templates (`LIFE_DRAIN_LOGS` / `NULL_LIFE_DRAIN_LOGS`) via shared narration helper, ensuring nullified aggregations render spec-aligned `log.null-life-drain` wording. |
| 0.6.0 | 472 | 2026/4/19 | Fix aggregated CLOSE-phase life-drain log text in Diary: when nullified (`(吸血無効)`), keep `log.null-life-drain` flavor wording (`…生命を奪えなかった`) instead of incorrectly using `log.life-drain` phrasing. |
| 0.6.0 | 471 | 2026/4/19 | Extend CLOSE-phase immediate nullification log ordering in deferred enemy-reactive flows: emit `a.null-corrode`, `a.null-life-drain`, `a.null-death-touch`, `a.null-burn`, and `a.null-bind` logs right after the triggering enemy action (before counter/re-counter logs), with duplicate suppression in deferred resolution. |
| 0.6.0 | 470 | 2026/4/19 | Fix CLOSE-phase `a.null-corrode` battle log ordering for enemy corrosion attempts so `(防腐)` is emitted immediately after the triggering enemy action (before deferred counter/re-counter sequences), while keeping existing deferred reactive resolution flow intact. |
| 0.6.0 | 469 | 2026/4/18 | Implement passive nullification abilities `a.null-corrode`, `a.null-life-drain`, `a.null-death-touch`, `a.null-burn`, `a.null-bind`, and `a.null-requiem` in runtime/master data: add ability ids/names/glossary/help text, add `log.null-*` flavor text builders, apply immunity handling to CLOSE on-strike/reactive effects and requiem resolution, and grant lineage bonuses per table (`sandstorm`, `ashen_capital`, `blaze_peak`, `abyssal_sea`, `utopia`, plus `oath` requiem). |
| 0.6.0 | 468 | 2026/4/18 | Implement passive ability `a.null-shock` in runtime/master data: add ability id/name/glossary/tooltip, grant it to `machina` lineage, and update CLOSE shock resolution to consume `a.shock` but keep attacks uninterrupted for `a.null-shock` actors with `log.null-shock` + `(感電予防:攻撃継続)`. |
| 0.6.0 | 467 | 2026/4/18 | Update runtime predisposition bonuses for `Amicable`/`Stubborn` to requested table values; remove extra `a.slow` from `Stubborn` while keeping `c.shield_x1.1`, `c.physical_defense+0.10`, and `b.vitality+1`. |
| 0.6.0 | 466 | 2026/4/18 | Implement passive ability `a.unforgettable` in runtime/master data and apply `a.oblivion` immunity handling with `log.unforgettable` + `(忘却無効)`; align `incarnation` and all requested predisposition bonuses (including `Introspective`/`a.unforgettable`) to Spec 2.1 tables. |
| 0.6.0 | 465 | 2026/4/18 | Update runtime predisposition `None` display values to Japanese `(なし)` and short `-` while keeping non-selectable/no-bonus behavior. |
| 0.6.0 | 464 | 2026/4/18 | Implement runtime `None` predisposition (`selectable:false`, no bonuses) and update PT1–PT6 unique-character initial predispositions to `None` per Spec 2.1.4.2 initial conditions. |
| 0.6.0 | 463 | 2026/4/18 | Align runtime `Devoted` predisposition bonuses to Spec 2.1: replace `c.growth_x1.1` with `a.first-aid`1 while keeping `c.shield_x1.1` and `c.fire-defense-multiplier_x4/5`. |
| 0.6.0 | 462 | 2026/4/18 | Implement passive ability `a.equation-breaker` in runtime/master data: add ability name/description/glossary + `log.equation-breaker`, grant it to `Serenity` predisposition, allow `a.first-strike` to ignore `terrain.machine-logic` initiative penalty when owned, and make `terrain.silence-field` skip START actor abilities except owners with `a.equation-breaker`. |
| 0.6.0 | 461 | 2026/4/18 | Implement timed ability `a.first-aid` (応急措置) in runtime: add master ability id/name/tooltip entries and apply post-elite-battle END healing per member (`d.HP` basis, Lv1–Lv5 = 2%–6%) with new `log.first-aid` flavor text + `(HP回復+N)` notes. |
| 0.6.0 | 460 | 2026/4/18 | Implement passive abilities `a.true-sight` / `a.output-stabilizer`: add ability master labels/descriptions, wire predisposition bonuses (`Perceptive`/`Exacting`) to grant them per Spec 2.1, and apply battle runtime effects for initiative, fog LONG-phase accuracy penalty immunity, and terrain NoA-amplifier immunity. |
| 0.6.0 | 459 | 2026/4/18 | Align runtime predisposition master data to Spec 2.1 table: update bonus mappings (including `a.null-antagonism` for `Amicable`) and add explicit `selectable` flags with edit-mode enforcement for non-selectable predispositions. |
| 0.6.0 | 458 | 2026/4/18 | Implement runtime passive ability `a.null-antagonism` (敵対無効化): add ability master labels/descriptions, block `c.antagonism` from `Goddess of Discord` and `a.*-confusion` when target has immunity, and emit `log.null-antagonism` with note `(敵対無効化)`. |
| 0.6.0 | 457 | 2026/4/18 | Update runtime selectable lineage master data bonuses to match Spec 2.1 table (add missing secondary `c.*_x1.2` bonuses and defensive multipliers across `sandstorm` to `oath`). |
| 0.6.0 | 456 | 2026/4/18 | Refine expedition unlock gate wording in Party/Next Goal UI: when required count is 1, display `ボス撃破で…開放` (hide `0/1` progress), while keeping fraction format for other requirements. |
| 0.6.0 | 455 | 2026/4/18 | Align runtime lineage/party initial setup to Spec 2.1.4.2: add `a.resonance` to `incarnation`, and update PT3/PT5/PT6 members (order, classes, lineages, predispositions, unique placements) to the requested initial conditions. |
| 0.6.0 | 454 | 2026/4/18 | Align runtime PT4 initial member setup to Spec 2.1.4.2: update classes, lineages, predispositions, order, and unique flags under Goddess of Fertility. |
| 0.6.0 | 453 | 2026/4/18 | Update runtime PT1 initial member setup to match requested condition: ケモ sub class `class.samurai` with initial equipment `1101`, `1105`, `1106` under Goddess of Restoration. |
| 0.6.0 | 452 | 2026/4/18 | Implement runtime Debug time speed `x10000 MAX` option in the Divine Bureau debug pane and wire `Debug Scaling` Step multiplier `×0.0001` (0.0015 seconds). |
| 0.6.0 | 451 | 2026/4/18 | Update runtime `state.explore` flavor text set for `x.exp_id`8 / `x.floor`1 to the latest `虚痕` narrative lines (including route/terrain cautions and contextual lore line). |
| 0.6.0 | 450 | 2026/4/18 | Update runtime Expedition 8 Dragon→Voidspawn conversion: floor 1 concept renamed to `虚痕の峡谷門`, enemy type master/bonuses switched to `Voidspawn` (`a.null_counter`1, `a.oblivion`1, elemental defenses), Expedition 8 enemy table entries updated (types/Japanese names), and tier-8 elite item names updated to `虚痕` variants. |
| 0.6.0 | 449 | 2026/4/18 | Fix Party bonus summary growth aggregation: `c.growth_xV` now deduplicates and multiplies unique multipliers (e.g. 1.2×1.1=1.32) instead of additive stacking in display. |
| 0.6.0 | 448 | 2026/4/18 | Update runtime assignments/abilities: Caninian default ability to `a.howl`1 (unlock `a.resurrect`1), Pioneer lineage bonus ability to `a.seeker`1, and Seeker scaling to Lv1 `+0.50%` / Lv2 `+0.75%` for grimoire effects. |
| 0.6.0 | 447 | 2026/4/18 | Fix Party UI/runtime race-unlock behavior for Procyonian: gate `a.resonance` behind unlock condition by registering the race unlock ability id; and normalize signed base-stat bonus text rendering to avoid awkward `知+-1` style display (`知-1`, etc.). |
| 0.6.0 | 446 | 2026/4/18 | Align runtime Procyonian race master data to Spec 2.1 races table: set default ability to `a.illusion`1 and unlock ability to `a.resonance`1 (including race ability bonus ordering). |
| 0.6.0 | 445 | 2026/4/18 | Implement runtime party unlock progression per Spec 5.1.3.2: unlock PT2–PT6 by defeating expedition bosses for `x.expedition` 2–6, and update locked party UI text to the specified expedition-clear messages. |
| 0.6.0 | 444 | 2026/4/18 | Update runtime Party member details (8.2.2) to disable character background image rendering for this version (`No image`). |
| 0.6.0 | 443 | 2026/4/17 | Fix runtime lineage `unexpected_prince(ss)` bonuses to match spec row (`a.melee-conversion`, `c.equip_melee`, `b.strength+1`) instead of enemy-only timed abilities. |
| 0.6.0 | 442 | 2026/4/17 | Update runtime PT1–PT6 default party setups to requested initial conditions (deities, races, names, classes, lineages, predispositions, unique flags, and PT1 initial equipment), and wire race icon paths for Kemoria/Orcinian/Avian. |
| 0.6.0 | 441 | 2026/4/17 | Update runtime lineage master data to match Spec 2.1 lineup/bonuses/selectable flags; add new non-selectable lineages and remove obsolete runtime usage of `apex_predator` / `usurper` (legacy save IDs now alias to current lineages). |
| 0.6.0 | 440 | 2026/4/17 | Fix `a.melee-conversion` tooltip text interpolation (`N%` / `M%`) and apply melee conversion attack gain to enemy runtime scaling (including Colosseum editor opponent status). |
| 0.6.0 | 439 | 2026/4/17 | Implement passive ability `a.melee-conversion` in runtime: add new ability id/name/glossary entry and apply `d.melee_attack += round(d.ranged_attack×N%) + round(d.magical_attack×M%)` (Lv1: 30%/30%, Lv2: 40%/40%). |
| 0.6.0 | 438 | 2026/4/17 | Add non-selectable runtime races `Kemoria` / `Orcinian` / `Avian` (with specified base stats and c-bonuses), and update `a.flying` glossary scale to `Lv1: x1/3, Lv2: x1/4, Lv3: x1/5` with `CLOSE` phase priority `9`. |
| 0.6.0 | 437 | 2026/4/17 | Fix bonus ability tooltip wording format for `a.execution`: correctly interpolate `N` and `xM` from level scale (`50%・x1.8`) and display tooltip as `タイトル：説明`. |
| 0.6.0 | 436 | 2026/4/17 | Implement reactive abilities `a.overwatch` / `a.execution` in runtime battle damage formula (`f.overwatch_amplifier`, `f.execution_amplifier`) and add corresponding battle log displays (`監視:xN`, `エクセキューション:xM`). |
| 0.6.0 | 435 | 2026/4/16 | Fix bonus ability tooltip interpolation for reflect abilities so scales like `反射3/10・被弾7/10` are treated as values (not timing), correcting descriptions such as 打ち返し2. |
| 0.6.0 | 434 | 2026/4/16 | Update runtime Expedition 6F boss data to Spec 4.2.2 (boss names and additional abilities/bonus for exp_id 1,2,3,4,5,7,8 and Cervin boss naming). |
| 0.6.0 | 433 | 2026/4/16 | Align runtime PT6 initial member races to Spec 2.1.4.2 (バーシヴァル: Lupinian, ディル: Murid). |
| 0.6.0 | 432 | 2026/4/16 | Update runtime boss generation to apply the Spec 4.2.2 additional ability for セレスティアルリーパー (`a.soul-reap`3). |
| 0.6.0 | 431 | 2026/4/16 | Update runtime `unascertained` lineage bonuses to match Spec 2.1 (`c.armor_x1.3`, `c.robe_x1.3`). |
| 0.6.0 | 430 | 2026/4/16 | Update runtime lineage master data and default party setup to Spec 2.1.4.2 (add non-selectable lineages and align PT1-PT6 members/lineages/unique flags). |
| 0.6.0 | 429 | 2026/4/16 | Update Character Edit Mode unique flag display: remove `Unique: true/false`; show `固有キャラクター(クラスのみ編集可能)` only for unique members. |
| 0.6.0 | 428 | 2026/4/16 | Enforce Unique character edit-mode immutability UI (disable/grey Name, Race, Lineage, Predisposition; keep Main/Sub Class editable). |
| 0.6.0 | 427 | 2026/4/16 | Align runtime initial setup to Spec 2.1.4.2 (PT data corrections and Unique character immutability rules). |
| 0.6.0 | 426 | 2026/4/16 | Update runtime condition outcome adjustments. |


- Older version changelog

|Version  | Changes                                                                               |
|---------|--------------------------------------------------------------------------------------|
| 0.5.3 | Two tabs mode. Dark mode, Laika mode |
| 0.5.2 | Flavor text update. Fixed auto equipment logic, update side quest barance, especially embezzlement part logic. Refine AFK part. |
| 0.5.1 | Ajusts auto equipment logic |
| 0.5.0 | unlock for deities, religions . auto equipment update |
| 0.4.1 | Cycle update |
| 0.4.0 | Jewel update, side quest update (level cap to 49) |
| 0.3.3 | Gods religion update |
| 0.3.2 | God battle, unlock ability update |
| 0.3.1 | Level and experience system update |
| 0.3.0 | Super rare update (level cap to 39 from 29) |
| 0.2.9 | Race ability update |
| 0.2.7 | Enemy scale rebarance update |
| 0.2.6 | First Strike description text update |
| 0.2.5 | Alpha test update, barance fix  |
| 0.2.4 | Party State Machine update, AFK mode.  |
| 0.2.3 | Accuracy update. Magic is now respect `f.hit_detection`. |
| 0.2.2| Game balance modified, Enemy status mutipliers update, 2.3.3 Base data structure (enemy) update |
| 0.2.1 | Update:8.7 Divine Bureau, 1. Clairvoyance (add total counts at Normal reward ), Adding 2. Item Comedium and 3. Bestiary |
| 0.2.0 | Big update: 2.1 Global constants (change randamness upgrade), 2.3 Expedition & Enemies, 2.4 Items, 3. INITIALIZATION, 5.1 "Loot-Gate" progression system, 6.5 Outcome  7. REWARD (change the logic), 8.4 Expedition, 8.7 Divine Bureau (setting)  |
| 0.1.4 |                                                                |
