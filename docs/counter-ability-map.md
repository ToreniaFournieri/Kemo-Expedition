# Counter Ability Map (review draft)

Status: draft for human review. Documentation only; no runtime change.

Sources: `Specification_1.1_CONSTANTS_GLOSSARY.md` (1.1.1, 1.1.7, 1.1.10), `Specification_4.1_EXPEDITION_&_ENEMY.md` (enemy table, floor table), `Specification_6.1_BATTLE.md`. Only `wind-rider` was cross-checked against `native/battle_protocol.cpp`; everything else is spec-level and unverified in code.

Legend:
- **[E] Explicit**: the spec names the ability as the counter.
- **[I] Implicit**: not stated anywhere; works because of the battle rules.
- **[?]** Needs confirmation (see section 6).

---

## 1. Explicit counters to enemy and opposing abilities [E]

| Counter | Neutralizes |
|---|---|
| `a.null-counter` (N uses) | `a.counter`, `a.re-counter` (checked on the whole party) |
| `a.illusion-breaker` | `a.illusion` (disables it without a miss) |
| `a.bulwark-breaker` | `a.bulwark` |
| `a.defender-breaker` | `a.defender` |
| `a.m-barrier-breaker` | `a.m-barrier`, `a.magical-reflect`, `a.magical-absorb` |
| `a.fire-protect-breaker` | fire reflect and absorb |
| `a.ice-protect-breaker` | ice reflect and absorb |
| `a.thunder-protect-breaker` | thunder reflect and absorb |
| `a.pursuit` | `a.stealth`, `a.flee` |
| `a.rage-breaker` | `a.rage` |
| `a.momentum-breaker` | `a.momentum` |
| `a.execution-null` | `a.execution` |
| `a.anti-ambush` | `a.ambush` |
| `a.anti-overwatch` | `a.overwatch` |
| `a.unforgettable` | `a.oblivion`, `a.fading_memory`, `terrain.deletion` |
| `a.null-shock` | `a.shock` |
| `a.null-corrode` | `a.corrode` |
| `a.null-life-drain` | `a.life-drain` |
| `a.null-death-touch` | `a.death-touch` |
| `a.null-burn` | `a.burn` |
| `a.null-bind` | `a.bind` |
| `a.null-antagonism` | `c.antagonism` (Goddess of Discord) |
| `a.coldproof` | `a.frostbite` |
| `a.requiem` (offense) | `a.reanimate` (kills after it was used) |
| `a.hunter` | row-based accuracy decay |

## 2. Implicit counters to enemy abilities [I]

### 2.1 By attack type (use the type the ability does not cover)

| Enemy ability | Counter | Reason |
|---|---|---|
| `a.stealth` | Ranged or magical | Only normal melee is avoided, and only below N% HP |
| `a.illusion` | Melee or magical | Only the first ranged attack is nullified |
| `a.bulwark` Lv1 | Melee or magical | Redirects ranged only |
| `a.bulwark` Lv2 | Magical | Redirects ranged and melee. Magic targets by row bag |
| `a.shock` | Ranged or magical | Interrupts normal melee only |
| `a.magical-counter` | Melee or ranged | Reacts to magical attacks only |
| `a.counter` | Magical | Reacts to ranged and melee only [?] |
| `a.re-counter` | Magical, or kill before the counter | Only answers a counter, of the same attack type |
| `a.ranged-null`, `a.melee-null`, `a.magical-null` | The other two types | Direct complement |
| `a.fire-null`, `a.ice-null`, `a.thunder-null` (and absorb) | Another element, or physical | Element-specific. Origami has `thunder-null` |
| `a.ranged-reflect`, `a.melee-reflect`, `a.magical-reflect` | Other types | Type-specific reflect |
| `a.deflection` | Melee or magical | Lowers ranged accuracy only |
| `a.ranged-confusion` | Melee or magical | Flips unresolved ranged actions only |
| `a.melee-confusion` | Ranged or magical | Flips unresolved melee actions only |
| `a.magic-confusion` | Melee or ranged | Flips unresolved magic actions only |
| `a.magic-seal` | Melee or ranged first | Blocks only the first magic of the battle |

