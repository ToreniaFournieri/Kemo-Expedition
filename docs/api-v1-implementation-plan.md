# `/api/v1` implementation plan

Status as of v0.9.7 Build 95. `/api/v1` stays **test-only** (`allowEnable` is set only by the desktop `--api-v1-test` flag) until every public-cutover gate in Stage 9 passes.

Contracts: `Specification_9.1.3_API.md` (product intent) and `Specification_9.1.4_API_DETAIL.md` (transport, consistency, security). Gameplay and UI sections take precedence over both.

This document supersedes the earlier "Build 23" plan. Stages are numbered once, below.

## Status summary

| Stage | Area | State |
|---|---|---|
| 1 | Contract catalog | Complete (Build 95) |
| 2 | Standalone Application API and authority | Done (foundation) |
| 3 | HTTP transport and sessions | Implemented, test-only |
| 4 | Expedition and shell | Complete |
| 5 | Party, character, equipment | Done (UI projection complete) |
| 6 | Base, inventory, shop, Altar | Done (UI projection complete) |
| 7 | Diary and popup streaming | Complete |
| 8 | Settings, files, delivery, Help, Resources | Partial |
| 9 | Conformance hardening and public cutover | Not started |

## Done so far

- All 85 routes are cataloged, generated (`npm run api:v1:check`), and validated with TypeBox/Ajv, including response envelopes, stable errors, and per-operation error lists.
- The Application API (`src/api/v1/applicationApi.ts`) is transport-neutral. `HomeScreen.tsx` supplies runtime ports only.
- The serialized authority provides revisions, receipts, tombstones, admitted-duplicate handling, durable confirmation reservations, rollback, isolated RNG, and atomic multi-Chunk elapsed progression.
- API-account storage is manifest-last; login stages catch-up privately and logout restores the flushed player save.
- The delivery state machine (queued / sending / delivered / failed / unknown / cancelled) and reward completion transaction exist. No network sender is wired.
- Party deity, member ordering, character editing (Build 38), and the equipment controls (Builds 40–41: equip, atomic replace via `targetSlot`, lock, Jewels, Remove All, Auto Equipment) go through the trusted in-process adapter.
- `calculatedStatus` and the sell/purchase results now use the public payload shapes (Build 39).
- Saved sets carry items and locks only and load with independently assigned Jewels (Build 57); Undo/Redo states record the Jewel assignment and restore exactly or not at all (Build 58).
- Equipment commands are atomic: slot commands, `equip`, exact and confirmed partial set load, Undo/Redo validation, build-change validation and confirmation, and Auto Equipment reports.

## Review of Builds 62–64 (Codex)

Verified at Build 64: `tsc`, lint, `api:v1:check` (84 operations), `npm test` (549 tests including subtests; 427 top-level), desktop smoke. Saved-set availability, the Jewel-aware `equipmentEvaluation`, and the slot-aware `equipmentChanges` preview are correct and remove the three Party-tab exceptions (the random default name stays at the presentation boundary by decision). Points to close:

All three closed in Build 65: `targetItems` and `equipmentChanges` are bounded at 100 per request with chunked, debounced reads in the tab (`useApiReadMany`); each preview computes only the target character (about 3× faster on the real save); and an in-process versus HTTP-shaped parity step covers the read. The POST-read alternative was not needed.

## Stage 1 — Close the contract catalog

`scripts/generate-api-v1-contract.mjs` has zero `Type.Unknown` fields as of Build 95. Inventory (each row already closed):

