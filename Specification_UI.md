## 8. UI

- Platform: Web-based (React + TypeScript + Tailwind)
  - Style: Compact, simple, iOS-like
  - Navigation: Minimal scene transitions, tab-centered
- Interaction philosophy:
  - Fast feedback
  - No modal spam
  - Most actions resolve immediately
  
- **Color Scheme**
- Base colors
  - Text: Black
  - Pane / card background: Gray
  - Page background: White
- Sub color (~30%)
  - Blue (information, selection, links)
- Accent color (~5%)
  - Dark Orange (important actions, warnings, highlights)

### 8.1 Notification Logic & Display
**Visual & Overlay (Toast)**
- Position: bottom and left side
- Layout:
  	- Flex-col-reverse (Newest notifications appear at the bottom, pushing older ones up).
  	- Dynamic Width: The box size must shrink or grow to fit the length of the text precisely (with padding).
- Text and color:
    - [C] [U] for Black color, [R] for Blue color, [M] for Dark Orange. White translucent background, no border color.
    - With Super Rare titled item, override to BOLD Dark orenge. White translucent background, no border color.
- Behavior: Auto-dismiss after 5000ms. Manual dismiss **all of notification** on onClick. Status update dismisses previous status changes notification. (display only latest status changes)

**Notification Logic**
- Item Drops
	- When an item drops (exclude auto-sell items), it triggers the notification with Normal style. If the item is Super Rare, The style switchs to Rare style.
    - displays party number like. ex: "PT1:名工の銅の籠手を入手"
	- Logic: 伝説のショートソード triggers the rareStyle.
  	- Animation: animate-bounce (once) + animate-pulse (continuous).

- Status Changes
	- When equipping/unequipping, it compares the old value to the new value.
    - Multi-line Trigger: If an equipment change affects multiple stats, each stat change generates its own notification block. Same clculatuon and display logic of status.  
		- Positive Change: 物防 24 → 52 (Normal style, Bold text)
		- Negative Change: 近攻 120 → 84 (Normal style, Normal weight text)


### 8.2 Header
- Always fixed at the top.
- Displays:
  - Game title + version + (env)
    - env label by URL subpath const getEnvLabel = () => {
  const p = window.location.pathname; // e.g. "/Kemo-Expedition/dev/..."
  if (p.includes("/dev/")) return "開発環境";
  if (p.includes("/qa/")) return "αテスト";
  return "";  };
  - Use this specification's version
```
(Left-aligned)             (Right-aligned)
ケモの冒険　v0.2.3 (αテスト)        200G
```
- Tab header (primary navigation):
  - Party
  - Expedition
  - Inventory
  - Diary
  - Divine Bureau

- Header is always visible; tabs never cause full page reload.

### 8.3 Party tab
#### 8.3.1 Displays

- List of party
  - Potentially there are 6 parties.
```
  PT1    PT2    PT3    PT4    PT5     PT6
```
- Name of deity. Editable, but not duplication. If one deity already assgined to another PT, the deity is not selectable.

```
(Left-Aligned)                         (Right-Aligned)
再生の神 (Level: 29, Experience 123450/ 123456)    [編集]
```
 
- List of party members
    	For each character: Icon, main Class (Sub calass).
```
🐶
戦(剣)
頑/不
```

- Current status, abilities, bonuses

#### 8.3.2 Party member details
- Name, race, main class (sub class), predisposition, lineage, status, bonuses (c., aggregated), ability (a. )
- Status:

- If character has `c.grit+v`, displays 
近接攻撃:98 x 4回(x1.00)
- if character has  `c.pursuit+v`, displays 遠距離攻撃:`d.ranged_attack` x `d.ranged_NoA`回(x`f.offense_amplifier`(phase: LONG)).
  - ex. 遠距離攻撃:25 x 6回(x1.13)
