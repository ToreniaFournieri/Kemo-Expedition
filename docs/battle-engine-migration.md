# Battle Engine Migration Contract

This document tracks the deterministic TypeScript-to-C++/WebAssembly battle-engine migration required by Specification 6.1.8.

## Reference freeze

Until seeded C++ RNG ownership begins, the migration contract is version 1 and uses a TypeScript-supplied ordered random tape.

- `src/game/battleTypeScriptReference.ts` is the frozen reference coordinator.
- `tests/fixtures/battleGolden.v1.json` is the frozen complete-result digest baseline.
- `tests/fixtures/battleReferenceContract.v1.json` pins the SHA-256 digest of both artifacts, the ordered golden case inventory, required outcomes, and canonical result fields.
- Every candidate engine must replay the exact tape recorded from the reference. Missing, additional, or reordered consumption must fail before the candidate can be accepted.
- The canonical comparison covers the complete returned result, including ordered localized logs, updated physical and magical threat bags, HP, outcome, and enemy hit count.
- Changes to the reference or golden fixture are prohibited during deterministic migration. A required battle-rule correction must be applied intentionally to both reference and candidate, reviewed as a contract revision, and reconciled with Specification 6.1.8 before either pinned digest is updated.

## Ownership matrix

| Battle responsibility | Current authority | Deterministic migration target | Freeze gate |
|-|-|-|-|
| Game-object projection and computed character/party inputs | TypeScript | TypeScript | Stable protocol input and full parity |
| Localized battle-log narration and number formatting | TypeScript | TypeScript from semantic C++ events | Canonical ordered log parity |
| START phase coordination and temporary ability mutation | TypeScript reference/candidate coordinator with C++ rule adapters | C++ full-battle coordinator | Reference shadow state and complete-result parity |
| Initiative and action scheduling | C++ setup protocol called by TypeScript coordinator | C++ full-battle coordinator | Exact tape count/order and action order |
| Targeting, threat bags, hit resolution, damage, and special magic | C++ rule adapters called by TypeScript coordinator | C++ full-battle coordinator | HP, hit, bag, and log parity |
| Timed, terrain, deity, defensive, and reactive effects | C++ rule adapters called by TypeScript coordinator | C++ full-battle coordinator | State delta, event order, and outcome parity |
| Outcome and returned battle state assembly | TypeScript | C++ numerical result plus TypeScript narration | Complete canonical result parity |
| Random-value generation | TypeScript ordered tape | C++ battle-local versioned PRNG in Part 2 | Frozen draw count/order until Part 2 |
| Wasm transport | Multiple primitive calls plus protocol arenas | One binary protocol execution call per battle | Boundary-call benchmark and ABI validation |

## Part 1 acceptance gate

Part 1 may advance only while all of the following remain true:

1. The reference-contract artifact hashes match.
2. The golden case inventory and required victory, draw, and defeat coverage match.
3. Candidate replay consumes the complete recorded tape without an extra draw.
4. Candidate and reference canonical complete results are identical.
5. `tests/fixtures/battleGolden.v1.json` remains unchanged.

## Part 1.2 protocol-v3 shadow path

- Protocol v3 widens the input header and combatant records to carry complete static numerical profiles while excluding names, translations, equipment objects, and UI data.
- The checked-in module ABI is 8 and exports `battle_protocol_execute(inputByteLength)`, reusable 512-KiB input/output arenas, and no imports or callbacks.
- The module-local `BattleStateCore` has fixed capacities of eight combatants, 4,096 supplied random values, and 4,096 semantic events. Protocol and capacity failures are explicit and events are never truncated.
- `executeBattleCandidate` is the shadow-only TypeScript adapter. It projects the static profiles, supplies the complete frozen tape, makes one measured full-execution boundary call, and retains TypeScript ownership of localized result narration.
- Production `executeBattle`, AFK workers, and Experimental AI API sorties are intentionally not cut over in Part 1.2.

## Part 1.3 START checkpoint

