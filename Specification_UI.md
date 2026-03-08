## 8. UI

- Platform: Web-based (React + TypeScript + Tailwind)
  - Style: Compact, simple, iOS-like
  - Navigation: Minimal scene transitions, tab-centered
- Interaction philosophy:
  - Fast feedback
  - No modal spam
  - Most actions resolve immediately
  
- **Color Scheme**

  - `m.kemo` mode:
	- Base colors
	  - Text: Black
	  - Pane / card background: Gray
	  - Page background: White
	- Sub color (~30%)
	  - Blue `#3B82F6` (information, selection, links)
	- Accent color (~5%)
	  - Dark Orange `#EA580C` (important actions, warnings, highlights)

  - `m.luna` mode:
    - Base colors:
      - Text: Black
      - Pane / card background: Gray
      - Page background: White
    - Sub color (~30%):
      - Yellow-Orange `#c28832` (information, selection, links)
    - Accent color (~5%):
      - Blue `#0c3cea`  (important actions, warnings, highlights)
        
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
  - unlock ability. if character gains `c.unlock_(race)_ability`, and the race matches woth his race, notification like: "ケイナイアンの再起アビリティが解放されました"
    - lost its unlock conditon: "ケイナイアンの再起アビリティがロックされました"

- Level up
  - Example: "PT1 はレベルが12に上がった(装備枠が+1増えた)" with expanded equipment slot
  - Example: "PT1 はレベルが13に上がった" 

- Side quest
  - Example: "PT1はサイドクエスト 治療 (2時間) を受けた"

- Auto equipment:
  - Example: "PT1ケモは 名工の木の胸当て を装備した"
  - Example:　"PT3ガルドは 宿った鉄の短剣 を 伝説の鉄の短剣に装備しなおした"

### 8.2 Header
- Always fixed at the top.
- Displays:
  - (Game title) + version + (env)
    - Game title label: default: ケモの冒険, if `/luna/` environment: "ルナの冒険".
	- env label by URL subpath const getEnvLabel = () => {
  const p = window.location.pathname; // e.g. "/Kemo-Expedition/dev/..."
  if (p.includes("/dev/")) return "開発環境";
  if (p.includes("/qa/")) return "αテスト";
  return "";  };
  - Use this specification's version
```
(Left-aligned)             (Right-aligned)
ケモの冒険　v0.4.0 (αテスト)        200G
```
- Tab header (primary navigation):
  - Party
  - Expedition
  - Base
  - Diary
  - Divine Bureau

- Header is always visible; tabs never cause full page reload.

-IF 自動周回 is OFF, display "静止中" in the header (right-aligned: 200G 静止中) with Sub color
 and tap "静止中", then 自動周回 is ON.

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
PTレベル: 30, HP 3,742, 経験値: 1% ( 795)        [編集]

再生の神 (Level: 29, Experience 123450/ 123456)    
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
物理命中率: 85% (減衰: 90.1%)     物防:108 (71%)
                              魔防:56 (83%)
                              回避:+4
—————
ボーナス: 護x1.3, 弓x1.1, 鎧x1.8, 装備+1, 根性+1, 体+3
特殊能力:
守護者: パーティへの物理ダメージ × 3/5
```

magic caster
```
Left-aligned            
魔法攻撃:98 x 4回(x1.00) 
魔法命中率: 100% (減衰: 90.1%) 
詠唱魔法: サンダーボルト
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
- **three-state toggle(手動/補助/一任):** 　`m.auto_equipment` is controlled by a three-state toggle. This setting is configured per party member. Default: `1` SEMI

The toggle cycles through the following modes:

| Value | Mode     | label |
| ----- | -------- | ----- | 
| `0`   | `OFF`  | 手動 |
| `1`   | `SEMI` | 補助 | 
| `2`   | `FULL` | 一任 |

- **?:** floating bubble for help:

```
 手動: 装備の付け替えが自動で変わることはない
 補助: 上位の通常称号の同一装備がある場合に置き換える。空きスロットがある際に装備する (祈りフェーズ開始時)
 一任: 装備選定を一任する。自身の判断で現在の装備をすべて見直し、最適な装備構成になるよう自動で再装備する (祈りフェーズ開始時)
 ※超レア装備は置き換わる事はない
```

