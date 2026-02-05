# KEMO EXPEDITION v0.1.3 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- Tetris like randomness. (Bag Randomization)
- Data persistence 

### 1.1 World setting
- The world is fragmented into unexplored regions filled with ancient creatures and forgotten relics.
- Each expedition is guided by a single deity, who manifests power through a chosen party to restore balance and reclaim lost knowledge. 

## 2. CONSTANTS & DATA

**Naming Rule**

| Prefix | Description / Definition |
|-------|-------------------------|
| `a.`   | **A**bility (Passive/Active) |
| `b.`   | **B**ase Status (Core attributes) |
| `c.`   | **C**lass/Character Bonus (Modifiers) |
| `d.`   | **D**uel Status (Current combat values) |
| `e.`   | **E**lemental Offense Attribute |
| `f.`   | **F**unction (Logic/Calculated value) |
| `g.` | Ba**g** Randomization |
| `i.`   | **I**tem Category |
| `p.`   | **P**arty/Expedition Instance Data |
| `r.`   | Elemental **R**esistance Attribute |
| `s.`   | Item **S**tate |


### 2.1 Global constants
- One deity represents on one party. The deity has its own level, HP, and unique divine abilities. 
const PARTY_SCHEMA = ['number', 'deity', 'level', 'experience', 'party.d.HP']

- Initial deity: 'God of Restoration' // Revives character at the base automatically, no death penalty 

- **Bag Randomization** There are `g.reward_bag`, `g.enhancement_bag`, `g.superRare_bag`, and `g.threat_weight_bag` which control probable randomness.

- enhancement title
 
|value |title | tickets | multiplier |
|-----|---------|------|------|
|0 |(none) |1390 | x1.00 |
|1 |名工の |350 | x1.33 |
|2 |魔性の |180 | x1.58 |
|3 |宿った |60 | x2.10 |
|4 |伝説の |15 | x2.75 |
|5 |恐ろしい |4 | x3.50 |
|6 |究極の |1 | x5.00 |


- superRare title

|value |title | tickets |multiplier |
|-----|---------|------|-----|
|0 |(none) | 24995 | x1.0 |
|1 |世界を征する |1 | x2.0 |
|2 |天に与えられし |1 | x2.0 |
|3 |混沌の |1 | x2.0 |
|4 |知られざる |1 | x2.0 |
|5 |血に飢えし |1 | x2.0 |

- **Elemental attribute**
  - `elemental_offense_attribute` : `e.none`, `e.fire`, `e.thunder`, `e.ice` // Offensive
  - `elemental_resistance_attribute` : `r.none`, `r.fire`, `r.thunder`, `r.ice` // Defensive


### 2.2 Play characters
- The deity creates character and assigns 6 Characters to its party. 
- Characters can change their race, class, and name at any time while at HOME.

- id: int
- name: string
- races
- predisposition
- lineage
- main_class
- sub_class

#### 2.2.1 Character 
- A character is defined by Race, Class and Predisposition
  - Race defines base status
  - Class defines combat behavior modifiers and equipment bonuses
  - Predisposition defines additional modifiers
  - Characters have no individual HP

**Base Status Parameters**
- Each character has the following base status values: 
    - `b.vitality`: 体, 体力. contributes to Party HP
    - `b.strength`: 力. contributes to physical attack
    - `b.intelligence`: 知, 知性. contributes to magical attack
    - `b.mind`: 精, 精神. contributes to magical resistance effects

- Base status values are summed across the party and converted into party-wide or individual values according to system rules.

- **races(種族):**

|races | bonus | 体,力,知,精 | memo |
|-----|-------|-----------|------|
|ケイナイアン(Caninian) | `c.amulet_x1.3`, `c.archery_x1.1` |10,10,10,10| 🐶Dog |
|ルピニアン(Lupinian) | `c.equip_slot+1`, `c.katana_x1.3`  |9,12,8,7| 🐺Wolf |
|ヴァルピニアン(Vulpinian) |`c.equip_slot+1`, `c.sword_x1.3` |10,10,12,8| 🦊Fox |
|ウルサン(Ursan) |`c.equip_slot+2` |13,12,5,7| 🐻Bear |
|フェリディアン(Felidian) |`c.robe_x1.3`, `a.first-strike`1: Acts faster than enemy at CLOSE phase |9,9,10,12| 😺Cat |
|マステリド(Mustelid) | `c.gauntlet_x1.3`, `a.hunter`1: <Need to define effect.> |10,10,9,11| 🦡Ferret |
|レポリアン(Leporian) | `c.archery_x1.3`,  `c.armor_x1.3` |9,8,11,10| 🐰Rabbit |
|セルヴィン(Cervin) |`c.wand_x1.3`, `c.amulet_x1.2` |6,7,13,10| 🦌Deer |
|ミュリッド(Murid) |`c.penet_x0.10`, `c.caster+1`  |9,8,10,10| 🐭Mouse |