### 2.2 By melee avoidance (on-strike abilities need melee hits)

| Enemy ability | Counter | Reason |
|---|---|---|
| `a.burn` | Ranged or magical | Triggers on melee hits received |
| `a.corrode` | Ranged or magical | Needs 3 or more melee hits |
| `a.bind`, `a.death-touch`, `a.life-drain` | Ranged or magical | Normal melee on-strike |
| `a.swarm` | Burst damage early | Gets weaker as it loses HP |
| `a.rage` | Burst before scaling | Scales with damage taken |
| `a.momentum` | Burst before scaling | Its bonus decays with damage taken |
| `a.covering-fire` | Kill or disable the front ally | Triggers on an ally's single melee hit |

### 2.3 By timing and tempo

| Enemy ability | Counter | Reason |
|---|---|---|
| `a.howl` | `a.first-strike` or `a.boost` | Fires only if the opponent has not acted yet |
| `a.ambush`, `a.overwatch` | Act first | Both need the opponent unacted. `first-strike`, `boost` |
| `a.soul-reap` (COMBAT2, HP below N%) | Keep HP above the threshold at COMBAT2, or kill first with high initiative (`a.first-strike`, `a.boost`) | Instant kill that cannot be dodged or revived. `a.regeneration` (COMBAT3) comes too late |
| `a.execution` | Healing or high HP | HP-threshold check |
| `a.predator-sense` (HP below N%) | Healing or high HP | Same threshold type |
| `a.decompose` (COMBAT2) | Magic build, or burst before COMBAT2 | Lowers physical defense only |
| `a.flee` (COMBAT1-5) | `a.pursuit` [E], or kill earlier | Draw outcome |
| `a.unstable-core`, `a.self-destruct` | Wait out or outlast | Self-damage; do not over-commit |
| `a.slow`, `a.frostbite` | `a.boost`, `a.first-strike` | Turn order modifiers |

### 2.4 By ability scarcity

| Enemy ability | Counter | Reason |
|---|---|---|
| `a.oblivion`, `a.fading_memory`, `terrain.deletion` | Carry spare low-value abilities as decoys | The disabled ability is random |
| `a.mimic` | Carry few or weak abilities | It copies a random ability of yours |
| `a.upgrade-all-abilities` | Prefer abilities that are already at their useful level | It raises all enemy abilities |

### 2.5 By protection

| Enemy ability | Counter | Reason |
|---|---|---|
| `a.defender` (Lv1-3) | Hit the front row; or `a.defender-breaker` [E] | Protects rows behind it |
| `a.m-barrier` | Hit the front row; or `a.m-barrier-breaker` [E] | Same, for magic |
| `a.command` | Kill or burst the commander | It boosts back-row allies |
| `a.resurrect` | Spread damage evenly | Survives one fatal hit |
| `a.reanimate` | `a.requiem` [E], or kill with soul-reap-type effects | Revives once |
| `a.mutual-physical-restraint`, `mutual-magic-restraint` | Play the other damage type | Symmetric nerf |

---

## 3. Terrain: explicit counters [E]

