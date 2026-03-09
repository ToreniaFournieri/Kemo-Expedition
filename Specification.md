# KEMO EXPEDITION v0.5.2 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- Tetris like randomness. (Bag Randomization)
- Data persistence 

### 1.1 World setting
- The world is fragmented into unexplored regions filled with ancient creatures and forgotten relics.
- Each expedition is guided by a single deity, who manifests power through a chosen party to restore balance and reclaim lost knowledge. 

## 2. CONSTANTS & DATA
- @Specification_CONSTANTS_&_DATA.md
- @Specification_Master.md

## 3. INITIALIZATION 

### 3.1 Randomness initialization
-  `f.reset_weighted_bag`(bag_key: t.*)
  - bags: `t.common_reward_bag`, `t.common_enhancement_bag`, `t.uncommon_reward_bag`, `t.rare_reward_bag`, `t.mythic_reward_bag`, `t.enhancement_bag`, `t.superRare_bag`, `t.physical_threat_weight_bag`, `t.magical_threat_weight_bag`, `t.side_quest_bag`, and `t.sleepiness_of_party_bag` for each party. 


### 3.2 Initial setup
- Initial setup (or reset condition)

- unlocked deity: none (all of other deity is unlocked)

- PT1 Party initial condition.
  1. "ケモ", Caninian, 戦(君), Sturdy, House of the Unmoving
     - equipment: `1101`, `1103`
  2. "ゴン", Vulpinian, 剣(侍), Chivalric, House of War Spirit
     - equipment: `1104`
  3. "イタチ", Murid, 忍(盗), Persistent, House of the Breaking Hand
     - equipment: `1104`
  4. "ロップ", Leporian, 狩(賢), Dexterous, House of Far Sight
     - equipment: `1107`, `1108`, `1109`
  5. "ラス", Felidian, 賢(巡), Pursuing, House of Hidden Principles
     - equipment: `1110`, `1111`, `1112` 
  6. "セルヴァ", Cervin, 魔(魔), Canny, House of Guiding Thought
     - equipment: `1110`

- Party initial inventory.
  - 1 Tier-1 common items of each item type.

- Party initial state.
  - `PartyLevel`: 1
  - `xp_current`: 0
  - Gold: 200G
  - Auto-sell: none
  - state: idle
  - deity: none

- PT2 initial condition (when unlocked)
  - deity: `God of Attrition`
  - party member race: all Lupinian
  - 3.6 AUTO equipment logic for all party member. 
 
- PT3 initial condition (when unlocked)
  - deity: `God of Cunning`
  - party member race: all Vulpinian
  - 3.6 AUTO equipment logic for all party member.  

- PT4 initial condition (when unlocked)
  - deity: `God of Fortification`
  - party member race: all Ursan
  - 3.6 AUTO equipment logic for all party member.  

- PT5 initial condition (when unlocked)
  - deity: `Goddess of Fertility`
  - party member race: all Felidian
  - 3.6 AUTO equipment logic for all party member. 

- PT6 initial condition (when unlocked)
  - deity: `God of Resonance`
  - party member race: all Mustelid
  - 3.6 AUTO equipment logic for all party member.

### 3.3 Character initialization

#### 3.3.1 Level and slots
- Experience and level are party-wide. Characters do not have individual levels; all level-based effects reference Party level.
- max_level: 49. (current version restriction)

- Equipment slots for individual character
	-`maximum_equipped_item`= base slots + class_bonuses (`c.equip_slot+1`, `c.equip_slot+2` )
  	- Where class_bonuses is the sum of unique values from Main and Sub class. Example: If Main Class provides `c.equip_slot+2` and Sub Class provides `c.equip_slot+1`, class_bonuses is 3. If both provide `c.equip_slot+2`, bonus_sum is 2.


- `f.equipment_slots`

|level | base slots |
|-----|-----------|
| 1 | 1 |
| 3 | 2 |
| 6 | 3 |
| 10 | 4 |
| 14 | 5 |
| 19 | 6 |
| 24 | 7 |
| 30 | 8 |
| 36 | 9 |
| 43 | 10 |
| 50 | 11 |
| 57 | 12 |
| 65 | 13 |
| 73 | 14 |
| 81 | 15 |
| 90 | 16 |
| 99 | 17 |


