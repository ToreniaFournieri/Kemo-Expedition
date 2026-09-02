# Mechanic Extensibility Architecture Decision

- Status: Accepted
- Date: 2026/09/01
- Scope: Built-in mechanic extensibility
- Normative references: Specification sections 5.1, 6.1.1, 6.1.2, 6.1.3, 6.1.5, 6.1.8, and 9.1.3

## Context

BoKemo's mechanic metadata and expedition orchestration are currently distributed across type declarations, data tables, the battle protocol registry, focused game modules, and `useGameState.ts`. This makes an ordinary mechanic change harder to audit and increases the risk that metadata, localization, runtime ownership, or tests become inconsistent.

At the same time, the existing architecture already has important deterministic boundaries that must not be weakened:

- `native/battle_protocol.def` is the append-only source of stable battle wire IDs.
- The C++/WebAssembly kernel is the authoritative executor for START, COMBAT, END, combat RNG consumption, and combat semantic-event order.
- TypeScript projects game data into the battle protocol and converts language-neutral battle facts into localized presentation.
- Expedition progression, post-battle effects, rewards, persistence, AFK coordination, and application commands remain outside the kernel.
- AFK Chunk execution and coordinator commits follow the deterministic and FIFO rules in Specification 5.1.

## Decision

BoKemo will adopt a deterministic, registry-driven functional-core/imperative-shell architecture incrementally for built-in mechanics.

The first implementation stages will add a read-only core mechanic catalogue and extract expedition-domain calculations into focused pure functions. They will not add an alternate combat executor, external content loading, or a new save format.

Every scoped mechanic behavior must have exactly one execution ownership classification. A mechanic ID may participate in more than one scope when the specification gives it distinct effects—for example, a combat effect and an expedition-economy effect—but the same scoped formula or transition must never have two authorities.

| Ownership | Meaning | Authoritative implementation |
|-|-|-|
| `kernel-native` | Affects START, COMBAT, END, targeting, hit/damage resolution, combat reactions, defeat recovery, combat RNG, or combat event order. | C++/WebAssembly battle kernel and its versioned binary protocol. |
| `expedition-domain` | Requires expedition context outside the battle protocol, such as room-end First Aid, reward modification, side-quest progress, rest, or Clear-Gate processing. | TypeScript deterministic domain functions invoked by expedition orchestration. |
| `metadata-only` | Grants, describes, reveals, or configures content without executing a battle or expedition transition itself. | TypeScript content/data catalogue and presentation adapters. |

A scoped behavior must not be implemented by more than one authority. In particular, TypeScript must not reproduce a numerical formula or ordering rule owned by the C++ kernel.

## Deterministic ordering

Combat ordering is defined only by Specification 6.1 and the C++ kernel. A TypeScript registry must not sort combat effects by mechanic ID, module registration order, content-pack load order, JavaScript collection insertion order, locale, wall-clock time, or asynchronous completion order.

Expedition-domain pipelines must encode their specification-defined order explicitly. If the specification does not define an interaction order, that order must be added to the specification before implementing behavior whose result depends on it.

Randomness must be supplied through the existing deterministic gameplay or battle RNG boundaries. Extracting a mechanic must preserve whether a draw occurs, its position relative to other draws, and the number of draws consumed.

## Registry authority

The planned core mechanic catalogue is an index over existing authorities, not a replacement wire registry.

- Battle wire IDs continue to come from `native/battle_protocol.def` and remain append-only.
- The existing saved/runtime ability IDs remain unchanged during internal migration.
- Battle ownership continues to agree with `src/game/battleAbilityOwnership.ts` until that metadata is safely derived from the catalogue.
- Presentation metadata must reference localization keys rather than localized runtime strings where practical.
- Contract tests must reject missing, duplicate, unclassified, or unresolved mechanic references.

The registry may later become the source for generated metadata, but generated output must preserve the existing battle IDs and protocol compatibility rules.

## Application boundary

React components, Electron, persistence, localization, notifications, and the Experimental AI API are imperative adapters. They may validate input, invoke an authoritative command, persist the returned state, and present emitted facts. They must not independently calculate mechanic outcomes.

Future command extraction must build on the existing authoritative state, revision, API serialization, and AFK coordinator boundaries rather than create a parallel transaction system.

## Initial scope

Included in the initial architecture work:

1. A complete inventory of built-in abilities and terrain effects.
2. A read-only core mechanic catalogue.
3. Cross-source validation for IDs, ownership, references, and localization metadata.
4. Extraction of selected expedition-domain calculations from `useGameState.ts`.
5. Differential and determinism tests that prove behavior and RNG parity.

