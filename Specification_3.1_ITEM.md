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
-　Tier 9 and 10 are Multiplier-Only Tiers. (Uncommon/Rare item upgrade reference)

|Tier| D   | E   | F    | G     | H  | J      | K     | L  | M     | N    | P    |
|----|-----|-----|------|-------|----|--------|-------|----|-------|------|------|
| 1  | 12  | 0.8 | 0.13 | 0.013 | 1  | -0.001 | -1.0 | +0.15 | -10| 0.001 | 0.01 |
| 2  | 18  | 0.7 | 0.12 | 0.012 | 2  | -0.002 | -1.2 | +0.14 | -9 | 0.002 | 0.02 |
| 3  | 26  | 0.6 | 0.11 | 0.011 | 3  | -0.003 | -1.4 | +0.13 | -8 | 0.003 | 0.03 |
| 4  | 35  | 0.5 | 0.09 | 0.009 | 4  | -0.004 | -1.6 | +0.12 | -7 | 0.004 | 0.04 |
| 5  | 45  | 0.4 | 0.08 | 0.008 | 5  | -0.005 | -1.8 | +0.11 | -6 | 0.005 | 0.05 |
| 6  | 60  | 0.4 | 0.07 | 0.007 | 6  | -0.006 | -2.0 | +0.10 | -5 | 0.006 | 0.06 |
| 7  | 80  | 0.3 | 0.06 | 0.006 | 7  | -0.007 | -2.2 | +0.09 | -4 | 0.007 | 0.07 |
| 8  | 100 | 0.3 | 0.05 | 0.005 | 8  | -0.008 | -2.4 | +0.08 | -3 | 0.008 | 0.08 |
| 9  | 130 | 0.2 | 0.04 | 0.004 | 9  | -0.009 | -2.6 | +0.07 | -2 | 0.009 | 0.09 |
| 10 | 160 | 0.2 | 0.03 | 0.003 | 10 | -0.010 | -2.8 | +0.06 | -1 | 0.011 | 0.11 |

- note: How I made the table.
  - D: base_power(1) = 12, base_power(n) = base_power(n-1) x (1.45 - 0.02 x n) round up
  - E: base_NoA_power(n) = 0.9 - 0.1 x n, but modified a bit for later tier
  - F: intentionally skip 0.010
  - N, P: intentionally skip 0.010

| Item type | xN base_power | base-bonus | X-bonus | Y-bonus | E-bonus | C-bonus | B-bonus |
|------|--------|------|------|------|------|------|------|
|`i.armor` | x1.4 `d.physical_defense+D` | `c.physical_defense+F` | x0.8 `d.HP+D` | x0.3 `d.magical_defense+D` | `r.fire-M`,`r.ice-M`, `r.thunder-M` | none | `b.vitality+1` |
|`i.robe` | x1.15 `d.magical_defense+D`  | `c.magical_defense+F` | x0.8 `d.HP+D` | x0.3 `d.physical_defense+D` | `r.fire-M`,`r.ice-M`, `r.thunder-M` |`c.evasion+N` | `b.intelligence+1` |
|`i.shield` | x2.0 `d.HP+D` | `c.evasion+G` | x0.20 `d.physical_defense+D` | x0.20 `d.magical_defense+D` | `r.fire-M`,`r.ice-M`, `r.thunder-M` | none | `b.mind+1` |
|`i.sword` | x1.1 `d.melee_attack+D` | `c.melee_attack+F` | x0.25 `d.physical_defense+D` | x1.1 `d.HP+D` |  `e.fire+L` | `c.accuracy+N` | `b.strength+1` |
|`i.katana` | x1.43 `d.melee_attack+D` | `c.melee_attack+F`, `d.evasion-J`, `d.melee_NoA-K` | x0.7 `d.HP+D` | x0.3 `d.magical_defense+D` | `r.fire-M`,`r.ice-M`, `r.thunder-M` | `c.penet+P` | `b.mind+1` |
|`i.gauntlet` | x1.0 `d.melee_NoA+E` | `c.melee_NoA+H` | x0.3 `d.physical_defense+D` | none | none | `c.physical_defense+P` | `b.vitality+1` |
|`i.arrow` | x0.85 `d.ranged_attack+D` | `c.ranged_attack+F` | x0.8 `d.HP+D` | x0.32 `d.physical_defense+D` | `e.fire+L`, `e.ice+L` , `e.thunder+L` | `c.evasion+N` | `b.strength+1` |
|`i.bolt` | x1.11 `d.ranged_attack+D` | `c.ranged_attack+F`, `d.evasion-J`, `d.ranged_NoA-K` | x0.28 `d.magical_defense+D` | x0.7 `d.HP+D` | `e.fire+L`, `e.ice+L` , `e.thunder+L` | `c.penet+P`  | `b.vitality+1` |
|`i.archery` | x1.0 `d.ranged_NoA+E` | `c.ranged_NoA+H` | x0.7 `d.HP+D` | `r.fire-M`,`r.ice-M`, `r.thunder-M` | none | `c.accuracy+N` | `b.strength+1` |
|`i.wand` | x0.75 `d.magical_attack+D` | `c.magical_attack+F` | x0.3 `d.magical_defense+D` | x0.8 `d.HP+D` | `r.fire-M`,`r.ice-M`, `r.thunder-M` | none | `b.intelligence+1` |
|`i.grimoire` | x0.98 `d.magical_attack+D` | `c.magical_attack+F`, `d.evasion-J`, `d.magical_NoA-K` | x0.22 `d.physical_defense+D` | x0.26 `d.magical_defense+D` | `e.ice+L`, `e.thunder+L` | `c.penet+P` | `b.mind+1` |
|`i.catalyst` | x1.0 `d.magical_NoA+E` | `c.magical_NoA+H` | x0.7 `d.HP+D` | none | `e.fire+L`, `e.ice+L`, `e.thunder+L` | `c.magical_defense+P` | `b.intelligence+1` |

