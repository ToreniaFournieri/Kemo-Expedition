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