- Base status update: add (b.) modifiers. (ex. `b.vitality` = 10(from race) + `b.vitality+2` -> 12

**Experience and level and experience point**
- Each party has its own `PartyLevel` and `xp_current`.
- Experience point to next is calculated like this:
  - `f.XP_to_next`(level: ) = 100 x (1.259)^(level -1)
- When the party levels up:
  - `PartyLevel` += 1
  - `xp_current` = 0
  - Any overflow XP is discarded.

- Experience calculation:
  - Each expedition has a  `x.exp_level`.
  - Each expedition has 6 `xfloor`s, and each `x.floor`.
  - Enemy level `x.enemy_level_final` = `x.exp_level` + (`x.floor` - 1 )
  - Enemy level is used only for experience calculation. 
  - Example:
    - Tier 2 expedition (base enemy level = 7), floor 3 (add +2): `x.enemy_level_final` = 7 + 2 = 9

- Multipliers
  - Tier multiplier: `x.exp_experience_mult` = 3 ^(`x.tier` - 1)
  - Rank multiplier:
    - `x.mult_rank` = 1.0 (Normal)
    - `x.mult_rank` = 1.5 (Elite)
    - `x.mult_rank` = 3.0 (Boss)
  - Over-level penalty:
    - `x.experience_penalty` = (1/2) ^ max(0, `PartyLevel` - `x.enemy_level_final`)

- Total gained XP:
  - `f.calculate_experience` = `d.experience` x `x.mult_rank` x `x.exp_experience_mult` x `x.experience_penalty`
  - The XP is accumulated as float and ceiled once at the end of an `x.expedition` when applied to `xp_current`. 


#### 3.3.2 Multiplier and Functions

- c.multiplier like `c.sword_x1.3` applies only for sword item type. other item types like shield may have +10 melee_attack bonus, but shield's melee_attack bonus is not multiplied by `c.sword_x1.3` effect.
  - if character.`a.seeker`, multiplier the calsulated amount to `c. multiplier`. 

- **`f.base_multiplier`(base_type: ) table of `b.value`**
  - base_type: `b.strength` or `b.intelligence` -> attack scale
  - base_type: `b.vitality` or `b.mind` -> defense scale
  - If `b.strength` is 12, then it applies x1.10. If `b.vitality` is 15, then it applies x0.77.
  - If its value is lower or higher so no entry in the table, apply the lowest or highest value.


| Value | attack scale | defense scale |
|---|---|----|
| 6 | x0.81 | x1.22 |
| 7 | x0.86 | x1.16 |
| 8 | x0.90 | x1.10 |
| 9 | x0.95 | x1.05 |
| 10 | x1.00 | x1.00 |
| 11 | x1.05 | x0.95 |
| 12 | x1.10 | x0.90 |
| 13 | x1.16 | x0.86 |
| 14 | x1.22 | x0.81 |
| 15 | x1.28 | x0.77 |
| 16 | x1.34 | x0.73 |
| 17 | x1.41 | x0.69 |
| 18 | x1.48 | x0.66 |
| 19 | x1.55 | x0.63 |
| 20 | x1.63 | x0.60 |
| 21 | x1.71 | x0.57 |
| 22 | x1.80 | x0.54 |
| 23 | x1.89 | x0.51 |


- character.`f.NoA`: // NoA 0 = No Action.
  - `d.ranged_NoA` = 0 + `c.pursuit+v` bonuses + Item Bonuses of {(`d.ranged_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.ranged_NoA+v`), round off} 
    - IF the character has `a.iaigiri`, halve these number of attacks, round up. 
  - `d.magical_NoA`= 0 + `c.caster+v` bonuses + Item Bonuses of {(`d.magical_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.magical_NoA+v`), round off} 
  - `d.melee_NoA`= 0 + `c.grit+v` bonuses + Item Bonuses of {(`d.melee_NoA` x enhancement multiplier x super rare multiplier x its c.multiplier + `c.melee_NoA+v`), round off} 
    - IF the character has `a.iaigiri`, halve these number of attacks, round up. 
  - *note: `c.ranged_NoA+v`, `c.magical_NoA+v`, `c.melee_NoA+v`  Only one single bonuses(c.) of the **exact** same name applies.  

- character.`f.attack`:
  - `d.ranged_attack`= Item Bonuses of {(`d.ranged_attack` x enhancement multiplier x super rare multiplier x its c.multiplier), round off}
  - `d.melee_attack`= Item Bonuses of {(`d.melee_attack` x enhancement multiplier x super rare multiplier x its c.multiplier), round off}
  - `d.magical_attack`= Item Bonuses of of {(`d.magical_attack`  x enhancement multiplier x super rare multiplier x its c.multiplier), round off}

- character.`f.offense_amplifier` (phase: )
  - If phase is LONG or CLOSE,
    - If character.`a.iaigiri`, return v x sum of ( `c.melee_attack+v` or `c.ranged_attack+v`)　x `c.physical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.strength`)
      - `a.iaigiri`1: v = 1.6
      - `a.iaigiri`2: v = 1.8
      - `a.iaigiri`3: v = 2.0
    - Else return 1.0 x sum of ( `c.melee_attack+v`, `c.ranged_attack+v` and `c.physical_attack+v` ) x `c.physical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.strength`)
  		- ex. If chracter has `c.physical_offense_multiplier_x1.4` and `c.physical_offense_multiplier_x1.2`, 1.4 x 1.2 = 1.68.
  - If phase is MID,  return 1.0 x  sum of (`c.magical_attack+v` and `c.magical_attack+v` ) x `c.magical_offense_multiplier_xV` x `f.base_multiplier`(base_type: `b.intelligence`)
     	- ex. If chracter has `c.magical_offense_multiplier_x1.4` and `c.magical_offense_multiplier_x1.2`, 1.4 x 1.2 = 1.68.
  - *note: `c.melee_attack+v`,  `c.ranged_attack+v`, `c.magical_attack+v`, `c.physical_attack+v`, `c.physical_offense_multiplier_xV` or  `c.magical_offense_multiplier_xV`. Only one single bonuses(c.) of the **exact** same name applies.  

