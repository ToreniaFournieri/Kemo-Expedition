## 8. UI

### 8.1 UI_FOUNDATIONS

- Platform: Web-based (React + TypeScript + Tailwind)
  - Style: Compact, simple, iOS-like, Liquid Glass style.
  - Navigation: Minimal scene transitions, tab-centered
- Interaction philosophy:
  - Fast feedback
  - No modal spam
  - Most actions resolve immediately
  
- **Master Data i18n Boundary**
  - `src/data/**` may keep canonical proper nouns unchanged when the string is part of the game identity or stable save/log identity: character names, enemy names, deity names, dungeon names, item names, race names, lineage names, and raw master specification tables such as `src/data/masterSpecData.ts`.
  - Localized display labels must use stable IDs/keys in code and resolve through `t(...)` from `src/i18n/ja.ts` and `src/i18n/en.ts`. Examples: class short labels, enemy-type short labels, UI-only category labels, option labels, and reusable status labels.
  - Localized descriptions/flavor text must also live in i18n dictionaries when rendered directly to players. Data records may keep stable ability/item/category IDs, but player-facing explanatory text should be represented by translation keys before new usages are added.
  - Japanese strings found in `src/data/masterSpecData.ts`, `src/data/items.ts`, and `src/data/enemies.ts` are classified as canonical names unless explicitly documented as display-only descriptions. Japanese labels in `src/data/classes.ts`, `src/data/races.ts`, `src/data/lineages.ts`, `src/data/predispositions.ts`, `src/data/glossary.ts`, and `src/data/bonusAbilityGlossary.ts` must not gain new player-facing fields without corresponding i18n keys.
  - Consumers in UI/game modules must call the relevant resolver (for example `getClassShortName`, `getEnemyTypeShortName`, or `t(...)`) instead of reading display-only Japanese lookup tables directly.

- **Color Scheme**

* Light mode

| Theme | `--theme-sub` | `--theme-accent` | `--hp-current` | `--hp-damage-taken` | `--hp-track` |
| --------------- | --------: | --------: | --------: | --------: | ----------------------: |
| m.kemo light    | #3B82F6 | #EA580C | #93C5FD | #FCB786 |               #E2E8F0 |
| m.laika light   | #08A645 | #DC2626 | #08A645 | #FFEBCD |               #D1D5DB |
| m.leonard light | #BF4264 | #EFA84C| #D95D7A | #F3B77E` | rgb(224 190 190 / 0.40) |
| m.orca light    | #269096 | #8bab2d | #2EB9C1 | #DDE89A | rgb(173 211 213 / 0.40) |
| m.nox light     | #9E2923 | #D58B20 | #B94A3E | #E0A85C | rgb(218 190 166 / 0.45) |
| m.luna light    | #C28832 | #0C3CEA | #E8B568 | #FFED91 | rgb(217 204 175 / 0.45) |
| m.mishka light  | #1769C2 | #665C87 | #438CD4 | #A59BB7 | rgb(177 190 207 / 0.45) |
| m.puchitsa light| #C94B32 | #167D8D | #DF6A45 | #75A9A4 | rgb(218 188 171 / 0.45) |
| m.hagakure light| #71845A | #9A704F | #91A875 | #D8B99A | rgb(195 204 176 / 0.45) |
| m.souga-ha light| #557A9D | #D13C4C | #789AB8 | #D99A9F | rgb(190 202 214 / 0.45) |
| m.finn light    | #7255A5 | #B58A3C | #9276BE | #D6BD8A | rgb(207 196 220 / 0.45) |
| m.merle light   | #438DC4 | #6F9B69 | #72AFD5 | #A9C99D | rgb(184 207 220 / 0.45) |
| m.rosaria light | #762E4B | #514078 | #9B526B | #A98AA5 | rgb(207 185 200 / 0.45) |
| m.milly light   | #C94F78 | #B8862F | #E17E9D | #E5B98D | rgb(224 194 204 / 0.45) |
| m.guabi light   | #78952F | #D95F68 | #9DBB50 | #E7A09B | rgb(202 211 172 / 0.45) |
| m.nemea light   | #278C8C | #B47732 | #55AAA5 | #D3A66F | rgb(184 207 199 / 0.45) |
| m.bernetta light| #8E3438 | #9A6535 | #B25555 | #C69A72 | rgb(211 190 183 / 0.45) |
| m.yone light    | #4B4745 | #C5672E | #77706C | #D59A72 | rgb(200 190 182 / 0.45) |
| m.niv light     | #465F7D | #805F43 | #7189A2 | #B39A82 | rgb(190 199 209 / 0.45) |
| m.nave light    | #35458C | #E86118 | #6475B5 | #E99A6D | rgb(190 193 211 / 0.45) |


