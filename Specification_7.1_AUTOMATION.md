## 7. AUTOMATION

### 7.1 AUTOMATION

#### 7.1.1 AUTO equipment logic
- The behavior of automatic equipment is controlled by `m.auto_equipment`,  and upgrades their equipment at the end of **outfit** state.
 
| Mode     | Description                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `OFF`  | No automatic equipment processing is performed. Characters keep their current equipment unless changed manually.           |
| `SEMI` | Automatically **Fills empty slots** and **Upgrades existing equipment**  , but does **not remove currently equipped items**. |
| `FULL` | Automatically **Removes all equipment**, **Fills empty slots** and **Upgrades existing equipment**. |                             |

- Processing priority: Characters are processed sequentially in party order: PT1 Row1 → PT1 Row2 → … → PT1 Row6 → PT2 Row1 → PT2 Row2 → …
- Item categories of already equipped items are not changed.
- The system only fills empty slots or upgrades existing equipment without replacing it with a different item category.
- No other policy exist in this version.

##### 7.1.1.1 Removes all equipment
- Record the **jewel** assignments of each equipped item category as **Memory C**.
- Record the all of its equipment as **Memory D**.
- Remove all of its equipment.
  - This only works when `m.auto_equipment` is `FULL`
- **Exception:**
  - Super rare item is not removed by this process. 
  - Locked items are not replaced. (but still participate in Memory A/B)
    
##### 7.1.1.2 Equipping into empty slots
- When a character has one or more empty equipment slots, auto-equipment selects an item category based on the class’s ideal equipment build order.
- This order represents the target balance of equipment categories for that class.
- The system checks the character’s current equipment and selects the earliest category in the order that is still missing.
- In other words, auto-equipment attempts to move the character’s equipment composition closer to the ideal category balance defined by the class.

- Example:
  - If a Duelist already has two `i.sword` items equipped, the system evaluates the order and selects the next missing categories.
  - If the 3rd and 4th slots are empty, the selected categories will be:
    - 3rd slot → `i.gauntlet`
    - 4th slot → `i.armor`
  - because these are the earliest categories in the order that are not yet satisfied.

- class.duelist, class.sword-saint:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon` |
| 6 | `i.armor` |
| 7 | `i.NoA` |
| 8 | `i.weapon` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |

- class.samurai:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon` |
| 6 | `i.NoA` |
| 7 | `i.weapon` |
| 8 | `i.weapon` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.NoA` |
| 12 | `i.weapon` |
| 13 | `i.armor` |
| 14 | `i.robe` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |

- class.ranger, class.ninja:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon` |
| 6 | `i.arrow` |
| 7 | `i.NoA` |
| 8 | `i.weapon` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |
| 16 | `i.NoA` |

- class.striker:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon` |
| 6 | `i.arrow` |
| 7 | `i.NoA` |
| 8 | `i.weapon` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |
| 16 | `i.NoA` |

- class.wizard, class.alchemist:

| order | item category |
|-|-|
| 1 | `i.weapon`  |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon`  |
| 6 | `i.weapon`  |
| 7 | `i.NoA` |
| 8 | `i.weapon`  |
| 9 | `i.weapon`  |
| 10 | `i.robe` |
| 11 | `i.armor`  |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.weapon` |
| 15 | `i.robe` |


- class.sage:

| order | item category |
|-|-|
| 1 | `i.weapon`  |
| 2 | `i.NoA` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.weapon`  |
| 6 | `i.weapon`  |
| 7 | `i.NoA` |
| 8 | `i.weapon`  |
| 9 | `i.weapon`  |
| 10 | `i.robe` |
| 11 | `i.NoA` |
| 12 | `i.weapon` |
| 13 | `i.armor` |
| 14 | `i.NoA` |
| 15 | `i.weapon` |

- class.guardian:

| order | item category |
|-|-|
| 1 | `i.armor` |
| 2 | `i.weapon` |
| 3 | `i.robe` |
| 4 | `i.NoA` |
| 5 | `i.weapon` |
| 6 | `i.shield` |
| 7 | `i.armor` |
| 8 | `i.robe` |
| 9 | `i.weapon` |
| 10 | `i.shield` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |

- class.lord, class.pilgrim:

| order | item category |
|-|-|
| 1 | `i.weapon` |
| 2 | `i.armor` |
| 3 | `i.robe` |
| 4 | `i.weapon` |
| 5 | `i.NoA` |
| 6 | `i.weapon` |
| 7 | `i.armor` |
| 8 | `i.robe` |
| 9 | `i.weapon` |
| 10 | `i.shield` |
| 11 | `i.weapon` |
| 12 | `i.NoA` |
| 13 | `i.weapon` |
| 14 | `i.armor` |
| 15 | `i.robe` |

