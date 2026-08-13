# BOKEMO v0.9.3 - SPECIFICATION

- 1. OVERVIEW
    - Text-based, deterministic fantasy RPG
    - Support Japanese, English and Chinese (zh-CN, zh-TW) language. 
    - Tetris like randomness. (Bag Randomization)
    - Data persistence 

- 2. World setting
    - The world is fragmented into unexplored regions filled with ancient creatures and forgotten relics.
    - Each expedition is guided by a single deity, who manifests power through a chosen party to restore balance and reclaim lost knowledge. 

## 1. CONSTANTS 

### 1.1 CONSTANTS_GLOSSARY
- @Specification_1.1_CONSTANTS_GLOSSARY.md

### 1.2 CONSTANTS_GLOBAL
- @Specification_1.2_CONSTANTS_GLOBAL.md

## 2. CHARACTER_&_PARTY

### 2.1 CHARACTER_&_PARTY
- @Specification_2.1_CHARACTER_&_PARTY.md 

### 2.2 CHARACTER_&_PARTY_MASTER_DATA
- @Specification_2.2_CHARACTER_&_PARTY_MASTER_DATA.md

## 3. ITEM

### 3.1 ITEM
- @Specification_3.1_ITEM.md

### 3.2 ITEM_MASTER_DATA
- @Specification_3.2_ITEM_MASTER_DATA.md

## 4. EXPEDITION_&_ENEMY

### 4.1 EXPEDITION_&_ENEMY
- @Specification_4.1_EXPEDITION_&_ENEMY.md

### 4.2 EXPEDITION_&_ENEMY_MASTER_DATA
- @Specification_4.2_EXPEDITION_&_ENEMY_MASTER_DATA.md

## 5. PROGRESS

### 5.1 PROGRESS
- @Specification_5.1_PROGRESS.md

### 5.2 PROGRESS_FLAVOR_TEXT
- @Specification_5.2_PROGRESS_FLAVOR_TEXT.md

## 6. BATTLE

### 6.1 BATTLE
- @Specification_6.1_BATTLE.md

## 7. AUTOMATION

### 7.1 AUTOMATION
- @Specification_7.1_AUTOMATION.md

## 8. UI

### 8.1 UI_FOUNDATIONS
- @Specification_8.1_UI_FOUNDATIONS.md

### 8.2 UI_PARTY
- @Specification_8.2_UI_PARTY.md

### 8.3 UI_EXPEDITION
- @Specification_8.3_UI_EXPEDITION.md

### 8.4 UI_BASE
- @Specification_8.4_UI_BASE.md

### 8.5 UI_DIARY
- @Specification_8.5_UI_DIARY.md

### 8.6 UI_SETTING
- @Specification_8.6_UI_SETTING.md


## 9. Environment
**Branch:**
  - `main` → `/dev/`
  - `beta` → `/beta/`
  - `prod` → `/`
**Environment:**
  - `/dev/`: 開発環境
    - Debug mode: ON
    - Speed of time: x20 hyper 
  - `/beta/`: 検証機
    - Debug mode: ON
    - Theme: `m.laika` (fixed; not user-configurable)
  - `/` : 本番環境
    - Debug mode: OFF
    - Speed of time: x1
**Save Data Isolation:** Save data must be namespaced per environment (example: `/dev/`, `/beta/`, and `/`) and never shared between them.
- **Desktop launch mapping:** `npm run desktop:dev` must load `/dev/`, `npm run desktop:beta` must load `/beta/`, and `npm run desktop:prod` plus packaged desktop releases must load `/`. The desktop custom protocol must serve the same built assets beneath each environment path without sharing their persisted save data.

### 9.1 Desktop distribution
- The production browser bundle must also be distributable as a macOS desktop application without requiring the user to start or manage a local web server.
- The desktop renderer must use the same relative Vite assets, language query handling, browser persistence, and backup import/export behavior as the browser distribution.
- Desktop web storage must use a stable application origin and profile so save data survives application upgrades. Renderer code must not have access to Node.js APIs; context isolation must be enabled and Node integration disabled.
- Releases must retain the complete `bokemo-<version>-browser.zip` artifact and additionally provide Finder-installable DMG and zipped application artifacts for both Apple Silicon and Intel Macs (or one documented universal application).
- The application bundle must define a stable bundle identifier, application name and version, the macOS icon, and the minimum supported macOS version.
- Public macOS release artifacts must be code-signed and notarized using CI secrets when release credentials are available. Unsigned packages are development-only and must be documented accordingly.

