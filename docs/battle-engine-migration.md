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
| Deferred timed trigger | Howl, all three Confusion forms, Unstable Core, Soul Reap, Regeneration, Predator Sense, Decompose, Self Destruct, Free, Flying, Pursuit |
| External post-battle orchestration | First Aid (qualifying Elite-battle expedition processing) |
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

## Part 1.6 reactive/post-hit and defeat-recovery COMBAT checkpoint

- Protocol v3 and ABI 8 remain unchanged. The generated append-only `BATTLE_ENGINE_FLAG_COMBAT_REACTIVE_CHECKPOINT` / `kEngineFlagCombatReactiveCheckpoint` bit (`1 << 3`) selects this shadow/test-only checkpoint and is mutually exclusive with every earlier checkpoint flag. `executeBattleCombatReactiveCheckpoint` is the named TypeScript candidate entry point and performs one native protocol execution without TypeScript-reference fallback.
- The checkpoint executes the completed START slice, reuses its prepared initiative schedule, resolves normal COMBAT plus native reactive/post-hit chains and defeat recovery, and stops before timed-trigger slots and END/finalization. Production `executeBattle`, AFK workers, and Experimental API sorties remain on the frozen TypeScript coordinator.
- Preflight allows only `start_setup`, `normal_action`, `reactive_chain`, `defeat_recovery`, and `inert_metadata` ownership. It rejects `timed_trigger`, unclassified, unknown, and mixed-checkpoint inputs before the random cursor or semantic state moves. Raw-input preflight also makes Mimic safe: any legally copyable timed-trigger ability rejects the complete invocation before START.
- Native reactive ownership now includes character/enemy Re-attack with the canonical 0.5/0.7/1.0 level multipliers; Counter and its 0.5/1.0/2.0 NoA scaling; the single canonical Re-counter tier; per-owner party Null Counter pools selected front-to-back without draws; enemy Null Counter; Magical Counter after the complete enemy magical sequence; and every qualifying Covering Fire owner in row order after an exactly-one-hit melee action or re-attack.
- CLOSE post-hit ownership now covers Shock/Null Shock, Corrode/Null Corrode, Life Drain/Null Life Drain, Death Touch/Null Death Touch, Burn/Null Burn, Bind/Null Bind, and Requiem/Null Requiem. State retains Shock consumption, future offense reduction, incapacitation, recovery consumption, Null Counter uses, Illusion and Magic Seal consumption, Echo usage, damage taken, and the existing START/action scheduler state.
- Resurrect precedes Reanimate and each is independently single-use per owning combatant. Recovery remains attached to the targeted party row despite aggregate party HP; party and enemy recovery state are independent. Healing reduces native damage-taken bookkeeping so later timed-trigger migration can consume the correct state.

### Part 1.6 random, transactional, and semantic guarantees

- TypeScript still creates the ordered random tape. Native resolution preserves target-before-hit ordering, conditionally consumes Death Touch and Bind draws only after eligibility/nullifier checks, inserts reactive attacks at their frozen source positions, never invents fallback random values, and leaves an unused suffix undrained.
- Unsupported inputs are rejected at cursor zero. Tape exhaustion, semantic-event capacity, action/ability capacity, and output-capacity failures expose no partial events or bags; every call starts from reset module-local state. Successful calls report the actual cursor in both `randomConsumed` and `diagnosticDrawCount`.
- The existing append-only semantic schema is sufficient, so no opcode, record, protocol-version, or ABI change was required. `aux0` identifies `re_attack`, `counter`, `magical_counter`, `re_counter`, and `covering_fire`; existing attack, damage, heal, nullified, status, death, resurrected, and reanimated facts carry deterministic reactive results.
- Focused coverage exercises flag generation/exclusion, preflight and Mimic safety, multiplier/action identity, counter termination and Null Counter use, Magical Counter and Covering Fire order, CLOSE effects/nullifiers and conditional draws, Requiem, recovery priority and attribution, reflection/Burn/terrain recovery, cursor suffixes, transactional failures, reset/one-call behavior, numerical/capacity boundaries, and a seven-member multi-owner ordering case. Older checkpoint and frozen-reference/golden tests remain acceptance gates.

### Part 1.6 remaining limitations

- Timed-trigger abilities and their COMBAT timing slots remain excluded. END/finalization, final full-turn parity, narration/candidate comparison, and production cutover also remain incomplete.
- The no-flag wrapper remains temporary. Names, localization, prose narration, and random-value generation remain TypeScript-owned; this checkpoint does not claim full parity or production readiness.
- Maximum semantic-event volume is still bounded by the fixed 4,096-event state arena. The pathological seven-member test documents deterministic front-to-back ordering and explicit capacity failure behavior; exact reactive-chain ordering remains a high-risk acceptance area until full-turn differential parity is enabled.

## Part 1.7 native timed-COMBAT checkpoint

