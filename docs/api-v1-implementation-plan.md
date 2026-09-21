# `/api/v1` implementation plan

Status as of v0.9.7 Build 67. `/api/v1` stays **test-only** (`allowEnable` is set only by the desktop `--api-v1-test` flag) until every public-cutover gate in Stage 9 passes.

Contracts: `Specification_9.1.3_API.md` (product intent) and `Specification_9.1.4_API_DETAIL.md` (transport, consistency, security). Gameplay and UI sections take precedence over both.

This document supersedes the earlier "Build 23" plan. Stages are numbered once, below.

## Status summary

| Stage | Area | State |
|---|---|---|
| 1 | Contract catalog | Mostly done; 11 `Type.Unknown` and placeholder payloads remain (see Stage 1) |
| 2 | Standalone Application API and authority | Done (foundation) |
| 3 | HTTP transport and sessions | Implemented, test-only |
| 4 | Expedition and shell | Blocked on extracting the party cycle from `HomeScreen`; UI not migrated |
| 5 | Party, character, equipment | Done (UI projection complete) |
| 6 | Base, inventory, shop, Altar | Runtime early, UI not migrated |
| 7 | Diary and popup streaming | Foundation only |
| 8 | Settings, files, delivery, Help, Resources | Partial |
| 9 | Conformance hardening and public cutover | Not started |

## Done so far

- All 84 routes are cataloged, generated (`npm run api:v1:check`), and validated with TypeBox/Ajv, including response envelopes, stable errors, and per-operation error lists.
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

## Stage 1 — Close the contract catalog (next)

`scripts/generate-api-v1-contract.mjs` still has 11 `Type.Unknown` and several implementations are placeholders. Inventory (each needs a concrete schema, an example, an implementation, and a parity-fixture case):

| Operation | Gap |
|---|---|
| `read/expedition/{p}/latestBattleLog` | Done in Build 67 (public log shape, `logId`, bottleneck enemies with `EnemyStatus`). Still to do with 4b: no-spoiler timing (the log must not be readable before the end of `state.explore`). |
| `read/expedition/{p}/simulationRun` | Done in Build 66 (compact strings, percentages, structured rooms with HP buckets). |
| `read/observation/expedition` and `compact` | `state` is faked (`state.rest` or `state.idle` from HP); no step progress, timing, Clear-Gate, side-quest, or Diary references; `disclosedFloor` and `disclosedOutcome` read `lastExpeditionLog` directly (no-spoiler timing not enforced). |
| `read/observation/diary`, `diaryEntry/{id}` | `metadata` is `Unknown`; semantic and legacy content and battle-log references are incomplete. |
| `read/base/shopInfo` | Default dialogue key and `paidRefreshCountdown: 0` are placeholders (intimacy dialogue tiers and the refresh countdown exist in the game). |
| `read/base/altarInfo`, `enemyFormList` | Donations and victories are dumped raw; `unlockCost` is 0, `enemyBonus` is `[]`, `unlockCondition` is null; Alter level and Prana cost rules (8.4.5) are not projected. |
| `resources/clairvoyance/{p}` | Returns empty objects although the bag state exists. |
| `resources/glossary` | `entries` is always `[]`. |
| `resources/itemCompendium` | `ability` and `otherBonus` are `[]`; `cBonus` is a raw bonus object. Reuse `describeItem`. |
| `resources/characterRoster`, `resources/bestiary` | Raw master-data objects (`race.stats`, `ENEMIES`), not a public shape. Bestiary should reuse `EnemyStatus` (Build 67); add the encounter and defeat counts and the reveal rules of 8.6. |
| `read/setting/enemyEditPane` | `terrainEffect` is `['none']` and `enemyType` is `[]`. |

Gate: no `Type.Unknown`, no `{}` or `[]` stand-in for real data, no raw master-data or save object in a response; `api:v1:check` reproducible; every operation has one in-process and one HTTP parity fixture.

## Stage 4 — Expedition and shell (largest remaining piece)

