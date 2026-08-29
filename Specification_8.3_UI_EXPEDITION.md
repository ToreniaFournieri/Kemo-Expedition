## 8. UI

### 8.3 UI_EXPEDITION

- **Auto Destination Change Logic**

**Controls:**  
- Toggle: **一任 / 固定**  Default: 一任
- `Destination` pull-down list
- `Expedition Depth Limit` pull-down list

- Togglr Mode Behavior
  - 一任 (Auto)
    - At the end of `state.rest`, automatically evaluate whether the party should move to the next expedition.
    - Destination is automatically updated when this condition is satisfied. During AFK emulated mode, check at the end of each logical Chunk defined in Spec 5.1; an AFK scheduler yield is not a check boundary.
    - Condition for automatic progression:

```text
(1) If {the expedition has been cleared at least once} and  {current PT level >= expedition.`x.enemy_level` + (Difficulty Offset level) + 9}
and {condition ≥ 250}
→ Move to the next expedition

(2) If {the expedition has been cleared at least once} and  {current PT level >= expedition.`x.enemy_level` + (Difficulty Offset level) + 10}
and {condition ≥ 240}
→ Move to the next expedition

(3) If {the expedition has been cleared at least once} and  {current PT level >= expedition.`x.enemy_level` + (Difficulty Offset level) + 11}
and {condition ≥ 230}
→ Move to the next expedition

```

- 固定 (Fixed)
  - The party remains at the player-selected Destination.
- Manual Destination Selection
  - If the player manually selects an expedition from the Destination pull-down list:
  - The mode is automatically changed to 固定(Fixed).

- Toggle Operation
  - Tapping the 一任 / 固定 label switches between the two modes.
  - This functions as a manual toggle between Auto and Fixed mode.

- **`Destination` pull-down list**

- **Expedition Depth Limit (探索深度)**
  - Players can set a depth limit; when the party reaches the selected floor, it stops the expedition and returns home automatically.
  - The selection form should remain compact:
  - Display width is small, and showing only a short label such as `1F-3` is sufficient. 
  - Selectable Options : 1F-3 floor_nameまで/1F-4 floor_nameまで/2F-3 floor_nameまで/2F-4 floor_nameまで/3F-3 floor_nameまで/3F-4 floor_nameまで/4F-3 floor_nameまで/4F-4 floor_nameまで/5F-3 floor_nameまで/5F-4 floor_nameまで/floor_nameボス直前まで/全て (default: 全て)
    - `floor_name` uses the Japanese name from **Expedition Floor Concepts**.
    - Example: 2F-3 捕食者の縄張りまで, 2F-4 捕食者の縄張りまで, 3F-3 群生の巣盆地まで

- **Simulation Run (シミュレーション実行)**
  - Pressing the `予測実行` button triggers **1000** simulated expedition runs.
  - Simulation runs have no effect on actual game progress or state:
    - No EXP is gained.
    - No items are obtained.
    - No notifications are generated.
    - Clear-Gate progress is not updated.
  - Because each simulation run is resolved only inside a private clone and exposes only aggregated outcomes, its battles use the result-only production battle output mode:
    - Preserve the authoritative C++ outcome, final HP, enemy hit count, updated threat bags, random consumption, seed, and replay metadata.
    - Do not construct the TypeScript narration context, localize semantic events, or allocate `BattleLogEntry` objects.
    - The private simulation may use empty per-room `details` arrays because neither its expedition log nor its cloned state may be retained or displayed.
  - Online play, Gods Battles, AFK processing, Experimental AI API sorties, latest expedition logs, and Diary logs must continue using full narrated battle results. The result-only mode must not be selected merely because execution is batched or backgrounded.
  - The simulation is processed asynchronously.
  - When all runs are complete, display the aggregated result:
    - If the run reaches the expedition completion condition: `Example: 踏破45.1% / 引分10.0% / 撤退34.9% / 敗北10.0%`
    - If the run reaches the configured return depth limit: `Example: 帰還45.1% / 引分10.0% / 撤退34.9% / 敗北10.0%`
  - UI visual: 100% stacked horizontal bar
    - 踏破 or 帰還: Sub color, 20% lighter
    - 引分: Sub color, 50% lighter
    - 撤退: Accent color, 50% lighter
    - 敗北: Accent color, 20% lighter
    - Segment widths correspond to their respective outcome percentages.
    - Display a floating tooltip/bubble over the bar with the full result, e.g. `踏破45.1% / 引分10.0% / 撤退34.9% / 敗北10.0%`