- The append-only `BATTLE_ENGINE_FLAG_COMBAT_TIMED_CHECKPOINT` / `kEngineFlagCombatTimedCheckpoint` bit (`1 << 4`) selects START, prepared initiative, timed COMBAT slots, normal actions, reactive chains, and defeat recovery in one native protocol execution. It is shadow/test-only, mutually exclusive with every earlier checkpoint, and stops before END.
- Timed traversal is phase-aware: every absolute timing resolves `ranged`, then `magical`, then `melee`, including that phase's timed triggers before its normal actions. The effective timing-4 cross-phase order is ranged Unstable Core, magical Confusion when eligible, then melee Predator Sense and Free; within the melee timing-2 step the source order is Free, Decompose, melee Confusion, then Self Destruct, while ranged Soul Reap has already resolved in the earlier ranged timing-2 step. Ranged timing 8 resolves Howl before ranged Confusion; magical timing 5 resolves eligible Confusion before the later melee Free step; melee timing 3 resolves Free, Regeneration, then Flying; melee timing 1 resolves Free then Confusion; and magical timing 0 resolves Unstable Core. A forced result stops only later phase/source positions.
- Physical and magical threat draws now share one canonical native refill path. A zero-total bag is replaced by the frozen six-row defaults (`16/8/4/2/1/1` physical or `2/2/2/2/2/2` magical), exactly one weighted row draw is consumed, the decremented refill is retained in native state and returned in ascending row order, and Bulwark/Bulwark Breaker is applied after the row draw. Decompose does not invent a missing-row fallback; Self Destruct retains the frozen conditional party-member fallback.
- Conditional tape consumption follows the frozen coordinator: enemy Soul Reap selects and emits its random party target; Confusion draws a target before its success roll and draws nothing when no target exists; Decompose row selection precedes Confusion target/success selection at melee timing 2; and consecutive Decompose/Self Destruct draws refill between source positions when the first draw exhausts the bag. Howl selects the last pending party effect and applies it to the next normal action only, never its Re-attack. Regeneration uses the aggregate party damage ledger for every party owner.
- Focused parity coverage proves timing-4 and timing-2 event order, actor/target attribution, exact random cursors, physical and magical empty-bag refill outputs, consecutive exhaustion/refill, Decompose and Self Destruct Bulwark redirection, Bulwark Breaker bypass, and transactional failure on a missing refill or later conditional draw. Existing Howl, Re-attack, Regeneration, terrain ledger, Confusion, Free/Pursuit, Soul Reap, Self Destruct, reactive-chain, frozen-contract, and golden tests remain green.
- First Aid remains `external_post_battle`, accepted as a no-op, emits no battle fact, and consumes no draw. Expedition-level TypeScript orchestration remains responsible for applying First Aid after qualifying Elite battles. END/finalization, narration comparison, native RNG ownership, full differential parity, and production/AFK/API cutover remain out of scope.

## Part 1.8 native END and finalization checkpoint

- Protocol v3 and ABI 8 remain unchanged. The append-only `BATTLE_ENGINE_FLAG_END_CHECKPOINT` / `kEngineFlagEndCheckpoint` bit (`1 << 5`) selects the shadow/test-only checkpoint and is mutually exclusive with every earlier checkpoint. Unknown or mixed bits fail transactionally at cursor zero. `executeBattleEndCheckpoint` projects once and performs exactly one native protocol execution without reference fallback.
- The checkpoint reuses Part 1.7's complete supported domain, START, timed/reactive COMBAT, defeat recovery, threat bags, and exact random-tape cursor. First Aid remains accepted as externally owned and produces no native event or draw.
- Native finalization applies the canonical precedence of defeat when party HP is nonpositive, victory when enemy HP is nonpositive while the party survives, and draw when both sides survive the completed END checkpoint. This also makes defeat authoritative when both aggregate HP values reach zero. Earlier partial checkpoints retain unresolved surviving results, and forced Free remains draw at its frozen source position.
- Terminal COMBAT results and forced Free draws skip END without consuming later tape values or fabricating END phase facts. When both sides survive COMBAT, native execution enters END once, emits END phase start at reserved timing 49, traverses timing 49 through 0 as no-ops without draws or per-slot events, and emits END phase end followed by outcome and battle-finished facts.
- Final output preserves double-precision party/enemy HP, `enemyHitsReceived`, canonical physical and magical threat-bag mutations/refills, exact `randomConsumed` and `diagnosticDrawCount`, and the ordered language-neutral semantic stream. Errors expose no partial events or bags, and module-local combat/finalization state resets between calls.
- Qualifying Elite-room Restoration, Attrition, First Aid, room-end terrain effects, rewards, items, unlocks, XP, trophies, gates, retreat decisions, localized narration, production/AFK/API cutover, and native RNG ownership remain external or deferred.

## Part 1.9A raw tape-driven native-result parity