* Dark mode

| Theme | `--theme-sub` | `--theme-accent` | `--hp-current` | `--hp-damage-taken` | `--hp-track` |
| -------------- | --------: | --------: | --------: | --------: | -------------------: |
| m.kemo dark    | #3B82F6 | #EA580C | #6A94C6 | #A5886D |            #374151 |
| m.laika dark   | #08A645 | #DC2626 | #08A645 | #92675B |            #374151 |
| m.leonard dark | #E06080 | #F2B35C | #B94E69 | #A87959 | rgb(74 57 65 / 0.55) |
| m.orca dark    | #45C1CA | #B3D355 | #4E9FA5 | #8A9160 | rgb(63 74 82 / 0.55) |
| m.nox dark     | #D65A4F | #F0B84A | #A94740 | #A77B4A | rgb(77 55 50 / 0.55) |
| m.luna dark    | #C28832 | #60A5FA | #AA8D5D | #857255 | rgb(43 52 68 / 0.45) |
| m.mishka dark  | #4B9CFF | #9589B8 | #397FC5 | #776E8A | rgb(48 55 69 / 0.55) |
| m.puchitsa dark| #F07855 | #42A9B5 | #B95640 | #628F8F | rgb(76 57 52 / 0.55) |
| m.hagakure dark| #A4BA82 | #C69A72 | #849B6C | #9B8069 | rgb(63 72 57 / 0.55) |
| m.souga-ha dark| #83A9CA | #F06470 | #6E8FAE | #A86D74 | rgb(55 65 76 / 0.55) |
| m.finn dark    | #A88BD2 | #D8B764 | #8D75B0 | #A08B68 | rgb(68 59 79 / 0.55) |
| m.merle dark   | #72B9E2 | #9BC58C | #679FC2 | #7F9D78 | rgb(54 70 82 / 0.55) |
| m.rosaria dark | #B65B7C | #8B78B5 | #8D4962 | #806A7D | rgb(70 53 67 / 0.55) |
| m.milly dark   | #F080A3 | #DDB45B | #BD6683 | #A98568 | rgb(78 56 66 / 0.55) |
| m.guabi dark   | #A9C957 | #F08387 | #839E48 | #A66F70 | rgb(63 72 51 / 0.55) |
| m.nemea dark   | #55C0BB | #D9A15C | #4A9592 | #9B7956 | rgb(53 70 68 / 0.55) |
| m.bernetta dark| #C75A5F | #C89055 | #98494C | #927052 | rgb(72 55 55 / 0.55) |
| m.yone dark    | #8B8581 | #E88A4C | #69635F | #9E7358 | rgb(59 56 54 / 0.55) |
| m.niv dark     | #7896B8 | #B08A68 | #647D98 | #8B7563 | rgb(55 63 73 / 0.55) |
| m.nave dark    | #7186E0 | #FF8A3D | #5D6EAD | #AE7355 | rgb(53 56 73 / 0.55) |



* regardless of theme

  - In Light mode, `--surface-pane` is #EEF5F5.
  - In Light mode, `--hp-healed` is #B8EDB2.
  - In Dark mode, `--surface-pane` is #1E293B.
  - In Dark mode, `--hp-healed` is #5E8C5B.


**Emoji Icon Replacement**
- All emoji used in UI, logs, and text outputs must be replaced with their corresponding icon image assets.
- Icon images must scale to match the surrounding text size (inline alignment).

- Replacement Mapping

| Emoji | Icon Path |
|------|-----------|
| 🔥 | `icons/fire.png` |
| ❄️ | `icons/ice.png` |
| ⚡ | `icons/thunder.png` |
| ⚔️ | `icons/melee.png` |
| 🏹 | `icons/ranged.png` |
| 🪄 | `icons/magic.png` |
| 🔓 | `icons/unlock.png` |
| 🔒 | `icons/lock.png` |

- Rules
  - Replacement is applied consistently across all display contexts (UI, logs, tooltips, etc.).
  - No emoji should remain in the final rendered output once replacement is applied.
  - Icon assets must visually match the semantic meaning of the original emoji.


#### 8.1.1 Popup Notification Logic & Display
**Visual & Overlay (Toast)**
- Position: left side, anchored above the fixed bottom primary navigation tab bar so notifications never cover the tabs.
- Layout:
  	- Flex-col-reverse (Newest notifications appear closest to the tab bar, pushing older ones up).
  	- Dynamic Width: The box size must shrink or grow to fit the length of the text precisely (with padding).
- Text and color:
    - [C] [U] for Black color, [R] for Blue color, [M] for Dark Orange. White translucent background, no border color.
    - With Super Rare titled item, override to BOLD Dark orenge. White translucent background, no border color.