```
left-aligned                                    right-aligned
PT1 HP (HP bar, blue) `x.expedition`.name       outcome `condition`.label ▼
```

- Difficulty Offset (難易度):
  - Adjustable with a slider from +0 to `2 × ceil(min(80, 88 - x.enemy_level) / 2)`. Default: 0
  - Step: +2 per step
  - The slider has a − button on the left and a + button on the right. Each tap decreases or increases the value by one step.
  - Higher Difficulty Offset values grant additional reward tickets:
    - Additional Item Chance Ticket: +1 ticket at +2, +6, +10, +14, and every +4 thereafter.
    - Additional Super Rare Chance Ticket: +1 ticket at +4, +8, +12, +16 and every +4 thereafter.
    - Example: At Difficulty Offset +12, the party gains:
      - +3 Additional Item Chance Tickets
      - +3 Additional Super Rare Chance Tickets
  - **Display Style**
    - Slider value display: +12 (🍀+3, ✨+3)
      - Where:
        - 🍀 represents Additional Item Chance Tickets.
        - ✨ represents Additional Super Rare Chance Tickets.
	- Floating bubble:
      - When the user adjusts or interacts with the Difficulty Offset slider, display a floating bubble showing the current effects:
        - 敵レベル +12
        - アイテム獲得チャンス +3
        - 超レア獲得チャンス +3

  - The selected value is added to the level of all enemies in the selected expedition.
  - This option becomes available only after the party has defeated that expedition’s Boss at least once (lifetime, party-wide).
  - Scope: The offset is independently stored per party–expedition pair and does not affect other expeditions.


- **Outer Ring (`###` area):**
  - Display as the **HP donut bar**.
  - Use **sub-color** for the fill.

- **Inner Ring (`###` area):**
  - Display as the **`condition` donut bar**.
  - The fill origin is fixed at the **12 o’clock position (top center)**.
  - If `condition` is positive:
    - Fill using **sub-color**, progressing **clockwise** from the top.
  - If `condition` is negative:
    - Fill using **accent color**, progressing **counterclockwise** from the top.

- Floating bubble text for outer and inner ring: show HP current / max, `condition`, condition.label (condition.value) 

```
HP 2350 / 4680
好調 (+267)
```


- **Sub progress bar:**
| Normal Clear-Gate condition | 🚪0/9 1F-4解放 | 連続攻略成功 0/9 で 1F-4解放 |
    - Displayed only when `state` is `Step-based`. (example: `state.rest`, `state.sell`, or `state.explore`)
    - For all other states, render an empty placeholder to preserve layout height.
  - Represents elapsed time within the current `Step`.
  - Fills **continuously** from 0% → 100% during a single `Step`.
  - **Synchronization:**
    - The mini progress bar is strictly synchronized with real-time `Step` duration (including debug time scaling).
  - Style:
    - Progress fill: Sub color with 40% opacity (α = 0.4)
    - Background: Transparent

- **"出撃" / "神魔戦" Buttons:**
  - State: Disabled (grayed out) when the action is not available.
  - Disable conditions:
    - (Party HP = 0) and (0 Charges).
    - Party is in `state.explore` and 0 Charges.
    - "神魔戦" button is pressed and party is going to engage gods battle.
  - Exception:
    - If x.exp_id = 0 (Colosseum):
    - No Instant Expedition Charge is consumed.
    - Departure is always allowed, regardless of the above conditions.

**Progress Visual Update**
- Display compact progress summaries in the party pane without changing the pane height.

- Examples:

| Type | Compact display | Floating bubble text |
|---|---|---|
| Entry gate condition | 🗺️ボス撃破せよ| ボス撃破 でヴァルンの樹林帯 開放 |
| Normal Clear-Gate condition | 🚪0/9 1F-4解放 | 連続攻略成功 0/9 で 1F-4解放 |
| Gods Battle gate condition | 🗃️2/3 神魔解放 | ボスレアアイテム 2/3 で神魔タヌエ戦 |
| Side quest | 📜 660分治療を受ける 🕘 | 660分治療を受ける（9%, 63分, 残り9時間） |

- The thin line progress bar is displayed under the text.
- Each progress item uses `current / total` progress.
- A locked Clear-Gate's compact display, progress bar, and floating bubble show `current / total` progress.
- Normal Clear-Gate progress updates after the normal expedition outcome is finalized. A `Clear` or `Turned_Back` increments it, while `Draw_Retreat`, `Wounded_Retreat`, or `Defeat` displays the reset value, such as `0/9` for the first Elite gate.

