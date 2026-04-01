## 3. ITEM

### 3.1 ITEM

#### 3.1.1 Item category 

- Item category

|category | name | short name| core concept |
|-----|----|----|-----------|
|`i.armor` | 鎧 | 鎧 | + `d.physical_defense` |
|`i.robe` | 法衣 | 衣 | + `d.magical_defense` |
|`i.shield ` | 盾 | 盾 | + `d.HP` |
|`i.sword` | 剣 | 剣 | + `d.melee_attack` |
|`i.katana` | 刀 | 刀 | + `d.melee_attack`, - `melee_NoA` |
|`i.gauntlet` | 籠手 | 手 | + `d.melee_NoA` |
|`i.arrow` | 矢 | 矢 | + `d.ranged_attack` |
|`i.bolt` | ボルト | ボ | + `d.ranged_attack`, - `d.ranged_NoA`  |
|`i.archery` | 弓 | 弓 | + `d.ranged_NoA` |
|`i.wand` | ワンド | 杖 | + `d.magical_attack` |
|`i.grimoire` | 魔導書 | 書 | + `d.magical_attack`, - `d.magical_NoA`  |
|`i.catalyst` | 触媒 | 媒 | + `d.magical_NoA`  |

- *note:* item might have multiple bonus. sword may have `d.HP` but subtle value.

#### 3.1.2 Item list

- base_power(1) = 12, base_power(n) = base_power(n-1) x (1.45 - 0.02 x n) round off
- base_NoA_power(n) = 0.9 - 0.1 x n

| Tier | base_power | base_NoA_power |
|------|------------|----------------|
| 1 | 12 | 0.8 |
| 2 | 17 | 0.7 |
| 3 | 24 | 0.6 |
| 4 | 33 | 0.5 |
| 5 | 45 | 0.4 |
| 6 | 60 | 0.3 |
| 7 | 79 | 0.2 |
| 8 | 102 | 0.1 |


|Tier | multiplier for　鎧, 衣, 剣, 矢, 杖 | plus for 盾 | fixed NoA for 手, 弓, 媒 |penalty for 刀, ボ, 書| elemental v |
|------|--------|-----------|--------|--------|------|
| 1 | `c.target_status+0.13` | `c.evasion+0.013` | `c.N_NoA+1` | `d.evasion-0.001`, `d.N_NoA-1.0` | `e.element+0.15` |
| 2 | `c.target_status+0.12` | `c.evasion+0.012` | `c.N_NoA+2` | `d.evasion-0.002`, `d.N_NoA-1.2` | `e.element+0.14` |
| 3 | `c.target_status+0.11` | `c.evasion+0.011` | `c.N_NoA+3` | `d.evasion-0.003`, `d.N_NoA-1.4` | `e.element+0.13` |
| 4 | `c.target_status+0.09` | `c.evasion+0.009` | `c.N_NoA+4` | `d.evasion-0.004`, `d.N_NoA-1.6` | `e.element+0.12` |
| 5 | `c.target_status+0.08` | `c.evasion+0.008` | `c.N_NoA+5` | `d.evasion-0.005`, `d.N_NoA-1.8` | `e.element+0.11` |
| 6 | `c.target_status+0.07` | `c.evasion+0.007` | `c.N_NoA+6` | `d.evasion-0.006`, `d.N_NoA-2.0` | `e.element+0.09` |
| 7 | `c.target_status+0.06` | `c.evasion+0.006` | `c.N_NoA+7` | `d.evasion-0.007`, `d.N_NoA-2.2` | `e.element+0.08` |
| 8 | `c.target_status+0.05` | `c.evasion+0.005` | `c.N_NoA+8` | `d.evasion-0.008`, `d.N_NoA-2.4` | `e.element+0.07` |
| 9 | `c.target_status+0.04` | `c.evasion+0.004` | `c.N_NoA+9` | - | `e.element+0.06` |
| 10 | `c.target_status+0.03` | `c.evasion+0.003` | `c.N_NoA+10` | - | `e.element+0.05` |

-　Tier 9 and 10 are Multiplier-Only Tiers. (Unccommon/Rare item upgared reference)