- `executeBattleRawCandidateFromTape` is the independent shadow/test entry point. It accepts the frozen TypeScript-owned random tape explicitly, selects the Part 1.8 END checkpoint, throws on protocol failure, performs exactly one measured Wasm execution, and never invokes the frozen reference or narration layer.
- All 11 frozen golden battles now match the reference for outcome, party HP, enemy HP, `enemyHitsReceived`, physical and magical threat-bag entries, `randomConsumed`, and `diagnosticDrawCount`. The four prior anchors remain exact, and the seven previously divergent cases are retained in the same all-case differential gate.
- Native END execution consumes every reached battle-log flavor selection at its frozen source position and emits a language-neutral `random_flavor` fact whose documented `aux0` is the zero-based array index. Skipped log branches consume no flavor draw; exhaustion returns a transactional tape error with no partial events or bags. Earlier checkpoint flags retain their established pre-1.9A cursor contracts.
- Parity repairs include static character attack projection and unique base multipliers, enemy Heavy Strike and Arc Magic NoA projection, enemy Heavy Strike defense penetration, global enemy nth-hit decay, Magic Seal draw ordering, Illusion and Stealth prevention timing, counter/re-counter terminal eligibility, recovery flavor/state ordering, and terminal outcome precedence. These are general mechanics with no golden-case or enemy-ID exceptions.
- Protocol v3 and ABI 8 remain unchanged because the existing `random_flavor` event and auxiliary fields represent the new semantic data without a wire-layout change. TypeScript still owns random-tape creation, names, localization, and complete `BattleLogEntry[]` reconstruction.

### Part 1.9A remaining limitations

- Localized narration and complete JSON-level result parity were deferred here and are now completed by Part 1.9B below. The reference-backed candidate path has been removed.
- Production `executeBattle`, AFK workers, Experimental API sorties, native RNG ownership, external room effects, rewards, and First Aid orchestration remain unchanged. Part 1.10, Part 2, and Part 3 remain pending.

## Forward migration roadmap

The target remains one synchronous TypeScript-to-Wasm execution call per battle: TypeScript projects the input and supplies the deterministic random tape, C++ resolves the complete battle, and TypeScript reconstructs localized narration from returned semantic events. Each stage below is an independent acceptance gate. Later-stage work must not be pulled into an earlier checkpoint merely because the protocol has room for it.

### Part 1.9B localized narration and complete-result parity — complete

- `executeBattleCandidateFromTape` is the independent shadow/test entry point. It receives the recorded tape explicitly, projects once, invokes the END checkpoint exactly once, throws on every protocol error, and rejects the result unless both native cursor fields equal the supplied tape length. The candidate module has no runtime reference-coordinator import, does not call `Math.random`, and never accepts a reference result or log.
- `convertBattleSemanticEvents` creates a new canonical result from native output/events plus static naming, localization, and display context. It validates terminal ordering, semantic flavor adjacency/identity, required and duplicate flavor facts, source association, zero-based flavor bounds, presentation masks, and unresolved pending reactive narration. Property omission is deliberate so JSON shape matches the reference exactly.
- C++ remains authoritative for HP, targeting, hits, damage, recovery, bags, action order, and numeric log-presentation facts. Party Magic Seal now negates before hit resolution and therefore consumes no hit draws, while enemy Magic Seal retains its canonical target/hit traversal. No production caller was changed.

#### Frozen event-to-log inventory

| Golden case | Outcome | Cursor | Logs | Principal event-to-log coverage |
|-|-:|-:|-:|-|
| `normal-domain-breaker-counter` | victory | 99 | 9 | START terrain, Domain Breaker, normal attacks, Counter, damage and terminal facts |
| `elite-counter-recounter` | victory | 113 | 6 | Counter/Re-counter association, reactive ordering and exact optional fields |
| `oblivion-and-reanimate` | draw | 165 | 26 | Oblivion/Fading mutation, recovery/Reanimate, flavored effects and END draw |
| `mimic-and-resonance` | victory | 65 | 6 | Mimic mutation, Resonance presentation and indexed native flavor facts |
| `first-strike-defeat` | defeat | 44 | 4 | First Strike initiative, lethal ordering and defeat terminal precedence |
| `saved-party-1-expedition-8-boss` | victory | 232 | 18 | Save-backed Boss actions, grouped targets, Magic Seal and threat bags |
| `saved-party-2-expedition-7-boss` | victory | 190 | 13 | Multi-target magical narration, reactive facts and terminal truncation |
| `saved-party-3-expedition-6-boss` | victory | 100 | 10 | Terrain/effect ordering, recovery-capable semantic stream and bags |
| `saved-party-4-expedition-5-boss` | victory | 31 | 3 | Minimal ordered result and optional-property omission |
| `saved-party-5-expedition-4-boss` | victory | 63 | 9 | Illusion/reactive narration and source-adjacent flavor selection |
| `saved-party-6-expedition-3-boss` | victory | 41 | 5 | Short terminal battle, grouped damage and complete returned state |