**Progress calculation:**

| Type | Progress |
|---|---|
| Entry gate condition |  none |
| Normal Clear-Gate condition | `current / total` consecutive successful runs |
| Gods Battle gate condition | `current / total`|
| Side quest | `current / total` |

**Remaining time icon:**

- For timed side quests, display a clock icon after the side quest text.
- The clock icon represents the remaining limit time.
- Example: `🕘` means approximately **9 hours remaining**.
- Detailed remaining time is shown only in the floating bubble.

**First row text**
- Party name: PT1, PT2, ...
- **Latest Expedition Floor**
  - Display the latest reached floor name of the current expedition.
  - Use the Japanese floor name defined in **Expedition Floor Concepts**.
  - Example: `ケイナイアンの廃都`
- **Charge**
	- Display the remaining Instant Expedition stock as a battery-style indicator.
    - Right aligned
	- Each filled cell represents 1 available Instant Expedition stock.
	- Maximum stock is 6.
	- Display empty cells with ▱.
    - Immediately after the battery indicator, display the remaining time until the next stock is generated. The value (or MAX text) is always shown in minutes and rendered in _italic_ text.
		- Example: ▰▰▰▰▱▱102.
		- If fully charged, display ▰▰▰▰▰▰MAX.
		- If no stock is available, display ▱▱▱▱▱▱12.
	- Pressing `出撃` or `神魔戦` button consumes 1 stock and immediately processes one full cycle:
      - If the party is currently in `state.explore`, the current exploration is completed immediately first, then one additional full cycle is processed. (note: always end at the beginning of `state.rest` )
      - State:  `state.explore` → `state.return` → `state.rest` → `state.free_action` → `state.sound_sleep` (optical) → `state.move` → `state.explore` → `state.return` 
      - The process ends after the final `state.return` is completed.
	- If a Gods Battle is available, the instant expedition is processed as a Gods Battle.
  - **Special boost:** 
    - Each cleared expedition tier increases the maximum charge time that can be accumulated for each stock slot.
    - If the max charge is 3, display ▰▰▰MAX.

| Stock Level | initial | After clearing expedition 1 | After clearing expedition 2 | After clearing expedition 3 |
| --- | -----: | -----: | -----: | -----:|
| 1st |  1 min |  2 min |  4 min |  6 min |
| 2nd |  2 min |  4 min |  8 min | 12 min |
| 3rd |  4 min |  8 min | 15 min | 24 min |
| 4th | (none) | 15 min | 30 min | 48 min |
| 5th | (none) | (none) | 60 min | 96 min |
| 6th | (none) | (none) | (none) |192 min |


- **Outcome**
  - Display the latest expedition result such as `踏破`, `撤退`, `敗北`, etc.
- **Update Timing**
  - Update both the Latest Expedition Floor and Outcome only at the end of `state.explore`, to prevent spoilers during exploration
- **Expand / Collapse Toggle**
  - Display `▼` at the end of the row for expandable party details.

```
( ####### ) PT1 ケイナイアンの廃都 ▰▰▰▰▱▱112  踏破 ▼
( ##   ## ) 
( ####### ) 🗃️2/3 神魔解放 📜660分治療を受ける 🕘 
移動中 (background: state progress bar)
(Sub progress bar)

一任 ルピニアンの断崖(pull down list)  探索深度 全て 出撃
難易度: (Slider) +10
予測実行   踏破45%/引分10%/撤退30%/敗北10%
(Left-Aligned)                           (Right-Aligned)
踏破U/帰還V/引分W/撤退X/敗北Y 合計 Z回    リセット
EXP: L489 | 自動売却額: 134G

PT2...
```

- Per party:
  - Background images for party pane:
    - The image must scale to fit the full width of the pane. (not the screen width)