Explicitly excluded from the initial work:

- Arbitrary JavaScript plugins or runtime monkey-patching.
- A TypeScript replacement or wrapper event engine for kernel-owned combat resolution.
- External JSON content-pack discovery, installation, or execution.
- Runtime-provided React components.
- Direct content access to save, Electron, Node.js, browser storage, or persistence APIs.
- Namespaced migration of existing saved ability IDs.
- Content fingerprints stored in saves or replay records.
- Battle ABI, protocol, RNG-version, or golden-fixture changes.

## External content packs

End-user-installable content packs are deferred. They require an approved specification change covering at least installation and enablement, environment isolation, dependencies and conflicts, capability limits, localization fallback, save and backup portability, missing-pack recovery, migrations, diagnostics, and resource limits.

When external packs are specified, the first supported content should be limited to declarative content that reuses approved built-in capabilities. A pack must not introduce a new kernel-native combat behavior without a compiled, versioned application and battle-protocol release.

Any future content fingerprint must cover simulation-affecting semantics only. Translation text, presentation-only metadata, and physical file order must not by themselves invalidate a deterministic save or replay.

## Migration constraints

Each runtime migration slice must:

1. Preserve existing saved IDs and save compatibility unless a separate specification-approved migration is included.
2. Preserve combat protocol, ABI, RNG version, semantic-event order, and golden fixtures unless the slice explicitly performs a versioned kernel change.
3. Preserve gameplay RNG draw presence, count, and order.
4. Preserve AFK individual-Chunk determinism and recorded-FIFO coordinator replay behavior.
5. Retain the same authoritative implementation across online play, AFK workers, simulations where permitted, and Experimental API sorties.
6. Add focused contract, differential, and failure-path tests before removing the old code path.
7. Update `build_number.txt` and `Specification_11.1_CHANGELOG.md` when the slice changes runtime behavior or runtime structure, following the repository workflow.

## Revised continuation plan

The continuation goal is internal simplification and mechanic safety. A general plugin platform is not part of the active migration.

The ordered expedition pipeline is intentionally smaller than a general event engine. It is appropriate only when an expedition event has multiple independently owned handlers and their relative order is a specified deterministic rule. A direct pure function remains preferable for one calculation, a tightly coupled sequence, or behavior that does not benefit from independent registration. The pipeline will not gain generic cancellation, recursive emission, reaction chains, or asynchronous handlers without a concrete specification requirement.

Further work proceeds in this order:

1. Keep handler registration validation bounded and make mechanic bindings identify their actual implementation and test locations.
2. Extract one immutable expedition context containing the already-authoritative party status, deity, difficulty, terrain, reward, and post-battle inputs.
3. Extract deterministic single-room resolution while retaining the native battle call, enemy-selection bags, reward order, unconditional draws, and deferred AFK narration behavior.
4. Move the complete `RUN_EXPEDITION` transaction behind one domain service, leaving the reducer to validate, invoke, and install the result.
5. Extract expedition finalization, side-quest lifecycle, and Cycle economics as separate deterministic transitions.
6. Introduce one application command boundary shared by UI, AFK, simulation, and the Experimental API without creating a parallel state authority.
7. Reduce `useGameState.ts` to React publication, persistence scheduling, worker coordination, time dispatch, and application wiring.
8. Reassess metadata derivation only after runtime extraction stabilizes. Compile-time ID unions and `native/battle_protocol.def` remain authoritative.

Peddler duration and Prophecy controls currently remain in presentation/application files. Their precise registry bindings expose this debt so they can be moved deliberately with focused parity tests instead of being hidden by a shared generic binding.

External content-pack schemas, primitive-effect languages, fingerprints, save/replay pack descriptors, dependency resolution, and author tooling are deferred to a separate specification project. They are not acceptance criteria for the current simplification.

## Consequences

This decision favors incremental consolidation over a directory-wide rewrite. It permits a searchable mechanic catalogue and reusable expedition-domain handlers while protecting the existing deterministic kernel and AFK transaction contracts.

External mod support is not scheduled by this decision. Any future proposal must preserve replay compatibility, save recovery, renderer isolation, and deterministic execution through a separate approved specification.

## Implementation status

Phase 3 is complete as of v0.9.5 Build 22. The read-only mechanic catalogue and generated inventory cover the append-only ability and terrain IDs, and the TypeScript-owned post-battle, reward-draw, Auriferous, depth-limit, side-quest outcome, and Clear-Gate outcome calculations now use focused deterministic domain functions. Localization and inventory/state mutation remain application adapters.