- **predisposition(性格):**

|predisposition | bonus |
|-----|-----------|
|頑強 (Sturdy)|`b.vitality+2`,  `c.armor_x1.1`|
|俊敏 (Agile)|`c.gauntlet_x1.2`|
|聡明 (Brilliant)|`c.wand_x1.2`|
|器用 (Dexterous)|`c.archery_x1.2`|
|騎士道 (Chivalric)|`c.sword_x1.2`|
|士魂 (Shikon)|`b.strength+2`, `c.katana_x1.1`|
|追求 (Pursuing)|`b.intelligence+2`, `c.robe_x1.1`|
|商才 (Canny)|`c.equip_slot+1`|
|忍耐(Persistent)|`b.mind+2`, `c.robe_x1.1`|

- **lineage(家系):**

|lineage | bonus |
|-----|-----------|
|鋼誓の家（House of Steel Oath）|`c.sword_x1.3` |
|戦魂の家（House of War Spirit）|`c.katana_x1.2`, `b.mind+1`|
|遠眼の家（House of Far Sight）|`c.archery_x1.3`|
|不動の家（House of the Unmoving）|`c.armor_x1.2`, `b.vitality+1` |
|砕手の家（House of the Breaking Hand）|`c.gauntlet_x1.2`, `b.strength+1`|
|導智の家（House of Guiding Thought）|`c.wand_x1.3`|
|秘理の家（House of Hidden Principles）|`c.robe_x1.2`, `b.intelligence+1`|
|継誓の家（House of Inherited Oaths）|`c.amulet_x1.2`, `b.vitality+1`|

- **classes:**

|class | main/sub bonuses | main bonus | master bonus | 
|-----|-----------|---------|---------|
|戦士(Fighter) |`c.equip_slot+1`,  `c.armor_x1.4` |`c.grit+1`. `a.defender`1: Incoming physical damage to party × 2/3 |`c.grit+1`. `a.defender`2: Incoming physical damage to party × 3/5 | 
|剣士(Duelist) |`c.sword_x1.4` |`c.grit+1`. `a.counter`1: enemy CLOSE-range attack |`c.grit+1`. `a.counter`2: enemy CLOSE-range attack and MID-range | 
|忍者(Ninja) |`c.penet_x0.15` |`c.grit+1`. `a.re-attack`1: once when attacking |`c.grit+1`. `a.re-attack`2: twice when attacking | 
|侍(Samurai) |`c.katana_x1.4` |`c.grit+1`. `a.iaigiri`: Physical damage ×2,  number of attacks ÷2 | `c.grit+1`. `a.iaigiri`: Physical damage ×2.5,  number of attacks ÷2 |
|君主(Lord) |`c.gauntlet_x1.4`, `c.equip_slot+1` |`a.command`1: Physical damage x1.3 |`a.command`2: Physical damage x1.6 | 
|狩人(Ranger) |`c.archery_x1.4` | `a.hunter`2: <Need to define effect.>  |`a.hunter`3: <Need to define effect.> | 
|魔法使い(Wizard) |`c.wand_x1.4` | `c.caster+2` | `c.caster+3` | 
|賢者(Sage) |`c.robe_x1.4`, `c.equip_slot+2` |`c.caster+1`. `a.m-barrier`1: Incoming magical damage to party × 2/3 | `c.caster+1`. `a.m-barrier`2: Incoming magical damage to party × 3/5 | 
|盗賊(Rogue) |`c.unlock` additional reward chance |`a.first-strike`1: Acts faster than enemy at CLOSE phase |`a.first-strike`2: Acts faster than enemy at All phases | 
|巡礼者(Pilgrim) |`c.amulet_x1.4`, `c.equip_slot+1` |`a.null-counter`: Negate counter attack |`a.null-counter`: Negate counter attack | 