**2. Equipment Sort logic:**
- Order: Descending order by Priority.
- Priority:
    1. Item category: 鎧>衣>盾>剣>刀>手>矢>ボ>弓>杖>書>媒 
    2. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
    3. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
    4. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.

**3. Jewel Enhancement — Equipment Integration**
- Equipment items can be enhanced by attaching a Jewel (結晶).
- Each item supports only the Jewel types allowed by its category.
- Jewel effects apply only while the item is equipped.

- Equipment List (Collapsed State)

```
装備  4 / 4 スロット 手動?
白銀英雄の鎧 [2B] 物防+79 魔防+25 HP+32 体力+1 [鎧] [鎧]  ▲
名工の霧林司祭の法衣 [3E] 魔防+74 [魔防+8%] HP+47 回避+3 [法衣]　▲
伝説の幻導の青銅杖 [3U] 魔攻+67 [魔攻撃+9%] 魔防+25 [魔防+9%] [ワンド]　▲
```

- Expanded State (When Selected)

```
装備  4 / 4 スロット 手動
白銀英雄の鎧 [2B] 物防+85 魔防+25 HP+48 体力+1 [物防+8%] [鎧] ▼
 堅牢: 1 2 3 4 **5** 6 7 8
 障壁: 1 2 3 4 5 6 7 8 
 影走: 1 2 3 4 5 6 7 8
 [物防+8%] 物防+16 HP+16
名工の霧林司祭の法衣 [3E] 魔防+74 [魔防+8%] HP+47 回避+3 [法衣]　▲
伝説の幻導の青銅杖 [3U] 魔攻+67 [魔攻撃+9%] 魔防+25 [魔防+9%] [ワンド]　▲
```

- UI Rules
  - ▼ = expanded
  - ▲ = collapsed
- Rank Display
  - Black number → Jewel owned
  - Gray number → Jewel not owned
  - Sub color bold number → Currently equipped Jewel rank

- Behavior Rules
  - Attachment
    - Only one Jewel per equipment item.
    - Jewel rank must exist in inventory.
    - Attaching replaces existing Jewel (if any).
  - Removal
    - Tap Sub color bold number to remove the jewel.
    - If the equipment is Unequipped (Moved to inventory)
    - The attached Jewel automatically returns to inventory.
  - Jewel effects are active only while the item is equipped.
  - Combination is not permanent.


**4. Inventory Pane:**
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

**5. Inventory Sort Logic (within category):**
- Order: Descending order by Priority.
- Priority:
  1. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
  2. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
  3. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.
- Item Row: The name, count, and status are left-aligned on **the same line**.
	- ex. 名工のロングソード x3 | 近攻+19
- Inventory pane shows at least 10 items
- Equipped item: The name and status are left-aligned, item type is right-aligned on **the same line**.

**6. Inventory in party tab respects `item_category_x1.x` amplifier**
- If a character has a category amplifier (e.g., 刀 x2.2 / with `c.katana_x1.4`, `c.katana_x1.3`, `c.katana_x1.2`, internally 2.184), the item’s displayed stats already include this multiplier.
  - Example: "宿った石刃の太刀 [1C] shows 近攻 +96" in the character equipment pane in Party tab, even though its value is "近攻 +44" in Inventory tab, because the katana category multiplier is applied.


**7. Image of inventory pane transaction at equipment management**

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
- If 自動周回 is ON, it repeats repart to the dungeon.

- **Expedition Depth Limit (探索深度)**
  - Players can set a depth limit; when the party reaches the selected floor, it stops the expedition and returns home automatically.
  - Selectable Options : 1F-3まで/2F-3まで/3F-3まで/4F-3まで/5F-3まで/ボス直前まで/全て (default: 全て)