The first Phase 4 slice is complete as of v0.9.5 Build 23. A bounded expedition-only handler pipeline validates unique IDs, unique event/priority/source-order tuples, integer ordering keys, and a configured handler cap before precompiling numeric priority and source order. Post-battle deity, First Aid, Rejuvenation, Abundant, Rotwood, Leakage, Heatwave, and continuation-only Decay handlers now execute through that pipeline, and Auriferous reward preparation provides a representative reward handler. Character-selection draws remain unconditional at their historical positions, wounded retreat remains before Decay, and Auriferous narration remains after reward resolution.

Build 24 narrows and hardens that slice: handler and event IDs are namespaced, order keys are non-negative safe integers, expedition handlers are source-audited against native battle imports, and each expedition mechanic now records its actual implementation and test locations rather than inheriting a broad ability-or-terrain binding.

Build 25 completes the immutable expedition-context step. `RUN_EXPEDITION` now creates one frozen context from the current Party and the already-authoritative online, AFK Chunk, simulation, or API status snapshot. The context owns difficulty offset and ticket derivation, deity donation/rank and reward tickets, Cunning/Momentum/Unlock reward authority, the Colosseum terrain override, and precomputed post-battle character facts. Room traversal, enemy selection, native battle execution, mutable HP/bags/inventory, RNG calls, deferred narration, and finalization remain in their existing authority. The registry now also classifies Unlock's reward-ticket behavior as expedition-domain rather than metadata-only.

Build 26 begins deterministic single-room resolution with a battle-room core. `expeditionBattleRoom.ts` now owns sorted enemy selection, explicit-range uniqueness fallback, Colosseum and Gods Battle enemy construction, effective-tier encounter scaling and AFK encounter caching, terrain selection, the existing native battle adapter invocation, threat-bag replacement, encounter damage/attack facts, and language-neutral ability/item disclosure IDs. Enemy selection receives the gameplay random source explicitly; native combat still acquires exactly one battle seed through its existing kernel adapter. The reducer retains Clear-Gate checks, localized log construction, rewards, post-battle effects, mutable expedition accumulators, deferred AFK narration, and finalization.

Build 27 completes the deterministic room-mechanics boundary with a two-stage victory resolver. The first stage owns XP, Auriferous preparation, complete reward-ticket composition, reward draws, and returned bag state. The application shell then installs or auto-sells the recovered items and derives localized item names. The second stage consumes the Auriferous flavor draw, executes the ordered post-battle effects from the immutable run context, and returns wounded-retreat and depth-limit facts. This split deliberately preserves the historical reward draws → inventory installation → Auriferous flavor → three unconditional post-battle character draws order. Localized narration, mutable run totals, inventory rollback, Diary behavior, and final state installation remain application responsibilities.

The next runtime step is the complete `RUN_EXPEDITION` transaction boundary. It should begin by defining one explicit transaction accumulator/result contract and moving language-neutral room outcome accumulation and finalization into a domain service. The reducer should remain responsible for validation, localized presentation adapters, invoking the service, and installing its result. The migration must retain AFK inventory checkpoints, deferred narration replay, forecast discard behavior, Diary draw timing, and the existing global/Party publication authority.

Build 28 establishes that transaction contract with one performance-safe `ExpeditionTransactionAccumulator` per run. It owns current HP, current bags, accumulated fractional XP and final rounding, terminal outcome, room numbering, copied enemy encounter/defeat statistics, and insertion-ordered item/ability/terrain disclosures. Named transitions record battle-room facts, victory rewards, post-reward HP/retreat/depth decisions, defeat, draw, and gated escape. `finish()` exports one detached result for the existing forecast or committed-state adapter. The reducer no longer maintains parallel locals for those mechanics, while inventory/autosell mutation, localized entries, recovered-item rollback, deferred narration, Diary decisions, and state publication remain unchanged.

The next slice should extend the transaction result through language-neutral recovered-item and autosell facts plus expedition outcome/finalization planning. Item display names and Battle/Diary log construction must remain presentation adapters, and the AFK copy-on-write inventory checkpoint must remain the rollback authority until the complete service can own that lifecycle without cloning the inventory.

Build 29 completes that slice. The accumulator now records recovered and retained item references plus language-neutral auto-sell item/profit facts and the terminal Draw-retreat distinction. A pure finalization planner consumes the finished transaction to decide whether the application must roll back inventory, which rewards and auto-sell facts survive, how pending auto-sell profit is separated from immediately committed gold, and how the canonical Clear-Gate/Gods-Battle outcome state advances. The reducer no longer owns parallel reward, recovered-item, or auto-sell accumulators and no longer invokes outcome resolution directly. Inventory mutation, the AFK checkpoint operation, localized item names and log entries, deferred battle narration, Diary random draws, forecast discard behavior, and final state installation remain application authorities.