- if character has `c.grit+v` or `c.pursuit+v`, displays 物理命中率: `d.accuracy_potency`　x 100 % (減衰: x (0.90 + `c.accuracy+v`)).  (ex. has `c.accuracy+0.02` and `c.accuracy+0.01`, then 0.90 + 0.02 + 0.01 -> 0.93 )
  - ex. 物理命中率: 72% (減衰: x0.90)
- If character has `c.caster+v`, displays 魔法攻撃:`d.magical_attack` x `d.magical_NoA`回(x`f.offense_amplifier`(phase: MID)). and 魔法命中率: 100 % (減衰: x (0.90 + `c.accuracy+v`)).  (ex. has `c.accuracy+0.02` and `c.accuracy+0.01`, then 0.90 + 0.02 + 0.01 -> 0.93 )
  - ex. 魔法攻撃:36 x 3回(x1.26)
  - ex. 魔法命中率: 100% (減衰: x0.90)

- Accuracy is internally calculated using the unified stats c.accuracy and c.evasion for all attack types.
- Physical Accuracy and Magical Accuracy are separated for display purposes only, based on battle phase rules.
- The MID phase ignores row-based d.accuracy_potency and is treated as fixed potency 1.00.

- *UI Formatting Note:* When displaying aggregated c.multipliers (e.g., 鎧 x1.8), always round the internal product to the first decimal place for a cleaner interface. 


```
レオン                      [編集]
🐶 ケイナイアン / 戦士(師範) / 頑強 / 不動の家
[体力:13] [力:10] [知性:10] [精神:10]
—————
Left-aligned            Right-aligned
近接攻撃:98 x 4回(x1.00)     属性:無(x1.0)
物理命中率: 85% (減衰: x0.90)     物防:108 (71%)
                              魔防:56 (83%)
                              回避:+4
—————
ボーナス: 護x1.3, 弓x1.1, 鎧x1.8, 装備+1, 根性+1, 体+3
特殊能力:
守護者: パーティへの物理ダメージ × 3/5
```

#### 8.3.3 Character Edit Mode (selected member):
**1. Contents**
- Name [edit]
- Editable `name` field.
- Race selection:
  - Displays a list of available Races.
  - Each entry shows its name, base status, and unique bonus (ex. 🐶ケイナイアン |体10,力10,知10,精10 | 護符 x1.3, 弓 x1.1)
- Main Class selection:
  - Displays a list of available Classes.
  - Each entry shows its name and unique bonus (main bonus and main/sub bonuses)
    - If Main Class == Sub Class, then show master bonus instead of main bonus.
- Sub Class selection:
  - Displays a list of available Classes.
  - Each entry shows its name and unique bonus (only main/sub bonuses)
- Predisposition selection:
  - Displays a list of available Predispositions.
  - Each entry shows its name and unique bonus.
- Lineage selection:
  - Displays a list of available Lineage.
  - Each entry shows its name and unique bonus.

**2. Edit Confirmation Rules:**
- **Done (完了):**
  - Saves all changes to Race, Class, and Name.
  - **Automatic Unequip:** All currently equipped items on this character are removed and returned to the inventory.
  - Character status updates immediately.
  - *Reason:* To prevent invalid stat states and ensure new class bonuses are calculated correctly from base values.
- **Cancel (取消):**
  - Discards all pending changes.
  -  Character remains exactly as they were (Race, Class, and Equipment are untouched).
- **UI Requirement:** Display a confirmation warning when pressing "Done": *"Saving changes will unequip all items. Proceed?"*

#### 8.3.4 Equipment management
**1. Interaction Rules:**
- **Auto-Equip:** - If there is an empty slot and the player taps an item in the inventory, that item is automatically equipped to the first available slot.
- **Replace (Single-Tap):** - Tapping an item already in a Character Slot "selects" it. Tapping an item in the inventory while a slot is selected replaces the current item with the new one.
- **Remove (Double-Tap):** - Double-tapping an item in a Character Slot removes it and returns it to the inventory.
- **Remove (Single-tap):** - Single-tap an **equipped item in inventory** and returns it to be unequipped item in inventory.
- Status updates in real time

