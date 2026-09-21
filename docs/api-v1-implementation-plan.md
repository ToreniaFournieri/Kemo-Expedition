# `/api/v1` implementation plan

Status as of v0.9.7 Build 46. `/api/v1` stays **test-only** (`allowEnable` is set only by the desktop `--api-v1-test` flag) until every public-cutover gate in Stage 9 passes.

Contracts: `Specification_9.1.3_API.md` (product intent) and `Specification_9.1.4_API_DETAIL.md` (transport, consistency, security). Gameplay and UI sections take precedence over both.

This document supersedes the earlier "Build 23" plan. Stages are numbered once, below.

## Status summary

| Stage | Area | State |
|---|---|---|
| 1 | Contract catalog | Mostly done |
| 2 | Standalone Application API and authority | Done (foundation) |
| 3 | HTTP transport and sessions | Implemented, test-only |
| 4 | Expedition and shell | Runtime present, UI not migrated |
| 5 | Party, character, equipment | **In progress** |
| 6 | Base, inventory, shop, Altar | Runtime early, UI not migrated |
| 7 | Diary and popup streaming | Foundation only |
| 8 | Settings, files, delivery, Help, Resources | Partial |
| 9 | Conformance hardening and public cutover | Not started |

## Done so far

- All 83 routes are cataloged, generated (`npm run api:v1:check`), and validated with TypeBox/Ajv, including response envelopes, stable errors, and per-operation error lists.
- The Application API (`src/api/v1/applicationApi.ts`) is transport-neutral. `HomeScreen.tsx` supplies runtime ports only.
- The serialized authority provides revisions, receipts, tombstones, admitted-duplicate handling, durable confirmation reservations, rollback, isolated RNG, and atomic multi-Chunk elapsed progression.
- API-account storage is manifest-last; login stages catch-up privately and logout restores the flushed player save.
- The delivery state machine (queued / sending / delivered / failed / unknown / cancelled) and reward completion transaction exist. No network sender is wired.
- Party deity, member ordering, character editing (Build 38), and the equipment controls (Builds 40–41: equip, atomic replace via `targetSlot`, lock, Jewels, Remove All, Auto Equipment) go through the trusted in-process adapter.
- `calculatedStatus` and the sell/purchase results now use the public payload shapes (Build 39).
- Equipment commands are atomic: slot commands, `equip`, exact and confirmed partial set load, Undo/Redo validation, build-change validation and confirmation, and Auto Equipment reports.

## Stage 1 — Close the contract catalog

Remaining:
- (Done, Build 39) `calculatedStatus` and the sell/purchase results.
- Sweep the remaining projections for foundation-level or placeholder payloads and give each a concrete schema.

Do this **before** migrating the Party and Base UI. Those screens consume these payloads, so migrating first means reworking them.

Gate: every operation has concrete request, success, and error schemas; no fallback `{}` payloads; `api:v1:check` reproducible.

## Stage 4 — Expedition and shell

- Complete the compact, overview, and Expedition projections, including no-spoiler timing (latest floor and outcome update only at the end of `state.explore`).
- Complete structured 1,000-run simulation output and sortie / Gods Battle effects, rewards, return reasons, and log references.
- Migrate the header and the Expedition tab (destination, depth limit, difficulty offset, sortie, Gods Battle, simulation run) to the in-process adapter.

## Stage 5 — Party, character, equipment (current)

Done: deity, ordering, character build editing, equipment controls, equipment sets, and Undo/Redo.

Next, in order:
1. (Done, Build 40) Equipment controls.
2. (Done, Build 42) Equipment sets: save, load with the confirmation choice, rename, delete.
3. (Done, Build 43) Undo/Redo use the API's per-character history and the equipment projection's availability.
4. **Party reads** (in progress; `PartyTab.tsx` is about 3,000 lines built on `Party`, `Character`, `Item`, and computed-stats objects, so it is migrated in steps):
   - 4a. (Done, Build 45) Saved equipment sets and the deity pane (donations, unlocked gods) render from projections; shared item wire-format module.
   - 4b. (Done, Build 46) Owned inventory for equipping and the Jewel counts, from `searchItems` (`category: jewel` lists Jewel stacks). Pagination and the ability/bonus search remain with Stage 6.
   - 4c. Character and member list: the identity fields, build options, and calculated status, from `read/build/character/{characterId}/status`. The status pane also needs bonus and ability display facts beyond `calculatedStatus`; decide whether to enrich the projection or resolve them from master data.
   - 4d. Equipment slots list from the `equipment` projection (entries parse to items through the shared format).
   - 4e. Retained selections (selected party and character, filters) through `uiPreferences`. Selected party is currently persisted in the save (`selectedPartyIndex`), so moving it changes what is persisted; decide first.
   - 4f. Remove the `Party`, `Character`, `ComputedCharacterStats`, and inventory props, and add the mechanical check described in Stage 9.
   - Open design question: the projections must carry enough display facts (per-entry availability of a saved set, bonus and ability facts). Prefer additive members under 9.1.4.1 and update Spec 9.1.3 to match.

Gate: no `actions.*` reducer call remains in `PartyTab.tsx` for these controls; the Party tab renders only from its projections.

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

## Cleanup to schedule

- `src/api/v1/battleLogs.ts` lines 88 and 150 carry `SpecRef: 9.1.3 | Experimental AI API`, a title that does not exist in the spec (violates section 10.3). Point them at real 9.1.3 / 9.1.4 sections.
- Rename `getExperimentalDiaryTitle` in `src/components/home/homeShared.tsx`.
- `playing_guide/Playing_Guide_Recommended_Opening_Build.md` is still titled "Experimental API".
- `AI_play_report/` holds retired evaluation reports; section 12 says they are inert. The cutover retired-endpoint search should exclude the directory explicitly.
- Show a user-facing message when a rejected character edit fails (currently console-only).

## Recommended order

1. Stage 1 fixes for `calculatedStatus` and the sell/purchase results.
2. Stage 5 items 1–4 (equipment controls through Party reads).
3. Stage 4 UI migration (header and Expedition).
4. Stage 6 (Base).
5. Stage 7 (Diary and streaming).
6. Stage 8 (Settings, files, delivery sender, Help, Resources).
7. Stage 9 (conformance matrix, ownership audit, cutover).
