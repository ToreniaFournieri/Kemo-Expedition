## 8. UI

### 8.2 UI_PARTY
- Party tab

- **Party main Pane background image**
- Party main pane consist of `PT selection pane` and `List of party members pane`. (not including `Status pane` )
- Display the background image according to the selected Party ID
  - If PT1, use : /public/background/PT1.png
  - If PT2, use : /public/background/PT2.png
  - If PT3, use : /public/background/PT3.png
  - If PT4, use : /public/background/PT4.png
  - If PT5, use : /public/background/PT5.png
  - If PT6, use : /public/background/PT6.png
  - If the corresponding image file does not exist, render no background image.
- The background image must fill the Party Pane vertically from top to bottom.
- Render the background image at 120% zoom.
- Apply a white fog overlay at 75% opacity over the background image.
- Preserve the original image aspect ratio without stretching or distortion.
- Anchor the background image to the bottom of the Party Pane.
- The image bottom edge should visually connect to the adjacent Status Pane without vertical gap.

#### 8.2.1 Displays
- Up to 6 parties can exist.
- Locked parties are not displayed.
- All unlocked parties are displayed normally and can be selected.
- If only one Party is unlocked, the Party List is still visible (only one party shown).
- The Party List becomes visible only when two or more parties are unlocked.

**PT selection pane**

```
  PT1    PT2    PT3    PT4    PT5     PT6
```
- Name of deity. Editable, but not duplication. If one deity already assgined to another PT, the deity is not selectable.
- IF none of religion is unlocked, hide Deity part and 編集 button. 

```
(Left-Aligned)                         (Right-Aligned)
PTレベル: 30, HP 3,742, 経験値: 1% ( 795)        [編集]

再生の神 (Level: 29, Experience 123450/ 123456)    
```

**List of party members pane**
- List of party members
  - Display the character illustration as the panel background image
    - Panel weidth: 50px
    - Panel height: 110px
    - Use a 6-column layout, one panel per party member
    - Each panel should be narrow enough that all 6 members are visible at once without horizontal scrolling

  - Background image width: 220% of the panel width
    - Exception — Enemy images: For images loaded from `/public/enemy/E_{enemy_ID}.png`, set the width to 160% of the panel width.
  - Anchor the background image to the bottom-center of the panel.
  - Panel Background: Apply 40% transparency to the member panel background layer behind the character illustration.
  - Show the Main Class, Subclass, and Lineage/Predisposition

```
image part: background image only
line1: 戦(剣)   ← text over background image
line2: 桃/腕  ← text over background image
```

- Current status, abilities, bonuses

#### 8.2.2 Party member details
- Name, race, main class (sub class), predisposition, lineage, status, bonuses (c., aggregated), ability (a. )
- When the player attempts to swap the order of party members, display the following confirmation dialog:
  - `選択したパーティメンバーの順番を入れ替えますか？`

- **Character image (background)**
  - Render the character image as a background image of the panel.
  - Position: top-aligned, horizontally offset to 80% from the left (i.e., 20% from the right).
  - Do not stretch; preserve original aspect ratio.
  - Image size is fixed and does not scale with content.
  - Responsive sizing:
    - The image width adapts smoothly to the viewport width.
    - If the page width is **500px or wider**, set the image width to **120% of the panel width**.
    - If the page width is **400px or narrower**, set the image width to **150% of the panel width**.
    - Between **400px and 500px**, interpolate linearly between **150% → 120%**.
  - In dark mode: not invert the image.
  - Apply mask above the image to ensure text readability.
  - The image remains static relative to the panel (does not move with internal content changes).

  - If unique_cahracter == ture,
  	- lineage = unascertained: 'Unique_Kemo.png',
  	- lineage = pioneer: 'Unique_Laika.png',
    - lineage =  crescent_jade: 'Unique_Luna.png',
    - lineage = phantom_thief: 'Unique_Nox.png',
    - lineage =  incarnation: 'Unique_Merle.png',
    - lineage = flamebound_grove: 'Unique_Puchitsa.png',
    - lineage = almighty: 'Unique_Souga-ha.png',
    - lineage = meddlesome_fox: 'Unique_Leonard.png',
    - lineage = hidden_grail: 'Unique_Hagakure.png',
    - lineage = 'unexpected_prince(ss)': 'Unique_Finn.png',
    - lineage =  rowdy_orca_girl: 'Unique_Orca.png',
    - lineage =  apostate: 'Unique_Mishka.png',

  - **File name logic**
  - `/public/character/{PT}_{RACE}_{GENDER}.png`
    - `PT`: 1,2,3,4,5,6
    - `RACE`: Lupinian, Vulpinian, Felidian, Caninian, Ursan, Procyonian, Leporian, Cervin, Murid
    - `GENDER`: Male, Female
    - Example: PT2, Vulpinian Male character -> `/public/character/2_Vulpinian_Male.png`
  - Exception — Mimorian characters:
    - Use the selected enemy’s ID to determine the character image.
    - `/public/enemy/E_{enemy_ID}.png`
    - Chibi character: `public/chibi/C_E_{enemy_ID}.png`

  - Fallback Resolution:
    - If the primary path does not exist, Fallback to race-gender default: `/public/character/{RACE}_{GENDER}.png`
    - Example (Fallback)
      - If /public/character/2_Vulpinian_Male.png is missing → Use /public/character/Vulpinian_Male.png
  - Else: no image