The next slice should extend the finalization planner through language-neutral expedition statistics, Altar victory increments, and unlock/retention decisions. Localized `ExpeditionLog` construction, deferred narration replay, Diary IDs and timestamps, and the final reducer state installation should remain outside the domain boundary until those presentation and persistence contracts can be moved without changing random draws or retained save structure.

Build 30 completes that finalization slice. The planner now increments exactly one canonical expedition statistic, preserving donated and saved Gold totals; applies one successful-expedition Altar victory per distinct assigned Mimorian enemy-form category; and owns the Expedition 3–7 Boss milestone mapping, pending Party-slot decision, and unlock-narration retention requirement. The legacy recovery and unlock Diary adapters reuse the same milestone mapping. `RUN_EXPEDITION` no longer computes outcome statistics, Altar increments, runtime unlock state, or unlock-driven narration retention inline. Localized expedition logs, Diary trigger settings, IDs and timestamps, default-deity payloads, deferred AFK replay, forecast discard behavior, and state installation remain in the reducer.

The next slice should introduce a narrow complete-expedition service facade around the existing context, room resolvers, inventory-installation callback, accumulator, and finalization planner. It should first move language-neutral floor/room traversal and terminal orchestration out of `RUN_EXPEDITION`, while keeping localized entry construction and inventory/AFK checkpoint operations behind explicit application callbacks so RNG order and save structure remain unchanged.

Build 31 introduces that facade. `expeditionService.ts` now owns floor/room traversal, Clear-Gate termination, per-floor explicit-enemy-range uniqueness, battle-room and two-stage victory sequencing, the synchronous inventory-installation callback position, transaction transitions, and Boss-victory detection. It returns ordered language-neutral room facts and one finished transaction. `RUN_EXPEDITION` invokes the service once, mutates inventory only through the callback, and renders the returned facts afterward. The service has no localization, `ExpeditionLogEntry`, React, Diary, or state-publication dependency. The reducer expedition section is more than one hundred lines smaller, while native battle ownership, RNG order, AFK encounter caching, checkpoint rollback, result-only narration replay, and save behavior remain unchanged.

The next slice should extract the localized room-fact renderer into an explicit expedition presentation adapter. That adapter should construct gate, battle, reward, Auriferous, post-battle, retreat, and depth-limit log entries plus deferred narration descriptors from the neutral service result. `RUN_EXPEDITION` should then contain only service invocation, inventory callback wiring, finalization, Diary/forecast decisions, and state installation.

Build 32 completes that presentation slice. `expeditionPresentation.ts` now projects the service's ordered neutral rooms into localized locked or newly-cleared Gate entries, battle snapshots, retained reward summaries, reward and auto-sell detail entries, Auriferous and post-battle narration, wounded-retreat and depth-limit messages, and deferred result-only AFK replay descriptors. The adapter executes after finalization so the Gate reached by a turned-back run can immediately disclose its newly-cleared state without a reducer-side rewrite. It has no gameplay RNG, battle resolver, inventory installer, Diary, React, or state-publication dependency. `RUN_EXPEDITION` now wires the service and inventory callback, invokes finalization and this one presentation adapter, and retains only application-owned AFK rollback, Diary/forecast decisions, and final state installation.

The next slice should extract a pure completed-expedition log and retention planner. It should assemble the final `ExpeditionLog`, localized auto-sell display facts, notification trigger categories, and complete-narration retention decision from the room presentation and finalization result. Actual deferred battle replay, Diary identifier/timestamp draws, forecast discard behavior, AFK checkpoint operations, and state publication should remain in the application shell so their timing and persistence authority do not change.

Build 33 completes that log-and-retention slice. `expeditionCompletionPresentation.ts` now assembles one final localized `ExpeditionLog`, including room counts, HP, retained rewards, and localized auto-sell details, and derives the ordered outcome, Gods Battle, and rarity Diary trigger categories with their existing enhancement thresholds and Super Rare precedence. It also combines those triggers with the finalization planner's Party-unlock requirement to decide whether compact AFK battles need complete seeded narration replay. The planner is random-free and does not import battle execution, `GameState`, Diary persistence, React, or time authorities. `RUN_EXPEDITION` retains the replay invocation, forecast-only terminal draw, Diary ID/timestamp generation, AFK checkpoint lifecycle, and final state publication at their historical positions.

