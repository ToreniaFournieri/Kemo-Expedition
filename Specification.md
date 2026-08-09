# BOKEMO v0.9.1 - SPECIFICATION

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
- After macOS sleep or a full application restart, AFK catch-up must issue at most one grouped native summary rather than one native notification per recovered event. Event details must remain available in the Diary.
- Clicking an individual Diary notification must restore BoKemo and open the relevant party and Diary entry. Clicking an AFK summary must restore BoKemo and open the Diary.
- Starting BoKemo at macOS login must be optional and disabled by default. When enabled, BoKemo must launch hidden in the menu bar without opening its main window.
- If macOS notification permission is denied, local saves, progression, Diary records, and in-application notifications must continue to function normally.

#### 9.1.2 macOS menu-bar Party Progress pane
- The packaged macOS desktop application must provide a read-only `Party Progress` pane opened from BoKemo's existing menu-bar item. This pane replaces the previously specified native WidgetKit extension and must not depend on WidgetKit, an App Group entitlement, or a separate third-party widget service.
- The pane must be implemented as a secondary Electron `BrowserWindow` owned by the main process and must use the same packaged application assets and active desktop environment as the main BoKemo window.
- The pane must be frameless, non-resizable, omitted from the Dock and application switcher, and positioned beneath or adjacent to the BoKemo menu-bar item. It must close or hide when it loses focus, when the menu-bar item is clicked again, or when BoKemo quits.
- Left-clicking the BoKemo menu-bar item must toggle the Party Progress pane. Right-clicking it must open a context menu containing `Open BoKemo`, the existing launch-at-login control, and `Quit BoKemo`. `Open BoKemo` must restore and focus the main window.
- The pane must display every unlocked party in a compact list sized so that all six party rows fit within the standard pane without scrolling. Vertical scrolling may remain only as a fallback for accessibility text scaling or reduced available screen space. Each party row must mirror the compact party-pane information defined in section 8.3: the party name exactly once, latest disclosed expedition floor, Instant Expedition charge battery and timer, latest disclosed outcome, compact loot-gate and side-quest summaries, current localized state and primary progress, Step sub-progress placeholder/bar, and current/max HP. The same no-spoiler update timing for latest floor and outcome must apply while `state.explore` is active.
- The pane must display the total unread Diary count when it is greater than zero and provide an `Open BoKemo` action. Activating a party row must restore BoKemo and select that party without changing its expedition or automation state.
- State labels, controls, and displayed game data must use the language and visual theme currently selected in BoKemo. Numeric values must follow the formatting rule in section 10.4.
- Pane progress must follow the progress-bar behavior defined in section 5.1.1: continuous states update smoothly from their persisted start and expected end times, while step-based states display completed Steps against the state's initial total Steps. `state.idle` must display an idle status without a progress bar.
- The pane is informational except for opening or navigating the main BoKemo window. It must not expose controls that start expeditions, change automation, spend resources, or otherwise mutate game state.
- The main renderer must share only the minimum display snapshot required by the pane through the context-isolated desktop bridge. The pane renderer must not receive or access BoKemo's complete save data or Node.js APIs; context isolation must be enabled, Node integration disabled, and renderer sandboxing enabled.
- Pane state must remain isolated between the `dev`, `beta`, and production environments defined in section 9. The pane must display only the data belonging to the environment of its containing desktop process.
- While BoKemo is running, pane content must update from live runtime state without WidgetKit scheduling limitations. When BoKemo fully quits, the pane must also quit and must not simulate progression independently.
- Missing, invalid, incompatible, or unavailable snapshot data must show a localized prompt to open the main BoKemo window. These conditions must not affect local saves, progression, Diary records, native notifications, or the browser distribution.

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