**Status pane**
- If character has `c.equip_melee`, displays 
近接攻撃:98 x 4回(x1.00)
- if character has  `c.equip_ranged`, displays 遠距離攻撃:`d.ranged_attack` x `d.ranged_NoA`回(x`f.offense_amplifier`(phase: LONG)).
  - ex. 遠距離攻撃:25 x 6回(x1.13)
- if character has `c.equip_melee` or `c.equip_ranged`, displays 物理命中率: `d.accuracy_potency`　x 100 % (減衰: x (0.90 + `c.accuracy+v`)).  (ex. has `c.accuracy+0.02` and `c.accuracy+0.01`, then 0.90 + 0.02 + 0.01 -> 0.93 )
  - ex. 物理命中率: 72% (減衰: x0.90)
- If character has `c.equip_magic`, displays 魔法攻撃:`d.magical_attack` x `d.magical_NoA`回(x`f.offense_amplifier`(phase: MID)). and 魔法命中率: 100 % (減衰: x (0.90 + `c.accuracy+v`)).  (ex. has `c.accuracy+0.02` and `c.accuracy+0.01`, then 0.90 + 0.02 + 0.01 -> 0.93 )
  - ex. 魔法攻撃:36 x 3回(x1.26)
  - ex. 魔法命中率: 100% (減衰: x0.90)

- Accuracy is internally calculated using the unified stats c.accuracy and c.evasion for all attack types.
- Physical Accuracy and Magical Accuracy are separated for display purposes only, based on battle phase rules.
- The MID phase ignores row-based d.accuracy_potency and is treated as fixed potency 1.00.

- *UI Formatting Note:* When displaying aggregated c.multipliers (e.g., 鎧 x1.8), always round the internal product to the first decimal place for a cleaner interface. 

- Bonus(ボーナス) Display order:
  - "ボーナス: 装備+N, 鎧xN, 衣xN, 盾xN, (Combat style set), (Others),  成長xN, etc.."
    - `Combat style` is shared with automation logic part. 
    - Default order: [近接装備, 剣xN, 刀xN, 手xN], [遠距離装備, 矢xN, ボxN, 弓xN], [魔法装備, 杖xN, 書xN, 媒xN]
  - If `Combat style` is Melee: Combat style set is 近接装備, 剣xN, 刀xN, 手xN
  - If `Combat style` is Ranged: Combat style set is 遠距離装備, 矢xN, ボxN, 弓xN
  - If `Combat style` is Magic: Combat style set is 魔法装備, 杖xN, 書xN, 媒xN

  - Example: character has `c.equip_ranged`, `c.arrow_x1.4`, `c.archery_x1.1`, `c.armor_x1.8`, `c.sword_x1.2`
    - "ボーナス: 遠距離装備, 矢x1.4, 弓x1.1, 剣x1.2, 鎧x1.8"

```
レオン                    [編集]
🐶 ケイナイアン / 戦士(師範) / 頑強 / 不動の家
[体力:13] [力:10] [知性:10] [精神:10]
—————
Left-aligned            Right-aligned
近接攻撃:98 x 4回(x1.00)     属性:無(x1.0)
物理命中率: 85% (減衰: 90.1%)     物防:108 (71%)
貫通:+2%                         魔防:56 (83%)
                              回避:+4
—————
属性耐性: 🔥100%,❄️100%,⚡100%
ボーナス: 遠距離装備, 矢x1.3, 弓x1.1, 鎧x1.8, 装備+1, 根性+1, 体+3
アビリティ:
守護者1, 探究者1
```
Note: Floating bubble of explanation for each individual ability and bonus.

magic caster
```
Left-aligned            
魔法攻撃:98 x 4回(x1.00) 
魔法命中率: 100% (減衰: 90.1%) 
詠唱魔法: サンダーボルト
```

#### 8.2.3 Character Edit Mode (selected member):
**1. Contents**