- character .`f.defense` (phase: ):
  - If phase is LONG or CLOSE:
  	- `d.physical_defense`: Item Bonuses of {(Physical defense x enhancement multiplier x super rare multiplier x its c.multiplier), round off}
  - If phase is MID:
  	- `d.magical_defense`: Item Bonuses of {(Magical defense x enhancement multiplier x super rare multiplier x its c.multiplier), round off}

- character.`f.defense_amplifier` (phase: )
  - If phase is LONG or CLOSE
    - return max(0.01, (1.00 - sum of (`c.physical_defense+v`)) x `c.physical_defense_multiplier_xV` x `f.base_multiplier`(base_type: `b.vitality` ) )
  - Else (phase is MID), return max(0.01, (1.00 - sum of (`c.magical_defense+v` )) x `c.magical_defense_multiplier_xV` x `f.base_multiplier`(base_type: `b.mind` ))
    - ex. If chracter has`c.physical_defense_multiplier_x1.4` and `c.physical_defense_multiplier_x1.2`, 1.4 x 1.2 = 1.68.

  - *note: `c.physical_defense+v`, `c.magical_defense+v`  Only one single bonuses(c.) of the **exact** same name applies.  


- character.`f.accuracy_amplifier` (phase: )
  - If phase is LONG,  return: `d.accuracy_potency`.
  - If phase is MID, return: 1.0 (Fixed value)
  - If phase is CLOSE, return `d.accuracy_potency`.

- character.`f.elemental_offense_attribute`
  - Compute the single elemental amplifier used in damage calculation.
  - Definitions
	- For each element E ∈ {fire, ice, thunder}:
	- sum_v(E) = Σ v for all equipped item bonuses of e.E+v
	- selected_element = **argmax_E sum_v(E)**
    - Tie-breaker: thunder > ice > fire > none
    - elemental_offense_attribute = 1 + sum_v(selected_element)
    - If all sums are 0, then selected_element = none and elemental_offense_attribute = 1.0
    - Stackable:  if two `e.fire+0.15`, then 1 + 0.15 + 0.15 -> 1.30