```
PT1 HP (HP bar, blue) ルピニアンの断崖踏破▼
移動中(background: state progress bar)
次の目標: ルピニアンの断崖のボスレアアイテム 0/1 でヴァルンの樹林帯 開放

ルピニアンの断崖(pull down list)  探索深度 全て 出撃
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

- **Gods Battle (神魔戦)**
  - Loot Gate Condition: Collect 10 Boss rare items in dungeons to unlock Gods Battle. (If it is /dev/ environment, 1 Boss rare items instead)
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
      - The Loot Gate counter resets to 0 Mythic items collected.
      - The player can repeat the cycle.
    - **On Defeat**
      - The 「神魔戦」 button remains available.
      - The player may retry the Gods Battle without re-collecting Boss rare items.


- Unlocked party:

```
PT4: (未開放:キョウエン 狡猾の神 撃破で開放)
```

#### 8.5 Base(拠点)
- It has two tabs inside Base tab. Shop(お店), Inventory(所持品), Jewel store(結晶店) , Workshop(工房), Altar(祭壇). (same visual UI as List of party (PT1, PT2...) tab in Party tab)
  - Default: Shop
  - not available for Jewel store(結晶店), Workshop(工房), Altar(祭壇) in this version. (Gray out)
	
##### 8.5.1 Shop (お店)

- **Function:** Sells items.
- **Shop name:** フェリスのガラクタ屋 (Felis’s Junk Shop)

**Dialogue pane (UI)**
- **Column 1:** Shop owner icon (Mustelid icon)  
- **Column 2:** Dialogue + countdown  
  - 表示例: （商品洗替まであと 34 分）
- **Column 3:** 有償洗替 X,XXXG

**Dialogue by intimacy**
| Intimacy | Dialogue |
|--------|----------|
| 0–19 | 「ひょっとしたらいいお宝が眠ってるかもしれないよ？……おっと、獲物には触らんといてな。」 |
| 20–39 | 「お、また来たのかい。うちのガラクタも、見ていくうちに味が出てくるもんさ。」 |
| 40–79 | 「やぁ。奥の棚も見ていいよ。運が良けりゃ掘り出し物があるかもな。」 |
| 80–99 | 「待ってたよ。あんたには特別な品も回してるんだ。……他の客には内緒だぜ？」 |

**Paid Refresh (有償洗替):**  
  - **Cost:** `2,000G × 2 ^ (refresh_count - 1)`  
    - Example:  
      - 1st use: 2,000G  
      - 2nd use: 4,000G  
      - 3rd use: 8,000G  


**Lineup**
- **Lineup:** 5 items from Tier 1 to Tier X (**up to the highest tier whose boss the player has defeated**).

| Intimacy | Lineup |
|---|---|
| 0–19 | 5 Common |
| 20–39 | 1 Uncommon, 4 Common |
| 40–79 | 1 Elite rare, 2 Uncommon, 2 Common |
| 80–99 | 1 Boss rare, 2 Elite rare, 2 Uncommon |

### Display (rarity color)
- Common: non-bold  
- Uncommon: **bold**  
- Elite rare: Sub color (blue)  
- Boss rare: Accent color (dark orange)

**Mystery enhancement (same as item drop logic)**
- When the player selects an item to buy, roll:
  - Draw 1 ticket from `g.enhancement_bag`.  
    - If the drawn ticket ID is `0`, redraw until the ticket ID is `>= 1`.
  - Draw 1 ticket from `g.superRare_bag`.
- The resulting enhancement/title is **hidden until purchased** (can become a Super Rare title item).
- **UI examples:** `?木の盾 100G`, `?木の胸当て 100G`
- **Notification:** 「店から 名工の木の盾 を購入した！」
  - if it is auto-sell item: 「店から 名工の木の盾 を購入して失望した(自動売却)」and sold it automatically. 


**Price (per item, by tier)**
- see `2.5.5 Item price` @Specification_CONSTANTS_&_DATA.md

- Refresh timing
  - Shop lineup refreshes every 8 hours at **02:00, 10:00, 18:00** (local time).
  - `paid_refresh_count` resets to `0` at each refresh time.
  - Intimacy decays by **10% (multiplicative)** at each refresh time.

- Intimacy cap
  - Intimacy is capped at **99**.


##### 8.5.2 Inventory(所持品)
- Behavior:
  - Notification pops up when acquiring a new item
  - Newly acquired items are shown in bold
  - Once displayed, text returns to normal
- Item list:
  - Stacked by item variant
  - Shows state:`s.owned` items and **equiped items**.
  - Filter button by rarelity (right-aligned): 全て表示, 通常のみ, アンコモンのみ, エリートレアのみ, ボスレアのみ, 神魔レアのみ: [ALL] [C] [U] [E] [B] [M] |超レア: ON/OFF
    - IF player selects [M],   神魔レアのみ: [ALL] [C] [U] [E] [B] **[M]** 
    - 超レア[ON/OFF] default: OFF, if ON, filter superRare >= 1.
  - Inventory includes item category tabs:
    - [機能:晶] [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒].
    - Default: 晶 or previously selected category. 
    - Each box has two lines:
      - First line, small and gray letters: 耐久
      - Second line, current design: 鎧,衣,盾
    - Only items matching the selected category are shown (filter)
  - **Inventory Sort Logic (within category):**
	- **Order:** Descending order by Priority.
	- **Priority:**
	   1. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
	   2. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
	   3. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher
       4. Equiped item (From PT1 row1, PT1 row2, ... , PT2 row6)
  - Item Row: The name, count, and status are left-aligned, while the sell all button is right-aligned on the same line 
    - ex. `s.owned`: 名工のロングソード x3 | 近攻+19     [全売却 39G]
    - ex. `equipped`: [race icon] 名工のロングソード x1 | 近攻+19    PT1:name
    - ex. `equipped jewel` [Caninian icon] 魔導の結晶 (装備先:伝説の幻導の青銅杖) | [魔1][魔攻撃+22%] 魔攻+25 HP+14 x1    PT3:ハヤテ

  - Sell all button(全売却): Sells all item, with a warning message, and Changes item state from `s.owned` to `s.sold`
    - Super rare item sell block: when player is going to sell super rare item, it is not allowed: "超レア称号がついたアイテムは売却出来ません"
  - Inventory pane shows at least 10 items
- Actions:
  - Sell item stacks (except equipped items)
  - Sold items disappear immediately

- **Auto-sold list** (Collapsed by default; tap to expand)
  - Sort and filter settings also apply to this list (displaying items with the state:`s.sold`)
  - Item Row: The name, count, and status are left-aligned, while the Unlock button is right-aligned on the same line
    - ex. 名工のロングソード x3 | 近攻+19     [解除]
  - Unlock button(解除): Changes item state from `s.sold` to `s.notown`

##### 8.5.3 Jewel store(結晶店)

- **Function:** Sells items.
- **Shop name:** カリエスの狐彩堂 (Caelis' Kosaidō)

**Dialogue pane (UI)**
- **Column 1:** Shop owner icon (Vulpinian icon)  
- **Column 2:** Dialogue

	- Dialogue: "お越し頂きありがとうございます。デバッグ用に宝石を用意しております。こちら、本番では自力でご用意いただく必要がございますことご理解ください。"
	  - The shop sells all combination of jewels.
		- Price: 100G each
		- Stock: Five per jewels.


#### 8.6 Diary
- When a party was defeated, got boss rare or mythic rare item, and acquiring super rare item, the diary updates. 
- It keeps 24 entries. First, it is collapsed and expand to see the detail. (Same as 結果 log in expedition. )
- Top record is latest (default position) and bottom is older logs. 

- Setting. 
```
日誌記録設定                 ▼

