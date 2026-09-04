## 8. UI

### 8.6 UI_SETTING
- Setting (設定)
  - All panes are collapsed by default and expandable.
  - The expanded/collapsed state is persisted and saved.

**Developer News Notification (通知)**
- Purpose: Displays announcements and issue-fix notices from the development team.
- Label: Use `News` as the list title.
- Keep the expanded news-item list at a maximum height of 24rem and allow it to scroll vertically when its content exceeds that height.
- Badge behavior:
  - Display a notification badge on both `Setting` and `News` when at least one unread news item exists. Unread news items are displayed in **bold**.
  - When the player taps a news item, mark it as read and change its text style from bold to normal.
  - When the player closes the expanded `News` pane, mark every currently unread news item as read.
  - Remove the notification badge when no unread news items remain.
  - Persist the read/unread state in save data so previously read items do not become unread again after refreshing or restarting the game.
  - When a new news item is added, display the notification badge again.
- language: zh-CN
  - 冒兽交流群(Telegram Community) (中文) "https://t.me/+exLhrX12vn5iMmI1"
- language: Others 
  - Official Discord Community (日本語・English) "https://discord.gg/k9VSf2ghM"
  - Localize the hyperlink text for the active language.
- News list: @Specification_11.2_NEWS.md 


**Donation box (寄付箱)**
- Display donated amount of gold of each god.

- Donation Scaling (Setting)
  - For each god g:
  - Let D_g be total donated gold to god g.
  - Convert donation to tier T_g using thresholds. 
  - Use effectiveTier = min(T_g, 10).
  - displayRank = tierIndex + 1
  - thresholds: [0, 500, 1200, 2200, 3600, 5500, 8000, 11000, 14500, 18500, 23000]

- God scaling:
  - Restoration:
    heal_missing_pct = clamp(0.20 + 0.005*effectiveTier, 0.20, 0.30)
    trigger_every_rooms = 4
  
  - Attrition:
    attack_bonus = 20 + 0.5*effectiveTier
    hp_loss_pct = max(0.05 - 0.001*effectiveTier, 0.03)
    trigger_every_rooms = 4
  
  - Fortification:
    physical_def_bonus = clamp(10 + 0.2*effectiveTier, 10, 20)
    magical_def_bonus  = clamp(10 + 0.2*effectiveTier, 10, 20)
  
  - Precision:
    accuracy_bonus = clamp(0.020 + 0.0005*effectiveTier, 0.020, 0.035)
    evasion_penalty = clamp(-0.005 - 0.0002*effectiveTier, -0.010, -0.005)
  
  - Evasion:
    evasion_bonus = clamp(0.015 + 0.0006*effectiveTier, 0.015, 0.030)
  
  - Resonance:
    resonance_upgrade_tiers = 1 + floor(effectiveTier/5)
    magical_def_penalty = clamp(-5 + 1*effectiveTier, -5, 0)


```
(Left-aligned)      (Right-aligned)
再生の神(ランク3)      1,203G (次 2,200G)
消耗の神(ランク2)         545G (次 2,200G)
防備の神(ランク1)         0G (次 500G)
...

```


**Clairvoyance (未来視)**

- Display format: "PT1 ▼", "PT2 ▼", etc.
  - Visibility condition: The pane is displayed only if at least one member in the corresponding party has `a.prophecy`. 
  - Reset functionality: The reset button is available only if at least one member in the party has `a.prophecy`2.
  - Debug override: If debug.Clairvoyance == ON: All Clairvoyance panes are always visible. Reset functionality is always enabled, regardless of `a.prophecy` level.
  - Default state: Collapsed
  - State persistence: The expand/collapse state is preserved per party
  - Each party pane contains the following sections:

- **報酬**
  - コモン報酬: common reward_bag remaining / total counts 
    - 通常当たり残り counts
  -	コモン称号付与: common_enhancement_bag remaining / total counts
    - 名工の残り counts / initial counts
    - 魔性の残り counts / initial counts
   	- 宿った残り counts / initial counts
    - 伝説の残り counts / initial counts
    - 恐ろしい残り counts / initial counts
    - 究極の残り counts / initial counts
  - コモン超レア称号付与: common superRare_bag remaining / total counts
    - 超レア残り remaining / initial counts
  - Button (コモン報酬初期化): Initialize `t.common_reward_bag` and `t.common_enhancement_bag`, `t.common_superRare_bag`

  - アンコモン報酬: uncommon reward_bag remaining / total counts 
    - 当たり残り remaining
  - エリートレア報酬: elite rare reward_bag remaining / total counts 
    - 当たり残り remaining
  - ボスレア報酬: boss rare reward_bag remaining / total counts 
    - 当たり残り remaining
  - 神魔レア報酬: mythic rare reward_bag remaining / total counts 
    - 当たり残り remaining
  -	称号付与: enhancement_bag remaining / total counts
    - 名工の残り remaining / initial counts
    - 魔性の残り remaining / initial counts
   	- 宿った残り remaining / initial counts
    - 伝説の残り remaining / initial counts
    - 恐ろしい残り remaining / initial counts
    - 究極の残り remaining / initial counts
  - 超レア称号付与: Rare_superRare_bag remaining / total counts
    - 超レア残り remaining / initial counts
  - Button (報酬初期化): Initialize `t.common_reward_bag`, `t.uncommon_reward_bag`, `t.elite_rare_reward_bag`, `t.boss_rare_reward_bag`  , `t.mythic_rare_reward_bag`  and `t.enhancement_bag`, `t.rare_superRare_bag`

- **サイドクエスト**
  - サイドクエスト抽選: side_quest_bag total
    - 当たり残り remaining
  - Button (サイドクエスト初期化): Initialize `t.side_quest_bag` 

- **眠気**
  - 眠気抽選: sleepiness_of_party_bag total
    - 寝ない: remaining
    - 仮眠: remaining
    - 熟睡: remaining

note: 0:no sleep 寝ない, 1:nap 仮眠, 2:sound sleep 熟睡

**Glossary (用語集)** 
- list and its descrpition is here:
  - @Specification_1.1_CONSTANTS_GLOSSARY.md
- Glossary tabs: 能, 基, 固, 増, 属, 機, 信, 魔, 求. Default: 能


**Item Compendium (アイテム図鑑)**
- The Item Compendium acts as a global reference for all items within the game. Unlike the Inventory, it displays the base potential of every item, regardless of ownership status.
- View Settings:
  - Visibility: Shows all items in the database (including undiscovered items).
  - Standardized Stats: Displays item data at base level (Enhancement = 0, SuperRare = 0).
  - Filter button by rarelity (right-aligned): 全て表示, 通常のみ, アンコモンのみ, エリートレアのみ, ボスレアのみ, 神魔レアのみ: [ALL] [C] [U]  [E] [B] [M]
  	- IF player selects [M],   神魔レアのみ: [ALL] [C] [U] [E] [B] **[M]** 
