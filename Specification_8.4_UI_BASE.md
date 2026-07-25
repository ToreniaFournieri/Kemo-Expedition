## 8. UI

### 8.4 UI_BASE
- Base(拠点)
- It has tabs inside Base tab. Shop(お店), Inventory(所持品),Ashen Route Vault(灰路の蔵) , Workshop(工房), Altar(祭壇). (same visual UI as List of party (PT1, PT2...) tab in Party tab)
  - Default: Shop
  - not available for Workshop(工房), in this version. (Gray out)
	
#### 8.4.1 Shop (お店)

- **Function:** Sells items.
- **Shop name:** フェリスのガラクタ屋 (Felis’s Junk Shop)

**Dialogue pane (UI)**
- Background image: `/public/background/Shop.png` as a transparent background behind the dialogue pane.

- **Column 1:** Shop owner icon ( `/public/background/Felis.png` )  
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
  - **Cost:** `200G × 2 ^ (refresh_count - 1)`  
    - Example:  
      - 1st use: 200G  
      - 2nd use: 400G  
      - 3rd use: 800G  


**Lineup**
- **Lineup:** 5 items from Tier 1 to Tier X (**up to the highest tier whose boss the player has defeated**).
- Each lineup slot is treated as an individual stock entry; if the same base item appears in multiple slots, buying one slot must not sell out the other slot.

| Intimacy | Lineup |
|---|---|
| 0–19 | 5 Common |
| 20–39 | 1 Uncommon, 4 Common |
| 40–79 | 1 Elite rare, 2 Uncommon, 2 Common |
| 80–99 | 1 Boss rare, 2 Elite rare, 2 Uncommon |

**Display (rarity color)**
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
- see `3.1.6 Item selling price` @Specification_3.1_ITEM.md

- Refresh timing
  - Shop lineup refreshes every 8 hours at **02:00, 10:00, 18:00** (local time).
  - `paid_refresh_count` resets to `0` at each refresh time.
  - Intimacy decays by **10% (multiplicative)** at each refresh time.

- Intimacy cap
  - Intimacy is capped at **99**.


#### 8.4.2 Inventory(所持品)
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
    - If no jewel has been obtained (`hasFirstJewel: false`):
      - [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒].  Default: 鎧 or previously selected category. 
    - If a jewel has been obtained (`hasFirstJewel: true`):
	  - [機能:晶] [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒]. Default: 晶 or previously selected category.
      - Text display when [晶] selected:  "結晶はパーティタブのキャラクターの装備一覧より、装備に結晶を装着することができます"
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
  - Item Row: The name and count are left-aligned, while the sell all button is right-aligned. 
  - Equipment status values (e.g. 近攻+19) display the item's base status only.
  - Do not apply character-specific equipment multipliers or passive bonuses (e.g. 剣 x1.4) to the displayed values.
    - ex. `s.owned`: 名工のロングソード x3 | 近攻+19     [全売却 39G]
    - ex. `equipped`: [Character image] 名工のロングソード x1 | 近攻+19
    - ex. `equipped jewel` [Character image] 魔導の結晶 (装備先:伝説の幻導の青銅杖) | [魔1][魔攻撃+22%] 魔攻+25 HP+14 x1
      - `[Character image]` floating bubble text:  PTx:name  (ex. "PT3:ハヤテ")
    - Ability text in item status details (e.g. `加速Lv1`) is tappable and shows its ability detail as floating bubble text.

  - Sell all button(全売却): Sells all item, with a warning message, and Changes item state from `s.owned` to `s.sold`
    - When the player sells a super-rare item, they receive Prana instead of Gold. Display the amount of Prana gained in the sell confirmation and result message. Example: 5 Prana
    - Super-rare items grant Prana only and never grant Gold. Invalid example: 5 Prana and 1,000 Gold
  - Inventory pane shows at least 10 items
- Actions:
  - Sell item stacks (except equipped items)
  - Sold items disappear immediately

- **Auto-sold list** (Collapsed by default; tap to expand)
  - Sort and filter settings also apply to this list (displaying items with the state:`s.sold`)
  - Item Row: The name, count, and status are left-aligned, while the Unlock button is right-aligned on the same line
    - ex. 名工のロングソード x3 | 近攻+19     [解除]
  - Unlock button(解除): Changes item state from `s.sold` to `s.notown`