#### 9.1.1 macOS background lifecycle and native notifications
- This policy applies only to the packaged macOS desktop application. It must not alter notification or window-lifecycle behavior in the browser distribution.
- Closing the desktop window may hide it without terminating the renderer so that local progression can continue. While hidden, the application must retain its Dock icon and provide a macOS menu-bar item with explicit `Open BoKemo` and `Quit BoKemo` actions.
- Local progression and timely native notifications are available only while the Mac is awake and the BoKemo process remains running. No timely delivery is guaranteed while macOS is asleep or after the application has fully quit.
- Native notifications must use each party's existing Diary notification filters. The player must be able to select either `Hidden only` or `Always` delivery; `Hidden only` is the default.
- Individual native notifications triggered by an item drop must use the exact localized full display name of every matching dropped item as the notification title, including its Super Rare title, enhancement title, and attached Jewel label. The generic rarity trigger label may be used only when the matching item data is unavailable.
- After macOS sleep or a full application restart, AFK catch-up must issue at most one grouped native summary rather than one native notification per recovered event. Event details must remain available in the Diary.
- Clicking an individual Diary notification must restore BoKemo and open the relevant party and Diary entry. Clicking an AFK summary must restore BoKemo and open the Diary.
- Starting BoKemo at macOS login must be optional and disabled by default. When enabled, BoKemo must launch hidden in the menu bar without opening its main window.
- If macOS notification permission is denied, local saves, progression, Diary records, and in-application notifications must continue to function normally.

#### 9.1.2 macOS menu-bar Party Progress pane
- The packaged macOS desktop application must provide a read-only `Party Progress` pane opened from BoKemo's existing menu-bar item. This pane replaces the previously specified native WidgetKit extension and must not depend on WidgetKit, an App Group entitlement, or a separate third-party widget service.
- The pane must be implemented as a secondary Electron `BrowserWindow` owned by the main process and must use the same packaged application assets and active desktop environment as the main BoKemo window.
- The pane must be frameless, non-resizable, omitted from the Dock and application switcher, and positioned beneath or adjacent to the BoKemo menu-bar item. It must close or hide when it loses focus, when the menu-bar item is clicked again, or when BoKemo quits.
- Left-clicking the BoKemo menu-bar item must toggle the Party Progress pane. Right-clicking it must open a context menu containing `Open BoKemo`, the existing launch-at-login control, and `Quit BoKemo`. `Open BoKemo` must restore and focus the main window.
- The pane must display every unlocked party in a compact list sized so that all six party rows fit within the standard pane without scrolling. Vertical scrolling may remain only as a fallback for accessibility text scaling or reduced available screen space. Each party row must mirror the compact party-pane information defined in section 8.3: the party name exactly once, latest disclosed expedition floor, Instant Expedition charge battery and timer, latest disclosed outcome, compact Clear-Gate and side-quest summaries, current localized state and primary progress, Step sub-progress placeholder/bar, and current/max HP. The same no-spoiler update timing for latest floor and outcome must apply while `state.explore` is active.
- The pane must display the total unread Diary count when it is greater than zero and provide an `Open BoKemo` action. Activating a party row must restore BoKemo and select that party without changing its expedition or automation state.
- State labels, controls, and displayed game data must use the language and visual theme currently selected in BoKemo. Numeric values must follow the formatting rule in section 10.4.
- Pane progress must follow the progress-bar behavior defined in section 5.1.1: continuous states update smoothly from their persisted start and expected end times, while step-based states display completed Steps against the state's initial total Steps. `state.idle` must display an idle status without a progress bar.
- The pane is informational except for opening or navigating the main BoKemo window. It must not expose controls that start expeditions, change automation, spend resources, or otherwise mutate game state.
- The main renderer must share only the minimum display snapshot required by the pane through the context-isolated desktop bridge. The pane renderer must not receive or access BoKemo's complete save data or Node.js APIs; context isolation must be enabled, Node integration disabled, and renderer sandboxing enabled.
- Pane state must remain isolated between the `dev`, `beta`, and production environments defined in section 9. The pane must display only the data belonging to the environment of its containing desktop process.
- While BoKemo is running, pane content must update from live runtime state without WidgetKit scheduling limitations. When BoKemo fully quits, the pane must also quit and must not simulate progression independently.
- Missing, invalid, incompatible, or unavailable snapshot data must show a localized prompt to open the main BoKemo window. These conditions must not affect local saves, progression, Diary records, native notifications, or the browser distribution.

#### 9.1.3 Experimental AI API

**Purpose and availability**
- The packaged desktop application must provide an experimental localhost HTTP/JSON API for AI-controlled play of the active BoKemo save.
- The API must be available in the `dev`, `beta`, and production desktop environments, disabled by default, and enabled through an `Experimental AI API` toggle in Settings.
- The API server must bind only to a loopback address, select an available local port, and require a generated bearer token displayed in Settings.
- API state and access must follow the environment and save-data isolation rules in section 9. An API running in `/dev/`, `/beta/`, or `/` must access only the active save belonging to that environment.
- The browser distribution must not expose the localhost API.
- All endpoints must use JSON and be versioned under `/experimental/v1`.