- If `main_class` and  `sub_class` are same class, then it turns into master class, applies master bonus.
- `main_class` applies main/sub bonuses and main bonus. `sub_class` applies only main/sub bonuses.
- Only the strongest single ability(a.) of the same name applies.
- Only one single bonuses(c.) of the **exact** same name applies. (`c.equip_slot+2` and `c.equip_slot+1` then +3 slots. two `c.equip_slot+2`, but only one `c.equip_slot+2` works)
 (`c.armor_x1.4`, `c.armor_x1.3`, `c.armor_x1.3`, and `c.armor_x1.1` =>1.4 x 1.3 x 1.1 = x 2.0)

#### 2.2.2 Party structure 

1. Party Properties
- Player party consists of 6 characters. 
- Row Assignment: Party members occupy positions 1 through 6. Row 1 represents the front-most position (highest threat), while Row 6 represents the back-most position (lowest threat).

- All characters participate simultaneously
- Party has its:
    - Party `d.HP`

2. Character Properties
- Each character has:
  	- `f.attack`, `f.NoA`
		- `d.ranged_attack`, `d.ranged_NoA`
	    - `d.magical_attack`, `d.magical_NoA`
	    - `d.melee_attack`, `d.melee_NoA`
    - `f.elemental_offense_attribute`  // 1.0 as default. 0.5 is weak, 2.0 is strong
		- Has only one type of `none`, `e.fire`, `e.ice`, or `e.thunder`
      		- Priority: `e.thunder` > `e.ice` > `e.fire` > `none` (if it has multiple attribute)
    - `f.defense`
	    - `d.physical_defense`
	    - `d.magical_defense`
  	- `f.elemental_resistance_attribute` // 1.0 as default. 0.5 is strong, 2.0 is weak
		- `r.fire`
		- `r.ice`
		- `r.thunder`
		- Equipment slots

- Characters do not have individual HP. However each character contributes total HP. 

### 2.3 Dungeons & Enemies

- Each dungeon has multiple rooms. each room has one enemy. At the end of room, formidable boss enemy is waiting for the party.

**Dungeon**
- id:int
- name
- number_of_rooms
- pools_of_enemies
- Boss_enemy

**Enemy**
- id: int
- type: string.  Normal/Boss
- pool_id //only for Normal enemy. Boss is always set 0.
- name: string
- `d.HP`
- `f.attack`, `f.NoA`
	- `d.ranged_attack`, `d.ranged_NoA`
	- `d.magical_attack`, `d.magical_NoA`
	- `d.melee_attack`, `d.melee_NoA`
- `f.offense_amplifier` 
	- `d.ranged_attack_amplifier` // 1.0 as default 
	- `d.magical_attack_amplifier` // 1.0 as default 
	- `d.melee_attack_amplifier` // 1.0 as default 
- `f.defense`
	- `d.physical_defense`
	- `d.magical_defense`
- `f.elemental_offense_attribute`  // 1.0 as default. 0.5 is weak, 2.0 is strong
	- Has only one type of `none`, `e.fire`, `e.ice`, or `e.thunder`
- `f.elemental_resistance_attribute` // 1.0 as default. 0.5 is strong, 2.0 is weak
	- `r.fire`
	- `r.ice`
	- `r.thunder`
- f.penet_multiplier
  	- always 0 // (in this version)
- experience // Enemy experience is added directly to party experience.
- gold
- drop_item

- (Temporary test purpose) make 5 dungeons and 5 enemies per dungeon. 

### 2.4 Items

### 2.4.1 Item category 

|category | name | short name| core concept |
|-----|----|----|-----------|
|`i.sword` | 剣 | 剣 | + `d.melee_attack` |
|`i.katana` | 刀 | 刀 | + `d.melee_attack`, - `melee_NoA` |
|`i.archery` | 弓 | 弓 | + `d.ranged_attack`, + `d.ranged_NoA` |
|`i.armor` | 鎧 | 鎧 | + `d.physical_defense` |
|`i.gauntlet` | 籠手 | 手 | + `d.melee_NoA` |
|`i.wand` | ワンド | 杖 | + `d.magical_attack` |
|`i.robe` | 法衣 | 衣 | + `d.magical_defense` |
|`i.amulet` | 護符 | 護 | + `party.d.HP` |
|`i.arrow` | 矢 | 矢 | Consumable, Lower `max_stack` than default (e.g., x20 instead of x99), `elemental_offense_attribute` |

- *note:* item might have multiple bonus. sword may have `party.d.HP` but subtle value.
- (Temporary test purpose) Make 5 itmes for each item type. 

#### 2.4.2 Item stacking
- Items are stacked based on their unique combination of (superRare title, enhancement title, and base item ID). The default `max_stack` is 99, except for `i.arrow`.
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