The next slice should extract deferred result-only battle narration replay into an explicit application adapter. The reducer should decide whether and when replay runs, while the adapter validates seed metadata and outcome/HP/draw-count parity and installs the reconstructed battle log into the already-rendered entry. This must not use the gameplay RNG stream or move the forecast terminal Diary-ID draw.

Build 34 completes that replay slice. `expeditionNarrationReplay.ts` accepts the deferred descriptors produced by the room presentation adapter plus the authoritative Party and precomputed Party status. It reconstructs full battle narration from each retained native seed and RNG version, rejects missing metadata or any outcome, terminal-HP, or random-draw-count divergence, and prepends the reconstructed battle events to the same entry reference while retaining reward and post-battle details. The adapter never acquires a seed and has no gameplay RNG, Diary, forecast, React, time, or state-publication authority. `RUN_EXPEDITION` still owns the retention condition and invokes replay at the historical position immediately before forecast handling and its optional terminal Diary-ID draw.

The next slice should extract committed expedition state installation into a pure application planner. It should accept the already-created pending Diary record, finished transaction/finalization facts, inventory and Gold decisions, completed log, and current state, then return the Party/global projection. Forecast state construction, Diary identifier/timestamp draws, the AFK inventory checkpoint lifecycle, and the reducer's final publication decision should remain outside this planner.

Build 35 completes that committed-state slice. `expeditionStateInstallation.ts` now constructs detached Party and global projections from the current state plus already-resolved expedition inputs. It owns the finished bags and log, pending Diary reference, pre-expedition Gate rollback snapshot, Gate/Boss outcome state, final HP, latest-cycle pending profit, statistics, pending Party unlock, inventory and Gold, disclosures, enemy statistics, and Altar victories while preserving unrelated Party/global fields. The planner has no RNG, time, forecast registry, React, persistence, or reducer-publication authority. The reducer still filters glossary ability disclosures before invocation, creates the Diary ID and timestamp, selects forecast versus commit, and performs the final state return.

The next slice should extract forecast expedition state construction into the same pure application boundary. The planner should build only the private forecast Party projection; the reducer must retain the optional terminal Diary-ID random draw, `WeakMap` resolution registration, and immediate forecast return so random timing and non-persisted forecast ownership remain unchanged.

Build 36 completes that forecast projection slice. `planForecastExpeditionState` copies only the selected Party, installs the forecast bags and terminal HP, clears retained expedition and pending Diary records, and preserves unrelated Parties and the global object by identity. The reducer still consumes the optional terminal Diary-ID draw before planning, registers the forecast resolution against the returned private state in its `WeakMap`, and returns immediately. The planner has no RNG, time, replay, persistence, localization, registry, or publication authority.

The next slice should extract pending expedition Diary-record construction into a small application adapter. The reducer should continue to determine the simulated timestamp and consume the random ID token at the exact historical point, while the adapter receives those already-created values plus the completed log and triggers and returns the pending record or `null`. Forecast handling must continue to stop before timestamp allocation and retained Diary construction.

Build 37 completes that pending-record slice. `expeditionDiary.ts` now assembles the unchanged pending expedition Diary record from the completed log, ordered triggers, caller-selected timestamp, and caller-created random ID token, returns `null` when there are no triggers, and rejects a retained-record request without a token. The adapter has no time, gameplay RNG, forecast registry, persistence, localization, React, or state-publication authority. `RUN_EXPEDITION` still exits forecast mode before timestamp allocation, selects the simulated or wall-clock timestamp, conditionally consumes and formats the gameplay-random token at the historical position, and passes the deterministic record into committed state installation.

The next slice should move successful-expedition Mimorian assigned-enemy-type derivation into the finalization boundary. The finalization planner should derive the distinct assigned enemy categories from the authoritative Party characters and enemy master data only for a Clear, retaining its existing one-increment-per-category rule. The reducer should stop preparing this domain-specific intermediate while keeping Party-status authority, service execution, inventory checkpoints, presentation, Diary allocation, forecast registration, and state publication unchanged.

Build 38 completes that finalization-input slice. `planExpeditionFinalization` now accepts the authoritative Party-character snapshot and an explicit enemy-definition collection, selects current Mimorians, resolves only known copied-enemy IDs, deduplicates their enemy categories, and increments each category once only after a Clear. Enemy definitions remain caller-injected, so the transaction module does not import localized enemy construction. `RUN_EXPEDITION` no longer derives a parallel category list or branches on the final outcome before finalization; it passes the same authoritative status Party and master enemy definitions into the planner.

