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

## Forward migration roadmap

The target remains one synchronous TypeScript-to-Wasm execution call per battle: TypeScript projects the input and supplies the deterministic random tape, C++ resolves the complete battle, and TypeScript reconstructs localized narration from returned semantic events. Each stage below is an independent acceptance gate. Later-stage work must not be pulled into an earlier checkpoint merely because the protocol has room for it.

### Part 1.9 complete-result differential parity and narration

- Connect the complete tape-driven native result to the existing record/replay differential harness without falling back to the TypeScript numerical coordinator.
- Reconstruct the complete localized `BattleLogEntry[]` and canonical battle result from semantic events while keeping names, localization, and display formatting in TypeScript.
- Compare outcome, HP, ordered logs, random consumption, enemy-hit totals, updated threat bags, and complete result shape for every frozen golden case plus pathological capacity and ordering cases.
- Close semantic-event schema gaps explicitly. Increment protocol or ABI versions only for an actual incompatible wire-layout change.

Acceptance gate: the native candidate is JSON-level identical to the frozen TypeScript reference for the complete golden inventory, consumes the exact tape without an extra draw, makes exactly one measured Wasm execution call per battle, and leaves all frozen hashes unchanged.

### Part 1.10 deterministic production cutover and stabilization

- Route production `executeBattle`, AFK workers, and Experimental API sorties through the same complete one-call tape-driven native coordinator.
- Reduce TypeScript battle code to projection, deterministic tape supply, semantic narration, and external expedition orchestration such as qualifying post-battle First Aid.
- Remove production numerical micro-crossings and prevent production fallback to the TypeScript numerical coordinator. Retain the frozen reference only as a temporary stabilization oracle until cutover evidence is complete.
- Measure online, AFK-worker, and API behavior, including arena capacity, serialization/reentrancy, output volume, and browser/Electron/worker consistency.

Acceptance gate: all runtime entry points use the same Wasm protocol/ABI, every battle makes one execution crossing, no TypeScript-owned numerical battle formula remains on a production path, and performance/capacity regressions are within documented limits.

### Part 2 native seeded RNG ownership

- Begin only after the tape-driven production engine has complete parity and has stabilized.
- Move a battle-local xoshiro256** RNG into native battle state, initialized by the protocol's unsigned 64-bit seed and supported RNG version; route every random decision through explicit native helpers while preserving canonical decision order.
- Remove the production random tape, retain seed/version/draw-count replay metadata, reject unsupported RNG versions, and prove independent worker instances do not share RNG state.
- After seeded parity and invariant review, revise the frozen contract and regenerate golden data exactly once as an intentional RNG contract migration rather than an incidental hash update.

Acceptance gate: identical input and seed reproduce identical complete results across browser, Electron, workers, and API sorties; different seeds exercise valid paths; all random indices/doubles remain in bounds; and recorded seed metadata replays exactly.

### Part 3 single-crossing optimization and cleanup

- Encode directly into reusable Wasm input memory where safe, cache arena pointers/capacities, decode the contiguous semantic output before the next invocation, and reuse typed-array views without introducing reentrancy.
- Preserve one Wasm invocation per encounter rather than batching an entire multi-cycle sortie into one oversized call. Serialize battles per JavaScript realm and let each AFK worker own its Wasm instance.
- Establish tested event/output capacity ceilings, return explicit overflow errors without truncation, keep synchronous online latency within the UI budget, and keep large AFK/API workloads in workers or yielding between battles.
- Remove obsolete checkpoint-only adapters, the temporary no-flag placeholder path, unused micro-kernel production APIs, and the duplicate TypeScript numerical engine only after their replacement gates are proven.

Acceptance gate: the optimized boundary preserves the complete seeded result and semantic event stream, retains deterministic replay, meets measured latency/capacity targets, and leaves a single authoritative production battle engine.