- character.`f.elemental_resistance_attribute` (element: )
  	- return 1.0 x `c.element_defense_multiplier_xV`
  	  - ex. character has `c.fire_defense_multiplier_x3/5`, then 1.0 x 3/5 -> 0.60 for fire.

- character.`f.penet_multiplier`
  -If character.`c.penet`, add them. (ex. `c.penet+0.10` & `c.penet+0.15` -> 0.25)

#### 3.3.3 Mathematical Precision & Display Rules
- Internal Calculation: All multipliers and final status values are calculated using floating-point precision (e.g., 1.4 * 1.3 = 1.82) to ensure accuracy across multiple stacked bonuses.
- Display Rule (Rounding): For UI and logs, values are rounded to one decimal place (e.g., 1.82 → 1.8).
- Integer Rule: Final damage values and HP values are always floored to the nearest integer for display, though internal logic may retain decimals until the final step.
 
### 3.4 Party initialization
- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 

```
Party.`d.HP` =
  100
  + (Total sum of individual (Item Bonuses of {((HP x enhancement multiplier x super rare multiplier x its c.multiplier ) x (`b.vitality` + `b.mind`) / 20 x `c.growth_xV`) , round off}
  + {(`L_eff` x `b.vitality` x (`b.vitality`  + `b.mind`) / 20 x `c.growth_xV`), round off}
```

- If character has c.growth_x1.6 and c.growth_x1.3, then 1.6 x 1.3 -> 2.08

```
`L_eff` =
  level * (
    1
    + max(0, (level - 10)/33)^1.1
    + max(0, (level - 20)/33)^1.2
    + max(0, (level - 30)/33)^1.3
    + max(0, (level - 40)/33)^1.4
    + max(0, (level - 50)/33)^1.5
    + max(0, (level - 60)/33)^1.6
    + max(0, (level - 70)/33)^1.7
    + max(0, (level - 80)/33)^1.8
  )
```

- party.`f.party.offense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
    - If flont_row_from_actor_member_has.`a.command`3: multiply x2.43
	- If flont_row_from_actor_member_has.`a.command`2: multiply x1.35
    - If flont_row_from_actor_member_has.`a.command`1: multiply x1.2
- party.`f.abilities_defense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
  	- If flont_row_from_actor_member_has.`a.defender`3: multiply x1/2
  	- If flont_row_from_actor_member_has.`a.defender`2: multiply x3/5
	- If flont_row_from_actor_member_has.`a.defender`1: multiply x2/3
  - If phase is MID:
    - If flont_row_from_actor_member_has.`a.m-barrier`3: multiply x1/2
    - If flont_row_from_actor_member_has.`a.m-barrier`2: multiply x3/5
    - If flont_row_from_actor_member_has.`a.m-barrier`1: multiply x2/3

### 3.5 Unlock party & Deity
- Party & Deity unlock condition: Defeating corresponding gods.
  - New party with new corresponding deity as default.
  - max 6 parties.
   
| Condition | Unlock Religions | Unlock party |
|-----|-----|-----|
| Defeating: `Seiran` | `Goddess of Restoration` | none |
| Defeating: `Garv` | `God of Attrition` | 2nd party |
| Defeating: `Kyōen` | `God of Cunning` | 3rd party |
| Defeating: `Dolvar` | `God of Fortification` | 4th party |
| Defeating: `Miora` | `Goddess of Fertility` | 5th party |
| Defeating: `Rondel` | `God of Resonance` | 6th party |
| Defeating: `Lira` | `Goddess of Precision` | none |
| Defeating: `Forne` | `God of Fate` | none |
| Defeating: `Skuva` | `God of Dusk` | none |
| Defeating: `Forne` | `God of Fate` | none |
| Defeating: `Tanue` | `Goddess of Mirage` | none |
| Defeating: `Noctyra` | `God of Oblivion` | none |
| Defeating: `Eris` | `Goddess of discord` | none |