- for `d.` bonus:  `type.amplifier` + `d.X`
  - Example: Tier 2 armor's x1.4 `d.physical_defense` is 12 x (1.45 - 0.04) x 1.4 = 12 x 1.41 = 23.688 → 24. its x0.3 `d.magical_defense` is 12 x (1.45 - 0.04) x 0.3 = 5.076 -> 6.

**rarity.amplifier of base_power**

| Rarity | `rarity.amplifier` |
|------|--------|
| common | x1.0 |
| uncommon | x1.35 |
| elite rare | x1.67 |
| boss rare | x2.00 |
| mythic rare | x2.40 |

**Rarity base**

| Rarity | EnemyTypeSource | Features |
|------|--------|--------|
| common | none | xN base_power x rarity.amplifier, and base-bonus |
| uncommon | none | xN base_power x rarity.amplifier, E-bonus, base-bonus with +1 tier upgrade(except penalty) |
| elite rare | A | xN base_power x rarity.amplifier, X-bonus, E-bonus, base-bonus with +2 tier upgrade(except penalty) |
| elite rare | B | xN base_power x rarity.amplifier, X-bonus, Y-bonus, base-bonus with +2 tier upgrade(except penalty) |
| elite rare | C | xN base_power x rarity.amplifier, Y-bonus, C-bonus, base-bonus with +2 tier upgrade(except penalty) |
| boss rare | none | xN base_power x rarity.amplifier, X-bonus, C-bonus, B-bonus, but **no base-bonus** |
| mythic rare | none | xN base_power x rarity.amplifier, X-bonus, Y-bonus, C-bonus, B-bonus, but no base-bonus |

- note:
  - `base-bonus` means the default bonus set granted by the item type at its tier, including its base `c.*` bonus and other default tier-based bonuses defined in the item type table.
  - `EnemyTypeSource` reference: @Specification_4.1_EXPEDITION_&_ENEMY.md 4.1.5 Master_Data_Definitions Expedition Enemy Types
  - `+1 tier upgrade` means: when reading tier-based bonus columns, use `min(base_tier + 1, 10)` for all bonus references except penalty columns `J` and `K`.
  - `+2 tier upgrade` means: when reading tier-based bonus columns, use `min(base_tier + 2, 10)` for all bonus references except penalty columns `J` and `K`.
  - `xN` means the item-type scale defined in the item type table.

**Elemental by expedition**
- If expedition `e.element` matches item `e.element`, apply `e.*` bonus.
- If expedition `r.element` matches item `r.element`, apply `r.*` bonus.
- Otherwise, ignore all elemental bonuses on the item.

| `x.exp_id` | `e.` | `r.` |
|-|-|-|
| 1 | none | none |
| 2 | `e.ice+*` | `r.ice-*`  |
| 3 | `e.thunder+*` | `r.thunder+*` |
| 4 | `e.fire+*` | `r.fire+*` |
| 5 | `e.fire+*` | `r.fire+*` |
| 6 | `e.thunder+*` | `r.thunder+*` |
| 7 | `e.ice+*` | `r.ice-*` |
| 8 | none | none |

- Display format:
  - `d.*` >  `b.` > [`c.*` > `e.*` > `r.*` > others]
```
海曲の弓 [3U] 遠回数+0.81 HP+36 [遠回数+4, 命中+4, 雷防7%]
氷紋の防寒衣 [2U] 物防+35 HP+41 精神+1 [物防+11%, 氷防8%]
```

#### 3.1.3 Item variation 

**Item Variation Hierarchy**
- Common (12 variations per tier): 1 standard version of every item type.
- Uncommon (12 variations per tier): 1 specialized versions of every item type.
- Elite rare ( 12 variations per tier): 1+ version of every item type. 
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
- rarity
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
