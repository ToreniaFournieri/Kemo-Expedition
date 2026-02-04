# KEMO EXPEDITION v0.0.9 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- no randomness in battle.
- Tetris like randomness for enemies spawns, reward items. (a bag contians all potential rewards. 
- data persistence 

### 1.1 World setting
- The world is fragmented into unexplored regions filled with ancient creatures and forgotten relics.
- Each expedition is guided by a single deity, who manifests power through a chosen party to restore balance and reclaim lost knowledge. 

## 2. CONSTANTS & DATA

**Naming Rule**

|prefixes | means|
|-----|---------|
|`a.` | **a**bility |
|`b.` | **b**ase status |
|`c.` | **c**lass and other bonus |
|`d.` | **d**uel status |
|`e.` | **e**lemental_offense_attribute |
|`f.` | **f**unction of logic |
|`i.` | **i**tem category |
|`p.` | ex**p**edition |
|`r.` | elemental_**r**esistance_attribute |


### 2.1 Global constants
- One deity represents on one party. The deity has its own level, HP, and unique divine abilities. 
const PARTY_SCHEMA = ['number', 'deity', 'level', 'experience', 'Party_HP', 'Party_physical_defense', 'Party_magical_defense' , 'quiver_slots' ]

- Initial deity: 'God of Restoration' // Revives character at the base automatically, no death penalty 

- **Bag Randomization** It has 'reward_bag', 'enhancement_bag', 'superRare_bag' witch controls reward randomness and contains tickets. (0:lose ticket, 1:win ticket)

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
- The deity creates character and assigns 6 Characters to its party. The characters can change its race, role and name at will. 

const CHARACTER_SCHEMA = ['id', 'race', 'main_class', 'sub_class' , 'predisposition', 'lineage' , 'name', 'b.vitality', 'b.strength', 'b.intelligence', 'b.mind' , 'd.ranged_attack', 'd.magical_attack', 'd.melee_attack', 'd.ranged_NoA', 'd.magical_NoA', 'd.melee_NoA', 'maximum_equipped_item' ]

- id: int
- main_class
- sub_class
- name: string
- b.vitality 
- b.strength 
- b.intelligence 
- b.mind
- d.ranged_attack
- d.magical_attack
- d.melee_attack
- d.ranged_NoA
- d.magical_NoA
- d.melee_NoA
- maximum_equipped_item:

*Note:*
- Individual character has no level, hp, nor defensive parameters
- NoA: number of attacks

#### 2.2.1 Character 

-A character is defined by Race, Class and Predisposition
    - Race defines base status
	- Class defines combat behavior modifiers and equipment bonuses
	- Predisposition defines additional modifiers
	- Characters have no individual HP
	- All defensive effects ultimately modify party-wide parameters

**Base Status Parameters**
- Each character has the following base status values: 
    - `b.vitality`: 体, 体力. contributes to Party HP
    - `b.strength`: 力. contributes to physical attack
    - `b.intelligence`: 知, 知性. contributes to magical attack
    - `b.mind`: 精, 精神. contributes to magical resistance effects (not used in this version)

- Base status values are summed across the party and converted into party-wide or individual values according to system rules.

- **races(種族):**

|races | bonus | 体,力,知,精 | memo |
|-----|-------|-----------|------|
|ケイナイアン(Caninian) | `c.amulet_x1.3`, `c.archery_x1.1` |10,10,10,10| 🐶Dog |
|ルピニアン(Lupinian) | `c.equip_slot+1`, `c.katana_x1.3`  |9,12,8,7| 🐺Wolf |
|ヴァルピニアン(Vulpinian) |`c.equip_slot+1`, `c.sword_x1.3` |10,10,12,8| 🦊Fox |
|ウルサン(Ursan) |`c.equip_slot+2` |13,12,5,7| 🐻Bear |
|フェリディアン(Felidian) |`c.robe_x1.3`, `a.first-strike`1: Acts faster than enemy at CLOSE phase |9,9,10,12| 😺Cat |
|マステリド(Mustelid) | `c.gauntlet_x1.3`, `a.hunter`1: Retrieve 20% of the arrows at the end of battle |10,10,9,11| 🦡Ferret |
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
|君主(Lord) |`c.gauntlet_x1.4`, `c.equip_slot+1` |`a.leading`1: Physical damage x1.3 |`a.leading`2: Physical damage x1.6 | 
|狩人(Ranger) |`c.archery_x1.4` | `a.hunter`2: Retrieve 30% of the arrows at the end of battle  |`a.hunter`3: Retrieve 36% of the arrows at the end of battle | 
|魔法使い(Wizard) |`c.wand_x1.4` | `c.caster+2` | `c.caster+3` | 
|賢者(Sage) |`c.robe_x1.4`, `c.equip_slot+2` |`c.caster+1`. `a.m-barrier`1: Incoming magical damage to party × 2/3 | `c.caster+1`. `a.m-barrier`2: Incoming magical damage to party × 3/5 | 
|盗賊(Rogue) |`c.unlock` additional reward chance |`a.first-strike`1: Acts faster than enemy at CLOSE phase |`a.first-strike`2: Acts faster than enemy at All phases | 
|巡礼者(Pilgrim) |`c.amulet_x1.4`, `c.equip_slot+1` |`a.null-counter`: Negate counter attack |`a.null-counter`: Negate counter attack | 

- If `main_class` and  `sub_class` are same class, then it turns into master class, applies master bonus.
- `main_class` applies main/sub bonuses and main bonus. `sub_class` applies only main/sub bonuses.
- Only the strongest single ability(a.) of the same name applies.
- Only one single bonuses(c.) of the **exact** same name applies. (`c.equip_slot+2` and `c.equip_slot+1` then +3 slots. two `c.equip_slot+2`, but only one `c.equip_slot+2` works)


#### 2.2.2 Party structure 

1. Party Properties
- Player party consists of up to 6 characters
- All characters participate simultaneously
- Party has its:
    - Party `d.HP`
    - Party `f.defense`
	    - `d.physical_defense`
	    - `d.magical_defense`
  	- `f.elemental_resistance_attribute` // 1.0 as default. 0.5 is strong, 2.0 is weak
		- `r.fire`
		- `r.ice`
		- `r.thunder`
    - quiver slots
 
- **Quariver system**
  - Definition: A shared party resource that houses all `i.arrow` items.
  - Quiver Slots: The party has **Two** slots specifically for arrow types.
  - Stacking: Each arrow type has a `max_stack` property. Multiple stacks of the same arrow ID can occupy different quiver slots.

2. Character Properties
- Each character has:
  	- `f.attack`, `f.NoA`
		- `d.ranged_attack`, `d.ranged_NoA`
	    - `d.magical_attack`, `d.magical_NoA`
	    - `d.melee_attack`, `d.melee_NoA`
    - `f.elemental_offense_attribute`  // 1.0 as default. 0.5 is weak, 2.0 is strong
		- Has only one type of `none`, `e.fire`, `e.ice`, or `e.thunder`
      		- Priority: `e.thunder` > `e.ice` > `e.fire` > `none` (if it has multiple attribute)
		- Equipment slots

- Characters do not have individual HP.
    - but each character contrivutes total HP, physical defense and magical defense. 

### 2.3 Dungeons & Enemies

- Each dungeon has multiple rooms. each room has one enemy. At the end of room, formidable boss enemy is waiting for victims.

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
	- `d.melee_attack`, `d.melee_NoA`- ranged_attack
- `f.attack_amplifier` 
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
|`i.sword` | 剣 | 剣 | + `melee_attack` |
|`i.katana` | 刀 | 刀 | + `melee_attack`, - `melee_NoA` |
|`i.archery` | 弓 | 弓 | + `ranged_attack`, + `ranged_NoA` |
|`i.armor` | 鎧 | 鎧 | + `Party_physical_defense` |
|`i.gauntlet` | 籠手 | 手 | + `melee_NoA` |
|`i.wand` | ワンド | 杖 | + `magical_attack` |
|`i.robe` | 法衣 | 衣 | + `Party_magical_defense` |
|`i.amulet` | 護符 | 護 | + `Party_HP` |
|`i.arrow` | 矢 | 矢 | Consumable, Stackable. Has `max_stack`, `elemental_attribute` |

- *note:* item might have multiple bonus. sword may have `Party_HP` but subtle value.
- (Temporary test purspose) Make 5 itmes for each item type. 

#### 2.4.2 Item stacking
- Items are stacked by (superRare, enhancement, and base item)
  - Inventory tracks item variants, not individual instances.
  - Inventory displays stack count per variant.
  - Selling is all-or-nothing per stack. 
  - Once a stack is sold, that item variant becomes obsolete:
    It is removed from the inventory display.
    - Any future drops of the exact same variant are automatically sold.
- **Auto-sold maintenance:**
  - The player may change an item’s status from sold to notown.
  - Sold items cannot be restored or refunded.
  - After reset, the item variant may be acquired again through normal gameplay.

- **State definitions**

| State | meaning|
|-------|---------|
|(no record) |Variant never encountered|
|owned |Item variant exists in inventory (count > 0)|
|sold |Item variant is obsolete and auto-sold on pickup|
|notown |Item variant is not owned and may drop normally|


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

  - 

#### 2.4.3 Consumption of arrow
- Arrow Stacks. 
- Multiple items of the exact same Arrow ID (superRare, enhancement, and base item) can occupy one single quiver slot.
- Consumption: Current_Quantity -= ranged_NoA per attack.
- Persistence: Quantity does not reset between rooms. Player has to purchase or refill them at HOME.

## 3. INITIALIZATION 

### 3.1 Randomness initialization
- **Reward:** Put 1 win ticket(1) and 9 lose tickets(0) into 'reward_bag'. 
- **Enhancement:** Put tickets into 'enhancement_bag'.
- **Super Rare:** Put tickets into 'superRare_bag' .

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
  - `d.ranged_attack`: Item Bonuses x its c.multiplier
  - `d.melee_attack`: Item Bonuses x its c.multiplier x `b.strength` / 10
  - `d.magical_attack`: Item Bonuses x its c.multiplier x `b.intelligence` / 10

- character.`f.NoA`: // NoA 0 = No Action.
  - `d.ranged_NoA`: 0 + Item Bonuses x its c.multiplier (round up) 
  - `d.magical_NoA`: 0 + `c.caster+v` bonuses // Only one single bonuses of the same name applies. 
  - `d.melee_NoA`: 0 + `c.grit+v` bonuses + Item Bonuses x its c.multiplier (round up) //no NoA, no melee combat.
    - IF the character has `a.iaigiri`, halve these number of attacks, round up. 

- character.`f.abilities_offense_amplifier`
  - If character.`a.iaigiri`, multiply 2.0.

- character.`f.elemental_offense_attribute`
  - Default is 1. If the damage type has `elemental_offense_attribute`, multiply x V. (ex. fire arrow has `e.fire` and its value is 1.2, multiply 1.2 )
 
- character.`f.penet_multiplier`
  -If character.`c.penet`, add them. (ex. `c.penet_x0.1` & `c.penet_x0.15` -> 0.25)

 
### 3.4 Party initialization

- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 
- Party.`d.HP`: 950 + (level x 50) + (Total sum of individual (Item Bonuses of HP x its c.multiplier x (`b.vitality`  + `b.mind`) / 20))
- Party.`f.defense` (phase: phase):
  - If phase is LONG or CLOSE:
  	- `d.physical_defense`: (Total sum of individual (Item Bonuses of Physical defense x its c.multiplier x `b.vitality` / 10))
  - If phase is MID:
  	- `d.magical_defense`: (Total sum of individual (Item Bonuses of Magical defense x its c.multiplier x `b.mind` / 10))

- party.`f.abilities_offense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
	- If party.`a.leading`1, multiply x1.3
    - If party.`a.leading`2, multiply x1.6
- party.`f.abilities_defense_amplifier`(phase: phase):
  - If phase is LONG or CLOSE:
	- If party.`a.defender`1, multiply x3/5
  	- If party.`a.defender`2, multiply x3/5
  - If phase is MID:
    - If party.`a.m-barrier`1, multiply x2/3
    - If party.`a.m-barrier`2, multiply x3/5

- party.`elemental_resistance_attribute`:
  	- Always set 1. (not for this version)

## 4. HOME

- Manage party setting. character build (can also change its class, race, predisposition, lineage!). change their equipment.
- set the destination of dungeon.
- sell items and gain gold.
- buy items like arrows with gold. ( `auto_refill` is on, done automatically)

### 4.2 Equipment

- Each character has its own equipment slots.
- Assigns items to a character from inventory. 

## 5. EXPEDITION 

- Persistence through an expedition:'Party_HP', remaining of arrows.

### 5.1 Logs
- `f.quick_summary`:
  - `p.outcome_of_expedition`: 勝利/敗北/引分
  - `p.remaining_HP`: remaining party HP/ max party HP : 340/1000
  - `p.reached_room` / `p.number_of_rooms` : 4/6
  - `p.gained _experience`: ex. +234
  - `p.retrieving_trophies`: Shows items. if party is defeated, no trophies are shown.

```
前回の探検結果: `p.dungeon_name`
▼
`p.outcome_of_expedition` | 残HP: `p.remaining_HP` | `p.reached_room` / `p.number_of_rooms` 部屋 | EXP: `p.gained _experience`
獲得アイテム: `p.retrieving_trophies`
```

- `f.list_of_rooms`
  - `p.enemy_name`: Name of enemy. if it is a Boss, add (BOSS).
  - `p.enemy_HP`: Shows enemy's `d.HP` (max HP)
  - `p.enemy_attack_values`: Shows `f.damage_calculation` for each range. (this function considers Party defense and buffs)  ex. 300/0/340
  - `p.outcome_of_room`: Victory/Defeat/Draw -> 勝利/敗北/引分
  - `p.total_damage_dealt`: Shows total damage dealt
  - `p.total_damage_taken`: Shows total damage taken
  - `p.reward_from_room`: Shows item.
  - `p.remaining_HP_of_room`: Party HP of remaining: like 430/ 1000

```
Room X: `p.enemy_name` | 敵HP:`p.enemy_HP` | `p.enemy_attack_values` |
`p.outcome_of_room` | 残HP:`p.remaining_HP_of_room`
▼
与ダメ: `p.total_damage_dealt` | 被ダメ: `p.total_damage_taken`  | 獲得: `p.reward_from_room`. 
```

- `f.battle_logs`

```
戦闘ログ:
[距離] 行動者: 対象 の 行動名！ (数値)

[近] 敵: 森の女王 の攻撃！ (36ダメージ)
[近] 味方: キツネ丸 のカウンター！ (367ダメージ)
```

## 6. BATTLE

### 6.1 Encounter Rules
- Each encounter consists of one battle

### 6.2 Initialization of battle


  
### 6.3 Turn resolution 
- For each phase, actions are resolved in the following order:
    - Enemy attacks
    - Player party attacks

|Phase |Damage type |number of attacks|Defense type|
|-----|-----------|-----------|-----------|
|LONG |`d.ranged_attack` |`d.ranged_NoA` | `d.physical_defense` |
|MID |`d.magical_attack` |`d.magical_NoA` | `d.magical_defense` |
|CLOSE |`d.melee_attack` |`d.melee_NoA` | `d.physical_defense` |

- After the CLOSE phase, the battle is over. Party needs to beat enemy within these three phases.

**functions for battle**
- `f.damage_calculation`: (actor: , opponent: , phase: )
	max(1, (actor.`f.attack` - opponent.`f.defense` x (1 - actor.`f.penet_multiplier`) ))  x actor.`f.NoA` x actor.`f.abilities_offense_amplifier` x actor.`f.elemental_offense_attribute` x opponent.`f.elemental_resistance_attribute` x actor.`f.abilities_offense_amplifier`


**First strike**
- IF character.`a.first-strike`, the character acts before enemy action. (using `f.damage_calculation`)

**Enemy action**
- Enemy always moves first.
- Current party.`d.HP` -= `f.damage_calculation` (actor: enemy , opponent: party, phase: phase )
- If currenr party.`d.HP` =< 0, Defeat. 

- **Counter:** IF character.`a.counter` and take damage in CLOSE phase, the character attacks to enemy. (using `f.damage_calculation`)
    - Counter triggers immediately after damage resolution, regardless of turn order modifiers.

**Player action**
- Each party menber act if he has corresponding damage source in the phase. 

- If it is LONG phase and going to use arrow:
  - Check: Is Quiver_Total_Qty >= Archer_A.ranged_NoA?
  - Execution: * Subtract ranged_NoA from the Quiver (following Slot 1 -> Slot 2 order).
    - If quantity < ranged_NoA, the character attacks with a reduced NoA equal to the remaining quantity.

- Current enemy.`d.HP` -= `f.damage_calculation` (actor: character, opponent: enemy, phase: phase )
- If enemy.`d.HP` =< 0, Victory.
  - Party damage reduction abilities apply after defense subtraction.

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
- *Victory*: gains experience points to a party. has a chance of gaining reward from enemies drop item. Proceeds to the next room. If it was the last room of dungeon, back to home with trophies!
- *Draw*:no penalties (current version). no experience points nor item reward at this room. Retreat to home with trophies of previous rooms.

## 7. REWARD 

- Gets one ticket from 'reward_bag'. Two with `c.unlock`.
  - If it is '1', then get one ticket from each of 'enhancement_bag', and 'superRare_bag'.
    
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
- Displays:
  - List of party members
  - Current status, abilities, bonuses
- Party member details:
  - Name, race, class, traits, bonuses
  - Editable parameters
- Edit rule:
  - Editing a character unequips all equipment
  - Equipment returns to Inventory
  - Character status updates immediately
- Equipment management:
  - Equip / remove from inventory
  - Item list:
    - Stacked by item variant
    - Inventory includes item category tabs:
      - 剣,刀,弓,鎧,手,杖,衣,護,矢.
      - Default: 剣
      - Only items matching the selected category are shown (filter)
    -	Sorting order (within category):
    	1.	Item ID
    	2.	Enhancement
    	3.	SuperRare
  	- Item: The name, count, and status are left-aligned on **the same line**."
     - ex. 名工のロングソード x3 | 近攻+19
    - Inventory pane shows at least 10 items
  - Status updates in real time

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
- Quiver management:
  - Acquire arrows
  - Refill arrows
  - Remove arrows
- Item list:
  - Stacked by item variant
  - Shows state:`owned` items
  - Inventory includes item category tabs:
    - 剣,刀,弓,鎧,手,杖,衣,護,矢.
    - Default: 剣
    - Only items matching the selected category are shown (filter)
  -	Sorting order (within category):
  	1.	Item ID
  	2.	Enhancement
  	3.	SuperRare
  - Item: The name, count, and status are left-aligned, while the sell button is right-aligned on the same line.
    - ex. 名工のロングソード x3 | 近攻+19     [全売却 39G]
  - Inventory pane shows at least 10 items
- Actions:
  - Sell item stacks
  - Sold items disappear immediately
- Auto-sold list (folded as default)
  - Sort and filter is affected in this list too. (but shows state:`sold` item)
  - Item 解除: `sold` status to `notown`


#### 8.3.4 Shop
- Purchase basic items:
  - Arrows
  - Other consumables
- Slot behavior:
  - When Slot 1 arrows are removed:
  - Slot 2 arrows automatically move to Slot 1

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