### 3.6 AUTO equipment logic
- The behavior of automatic equipment is controlled by `m.auto_equipment`,  and upgrades their equipment at the end of **outfit** state.
 
| Mode     | Description                                                                                                                |
| -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `OFF`  | No automatic equipment processing is performed. Characters keep their current equipment unless changed manually.           |
| `SEMI` | Automatically **3.6.2 Fills empty slots** and **3.6.3 Upgrades existing equipment**  , but does **not remove currently equipped items**. |
| `FULL` | Automatically **3.6.1 Removes all equipment**, **3.6.2 Fills empty slots** and **3.6.3 Upgrades existing equipment**. |                             |

- Processing priority: Characters are processed sequentially in party order: PT1 Row1 → PT1 Row2 → … → PT1 Row6 → PT2 Row1 → PT2 Row2 → …
- Item categories of already equipped items are not changed.
- The system only fills empty slots or upgrades existing equipment without replacing it with a different item category.
- No other policy exist in this version.

#### 3.6.1 Removes all equipment
- Record the **jewel** assignments of each equipped item category as **Memory C**.
- Record the all of its equipment as **Memory D**.
- Remove all of its equipment. (this only works when `m.auto_equipment` is FULL)
- Exception: Super rare item is not removed by this process. 

#### 3.6.2 Equipping into empty slots
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
| 1 | `i.sword` |
| 2 | `i.gauntlet` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.katana` |
| 6 | `i.armor` |
| 7 | `i.gauntlet` |
| 8 | `i.sword` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.sword` |

-  Ninja class:

| order | item category |
|-|-|
| 1 | `i.sword` |
| 2 | `i.gauntlet` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.katana` |
| 6 | `i.sword` |
| 7 | `i.gauntlet` |
| 8 | `i.sword` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.sword` |


- Samurai class:

| order | item category |
|-|-|
| 1 | `i.sword` |
| 2 | `i.gauntlet` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.katana` |
| 6 | `i.katana` |
| 7 | `i.gauntlet` |
| 8 | `i.katana` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.katana` |


- Fighter/ Lord Class:

| order | item category |
|-|-|
| 1 | `i.shield` |
| 2 | `i.armor` |
| 3 | `i.robe` |
| 4 | `i.sword` |
| 5 | `i.gauntlet` |
| 6 | `i.shield` |
| 7 | `i.armor` |
| 8 | `i.robe` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.shield` |

- Rogue/ Ranger Class:

| order | item category |
|-|-|
| 1 | `i.arrow` |
| 2 | `i.archery` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.bolt` |
| 6 | `i.arrow` |
| 7 | `i.archery` |
| 8 | `i.bolt` |
| 9 | `i.armor` |
| 10 | `i.robe` |
| 11 | `i.arrow` |

- Wizard Class:

| order | item category |
|-|-|
| 1 | `i.wand` |
| 2 | `i.catalyst` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.grimoire` |
| 6 | `i.wand` |
| 7 | `i.catalyst` |
| 8 | `i.wand` |
| 9 | `i.grimoire` |
| 10 | `i.robe` |
| 11 | `i.wand` |

- Sage/ Pilgrim Class:

| order | item category |
|-|-|
| 1 | `i.wand` |
| 2 | `i.catalyst` |
| 3 | `i.armor` |
| 4 | `i.robe` |
| 5 | `i.grimoire` |
| 6 | `i.wand` |
| 7 | `i.catalyst` |
| 8 | `i.grimoire` |
| 9 | `i.wand` |
| 10 | `i.robe` |
| 11 | `i.catalyst` |

- **Item selection from a specific item category**
- When auto-equipment selects items from a specific item category, the following procedure is used:

1. **Initialize memory**
   - Record the **item IDs** of all currently equipped items as **Memory A**.
   - Record all **`c.*` bonus effects** provided by the currently equipped items as **Memory B**.

2. **Search for a candidate item**
   - From the inventory, search for the **highest `core concept` value item** in the target item category.
     - `core concept` is in 2.5.1 Item category @Specification_CONSTANTS_&_DATA.md
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

#### 3.6.3 Upgrading existing equipment
- If a party member already has an item equipped, and another eligible item (same item ID) exists with a higher enhancement, the equipped item is replaced.
- Jewels socketed in the currently equipped item remain unchanged.
- Only the equipment item itself is replaced.
- Super rare item is not replaced by this process. 

#### 3.6.4 notification 
- After the auto-equipment calculation:
  - If `m.auto_equipment` is `FULL`, recall **Memory** D and perform entity comparison with the newly equipped items.
  - Only changed equipment is displayed in the notification.
- notification logic. 
  - empty slot to equip item: PT2ニャンは 恐ろしい月鋼鏃の矢を装備した
  - exist item to equip another item: PT2ニャンは 恐ろしい月鋼鏃の矢 を 魔性の瞬撃の月鋼矢に装備しなおした 


## 4. Party State Machine

- Use one state per party. Every party ticks independently.

- **State list**

| State | Logic | Move to | Durration modifilier |
|-------|-------|----------|---------|
| rest(休息中)  | at home | sell or feast | `God of Fortification` |
| sell(売却中) | at home, Sell auto-sell items to shop owners. and officially gain items (notification of item gains at the end of sell state.). If they have no trophy nor auto-sell item, skip this state. | feast | `God of Dusk` |
| feast(宴会中) | at home, skip if current_profit = 0). Skipped if the party’s total HP was below 30% of Max HP at the beginning of rest state. | sound_sleep or nap_sleep or pray | `Goddess of Fertility` |
| sleep/ sound_sleep(熟睡中), nap_sleep(仮眠中) | at home. skip if the party’s total HP was below 10% of Max HP at the beginning of rest state. (no draw a ticket from `t.sleepiness_of_party_bag`) | outfit |
| outfit(身支度中) | equipping items. skip if no nap_sleep or sound_sleep | pray |
| pray(祈り中) | at home. Party members donate money to their deity. | idle or move |
| idle(待機中) | at home. only when 自動周回 = OFF (idle state) | - |
| move(移動中) | home → dungeon, If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3, `a.peddler`2: 3/5) | explore | `a.peddler` |
| explore(探索中) | in dungeon. if HP < 30% MaxHP → retreat. At the end of this state, update this {ルピニアンの断崖踏破} part ) | return | `Goddess of Precision` |
| return(帰還中) | dungeon → home,If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3, `a.peddler`2: 3/5) | rest | 
| reactivate(復帰中) | Reactivating from AFK mode | - | - |

- **Realtime Progress**
- Debug Scaling: For debugging purposes, all durations are multiplied by **0.2** in the `/dev/`, `/qa/`, and `/luna/` environments.

| State | Duration |
|-------|-------|
| rest(休息中)  | heal +1% MaxHP / 5 sec until full |
| sell(売却中) | 5 seconds per `auto-sell` items |
| feast(宴会中) | 90 seconds |
| sound_sleep(熟睡中) | 120 seconds |
| nap_sleep(仮眠中) | x 1/5 of sound sleep |
| outfit(身支度中) | 60 seconds |
| pray(祈り中) | 30 seconds |
| move(移動中) | 10 seconds * (1.30 - 0.02 * `x.exp_tier` )^(`x.exp_tier`) | 
| explore(探索中) | 5 seconds per room (24 rooms in total)|
| return(帰還中) | 30 seconds * (1.30 - 0.02 * `x.exp_tier` )^(`x.exp_tier`)  |

- sleepiness from `t.sleepiness_of_party_bag` 
  - 0 No sleep: The party skips the sleep state and continues the normal cycle.
  - 1 Nap: The party enters a short sleep (light rest). ( x 1/5 sleep duration)
  - 2 Sound sleep: The party enters a full sleep state. ( x1 sleep duration )



- Profit usuage:
  - At: rest(休息中):
      - `current_profit` = 0
  - At the end of sell(売却中):
      - `current_profit` = Sum of (Auto-sell items)
  - At the end of feast(宴会中):
      - `current_profit` -= spending feast ( spend 33–67% of `current_profit` without `a.squander`, x1.3 spending with `a.squander`1, x1.5 spending with `a.squander`2. Not exceed current_profit )
        - Notification :
          - Without Squander: PT1は25Gお金を使った
          - With Squander: PT1 君主トムは贅沢に50G使った
  - At the end of pray(祈り中):
      - `current_profit` -= donattion ( 10–33% of `current_profit` without `a.tithe`, if party has `a.tithe`2, Adds +15% , else if party has `a.tithe`1, Adds +10, if deity = none, donation is 0. )
      - `current_profit` -= embezzlement (if `God of Cunning`, +50% of `current_profit`. if partymember.`a.momentum`, +10% of `current_profit`. Else if, 0%)
        -  Notification:
          - deity = none: PT1は 43Gを貯金した
          - Without Tithe: PT1は10G神に捧げ、30Gを貯金した
          - With Tithe: PT1 巡礼者ブラザは祈りと共に12G神に捧げて、28Gを貯金した
          - Without Gold: (no notification).
          - If `God of Cunning`, add (21Gを着服した).   ex:PT1は10G神に捧げ、20Gを貯金した (20Gを着服した)
      - `savings` = `current_profit`, `current_profit` = 0
  - If Pressing 出撃/神魔戦 button (and it is Available for sortie )
      - `current_profit` -= embezzlement ( 100% of `current_profit`)
        - Notification:
          - Without embezzlement: PT1は神の緊急動員に憤りながらも出撃した
          - With embezzlement: PT1は神の緊急動員に憤り、49Gを持ち逃げして出撃した

- Player taps 出撃
  - If party is in return / idle / rest / sell / feast / sound_sleep / nap_sleep / pray state:
  - Immediately set state to move state
  - If they not gain items (not finished 売却中 state), immediately gain items and show notifications.
  - Do not refill HP; dungeon starts with current HP. No squander, donation, nor remaining profits to the global wallet. The profit vanishes (The party menders would definitely not be happy with this players emergency sortie.)
  - If party is already in explore state: ignore tap
  - If party Hp is 0 (just after defeated): ignore tap and show notification log:"random party.character は疲弊しており出撃を拒否した"


- **Transition rules**
  - 自動周回ON: 休息中→宴会中(if possible)→睡眠中→祈り中→待機中→移動中→探索中→帰還中→休息中
  - 自動周回OFF: 移動中→探索中→帰還中→休息中 → 宴会中(条件付き) → 睡眠中 → 祈り中 → 待機中 (stop here)


### 4.1 Time-Based Progress Handling (Online + AFK)
- The state machine is purely time-based: persist `state` and `state_started_at`, and on each update tick compute progress from `now - state_started_at`, applying any completed transitions to reach the latest state.
- Update `state_started_at` **only when the party state changes** (on every state transition).
- Limit: maximum 1,800 minutes (30 hours) per catch-up simulation (current version).

**Notification**
- Format: 踏破N回/帰還Y回/引分Z回/撤退M回/敗北X回 寄付金額: vG, 貯金額:　vG
  - Key and label:Clear(踏破) / Turned_Back(帰還) / Draw_Retreat(引分) / Wounded_Retreat(撤退) / Defeat(敗北)
    - Turned_back: Cannot continue because a requirement (loot gate conditiojn) isn’t met and must return home
    - Draw_Retreat: the last room outcome is Draw
    - Wonded_Retreat: Victory but If the party.`d.HP` <= 30% of max HP, back to home with trophies. (excpetion: the Final Boss room) 
- If the value is 0, not display its text (if all zero, then no notification)

```
Exapmle:
PT1: 踏破10回/敗北1回 寄付金額: 10G, 貯金額:　30G
PT2: 踏破1回 寄付金額: 10G, 貯金額:　30G
PT3: 貯金額: 10G
```

### 4.2 Side Quest
**Trigger Condition**
- Checked at the end of the **帰還中 (Returning)** state.
- If the party:
  - has **no active loot gate condition** (including God battle loot gates), and
  - has **no active side quest**
- then roll one ticket from `t.side_quest_bag`.

**Assignment**
- The selected side quest is assigned immediately after the **Returning** state ends.
- Notification example:
  - "PT1はサイドクエスト 治療 (2時間) を受けた"

**AFK handling**
- Respect this side quest progress while AFK mode.

**Cancellation**
- If a **神魔戦 (God Battle)** begins, the current side quest is **cancelled**.
- State whether cancellation applies to all quest types equally and no side quest for the party.

**Reward**
- On completion, the party receives **1 Jewel**.
- The Jewel’s Rank is randomly selected between 1 and `x.exp_tier`, based on the expedition tier at the time the side quest was generated.


## 5. EXPEDITION 
- @Specification_Expedition_Battle_Reward.md

## 6. BATTLE
- @Specification_Expedition_Battle_Reward.md

## 7. REWARD 
- @Specification_Expedition_Battle_Reward.md

## 8. UI
- @Specification_UI.md

## 9. Environment
**Branch:** `main` → `/dev/`, `qa` → `/qa/`, `luna` → `/luna`
**Environment:** `/dev/` = 開発機, `/qa/` = αテスト, `/luna/` = αテスト; display the environment label in the version line.
**Special mod:** If `/luna/`, game mode is `m.luna` and cannot be changed. 
**Save Data Isolation:** Save data must be namespaced per environment (`/dev/` and `/qa/`) and never shared between them.

## 10. Coding Rule: SpecRef Traceability
- To ensure traceability between specification and implementation, developers must annotate relevant code blocks with SpecRef comments.

### 10.1 Format (mandatory)

```
// SpecRef: <SectionID> | <SectionTitle> | <Anchor>
```

### 10.2 Examples
```
// SpecRef: 8.5.1 | Shop (お店) | Paid Refresh (有償洗替)