The inventory audit identified and closed ambiguous flavor ownership, missing START display snapshots after ability removal, Magic Seal attempt/source ordering, deferred Shock narration, grouped magical target headers, Illusion/Stealth negation association, recovery attribution, and native presentation-number ownership. The full differential gate compares every canonical field and exact property presence/omission, not only log digests.

#### Part 1.9B semantic presentation contract

- `random_flavor.aux0` is the authoritative zero-based template index. Its immediately preceding source fact must match phase, actor, ability, attack type, timing, and action identity; `aux1` repeats the source action ID. No renderer-side selection or draw is permitted.
- `diagnostic` facts with flag `128` carry language-neutral presentation values keyed by actor, target, attack type, timing, and action ID. `aux1` is a nine-bit presence mask compacted into groups of three across `value0/value1/value2`: Rage %, Momentum %, Resonance %, Echo %, Ambush, Overwatch, Execution, actor Swarm %, and opponent Swarm %. This bounds added event volume while leaving the renderer formula-free.
- Existing facts were populated where needed: START effects snapshot the display owner/level before later forgetting, Magic Seal terminal facts retain attempt count, and ordered attack/status/recovery/flavor facts carry unambiguous action identities.
- Protocol v3 and ABI 8 remain correct. No record size, opcode registry, arena, export, import, or binary layout changed; the implementation reused append-only flags and existing value/auxiliary fields.

Acceptance gate: complete JSON parity passes for all 11 frozen cases, both cursor fields are exact, every case makes one measured Wasm execution call, the retained capacity/transactional tests pass, and all three frozen hashes remain unchanged. Part 1.10 is ready; this is not a production cutover.

### Part 1.10 deterministic production cutover and stabilization — complete

- Production `executeBattle` is now a small adapter over `executeBattleCandidateFromWindow`. Online expeditions call it directly from the authoritative reducer; each AFK module worker reaches the same reducer and owns its module-local reservoir/Wasm instance; the Experimental API count-1-to-100 batch uses the same pure serialized reducer routine and commits only its final staged state. No entry point has a separate coordinator or fallback.
- `src/game/gameplayRandom.ts` owns a realm-local transactional reservoir. Its injectable underlying source fills a 4,096-value window without consuming the logical queue. Native executes once, narration and protocol checks complete, and only `randomConsumed` values are removed. The unused suffix supplies subsequent gameplay draws in order. A battle-level protocol, capacity, narration/rendering, or result-transaction failure rolls back that reservation and commits zero values. An outer API/save rejection after one or more fully successful battles discards staged game state but deterministically retains those already committed battle prefixes; it never exposes a partial result or bag. Nested reservations and nested protocol arena use are rejected. Scoped test sources restore their prior source and suffix state so cases and realms cannot leak.
- Gameplay random callers that share expedition ordering—including bags, encounter selection, rewards, side-quest choices, external battle/terrain flavor, and generated gameplay record IDs—use the reservoir abstraction. The startup loading-message choice remains visual-only and separate. Seeded validation injects a scoped source and never replaces global `Math.random`.
- `src/game/battle.ts` no longer contains the numerical TypeScript coordinator. It retains only the compatible public result contract, the native adapter, telemetry, and the non-resolving enemy attack display summary. The frozen `battleTypeScriptReference.ts` remains test-only; production source and built main/worker bundles do not import it or contain legacy coordinator markers.
- Semantic validation rejects missing, duplicate, misordered, mismatched, and unexpected extra `random_flavor` facts. Presentation diagnostics support repeated action identities without conflating occurrences, and special-magic logs preserve canonical localized shape. Exact complete-result differential coverage passes all 11 frozen cases in Japanese, English, Simplified Chinese, and Traditional Chinese (44 combinations), including ordered strings, formatting, and optional-property presence.
- Frozen production-entry coverage proves canonical JSON identity, exact logical draw commitment, preserved next-stream value, one measured Wasm execution, input immutability, and exact threat bags/cursors for every golden case. Existing tape exhaustion, event exhaustion, transactional output, arena reset, terminal ordering, and capacity gates remain green; dedicated reservoir tests cover sequential suffix use, rollback, source isolation, and reentrant rejection.

#### Part 1.10 stabilization evidence

| Path | Workload | Wasm calls | Duration evidence | Protocol volume and maxima |
|-|-:|-:|-|-|
| Online single battle | 40 measured Boss battles | 1 per encounter | median 36.66 ms; p95 38.91 ms in isolated profile, with a contention run of median 90.44 ms / p95 137.94 ms | median input 35,688 bytes; median output 7,424 bytes; max tape 262; max events 131 |
| AFK worker routine | 6 party Chunks / 1,724 battles | 1,724 | 29.43 s total CPU; 9.89 s projected parallel maximum in isolated profile | 61,492,632 input bytes; 4,464,320 output bytes; max tape 276; max events 131 |
| Experimental API | count 1 / 24 battles | 24 | 327.60 ms | 856,440 input bytes; 55,232 output bytes; max tape 131; max events 83 |
| Experimental API | count 100 / 2,400 battles | 2,400 | 53.24 s | 85,644,568 input bytes; 5,660,544 output bytes; max tape 166; max events 132 |