| Operation | Gap |
|---|---|
| `read/expedition/{p}/latestBattleLog` | Done in Builds 67, 71, and 82 (public log/resources shape, retained `logId`, bottleneck enemies, and no-spoiler timing). |
| `read/expedition/{p}/simulationRun` | Done in Build 66 (compact strings, percentages, structured rooms with HP buckets). |
| `read/observation/expedition` and `compact` | Done in Builds 71–73 (live state/timing, disclosure, progress, goals, side quests, and controls). |
| `read/observation/diary`, `diaryEntry/{id}` | Done in Build 88 (closed semantic/legacy summaries, stable opaque IDs, selection/filtering, exact settings, and retained-log references). |
| `read/base/shopInfo` | Done in Build 81. |
| `read/base/altarInfo`, `enemyFormList` | Done in Build 83. |
| `resources/glossary` | Done in Build 94 (real `GLOSSARY_SECTIONS` content; `category` enum replaced with the spec's own `a./b./c./d./f./g./m./q./t.` section letters; only `a.`/`t.` entries are reveal-gated per rule 1.0.3). |
| `resources/itemCompendium` | Done in Build 94 (reuses `describeItem`; adds `category`/`rarity`/`itemId` filtering and a `revealed` flag from `revealedItemCompendiumItemIds`). |
| `resources/bestiary` | Done in Build 94 (reuses `buildEnemyStatus`; adds shared `encounters`/`defeats` from `GlobalState.enemyBattleStats` and a `revealed` flag; `enemyId`/`enemyType`/`expedition` filters). |
| `read/setting/enemyEditPane` | Done in Build 94 (`terrainEffect` from `TERRAIN_EFFECT_GLOSSARY_SECTION`, `enemyType` from `ENEMIES`). |
| `resources/characterRoster` | Done in Build 95 (reuses `describeBonuses`, excluding ability-type bonuses; `defaultAbility`/`unlockAbility` are the same stable ability IDs already stored on the race definition; filters by the requested `race`; fixed a missing `mustelid` in the query's own enum). |
| `resources/clairvoyance/{p}` | Done in Build 95 (remaining/total and hits-remaining/hits-total per bag, compared against a freshly created bag of the same kind via `src/game/bags.ts`'s existing helpers; no duplicate "total" stored anywhere). |

Gate: no `Type.Unknown`, no `{}` or `[]` stand-in for real data, no raw master-data or save object in a response; `api:v1:check` reproducible; every operation has one in-process and one HTTP parity fixture.

## Stage 4 — Expedition and shell (revised: no extraction)

**Scope change (Specification 9.1.3, Core concepts).** The API must share the game's logic and must not duplicate it, but existing game logic is not to be refactored or extracted solely to support the API unless that is required to avoid duplication or inconsistent behavior. The earlier plan to extract the party cycle from `HomeScreen.tsx` (step 4a) is therefore dropped. `HomeScreen` and the reducer stay as they are.

What the API still cannot see is the live party cycle (`partyCycles`: `state`, `stateStartedAt`, `durationMs`), which lives in the component. Two smaller, no-refactor steps replace the extraction:

1. **Read-only runtime port.** `HomeScreen` already keeps `partyCyclesRef`; expose a snapshot of it (plus the emulated time and the pending-AFK flag) to the read models through a port, as it already supplies the clock and the simulation runner. Nothing moves. The `expedition`, `compact`, and `overview` projections then report the real state, its progress timing, and the no-spoiler rule (latest floor, outcome, and log update only at the end of `state.explore`), instead of the current guess from HP.
2. **Sortie parity (done, Build 70).** The API sortie follows the button's own reducer sequence and refusals, and resets the live cycle through a runtime port write applied after the durable commit (the spec owner accepted the write). No logic was extracted. A differential check against the UI's own action sequence is not possible without running `HomeScreen`, so the behavior is pinned by tests of each refusal, the sequence's effects, and the persist, cycle, publish order.
3. **Projections and simulation:** complete `{p}/setting`, `chargeStock`, `overview` (progress report), and `compact`; the exact 100/1,000-run counts are already tested.
4. **Migrate the header and the Expedition tab** to projections and commands, with the migration guard. Continuous progress bars interpolate from the projected start and expected end times.

The runtime port now serves the projections too (Build 71): real `state`, its clock, and the no-spoiler rule are done for `expedition`, `compact`, and the default `latestBattleLog`. Build 72 added step counts and sub-progress, server-gated exploration (`exploration.rooms`, `nextRevealAt`), Clear-Gate and side-quest facts from shared `src/game/expeditionGoals.ts`, and the sortie and Gods Battle controls with unavailable reasons (`src/api/v1/sortieAvailability.ts`, shared with the commit, which now also refuses `entry_gate_locked`). Build 73 added the `overview` header facts (Speed of Time, auto-repeat, progress-report state) through a runtime `headerRuntime` port. Build 77 migrated the Expedition pane rows and their timed refresh to the projection. Build 78 completed E3: the tab reads each party's `latestBattleLog` projection through the trusted adapter, and `src/api/v1/expeditionLogView.ts` rebuilds the renderer view from projected summary/room facts while retaining only the language-neutral/legacy narration details needed for display.

**Header migration (done, Build 92).** `src/components/home/HeaderBar.tsx` renders the fixed top bar from `read/observation/overview`'s `headerInfo` through a pure view builder (`src/api/v1/headerView.ts`); the existing Speed-of-Time symbol/label logic (including the orca-mode `x5`→`x6` bonus case) is ported unchanged, re-keyed to the projected `speedOfTime`/`gameMode` facts instead of local debug-settings refs, and gold reads `headerInfo.gold` instead of `state.global.gold`. Two controls stay reviewed local exceptions, each with its reason recorded: Report Progress still performs its own webhook call directly (`commit/progress/progressReport` exists but has no real network sender until Stage 8's delivery-sender work), and auto-repeat stays local/runtime state (it is one field of the spec's bundled `commit/setting/modeSelect`, §2-6-2/§3-6-2 of `Specification_9.1.3_API.md` — explicit Stage 8 scope, not a header-only concern). Both reviewed calls live in a named `handleReportProgress` handler outside the guarded JSX, matching the Expedition/Diary precedent. `tests/migratedTabs.test.cjs` covers the header the same way as every other migrated area.

**Stage 4 is complete.**

## Stage 5 — Party, character, equipment (complete)

Done: deity, ordering, character build editing, equipment controls, equipment sets, and Undo/Redo.

Next, in order:
1. (Done, Build 40) Equipment controls.
2. (Done, Build 42) Equipment sets: save, load with the confirmation choice, rename, delete.
3. (Done, Build 43) Undo/Redo use the API's per-character history and the equipment projection's availability.
4. **Party reads** (in progress; `PartyTab.tsx` is about 3,000 lines built on `Party`, `Character`, `Item`, and computed-stats objects, so it is migrated in steps):
   - 4a. (Done, Build 45) Saved equipment sets and the deity pane (donations, unlocked gods) render from projections; shared item wire-format module.
   - 4b. (Done, Build 46) Owned inventory for equipping and the Jewel counts, from `searchItems` (`category: jewel` lists Jewel stacks). `searchItems` follows the refined 2-4-1 contract (Builds 47–48: optional category, character-assigned items, details, ability/bonus search, calculated base power, sort order, `limit`).
   - 4c. Character and member list.
     - 4c-1. (Done, Build 49) Party pane, party selector, member list, and deity rules render from `read/observation/party` through `PartyView` and `PartySummary`.
     - 4c-2. (Done, Build 51) Offense and defense amplifiers, effective accuracy and decay, and total penetration come from one shared game function (`src/game/statusFacts.ts`), are published as `calculatedStatus` facts, and the tab reads them for its offense and defense lines and for the status-change notifications. Lossless round-trip test against the old formulas.
     - 4c-3. (Done, Build 54) The tab receives no `ComputedCharacterStats`: every character number it reads is rebuilt from `calculatedStatus` (`buildPartyStatsView`), and the edit warnings come from `changeBuild`'s simulation (Build 53). Its remaining game-logic calls are pure functions on the projected display objects (bonus list, HP breakdown, item stat text, and the equipped-item defense preview).
   - Open question for the spec: the defense preview when hovering or tapping an item recomputes one hypothetical equipment change locally. If it should be API-owned, `equip` would need a `simulation` parameter like `changeBuild`.
   - 4d. (Done, Build 49) The equipment slot list renders from the party projection's equipment entries; mode and Undo/Redo come from the `equipment` projection.
   - 4e. (Done, Build 59) The inventory category is a per-character `uiPreferences` entry (`party.equipCategory.<characterId>`), stored per save and published with the closed catalog in `settingInfo`. `selectedPartyIndex` stays in the shared game state (decided). The selected character and the rarity and Super Rare filters remain local view context; add catalog entries if 8.2 requires retaining them.
   - 4f. (Done, Builds 60, 63–64) The tab receives only projected views (`PartyView`, `PartySummary`, projected inventory and Jewel counts, `CalculatedStatus`) and no raw game state. `tests/migratedTabs.test.cjs` is the mechanical check (reviewed imports, no reducer or `GameState`, no `state.` props, only `addStatNotifications` and `selectParty` actions). Build 63 moved saved-set availability and stable per-entry reasons into `equipmentSet`. Build 64 added independent slot-aware replacement/removal previews to the read-only `equipmentEvaluation`; the tab now formats returned defense deltas instead of importing `computeCharacterStats` or `replaceCharacterEquipment`. The localized random default name on a race change remains intentionally at the presentation boundary as an unsaved Spec 8.2.3 draft behavior, not an Application API gameplay calculation. Apply the same check to each tab as it migrates.

Gate passed: no `actions.*` reducer call remains in `PartyTab.tsx` for these controls; the Party tab renders only from its projections. Its remaining game-module imports are presentation helpers, master-data lookup/types, constants, and localized draft-name randomness guarded by `tests/migratedTabs.test.cjs`.

## Stage 6 — Base

- Item search: filtering, ordering, cursors, and pagination.
- **B1 (done, Build 81): Shop.** Shared shop facts (`src/game/shopFacts.ts`); `shopInfo`, `shopItemsList`, and the `base` projection publish the real dialogue tier, countdown, effective intimacy, and refresh price (the projection had used intimacy as the refresh count); slots are integer positions; purchase and paid refresh validate atomically at the transaction's clock (the reducers gained an explicit `now`, so an API account no longer buys from the wall-clock lineup).
- **B2 (done, Build 83): Altar and enemy forms.** Shared `src/game/altarFacts.ts`; `altarInfo`, `enemyFormList`, and the `base` projection publish real Alter levels, victories, costs, abilities, bonuses, and the reason a form is locked; `unlockForm` is validated with named reasons and returns the Prana spent.
- **B3 (done, Build 84): Inventory reads.** The `base` projection carries per-stack `sale` (shared `getStackSale`, also used by the sale itself), held `jewels`, and every worn item with its owner (`equippedItems`); `markItemsAsSeen` is precise and atomic and `changeJewelPriorityParty` validates the party. The Vault has no API (Spec 8.4.3) and stays with the application.
- **B4a (done, Build 85): Shop pane.** The Shop draws `read/observation/base` (`shop`) and buys and refreshes through `purchaseShopItems` and `paidShopRefresh`; the pane is handed none of the shop's state and imports none of its rules (typed read model in `src/api/v1/baseView.ts`).
- **B4b (done, Build 86): Altar pane.** The Altar draws `read/observation/base` (`altar`: Prana and each category's level and victories) and one `read/base/enemyFormList` read for every category (so switching category is instant), and unlocks through `unlockForm`; the pane imports none of the Alter-level, cost, or unlock rules. A form's name, abilities, and bonuses are still master data for the projected enemy ID (display helpers).
- **B4c (done, Build 87): Inventory pane.** The Inventory draws `read/observation/base`'s inventory facts (`src/api/v1/inventoryView.ts` rebuilds items and worn-item owners from their Item Format and master data): every variant with its sale, held Jewels, and every worn item with its owner. Selling, unlocking a sold variant, and the Jewel Priority Party commit through `sellInventoryItems`, `unlockSoldItems`, and `changeJewelPriorityParty`; the new-item highlight is acknowledged through `markItemsAsSeen` for exactly the displayed new variants (no more blanket acknowledgement). The Vault (debug store) has no API operation (Spec 8.4.3: no API) and remains the migration guard's one reviewed reducer exception for the Base tab.

**Stage 6 is complete.** All Base reads and commands (Shop, Altar, enemy forms, Inventory) are on the Application API, and the Shop, Altar, and Inventory panes are migrated. The Vault stays on the reducer by spec.

## Stage 7 — Diary and popup streaming

- **D1 (done, Build 88): Diary contracts and commands.** Closed semantic/legacy summaries, opaque stable entry IDs, `diary:<id>` log references, current Party identity, effective selection and filtering, exact setting values/options, and precise atomic read acknowledgement. The real mixed-history save and both adapter shapes validate.
- **D2 (done, Build 89): Diary UI migration.** `DiaryTab` renders closed API summaries and `diary:<id>` retained-log responses through `src/api/v1/diaryTabView.ts`; settings, per-entry acknowledgement, tab-exit acknowledgement, and Party-switch acknowledgement are commits. Current character display identities are projected so compact battle records use current names with their recorded appearance. Party selection remains the one reviewed shared-state action, as specified. The tab receives no raw Party/Diary save object, no longer owns an undocumented local-storage selection, and is protected by the mechanical migration guard.
- **D3 (done, Build 90): durable popup production.** The transaction authority derives language-neutral Cycle, item-drop, automatic-equipment, and Side Quest events from its immutable before/after snapshots; popup settings gate each category, controlled elapsed progression and login catch-up emit the existing per-Party AFK summary instead of event bursts, and import/reset fences the prior buffer. Events receive deterministic `revision:sequence` IDs and the complete v1 wire metadata, retain the union of the latest 256 and the last five minutes, and are written atomically with state, retained records, receipts, and revision. Persistence failure publishes nothing, receipt replay produces nothing twice, and pre-D3 prototype records are normalized before replay.
- **D4 (done, Build 91): SSE lifecycle.** The authority's `notifyPopupActivity` dependency fires after every durably committed, changed commit (never for a no-op or an idempotent receipt replay); the renderer relays it to the desktop main process over a new one-way IPC channel (`desktop:api-v1-popup-activity`), and `desktop/api-v1.cjs` pushes every open `popupEventStream` connection immediately by re-running its per-connection tick on demand. The 1-second poll remains as a resilience backstop (the same `tick`, just interval-driven) and now renews the control lease only on a tick that actually delivers an event, leaving heartbeats (still on their own 15-second, lease-independent cadence) as the only truly inert traffic. A cursor-not-found read now returns the catalogued `invalid_cursor` (400, `Specification_9.1.4_API_DETAIL.md` §9.1.4.11) instead of an uncatalogued code, cross-referenced from §9.1.4.8. Fixing the read model's cursor semantics (an absent `Last-Event-ID` now means "from the beginning of the retained buffer," with the transport layer deciding what a fresh connect actually replays) also fixed a real bug: the first event pushed after a fresh connect into an already-populated buffer could previously be silently dropped, because "no cursor" was reinterpreted as "current tail" on every tick, not just the initial connect. `commit/setting/backup/import` and `commit/setting/backup/reset` now call the same `closeStreams()` used by logout, synchronously in the same request, instead of leaving fenced streams to discover the reset on their next poll tick. Covered by `tests/apiV1PopupStream.test.cjs` (push, reconnect replay, invalid-cursor rejection on connect, mid-stream resync, synchronous close on reset/logout/shutdown) and an extension to `tests/support/apiV1Authority.profile.ts` (notify fires once per changed commit, never on replay/no-op, fires again on a confirmed reset).

**Stage 7 is complete.** Diary contracts and UI, and durable popup production and its SSE push/reconnect/fencing lifecycle, are all on the Application API.

## Stage 8 — Settings, files, delivery, Help, Resources

Most of this stage's settings/backup machinery already exists and works, found while scoping Build 94:

- Mode, theme, language, display, debug, and enemy-editor contracts (`read`/`commit` `setting/modeSelect`, `setting/debug`, `setting/enemyEditPane`) are built. Only `enemyEditPane`'s `terrainEffect`/`enemyType` valid-option lists were stubs — **done in Build 94** (see Stage 1).
- The closed `uiPreferences` catalog (`src/api/v1/uiPreferenceCatalog.ts`), published in `settingInfo.uiPreferences`, is done as a mechanism; it currently has one registered family (`party.equipCategory`) and grows as each screen migrates.
- News acknowledgement (`commit/setting/markNewsAsRead`) and Clairvoyance reset (`commit/setting/clairvoyanceReset`) are both done — real reducer dispatches, not stubs.
- Backup export, confirmed reset, and multipart import are done, including revision high-water preservation and delivery fencing (`prepareSaveReplacement`, wired through the same `resetControlEvents` path the Stage 7 D4 SSE work also uses). The remaining gap here is test coverage, not implementation: `backup/export`/`backup/import` and the `delivery_in_flight` refusal path have no dedicated tests yet.
- **Resources**: all six operations are **done** (`resources/itemCompendium`, `resources/bestiary`, `resources/glossary`, `read/setting/enemyEditPane` in Build 94; `resources/characterRoster` and `resources/clairvoyance/{p}` in Build 95 — see Stage 1).
- Help returning the current 9.1.3 and 9.1.4 documents is **entirely unbuilt** — no operation serves spec document text today (`help/overview`/`help/endpoints` are meta-API endpoints, not this).
- **Delivery sender** is **entirely unbuilt**: the `queued`/`sending`/`delivered`/`failed`/`unknown`/`cancelled` state machine (`src/api/v1/deliveries.ts`) and the reward-completion transaction (`deliveryCompletion.ts`) exist and are tested in isolation, but nothing ever moves a job past `queued` — no network call, no attachment-byte assembly, no claim/settle loop wired into production. The existing Discord webhook call in `HomeScreen.tsx` (`postWebhookWithFiles`, used by the header's reviewed-exception Report Progress button) is the pattern to generalize, not duplicate.
- Then migrate Settings and the remaining retained UI preferences (depends on nothing above except the small enemy-editor gap, already closed).

## Stage 9 — Conformance hardening and public cutover

Conformance matrix, for every applicable operation: success, invalid input, stale revision, receipt replay, idempotency conflict, tombstone rejection, persistence rollback, confirmation expiry and replay, environment and unlock restrictions, no partial mutation.

Lifecycle coverage: simultaneous duplicates, lost responses, receipt eviction, login catch-up, account switching and crash recovery, renderer loss, lease expiry, SSE reconnect and resync, import/reset fencing, shutdown draining, external-delivery ambiguity. Run canonical fixtures through both adapters and compare after excluding transport metadata.

**UI ownership audit.** For every screen control and state value, classify it as projection-owned, explicit-commit-owned, local-only, or trusted-desktop-only. Cutover is blocked if a migrated screen reads the complete persisted save directly, mutates the reducer outside the Application API, persists UI state under an undocumented key, or receives privileged desktop data through a generic bridge.

Add a mechanical check so this does not rely on review: a test that fails if a migrated tab file imports reducer actions or the full `GameState` for an area marked migrated. `HomeScreen.tsx` (about 5,200 lines) and `useGameState.ts` (about 5,300 lines) make manual audits easy to miss.

**Cutover.**
- Change the production `allowEnable` gate to a public opt-in and show the API settings panel in packaged desktop builds.
- Keep loopback-only binding and the secure connection file. Confirm the bootstrap token never appears in the DOM, logs, URLs, help, or saves.
- Search-verify that no runtime route, alias, script, or test references the retired endpoint.
- Run `npm test`, `npm run build`, `npm run api:v1:check`, `npm run test:api:desktop`, the persistence-failure suites, and the relevant AFK/performance suites.
- Per AGENTS.md the build number increments after every runtime change; the cutover build gets its own changelog entry.

## Test data

`sample_savedata/Exp8,7,6,5,4,3_set_for_test_v0.9.3_dev_20260820.kemoz` is a real, heavy save (six parties, 36 characters, 2,300 item variants, Super Rare titles up to 82, 34 Jewel types, Mimorian, Avian, and Orcinian members). `tests/apiV1SampleSave.test.cjs` runs the Party projections and equipment commands against it and validates every response against the published schemas; extend it for each new projection and command. It found the empty-slot and Super Rare 81–82 schema defects in Build 55, which a fresh save cannot reach. An older save's `savedEquipmentSets` is normalized by the app's load path, not by `hydrateGameState`.

## Cleanup to schedule

- `src/api/v1/battleLogs.ts` lines 88 and 150 carry `SpecRef: 9.1.3 | Experimental AI API`, a title that does not exist in the spec (violates section 10.3). Point them at real 9.1.3 / 9.1.4 sections.
- Rename `getExperimentalDiaryTitle` in `src/components/home/homeShared.tsx`.
- `playing_guide/Playing_Guide_Recommended_Opening_Build.md` is still titled "Experimental API".
- `AI_play_report/` holds retired evaluation reports; section 12 says they are inert. The cutover retired-endpoint search should exclude the directory explicitly.
- Show a user-facing message when a rejected character edit fails (currently console-only).

## Recommended order

1. ~~Stage 7 D4: complete the SSE lifecycle over the durable D3 event buffer.~~ (Done, Build 91.)
2. ~~Finish the Stage 4 header UI migration.~~ (Done, Build 92.)
3. Stage 8: all 6 `Type.Unknown` Resource rows closed (Builds 94-95); Stage 1's contract catalog is now complete. Still open, roughly in order: backup/import/reset test coverage; Help document-serving; the delivery sender; then Settings UI migration.
4. Stage 9 (conformance matrix, ownership audit, cutover).

## Expedition tab migration (in progress)

Slices, in order:
- **E1 (done, Build 74): commands.** Destination, mode, depth limit, and difficulty offset changes are `changeExpedition` commits, now validated against the same shared choices that `read/expedition/{p}/setting` publishes (`src/game/expeditionSettings.ts`). The Sortie and Gods Battle buttons commit through the API (`triggerSortie` keeps only its popups).
- **E2 (done, Build 77): pane rows from the projection.** State, progress, HP, charge, floor and outcome, gates, side quest, and controls come from `read/observation/expedition`, re-reading at `nextChangeAt`; the tab no longer takes `partyCycles`. The raw retained log remains only for E3 narration, with its visible room boundary taken from the server-gated projection.
- **E3 (done, Build 78): logs.** The Expedition tab reads `latestBattleLog` through the trusted in-process adapter. `buildExpeditionLogView` makes the API's summary, reward, and room facts authoritative, supplies localized fallback narration from the public semantic event rows when retained detail is unavailable, and keeps retained log data confined to the adapter boundary for legacy/compact narration fields intentionally absent from the public wire shape. The tab no longer reads `party.lastExpeditionLog` directly.
- **E4 (done, Build 76): forecast.** The pane's forecast is `simulationRun` read through the in-process adapter and rebuilt losslessly (`parseSimulationRunData`); the running count is replaced by a plain "Simulating" label because the read reports no partial progress. The statistics Reset button now commits `resetStatistics` (Spec 9.1.3, 3-2-4, Build 75), so the Expedition tab is handed no reducer action.

**E3 review fixes (Build 79).** Two defects were found in the first E3 adapter: an exploring party's pane showed the previous expedition's rooms (the tab sliced the disclosed log by the running exploration's revealed count), and retained narration was matched to projection rooms by room number alone. The Expedition projection's `exploration` now carries the revealed rooms in full, the pane renders those, and retained narration is used only for a room that matches on every shared fact (`retainedRoomMatches`). Narration still comes from the retained log held by the renderer, as recorded for E3; projecting a narratable form remains an open decision.

**E3 closed (Build 82).** The narration gap is closed by design: Specification 9.1.3, 2-2-2 now returns `resources` (the stored language-neutral records, the enemy as met, and a legacy record's saved prose), and the Expedition projection's `exploration.resources` does the same for the revealed rooms. The pane's log view is rebuilt from API responses alone (`buildExpeditionLogView`); the game state's retained log is no longer an input, so the approximate fallback narration and the room-matching guard of Build 79 are gone. Rendering from the response is checked to be identical to rendering the retained record, for every room of a real save and for a freshly resolved compact expedition. `useApiReadMany` keeps its last result while disabled, so a hidden tab no longer comes back empty.