- **State definitions**

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
  }
  "ロングソード": {
    "count": 0,
    "state": "notown"
  }
}
```

#### 2.4.3 Consumption of arrow
- Arrow Stacks. 
- Multiple items of the exact same Arrow ID (superRare, enhancement, and base item) can occupy one single quiver slot.
- Consumption: Current_Quantity -= ranged_NoA per attack.
- Persistence: Quantity does not reset between rooms. Player has to purchase or refill them at HOME.

## 3. INITIALIZATION 

### 3.1 Randomness initialization
- **Reward:** Populate `g.reward_bag` with 1 winning ticket (1) and 9 losing tickets (0).
- **Enhancement:** Populate `g.enhancement_bag` with tickets according to the enhancement table.
- **Super Rare:** Populate `g.superRare_bag` with tickets according to the superRare table.

- **Threat weight:** 
  - Populate `g.physical_threat_weight_bag` with tickets: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2,2,2, 3,3,3,3, 4,4, 5, 6]. 
  - Populate `g.magical_threat_weight_bag` with tickets: [1,2,3,4,5.6]. 

- If a bag is empty or explicitly reset the bag, initialize it.

### 3.3 Character initialization
- Experience and level are party-wide. Characters do not have individual levels; all level-based effects reference Party level.
- max_level: 29. (current version restriction)

- Equipment slots for individual character
	-`maximum_equipped_item`= base slots + class_bonuses (`c.equip_slot+1`, `c.equip_slot+2` )
  	- Where class_bonuses is the sum of unique values from Main and Sub class. Example: If Main Class provides `c.equip_slot+2` and Sub Class provides `c.equip_slot+1`, class_bonuses is 3. If both provide `c.equip_slot+2`, bonus_sum is 2.

|level | base slots |
|-----|-----------|
|1 |1 |
|3 |2 |
|6 |3 |
|12|4 |
|16|5 |
|20|6 |
|25|7 |


- Base status update: add (b.) modifiers. (ex. `b.vitality` = 10(from race) + `b.vitality+2` -> 12

- c.multiplier like `c.sword_x1.3` applies only for sword item type. other item types like amulet may have +10 melee_attack bonus, but amulet's melee_attack bonus is not multiplied by `c.sword_x1.3` effect. 

- character.`f.attack`:
  - `d.ranged_attack`= Item Bonuses x its c.multiplier
  - `d.melee_attack`= Item Bonuses x its c.multiplier x `b.strength` / 10
  - `d.magical_attack`= Item Bonuses x its c.multiplier x `b.intelligence` / 10

- character.`f.NoA`: // NoA 0 = No Action.
  - `d.ranged_NoA` = 0 + Item Bonuses x its c.multiplier (round up) 
  - `d.magical_NoA`= 0 + `c.caster+v` bonuses // Only one single bonuses of the same name applies. 
  - `d.melee_NoA`= 0 + `c.grit+v` bonuses + Item Bonuses x its c.multiplier (round up) //no NoA, no melee combat.
    - IF the character has `a.iaigiri`, halve these number of attacks, round up. 

- character.`f.offense_amplifier` (phase: )
  - If phase is LONG,  return: `d.attack_potency`.
  - If phase is MID, return: 1.0 (Fixed value)
  - If phase is CLOSE,
    - If character.`a.iaigiri`, return  `d.attack_potency` x 2.0.
    - Else, return `d.attack_potency`.

- character.`f.elemental_offense_attribute`
  - Default is 1. If the damage type has `elemental_offense_attribute`, multiply x V. (ex. fire arrow has `e.fire` and its value is 1.2, multiply 1.2 )
 
- character.`f.penet_multiplier`
  -If character.`c.penet`, add them. (ex. `c.penet_x0.1` & `c.penet_x0.15` -> 0.25)

- character .`f.defense` (phase: phase):
  - If phase is LONG or CLOSE:
  	- `d.physical_defense`: Item Bonuses of Physical defense x its c.multiplier x `b.vitality` / 10
  - If phase is MID:
  	- `d.magical_defense`: Item Bonuses of Magical defense x its c.multiplier x `b.mind` / 10

 
### 3.4 Party initialization
- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 
- Party.`d.HP`: 100 + (Total sum of individual ((Item Bonuses of HP x its c.multiplier + level x `b.vitality` ) x (`b.vitality`  + `b.mind`) / 20))

- party.`f.party.offense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
	- If party.`a.command`1, multiply x1.3
    - If party.`a.command`2, multiply x1.6