| Terrain | Counter | Effect |
|---|---|---|
| `terrain.rough-waves` (melee x0.75) | `a.output-stabilizer` | NoA x1.0 |
| `terrain.heavy-wind` (ranged x0.75) | `a.output-stabilizer` | `a.wind-rider` makes it worse (x0.50) |
| `terrain.burrow` (ranged x0.50) | `a.output-stabilizer` | |
| `terrain.low-gravity` (all x1.3) | `a.output-stabilizer` | Removes the buff too |
| `terrain.gravity` (all x0.7) | `a.output-stabilizer` | |
| `terrain.limestone-cave` (magic and melee x1.5) | `a.output-stabilizer` | Removes the buff too |
| `terrain.tailwind` | `a.wind-rider` | 2d3 instead of 1d3 (6.1 fixed) |
| `terrain.fog` | `a.true-sight` | Ranged accuracy -25 ignored |
| `terrain.ash-haze` | `a.true-sight` | First-strike is no longer cancelled |
| `terrain.machine-logic` | `a.equation-breaker` | Initiative modifiers work again |
| `terrain.silence-field` | `a.equation-breaker` | Actor abilities still run |
| `terrain.suppression` | `a.defiance` | No -1 level |
| `terrain.deletion` | `a.unforgettable` | |
| `terrain.dry` | `a.dryproof` | Ice damage not halved |
| `terrain.vine-snare` | `a.vine-cutter` | No self-damage |
| `terrain.crystal-zone`, `terrain.mana-burn` | `a.mana-ward` | No self-damage |
| `terrain.fortified` | `a.siege` | Enemy damage reduction ignored |
| `terrain.floor-domain`, `terrain.cap-domain`, `terrain.echo-domain`, `terrain.silence-field`, `terrain.duelist-domain`, `terrain.sniper-domain`, `terrain.spell-domain` | `a.domain-breaker` | Per glossary [?] |
| `terrain.gehenna` | none | Disables deity benefits |

## 4. Terrain: implicit counters [I]

| Terrain | Hurts | Implicit counter |
|---|---|---|
| `terrain.rotwood` | Healing: `Goddess of Restoration`, `a.first-aid`, `a.regeneration`, `a.life-drain` (spec updated; runtime not yet) | Do not rely on those healing sources there |
| `terrain.decay` (-2% max HP per room) | Everyone | `a.first-aid`, `a.regeneration`, short routes |
| `terrain.heatwave` (-5% current HP per room) | Everyone | Healing; high current HP matters more than max HP |
| `terrain.leakage` (thunder 3% to a random member) | One member | `r.thunder` resistance; avoid `God of Fortification` (thunder weak) |
| `terrain.exposure`, `terrain.dark-field` | Physical damage both ways | `a.defender`, `a.m-barrier`, magic builds; `mutual-physical-restraint` offsets |
| `terrain.light-field` | Magic both ways | Physical builds |
| `terrain.sanctuary` | Magic x0.67 | Physical builds |
| `terrain.frenzy` | Everyone x1.25 | High-defense, fast kills |
| `terrain.predation` | HP below 50%, physical x1.3 | Healing; `a.resurrect` |
| `terrain.sacred-judgement` | The first actor | `a.slow` or `a.frostbite` so someone else acts first |
| `terrain.conduction` | Thunder attackers | Use fire, ice, or none |
| `terrain.thunderstorm` | Thunder both ways | `thunder-null`, `thunder-absorb`, `r.thunder` |
| `terrain.chain-lightning` | Thunder attackers also hit a second target | Non-thunder; or bring your own thunder |
| `terrain.dry` (ice x0.5) | Ice attackers | Fire or thunder. Also halves Frost enemy ice damage |
| `terrain.sunny-beach` | Ranged +20 both ways | Melee/magic users face the same enemy ranged |
| `terrain.fog` | Ranged accuracy | Melee or magic (`true-sight` is [E]) |
| `terrain.limestone-cave` | Ranged weak | Magic or melee |
| `terrain.rough-waves` | Melee weak | Ranged or magic |
| `terrain.heavy-wind`, `terrain.burrow` | Ranged weak | Melee or magic |
| `terrain.gravity` | `m.gravity-well` (NoA >= 20), `armor-break` (>= 12), `mana-break` (>= 10) | Thresholds are checked after terrain NoA. Gravity makes them harder; low gravity makes them easier |
| `terrain.floor-domain` (min 1% max HP per hit) | Strong defenders | Many small hits |
| `terrain.cap-domain` (max 5% max HP per hit) | Burst builds | Many small hits; avoid `arc-magic`, `heavy-strike`, `iaigiri` |
| `terrain.spell-domain`, `terrain.sniper-domain`, `terrain.duelist-domain` | Accuracy and evasion stats | Stat investment in evasion is wasted; `illusion` precedence [?] |
| `terrain.vine-snare` | Attack actions | Fewer, larger attacks (`arc-magic`, `iaigiri`) if it triggers per action [?] |
| `terrain.crystal-zone`, `terrain.mana-burn` | Magic users | Fewer, larger magic attacks (`arc-magic`); melee builds |
| `terrain.silence-field` | Timed, reactive and `[効]` abilities | Passive and stat-based builds |
| `terrain.transcendence` | Level +1, capped at 5 | Lv5 abilities gain nothing; Lv1-4 gain |
| `terrain.suppression` | Level -1, floor 1 | Lv1 abilities lose nothing |
| `terrain.tailwind`, `terrain.enemy-high-ground` | Initiative | `a.boost`, `a.first-strike` |
| `terrain.chill`, `terrain.looping-path` | Step time x2 | No counter [?] |

