# `/api/v1` UI ownership audit (Stage 9.5)

Status as of v0.9.7 Build 102. Contract: `Specification_9.1.4_API_DETAIL.md` §9.1.4.17 (UI state ownership). Mechanical checks: `tests/migratedTabs.test.cjs`.

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
| Setting tab | News, Donation, Clairvoyance, the five reference panels, `enemyEditPane`, `modeSelect` | Backup export/import/reset, news, Clairvoyance reset, language, theme, dark mode, statistics switch | See findings for storage keys |

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

The tabs and header use only these keys; any new key fails the guard.

| Key (Setting tab) | 8.6 requirement | Status |
|---|---|---|
| `FEEDBACK_NAME_STORAGE_KEY`, `FEEDBACK_SUBMITTED_STORAGE_KEY`, `FEEDBACK_LAST_SUBMITTED_AT_STORAGE_KEY` | Previous name retained (8.6 Feedback) | Part of the Send Feedback local exception |
| `SETTING_PANEL_STORAGE_KEY` | "The expanded/collapsed state is persisted and saved" | **Finding A**: §9.1.4.17 places retained pane expansion in `uiPreferences` (per save) |
| `CLAIRVOYANCE_PARTY_STORAGE_KEY` | "The expand/collapse state is preserved per party" | **Finding A**: §9.1.4.17 names per-party Clairvoyance expansion explicitly |
| `GLOSSARY_TAB_STORAGE_KEY`, `GLOSSARY_EXPANDED_STORAGE_KEY` | Only "Default: 能"; no retention requirement | **Finding B**: persisted with no spec requirement |

## Desktop bridge

No tab and not the header touches `window.bokemoDesktop` (guarded). Only the trusted components `ApiV1Settings.tsx` and `DesktopNotificationSettings.tsx`, plus `HomeScreen`'s runtime ports, use the bridge.

## Findings

- **A (to fix)**: Setting pane expansion and per-party Clairvoyance expansion move to `uiPreferences` catalog families. Proposed families:
  - `setting.panelExpanded.<panel>`: boolean, per panel key
  - `setting.clairvoyanceExpanded.<partyNumber>`: boolean

  The tab reads them from `settingInfo.uiPreferences` and commits changes through `commit/setting/uiPreferences`, like `party.equipCategory`. Existing local values are migrated once.
- **B (owner decision)**: Glossary tab and expanded entries are persisted locally, but 8.6 does not ask for it. Either 8.6 adds a retention rule (then they join A), or they become local view state that resets on reload.
- **C (to verify)**: For the ordinary player, `commit/setting/debug` and `commit/setting/enemyEditPane` store their values in API control settings, while the Debug pane uses its own runtime settings. For API accounts the stored values are the account's own settings. Confirm which debug fields should take effect for an API account and whether the ordinary player's reads should report the runtime's real Debug settings (the same echo problem fixed for `modeSelect` in Build 102).