**Finding that reshapes this stage.** The party state machine (`state.rest`, `state.move`, `state.explore`, and so on, with `stateStartedAt`, `durationMs`, sortie source state, and Gods Battle flag) lives only in `HomeScreen.tsx` as `partyCycles` (19 references in a 5,390-line component) and in the separate persisted runtime snapshot. The Application API cannot see it: the API `sortie` is a shorter reimplementation (consume stock, clear profit, heal, resolve) that skips the runtime rules in Spec 5.1.1 (finish the current state and gain items first, the emergency-embezzlement notification, refusal at 0 HP, ending at the start of `state.rest`), so an API sortie and a UI sortie can differ. Migrating the Expedition tab before fixing this would either freeze the fake `state` into the contract or force the tab to keep reading `partyCycles`.

Order:
1. **4a. Extract the party cycle into a React-free module** (`src/game/partyCycle*.ts`): transitions, duration modifiers, profit usage, sortie, Gods Battle trigger, condition update. `HomeScreen` calls it; behavior must not change (characterization tests over recorded transitions, and the AFK equivalence gate).
2. **4b. Put the cycle snapshot behind the authority**: `partyCycles` and the emulated clock become part of the committed snapshot (or a port it reads), so reads project the real state and every mutation, including `elapsed` and `sortie`, goes through the module from 4a. Decide how the persisted runtime snapshot and the API-account store hold it.
3. **4c. Rewrite `sortie` and `godsBattle`** on that module (one shared implementation), returning outcome, return reason, rewards, Diary reference, and retained-log reference.
4. **4d. Complete the projections**: `expedition`, `compact`, `overview` (header, progress report), `{p}/setting`, `chargeStock`, `latestBattleLog` (public battle-log shape, no-spoiler timing), and `simulationRun` (exact 100/1,000 isolated runs, structured room table).
5. **4e. Migrate the header and the Expedition tab** (destination, depth limit, difficulty, sortie, Gods Battle, simulation graph, charge, side quest, log expansion) to projections and commands; add the guard to `migratedTabs.test.cjs`. Continuous progress bars interpolate from the projected start and expected end times on the client.

Risk: 4a touches the most delicate runtime code. Gate: no gameplay difference in the AFK regression suites and the online transition tests before any API change.

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
- Shop lineup and exact purchase results; atomic sell / purchase / unlock validation; paid refresh (charge and lineup replacement idempotent).
- Altar and enemy-form facts.
- Stable variant-key highlighting with `markItemsAsSeen`.
- Then migrate the Base panes (Shop, Inventory, Vault, Altar).

## Stage 7 — Diary and popup streaming

- Diary projections: semantic and legacy entries, current-name versus historical-appearance battle logs, stable entry and log IDs, party filtering, exact notification settings.
- SSE: persist popup events with the committing transaction, push to open streams, replay from `Last-Event-ID`, retain at least 256 events or five minutes, emit `resyncRequired` on invalid or fenced cursors, close streams on logout / expiry / reset / import / shutdown, keep heartbeats independent of lease renewal, group AFK events per the existing notification rules.
- Migrate the Diary UI; leaving a party tab marks that party's entries read through the explicit command.

## Stage 8 — Settings, files, delivery, Help, Resources

- Mode, theme, language, display, debug, and enemy-editor contracts.
- Closed `uiPreferences` catalog with exact types and valid options, published in `settingInfo.uiPreferences`.
- News acknowledgement and Clairvoyance reset operations.
- Backup export, confirmed reset, and multipart import, with revision high-water preservation and cursor fencing. Import and reset refuse while a delivery send is in flight and cancel queued jobs.
- Help returns the current 9.1.3 and 9.1.4 documents; Resource endpoints use stable IDs and raw numeric facts.
- **Delivery sender:** wire the real network sender and the immutable attachment bytes (backup, retained log, images). Retry only confirmed pre-send failures; ambiguous outcomes stay `unknown`. Rewards only after confirmed delivery. Move this earlier if delivery blocks Settings work.
- Then migrate Settings and the remaining retained UI preferences.

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

1. Close the Builds 62–64 review points (batch bound, per-change cost, parity case).
2. Stage 1 contract-fidelity closure (the table above), starting with the operations Stage 4 consumes (`latestBattleLog`, `simulationRun`, `expedition`, `compact`, `overview`).
3. Stage 4a–4e (extract the party cycle, then project and migrate Expedition and the header).
4. Stage 6 (Base), including its Stage 1 rows (shop, Altar, enemy form).
5. Stage 7 (Diary and streaming), including `diary` and battle-log rows.
6. Stage 8 (Settings, files, delivery sender, Help, Resources), including the resource rows.
7. Stage 9 (conformance matrix, ownership audit, cutover).
