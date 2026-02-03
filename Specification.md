# KEMO EXPEDITION v0.0.5 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- no randomness in battle.
- Tetris like randomness for enemies spawns, reward items. (a bag contians all potential rewards. 

### 1.1 World setting
- The world is fragmented into unexplored regions filled with ancient creatures and forgotten relics.
- Each expedition is guided by a single deity, who manifests power through a chosen party to restore balance and reclaim lost knowledge. 

## 2. CONSTANTS & DATA

**Naming Rule**

|prefixes | means|
|-----|---------|
|`a.` | **a**bility |
|`b.` | **b**ase status |
|`c.` | **c**lass bonus |
|`d.` | **d**uel status |
|`e.` | **e**lemental attack attribute |
|`i.` | **i**tem category |
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
  - `elemental_attack_attribute` : `e.none`, `e.fire`, `e.thunder`, `e.ice` // Offensive
  - `elemental_resistance_attribute` : `r.none`, `r.fire`, `r.thunder`, `r.ice` // Defensive


### 2.2 Play characters
- The deity creates character and assigns 6 Characters to its party. The characters can change its race, role and name at will. 

const CHARACTER_SCHEMA = ['id', 'race', 'main_class', 'sub_class' , 'predisposition', 'lineage' , 'name', 'b.vitality', 'b.strength', 'b.intelligence', 'b.mind' , 'ranged_attack', 'magical_attack', 'melee_attack', 'ranged_NoA', 'magical_NoA', 'melee_NoA', 'maximum_equipped_item' ]

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
- Only one single bonuses(c.) of the same name applies. (two `c.equip_slot+2`, but only one `c.equip_slot+2` works)


#### 2.2.2 Party structure 

1. Party Properties
- Player party consists of up to 6 characters
- All characters participate simultaneously
- Party has its:
    - Party HP
    - `d.X_defense`
	    - `d.physical_defense`
	    - `d.magical_defense`
  	- `elemental_resistance_attribute` // 1.0 as default. 0.5 is strong, 2.0 is weak
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
  	- `d.X_attack`, `d.X_NoA`
		- `d.ranged_attack`, `d.ranged_NoA`
	    - `d.magical_attack`, `d.magical_NoA`
	    - `d.melee_attack`, `d.melee_NoA`
    - `elemental_attack_attribute`  // 1.0 as default. 0.5 is weak, 2.0 is strong
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
- hp
- `d.X_attack`, `d.X_NoA`
	- `d.ranged_attack`, `d.ranged_NoA`
	- `d.magical_attack`, `d.magical_NoA`
	- `d.melee_attack`, `d.melee_NoA`- ranged_attack
- `d.ranged_attack_amplifier` // 1.0 as default 
- `d.magical_attack_amplifier` // 1.0 as default 
- `d.melee_attack_amplifier` // 1.0 as default 
- `d.X_defense`
	- `d.physical_defense`
	- `d.magical_defense`
- `elemental_attack_attribute`  // 1.0 as default. 0.5 is weak, 2.0 is strong
	- Has only one type of `none`, `e.fire`, `e.ice`, or `e.thunder`
- `elemental_resistance_attribute` // 1.0 as default. 0.5 is strong, 2.0 is weak
	- `r.fire`
	- `r.ice`
	- `r.thunder`
- experience // Enemy experience is added directly to party experience.
- drop_item

- (Temporary test purpose) make 5 dungeons and 5 enemies per dungeon. 

### 2.4 Items

**Item Category**

|category | name | core concept |
|-----|----|-----------|
|`i.sword` | 剣 | + `melee_attack` |
|`i.katana` | 刀 | + `melee_attack`, - `melee_NoA` |
|`i.archery` | 弓 | + `ranged_attack`, + `ranged_NoA` |
|`i.armor` | 鎧 | + `Party_physical_defense` |
|`i.gauntlet` | 籠手 | + `melee_NoA` |
|`i.wand` | ワンド | + `magical_attack` |
|`i.robe` | 法衣 | + `Party_magical_defense` |
|`i.amulet` | 護符 | + `Party_HP` |
|`i.arrow` | 矢 | Consumable, Stackable. Has `max_stack`, `elemental_attribute` |

- *note:* item might have multiple bonus. sword may have `Party_HP` but subtle value.
- (Temporary test purspose) Make 5 itmes for each item type. 

**consumption of arrows**
- Arrow Stacks: * `i.arrow` items have a quantity property.
- Multiple items of the exact same Arrow ID can occupy one single equipment slot.
- Consumption: Current_Quantity -= ranged_NoA per attack.
- Persistence: Quantity does not reset between rooms. It only resets at HOME.

## 3. INITIALIZATION 

### 3.1 Randomness initialization
- **Reward:** Put 1 win ticket(1) and 99 lose tickets(0) into 'reward_bag'. 
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

- Attack damage:
  - `d.ranged_attack`: Item Bonuses x its c.multiplier
  - `d.melee_attack`: Item Bonuses x its c.multiplier x `b.strength` / 10
  - `d.magical_attack`: Item Bonuses x its c.multiplier x `b.intelligence` / 10

- Number of attacks:
  - `d.ranged_NoA`: 0 + Item Bonuses x its c.multiplier (round up) 
  - `d.magical_NoA`: 0 + `c.caster+v` bonuses // Only one single bonuses of the same name applies. 
  - `d.melee_NoA`: 0 + `c.grit+v` bonuses + Item Bonuses x its c.multiplier (round up) //no NoA, no melee combat.
 
  - IF the character has `a.iaigiri`, halve these number of attacks, round up. 
 
### 3.4 Party initialization

- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 
- Party HP: 950 + (level x 50) + (Total sum of individual (Item Bonuses of HP x its c.multiplier x (`b.vitality`  + `b.mind`) / 20))
- Party defense:
  - `d.physical_defense`: (Total sum of individual (Item Bonuses of Physical defense x its c.multiplier x `b.vitality` / 10))
  - `d.magical_defense`: (Total sum of individual (Item Bonuses of Magical defense x its c.multiplier x `b.mind` / 10))


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
|LONG |Ranged attack |Ranged NoA|Physical defense |
|MID |Magical attack |Magical NoA|Magical defense|
|CLOSE |Melee attack |Melee NoA|Physical defense |

- After the CLOSE phase, the battle is over. Party needs to beat enemy within these three phases.

**First strike**
- IF a character has `a.first-strike`, acts before enemy action. (see Player action)

**Enemy action**
- Enemy always moves first.

- Damage: max(1 ,(enemy.`d.X_attack` -party.`d.X_defense`)) x Enemy's damage amplifier x enemy.`elemental_attack_attribute` x party.`elemental_resistance_attribute` x Party abilities amplifier  x number of attacks
    - following matched ranged type.
    - elemental multiplier: Default is 1. If the damage type has `elemental_attack_attribute`, multiplier them. (ex. Enemy attack is `e.fire`, then applies enemy's `r.fire` value. )
- Current Party HP -= Calculated damage
- If currenr party HP =< 0, Defeat. 

- **Counter:** IF character has `a.counter` ability and take damage in CLOSE phase. The character attacks to enemy.
    - Counter triggers immediately after damage resolution, regardless of turn order modifiers.

**Player action**
- Each party menber act if he has corresponding damage source in the phase. 

- If it is LONG phase and going to use arrow:
  - Check: Is Quiver_Total_Qty >= Archer_A.ranged_NoA?
  - Execution: * Subtract ranged_NoA from the Quiver (following Slot 1 -> Slot 6 order).
    - If quantity < ranged_NoA, the character attacks with a reduced NoA equal to the remaining quantity.


- Calculated damage: max(1, (Attack damage - Enemy defense x (1 - sum of (penet multiplier)) ))  x Individual abilities amplifier x character.`elemental_attack_attribute` x enemy.`elemental_resistance_attribute` x Party abilities amplifier
  - Individual abilities:`a.iaigiri`
  - Party abilities: `a.leading`
  - penet multiplier: like `c.penet_x0.1` & `c.penet_x0.15` -> 0.25
  - following matched ranged type. 
  - elemental multiplier: Default is 1. If the damage type has `elemental_attack_attribute`, multiplier them. (ex. fire arrow has `e.fire`, then applies enemy's `r.fire` value. )
- Current enemy HP -= Calculated damage
- If enemy HP =< 0, Victory.
  - Party damage reduction abilities apply after defense subtraction.

- **Re-attack:** IF character has `a.re-attack` ability. The character attacks to enemy.

### 6.4 Post battle

-`a.hunter` Retrieve v% of the arrows which the character consumed in the battle. 


### 6.5 Outcome 

**Resolution**
- Defeat (Player loses)
    - If Party_HP <= 0
	- This overrides all other outcomes
	- Even if Enemy HP is also <= 0
- Victory
	- If Enemy_HP <= 0 and Party_HP > 0
- Draw
	- If Enemy_HP > 0 and Party_HP > 0

**Consequence**
- Defeat: no penalties (current version). no experience points nor item reward. Back to home.
- Victory: gains experience points to a party. has a chance of gaining reward from enemies drop item. Proceeds to the next room. If it was the last room of dungeon, back to home with trophies!
- Draw:no penalties (current version). no experience points nor item reward. Proceeds to the next room.

## 7. REWARD 

- Gets one ticket from 'reward_bag'. Two with `c.unlock`.
  - If it is '1', then get one ticket from each of 'enhancement_bag', and 'superRare_bag'.
    
  - Combines them into one item.
    (ex.
    
     enhancement:1, superRare:0 -> 名工のロングソード
     enhancement:3, superRare:1 -> 世界を征する宿ったロングソード)


## 8. UI


**END OF SPECIFICATION**