- Behavior: Auto-dismiss after 5000ms. Manual dismiss **all of notification** on onClick. Status update dismisses previous status changes notification. (display only latest status changes)

**Popup Notification Logic**
- Item Drops
	- When an item drops (exclude auto-sell items), it triggers the notification with Normal style. If the item is Super Rare, The style switchs to Rare style. No notification is displayed when the inventory count of that item is greater than 20.
    - displays party number like. ex: "PT1:名工の銅の籠手を入手"
	- Logic: 伝説のショートソード triggers the rareStyle.
  	- Animation: animate-bounce (once) + animate-pulse (continuous).

- Cycle event
  - Profit usuage, praying, sortie notification. (5.1.1 Party State Machine @Specification_5.1_PROGRESS.md)

- Status Changes
	- When equipping/unequipping, it compares the old value to the new value.
    - Multi-line Trigger: If an equipment change affects multiple stats, each stat change generates its own notification block. Same clculatuon and display logic of status.  
		- Positive Change: 物防 24 → 52 (Normal style, Bold text)
		- Negative Change: 近攻 120 → 84 (Normal style, Normal weight text)
  - unlock ability. if character gains `c.unlock_(race)_ability`, and the race matches woth his race, notification like: "ケイナイアンの再起アビリティが解放されました"
    - lost its unlock conditon: "ケイナイアンの再起アビリティがロックされました"

- Level up
  - Example: "PT1 はレベルが12に上がった(装備枠が+1増えた)" with expanded equipment slot
  - Example: "PT1 はレベルが13に上がった" 

- Side quest
  - Accept: "PT1はサイドクエスト 治療 (2時間) を受けた"
  - Success: "PT1はサイドクエストを達成し、堅牢の良晶[堅2]を手に入れた"
  - Failure: "PT1はサイドクエスト 治療 (2時間) を達成できなかった"

- Auto equipment:
  - Example: "PT1ケモは 名工の木の胸当て を装備した"
  - Example:　"PT3ガルドは 宿った鉄の短剣 を 伝説の鉄の短剣に装備しなおした"

- Unlock a new party

- notification while AFK mode:
  - no notifications shows while AFK mode until at the end of AFK mode. 

#### 8.1.2 Header
- Always fixed at the top.
  - width: ~ 500 width.
- Displays:
  - (Game title) + version + (build number) + (env)
  - Game title label: "冒ケモ", 
		  - The character 「冒」 is emphasized:   
      - Scale: Larger than surrounding text
      - Rotation: −22.5° (counterclockwise)

	- env label by URL subpath const getEnvLabel = () => {
  const p = window.location.pathname; // e.g. "/Kemo-Expedition/dev/..."
  if (p.includes("/dev/")) return "D";
  if (p.includes("/beta/")) return "β";
  return "";  };
  - Use this specification's version

- Speed of Time: `▶︎ (23h)`
  - Displays the current game speed state symbol and the remaining boost duration in hours without the `x1.0` or `x1.2` multiplier text.
    - x1.0 -> `▷`
    - x1.2 or higher -> `▶︎`

- **Progress Report:** When the player presses the Speed of Time button:
  - Show the following confirmation dialog:
    - "現在の進捗を開発へ報告します。（報酬として、ゲーム進行速度が1日の間、1.2倍になります）"
    - Dialog options: YES / NO
  - If the player selects YES: 
    - Generate **format of progress data** and send to:
      - `/dev/`: DEV_DISCORD_WEBHOOK_URL environment variable defined in this repository.
      - `/beta/`: BETA_DISCORD_WEBHOOK_URL environment variable defined in this repository.
      - `/`: PROD_DISCORD_WEBHOOK_URL environment variable defined in this repository.
    - If the webhook request succeeds:
      - Set Speed of Time to x1.2. and the text is `▶︎`
      - The boost effect lasts for 24 hours 45 minites.
    - If the webhook request fails:
      - Do not apply the boost effect.
      - Keep Speed of Time at its current value.
      - Show an error message to the player.
  - When the remaining duration reaches 0h: Reset Speed of Time to `▷`

```
(Left-aligned)             (Right-aligned)
冒ケモ　v0.6.0(23) (β)    ▶︎ (23h)  200G
```
- Tab header (primary navigation):
  - Expedition: 探索
  - Party: パーティ
  - Base: 拠点
  - Diary: 日誌
  - Setting: 設定

- If wide mode (two tabs) is on, it displays Expedition (always visible) and other tabs player selects.
  - One tabs width: ~ 500 width.
  - Threshold: 700 width, then two tabs mode.

- Header is always visible; tabs never cause full page reload.
- Each tab's scrollable content must retain at least `4rem` of bottom clearance plus `env(safe-area-inset-bottom)` so its final content remains visible above the fixed primary navigation and device safe area.