The next slice should extract application-owned expedition inventory checkpoint coordination into a narrow adapter. It should open the optional AFK copy-on-write checkpoint, expose the current inventory to the service's synchronous recovered-item installation callback, apply the finalization rollback decision, release the checkpoint, and return the final inventory and installed Gold without moving inventory mutation into the language-neutral domain service. The exact reward installation position, Defeat rollback behavior, auto-sell accounting, AFK overlay authority, and random order must remain unchanged.

Build 39 completes that application-coordination slice. `ExpeditionInventoryCoordinator` opens the optional structural overlay checkpoint, retains current inventory and installed Gold across synchronous reward installations, passes the existing installer its exact online-copy or AFK-mutation mode, exposes installed Gold to finalization, applies the planned rollback, releases the checkpoint, and selects the final authoritative inventory. The reward algorithm and localized result remain injected by `RUN_EXPEDITION`, while `expeditionService.ts` still sees only the same synchronous installation callback at the same position between reward and post-reward draws. The coordinator has no gameplay RNG, time, localization, React, service invocation, Diary, forecast, or state-publication authority.

The next slice should extract expedition preflight preparation into a narrow application planner. It should resolve dungeon availability, Gods Battle eligibility, supplied online/AFK/API Party-status authority, computed-status fallback, and HP eligibility, then construct the immutable run context and initial transaction inputs. Diagnostic authority recording, invalid-run reducer identity returns, AFK inventory coordination, service invocation, presentation, Diary timing, forecast registration, and state publication must remain in the application shell.

Build 40 completes that preflight slice. `prepareExpeditionRun` resolves caller-injected dungeon availability, applies the existing Gods Battle gate only when requested, selects AFK Chunk authority before other supplied authority and computed fallback, reports whether authority was supplied, rejects nonpositive persisted or computed HP, constructs the immutable context, and assembles normalized bags plus initial statistics and ordered disclosure inputs. Dungeon, Gods Battle, terrain-setting, and bag-normalization functions remain injected so the planner does not acquire localization, storage, or save-hydration authority. `RUN_EXPEDITION` retains diagnostic recording and both identity-preserving early returns, then passes the prepared context and transaction directly to the service.

The next slice should consolidate deterministic post-service finalization and room-presentation preparation behind one narrow application coordinator. It should accept the finished service result, authoritative state/Party inputs, installed Gold, enemy definitions, and presentation mode, call the existing pure finalization planner before the existing room renderer, and return both results. The reducer must retain inventory checkpoint completion at its historical point after room rendering, completed-log planning, deferred replay timing, Diary allocation, forecast registration, and final state publication.

Build 41 completes that post-service coordination slice. `planExpeditionPostService` accepts the finished neutral service result, current state and Party facts, authoritative status-Party characters, installed Gold, dungeon and enemy definitions, and deferred-presentation mode. It invokes the existing finalization planner before the localized room renderer and returns both results, preserving current-run Clear-Gate disclosure without duplicating their inputs in `RUN_EXPEDITION`. The coordinator has no gameplay RNG, time, inventory mutation, replay, Diary, forecast, or state-publication authority. The reducer still completes or rolls back the inventory checkpoint immediately afterward, then plans the completed log, conditionally replays seeded narration, consumes forecast or retained Diary draws, registers private forecasts, and publishes committed state at their historical positions.

The next slice should consolidate the committed-expedition tail behind a deterministic application coordinator after the reducer has created any Diary timestamp and random ID token. It should assemble the pending Diary record, derive validated glossary-ability disclosures through an injected or explicit boundary, and invoke the existing committed-state planner. Forecast handling, timestamp selection, gameplay-random token consumption, inventory checkpoint completion, replay timing, and the reducer's final publication must remain outside so their ordering and authority do not change.

Build 42 completes that committed-tail slice. `planExpeditionCommit` receives the already-selected Diary timestamp and already-consumed random ID token, assembles the pending Diary record, invokes the caller-supplied ability-disclosure validator against the current global state and finished transaction IDs, and passes both results into the existing committed-state planner. `RUN_EXPEDITION` now invokes one committed-tail coordinator while still owning forecast selection and registration, the forecast-only terminal draw, retained Diary timestamp and token allocation, checkpoint completion, replay timing, and final state publication. The coordinator has no gameplay RNG, time, forecast registry, inventory mutation, replay, React, or publication authority.

The next slice should remove the now-single-use glossary encounter helper from the React reducer and make it a focused pure application function. The committed-tail coordinator should then call that explicit validator directly instead of receiving a source-shaped callback. Ability and terrain ID validation, insertion order, existing disclosed IDs, save representation, and every caller-visible expedition boundary must remain unchanged; this should reduce wiring rather than introduce a second glossary authority.