The AFK and API measurements verify exact sequential state propagation, unchanged Instant Expedition charge state for API batches, no mutation interleaving inside the pure batch transaction, and no protocol, capacity, or serialization failures. Maximum observed tape/event use remains below 7% of each 4,096 limit. Browser, Electron, and module-worker builds use the same protocol v3, ABI 8, embedded module, projection, and renderer; no binary layout change was required.

Build 33 stabilizes the module-worker cutover for save-backed workloads containing timed Confusion, Unstable Core, or Chain Lightning. The timed native `ability_activated` facts legitimately carry adjacent indexed flavor facts (as does Null Antagonism when it blocks successful Confusion), while Chain Lightning attaches its flavor to the terrain-owned `target_selected` fact and its following damage fact. The semantic validator now recognizes those precise source families and the renderer reconstructs their deterministic localized logs. The reported browser module-worker Chunk and the complete six-party/1,724-battle AFK profile both complete instead of leaving recovery progress at 0%.

Acceptance gate: complete. Part 2 native seeded RNG ownership is ready. The TypeScript-supplied tape and frozen RNG contract remain authoritative until Part 2; Part 3 direct-memory boundary optimization and checkpoint/micro-kernel cleanup remain pending.

### Part 2 native seeded RNG ownership

- Part 2A shadow parity completed in Build 34. The Part 2B production cutover landed in Build 35, but Build 35 was not accepted: review found that its v2 generator replaced the natural `saved-party-3-expedition-6-boss` seed `0x8e710003` with `0x8e710004`, concealing grouped Resonance narration drift. Build 36 removes that override, corrects the general action-level presentation ownership, and is the accepted Part 2B baseline. `BATTLE_ENGINE_FLAG_SEEDED_RNG` / `kEngineFlagSeededRng` (`1 << 6`) uses the existing protocol-v3 seed, RNG-version, output-seed, and diagnostic fields, so protocol v3 and ABI 8 remain unchanged.
- Seeded mode is authoritative production execution and is accepted only together with the complete `END_CHECKPOINT` coordinator. It requires RNG version 1 and an empty tape. Mixed tape/seeded input, unsupported versions, seeded use without END, other checkpoint combinations, and unknown flags fail transactionally with no events, bags, canonical result, cursor movement, or leaked state. Tape mode remains test-only for the historical v1 lineage and differential verification.
- Each `BattleStateCore` owns and initializes its own splitmix64-seeded xoshiro256** state. The centralized `consume_random` helper selects exactly one source per execution and increments the same logical cursor for tape and seeded draws; seeded `randomConsumed` therefore equals `diagnosticDrawCount`.
- `executeBattle` acquires exactly one seed from one Web Crypto `getRandomValues` call over two `Uint32` words (`values[0]` low, `values[1]` high), projects once, encodes no random tape, performs one Wasm execution, validates echoed unsigned-64-bit seed/version and draw equality, completes semantic narration, and only then updates telemetry and exposes replay metadata. Seed 0 and maximum u64 are valid; negative, oversized, non-bigint, unsupported-version, and Web Crypto failures reject without wrapping, tape fallback, telemetry, or caller mutation.
- Online expeditions, Gods Battles, simulations, AFK module workers, and Experimental API sortie counts 1 through 100 all route through this adapter. Each worker realm owns its module instance and battle-local RNG state. `gameplayRandom` remains authoritative only for non-battle expedition randomness.
- Completed battle-bearing expedition entries retain `{ protocolVersion, abiVersion, rngVersion, seedHex, randomDrawCount }`; `seedHex` is exactly 16 lowercase hexadecimal characters and the draw count is native output. Save/hydration, latest logs, Diary logs, and retained API battle-log serialization preserve this optional field. Legacy entries load without it, and observations never expose future seeds.
- Native grouped enemy-magical execution emits an explicit action-scope presentation diagnostic only after every target group is rolled. It owns the complete action's hits, attempts, Resonance, Echo Domain, and header Rage values; per-target diagnostics continue to own target-dependent Ambush, Overwatch, Execution, Momentum, and Swarm values. An explicit start bit separates repeated occurrences with the same actor/timing/attack/action identity, so re-attacks, repeated targets, counters, and later action occurrences cannot be structurally double-counted by the formula-free TypeScript renderer.
- The guarded `npm run battle:golden:v2` command performs frozen-reference tape, native tape, and native seeded equality before writing. It asserts that every contract seed equals the fixture's declared natural seed and that the six saved-party seeds are exactly `0x8e710001` through `0x8e710006`; there is no override map. Ordinary tests never write fixtures and permanently rerun the 11-case × 4-locale triple gate against `battleGolden.v2.json`. The retained Expedition 6 regression proves exact complete JSON, ordered tape/seeded semantic facts, 107 draws, and grouped Resonance `+12%` in all four locales, while the `0x8e710000` through `0x8e71003f` sweep compares complete frozen/tape/seeded results without rewriting fixtures.
- Frozen v1 identities remain: reference `de13ff1bec298ac9f076229497d9716ea789358856bd7391ceb81fea5b9ba322`, golden `e71f11bf791f52315ea20febabfc31cf881e7a72a4154ee95fa5806aa6df8bf0`, contract `a784c5b763dbbd62b1fef9529d21bcf76c0afe83bebf26556b595f7c5e8b7867`. Build 35's rejected v2 identities were golden `4eef9a97be3549c787f0fae57b0a0c39535b2ebe80dae5e3fde6592b38e25ba3` and contract `0ee1498eb246c80723e0a6496488fd6180a8e501d77f839e1e4002e0f34e5d28`. Build 36 replaces them with corrected v2 golden `a06aa4eef0c53521b1d39a82fba1dc9b0c6aead444d306d4ac44b2a058afbfad` and contract `b3f1159d91bc19061e555b45606f265d4fbe462e9572de2ef8e1c625e025668d`.

