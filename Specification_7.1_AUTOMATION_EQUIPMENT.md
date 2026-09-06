## 7. AUTOMATION

### 7.1 AUTOMATION EQUIPMENT

#### 7.1.1 AUTO equipment logic
- The behavior of automatic equipment is controlled by `m.auto_equipment`.
 
| Mode     | Description                    |
| -------- | ------------------------------ |
| `OFF`  | No automatic equipment processing is performed. Characters keep their current equipment unless changed manually.  |
| `SEMI` | Automatically **Run `7.1.3 SEMI: Upgrading existing equipment`**. |
| `FULL` | Automatically **Run `7.1.2 FULL: Equipment logic`**.    |

- Processing priority: Characters are processed sequentially in party order: Row1 → Row2 → … → Row6…

#### 7.1.2 FULL: Equipment logic

##### 7.1.2.1 Dirty check

**1. Compare the current Inventory revision numbers with the revision numbers recorded at the party's previous FULL Auto Equipment run.**
- For each individual item, ignore quantity changes while the item remains available.
  - Example: 1 → 2 does not count as a change.
- Treat newly available items as relevant changes.
  - Example: 0 → 1+ counts as a change.
  - Example: 1+ → 0 **does not** count as a change.
- When a relevant equipment Inventory change occurs, increment `equipmentInventoryRevision`.
- When a relevant jewel Inventory change occurs, always increment `jewelInventoryRevision`.
  - Example: 
    - 0 → 1+ = relevant
    - 1 → 2 = irrelevant
    - 1+ → 0 = irrelevant
- A party checks jewelInventoryRevision only when that party is `Jewel Priority Party: true`.
- Each party records the revision numbers used during its most recent FULL Auto Equipment run.

```
Global: equipmentInventoryRevision = 152 jewelInventoryRevision = 87
Party 1: lastFullEquipmentRevision = 152 lastFullJewelRevision = 87
Party 2: lastFullEquipmentRevision = 149 lastFullJewelRevision = 85
...
```

**2. Check whether any member of the target party has one or more empty equipment slots**

- Run the FULL Auto Equipment process only if at least one of the following conditions is met:
the applicable Inventory revision number has changed since the party's previous FULL Auto Equipment run, or
at least one party member has an empty equipment slot.
- Otherwise, skip the FULL Auto Equipment process.
- After completing a FULL Auto Equipment run, update the party's recorded revision numbers to the current global revision numbers.

##### 7.1.2.2 Simulation: the equipment change 
**1. `<TBA>`**
- This step is not required in the current version and is omitted at runtime.
- This Step ID is reserved for future implementation.

**2. Determine the target item categories**
- For each replaceable equipment slot, determine the target item category according to the class's ideal equipment build order.
  - A replaceable equipment slot is either:
    - an empty equipment slot, or
    - a slot containing an item that is neither locked nor Super Rare.
- Empty slots are treated as missing categories. Existing replaceable equipment slots are also reevaluated against the corresponding category.
- This order represents the target balance of equipment categories for that class.
- The system checks the character’s current equipment and selects the earliest category in the order that is still missing.
- In other words, auto-equipment attempts to move the character’s equipment composition closer to the ideal category balance defined by the class.

- Example:
  - If a Duelist already has two `i.sword` items equipped, the system evaluates the order and selects the next missing categories.
  - If the 3rd and 4th slots are empty, the selected categories will be:
    - 3rd slot → `i.gauntlet` (from `i.NoA`)
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
| 15 | `i.NoA` |
| 16 | `i.weapon` |
| 17 | `i.armor` |
| 18 | `i.robe` |

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

**Decide the combat style**
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
  - If no `c.equip_ranged`,`c.equip_magic`, `c.equip_melee`: resolve `i.weapon`, `i.archery`, `i.catalyst`, and `i.gauntlet` (`i.NoA`) to `i.shield`. 
   

**3. Initialize the simulation memory.**
- Record the **item IDs** of all currently equipped items as **Memory A**.
- Record all **`c.*` bonus effects** provided by the currently equipped items as **Memory B**.
  - Intention: Prevent duplicate bonuses in the final simulated equipment set.
- Initialize the `simulated equipment set` as a copy of the character's current equipment set.
- All equipment and jewel changes during this section are applied only to the `simulated equipment set` until the Commit phase.
  
**4. Search for candidate items**
- Exclude any candidate item that satisfies any of the following conditions:
  - Its item ID already exists in **Memory A**.
  - At least one of its `c.*` bonuses already exists in **Memory B**.
  - It has `c.antagonism` (to prevent the selection of items that introduce harmful effects).
- **For `i.gauntlet`, `i.archery`, and `i.catalyst`:**
  - From the inventory, search for the **highest ( modfied `target d. bonus` + `c.N_NoA+X`) bonus value item** in the target item category.
  - the value includes enhancement, super rare multiplier calculation.