Build 43 completes that glossary boundary. `glossaryDisclosure.ts` now owns the one master-data-derived set of revealable ability and terrain IDs, save normalization for both arrays, and insertion-order-preserving encounter projection. Save import normalization calls the extracted functions, and `planExpeditionCommit` invokes encounter disclosure directly before committed-state planning. The reducer no longer imports glossary master data, defines validation sets, filters disclosure arrays, projects encounters, or supplies a source-shaped callback. Existing disclosed IDs, newly accepted IDs, terrain handling, array order, and save representation remain unchanged.

The next slice should consolidate completed-expedition presentation and conditional deferred narration replay behind one narrow application coordinator. It should call the existing completed-log/trigger planner, replay the existing seeded descriptors only when complete narration is required, and return the log and Diary triggers. Inventory checkpoint completion must remain before this coordinator; forecast selection and its terminal draw, retained Diary allocation, commit coordination, and final publication must remain after it. The coordinator must not acquire gameplay RNG, time, forecast registration, inventory, or persistence authority.

Build 44 completes that completion coordinator. `completeExpeditionPresentation` calls the existing localized log/trigger planner and then, only when the unchanged trigger-or-unlock retention decision requires complete narration and deferred descriptors exist, invokes the existing seeded replay adapter. It returns only the completed log and ordered Diary triggers. `RUN_EXPEDITION` completes the inventory checkpoint immediately before this call and retains forecast selection, forecast registration, terminal forecast draw, retained Diary timestamp/token allocation, committed projection, and final publication immediately afterward. Seed/version validation, replay parity checks, entry identity, and Diary trigger precedence remain in their existing focused modules.

The next step should be a consolidation checkpoint rather than another one-call wrapper. Audit the remaining `RUN_EXPEDITION` shell, record which responsibilities must remain reducer-owned, and define the minimum explicit application-command input/result contract that can be shared by online, AFK, forecast simulation, and Experimental API execution. The contract must keep diagnostic recording, gameplay RNG and time acquisition, forecast-registry mutation, and final reducer publication explicit, and it must not create a parallel state authority. Implementation should proceed only after focused source tests demonstrate the intended dependency direction and ordering boundaries.

Build 45 completes that checkpoint. `expeditionApplicationContract.ts` defines one stable command shape for the Party index, simulated timestamp, Gods Battle request, AFK and authoritative status inputs, battle-output settings, and full/forecast mode. Randomness and committed-time acquisition are explicit authority ports rather than imported globals. The result is discriminated as unavailable, HP-ineligible, forecast, or committed: status-authority information travels outward for diagnostic recording; forecast results carry the private state and detached diagnostic projection for caller registration; committed results carry only the Party/global projection for caller publication. The pure log-to-forecast projection moved out of the hook, while the reducer still owns every `WeakMap` mutation and final state return.

The audit classifies the remaining shell as follows:

- Application execution: preflight, inventory adapter creation, neutral service invocation, post-service finalization/rendering, checkpoint completion, completed-log/replay coordination, forecast projection, and committed projection. These can move behind the new contract.
- Explicit caller authorities: supplied gameplay-random function and committed-time resolver. They must be passed to the application runner and invoked only at their current points.
- Reducer-owned effects: status-authority diagnostic recording, private forecast `WeakMap` registration, unchanged-state identity returns, and final projection publication. These must consume the discriminated result outside the runner.
- Environment/application adapters: dungeon lookup, Colosseum terrain setting, Gods Battle eligibility, imported-bag normalization, recovered-item installation, reward-bag refill, enemy definitions, Diary defaults, unlocked-deity defaults, and optional AFK inventory/encounter overlays. These must remain explicit inputs or focused imports and must not become hidden alternate authorities.

The next slice should implement `runExpeditionApplication` against this command/result contract with one explicit adapter bundle. `RUN_EXPEDITION` should bind the existing gameplay RNG and committed-time resolver plus its current application/environment adapters, invoke the runner once, record diagnostics from the result, register forecast results in the existing `WeakMap`, and publish committed projections itself. The migration must retain the exact preflight early-return order, inventory checkpoint lifecycle, service/replay order, forecast-only terminal draw, retained Diary token draw, and all existing online/AFK/simulation/API callers.

Build 46 completes that application-runner slice. `runExpeditionApplication` now executes the prepared workflow in one place: preflight, inventory coordination, service resolution, post-service finalization and rendering, checkpoint completion, completed presentation and optional replay, then the mutually exclusive forecast or commit tail. Its adapter bundle makes dungeon lookup, Colosseum terrain, Gods Battle eligibility, imported-bag normalization, recovered-item installation, reward-bag refill, enemy definitions, Diary defaults, unlocked-deity defaults, and AFK overlay/cache participation explicit. Gameplay randomness and committed-time acquisition enter through caller-owned authority ports and remain conditionally invoked at the same historical points. `RUN_EXPEDITION` now binds those ports and adapters once, records returned status-authority diagnostics, preserves the original state identity for unchanged results, registers private forecast results, or publishes a committed projection.