#### Part 2B seeded production performance

| Path | Workload | Wasm calls | Duration | Input / output | Max draws / events | Tape length |
|-|-:|-:|-:|-:|-:|-:|
| Online Boss | 40 measured battles | 40 | median 37.24 ms; p95 41.13 ms | median 2,920 / 7,168 bytes | 262 / 131 | 0 |
| AFK workers | 6 parties / 1,724 battles | 1,724 | 28.44 s total CPU; 9.66 s projected parallel | 5,000,456 / 4,461,312 bytes total | 276 / 131 | 0 |
| API count 1 | 24 battles | 24 | 311.25 ms | 70,016 / 52,288 bytes total | 144 / 81 | 0 |
| API count 100 | 2,400 battles | 2,400 | 50.76 s | 7,001,248 / 5,627,712 bytes total | 155 / 131 | 0 |

The seeded online input is 2,920 bytes versus 35,688 bytes for the retained 4,096-value tape diagnostic path. No seeded profile fell back to tape mode.

Acceptance gate: complete in Build 36. All 11 natural-seed cases pass in all four locales; the corrective Expedition 6 case and retained seed sweep have complete parity; the v1 identities are unchanged; production remains seeded, tape-free, and one-call; and online, AFK, simulation, Gods Battle, and API routing remain stable. Part 2 is complete and Part 3 is ready only after this corrective acceptance.

### Part 3 single-crossing optimization and cleanup

#### Part 3A direct-arena boundary — complete in Build 37

- Production seeded candidates call `executeBattleProtocolInput`, which validates and sizes the complete structured input before native execution, writes the canonical protocol-v3 little-endian records directly into the fixed Wasm input arena, executes exactly once, and decodes the output arena while the invocation owns it. The retained `encodeBattleProtocolInput` and byte-input executor use the same validator, layout, offsets, and record writer for tape diagnostics, corruption, malformed-binary, and frozen-reference tests.
- Arena pointers, capacity, and reusable input/output views are cached only beside the module-local Wasm instance. Pointer ranges are checked explicitly, and the cache re-queries metadata and recreates views whenever `WebAssembly.Memory.buffer` identity changes. No result exposes a Wasm-backed view: decoding creates fully owned objects, event arrays, and bag arrays before releasing the shared realm-local guard.
- Byte and structured execution share one reentrancy guard. Nested execution rejects before input writing or telemetry, every failure releases the guard in `finally`, and sequential calls after validation, protocol, capacity, decoding, or memory-growth cases remain deterministic. AFK workers retain their existing per-worker module ownership; online calls remain synchronous and AFK/API orchestration is unchanged.
- Permanent capacity coverage writes an exact 524,288-byte input, rejects a one-byte target shortage and one additional eight-byte record before native execution, decodes all 4,096 supported semantic events, rejects event 4,097 explicitly, and retains the native transactional event-capacity gate. Oversized and failed operations do not contaminate the following battle.
- Direct-versus-encoded differential coverage passes all 11 natural-seed golden battles in Japanese, English, zh-CN, and zh-TW, the Expedition 6 seed `0x8e710003` 107-draw grouped Resonance `+12%` regression, seeds 0 and 1, maximum u64, a high-bit seed, repeated calls, failure recovery, output ownership across later arena reuse, memory growth, and the existing independent-instance/worker coverage. Protocol output, semantic events, bags, cursors, replay metadata, localized results, and optional-property presence remain exact. Protocol v3, ABI 8, and every frozen fixture remain unchanged.

##### Part 3A capacity and performance evidence