**2. Equipment Sort logic:**
- Order: Descending order by Priority.
- Priority:
    1. Item category: 鎧>衣>盾>剣>刀>手>矢>ボ>弓>杖>書>媒 
    2. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
    3. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
    4. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.

**2. Inventory Pane:**
  - Always visible on the same screen at the bottom.
  - Stacked by item variant
  - Filter button by rarelity (right-aligned): 全て表示, 通常のみ, アンコモンのみ, レアのみ, 神魔レアのみ : [ALL] [C] [U] [R] [M] |超レア: ON/OFF
    - IF player selects [M],  　　神魔レアのみ: [ALL] [C] [U] [R] **[M]** 
    - 超レア[ON/OFF] default: OFF, if ON, filter superRare >= 1.
  - Inventory includes item category tabs:
    - Displays [耐久:鎧,衣,盾] for all character
    - If character has `c.grit+v`, displays [近距離攻撃:剣,刀,手]
    - If character has `c.pursuit+v`,
displays [遠距離攻撃:矢,ボ,弓]
    - If character has `c.caster+v`, displays [魔法攻撃:杖,書,媒]

    - Default: 鎧 or previously selected category of each character 
    - Each box has two lines:
      - First line, small and gray letters: 耐久
      - Second line, current design: 鎧,衣,盾
    - Items in inventory matching the selected category are shown (filter)
    - Adds equipped items with icon in the list.

**3. Inventory Sort Logic (within category):**
- Order: Descending order by Priority.
- Priority:
  1. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
  2. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
  3. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.
- Item Row: The name, count, and status are left-aligned on **the same line**.
	- ex. 名工のロングソード x3 | 近攻+19
- Inventory pane shows at least 10 items
- Equipped item: The name and status are left-aligned, item type is right-aligned on **the same line**.

**4. Image of inventory pane transaction at equipment management**

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x2 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```

↓(Taps "名工のショートソード" to equip it)

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x2 [C] 近攻+22
名工のショートソード x3 [C] 近攻+10
🐶名工のショートソード x1 [C] 近攻+10
```

↓(Taps "🐶名工のショートソード" to unequip it)

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x2 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```

↓(Taps "伝説のショートソード" to equip it)

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x1 [C] 近攻+22
🐶伝説のショートソード　x1 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```

↓(Taps "伝説のショートソード" again to equip it)

```
宿ったロングソード x2 [C] 近攻+31
🐶伝説のショートソード　x2 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```

↓(Taps "🐶伝説のショートソード" to unequip it)

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x1 [C] 近攻+22
🐶伝説のショートソード　x1 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```   

#### 8.4 Expedition
- If 自動周回 is ON, it repeats repart to the dungeon **every 5 seconds** (for this version). Default is OFF.

- **Expedition Depth Limit (探索深度)**
  - Players can set a depth limit; when the party reaches the selected floor, it stops the expedition and returns home automatically.
  - Selectable Options : 1F-3まで/2F-3まで/3F-3まで/4F-3まで/5F-3まで/ボス直前まで/全て (default: 全て)

```
          (Right-Aligned)
           [一斉出撃] 自動周回 ON/OFF

PT1ルピニアンの断崖踏破▼
(column 1)      (Column 2)
HP (HP bar, blue)    移動中(state progress bar)
ルピニアンの断崖(pull down list)  出撃
探索深度　　全て
次の目標: ルピニアンの断崖の神魔レアアイテム 0/1 でヴァルピニアンの樹林帯 開放
Lv: 29 | 再生の神 | +2,856EXP | +134G