- `Unique`: Unique Character Flag. 
  - If `true`: The following attributes are immutable (input fields are disabled / greyed out): Name, Race, Lineag, Predisposition
  - Text: "固有キャラクター(クラスのみ編集可能)"
  - The following attributes remain modifiable (normal input fields): Main Class, Sub Class

- Name [edit]
- Editable `name` field.
- Toggle selection: `男` / `女` Exactly one must be selected (no null state)
  - If another member in the same party already has the same race, different gender, and `unique_character == false`, that gender option cannot be selected for the current member. (not display text 男 or 女 if cannot be selected, just bottun)
  - Mimorian characters are an exception: Only `女` may be selected.
  - If selected character `unique_character == true`, (not display text 男 or 女 if cannot be selected, just bottun)
- **Default Name Assignment**
  - Trigger: when `Race` is changed.
  - Select a default name randomly from the Potential Default Name Table.
  - The candidate pool must match all of the following:
    - `PT`
    - `Race`
    - `Gender`
  - Duplicate name assignment should be avoided whenever possible.
  - A duplicate name may only be assigned if no unused valid candidate remains.
 
  - **Migration from Previous Non-Gender Data**
    - Applies when loading save data created before `Gender` existed.
    - If `gender` is missing, assign it during migration.
    - **Unique Characters**
      - Do not assign gender randomly.
      - Set `gender` by referencing the character’s Initial Setting / Master Data.
      - This preserves predefined lore and prevents mismatch with fixed unique character identity.
    - **Editable Characters**
      - If `gender` is missing, assign randomly:
      - `♂` or `♀`

- Race selection: "**種族**:icon.race ケイナイアン |体10,力10,知10,精10 | 盾x1.3, 手x1.2, 弓x1.1, 成長x1.1""
  - Display the selected race summary as a single-line header above the selector buttons.
  - If another member in the same party already has the same race, same gender, and `unique_character == false`, that race option cannot be selected for the current member. (not display race icon image if cannot be selected, just bottun)
  - If selected character `unique_character == true`, (not display race icon image if cannot be selected, just bottun)
  - Category tabs: single-row, no wrap, fit within one viewport width.
  - Race selection buttons are icon-only (no race name text on each button).
```
　肉食    雑食    草食
icon.Lupinian, icon.Vulpinian, icon.Felidian   icon.Caninian, icon.Ursan, icon.Procyonian   icon.Leporian, icon.Cervin, icon.Murid
``` 
- Main Class selection: "**メインクラス**: 魔法使い(師範) | 魔法装備, 杖x1.4, 共鳴Lv2"
  - Display the selected main class summary as a single-line header above the selector buttons.
  - Category tabs: single-row, no wrap, fit within one viewport width.
```
 近接     遠距離     魔法      補助
剣,侍,聖  狩,弩,忍  魔,賢,錬  防,巡,君
```
  - Displays selected class name and unique bonus (main bonus and main/sub bonuses)
    - If Main Class == Sub Class, then show master bonus instead of main bonus.
- Sub Class selection: "**サブクラス**: 魔法使い | 魔法装備, 杖x1.4, 共鳴Lv1"
  - Display the selected sub class summary as a single-line header above the selector buttons.
  - category tab is same format that of main class
  - Displays selected class name and unique bonus (main/sub bonuses only)
- Lineage selection: "**系譜**: 砂塵の系譜 | 剣x1.2"
  - Display the selected lineage summary as a single-line header above the selector buttons.
  - Category tabs: single-row, no wrap, fit within one viewport width.
```
動乱    狩猟    学識    生存
砂,灰,焔  海,穹,凍  桃,機,適  断,風,誓
```
  - Displays selected Lineage: 
- Predisposition selection: "系譜: 好戦 | 剣x1.1, ボx1.1, 媒x1.1"
  - Display the selected predisposition summary as a single-line header above the selector buttons.
  - Category tabs: single-row, no wrap, fit within one viewport width.
```
外交的    内向的    適応    機知
好,探,和  頑,避,内  献,冷,軽  看,精,腕
```
- Exception — Mimorian characters:
  - Mimorian characters do not have Lineage or Predisposition settings.
  - Instead, they use two dropdown lists:
    - List 1: Enemy type (display enemy type text)
      - Displaying the enemy type related abilities and bonus
    - List 2: Individual enemy 
      - Displaying the individual enemy related abilities and bonus
  - Display format:
    - `虫/N` for list of party member part (display normal: `N`, elite:`E`, boss:`B`)
    - `ミモリアン / 防人(狩人) / 昆虫 / 鳳蝶` for status pane part
  - Selecting an enemy assigns that enemy’s ID to the character.
  - The Mimorian gains the same abilities and skills as the selected enemy, and remains Mimorian's abilities.
  - By default, the character’s name is set to the selected enemy’s name.