- party.`f.abilities_defense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
	- If party.`a.defender`1, multiply x2/3
  	- If party.`a.defender`2, multiply x3/5
  - If phase is MID:
    - If party.`a.m-barrier`1, multiply x2/3
    - If party.`a.m-barrier`2, multiply x3/5

- party.`f.elemental_resistance_attribute`:
  	- Always set 1. (not for this version)

## 4. HOME

- Manage party setting. character build (can also change its class, race, predisposition, lineage!). change their equipment.
- set the destination of dungeon.
- sell items and gain gold.
- buy items like arrows with gold.

### 4.2 Equipment

- Each character has its own equipment slots.
- Assigns items to a character from inventory. 

## 5. EXPEDITION 

- Persistence through an expedition:'party.d.HP', remaining of arrows.

### 5.1 Logs
- `f.quick_summary`:
  - `p.outcome_of_expedition`: 勝利/敗北/引分
  - `p.remaining_HP`: remaining party HP/ max party HP : `340/ 1000`
  - `p.reached_room` / `p.number_of_rooms` : 4/6
  - `p.gained_experience`: ex. +234
  - `p.auto-sell_profit`: Amount of Auto-sell items. ex. 1,224G
  - `p.retrieving_trophies`: Shows items by comma-separated.

```
前回の探検結果: `p.dungeon_name`    `p.outcome_of_expedition`
▼
残HP: `p.remaining_HP` | `p.reached_room` / `p.number_of_rooms` 部屋 | EXP: `p.gained_experience` | 自動売却額: `p.auto-sell_profit`
獲得アイテム: `p.retrieving_trophies`
```

- `f.list_of_rooms`
  - **Display Order:** Descending order (Boss room at the top, then Room N... down to Room 1). 
  - Line 1:
    - X (Displays number of room. If it is the last room, displays BOSS.)
	- `p.enemy_name`: Name of enemy.
	- `p.enemy_HP`: Shows enemy's `d.HP` (max HP)
	- `p.remaining_HP_of_room`: Party HP and percentage. like: 430(59%)
    - `p.outcome_of_room`: Victory/Defeat/Draw/No Visit -> 勝利/敗北/引分/未到達
　- Line 2:
  	- `p.enemy_attack_values`: Using `f.attack` for each range.  ex. 300/0/340    
	- `p.total_damage_dealt`: Shows total damage dealt
	- `p.total_damage_taken`: Shows total damage taken
	- `p.reward_from_room`: Shows item.

```
X: `p.enemy_name` | 敵HP:`p.enemy_HP` | 残HP:`p.remaining_HP_of_room`| `p.outcome_of_room` |  ▼
敵攻撃: `p.enemy_attack_values` | 与ダメ: `p.total_damage_dealt` | 被ダメ: `p.total_damage_taken`  | 獲得: `p.reward_from_room`. 
```

- `f.battle_logs`
  - icon: 
  - `elemental_offense_attribute` -> `e.fire`:🔥, `e.thunder`:⚡, `e.ice`:❄️
  - If there is no elemental attribute (`e.none`), LONG phase:🏹, MID phase:🪄 ,CLOSE phase:⚔

```
戦闘ログ:
[距離] 敵が　対象　に行動名(N回)！ (icon 数値 in dark orange)
[距離] 味方: 行動主 の行動名(N回)！ (icon 数値　in Blue)