-IF 自動周回 is OFF, display "静止中" in the header (right-aligned: 200G 静止中) with Sub color
 and tap "静止中", then 自動周回 is ON.


**Format of progress data**
- Readable format for discord channel post.

- **Post content:**
  - Send the header and PT summaries in a single Discord message.
- Header:
  - Name
    - name, lanugage:  ex. `Tom (en)`
  - Report count
    - Total number of sending report , the last report time
    - ex. `12 (12 hours ago)`
  - Super rare
    - Display the total number of Super Rare items obtained, followed by the increase since the previous report.
    - ex. `120 (+3)`
  - Jewel
    - Display the total number of Jewels obtained, followed by the increase since the previous report.
    - ex. `220 (+8)`
	
  - Place the PT summaries, with no title or column-header row.
	- `PT`: PT number ( PT1, PT2 ....)
	- `Level`: level and experience, followed by the increase since the previous report.
	  - ex. 12, 24% (+54%)
	  - EXP gained may exceed 100% if the party leveled up. ex. 14, 44% (+120%)
	- `HP`: max Party.`d.HP`, followed by the increase since the previous report.
	  - ex. 20,543 (+2,045)
	- `ATK`: otal ranged, magic, and melee attack damage, in that order, followed by their respective increases since the previous report.
	  - ex. 10,200/6,244/8,127 (+545/+322/+0)
	- `ID`: `x.exp_id` (1,2,.)
    - `Difficulty offset`: (ex. [+3] )
	- `Outcome`: The latest outcome ( Clear )
    - `Room`: the deepest room of the latest expedition

  - Gold and Paid Refresh cost  (ex. 7,174,903G (800G))
  - Version Build env: (ex. v0.7.0 (12) dev)
  - browser, version:
  - User ID
  - OS version: (ex. iOS 26.4.2)
  - Resolution: (ex. 390 px, 844 px) 


- **Attached File**
  - (1) Status table. 
    - Attach an HTML file containing the detailed status table.
		  - The HTML file should use a readable table layout optimized for desktop and mobile viewing.
  - (2) Latest Battle Log HTML file.
    - Select the target party using the following priority order:
    1. Highest level
    2. Highest experience points
    3. Smallest PT number (PT1 → PT6) when tied


- Status table
  - `PT-列`: PT number and row, bold (1-1, 1-2...)
  - `名前, ビルド`: オルカ, 🐶女剣剣砂好
    - Character name, 
    - Race icon. (🐶, 🦊 etc..)
	- Gender. (♂ -> 男/ ♀ -> 女)
    - Main Class. Display `short name` of Class ( `class.duelist` -> `剣`)
    - Sub Class. Display `short name` of Class ( `class.duelist` -> `剣`)
    - Lineage. Display `short` of lineage (`sandstorm` -> `砂`)
    - Predisposition. Display `short` of predisposition (`Aggressive` -> `好`)
  - `物防`: `d.physical_defense` (`f.defense_amplifier` for `attack_type = ranged` and `attack_type = melee`) ( 1,203. 87% )
  - `魔防`: `d.magical_defense` (`f.defense_amplifier` for `attack_type = magical`) ( 1,100. 54% )
  - `回避,貫通`: ( +10, 8%)
    - `evasion` display x1000, no percentage.   ( +10 )
    - `f.penet_multiplier` ( 8%)
  - `攻撃`: 
    - If character has `c.equip_ranged`, 遠`d.ranged_attack`(`f.offense_amplifier` for `attack_type = ranged`)-`d.ranged_NoA`回 ( 遠2,000. 145%, 3回 )
    - If character has `c.equip_magic`, 魔`d.magical_attack`(`f.offense_amplifier` for `attack_type = magical`)-`d.magical_NoA`回 ( 魔2,000. 145%, 12回 )
    - If character has `c.equip_melee`, 近`d.melee_attack`(`f.offense_amplifier` for `attack_type = melee`)-`d.melee_NoA`回 ( 近2,000. 175%, 3回 )
    - `f.elemental_offense_attribute`(its value)  ( 🔥(+20%) )
      - ice: ❄
      - thunder: ⚡
      - fire: 🔥
  - `属防`: `f.elemental_resistance_attribute`
    - fire/ice/thunder/ (120%, 65%, 40%)
  - `アビリティ`: Display all abilities owned by the member using Japanese short names and levels ( 壁1, 指揮1, 浪費1 )

#### 8.1.3 Icon 
- Use `/public/app_icon.png` as the Home Screen icon when the web application is added to the iPhone Home Screen.
- Configure the icon as the Apple Touch Icon in the HTML metadata.
- The icon should be a square image with no transparency and sufficient padding to remain recognizable at small sizes.
