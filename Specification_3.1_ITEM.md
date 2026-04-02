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
| 2 | 18 | 0.7 |
| 3 | 26 | 0.6 |
| 4 | 35 | 0.5 |
| 5 | 45 | 0.4 |
| 6 | 60 | 0.3 |
| 7 | 80 | 0.2 |
| 8 | 100 | 0.1 |


-　Tier 9 and 10 are Multiplier-Only Tiers. (Uncommon/Rare item upgrade reference)

|Tier| F  | G     | H  | J      | K    | L     | M   | N    | P    |
|----|----|-------|----|--------|------|-------|-----|------|------|
| 1  | 13 | 0.013 | 1  | -0.001 | -1.0 | +0.15 | -10 | 0.001 | 0.01 |
| 2  | 12 | 0.012 | 2  | -0.002 | -1.2 | +0.14 | -9 | 0.002 | 0.02 |
| 3  | 11 | 0.011 | 3  | -0.003 | -1.4 | +0.13 | -8 | 0.003 | 0.03 |
| 4  | 10 | 0.009 | 4  | -0.004 | -1.6 | +0.12 | -7 | 0.004 | 0.04 |
| 5  | 9  | 0.008 | 5  | -0.005 | -1.8 | +0.11 | -6 | 0.005 | 0.05 |
| 6  | 8  | 0.007 | 6  | -0.006 | -2.0 | +0.10 | -5 | 0.006 | 0.06 |
| 7  | 7  | 0.006 | 7  | -0.007 | -2.2 | +0.09 | -4 | 0.007 | 0.07 |
| 8  | 6  | 0.005 | 8  | -0.008 | -2.4 | +0.08 | -3 | 0.008 | 0.08 |
| 9  | 5  | 0.004 | 9  | -0.009 | -2.6 | +0.07 | -2 | 0.009 | 0.09 |
| 10 | 4  | 0.003 | 10 | -0.010 | -2.8 | +0.06 | -1 | 0.011 | 0.11 |

| Item type | base_power/Scale for | `c.*+v` (and `d.*-v`) | X-bonus | Y-bonus | R-bonus | C-bonus | B-bonus |
|------|--------|------|------|------|------|------|------|
|`i.armor` | x1.4 `d.physical_defense+F` | `c.physical_defense+v` | x1.2 `d.HP` | x0.3 `d.magical_defense` | `r.fire-M`,`r.ice-M`, `r.thunder-M` | none | `b.vitality+1` |
|`i.robe` | x1.15 `d.magical_defense+F`  | `c.magical_defense+v` | x1.2 `d.HP` | x0.3 `d.physical_defense` | `r.fire-M`,`r.ice-M`, `r.thunder-M` |`c.evasion+N` | `b.intelligence+1` |
|`i.shield ` | x3.0 `d.HP+F` | `c.evasion+G` | x0.20 `d.physical_defense` | x0.20 `d.magical_defense` | `r.fire-M`,`r.ice-M`, `r.thunder-M` | none | `b.mind+1` |
|`i.sword` | x1.1 `d.melee_attack+F` | `c.melee_attack+v` | x0.25 `d.physical_defense` | x1.1 `d.HP` |  `e.fire+L` | `c.accuracy+N` | `b.strength+1` |
|`i.katana` | x1.43 `d.melee_attack+F` | `c.melee_attack+v`, `d.evasion-J`, `d.melee_NoA-K` | x1.0 `d.HP` | x0.3 `d.magical_defense` | none | `c.penet+P` | `b.mind+1` |
|`i.gauntlet` | x1.0 `d.melee_NoA+H` | `c.melee_NoA+v` | x0.3 `d.physical_defense` | none | none | `c.physical_defense+v` | `b.vitality+1` |
|`i.arrow` | x0.85 `d.ranged_attack+F` | `c.ranged_attack+v` | x1.2 `d.HP` | x0.32 `d.physical_defense` | `e.fire+L`, `e.ice+L` , `e.thunder+L` | `c.evasion+N` | `b.strength+1` |
|`i.bolt` | x1.11 `d.ranged_attack+F` | `c.ranged_attack+v`, `d.evasion-J`, `d.ranged_NoA-K` | x0.28 `d.magical_defense` | x1.0 `d.HP` | `e.fire+L`, `e.ice+L` , `e.thunder+L` | `c.penet+P`  | `b.vitality+1` |
|`i.archery` | x1.0 `d.ranged_NoA+H` | `c.ranged_NoA+v` | x1.0 `d.HP` | none | none | `c.accuracy+N` | `b.strength+1` |
|`i.wand` | x0.75 `d.magical_attack` | `c.magical_attack+v` | x0.3 `d.magical_defense` | x1.1 `d.HP` | none | none | `b.intelligence+1` |
|`i.grimoire` | x0.98 `d.magical_attack+F` | `c.magical_attack+v`, `d.evasion-J`, `d.magical_NoA-K` | x0.22 `d.physical_defense` | x0.26 `d.magical_defense` | `e.ice+L`, `e.thunder+L` | `c.penet+P` | `b.mind+1` |
|`i.catalyst` | x1.0 `d.magical_NoA+H` | `c.magical_NoA+v` | x1.0 `d.HP` | none | `e.fire+L`, `e.ice+L`, `e.thunder+L` | `c.magical_defense+v` | `b.intelligence+1` |

- for `d.` bonus:  `type.amplifier` + `d.X`
  - Example: Tier 2 armor's x1.4 `d.physical_defense` is 12 x (1.45 - 0.04) x 1.4 = 12 x 1.41 = 23.688 → 24. its x0.3 `d.magical_defense` is 12 x (1.45 - 0.04) x 0.3 = 5.076 -> 6.

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
| uncommon | none | base_power x `type_amplifier` x rarelity.amplifier + E-bonus + base c.multiplier +1 tier upgrade(ecept penalty) |
| elite rare | A | base_power x `type_amplifier` x rarelity.amplifier + X-bonus + E-bonus + base c.multiplier +2 tier upgrade(ecept penalty) |
| elite rare | B | base_power x `type_amplifier` x rarelity.amplifier + X-bonus + Y-bonus + base c.multiplier +2 tier upgrade(ecept penalty) |
| elite rare | C | base_power x `type_amplifier` x rarelity.amplifier + Y-bonus + C-bonus + base c.multiplier +2 tier upgrade(ecept penalty) |
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