---

## 5. Gods

| God | Weakness | Counter |
|---|---|---|
| `Goddess of Restoration` | Ice x1.5, healing nullified by `terrain.rotwood` | Ice resistance |
| `God of Fortification` | Thunder x1.5 | `r.thunder`; avoid on thunder terrain |
| `Goddess of Fertility` | Fire x1.5 | `r.fire`; avoid against fire enemies (Dragon, Shadowfang) |
| All | `terrain.gehenna` disables benefits | Do not depend on the deity there |

---

## 6. Review findings (open questions)

1. **`a.wind-rider` in 6.1.** Resolved: 6.1 now gives `+1d3` on tailwind, `+2d3` with `a.wind-rider`, matching the glossary and the native code.
2. **`a.wind-rider` is a trade-off ability.** It improves tailwind but makes `heavy-wind` ranged x0.50. It is not a pure counter.
3. **`terrain.rotwood`.** Resolved in spec and runtime (build 43): `Goddess of Restoration`, `a.first-aid`, `a.regeneration` and `a.life-drain` are disabled.
4. **`a.counter` vs magic.** `f.counter` is limited to `ranged` / `melee` attack types, but the Counter block (6.1 line 437) has no explicit type gate. Confirm that magic does not trigger `a.counter`.
5. **Spec exception typos.** Resolved: bind now checks the opponent's `a.null-bind`, requiem checks the opponent's `a.null-requiem`, and `a.null-requiem` was added to the glossary (it already exists in code). Open: corrode, life-drain and death-touch exceptions still say "actor has" although the immune side is the opponent.
6. **`a.domain-breaker`.** Partly present already: 6.1 handled floor, cap, echo and the hit override. Resolved: `terrain.silence-field` now also exempts `a.domain-breaker` holders. `terrain.spell-domain` is missing from the native START "prevented" log list (hit override itself is handled).
7. **`a.illusion` vs `sniper-domain`.** Resolved in spec and runtime (build 43): `terrain.sniper-domain` wins, illusion is not consumed.
8. **`terrain.silence-field` text.** The glossary says no `[効]` ability triggers; 6.1 says it skips the "actor abilities" section only, except for `a.equation-breaker` holders. Check whether START-phase timed abilities (defender, absorb, etc.) are skipped.
9. **`a.stealth` Murid.** Spec treats it as party-only in one note and enemy-capable in the log. The `a.pursuit` counter applies in both cases.
10. **Gaps.** No explicit counters exist for `decay`, `heatwave`, `leakage`, `exposure`, `dark-field`, `frenzy`, `predation`, `sacred-judgement`, `conduction`, `thunderstorm`, `chain-lightning`, `chill`, `looping-path`, `transcendence`, `gehenna`. Decide which should stay as pure build choices.

## 7. Suggested next steps

1. Review sections 2 to 4, and mark entries to keep, drop or promote to explicit.
2. Resolve findings 1, 3, 4 and 6 in the human-owned specs.
3. Decide whether the data goes to Help text, a GA lookup, or neither.