PT2...
```
- Per party:
  - Currently selected dungeon with Loot-Gate conditions (ex. 2nd Elite Gate is locked: 2/6 Floor 2 Uncommons collected.)
  - List of available dungeons with Loot-Gate conditions
  - Expedition behavior:
    - Expedition resolves immediately
    - No loading scenes
  - Show latest `f.quick_summary`.
    - Tapping the quick summary shows a `f.list_of_rooms`.
    - Tapping a room opens the `f.battle_logs`.
  - 次の目標: show next Loot-Gate condition. 

#### 8.5 Inventory
- Behavior:
  - Notification pops up when acquiring a new item
  - Newly acquired items are shown in bold
  - Once displayed, text returns to normal
- Item list:
  - Stacked by item variant
  - Shows state:`s.owned` items
  - Filter button by rarelity (right-aligned): 全て表示, 通常のみ, アンコモンのみ, レアのみ, 神魔レアのみ: [ALL] [C] [U] [R] [M] |超レア: ON/OFF
    - IF player selects [M],   神魔レアのみ: [ALL] [C] [U] [R] **[M]** 
    - 超レア[ON/OFF] default: OFF, if ON, filter superRare >= 1.
  - Inventory includes item category tabs:
    - [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒].
    - Default: 鎧 or previously selected category. 
    - Each box has two lines:
      - First line, small and gray letters: 耐久
      - Second line, current design: 鎧,衣,盾
    - Only items matching the selected category are shown (filter)
  - **Inventory Sort Logic (within category):**
	- **Order:** Descending order by Priority.
	- **Priority:**
	   1. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
	   2. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
	   3. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.
  - Item Row: The name, count, and status are left-aligned, while the sell all button is right-aligned on the same line 
    - ex. 名工のロングソード x3 | 近攻+19     [全売却 39G]
  - Sell all button(全売却): Sells all item, with a warning message, and Changes item state from `s.owned` to `s.sold`
  - Inventory pane shows at least 10 items
- Actions:
  - Sell item stacks
  - Sold items disappear immediately

- **Auto-sold list** (Collapsed by default; tap to expand)
  - Sort and filter settings also apply to this list (displaying items with the state:`s.sold`)
  - Item Row: The name, count, and status are left-aligned, while the Unlock button is right-aligned on the same line
    - ex. 名工のロングソード x3 | 近攻+19     [解除]
  - Unlock button(解除): Changes item state from `s.sold` to `s.notown`

#### 8.6 Diary
- When a party was defeated, got mythic item, and acquiring super rare item, the diary updates. 
- It keeps 10 battle logs. First, it is collapsed and expand to see the detail. (Same as 結果 log in expedition. )
- Top record is latest (default position) and bottom is older logs. 

- Setting. 
```
日誌記録設定                 ▼

超レア通知 (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
神魔レア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
レア通知 (pull down list) 全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default:恐ろしい以上)
敗北通知 あり/なし
```

- Title of dirary 
```
(Left-Aligned)         (Right-aligned)
line1: [PT2]神魔レア(秘奥真理の書) 獲得      ▼
line2 gray text: ケイナイアン平原      02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] 敗北の記録           ▼
line  gray text2: ヴァルピニアンの樹林帯      02/12 20:28
```


  
#### 8.7 Divine Bureau (神聖局)


**1.Donation box (寄付箱)**
- Display donated amount of gold of each god.


- Donation Scaling (Divine Bureau)
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
再生の神(ランク3)      1,203G (次のランク 2,200G)
消耗の神(ランク2)         545G (次のランク 2,200G)
防備の神(ランク1)         0G (次のランク　500G)
...

```


**2. Clairvoyance (未来視)**
- Displays belows 

