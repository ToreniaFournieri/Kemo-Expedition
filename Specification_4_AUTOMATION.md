## 4. AUTOMATION

### 4.1 AUTO equipment logic
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

#### 4.1.1 Removes all equipment
- Record the **jewel** assignments of each equipped item category as **Memory C**.
- Record the all of its equipment as **Memory D**.
- Remove all of its equipment. (this only works when `m.auto_equipment` is FULL)
- Exception: Super rare item is not removed by this process. 

#### 4.1.2 Equipping into empty slots
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

- Duelist class:

| order | item category |
|-|-|
| 1 | `i.melee` |
| 2 | `i.gauntlet` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.melee` |
| 6 | `i.armor` |
| 7 | `i.gauntlet` |
| 8 | `i.melee` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.melee` |

-  Ninja class:

| order | item category |
|-|-|
| 1 | `i.melee` |
| 2 | `i.gauntlet` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.melee` |
| 6 | `i.melee` |
| 7 | `i.gauntlet` |
| 8 | `i.melee` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.melee` |


- Samurai class:

| order | item category |
|-|-|
| 1 | `i.melee` |
| 2 | `i.gauntlet` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.melee` |
| 6 | `i.gauntlet` |
| 7 | `i.melee` |
| 8 | `i.melee` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.gauntlet` |


- Fighter Class:

| order | item category |
|-|-|
| 1 | `i.armor` |
| 2 | `i.melee` |
| 3 | `i.robe` |
| 4 | `i.gauntlet` |
| 5 | `i.melee` |
| 6 | `i.shield` |
| 7 | `i.armor` |
| 8 | `i.robe` |
| 9 | `i.melee` |
| 10 | `i.shield` |
| 11 | `i.melee` |

- Lord Class:

| order | item category |
|-|-|
| 1 | `i.melee` |
| 2 | `i.armor` |
| 3 | `i.robe` |
| 4 | `i.melee` |
| 5 | `i.gauntlet` |
| 6 | `i.melee` |
| 7 | `i.armor` |
| 8 | `i.robe` |
| 9 | `i.melee` |
| 10 | `i.shield` |
| 11 | `i.melee` |
| 11 | `i.gauntlet` |


- Rogue/ Ranger Class:

| order | item category |
|-|-|
| 1 | `i.ranged` |
| 2 | `i.archery` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.ranged` |
| 6 | `i.arrow` |
| 7 | `i.archery` |
| 8 | `i.ranged` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.ranged` |

- Wizard Class:

| order | item category |
|-|-|
| 1 | `i.magic`  |
| 2 | `i.catalyst` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.magic`  |
| 6 | `i.magic`  |
| 7 | `i.catalyst` |
| 8 | `i.magic`  |
| 9 | `i.magic`  |
| 10 | `i.robe` |
| 11 | `i.magic`  |

- Sage/ Pilgrim Class:

| order | item category |
|-|-|
| 1 | `i.magic`  |
| 2 | `i.catalyst` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.magic`  |
| 6 | `i.magic`  |
| 7 | `i.catalyst` |
| 8 | `i.magic`  |
| 9 | `i.magic`  |
| 10 | `i.robe` |
| 11 | `i.catalyst` |

- **Item selection from a specific item category**
- When auto-equipment selects items from a specific item category, the following procedure is used:

1. **Initialize memory**
   - Record the **item IDs** of all currently equipped items as **Memory A**.
   - Record all **`c.*` bonus effects** provided by the currently equipped items as **Memory B**.

2. **Search for a candidate item**
   - **`i.gauntlet` `i.archery` `i.catalyst` item category:**
     - From the inventory, search for the **highest (`core concept` + `c.N_NoA+X`) value item** in the target item category.
       - The highest value item: Exclude any item that satisfies either of the following conditions:
         - Its **item ID** already exists in **Memory A**.
         - Its **`c.*` bonus** already exists in **Memory B**.
     - the value is including enhancement, super rare multiplier calculation.
   - **Other item category:**
     - If the specified category is a group item category, expand it into its constituent item categories. Items from any of the included categories may be selected.
     - From the inventory, search for the **highest `core concept` value item** in the target item category.
     - the value is including enhancement, super rare multiplier calculation.
   - Exclude any item that satisfies either of the following conditions:
     - Its **item ID** already exists in **Memory A**.
     - Its **`c.*` bonus** already exists in **Memory B**.

3. **Register the selected item**
   - Add the selected item's **item ID** to **Memory A**.
   - Add the selected item's **`c.*` bonus** to **Memory B**.

4. **Repeat**
   - Repeat Step 2 and Step 3 until all potential equipment slots for that item category have been evaluated or no eligible items remain.

5. **Jewel allocation**
  - If **Memory C** contains recorded jewel data, jewels are reassigned by item category.
  - Higher-tier jewels are preferentially assigned to items with higher enhancement values and to super rare items.

#### 4.1.3 Upgrading existing equipment
- If a party member already has an item equipped, and another eligible item (same item ID) exists with a higher enhancement, the equipped item is replaced.
- Jewels socketed in the currently equipped item remain unchanged.
- Only the equipment item itself is replaced.
- Super rare item is not replaced by this process. 

#### 4.1.4 notification 
- After the auto-equipment calculation:
  - If `m.auto_equipment` is `FULL`, recall **Memory** D and perform entity comparison with the newly equipped items.
  - Only changed equipment is displayed in the notification.
- notification logic. 
  - empty slot to equip item: PT2ニャンは 恐ろしい月鋼鏃の矢を装備した
  - exist item to equip another item: PT2ニャンは 恐ろしい月鋼鏃の矢 を 魔性の瞬撃の月鋼矢に装備しなおした 