**Group Item category**

| category | name | short name | Included Item Categories |
|-----|----|----|----|
| `i.weapon` | 武器 | 武 | `i.ranged`, `i.magic`, `i.melee` |
| `i.NoA` | 回数 | 回 | `i.archery`, `i.catalyst`, `i.gauntlet` |

- **Item selection from a specific item category**
- When auto-equipment selects items from a specific item category, the following procedure is used:

1. **Decide the combat style**
  - The combat style determined is used to resolve all `i.weapon` and `i.NoA` category selections during this process.
    - Only combat styles enabled by corresponding `c.equip_*` bonuses are considered.
    - If multiple `c.equip_*` bonuses are present, compare all enabled combat style scores and select the highest one.
      - If `c.equip_ranged`: Ranged: total sum of (`c.arrow_x1.x` - 1), (`c.bolt_x1.x` - 1), and (`c.archery_x1.x` - 1).
      - If `c.equip_magic` Magic: total sum of (`c.wand_x1.x` - 1), (`c.grimoire_x1.x` - 1) , and (`c.catalyst_x1.x` - 1).
      - If `c.equip_melee`: Melee: total sum of (`c.sword_x1.x` - 1), (`c.katana_x1.x` - 1) , and (`c.gauntlet_x1.x` - 1).
      - Note: Only one `c.*` bonus of the exact same name applies.
      - Example: If character has `c.equip_ranged`, `c.equip_melee`, `c.sword_x1.4`, `c.arrow_x1.2`, `c.bolt_x1.2`, `c.gauntlet_x1.1`, Ranged: 0.4 (arrow 0.2 + bolt 0.2) and Melee: 0.5 (sword 0.4 + gauntlet 0.1) so "Melee" is selected.
      - Tie-breaker: Ranged > Magic > Melee

  - If Ranged: target `i.weapon` item categories are `i.arrow` and `i.bolt`, and target `i.NoA` item category is `i.archery`.
  - If Magic: target `i.weapon` item categories are `i.wand` and `i.grimoire`, and target `i.NoA` item category is `i.catalyst`.
  - If Melee: target `i.weapon` item categories are `i.sword` and `i.katana`, and target `i.NoA` item category is `i.gauntlet`.
  - If no `c.equip_ranged`,`c.equip_magic`, `c.equip_melee`: resolve i.weapon and i.NoA to shield. 
   
2. **Initialize memory**
   - Record the **item IDs** of all currently equipped items as **Memory A**.
   - Record all **`c.*` bonus effects** provided by the currently equipped items as **Memory B**.

3. **Search for a candidate item**
   - Exclude any item that satisfies either of the following conditions:
     - Its **item ID** already exists in **Memory A**.
     - Its **`c.*` bonus** already exists in **Memory B**.
   - **For `i.gauntlet`, `i.archery`, and `i.catalyst`:**
     - From the inventory, search for the **highest ( modfied `core concept` + `c.N_NoA+X`) value item** in the target item category.
     - the value is including enhancement, super rare multiplier calculation.
   - **Other item categories:**
     - From the inventory, search for the **highest modified `core concept` value item** in the target item category.
     - the value includes enhancement, super rare multiplier calculation.
  - `modified core concept`: the value on the display like "究極の神鋼の短剣 近攻+1111" -> 1111. 

4. **Register the selected item**
   - Add the selected item's **item ID** to **Memory A**.
   - Add the selected item's **`c.*` bonus** to **Memory B**.

5. **Repeat**
   - Repeat Step 3 and Step 4 until all potential equipment slots for that item category have been evaluated or no eligible items remain.

6. **Jewel allocation**
  - If **Memory C** contains recorded jewel data, jewels are reassigned by item category.
  - Higher-tier jewels are preferentially assigned to items with higher enhancement values and to super rare items.

##### 7.1.1.3 Upgrading existing equipment
- If a party member already has an item equipped, and another eligible item (same item ID) exists with a higher enhancement, the equipped item is replaced.
- Jewels socketed in the currently equipped item remain unchanged.
- Only the equipment item itself is replaced.
- Super rare item is not replaced by this process. 

##### 7.1.1.4 notification 
- After the auto-equipment calculation:
  - If `m.auto_equipment` is `FULL`, recall **Memory** D and perform entity comparison with the newly equipped items.
  - Only changed equipment is displayed in the notification.
- notification logic. 
  - empty slot to equip item: PT2ニャンは 恐ろしい月鋼鏃の矢を装備した
  - exist item to equip another item: PT2ニャンは 恐ろしい月鋼鏃の矢 を 魔性の瞬撃の月鋼矢に装備しなおした 