| Item type | base_power/Scale for | base c.multiplier for | X-bonus | Y-bonus | R-bonus | C-bonus | B-bonus |
|------|--------|------|------|------|------|------|------|
|`i.armor` | `d.physical_defense` | `c.physical_defense+v` | x1.2 `d.HP` | x0.3 `d.magical_defense` | `r.fire_xN`,`r.ice_xN`, `r.thunder_xN` | none | `b.vitality+1` |
|`i.robe` |  `d.magical_defense`  | `c.magical_defense+v` | x1.2 `d.HP` | x0.3 `d.physical_defense` | `r.fire_xN`,`r.ice_xN`, `r.thunder_xN` |`c.evasion+0.00v` | `b.intelligence+1` |
|`i.shield ` | `d.HP` | `c.evasion+v` | x0.20 `d.physical_defense` | x0.20 `d.magical_defense` | `r.fire_xN`,`r.ice_xN`, `r.thunder_xN` | `d.physical_defense` | `b.mind+1` |
|`i.sword` | `d.melee_attack` | `c.melee_attack+v` | x0.25 `d.physical_defense` | x1.1 `d.HP` |  `e.fire` | `c.accuracy+0.01` | `b.strength+1` |
|`i.katana` | `d.melee_attack` | `c.melee_attack+V`, `d.evasion-v`, `d.melee_NoA-v` | x1.0 `d.HP` | x0.3 `d.magical_defense` | none | `c.penet+0.0v` | `b.mind+1` |
|`i.gauntlet` | `d.melee_NoA` | `c.melee_NoA+v` | x0.3 `d.physical_defense` | none | none | `c.physical_defense+v` | `b.vitality+1` |
|`i.arrow` | `d.ranged_attack` | `c.ranged_attack+v` | x1.2 `d.HP` | x0.32 `d.physical_defense` | `e.fire+v`, `e.ice+v` , `e.thunder+v` | `c.evasion+0.00v` | `b.strength+1` |
|`i.bolt` | `d.ranged_attack` | `c.ranged_attack+v`, `d.evasion-v`, `d.ranged_NoA-v` | x0.28 `d.magical_defense` | x1.0 `d.HP` | `e.fire+v`, `e.ice+v` , `e.thunder+v` | `c.penet+0.0v`  | `b.vitality+1` |
|`i.archery` | `d.ranged_NoA` | `c.ranged_NoA+v` | x1.0 `d.HP` | none | none | `c.accuracy+0.00v` | `b.strength+1` |
|`i.wand` | `d.magical_attack` | `c.magical_attack+v` | x0.3 `d.magical_defense` | x1.1 `d.HP` | none | none | `b.intelligence+1` |
|`i.grimoire` | `d.magical_attack` | `c.magical_attack+v`, `d.evasion-v`, `d.magical_NoA-v` | x0.22 `d.physical_defense` | x0.26 `d.magical_defense` | `e.ice+v`, `e.thunder+V` | `c.penet+0.0v` | `b.mind+1` |
|`i.catalyst` | `d.magical_NoA` | `c.magical_NoA+v` | x1.0 `d.HP` | none | `e.fire+v`, `e.ice+v`, `e.thunder+V` | `c.magical_defense+v` | `b.intelligence+1` |


**type.amplifier of base_power**

| Item type | `type_amplifier` |
|------|--------|
|`i.armor` | x1.4 |
|`i.robe` | x1.15 |
|`i.shield` | x3.0 |
|`i.sword` | x1.1 |
|`i.katana` | x1.43 |
|`i.gauntlet` | x1.0 |
|`i.arrow` | x0.85 |
|`i.bolt` | x1.11 |
|`i.archery` | x1.0 | 
|`i.wand` | x0.75 |
|`i.grimoire` | x0.98 |
|`i.catalyst` | x1.0 |


**rarelity.amplifier of base_power**

| Rarelity | `rarelity.amplifier` |
|------|--------|
| common | x1.0 |
| uncommon | x1.35 |
| elite rare | 1.67 |
| boss rare | x2.00 |
| mythic rare | x2.40 |

**Rarelity base**