- Protocol v3 and ABI 8 are unchanged. The generated `BATTLE_ENGINE_FLAG_START_CHECKPOINT` / `kEngineFlagStartCheckpoint` bit in `engineFlags` selects the test-only checkpoint.
- The checkpoint initializes every fixed native state field from the projected profile, resolves terrain disclosure and Domain Breaker facts, Deletion, Transcendence/Suppression, Silence Field exceptions, Discord, the Oblivion deity grant, canonical initiative preparation, and timed START triggers at 9, 8, 7, and 3. It then returns `outcome=unresolved` without entering placeholder COMBAT or END resolution.
- The canonical draw order is immediate terrain/deity START mutations and their flavor draws, initiative dice for every eligible normal action, then timed START triggers from timing 9 down to 0. The checkpoint never drains unused tape. `randomConsumed` and `diagnosticDrawCount` are the actual cursor; an unavailable required draw returns `tapeExhausted` with no partial event output.
- `projectBattleProtocolInput` and `projectBattleCombatants` are non-mutating projection helpers. Enemy-first wire order matches the frozen setup coordinator, and God of Resonance upgrades are normalized back to the character-derived Resonance level under Gehenna before encoding.
- `executeBattleCandidateProtocol` exposes raw protocol output for internal migration tests. `executeBattleStartCheckpoint` applies the named checkpoint flag and remains test/shadow-only.

### START semantic event fields

- `actorId`, `targetId`, `abilityId`, and `timing` identify the language-neutral fact. `value0` and `value1` contain previous/next ability levels for `ability_mutated`; `random_flavor.aux0` contains the zero-based flavor index.
- `aux0` contains generated action ID `13` (`terrain_damage`) for terrain-owned START facts, `14` (`deity_effect`) for deity facts, or `15` (`timed_ability`) for timed/party START facts.
- Event flag bits are append-only fact qualifiers: `1` prevented, `2` granted, `4` removed, `8` terrain-owned, `16` deity-owned, `32` mutual effect, and `64` broken/overridden.
- Names, localized strings, translations, equipment, and save objects remain outside the payload and continue to be owned by TypeScript narration.

### Remaining limitations

- The no-flag `battle_protocol_execute` path still performs simplified placeholder COMBAT/END work and drains the supplied tape so the temporary wrapper can retain its historical complete-tape contract. It is not an independently parity-complete C++ coordinator.
- `executeBattleCandidate` still obtains the complete tape and final localized result from `battleTypeScriptReference.ts`; its equality coverage verifies that wrapper contract only.
- Production `executeBattle`, AFK workers, and Experimental API sorties remain uncut. Seeded C++ RNG ownership has not started.

## Part 1.4 neutral base-COMBAT checkpoint

- Protocol v3 and ABI 8 remain unchanged. The generated `BATTLE_ENGINE_FLAG_COMBAT_BASE_CHECKPOINT` / `kEngineFlagCombatBaseCheckpoint` bit selects complete START resolution followed by the neutral base COMBAT traversal. It is mutually exclusive with `START_CHECKPOINT`; `executeBattleCombatBaseCheckpoint` exposes the path for shadow and test callers.
- The temporary supported domain is exactly one enemy and one through seven party combatants, no abilities, terrain/deity/input/combatant flags all zero, standard enemy `magicStyle=0`, finite protocol-v3 numerical profiles, and nonempty physical and magical threat bags containing unique, positive-ticket rows that identify party combatants. Unsupported inputs return append-only `unsupportedCombatFeature` before any draw, event, or bag output.
- START prepares and canonically sorts the normal actions once. COMBAT reuses those entries without rerolling, emits COMBAT start, walks absolute timing 49 through 0, and retains the existing timing/attack-type/enemy/front-row/back-row tie order. Resolution stops before later scheduled actions when aggregate party or enemy HP reaches zero; COMBAT end is emitted after a successful supported traversal, and END is never entered.
- Every enemy attempt consumes its physical or magical threat-bag target draw first and its hit draw second. The selected ticket is decremented, and grouped attack/damage facts are emitted by target in first-target encounter order. Party actions target the sole enemy without a target draw and consume one hit draw per attempt.
- Language-neutral `target_selected`, `attack`, and `damage` facts identify actor, target, attack type, absolute timing, attempts, hits, and applied damage. Results return updated aggregate HP, successful applied enemy-hit count, canonically ordered updated bags, the semantic event list, and the actual undrained tape cursor. Nonlethal completion is `unresolved`; lethal completion is `victory` or `defeat`.
- Tape exhaustion and native action/event/output capacity errors expose no partial events or threat bags. The module-local HP, action, bag, event, and cursor state is reset on every execution. Numerical attack, defense, penetration, elemental resistance, offense/defense amplification, hit decay, and minimum-one-damage calculations remain authoritative in C++ and retain double precision above signed 32-bit range.