[遠] 味方: ミミ の攻撃(4回)！(🏹 120)
[魔] 味方: セルヴァ の攻撃(2回)！(🪄 100)
[近] 敵: 森の女王 が　キツネ丸 に攻撃(2回)！ (⚔ 36)
[近] 敵: 森の女王 が　ミミ に攻撃(1回)！ (⚔ 20)
[近] 味方: キツネ丸 のカウンター(8回)！ (⚔ 367)
```

## 6. BATTLE

### 6.1 Encounter Rules
- Each encounter consists of one battle

### 6.2 Function of battle

**Battle Phase**

|Phase |Damage type |number of attacks|Defense type|
|-----|-----------|-----------|-----------|
|LONG |`d.ranged_attack` |`d.ranged_NoA` | `d.physical_defense` |
|MID |`d.magical_attack` |`d.magical_NoA` | `d.magical_defense` |
|CLOSE |`d.melee_attack` |`d.melee_NoA` | `d.physical_defense` |

- After the CLOSE phase, the battle is over. Party needs to beat enemy within these three phases.

**functions of attack**
- `f.damage_calculation`: (actor: , opponent: , phase: )
	max(1, (actor.`f.attack` - opponent.`f.defense` x (1 - actor.`f.penet_multiplier`) ) x actor.`f.offense_amplifier` x actor.`f.elemental_offense_attribute` x opponent.`f.elemental_resistance_attribute` x party.`f.party.offense_amplifier`)

  - note: If actor: enemy, party.`f.party.offense_amplifier` = 1.0

**Row-based modifier** 
- Targeting selects a character only to determine defense, row potency, abilities (counter). All damage resolved against a character is applied to `party.d.HP`.
  - The threat weight table defines how many tickets of each row index are placed into `g.threat_weight_bag`.

|row | Physical Threat weight |
|---|---|
|1|16|
|2|8|
|3|4|
|4|2|
|5|1|
|6|1|

|row | Magical Threat weight |
|---|---|
|1|1|
|2|1|
|3|1|
|4|1|
|5|1|
|6|1|


- `g.physical_threat_weight_bag` and `g.magical_threat_weight_bag`  Threat Weight (Passive Targeting) 
  - A numerical value assigned to a unit based on their row position that determines the size of their "slice" in the enemy's targeting pool.

- `f.targeting`:
  - If phase is LONG or CLOSE, Gets one ticket from `g.physical_threat_weight_bag`.
  - If phase is MID, Gets one ticket from `g.magical_threat_weight_bag`. 
    - Bag contains numbers [1,2,3,4,5,6]
    - The drawn number corresponds to row index (1–6).
    - The character currently occupying that row is selected as the target.
  

- `d.attack_potency` (Offensive Multiplier)
  - A global damage modifier applied to a unit’s final output based on their current row position.
  - Row-based modifiers apply only to player characters. Enemies are treated as having fixed potency (1.0).
  - Row-based `d.attack_potency` is applied only during LONG and CLOSE phases.
  - MID phase ignores row-based attack potency, so has fixed potency (1.0).

|row | `d.attack_potency` |
|---|---|
|1| 1.00 |
|2| 0.85 |
|3| 0.72 |
|4| 0.61 |
|5| 0.52 |
|6| 0.44 |


### 6.3 Turn resolution 
- For each phase, actions are resolved in the following order:
    - Enemy attacks
    - Player party attacks


**First strike**
- IF character.`a.first-strike`, the character acts before enemy action. (using `f.damage_calculation`)

**Enemy action**
- Enemy always moves first.
- get `f.targeting` `f.NoA` times -> target character 
- Current party.`d.HP` -= `f.damage_calculation` (actor: enemy , opponent: character, phase: phase )
- If currenr party.`d.HP` =< 0, Defeat. 

- **Counter:** IF character.`a.counter` and take damage in CLOSE phase, the character attacks to enemy. (using `f.damage_calculation`)
    - Counter triggers immediately after damage resolution, regardless of turn order modifiers.

**Player action**
- Each party member act if he has corresponding damage source in the phase. 

- If it is LONG phase and going to use arrow:
  - Check: Is Quiver_Total_Qty >= Archer_A.ranged_NoA?
  - Execution: * Subtract ranged_NoA from the Quiver (following Slot 1 -> Slot 2 order).
    - If quantity < ranged_NoA, the character attacks with a reduced NoA equal to the remaining quantity.

- Current enemy.`d.HP` -= `f.damage_calculation` (actor: character, opponent: enemy, phase: phase ) x `f.NoA`
- If enemy.`d.HP` =< 0, Victory.

- **Re-attack:** IF character.`a.re-attack`, the character attacks to enemy.  (using `f.damage_calculation`)

### 6.4 Post battle

-`a.hunter` Retrieve v% of the arrows which the character consumed in the battle. 


### 6.5 Outcome 

**Resolution**
- Defeat (Player loses)
    - If party.`d.HP` <= 0
	- This overrides all other outcomes
	- Even if enemy.`d.HP` is also <= 0
- Victory
	- If enemy.`d.HP` <= 0 and party.`d.HP` > 0
- Draw
	- If enemy.`d.HP` > 0 and party.`d.HP` > 0

**Consequence**
- *Defeat*: no penalties (current version). no experience points nor item reward. Back to home without trophies. 
- *Victory*: gains experience points to a party. has a chance of gaining reward from enemies drop item. Proceeds to the next room. If it was the Boss room, back to home with trophies!
- *Draw*:no penalties (current version). no experience points nor item reward at this room. Back to home with trophies of previous rooms.

- **Item Retrieval Logic:**
  - Items are stacked by (superRare, enhancement, and base item) and has state
  - *State:`s.sold` Auto-Sell:* If a dropped item matches a rule with state:`s.sold`, it is sold immediately (not added to inventory, gain Gold)
  - *State:`s.owned` Existing Items:* If the item is already in the inventory, increment the item count
  - *State:(no record) New Items:* If no record for the item exists, the system generates the item and sets it to state:`s.owned`

## 7. REWARD 

- Gets one ticket from `g.reward_bag`. Two with `c.unlock`.
  - If it is '1', then get one ticket from each of `g.enhancement_bag`, and `g.superRare_bag`.
    
  - Combines them into one item.
    (ex.
    
     enhancement:1, superRare:0 -> 名工のロングソード
     enhancement:3, superRare:1 -> 世界を征する宿ったロングソード)


## 8. UI

- Platform: Web-based (React + TypeScript + Tailwind)
  - Style: Compact, simple, iOS-like
  - Navigation: Minimal scene transitions, tab-centered
- Interaction philosophy:
  - Fast feedback
  - No modal spam
  - Most actions resolve immediately
  
### 8.1 Color Scheme
- Base colors
  - Text: Black
  - Pane / card background: Gray
  - Page background: White
- Sub color (~30%)
  - Blue (information, selection, links)
- Accent color (~5%)
  - Dark Orange (important actions, warnings, highlights)


### 8.2 Header
- Always fixed at the top.
- Displays:
  - Game title + version + build number
  - Example: ケモの冒険 v0.0.8 (2)
  - Use this specification's version
  - increment the build number each time you edited the code. 
- Party info (simplified):
  - Party status summary
  - Arrow count (icon + number)
- Tab header (primary navigation):
  - Party
  - Expedition
  - Inventory
  - Shop
  - Setting

- Header is always visible; tabs never cause full page reload.

### 8.3 Tabs

#### 8.3.1 Party
##### 8.3.1.1 Displays
  - List of party members
    	For each character: Icon, name, main Class (Sub calass).
```
🐶
レオン
戦士(剣士)
```

  - Current status, abilities, bonuses

##### 8.3.1.2 Party member details
  - Name, race, main class (sub class), predisposition, lineage, status, bonuses (c., aggregated), ability (a. )
  - Status:
    - `f.display_ranged_offense` = If `d.ranged_attack` or `d.ranged_NoA` > 0, displays 遠距離攻撃:`d.ranged_attack` x `d.ranged_NoA`回(x`f.offense_amplifier`(phase: LONG)). Else (none).
    - `f.display_magical_offense` = If `d.magical_attack` or `d.magical_NoA` > 0, displays 魔法攻撃:`d.magical_attack` x `d.magical_NoA`回(x`f.offense_amplifier`(phase: MID)). Else (none).
    - `f.display_melee_offense` = If `d.melee_attack` or `d.melee_NoA` > 0, displays 近接攻撃:`d.melee_attack` x `d.melee_NoA`回(x`f.offense_amplifier`(phase: CLOSE)). Else (none).	
```
Name      [編集]
🐶 ケイナイアン / 戦士(剣士) / 頑強 / 不動の家
[体力:`b.vitality`] [力:`b.strength`] [知性:`b.intelligence`] [精神:`b.mind`]
`f.display_ranged_offense`    属性攻撃:`f.elemental_offense_attribute`.name (x `f.elemental_offense_attribute`.value )
`f.display_magical_offense`      魔法防御:`d.magical_defense`
`f.display_melee_offense`     物理防御:`d.physical_defense`
ボーナス: `c.` (ex. 護符x1.3, 弓x1.1 鎧x2.4, 剣x1.4, 根性+1, 装備+1, 体+3)
特殊能力:
`a.` (ex. 守護者: パーティへの物理ダメージ × 3/5 )
```
  - Editable parameters

##### 8.3.1.3 Character Edit Mode (selected member):
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

##### 8.3.1.4 Equipment management
**1. Interaction Rules:**
  - **Auto-Equip:** - If there is an empty slot and the player taps an item in the inventory, that item is automatically equipped to the first available slot.
  - **Replace (Single-Tap):** - Tapping an item already in a Character Slot "selects" it. Tapping an item in the inventory while a slot is selected replaces the current item with the new one.
  - **Remove (Double-Tap):** - Double-tapping an item in a Character Slot removes it and returns it to the inventory.
  - Status updates in real time

**2. Inventory Pane:**
  - Always visible on the same screen at the bottom.
  - Stacked by item variant
  - Inventory includes item category tabs:
    - 剣,刀,弓,鎧,手,杖,衣,護,矢.
    - Default: 剣
    - Items in inventory matching the selected category are shown (filter)
    - Adds equipped items with icon in the list.

**3. Inventory Sort Logic (within category):**
- Order: Descending order by Priority.
- Priority:
  1. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
  2. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
  3. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.
- Item Row: The name, count, and status are left-aligned on **the same line**.
	- ex. 名工のロングソード x3 | 近攻+19
- Inventory pane shows at least 10 items
- Equipped item: The name and status are left-aligned, item type is right-aligned on **the same line**.

**4. Image of inventory pane transaction at equipment management**

```
宿ったロングソード x2 |近攻+31
伝説のショートソード　x2 |近攻+22
名工のショートソード x4 |近攻+10
```

↓(Taps "名工のショートソード" to equip it)

```
宿ったロングソード x2 |近攻+31
伝説のショートソード　x2 |近攻+22
🐶名工のショートソード x1 |近攻+10
名工のショートソード x3 |近攻+10
```

↓(Taps "🐶名工のショートソード" to unequip it)

```
宿ったロングソード x2 |近攻+31
伝説のショートソード　x2 |近攻+22
名工のショートソード x4 |近攻+10
```

↓(Taps "伝説のショートソード" to equip it)

```
宿ったロングソード x2 |近攻+31
🐶伝説のショートソード　x1 |近攻+22
伝説のショートソード　x1 |近攻+22
名工のショートソード x4 |近攻+10
```

↓(Taps "伝説のショートソード" again to equip it)

```
宿ったロングソード x2 |近攻+31
🐶伝説のショートソード　x2 |近攻+22
名工のショートソード x4 |近攻+10
```

↓(Taps "🐶伝説のショートソード" to unequip it)

```
宿ったロングソード x2 |近攻+31
🐶伝説のショートソード　x1 |近攻+22
伝説のショートソード　x1 |近攻+22
名工のショートソード x4 |近攻+10
```   

#### 8.3.2 Expedition
- Top section:
  - Currently selected dungeon
  - Expedition behavior:
    - Expedition resolves immediately
    - No loading scenes
- Middle section:
  - Show latest `f.quick_summary`.
    - Tapping the quick summary shows a `f.list_of_rooms`.
    - Tapping a room opens the `f.battle_logs`.
- Bottom section:
  - List of available dungeons

#### 8.3.3 Inventory
- Behavior:
  - Notification pops up when acquiring a new item
  - Newly acquired items are shown in bold
  - Once displayed, text returns to normal
- Item list:
  - Stacked by item variant
  - Shows state:`s.owned` items
  - Inventory includes item category tabs:
    - 矢,剣,刀,弓,鎧,手,杖,衣,護. 
    - Default: 矢
    - Only items matching the selected category are shown (filter)
  - **Inventory Sort Logic (within category):**
	- **Order:** Descending order by Priority.
	- **Priority:**
	   1. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
	   2. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
	   3. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.
  - Item Row: The name, count, and status are left-aligned, while the sell all button is right-aligned on the same line 
    - ex. 名工のロングソード x3 | 近攻+19     [全売却 39G]
  - Sell all button(全売却): Sells all item, and Changes item state from `s.owned` to `s.sold`
  - Inventory pane shows at least 10 items
- Actions:
  - Sell item stacks
  - Sold items disappear immediately

- **Auto-sold list** (Collapsed by default; tap to expand)
  - Sort and filter settings also apply to this list (displaying items with the state:`s.sold`)
  - Item Row: The name, count, and status are left-aligned, while the Unlock button is right-aligned on the same line
    - ex. 名工のロングソード x3 | 近攻+19     [解除]
  - Unlock button(解除): Changes item state from `s.sold` to `s.notown`


#### 8.3.4 Shop
- Only tabs. not opended. (in this version)
  
#### 8.3.5 Setting
- Debug section: Displays belows 
  - reward_bag:  
    - 報酬抽選: remaining / total counts 
    - 当たり残り counts
  -	enhancement_bag: 
    - 通常称号抽選: remaining / total counts
    - 宿った残り counts
    - 伝説の残り counts
    - 恐ろしい残り counts
    - 究極の残り counts
  - superRare_bag:
    - 超レア称号抽選: remaining / total counts
    - 超レア残り counts

- Reset:
  - Full reset option
  - Warning required before execution
    
**END OF SPECIFICATION**