**Authentication, control, and revision**
- Except for a minimal unauthenticated status response, every request must include `Authorization: Bearer <token>`.
- Only one API controller may hold control at a time.
- `POST /experimental/v1/control/acquire` acquires an exclusive API-control lease. While the lease is held, gameplay remains visible but every state-mutating UI control is disabled.
- `POST /experimental/v1/control/release` persists the current state, releases the lease, and restores normal UI control.
- A lease uses a five-minute sliding inactivity timeout. Successful lease-owned observation, build-options, retained battle-log, Diary-entry list, command, and sortie calls renew it; status does not. Releasing the lease, inactivity expiry, disabling the API, or quitting the application must end API control safely.
- Each observation must include a monotonically increasing state `revision`.
- Every mutating request must include `expectedRevision`. If it does not equal the current revision, reject the request without changing state or advancing simulation.
- Mutating API operations must be serialized so that API and UI mutations cannot interleave.

**Endpoints**
- Detailed endpoint contracts are defined in @Specification_9.1.3_API_ENDPOINTS.md. That document is normative and uses an OpenAPI-compatible operation structure.
- `GET /experimental/v1/status`
  - Returns public API availability without authentication, or authenticated compatibility, runtime-readiness, revision, and control-lease status fields.
- `GET /experimental/v1/observation`
  - Returns the current AI-safe observation and the strategic commands currently legal for each party.
- `GET /experimental/v1/parties/{partyId}/battle-log/latest`
  - Returns the specified party's latest fully disclosed expedition and battle log already retained by the runtime.
- `GET /experimental/v1/diary-entries`
  - Lists metadata and expedition summaries for the globally retained Diary entries without marking them as read.
- `GET /experimental/v1/diary-entries/{diaryEntryId}/battle-log`
  - Returns the expedition and battle log embedded in one currently retained Diary entry.
- `POST /experimental/v1/command`
  - Applies one strategic command. Configuration commands do not advance game time; the explicitly selected single-run Gods Battle command resolves one immediate Cycle.
- `POST /experimental/v1/sortie`
  - Synchronously resolves 1 to 100 API-only normal expedition Cycles for one specified party.

**Observation**
- The observation must include:
  - schema version, revision, simulated timestamp, and active environment;
  - currencies and progression unlocks;
  - each party's HP, level and XP, condition, deity, side quest, Clear-Gates, and Gods Battle readiness;
  - each party's expedition destination mode and selected dungeon, depth limit, and difficulty offset;
  - the global auto-run configuration;
  - character order and builds, computed combat summaries, auto-equipment modes, and equipment locks;
  - inventory summaries required to understand automatic-equipment decisions;
  - the latest expedition result and currently legal strategic commands.
- Stable IDs and raw numeric values are authoritative. Localized strings may be included only as optional display metadata.
- The observation must not expose future random rolls, bag contents or order, hidden enemies, undisclosed exploration outcomes, the complete save data, or internal renderer fields.

**Strategic commands**
- The API may expose only the following strategic commands, subject to the same availability and validation rules as the UI and the explicit API exceptions in section 9.1.3:
  - change a character's selectable race, gender, lineage, predisposition, main class, sub class, Mimorian form, or name; race and gender must satisfy the same paired uniqueness, availability, and Mimorian restrictions as the UI;
  - reorder party members;
  - change a party's deity;
  - set each character's automatic-equipment mode;
  - immediately run configured automatic equipment for every member of one party or for one specified character;
  - toggle locks on currently equipped items;
  - select the Jewel Priority Party;
  - set a party's expedition destination mode or dungeon, depth limit, and difficulty offset;
  - set the global auto-run mode;
  - initiate one Gods Battle through a separate single-run command when its normal gate and availability rules are satisfied.
- The API must not expose:
  - direct combat actions;
  - direct equipment-slot selection or Jewel attachment;
  - repeated Gods Battles;
  - shop purchases, manual selling, Altar unlocks, or Diary management;
  - debug actions, bag inspection or reset, save import/export/reset, direct currency edits, direct healing, or internal state transitions;
  - combat formulas or random-roll functions as separately callable operations.
- Listing retained Diary entries and reading their already-retained battle logs through the GET endpoints above is read-only access, not Diary management. The API must not mark entries as read, delete them, change Diary settings, or alter retention.

**API batch sortie request**
- `POST /experimental/v1/sortie` accepts:

```json
{
  "expectedRevision": 123,
  "partyId": 1,
  "count": 10
}
```