The next slice should reduce the still-large adapter literal in `RUN_EXPEDITION` without hiding its authorities. Extract the recovered-item installation and presentation mapping from the React hook into a focused inventory-reward adapter, then define a stable default expedition adapter factory whose only per-invocation inputs are the optional AFK inventory overlay and encounter cache. Keep Colosseum terrain lookup, localization-sensitive item naming and Diary defaults, and master-data dependencies visible in that factory; do not move diagnostics, forecast registration, time/RNG acquisition, or final publication out of the reducer.

Build 47 completes that adapter consolidation. `expeditionRewardInstallation.ts` now applies the existing injected inventory mutation once per recovered item and returns only the service-facing retained items, auto-sold item/profit facts, and localized presentation fields. `expeditionApplicationAdapters.ts` binds stable dungeon, Colosseum terrain, shared Clear-Gate Gods Battle eligibility, reward refill, enemy-definition, Diary-default, deity-default, and reward-installation dependencies. The factory created once by the hook accepts only the optional AFK inventory overlay and encounter cache for each command. `RUN_EXPEDITION` no longer contains reward classification, localized item-name mapping, master-data wiring, or a large adapter literal; it still visibly owns gameplay RNG/time ports, diagnostic recording, forecast registration, identity-preserving unchanged returns, and committed publication.

The next step should be a focused consolidation checkpoint for the adapter factory's three static hook dependencies. Diary setting normalization and the generic inventory-add mutation are shared application utilities and can move to focused modules if their existing non-expedition callers can reuse them without new wrappers. Imported-bag normalization is also save-migration behavior and should remain in the save/hydration boundary unless a single shared migration owner can replace every current use. Avoid further `RUN_EXPEDITION` wrappers: the reducer boundary is now intentionally small, and future extraction should measurably remove duplicated general-purpose logic rather than only relocate one call.

Build 48 completes that checkpoint. `diarySettings.ts` now owns the default Diary settings plus legacy defeat and popup-field normalization, and every hydration, initialization, runtime threshold, update, and expedition caller reuses it. `inventoryMutation.ts` now owns the shared stack limit, sell-price delegation, and immutable-or-explicitly-mutable item addition used by expeditions, shops, reward grants, and debug inventory flows. The expedition adapter factory receives these shared functions without acquiring save authority. The audit left `normalizeImportedBags` beside `migrateLegacyBag` and the hydration pipeline because its fallback bag factories and legacy array conversion are save-schema migration, not expedition execution.

This completes the planned `RUN_EXPEDITION` simplification boundary. The reducer now owns only caller authority binding and result effects, the application runner owns workflow ordering, focused adapters own environment and presentation integration, and domain modules own mechanics. Any next decomposition should be planned independently: a save-migration module could absorb `migrateLegacyBag` and `normalizeImportedBags`, or a broader inventory application module could absorb removal, selling, shop, and debug mutations. Neither should be presented as another expedition wrapper, and each should begin with save-fixture or inventory-operation parity tests before changing ownership.

Build 49 completes the save-bag migration slice. `bagMigration.ts` now owns tuple-entry migration, expanded-ticket aggregation, invalid-value handling, fallback factories, type normalization, and the complete 13-bag projection including shared legacy Super Rare fallback. Top-level save hydration and every Party/runtime consumer call the same exported normalization function; the duplicated 13-field hydration block has been removed. `bags.ts` remains the authority for default definitions and normalization rules, while the hook retains encoded and segmented save acquisition plus unrelated schema migrations. Expedition adapters receive only the finished normalizer and do not import migration factories.

The next independent simplification should audit inventory removal and selling before changing code. The target is one pure inventory-operation module that can express remove-one, sell-one or sell-stack, and marked-status transitions with explicit immutable/mutable identity, while reducer cases retain purchase validation, Gold spending, shop intimacy/stock, Jewel behavior, and final state publication. Begin with operation-level parity tests for owned, sold, not-owned, last-copy, multi-copy, locked/equipped exclusions, and bulk-sale totals; do not combine shop policy or debug authorization with the inventory primitive.

The audit confirmed that pre-battle terrain behavior is already kernel-native and is not duplicated in the TypeScript event pipeline. Native START, COMBAT, END, targeting, damage, reaction, combat RNG, and semantic-event order remain outside its scope.
