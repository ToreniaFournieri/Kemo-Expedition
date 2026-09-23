# `/api/v1` UI ownership audit (Stage 9.5)

Status as of v0.9.7 Build 104. Contract: `Specification_9.1.4_API_DETAIL.md` §9.1.4.17 (UI state ownership). Mechanical checks: `tests/migratedTabs.test.cjs`.

Every screen control and state value is classified as one of:

- **Projection**: rendered from an Application API read.
- **Commit**: changed only through an Application API commit.
- **Local**: view state with no save effect (hover, open tooltip, scroll, drafts, toasts, transient filters).
- **Runtime/device**: owned by the running app or the device, outside the save (for example dark mode or Speed of Time), and reported through runtime ports where the API exposes it.
- **Trusted desktop**: desktop-only settings through the trusted bridge components, never through a tab.

Cutover is blocked if a migrated screen does any of these:

- reads the complete persisted save;
- mutates the reducer outside the Application API;
- persists UI state under an undocumented key;
- receives privileged desktop data through a generic bridge.

## Screens

| Screen | Reads | Changes | Guard |
|---|---|---|---|
| Header | `read/observation/overview` (`headerView.ts`) | Report Progress: reviewed local exception (cannot be submitted on desktop or through the API). | No game module, no storage, no bridge |
| Expedition tab | `read/observation/expedition`, `latestBattleLog`, `simulationRun` | `changeExpedition`, `sortie`, `godsBattle`, `resetStatistics` | Commits only; no `partyCycles`; no bridge |
| Party tab | `read/observation/party`, `equipment`, `equipmentSet`, `equipmentEvaluation`, `searchItems` | All build and equipment commits; retained category through `uiPreferences` | Reviewed display imports; reducer props limited to toasts and `selectParty` |
| Base tab | `read/observation/base`, `enemyFormList` | Shop, Altar, Inventory commits | Vault is the reviewed reducer exception (Spec 8.4.3: no API) |
| Diary tab | `read/observation/diary`, `diaryEntry` | Diary settings and read acknowledgements | `selectParty` is the one shared-state action |
| Setting tab | News (with read state), Donation, Clairvoyance (with availability), the party list for the Character Roster, the five reference panels, `enemyEditPane`, `modeSelect`, retained preferences | Backup export/import/reset, news, Clairvoyance reset, language, theme, dark mode, statistics switch, retained preferences | No complete save; only the Send Feedback storage keys |

## Reducer actions still called by `HomeScreen`

All of them are classified in `HOMESCREEN_REDUCER_ACTIONS`. A new call fails the guard until it is routed through the API or classified.

| Category | Actions | Why it stays |
|---|---|---|
| Runtime engine | `runExpedition`, `advanceSideQuest`, `rollSideQuest`, `setSideQuestProgress`, `cancelSideQuest`, `finalizeDiaryLog`, `healPartyHp`, `autoSelectDungeon`, `processPendingProfit`, `spendPendingProfit`, `rollPartySleepiness`, `applyAutoEquipmentActions`, `commitAfkPartyChunk`, `commitAfkPartyTransaction`, `commitAfkPartyTransactionAuthoritatively`, `getAuthoritativeState`, `publishAuthoritativeState`, `flushSave` | The live party cycle and AFK recovery (Spec 5.1). Stage 4 kept them in `HomeScreen` and the reducer by decision. The guard also fails if any of them is handed to a component as a control. |
| Local notification | `addNotification`, `addStatNotifications` | Toasts only |
| Shared selection | `selectParty` | Decided in Stage 5 (4e) |
| Debug only | `buyDebugStoreItem` (Vault), `unlockPartySlot` (Debug pane "Party unlock") | Dev/beta Debug pane. The Vault has no API by Spec 8.4.3; Party unlock has no API operation. |
| Send Feedback | `grantFeedbackReward` | Reviewed local exception by user decision |

## Browser storage

`HomeScreen` keeps runtime and device settings outside the save:

- `AFK_RUNTIME_STORAGE_KEY` (party cycles and AFK recovery, including auto-repeat)
- `DARK_MODE_STORAGE_KEY`, `GAME_MODE_STORAGE_KEY` (theme), `EXPEDITION_STATS_DISPLAY_STORAGE_KEY`: runtime/device, reported and changed through `modeSelect` (Build 102)
- `RUNTIME_GAME_MODE_STORAGE_KEY`, `ORCA_ENEMY_LEVEL_OFFSET_STORAGE_KEY`, `ORCA_TIME_SPEED_OVERRIDE_STORAGE_KEY`, `SPEED_OF_TIME_BONUS_UNTIL_STORAGE_KEY`
- `AUTO_EQUIPMENT_STORAGE_KEY`
- `API_PLAYER_RETURN_STORAGE_KEY` (the player save held while an API account is logged in)
- `LEGACY_SETTING_*` / `LEGACY_GLOSSARY_*`: read once to migrate the Setting tab's old local values, then removed (Build 103)

The tabs may use only the reviewed keys below, and the header uses none; any new key fails the guard.

| Key (Setting tab) | 8.6 requirement | Status |
|---|---|---|
| `FEEDBACK_NAME_STORAGE_KEY`, `FEEDBACK_SUBMITTED_STORAGE_KEY`, `FEEDBACK_LAST_SUBMITTED_AT_STORAGE_KEY` | Previous name retained (8.6 Feedback) | Part of the Send Feedback local exception |
| Setting pane expansion (was `SETTING_PANEL_STORAGE_KEY`) | "The expanded/collapsed state is persisted and saved" | Fixed in Build 103: `setting.panelExpanded.<panel>` in `uiPreferences` |
| Clairvoyance expansion (was `CLAIRVOYANCE_PARTY_STORAGE_KEY`) | "The expand/collapse state is preserved per party" | Fixed in Build 103: `setting.clairvoyanceExpanded.<partyNumber>` |
| Glossary tab (was `GLOSSARY_TAB_STORAGE_KEY`) | Keep the last tab; the default applies only the first time (owner decision) | Fixed in Build 103: `setting.glossaryTab` |
| Expanded Glossary entries (was `GLOSSARY_EXPANDED_STORAGE_KEY`) | Not retained | Local view state since Build 103 |

`HomeScreen` reads the four old keys once, carries the values into `uiPreferences` (a stored preference wins), and removes them.

## Desktop bridge

No tab and not the header touches `window.bokemoDesktop` (guarded). Only the trusted components `ApiV1Settings.tsx` and `DesktopNotificationSettings.tsx`, plus `HomeScreen`'s runtime ports, use the bridge.

## Findings

- **A (fixed, Build 103)**: Setting pane expansion and per-party Clairvoyance expansion are `uiPreferences` catalog families. The tab reads them from `settingInfo.uiPreferences` and commits changes through `commit/setting/uiPreferences`; existing local values are migrated once.
- **B (fixed, Build 103)**: the Glossary tab is retained by owner decision (`setting.glossaryTab`; the default `能` applies only until a tab is stored). Expanded entries are local view state.
- **C (fixed, Build 103)**: for the ordinary player, `read/setting/debug` and `settingInfo.debug` report the Debug pane's real settings, and `commit/setting/debug` applies to them after the durable commit (the pattern used for `modeSelect`). An API account keeps its own stored debug settings. `commit/setting/enemyEditPane` still stores its values in control settings (the Enemy Edit pane keeps its own local settings by design, Build 99).
- **D (fixed, Build 104)**: the Setting tab no longer receives the complete `GameState`.
  - News unread state comes from each `resources/developerNewsNotification` entry's new `isRead`.
  - Clairvoyance availability and reset access come from `resources/clairvoyance/{p}` (`available`, `canReset`); the tab no longer computes a.prophecy levels.
  - The Character Roster reads every party's members from `read/observation/party`'s `parties` list (now with `gender` and `isUnique`).
  - Send Feedback's save-derived report lines and attachments are built by `HomeScreen` through `onBuildFeedbackReport` (reviewed local exception), which also removed a duplicate of the battle-log HTML builder.
  - The language link uses the existing `language` prop.
  - Two reviewed scalar reads remain: the party count (Debug "Party unlock") and the shared language. The guard fails on any other raw save read.
- **E (fixed, Build 104, found while fixing D)**: the API ignored the 8.6 Clairvoyance rules. `resources/clairvoyance/{p}` returned the bag facts for a party without `a.prophecy` (9.1.3 4-2-3 says `unavailable`), and `commit/setting/clairvoyanceReset` reset bags without `a.prophecy`2. Both now follow the shared rule in `src/game/clairvoyanceAccess.ts`.