- Item category tabs: (same as Inventory tab's item list)
  - [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒].
  - Default: 鎧 or previously selected category of each character 
- UI Behavior:
  - Items are listed in a Collapsed View by default.
  - Interaction: Tap an item name to expand the detailed status panel.
 
- Item Reveal Rule:
  - An item entry is unlocked when the player first encounters an enemy capable of dropping that item.
  - The reveal is triggered at the moment the enemy becomes visible to the player (e.g., during exploration or battle), regardless of whether the item is actually obtained.
 
**Character Roster (味方キャラクター図鑑)**
- Displays a list of all possible character combinations.
- Selection Tabs:
  - Race Icon: 🐺 Lupinian, 🦊 Vulpinian, 😺 Felidian, 🐶 Caninian, 🐻 Ursan, 🦝 Procyonian, 🐰 Leporian, 🦌 Cervin, 🐭 Murid, 🐾Kemoria, 🐋Orcinian, 🐓Avian
  - Party: PT1, PT2, PT3, PT4, PT5, PT6
    - Only unlocked parties are visible.
- Gender: 男, 女, U
  - U: Unique character (displayed only if a unique character exists)
- The character image is displayed in the background and updates immediately when the selected character changes.
- Display the race status summary at the bottom area of the character image.
  - Base status: 体力:11 力:12 知性:8 精神:7 (Same design as party status pane's base part)
  - Bonus (ボーナス): ex. 装備+1, 鎧x1.2, 衣x1.4, 盾x1.1, 弓x1.2, 杖x1.2, 氷防x0.67 (Same style as party status pane's bonus part)
  - 初期アビリティ: defaultAbility
  - アンロックアビリティ: unlockAbility
  - Show floating bubble text tooltips for these status fields.


**Bestiary (敵キャラクター図鑑)**
- A comprehensive record of all threats encountered (or to be encountered) during expeditions.
- Expedition category tabs: 原, 崖, 樹, 峰, 茂, 巣, 園, 谷, 神, 特
  - Each letter represents for corresponding expedition. And tap to show the enemy list of it. 
  - Gods are listed in "神" tab.
  - Colosseum character is listed in 特 tab. (Only visible Colosseum is enabled)
- Tab Unlock Conditions: Expedition tabs are unlocked when the player reaches the corresponding expedition for the first time.
- Gods Tab Behavior (神): Only gods that have been challenged at least once are displayed.
  - The `神` tab is hidden if no gods have been revealed. Check: 遭遇数 (Encounters) > 0.
- Categorize by floor (`x.Spawn_pool`) and is reverse order of rooms (Boss first, then floor6 Normal enemies, floor 5 elite and floor 5 normal enemies…

- Enemy name: List of specific enemies found within that expedition.
  - Default: Collapsed.

- Enemy class:
  - If enemy has only mainClass: メインクラス: mainClass
  - If enemy has mainClass and subclass, and mainClass != subClass : メインクラス: mainClass   サブクラス: Subclass
  - If enemy has mainClass and subclass, and mainClass == subClass : メインクラス: mainClass + (師範)


- UI Behavior:
  - Interaction:
    - Tap Enemy name, Opens detailed enemy status (same logic as battle). Including drop items.
    - If enemy has no attack values, not show the corresponding values.
    - Respect `m.luna` mode.

**Enemy Image (Collapsed State)**
- Display a small enemy image on the right side of the pane when the section is collapsed.
- Position the image on the same line as the title.
- Load the image from: `/public/chibi/C_E_{enemy_ID}.png`
- If the image file does not exist, do not display an image.

**Enemy Image Big (Expanded State)**
- If enemy.image_path exists, enable background image rendering
- Render the enemy image as a background image of the panel.
- Do not stretch; preserve original aspect ratio.
- Image size is fixed and does not scale with content.
- Responsive sizing:
  - The image width adapts smoothly to the viewport width.
  - If the page width is 500px or wider, set the image width to 120% of the panel width.
  - If the page width is 400px or narrower, set the image width to 170% of the panel width.
  - Between 400px and 500px, interpolate linearly between 170% → 120%.
- In dark mode: not invert the image.
- Apply mask above the image to ensure text readability.
- The image remains static relative to the panel (does not move with internal content changes).


- 撃破数 (Defeats):
  - Total number of enemies successfully defeated by all parties.
- 遭遇数 (Encounters):
  - Total number of enemy encounters triggered, regardless of outcome (including victories, retreats, and defeats).
- 撃破数, 遭遇数:These values are shared across all parties.
    

```
(column 1)              (column 2)
ID: 5005                
HP: 312                 レベル: 12
メインクラス: 剣士             サブクラス: 君主
タイプ: 神魔
遠距離攻撃: 33 x 2回 (x1.00) 属性: 雷 (x1.2)
近接攻撃: 35 x 6回 (x1.00)  物理防御: 10 (83%)
物理命中率: 100% (減衰: 90.0%) 魔法防御: 8 (80%)
魔法攻撃: 117 x 4回 (x1.00)   属性耐性: 🔥100%,❄️100%,⚡100%
魔法命中率: 100% (減衰: 90.0%)
貫通:+10%
ボーナス: 成長1.5倍
アビリティ: 巨人1, 捕食1
ドロップ: [1B]若牙の長剣 / [1B]秘奥真理の書 / [1E]虫刃の直剣 / [1E]渡り翼の教本 / [1C]ひび杖
撃破数: 1,200        遭遇数: 2,127

(column 1)              (column 2)
ID: 5015                レベル: 12
HP: 312                 タイプ: 神魔
メインクラス: 魔法使い    サブクラス: 防人
魔法攻撃: 117 x 4回 (x1.00)   属性: 雷 (x1.2)
魔法命中率: 100% (減衰: 90.0%)  物理防御: 10 (83%)
詠唱魔法: アルカナアロー         魔法防御: 8 (80%)

```

**Enemy Edit Pane**
- Purpose
  - The **Enemy Edit** pane is used to manually configure a test enemy for battle simulation.
  - The configured enemy is used only for Colosseum battles.

- Fields

| Setting | UI | Description | Default |
|---|---|---|---|
| Enemy level | Slider bar (`1–99`) | Sets enemy level | `10` |
| Enemy name | Text input | Custom display name of the enemy | `ミーティア` |
| Terrain effect | Pull-down list | Select terrain effect | `none` |
| Enemy type | Pull-down list | Select enemy type category | `Jinma` |
| Enemy main class | Pull-down list | Select enemy class | `class.duelist` |
| Enemy sub class | Pull-down list | Select enemy class (optional) | `none` |
| Enemy added ability 1 | Pull-down list | Adds an extra ability | `none` |
| Enemy added ability 1 level | Pull-down list | level 1~5 | `1` |
| Enemy added ability 2 | Pull-down list | Adds an extra ability | `none` |
| Enemy added ability 2 level | Pull-down list | level 1~5 | `1` |
| Enemy added ability 3 | Pull-down list | Adds an extra ability | `none` |
| Enemy added ability 3 level | Pull-down list | level 1~5 | `1` |
| Enemy added ability 4 | Pull-down list | Adds an extra ability | `none` |
| Enemy added ability 4 level | Pull-down list | level 1~5 | `1` |
| Enemy added ability 5 | Pull-down list | Adds an extra ability | `none` |
| Enemy added ability 5 level 2 | Pull-down list | level 1~5 | `1` |

- Behavior
  - Starting a Colosseum battle immediately loads the current Enemy Edit settings.
  - Changes made in the Enemy Edit pane are reflected in the next Colosseum battle.
  - The enemy gives no experience point, item drop or progression.


**Super Rare List(超レア一覧)**
- Display Super Rare list with its unique bonus.

**Mode select (モード切替)**

- Language (言語)
  - Options: 日本語 / English / 简体中文 / 繁體中文
  - Determine the initial language in this priority order:
    1. A supported `lang` URL parameter.
    2. The player's previously persisted language selection.
    3. For a new player with no persisted language selection, the first supported language in the system/browser language preference list.
    4. Japanese when system/browser language information is unavailable or none of the reported languages is supported.
  - Normalize supported system/browser language tags case-insensitively, including regional subtags:
    - `ja` and `ja-*` → 日本語
    - `en` and `en-*` → English
    - `zh-CN`, `zh-SG`, `zh-Hans`, and equivalent Simplified Chinese tags → 简体中文
    - `zh-TW`, `zh-HK`, `zh-MO`, `zh-Hant`, and equivalent Traditional Chinese tags → 繁體中文
    - A generic `zh` tag without a script or region → 简体中文
  - The `lang` URL parameter accepts:
    - `lang=ja` → 日本語
    - `lang=en` → English
    - `lang=zh-CN` (or `lang=zh`) → 简体中文 
    - `lang=zh-TW` → 繁體中文
    - Example: `https://toreniafournieri.github.io/Kemo-Expedition/?lang=ja`
  - Persist the selected language in local storage.
  - When the selected language changes, replace the current URL's `lang` parameter with the selected language without reloading the page. Preserve the current path, all other query parameters, and the URL fragment.

- ダークモード OFF/ON/システム
  - Dark mode setting
  - Default: システム

- Switch to 自動周回: ON/OFF (Default:ON )

- Switch to 統計情報表示: ON/OFF (Default:OFF)
  - If ON, Show statistic line of Party pane in Expedition tab.

- Theme color

| theme color | label (i18n) | Available in production |
|-------|--------------|-----|
| `theme.kemo` | `character.default.n1` | true |
| `theme.laika` | `character.default.n2` | true |
| `theme.leonard` | `character.default.n3` | false |
| `theme.orca` | `character.default.n4` | false |
| `theme.nox` | `character.default.n5` | false |
| `theme.luna` | `character.default.n6` | true |
| `theme.mishka` | `character.default.n7` | false |
| `theme.puchitsa` | `character.default.n8` | false |
| `theme.hagakure` | `character.default.n9` | false |
| `theme.souga-ha` | `character.default.n10` | false |
| `theme.finn` | `character.default.n11` | false |
| `theme.merle` | `character.default.n12` | false |
| `theme.rosaria` | `masterData.enemyName.171` | false |
| `theme.milly` | `masterData.enemyName.17` | false |
| `theme.guabi` | `masterData.enemyName.173` | false |
| `theme.nemea` | `masterData.enemyName.239` | false |
| `theme.bernetta` | `masterData.enemyName.259` | false |
| `theme.yone` | `masterData.enemyName.305` | false |
| `theme.niv` | `masterData.enemyName.348` | false |
| `theme.nave` | `masterData.enemyName.375` | false |

- Default: `theme.kemo`
- Description: Displays the theme color associated with Label (i18n).
  - Example: ケモのテーマカラーです
- Availability:
  - If Available in production is true, the theme color can be selected in the production environment.
  - All theme colors are always selectable in the development environment.

- Game mode
  - Default: `mode.normal`

| Mode | concept |
|--|--|
| `mode.normal` | same spec. |
| `mode.orca` | All enemies have `a.first-strike`0, `a.upgrade-all-abilities`1, +`N` level. `Speed of time` is `x5 boost`, theme color is set to `theme.orca`. |

  - Enemy Level Offset
    - `N` is configurable using a level-offset bar.
    - Range: 0 to +20.
    - The selected `N` value is added to the level of all enemies in `mode.orca`.

**Feedback フィードバック**
  - Send feedback to the development team.
    - Reward eligibility: If the player has never submitted feedback, or at least 168 hours have passed since the last submission:
      - Display: 「開発チームにフィードバックを送信します。お礼として10プラーナを獲得できます。」
      - On successful submission: 「フィードバックを送信しました。(+10プラーナ獲得)」
    - During the 168-hour cooldown:
      - Display: 「開発チームにフィードバックを送信します。」
      - On successful submission: 「フィードバックを送信しました。」
  - Name field (Required, persist the previously entered value)
  - Category list
    - Feedback: 感想(ゲームバランスなど)
    - Question: 質問
    - Feature Request:　欲しい機能の要望
    - Bug Report: バグ報告
  - Text input form (Feedback text)
  - Latest Battle Log selection (最終戦闘ログ選択):
    - PT1, PT2, PT3, PT4, PT5, PT6, None
    - Default selection: PT1
  - Export backup file
- File attachments (up to 4 images)
  - Send button
    - `FEEDBACK_DISCORD_WEBHOOK_URL` defined in this repository.
    - Content:
	  - User ID
      - Name
      - Category
      - Version Build env: (ex. v0.7.0 (12) dev)
	  - Timestamp: YYYY/MM/DD HH:MM (Timezone)
	  - browser, version:
	  - OS version: (ex. iOS 26.4.2)
	  - Resolution: (ex. 390 px, 844 px)
      - Feedback text
      - Three attached files:
        - File 1: Backup file
        - File 2: Selected Latest Battle Log HTML file (PT1–PT6)
        - File 3: A HTML file containing the Status Table of the selected party defined in @Specification_8.1_UI_FOUNDATIONS.md
          - note: this process should be shared with it and do not dupliciate the code.


**バックアップ・リセット**
  - 5.1 Backup (Export)
    - Allow the player to export the current save data as a file download.
    - Quark Browser must download the backup as a file and must not open the backup payload in a blob URL page.
    - File name format: `Kemo-Expedition_Backup_[version]_[env]_YYYYMMDD`
    - Example: `Kemo-Expedition_Backup_v0.2.9_qa_20260220`

  - 5.2 Import
    - Allow the player to import save data via file upload.
	- Before importing, run validation checks:
	  - File format compatibility check
     	- Different version, env is acceptable unless their format is compatible.
	  - Basic integrity check (missing fields / schema mismatch)
   - If any issue is detected, show a clear warning and require explicit confirmation before applying import.
   - On success, replace current save data with the imported data.

  - 5.3 Reset
    - Provide a Full Reset option that deletes all local save data.
    - Always show a strong warning and require confirmation before execution.

**Debug pane(デバッグ)**
- Dev and beta show a localized Runtime Diagnostics section combining current and peak memory metrics with the bounded AFK runtime trace defined in section 5.1.1.1. The compact memory table displays the aggregate Electron application working set and main-renderer working set when available, without the per-process breakdown retained in the JSON export. It also displays active worker/sample/memory-event counts, current AFK phase, trace/anomaly counts, and longest completed wait.
- Runtime Diagnostics: OFF/ON  (Default: OFF)
  - It can be explicitly enabled through the Debug Pane, a supported runtime API, or a development command/option such as an npm script or startup flag.
    - `npm run dev:diagnostics` for explicit startup enablement.
  - Diagnostics collection begins when the setting is switched to ON.
  - provides one combined session JSON export and one combined session reset. The export includes version, build, environment, technically available browser/runtime metadata, memory diagnostics, and metadata-only AFK trace diagnostics. Production does not show this section.
 
- Clairvoyance: OFF/ON
  - if OFF, disable `Clairvoyance (未来視)` as default.
- Speed of time: Real time / x1.2 bonus / x5 boost / x20 hyper / x100 Ultra / x∞ Unlimited
  - Default: Real time
  - affects side quest duration.
  - Unlimited: Immediately processes side quests using AFK emulation, without waiting for real time to pass.
- Gods Battle condition: boss items require Normal / Simple(1)
  - Default: Normal
  - Simple: 1 boss rare item instead of actual setting
- Gods Strength: Normal / Very Weak `debug mode for god battle`
  - Default: Normal
- Party unlock +1 PT unlock
  - if press the button, unlock one PT.
- Debug store open OFF/ON
  - If on, Ashen Route Vault work as a debug store.
  - Default: OFF
- Display flavor condition OFF/ON
  - Default: OFF
  - if ON, it displays condition at the end of flavor text. 
- Display AFK duration OFF/ON
  - Default: OFF
  - If ON, notification  "(Debug)前回の更新から X秒経過" at the end of AFK calculation 
- Display all Bestiary OFF/ON
  - Default: OFF
  - When ON: Unlock and display all Bestiary entries, ignoring unlock conditions.
- Display all Compendium OFF/ON
  - Default: OFF
  - When ON: Unlock and display all Compendium entries, ignoring unlock conditions.
- Display all Glossary OFF/ON
  - Default: OFF
  - When ON: Unlock and display all Glossary entries, ignoring unlock conditions. 
- Colosseum mode : OFF/ON
  - If ON, Enable Enemy edit pane and Colosseum expedition.  