超レア通知 (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
エリートレア通知 (pull down list) 全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default:恐ろしい以上)
ボスレア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
神魔レア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
敗北通知 あり/なし
```

- Title of dirary 
```
(Left-Aligned)         (Right-aligned)
line1: [PT2]ボスレア(秘奥真理の書) 獲得      ▼
line2 gray text: ケイナイアン平原      02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] 敗北の記録           ▼
line  gray text2: ヴァルンの樹林帯      02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] サイドクエスト達成(散財1,000G)           
line  gray text2: ウルサンの霊峰: 剛力の雅晶 を手に入れた     02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] セイラン 再生の女神撃破          ▼
line  gray text2: 信仰:再生の女神 解禁     02/12 21:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] ガーヴ 消耗の神撃破          ▼
line  gray text2: 信仰:消耗の神 解禁、PT2解放     02/12 21:28


```

  
#### 8.7 Divine Bureau (神聖局)
- All panes are collapsed by default and expandable.
- The expanded/collapsed state is persisted and saved.

**Donation box (寄付箱)**
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
再生の神(ランク3)      1,203G (次 2,200G)
消耗の神(ランク2)         545G (次 2,200G)
防備の神(ランク1)         0G (次 500G)
...

```


**Clairvoyance (未来視)**
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
  - Button (通常報酬初期化): Initialize `t.common_reward_bag` and `t.common_enhancement_bag` 

  **Unieque reward (固有報酬)**
  - uncommon reward_bag (アンコモン抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  - elite rare reward_bag (エリートレア抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  - boss rare reward_bag (ボスレア抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  - mythic rare reward_bag (神魔レア抽選抽選確率):  
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
  - Button (固有報酬初期化): Initialize `t.common_reward_bag`, `t.uncommon_reward_bag`, `t.elite_rare_reward_bag`, `t.boss_rare_reward_bag`  , `t.mythic_rare_reward_bag`  and `t.enhancement_bag` 

  **Super rare reward (超レア報酬)**
  - superRare_bag (称号超レア称号付与 抽選確率):
    - 超レア称号抽選: remaining / total counts
    - 超レア残り remaining / initial counts
  - Button (超レア報酬初期化): Initialize `t.superRare_bag`

  **Side quest(サイドクエスト抽選)**
  - side_quest_bag (サイドクエスト抽選確率)
    - サイドクエスト抽選 remaining / total counts
    - 当たり残り remaining / initial counts
  - Button (サイドクエスト初期化): Initialize `t.side_quest_bag` 

  **sleepiness(眠気抽選)**
  - sleepiness_of_party_bag (眠気抽選確率)

| パーティ | 眠気度合い | 残り |
|-|-|-|
| PT1 | 寝ない | 3 |
| PT1 | 仮眠 | 2 |
| PT1 | 熟睡 | 1 |
| PT2 | 寝ない | 3 |
...

note: 0:no sleep 寝ない, 1:nap 仮眠, 2:sound sleep 熟睡

**Glossary (用語集)** 
- list and its descrpition is here:
  - @Specification_CONSTANTS_&_DATA.md
  - 2.1.1 a. bonus ability, 2.1.2 b. bonus, 2.1.3 c. bonus, 2.1.4 d. bonus, 2.1.5, 2.1.6, 2.1.7, 2.1.8, 2.1.9
- Glossary tabs: A, B, C, D, F, G, M, Q. Default: A


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


**Bestiary (敵キャラクター図鑑)**
- A comprehensive record of all threats encountered (or to be encountered) during expeditions.
- Expedition category tabs: 原, 崖, 樹, 峰, 茂, 巣, 園, 谷, 神
  - Each letter represents for corresponding expedition. And tap to show the enemy list of it. 
  - Gods are listed in "神" tab.
- Categorize by floor (`x.Spawn_pool`) and is reverse order of rooms (Boss first, then floor6 Normal enemies, floor 5 elite and floor 5 normal enemies…

- Enemy name: List of specific enemies found within that expedition.
  - Default: Collapsed.
- UI Behavior:
  - Interaction:
    - Tap Enemy name, Opens detailed enemy status (same logic as battle). Including drop items.
    - If enemy has no attack values, not show the corresponding values.
    - Respect `m.luna` mode.

```
(column 1)              (column 2)
ID: 5005                レベル: 12
HP: 312                 クラス: 戦士
遠距離攻撃: 33 x 2回 (x1.00) 属性: 雷 (x1.2)
近接攻撃: 35 x 6回 (x1.00)  物理防御: 10 (83%)
物理命中率: 100% (減衰: 90.0%) 魔法防御: 8 (80%)
魔法攻撃: 117 x 4回 (x1.00)
魔法命中率: 100% (減衰: 90.0%)

(column 1)              (column 2)
ID: 5015                レベル: 12
HP: 312                 クラス: 魔法使い
魔法攻撃: 117 x 4回 (x1.00)   属性: 雷 (x1.2)
魔法命中率: 100% (減衰: 90.0%)  物理防御: 10 (83%)
                        魔法防御: 8 (80%)

```

**Super Rare List(超レア一覧)**
- Display Super Rare list with its unique bonus.




**Mode select (モード切替)**

- Switch to 自動周回: ON/OFF (Default:ON )

- Switch to `m.kemo`ケモ and `m.luna`ルナ(高難度) . Default: `m.kemo`
  - Description:
    - `m.kemo` "通常のモードです"
    - `m.luna` "敵が大幅に強くなります(報酬がよくなります)"

  - If Environment is `/luna/`, Set `m.luna` and other option (`m.kemo`) is disabled.


**バックアップ・リセット**
  - 5.1 Backup (Export)
    - Allow the player to export the current save data as a file download.
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