| Rarelity | EnemyTypeSource | Features |
|------|--------|--------|
| common | none | base_power x `type_amplifier` x rarelity.amplifier, and base c.multiplier |
| uncommon | none | base_power x `type_amplifier` x rarelity.amplifier + C-bonus + base c.multiplier +1 tier upgrade(ecept penalty) |
| elite rare | A | base_power x `type_amplifier` x rarelity.amplifier + X-bonus + E-bonus + base c.multiplier +2 tier upgrade(ecept penalty) |
| elite rare | B | base_power x `type_amplifier` x rarelity.amplifier + Y-bonus + C-bonus + base c.multiplier +2 tier upgrade(ecept penalty) |
| elite rare | C | base_power x `type_amplifier` x rarelity.amplifier + X-bonus + Y-bonus + base c.multiplier +2 tier upgrade(ecept penalty) |
| boss rare | none | base_power x `type_amplifier` x rarelity.amplifier + X-bonus + C-bonus + B-bonus, but **no base c.multiplier** |
| mythic rare | none | base_power x `type_amplifier` x rarelity.amplifier + X-bonus + Y-bonus + C-bonus + B-bonus, but no base c.multiplier |

**Elemental by expedition**

| `x.exp_id` | `e.` | `r.` |
|-|-|-|
| 1 | none | none |
| 2 |  |  |
| 3 |  |  |
| 4 |  |  |
| 5 |  |  |
| 6 |  |  |
| 7 |  |  |
| 8 |  |  |

- example of basic item:
```
Tier 1 common `i.sword`: `d.melee_attack` +12, `c.physical_attack+0.13`
Tier 1 rare `i.sword`: `d.melee_attack` +17, `d.melee_defense` + 5, `d.HP` +4 , `c.physical_attack+0.13`
Tier 2 common `i.shield`: `d.HP` +18, `c.evasion+0.012`
Tier 3 common `i.gauntlet`: `d.melee_NoA` +0.6, `c.N_NoA+3`
Tier 4 common `i.katana`: `d.melee_attack` +82, `d.evasion-0.004`, `c_melee_NoA-1.6`
Tier 5 common `i.arrow`: `d.ranged_attack` +41, `c.ranged_attack+0.08`

```
#### 3.1.3 Item variation 

**Item Variation Hierarchy**
- Common (12 variations per tier): 1 standard version of every item type.
- Uncommon (24 variations per tier): 2 specialized versions of every item type.
- Elite rare ( 12 variations per tier): 1 version of every item type. 
- Boss rare (2~3 variations per tier)
- Mythic rare (total 12 items)

#### 3.1.4 Item stacking
- Items are stacked based on their unique combination of (superRare title, enhancement title, and base item ID). The default `max_stack` is 99.
  - Inventory Tracking: The inventory tracks item variants rather than individual instances.
  - Display: Shows the total stack count per variant.
  - Selling is all-or-nothing per stack. 
- **Obsolete Variants (Auto-sell Logic):**
  - Once a stack is sold, that specific variant is removed from the inventory.
  - Future drops of the exact same variant are automatically sold.
- **Auto-sell maintenance:**
  - Players can change an item’s status from `s.sold` to `s.notown`.
  - Sold items cannot be restored or refunded.
  - After a status reset, the variant can be collected in the inventory again.
- **Overflow Handling**
  - If the stack exceeds `max_stack`, the excess items are automatically sold. (treat as auto-sell item)

#### 3.1.5 Item master definitions
- id
- item_category
- tier
- rarelity
- subtle_power (`d.`)
- bonus (`c.`)
- elemental offensive bonus (`e.`)
- elemental resistance bonus (`r.`)
- base status bonus (`d.`)

*note:*
- There are no base duel(`d.`) related status in the master data. because these data is calculated by the formula. Only subtle_power is defined in this master.
- If an item's base_power is `d.HP` = 12 and subtle_power is `d.HP` = 10, then, this item has one `d.HP` = 22 status.
  

| State | meaning|
|-------|---------|
|(no record) |Variant never encountered|
|`s.owned` |Item variant exists in inventory (count > 0)|
|`s.sold` |Item variant is obsolete and auto-sold on pickup|
|`s.notown` |Item variant is not owned and may drop normally|

```
inventory = {
  "ショートソード": {
    "count": 0,
    "state": "sold"
  },
  "名工のショートソード": {
    "count": 40,
    "state": "owned"
  },
  "世界を征する名工のショートソード": {
    "count": 6,
    "state": "owned"
  },
  "ロングソード": {
    "count": 0,
    "state": "notown"
  }
}
```

#### 3.1.6 Item selling price

- Selling price calculation 
  - `item_tier` = 1-8
  - `enhancement`: 0-6
  - `super_rare`:0 or 1
  - Selling_price(1)= 5 * 1.25^(`enhancement` -1) * 1,000 ^ (`super_rare`)
  - Selling_price(`item_tier`)= Selling_price(`item_tier`-1) * (1.30 - 0.02 *`item_tier` )