### Part 1.4 remaining limitations

- The checkpoint intentionally excludes timed abilities, defensive and reactive chains, special magic, terrain and deity effects beyond the already completed START machinery, and END processing. It does not claim frozen golden parity.
- Localized narration still comes from TypeScript, and the no-flag wrapper retains its temporary placeholder COMBAT/END and complete-tape-drain contract.
- Production `executeBattle`, AFK workers, Experimental AI API sorties, and random generation remain uncut; seeded C++ RNG ownership has not started.

## Part 1.5 advanced non-reactive normal-COMBAT checkpoint

- Protocol v3 and ABI 8 remain unchanged. `BATTLE_ENGINE_FLAG_COMBAT_NORMAL_CHECKPOINT` / `kEngineFlagCombatNormalCheckpoint` (`1 << 2`) selects the shadow/test-only checkpoint, and is mutually exclusive with the START and neutral base-COMBAT flags. `executeBattleCombatNormalCheckpoint` is the named TypeScript entry point.
- The checkpoint completes the existing START implementation once, reuses its prepared and canonically sorted initiative entries, traverses absolute COMBAT timing 49 through 0, and stops before END. Production `executeBattle`, AFK workers, and Experimental API sorties are not cut over.
- Structural preflight requires exactly one enemy, one through seven uniquely rowed party combatants, finite nonnegative attacks/NoAs, and valid nonempty physical and magical threat bags. Deferred or unclassified abilities are rejected with `unsupportedCombatFeature` before the random cursor moves. Because the test is applied to every raw input ability before START, Mimic can never draw a deferred copied ability.

### Ability ownership matrix

`src/game/battleAbilityOwnership.ts` is the explicit TypeScript matrix and the C++ preflight switch mirrors it. Tests require every append-only registry ID to occur exactly once.

| Ownership | Ability IDs |
|-|-|
| START/setup | First Strike, Oblivion, Fading Memory, Mimic, Frostbite, Slow, Boost, Equation Breaker, Domain Breaker, Wind Rider, Coldproof, Defiance, Unforgettable |
| Supported normal action / immediate consequence | Defender, Iaigiri, Heavy Strike, Command, Resonance, M-Barrier, Deflection, True Sight, Output Stabilizer, Rage, Momentum, Bulwark, Arcane Stability, Arc Magic, Gravity Well, Armor Break, Mana Break, Focus, Stealth, Illusion, all elemental/type Absorb/Null/Reflect abilities, all four Mutual effects, Magic Seal, No Offense, Swarm, Ambush, Overwatch, Execution and their blockers, Null Antagonism, Siege, Dryproof, Vine Cutter, Mana Ward, elemental protection breakers, M-Barrier Breaker, Illusion Breaker, and Bulwark Breaker |
| Deferred timed trigger | Howl, all three Confusion forms, Unstable Core, Soul Reap, Regeneration, Predator Sense, Decompose, Self Destruct, Free, First Aid, Flying, Pursuit |
| Deferred reactive chain/post-hit | Counter, Re-attack, Null Counter, Re-counter, Covering Fire, Magical Counter, Requiem/Null Requiem, Shock/Null Shock, Corrode/Null Corrode, Life Drain/Null Life Drain, Death Touch/Null Death Touch, Burn/Null Burn, Bind/Null Bind |
| Deferred defeat recovery | Resurrect, Reanimate |
| Inert/non-battle metadata | Squander, Hunter, Tithe, Seeker, Cunning, Cyborgization, Peddler, Composure, Melee Conversion, Prophecy, Base Status Cap at 15, Auriferous, Colossal, Upgrade All Abilities, Unlock |