**Normal reward (通常報酬)**
  - common_reward_bag (通常報酬 抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り counts
  -	common_enhancement_bag (称号付与 抽選確率): 
    - 通常称号抽選: remaining / total counts
    - 名工の残り counts / initial counts
    - 魔性の残り counts / initial counts
   	- 宿った残り counts / initial counts
    - 伝説の残り counts / initial counts
    - 恐ろしい残り counts / initial counts
    - 究極の残り counts / initial counts
- Button (通常報酬初期化): Initialize `g.common_reward_bag` and `g.common_enhancement_bag` 

**Unieque reward (固有報酬)**
  - uncommon reward_bag (アンコモン抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  - rare reward_bag (レア抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  - mythic reward_bag (神魔レア抽選抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  -	enhancement_bag (称号付与 抽選確率): 
    - 通常称号抽選: remaining / total counts
    - 名工の残り remaining / initial counts
    - 魔性の残り remaining / initial counts
   	- 宿った残り remaining / initial counts
    - 伝説の残り remaining / initial counts
    - 恐ろしい残り remaining / initial counts
    - 究極の残り remaining / initial counts
- Button (固有報酬初期化): Initialize `g.common_reward_bag`, `g.uncommon_reward_bag`, `g.rare_reward_bag`, `g.mythic_reward_bag`  and `g.enhancement_bag` 

**Super rare reward (超レア報酬)**
  - superRare_bag (称号超レア称号付与 抽選確率):
    - 超レア称号抽選: remaining / total counts
    - 超レア残り remaining / initial counts
- Button (超レア報酬初期化): Initialize `g.superRare_bag` 

**3. Item Comedium (アイテム図鑑)**
- The Item Compendium acts as a global reference for all items within the game. Unlike the Inventory, it displays the base potential of every item, regardless of ownership status.
- View Settings:
  - Visibility: Shows all items in the database (including undiscovered items).
  - Standardized Stats: Displays item data at base level (Enhancement = 0, SuperRare = 0).
  - Filter button by rarelity (right-aligned): 全て表示, 通常のみ, アンコモンのみ, レアのみ, 神魔レアのみ: [ALL] [C] [U] [R] [M]
  	- IF player selects [M],   神魔レアのみ: [ALL] [C] [U] [R] **[M]** 
- Item category tabs: (same as Inventory tab's item list)
  - [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒].
  - Default: 鎧 or previously selected category of each character 
- UI Behavior:
  - Items are listed in a Collapsed View by default.
  - Interaction: Tap an item name to expand the detailed status panel.


**4. Bestiary (敵キャラクター図鑑)**
- A comprehensive record of all threats encountered (or to be encountered) during expeditions.
- Expedition category tabs: 原, 崖, 樹, 峰, 茂, 巣, 園, 谷
  - Each letter represents for corresponding expedition. And tap to show the enemy list of it. 

- Categorize by floor (`x.Spawn_pool`) and is reverse order of rooms (Boss first, then floor6 Normal enemies, floor 5 elite and floor 5 normal enemies…

- Enemy name: List of specific enemies found within that expedition.
  - Default: Collapsed.
- UI Behavior:
  - Interaction:
    - Tap Enemy name, Opens detailed enemy status (same logic as battle). Including drop items.
    - If enemy has no attack values, not show the corresponding values. 

```
(column 1)              (column 2)
ID: 5005                クラス: 戦士
HP: 312                 経験値: 88    
遠距離攻撃: 33 x 2回 (x1.00) 属性: 雷 (x1.2)
近接攻撃: 35 x 6回 (x1.00)  物理防御: 10 (83%)
物理命中率: 100% (減衰: x0.90) 魔法防御: 8 (80%)
魔法攻撃: 117 x 4回 (x1.00)
魔法命中率: 100% (減衰: x0.90)

(column 1)              (column 2)
ID: 5015                クラス: 魔法使い
HP: 312                 経験値: 88    
魔法攻撃: 117 x 4回 (x1.00)   属性: 雷 (x1.2)
魔法命中率: 100% (減衰: x0.90)  物理防御: 10 (83%)
                        魔法防御: 8 (80%)

```

**4. Game Reset**
  - Full reset option
  - Warning required before execution