- Purchesing price in Felis's Junk shop. 
  - `item_tier` = 1-8
  - Selling_price(1)= 200
  - Selling_price(`item_tier`)= Selling_price(`item_tier`-1) * (2.50 - 0.12 *`item_tier` ) (round to the last two digits)

#### 3.1.7 Jewel (結晶) 
- A tier-scaled enhancement item that grants one c. bonus and fixed d. bonuses based on its rank.
- category name "晶"
 - `d.` bonuses are added to the item’s base stats before any scaling is applied. Therefore, both the enhancement multiplier and Super Rare multiplier also affect the added `d.` values.

| `j.` Key |  表示名 | 略称 | `c.` bonus  | `d.` base bonus |
|-----------|------|----|----------------------------|---------|
| `j.might`  | 剛力 | 剛 | `c.physical_attack+v` | `d.melee_attack`12, `d.ranged_attack`9 |
| `j.arcana` | 魔導 | 魔 | `c.magical_attack+v` | `d.magical_attack`6, `d.HP`3 |
| `j.fort`  | 堅牢 | 堅 | `c.physical_defense+v` | `d.physical_defense`6, `d.HP`6 |
| `j.ward`  | 障壁 | 障 | `c.magical_defense+v` | `d.magical_defense`6, `d.HP`6 |
| `j.shade` | 影走 | 影 | `c.evasion+0.0v` | `d.magical_defense`4 , `d.HP`4  |
| `j.focus`  | 精密 | 精 | `c.accuracy+0.0v` | `d.physical_defense`4, `d.HP`3  |

| Rank | Tier Name |
| ---- | --------- |
| 1    | 素晶        |
| 2    | 良晶        |
| 3    | 雅晶        |
| 4    | 煌晶        |
| 5    | 碧晶        |
| 6    | 紫晶        | 
| 7    | 金晶        |
| 8    | 王晶        |

- Rank 5 `j.might`  is "剛力の碧晶"

| Rank | `c.*_attack+v` | `c.*_defense+v` | `c.*+0.0v` |
|------|---------|--------|--------|
| 1 | 22 | 13 | 8 |
| 2 | 21 | 12 | 7 |
| 3 | 19 | 11 | 6 |
| 4 | 18 | 9 | 5 |
| 5 | 17 | 8 | 4 |
| 6 | 16 | 7 | 3 |
| 7 | 15 | 6 | 2 |
| 8 | 14 | 5 | 1 |



Rule:
- D(1) = base
- D(n) = D(n-1) * (1.40 - 0.03*n)
- Rounded to nearest integer

| Rank | Base 12 | Base 9 | Base 6 | Base 4 | Base 3 |
|------|---------|--------|--------|--------|--------|
| 1 | 12 | 9 | 6 | 4 | 3 |
| 2 | 16 | 12 | 8 | 5 | 4 |
| 3 | 21 | 16 | 10 | 7 | 5 |
| 4 | 27 | 20 | 13 | 9 | 6 |
| 5 | 34 | 25 | 16 | 11 | 8 |
| 6 | 41 | 31 | 20 | 13 | 10 |
| 7 | 49 | 37 | 24 | 15 | 12 |
| 8 | 57 | 43 | 28 | 17 | 14 |

- Item Type → Available Jewel

| Item type | available jewel |
|------|--------|
| `i.armor` | `j.fort`, `j.ward`, `j.shade` |
| `i.robe` | `j.fort`, `j.ward`, `j.focus` |
| `i.shield` | `j.fort`, `j.ward`, `j.shade` |
| `i.sword` | `j.might`, `j.fort`, `j.shade` |
| `i.katana` | `j.might`, `j.ward`, `j.focus` |
| `i.gauntlet` | `j.fort`, `j.ward`, `j.focus` |
| `i.arrow` | `j.might`, `j.ward`, `j.shade` |
| `i.bolt` | `j.might`, `j.fort`, `j.ward` |
| `i.archery` | `j.fort`, `j.shade`, `j.focus` |
| `i.wand` | `j.arcana`, `j.ward`, `j.shade` |
| `i.grimoire` | `j.arcana`, `j.fort`, `j.focus` |
| `i.catalyst` | `j.fort`, `j.ward`, `j.focus` |

- Display
```
伝説の青銅縫いの鎧[精1]
恐ろしい草編みの法衣[影2]
```
