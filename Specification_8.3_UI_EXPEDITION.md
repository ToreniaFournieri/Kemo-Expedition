## 8. UI

### 8.3 UI_EXPEDITION

- If 自動周回 is ON, it repeats repart to the dungeon.

- **Expedition Depth Limit (探索深度)**
  - Players can set a depth limit; when the party reaches the selected floor, it stops the expedition and returns home automatically.
  - Selectable Options : 1F-3まで/2F-3まで/3F-3まで/4F-3まで/5F-3まで/ボス直前まで/全て (default: 全て)


```
left-aligned                                    right-aligned
PT1 HP (HP bar, blue) `x.expedition`.name       outcome `condition`.label ▼
```

- Difficulty Offset (難易度):
  - Adjustable with a slider from +0 to +30. Default: 0
  - The selected value is added to the level of all enemies in the selected expedition.
  - This option becomes available only after the party has defeated that expedition’s Boss at least once (lifetime, party-wide).
  - Scope: The offset is independently stored per party–expedition pair and does not affect other expeditions.

- "###" part: HP donuts bar, sub-color


- **Sub progress bar:**
  - Visibility:
    - Displayed only when `state` is `state.sell` or `state.explore`.
    - For all other states, render an empty placeholder to preserve layout height.
  - Represents elapsed time within the current `Step`.
  - Fills **continuously** from 0% → 100% during a single `Step` (e.g., 15 seconds).
  - **Synchronization:**
    - The mini progress bar is strictly synchronized with real-time `Step` duration (including debug time scaling).
  - Style:
    - Progress fill: Sub color with 40% opacity (α = 0.4)
    - Background: Transparent

- **"出撃" / "神魔戦" Buttons:**
  - State: Disabled (grayed out) when the action is not available.
  - Disable conditions:
    - Party HP = 0
    - Party is in `state.explore`

```
( ####### ) PT1 ルピニアンの断崖   踏破  好調▼
( ##   ## ) ボス撃破 でヴァルンの樹林帯 開放
( ####### ) 📜 10回アイテム獲得を空振りする(10%, 1回, 残り4時間)
移動中: flavor text (background: state progress bar)
(Sub progress bar)

ルピニアンの断崖(pull down list)  探索深度 全て 出撃
難易度: (Slider) +10
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

  - Currently selected dungeon with Loot-Gate conditions (ex. 2nd Elite Gate is locked: 2/6 Floor 2 Uncommons collected.)
  - List of available dungeons with Loot-Gate conditions
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
  - 次の目標: show next Loot-Gate condition. 

- **Gods Battle (神魔戦)**
  - Loot Gate Condition: Collect X Boss rare items in dungeons to unlock Gods Battle. (If Gods battle condition is `Simple`, 1 Boss rare items instead)
    - "特殊目標: `x.expedition`のボスレアアイテム 0/1 で神魔`godname`戦"
  - UI / Trigger:
    - When the condition is met, the 「出撃」(Deploy) button changes to 「神魔戦」(Gods Battle).
    - The player must manually press the 「神魔戦」 button to start the special battle.
    - Gods Battle cannot be triggered during Auto-Run (自動周回).
  - Battle Rules:
    - The normal boss is replaced by a God (a highly formidable enemy)
  - Outcome Handling:
    - **On Victory**
      - The button reverts from 「神魔戦」 → 「出撃」.
      - The Loot Gate counter resets to 0 Boss items collected.
      - The player can repeat the cycle.
    - **On Defeat**
      - The 「神魔戦」 button remains available.
      - The player may retry the Gods Battle without re-collecting Boss rare items.
  - **Party Pane Visual State:**
    - During Gods battle, the Party pane border uses the Sub color theme (emphasis state).
    - On battle end, the border style reverts to the default (normal) style. 

- Unlocked party:

```
PT4: (未開放:キョウエン 狡猾の神 撃破で開放)
```