#### 8.4.3 Ashen Route Vault(灰路の蔵)

- **Function:** Item purchase (debug purpose only)
- **Shop name:** カリエスの灰路の蔵 (Caelis' Ashen Route Vault)

**Dialogue pane (UI)**
- **Column 1:** Shop owner icon (Vulpinian icon)  
- **Column 2:** Dialogue

	- Dialogue: "お越し頂きありがとうございます。デバッグ用に全種類の商品を用意しております。こちら、本番では自力でご用意いただく必要がございますことご理解ください。"
	  - The shop sells:
		- All item types are available
        - All items are provided without enhancement
		- Price: 1G each
		- Stock: 99 per item.
      - UI Behavior
        - Follows the same layout and interaction model as Inventory UI
        - Inventory includes item category tabs: [機能:晶] [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒]. note: exact same UI as Inventory(所持品) item category tabs.
          - Default: 晶 or previously selected category.
        - Replace:
          - "全売却" → "買う"
          - "買う": Purchases 1 unit of the selected item.

#### 8.4.5 Altar (祭壇)
- The Altar allows players to spend **Prana** (プラーナ) to unlock individual enemy forms for Mimorian characters.
- Display the player’s current Prana balance.

**1. Prana**
* Selling a super-rare item grants Prana according to the item’s original rarity category.

| Super-Rare Item Category | Prana Granted |
| ------------------------ | ------------: |
| Normal item              |             1 |
| Elite-rare item          |             5 |
| Boss-rare item           |            10 |
| Mythic-rare item         |            50 |

* The sold item is removed from the inventory.
* Prana is a shared currency and is not associated with a specific enemy type.

**3. Alter level**
* Alter Level Requirement
* Each enemy form requires a minimum **Alter Level** before it can be mimicked.

**Required Alter Level = Tier Base + Number of additional abilities or bonus**

| Enemy Tier | Tier Base |
| ---------- | --------: |
| Normal     |         1 |
| Elite      |         5 |
| Boss       |        10 |

* **additional abilities or bonus** are the abilities and bonuses defined @Specification_4.2_EXPEDITION_&_ENEMY_MASTER_DATA.md.

**Examples**

| Enemy           | Tier   | additional abilities or bonus | Required Alter Level |
| --------------- | ------ | ---------------: | -------------------: |
| たんぽぽめ         | Normal |                0 |                    1 |
| 花鎌娘            | Normal |                1 |                    2 |
| わおーん          | Elite |                 1 |                    6 |
| ヴェルグ          | Boss   |                3 |                   13 |



**3. Enemy Form List**

* Enemy form category tabs: enemy type short text or race icon. Ex: 猛 飛 虫 …

* The Altar displays a list of enemy forms that can be unlocked.
* Each entry represents one individual enemy ID.
* Each entry displays:
  * Enemy chibi image    
  * Enemy name with enemy type (Normal, Elite, Boss)
  * Enemy ability
  * Enemy Bonus
  * Button ex: (解放 Xプラーナ1 or 解放済)
```
たんぽぽめ(猛,狩) ノーマル        解放 10プラーナ
アビリティ: 遠吠えLv1 
ボーナス: 成長1.1倍, 炎防x1.30, 雷防x0.67
```



**4. Unlock Costs**

| Enemy Category | Prana Cost |
| -------------- | -------------------: |
| Normal enemy   |                   10 |
| Elite enemy    |                   50 |
| Boss enemy     |                  100 |
| Mythic enemy   |                  500 |

* Consume the required amount of Prana to unlock an individual enemy form.
* Each enemy ID must be unlocked separately.
* Unlocking one enemy does not unlock other enemies of the same type.
* Prana is consumed immediately upon unlocking an enemy form.
* Once unlocked, the enemy form remains permanently available.

**5. Mimorian Character Edit Mode**
* Mimorian characters may select only enemy forms that have been unlocked at the Altar.
* The enemy-type dropdown displays only enemy types that contain at least one unlocked enemy.
* The individual-enemy dropdown displays only unlocked enemies belonging to the selected enemy type.
* Enemy forms that have not been unlocked at the Altar cannot be selected.
* Locked enemy forms are displayed as disabled entries with their required Prana cost.

**6. Unlock Examples**
* Normal enemy: 10 Prana
* Elite enemy: 50 Prana
* Boss enemy: 100 Prana