### Supported normal-action ownership

- The C++ scheduler applies No Offense, terrain-adjusted NoA, Output Stabilizer, current/original NoA Heavy Strike penetration, canonical ties, first-actor and acted-state tracking, and terminal scheduling.
- Targeting consumes each enemy or Antagonism threat-bag draw before its hit decision, applies Bulwark/Bulwark Breaker, preserves friendly-fire fallback draws only for a row with no eligible ally, and returns canonically sorted mutated bags.
- Hit resolution owns accuracy potency and bonuses, evasion, nth-hit decay, Focus, Deflection, Arcane Stability, True Sight, and sniper/spell/duelist guaranteed-hit domains. Guaranteed hits consume no hit roll and inclusive success remains `roll <= chance`.
- Damage remains double-precision C++ arithmetic and includes defense family and penetration, phase/deity/profile amplifiers, elemental resistance/offense, minimum-one damage, Iaigiri, Heavy Strike, Resonance, Rage, Momentum, Swarm, Mutual effects, Defender/Command/M-Barrier row effects and breakers, terrain/domain effects, Echo Domain usage, Ambush, Overwatch, and Execution with blockers.
- Gravity Well, Armor Break, and Mana Break use their canonical priority and terrain-adjusted NoA gates. Magic Seal is a START-created global owner-order queue consumed only by qualifying magical actions. Stealth, personal/party Illusion, and Illusion Breaker apply their action-negation and one-shot state rules.
- Absorption, nullification, and reflection use canonical priority and breaker handling. C++ emits source, calculated/applied, absorbed/healed, and reflected source/applied values, updates the appropriate aggregate HP, and terminates later scheduling after lethal reflection.
- Vine Snare, Crystal Zone, Conduction, Mana Burn, Sacred Judgement, and Chain Lightning run immediately after their originating action. Each visible flavor selection consumes exactly one draw and emits a zero-based `random_flavor.aux0`.

### Random and semantic contract

The ordered tape is consumed as START terrain/deity mutations and flavors, START initiative dice, START timing 9/8/7/3 effects, then COMBAT actions in scheduler order. For an enemy attempt or Antagonism decision, the target-bag draw precedes any conditional fallback and hit draw. Guaranteed hits, skipped actions, special magic, Magic Seal negation, and other deterministic consequences do not invent draws. Immediate terrain target selection precedes its flavor selection. Terminal success leaves the unused suffix undrained. `randomConsumed` and `diagnosticDrawCount` always equal the real cursor; exhaustion/capacity errors retain the cursor but return no partial events or bag payload.

Semantic events are language-neutral. `target_selected` identifies every actual target decision. `attack.value0/value1/value2` are applied damage, calculated source damage, and absorbed source value; attempts and hits remain explicit. `absorbed` uses `value0/value1/value2` for absorbed amount, source amount, and applied healing. `reflected` uses them for applied reflected damage, reflection source, and damage remaining on the original target. `nullified`, `damage`, and `heal` carry the responsible ability and numeric delta. Existing fact flags remain append-only (`1` prevented/negated, `8` terrain, `32` mutual/antagonism fact, `64` broken/overridden), and `aux0=1` continues to identify a normal action unless a terrain event carries its terrain ID. COMBAT phase end is emitted only after a successful traversal.

### Part 1.5 remaining limitations

- Timed COMBAT triggers, reactive and post-hit chains, defeat recovery, and END are deliberately rejected or not entered. Immediate supported lethality returns victory/defeat; otherwise the result is unresolved. This checkpoint does not claim independent full-engine or frozen-golden parity.
- TypeScript still owns the ordered random tape, names, localization, and final narration. The no-flag wrapper retains its temporary behavior, and production, AFK, API, narration cutover, reactive chains, timed triggers, defeat recovery, END, and seeded C++ RNG ownership remain pending.