// SpecRef: 6.2 | Function of battle | f.hit_detection
// SpecRef: 6.2 | Function of battle | f.targeting
```

### 10.3 Rules
- SectionID must exactly match the specification heading number (e.g., `6.2`).
- Anchor must exactly match the corresponding identifier/name in the specification (e.g., `f.hit_detection`, `Paid Refresh (有償洗替)`).
- Place the `SpecRef` comment at the entry point of the implemented logic (function/method or main branch block).
- If one code block implements multiple spec items, add one `SpecRef` line per item.
- When specification IDs/titles/anchors change, corresponding `SpecRef` comments must be updated in the same change set.


## 11. CHANGELOG

|Version  |Changes                                                                               |
|---------|--------------------------------------------------------------------------------------|
| **0.5.2** | Fixed auto equipment logic, update side quest barance, especially embezzlement part logic. Refine AFK part. |
| 0.5.1 | Ajusts auto equipment logic |
| 0.5.0 | unlock for deities, religions . auto equipment update |
| 0.4.1 | Cycle update |
| 0.4.0 | Jewel update, side quest update (level cap to 49) |
| 0.3.3 | Gods religion update |
| 0.3.2 | God battle, unlock ability update |
| 0.3.1 | Level and experience system update |
| 0.3.0 | Super rare update (level cap to 39 from 29) |
| 0.2.9 | Race ability update |
| 0.2.7 | Enemy scale rebarance update |
| 0.2.6 | First Strike description text update |
| 0.2.5 | Alpha test update, barance fix  |
| 0.2.4 | Party State Machine update, AFK mode.  |
| 0.2.3 | Accuracy update. Magic is now respect `f.hit_detection`. |
| 0.2.2| Game balance modified, Enemy status mutipliers update, 2.3.3 Base data structure (enemy) update |
| 0.2.1 | Update:8.7 Divine Bureau, 1. Clairvoyance (add total counts at Normal reward ), Adding 2. Item Comedium and 3. Bestiary |
| 0.2.0 | Big update: 2.1 Global constants (change randamness upgrade), 2.3 Expedition & Enemies, 2.4 Items, 3. INITIALIZATION, 5.1 "Loot-Gate" progression system, 6.5 Outcome  7. REWARD (change the logic), 8.4 Expedition, 8.7 Divine Bureau (setting)  |
| 0.1.4 |                                                                |
    
**END OF SPECIFICATION**