- `partyId` must identify one unlocked party.
- `count` must be an integer from 1 through 100 inclusive.
- The party's currently selected normal expedition, depth limit, difficulty offset, deity, characters, and automation configuration apply to every Cycle.
- Gods Battles must not be accepted by the batch sortie endpoint.
- An invalid party, destination, count, or initial configuration must reject the complete request before any Cycle runs.
- Once accepted, the engine must complete exactly `count` Cycles unless an unrecoverable internal or save error occurs.

**API batch sortie progression**
- Each requested sortie resolves one complete immediate Cycle through the authoritative game engine, including:
  - rest and recovery;
  - selling and reward finalization;
  - free action, optional sleep, prayer, donation, and savings;
  - movement, exploration, battles, return, side quests, Clear-Gates, rewards, XP, unlocks, and automation.
- Cycle durations and time-dependent effects must be simulated immediately for the selected party according to the normal Step rules. This uses party-local simulated elapsed time: the API client never waits for real-world progression, the global runtime clock does not advance, and no other party's state, side quest, deadline, charge timer, or automation progresses.
- Each requested Cycle begins at `state.rest` and finishes after the ending `state.rest` completes, following the canonical Cycle boundary in section 5.1.
- Cycles must execute sequentially so every result affects the following Cycle.
- A defeat must not truncate an accepted batch. The following Cycle must perform the normal rest and recovery required before its expedition.
- Clear-Gate turn-backs, wounded retreats, draws, and defeats count as completed sortie attempts.
- API sorties have unlimited charge:
  - they must never check or consume `instantExpeditionStock`;
  - they must never start, stop, accelerate, refill, or otherwise modify the visible Instant Expedition charge battery or timer;
  - they must not grant unlimited charges to UI sorties.
- The complete accepted batch is one serialized API operation. No other API or UI mutation may interleave with its Cycles.
- On success, persist once after the complete batch and increment the state revision.
- On an unexpected resolution or persistence failure, return an error and do not expose or persist a partially committed batch.

**API batch sortie response**
- A successful batch response must include:
  - requested and completed counts, which must be equal;
  - starting and ending revisions;
  - party ID and dungeon ID;
  - aggregate `Clear`, `Turned_Back`, `Draw_Retreat`, `Wounded_Retreat`, and `Defeat` counts;
  - total XP, Gold, donations, savings, items, auto-sold items, Jewels, and Prana gained;
  - side quests assigned, completed, cancelled, or expired;
  - bosses, Gods Battle gates, parties, and other progression unlocked;
  - concise per-sortie summaries in execution order;
  - the final party observation and currently legal actions.
- The response must not return every room or combat-log entry for all Cycles by default. Existing latest-result and Diary retention rules continue to govern detailed logs.

**Errors and implementation boundaries**
- The API must return stable machine-readable error codes for authentication failure, unavailable or expired lease, validation failure, illegal action, stale revision, save-load failure, and internal failure.
- The Electron main process owns the authenticated loopback listener. The renderer remains the authoritative owner of game simulation and environment-scoped persistence.
- Main-process and renderer communication must use narrowly scoped, context-isolated IPC. Renderer code must not receive Node.js access, and auxiliary renderers must not receive complete save data.
- API commands must be validated through the same unlock, resource, selection, HP, and progression rules used by the UI, except for the explicit unlimited-charge and batch-continuation rules above.
- If save loading fails, API control must be refused and the protections in section 5.1.4 apply. The existing save must not be overwritten.
- Implementation entry points for the API listener, IPC bridge, validation, batch resolution, persistence, and UI control lock must use `SpecRef: 9.1.3 | Experimental AI API | <anchor>` comments with the corresponding anchor from this section.

## 10. Coding Rule: SpecRef Traceability
- To ensure traceability between specification and implementation, developers must annotate relevant code blocks with SpecRef comments.

### 10.1 Format (mandatory)

```
// SpecRef: <SectionID> | <SectionTitle> | <Anchor>
```

### 10.2 Examples
```
// SpecRef: 8.4.1 | Shop (お店) | Paid Refresh (有償洗替)

// SpecRef: 6.1.2 | Function of battle | f.hit_detection
// SpecRef: 6.1.2 | Function of battle | f.targeting
```

### 10.3 Rules
- SectionID must exactly match the specification heading number (e.g., `6.1.2`).
- Anchor must exactly match the corresponding identifier/name in the specification (e.g., `f.hit_detection`, `Paid Refresh (有償洗替)`).
- Place the `SpecRef` comment at the entry point of the implemented logic (function/method or main branch block).
- If one code block implements multiple spec items, add one `SpecRef` line per item.
- When specification IDs/titles/anchors change, corresponding `SpecRef` comments must be updated in the same change set.


### 10.4 Formating
- All numeric values MUST use `Intl.NumberFormat('ja-JP')`
  - Example: `12,345`


## 11. CHANGELOG

- @Specification_11.1_CHANGELOG.md


**END OF SPECIFICATION**