- Background images for expedition pane:
  - The image is fixed so it stays in place when scrolling.
  - Adding gray background color behind the image in dark mode. (No need to invert the image color)
  - If `x.exp_id` == 1, use: `public/background/Caninian-Plains.png`.
  - If `x.exp_id` == 2, use: `public/background/Lupinian-Taiga.png`.
  - If `x.exp_id` == 3, use: `public/background/Vulpinian-Ocean.png`.
  - If `x.exp_id` == 4, use: `public/background/Felidian-Desert.png`.
  - If `x.exp_id` == 5, use: `public/background/Ursan-Pyrepeak.png`.
  - If `x.exp_id` == 6, use: `public/background/Procyonian-Burrow.png`.
  - If `x.exp_id` == 7, use: `public/background/Leporian-Moon-Palace.png`.
  - If `x.exp_id` == 8, use: `public/background/Cervin-Vale.png`.
  - Else: none.

    - note: prompt of images ""Style is minimal, atmospheric, and readable: - Portrait,  - no soft shading, - no fine texture noise, - only gray tones + halftone dots (30 pxiel), - include all of terrain concepts"

  - Currently selected dungeon with Clear-Gate conditions (example: the 2nd Elite Gate is locked with 2/8 consecutive successful runs.)
  - List of available dungeons with their Clear-Gate conditions

  - **OBSOLETED: REMOVE THIS FROM THE RUNTIME PROGRAM**
	- **Flavor text**
	  - The system selects flavor text from `Specification_5.2_PROGRESS_FLAVOR_TEXT.md`.
	  - The **speaker name** of the flavor text is resolved to the party member who satisfies the triggering condition (race, main class, or ability holder).
      - Conditions may reference:
	    - any party member’s race
	    - any party member’s main class
	    - any party member’s abilities
	    - the party’s religion
	    - other defined party-wide attributes
	  - Therefore, every party member is a potential trigger source for flavor text selection.
	  - **Flavor text cycle update**
	    - State types:
	      - **Step-based states:** Flavor text is updated on each `Step` progression (only `state.sell` and `state.explore`).
	      - **Continuous states:** Flavor text refreshes every 1 `Step` (e.g., `state.rest`, `state.sleep`, `state.feast`, `state.idle` etc.).
  
  - Expedition behavior:
    - Expedition resolves immediately
    - No loading scenes
  - Show latest `f.quick_summary`.
    - Tapping the quick summary shows a `f.list_of_rooms`.
    - Tapping a room opens the `f.battle_logs`.
    - Tap enemy’s name part to show floating bubble of its bestiary. 
```
ID: 6055
レベル: 42
HP: 16,035 
クラス: 忍者 /賢者
タイプ: ゴーレム
遠距離攻撃: 649 x 32回 (x5.80)
物理命中率: 100% (減衰: 95.0%)
魔法攻撃: 701 x 12回 (x5.80)
詠唱魔法: アルカナアロー
属性: 無 (x1.00)
物理防御: 330 (100%)
魔法防御: 550 (100%)
魔法命中率: 100% (減衰: 95.0%)
回避: 30
属性耐性: 🔥100%,❄️100%,⚡130%
ボーナス: 成長1.3倍, 雷防x1.3
アビリティ:先制攻撃1, 含金1, 魔封1
ドロップ候補: [6E]継ぎ獣導杖 / [6E]合成獣秘録 / [6E]継核触媒 / [6U]落雷の杖 / [6C]駆動コア片
```
  - 次の目標: show the next Clear-Gate condition.

- **Gods Battle (神魔戦)**
  - Gods Battle gate condition: Collect X Boss Rare items in dungeons after defeating the dungeon boss at least once. If the Gods Battle condition is `Simple`, require 1 Boss Rare item instead.
    - "特殊目標: `x.expedition`のボスレアアイテム 0/1 で神魔`godname`戦"
  - UI / Trigger:
    - When the condition is met, adding「神魔戦」(Gods Battle) next to 「出撃」 button. (神魔戦, 出撃 button order) 
    - The player must manually press the 「神魔戦」 button to start the special battle.
    - Gods Battle cannot be triggered during Auto-Run (自動周回).
  - Battle Rules:
    - The normal boss is replaced by a God (a highly formidable enemy)
  - Outcome Handling:
    - **On Victory**
      - The button reverts from 「神魔戦」 → 「出撃」.
      - The Gods Battle gate counter resets to 0 Boss Rare items collected.
      - The player can repeat the cycle.
    - **On Defeat**
      - The 「神魔戦」 button remains available.
      - The player may retry the Gods Battle without re-collecting Boss rare items.
  - **Party Pane Visual State:**
    - After pressed "神魔戦" button, during `state.move` and `state.explore` of Gods battle, the Party pane border uses the Sub color theme (emphasis state).
    - On battle end, the border style reverts to the default (normal) style. 

- Unlocked party:

```
PT4: (未開放:キョウエン 狡猾の神 撃破で開放)
```