| Path | Workload | Wasm calls | Duration | Logical input / output | Full encoded-input allocations / input copies / output copies |
|-|-:|-:|-:|-:|-:|
| Online Boss | 40 measured battles | 40 | median 35.00 ms; p95 38.87 ms | median 2,920 / 7,168 bytes | 0 / 0 / 0 |
| Retained tape diagnostic | 10 measured battles | 10 | descriptive only | median 35,688 / 7,168 bytes | 10 / 10 / 10 |
| AFK workers | 6 parties / 1,724 battles | 1,724 | 25.27 s total CPU; 7.15 s projected parallel | 5,000,456 / 4,468,864 bytes total | 0 / 0 / 0 |
| API count 1 | 24 battles | 24 | 329.01 ms | 70,016 / 52,288 bytes total | 0 / 0 / 0 |
| API count 100 | 2,400 battles | 2,400 | 48.50 s | 7,001,248 / 5,634,176 bytes total | 0 / 0 / 0 |

Logical protocol volume remains measured independently from full-buffer allocation/copy counters. Seeded production input remains an empty tape; observed maxima were 276 random draws and 133 semantic events, below the fixed 4,096 ceilings. Wall-clock values are descriptive and environment-sensitive; the structural zero-copy/allocation assertions are deterministic.

Acceptance gate: Part 3A is complete. Part 3B cleanup is ready but unstarted; obsolete checkpoint-only adapters, the temporary no-flag placeholder, unused micro-kernel APIs, the frozen TypeScript reference, and historical v1/v2 fixtures remain intentionally retained until that separate gate. This does not claim all of Part 3 complete.

#### Part 3B final cleanup and acceptance — complete in Build 38

##### Final retained architecture

- `src/game/battle.ts` acquires one unsigned-64-bit Web Crypto seed and calls `executeBattleCandidateFromSeed`; the candidate projects one protocol-v3 input with `END_CHECKPOINT | SEEDED_RNG`, an empty tape, and executes synchronously through the direct Wasm arena exactly once. TypeScript retains only static projection, strict semantic-event validation, localized rendering, replay metadata, and the compatible result shape.
- Online expeditions, Gods Battles, expedition simulation, AFK module workers, and Experimental API sorties continue to reach that same production adapter through the authoritative expedition reducer. No caller has a numerical fallback or alternate coordinator.
- `executeBattleTapeDiagnostic` is the sole high-level tape path. It uses the canonical binary encoder and authoritative native END coordinator for deterministic replay diagnostics; it is absent from browser and AFK-worker production graphs. Raw-result, checkpoint, tape/window alias, and reference-backed candidate adapters were removed.
- Protocol v3 and ABI 8 remain unchanged. The append-only native START, base-COMBAT, normal-COMBAT, reactive-COMBAT, timed-COMBAT, and END flags remain low-level deterministic test seams exercised directly through protocol tests. ABI-8 primitive numerical and state-test Wasm exports remain only to preserve the accepted ABI and granular native diagnostics; their obsolete JavaScript runtime wrappers are removed and production entrypoints cannot reach them.
- A request with no recognized coordinator flag now returns `unsupportedCombatFeature` before state initialization. It returns no events, bags, cursor movement, or partial state, and the following valid seeded call is deterministic. The simplified no-flag COMBAT/END implementation and tape-draining behavior were deleted.

##### Removed migration scaffolding

- Deleted the frozen duplicate numerical coordinator `battleTypeScriptReference.ts` and its legacy-only transitive modules: `battleEngine.ts`, `battleSetup.ts`, `battleNormalAction.ts`, `battleReactive.ts`, `battleTimed.ts`, and `domainTerrain.ts`, together with their legacy unit/profile harnesses.
- Removed checkpoint convenience exports, the raw tape alias, the result-only tape alias, and the generic public candidate-protocol wrapper from `battleCandidate.ts`.
- Removed unused JavaScript micro-kernel wrappers for per-hit damage, hit chance/sequence, domain overrides, normal-action resolution, ability transformation, and initiative preparation. Native implementations still used internally by the authoritative coordinator or retained for ABI-8 diagnostic compatibility were not removed from Wasm.
- Removed frozen-reference measurement suppression and the unused gameplay random-tape reservoir. Non-battle expedition randomness remains on `gameplayRandom`; battle randomness is exclusively native and seeded.
- Replaced writable `battle:golden:v2` with read-only `battle:golden:verify`. No ordinary test or package command writes or regenerates accepted fixtures.

##### Historical fixture policy and final hashes

The v1/v2 fixtures and contracts are immutable historical evidence and remain byte-identical. Their historical `referenceRunner` path and deleted-source digest are metadata, not a live-path existence requirement. Permanent verification pins all five accepted identities:

| Artifact | SHA-256 |
|-|-|
| Deleted TypeScript reference | `de13ff1bec298ac9f076229497d9716ea789358856bd7391ceb81fea5b9ba322` |
| `battleGolden.v1.json` | `e71f11bf791f52315ea20febabfc31cf881e7a72a4154ee95fa5806aa6df8bf0` |
| `battleReferenceContract.v1.json` | `a784c5b763dbbd62b1fef9529d21bcf76c0afe83bebf26556b595f7c5e8b7867` |
| Corrected `battleGolden.v2.json` | `a06aa4eef0c53521b1d39a82fba1dc9b0c6aead444d306d4ac44b2a058afbfad` |
| Corrected `battleReferenceContract.v2.json` | `b3f1159d91bc19061e555b45606f265d4fbe462e9572de2ef8e1c625e025668d` |