**2. Edit Confirmation Rules:**
- **Done (完了):**
  - Saves all changes to Race, Class, and Name.
  - Character status updates immediately.
- **Cancel (取消):**
  - Discards all pending changes.
  - Character remains exactly as they were (Race, Class, and Equipment are untouched).
- **UI Requirement:** Display a confirmation warning when pressing "Done": 
  - "⚠️ 変更を保存すると装備枠が2枠減るため、該当分の装備が外れます。?"
  - "⚠️ 魔法攻撃適正がなくなったため、一部の装備が外れます。"


#### 8.2.4 Equipment management
**1. Interaction Rules:**
- **Auto-Equip:** - If there is an empty slot and the player taps an item in the inventory, that item is automatically equipped to the first available slot.
- **Replace (Single-Tap):** - Tapping an item already in a Character Slot "selects" it. Tapping an item in the inventory while a slot is selected replaces the current item with the new one.
- **Remove (Double-Tap):** - Double-tapping an item in a Character Slot removes it and returns it to the inventory.
- **Remove (Single-tap):** - Single-tap an **equipped item in inventory** and returns it to be unequipped item in inventory.
- Status updates in real time
- **Auto equipment button(自動装備):** When the player presses the “自動装備” button, the auto-equipment logic is triggered immediately. This button is visible only when `m.auto_equipment` = 2 (FULL mode).
- **three-state toggle(手動/補助/一任):** 　`m.auto_equipment` is controlled by a three-state toggle. This setting is configured per party member. Default: `2` FULL
  - If the player performs any manual equipment change while `m.auto_equipment = 2` (FULL), then automatically set `m.auto_equipment = 1` (SEMI).
  - The toggle cycles in the following order: `OFF (0)` → `SEMI (1)` → `FULL (2)` → `OFF (0)` ...
  
The toggle cycles through the following modes:

| Value | Mode     | label |
| ----- | -------- | ----- | 
| `0`   | `OFF`  | 手動 |
| `1`   | `SEMI` | 補助 | 
| `2`   | `FULL` | 一任 |

- **?:** floating bubble for help:

```
 手動: 装備の付け替えが自動で変わることはない
 補助: 上位の通常称号の同一装備がある場合に置き換える。 (熟睡後の身支度が終わった段階で反映)
 一任: 装備選定を一任する。自身の判断で現在の装備をすべて見直し、最適な装備構成になるよう自動で再装備する (熟睡後の身支度が終わった段階で反映)
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

**4. Lock and Unlock Item**
- Visibility
  - The lock icon (🔒 / 🔓) is displayed only when `m.auto_equipment` = `FULL`.
- Default state
  - All items are Unlocked by default.
- Lock behavior
  - A locked item (🔒) is excluded from all automatic equipment processes.
  - The item will not be removed, replaced.
- Unlock behavior
  - An unlocked item (🔓) is eligible for automatic equipment processing.
- Toggle interaction
  - Tapping the lock icon toggles the state:
    - 🔒 Locked → 🔓 Unlocked
    - 🔓 Unlocked → 🔒 Locked

- Equipment List (Collapsed State)

```
装備  4 / 4 スロット 自動装備 手動?
🔒白銀英雄の鎧 [2B] 物防+79 魔防+25 HP+32 体力+1 [鎧] [鎧]  ▲
🔓名工の霧林司祭の法衣 [3E] 魔防+74 [魔防+8%] HP+47 回避+3 [法衣]　▲
🔓伝説の幻導の青銅杖 [3U] 魔攻+67 [魔攻撃+9%] 魔防+25 [魔防+9%] [ワンド]　▲
```

- Expanded State (When Selected)

```
装備  4 / 4 スロット 自動装備 手動?
🔒白銀英雄の鎧 [2B] 物防+85 魔防+25 HP+48 体力+1 [物防+8%] [鎧] ▼
 堅牢: 1 2 3 4 **5** 6 7 8
 障壁: 1 2 3 4 5 6 7 8 
 影走: 1 2 3 4 5 6 7 8
 [物防+8%] 物防+16 HP+16
🔓名工の霧林司祭の法衣 [3E] 魔防+74 [魔防+8%] HP+47 回避+3 [法衣]　▲
🔓伝説の幻導の青銅杖 [3U] 魔攻+67 [魔攻撃+9%] 魔防+25 [魔防+9%] [ワンド]　▲
```

- UI Rules
  - ▼ = expanded
  - ▲ = collapsed
  - 🔒 = locked　(sub color filtered)
  - 🔓 = unlocked (normal, if darkmode, invert its color)
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