- **Other item categories:**
  - From the inventory, search for the **highest modified `target d. bonus` value item** in the target item category.
  - the value includes enhancement, super rare multiplier calculation.
- `modified core concept`:
  - Respect corresponding c bonus for item like `c.sword_x1.x`.
  - Use exactly the same modified value displayed in the character's item list. (with `c.sword_x2.0`) "究極の神鋼の短剣 近攻+1111" -> Use: 1111.
  - "究極の神鋼の短剣" in inventory is "近攻+555", not use this value.
 
|category | `target d. bonus` |
|-----|----------|
|`i.armor` | + `d.physical_defense` |
|`i.robe` | + `d.magical_defense` |
|`i.shield ` | + `d.HP` |
|`i.sword` | + `d.melee_attack` |
|`i.katana` | + `d.melee_attack` |
|`i.gauntlet` | + `d.melee_NoA` |
|`i.arrow` | + `d.ranged_attack` |
|`i.bolt` | + `d.ranged_attack`  |
|`i.archery` | + `d.ranged_NoA` |
|`i.wand` | + `d.magical_attack` |
|`i.grimoire` | + `d.magical_attack` |
|`i.catalyst` | + `d.magical_NoA`  |

**5. Register the selected candidate item**
- Add the selected item's **item ID** to **Memory A**.
- Add **each `c.*` bonus** of the selected item to **Memory B**.

**6. Repeat**
- Repeat Steps 4 and 5 until all potential equipment slots for the target item category have been evaluated or no eligible items remain.

**7. Upgrade equipment evaluation**
- For each item currently present in the `simulated equipment set`, check whether another eligible item with the same item ID exists in Inventory with a higher enhancement level.
- If a higher-enhancement version exists, replace the corresponding item in the `simulated equipment set` with the eligible version having the highest enhancement level.
- Locked items and Super Rare items are not replaced by this process.

**8. Evaluate jewel allocation for the simulated equipment set**
- Consider jewels currently assigned to the character.
- If the target party is the `Jewel Priority Party`, also consider eligible jewels available in Inventory.

8-1. Check all jewels currently owned by that party member.
   - Record these equipped jewels as **Memory J**.

8-2. Determine the corresponding jewel category based on the table below.
   - Check Inventory for available jewels.
   - Exclude jewels with the same item type and rank.
   - Exclude jewels already stored in **Memory J**.
   - Internally store the remaining valid jewels as the list of potential jewel candidates.
   - Only one jewel is allowed per combination of item type and rank, per character.

8-3. Evaluate jewel assignment.
   - Compare the resulting candidate jewel set with **Memory J**. If the candidate jewel set is identical to Memory J, skip the assignment process.
   - Start from `i.armor`, following the Jewel Category Mapping order. 
   - Jewel assignment priority is from higher-grade jewels to lower-grade jewels.
   - Continue until either:
     - no available jewels remain, or
     - all eligible equipment slots have been assigned a jewel.

**Jewel Category Mapping**

| Item type | Auto-equipped jewel |
|---|---|
| `i.armor` | `j.fort` |
| `i.robe` | `j.ward` |
| `i.shield` | `j.shade` |
| `i.sword` | `j.might` |
| `i.katana` | `j.focus` |
| `i.gauntlet` | `j.fort` |
| `i.arrow` | `j.shade` |
| `i.bolt` | `j.might` |
| `i.archery` | `j.focus` |
| `i.wand` | `j.arcana` |
| `i.grimoire` | `j.arcana` |
| `i.catalyst` | `j.ward` |


##### 7.1.2.3 Evaluation: the equipment change**

1. `<TBA>` For this version, always accept the simulated equipment change.


##### 7.1.2.4 Commit: Equipment change**

1. Compare the current equipment set with the simulated equipment set and identify all differences.

2. Apply only the equipment and jewel changes identified in the comparison.


#### 7.1.3 SEMI: Upgrading existing equipment 
- If a party member already has an item equipped, and another eligible item (same item ID) exists with a higher enhancement, the equipped item is replaced.
- Jewels socketed in the currently equipped item remain unchanged.
- Only the equipment item itself is replaced.
- Super rare item is not replaced by this process. 
1. Evaluate eligible replacement candidates.
2. If a valid upgrade candidate is found, commit the equipment replacement.

#### 7.1.4 Auto-equipment notification 
- After the auto-equipment calculation:
  - Only changed equipment is displayed in the notification.
- notification logic. 
  - empty slot to equip item: PT2ニャンは 恐ろしい月鋼鏃の矢を装備した
  - exist item to equip another item: PT2ニャンは 恐ろしい月鋼鏃の矢 を 魔性の瞬撃の月鋼矢に装備しなおした 