The permanent v2 gate compares every one of the 11 natural-seed cases in Japanese, English, Simplified Chinese, and Traditional Chinese independently against native seeded and equivalent native tape execution. It covers canonical localized results and optional-property presence, semantic events, threat bags, cursors, replay metadata, seed boundaries, repeated calls, failure recovery, and output ownership. Expedition 6 retains seed `0x8e710003`, 107 draws, and grouped Resonance `+12%`; the retained `0x8e710000` through `0x8e71003f` sweep compares seeded and tape execution without fixture writes.

##### Production bundle and rejected Build 38 performance acceptance

- A permanent esbuild graph/content audit covers `src/main.tsx` and `src/workers/afkChunkWorker.ts`. It rejects the deleted TypeScript coordinator/modules, tape diagnostics, checkpoint adapters, gameplay tape reservation, fixture-generation markers, battle-side `Math.random`, and the removed native placeholder markers. The final Vite browser and AFK-worker bundles pass the same marker audit.
- Final production profiling retained one Wasm call per encounter, an empty production tape, and structural full encoded-input allocation/input-arena copy/output-buffer copy counters of `0 / 0 / 0` for online, AFK, and API paths.

| Path | Workload | Wasm calls | Duration | Logical input / output | Full encoded-input allocations / input copies / output copies |
|-|-:|-:|-:|-:|-:|
| Online Boss | 40 measured battles | 40 | median 40.74 ms; p95 44.17 ms | median 2,920 / 7,168 bytes | 0 / 0 / 0 |
| AFK workers | 6 parties / 1,724 battles | 1,724 | 25.84 s total CPU; 7.81 s projected parallel | 5,000,456 / 4,468,864 bytes total | 0 / 0 / 0 |
| API count 1 | 24 battles | 24 | 336.73 ms | 70,016 / 52,288 bytes total | 0 / 0 / 0 |
| API count 100 | 2,400 battles | 2,400 | 46.93 s | 7,001,248 / 5,634,176 bytes total | 0 / 0 / 0 |

Observed maxima were 276 random draws and 133 semantic events, below the fixed 4,096 limits. Wall-clock figures remain descriptive; one-call routing, empty production tapes, and zero-copy counters are deterministic assertions. Full tests preserve existing saves, legacy logs, First Aid, room-end effects, rewards, and expedition orchestration.

Build 38's functional acceptance is retained, but its performance acceptance is rejected: AFK CPU regressed from 3.16 s before migration to 29.83 s and API count-100 reached 55.86 s. Profiling attributed 85.5% of AFK CPU to `structuredClone`. The projection and narration paths each cloned the complete `Party` for stat-only computation; four such computation-only clones in `battleCandidate.ts` multiplied the cost across every battle. The Build 38 migration-complete claim is therefore superseded by the Build 39 stabilization below.

#### Build 39 battle-migration performance stabilization — complete

- Removed exactly the four computation-only `Party`/character clones in static battle projection and semantic narration. `computePartyStats` and `computeCharacterStats` only construct local collections, arrays, maps, and returned stat objects; they do not assign to their input Party, Character, Enemy, or bag objects.
- The permanent golden gate explicitly proves that both projection and production execution leave Party, Enemy, and bags JSON-identical, while retaining complete result/event/cursor/bag/narration/replay/optional-property parity, one Wasm call, empty production tape, and zero-copy counters.
- The isolated performance profile now enforces environment-tolerant ceilings of online median below 25 ms, AFK total CPU below 7 s, projected parallel AFK below 2 s, and API count-100 below 10 s. The full test command serializes test files so this timing gate is not distorted by competing test workers; the dedicated benchmark also executes its bundled profile in a fresh child process.
- The profile rejects any reintroduction of `structuredClone(party)` or a `structuredClone` of a Party character in `battleCandidate.ts`. Worker messages remain unchanged: no payload redesign is justified by the recovered compute measurements, and real-browser AFK wall-time measurement remains the criterion for any future worker work.
- A local production-browser recovery observation progressed from 79% AFK recovery to normal movement within five seconds of observation (under roughly 6.5 seconds from page load). That real-browser recovery is not materially slow, so Build 39 deliberately retains the existing worker payload shape.

| Path | Build 38 | Build 39 isolated measurement |
|-|-:|-:|
| Online Boss median | 40.74 ms | 11.67 ms |
| AFK workers total CPU | 25.84 s (29.83 s AFK profile) | 2.72 s |
| AFK projected parallel | 7.81 s | 0.64 s |
| API count 100 | 46.93 s (55.86 s API profile) | 2.70 s |

Acceptance gate: complete. The performance gate passes with the immutable historical fixtures and all parity, one-call, empty-tape, and zero-copy invariants intact. The battle-engine migration is complete; this stabilization is not Part 4.
