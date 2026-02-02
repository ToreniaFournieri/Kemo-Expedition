# KEMO EXPEDITION v0.0.2 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- no randomness in battle.
- Tetris like randomness for enemies spawns, reward items. (a bag contians all potential rewards. 


## 2. CONSTANTS & DATA

### 2.1 Global constants
- One diety represents on one party. The diety has its own level, HP, and unique divine abilities. 
const PARTY_SCHEMA = ['number', 'diety', 'level', 'experience', 'Party_HP', 'Party_physical_defense', 'Party_magical_defense' ]

- Initial Diety: 'God of Restoration' // Revives character at the base automatically, no death penalty 

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

### 2.2 Play characters
- The diety creates character and assigns 6 Characters to its party. The characters can change its race, role and name at will. 

const CHARACTER_SCHEMA = ['id', 'race', 'main_class', 'sub_class' , 'name', 'b.vitality', 'b.strength', 'b.intelligence', 'b.mind' , 'ranged_attack', 'magical_attack', 'melee_attack', 'ranged_NoA', 'magical_NoA', 'melee_NoA', 'maximum_equipped_item' ]

- id: int
- main_class
- sub_class
- name: string
- b.vitality 
- b.strength 
- b.intelligence 
- b.mind
- ranged_attack
- magical_attack
- melee_attack
- ranged_NoA
- magical_NoA
- melee_NoA
- maximum_equipped_item:

*Note:*
- Individual character has no level, hp, nor defensive parameters
- NoA: number of attacks

#### 2.2.1 Character 

-A character is defined by Race and Role
    - Race defines base status
	- Role defines combat behavior modifiers and equipment bonuses
	- Characters have no individual HP
	- All defensive effects ultimately modify party-wide parameters

**Base Status Parameters**
- Each character has the following base status values:
	- V (`b.vitality`): contributes to Party HP
	- S (`b.strength`): contributes to physical attack
	- I (`b.intelligence`): contributes to magical attack
	- M (`b.mind`): contributes to magical resistance effects (not used in this version)

- Base status values are summed across the party and converted into party-wide or individual values according to system rules.

- races:
 base status: v:vitality, s:strength i:intelligence, m:mind

|races |abilities | base status |
|-----|-----------|-----------|
|ケイナイアン(Caninian) |(no special ability) |V:10 / S:10 / I:10 / M:10|

- classes:

|class |abilities (main) | class bonuses(main, sub) |
|-----|-----------|---------|
|戦士(Fighter) |`a.defender` Incoming physical damage to party × 2/3 | `c.equipment_slot+1` , `c.armor_x1.3` |
|剣士(Swordsman) |`a.counter` enemy CLOSE-range attack | `c.sword_x1.3` |
|忍者(Ninja) |`a.re-attack` once when attacking | `c.equipment_slot+1` |
|侍(Samurai) |`a.iaigiri` Physical damage ×2,  number of attacks ÷2 | `c.katanax1.5` |
|君主(Lord) |`a.leading` Physical damage x1.4 | `c.gauntlet_x1.3`, `c.equipment_slot+2` |
|狩人(Marksman) | (none) | `c.archery_x1.5` |
|魔法使い(Wizard) | (none) | `c.wand_x1.5` |
|賢者(Sage) |`a.m-barrier` Incoming magical damage to party × 2/3 | `c.robe_x1.3`, `c.equipment_slot+3`|
|盗賊(rouge) |`a.first-strike` Acts faster than enemy | `c.amulet_x1.3`, `c.equipment_slot+1` |

- `main_class` applies abilitiies and class bonuses. `sub_class` applies only class bonuses.
- Only the strongest single ability(a.) of the same name applies.
- Only one single bonuses(c.) of the same name applies. (two `c.equipment_slot+2`, but only one `c.equipment_slot+2` works)


#### 2.2.2 Party structure 

1. Party Properties
- Player party consists of up to 6 characters
- All characters participate simultaneously
- Party has its:
    - Party HP
    - Party physical defense
    - Party magical defense

2. Character Properties
- Each character has:
	- Ranged attack, number of attacks
    - Magical attack, number of attacks
    - Melee attack, number of attacks

    - Equipment slots

- Characters do not have individual HP.
    - but each character contrivutes total HP, physical defense and magical defense. 

### 2.3 Dungeons & Enemies

- Each dungeon has multiple rooms. each room has one enemy. At the end of room, formitive boss enemy is waiting for victims.

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
- ranged_attack
- magical_attack
- melee_attack
- ranged_NoA
- magical_NoA
- melee_NoA
- physical_defense
- magical_defense
- experience
- drop_item

### 2.4 Items

**Item Category**

|category | name | concept |
|-----|----|-----------|
|`c.sword` | 剣 | + `melee_attack` |
|`c.katana` | 刀 | + `melee_attack`, - `melee_NoA` |
|`c.archery` | 弓具 | bow: + `ranged_attack`, arrows:  + `ranged_NoA` |
|`c.armor` | 鎧 | + `Party_physical_defense` |
|`c.gauntlet` | 籠手 | + `melee_NoA` |
|`c.wand` | ワンド | + `magical_attack` |
|`c.book` | 魔導書 | + `magical_NoA` |
|`c.robe` | 法衣 | + `Party_magical_defense` |
|`c.amulet` | 護符 | + `Party_HP` |


## 3. INITIALIZATION 

### 3.1 Randomness initialization
- **Reward:** Put 1 win ticket(1) and 99 lose tickets(0) into 'reward_bag'. 
- **Enhancement:** Put tickets into 'enhancement_bag'.
- **Super Rare:** Put tickets into 'superRare_bag' .

- If a bag is empty or explicitly reset the bag, initialize it.

### 3.3 Character initialization
- Beats enemies, gains experience, then level up. 
- max_level: 29. (current version restriction)

- Equipment slots for individual character
	-`maximum_equipped_item`= base slots + class_bonuses (`c.equipment_slot+1`, `c.equipment_slot+2`, `c.equipment_slot+3`)
  	- Where class_bonuses is the sum of unique values from Main and Sub class. Example: If Main Class provides `c.equipment_slot+2` and Sub Class provides `c.equipment_slot+3`, class_bonuses is 5. If both provide `c.equipment_slot+2`, bonus_sum is 2.

|level | base slots |
|-----|-----------|
|1 |1 |
|3 |2 |
|6 |3 |
|12|4 |
|16|5 |
|20|6 |
|25|7 |

- Attack damage:
  - ranged_attack: Item Bonuses(round up)
  - melee_Attack: `b.strength` x (1 + 0.1 x `level`) + Item Bonuses(round up)
  - magical_Attack: `b.intelligence` x (1 + 0.1 x `level`) + Item Bonuses(round up)

- Number of attacks:
  - ranged_NoA: 0 + Item Bonuses(round up) // no arrows, no shoot.
  - magical_NoA: IF class is `Wizard` or `Sage`, 1. Else 0.
  - melee_NoA: 0 + Item Bonuses(round up) //no gauntlet, no melee combat.
 
  - IF the character has `a.iaigiri`, halve these number of attacks.
 
### 3.4 Party initialization

- Class bonuses like `c.amulet_x1.3` applies only for individual character's equipments.
- Party HP: 100 + (Total sum of `b.vitality`)*`level` + Item Bonuses
- Party defense:
  - Physical defense: (Total sum of) Item Bonuses
  - Magical defense: (Total sum of) Item Bonuses
 
  


## 4. HOME

- Manage party setting. character build (can also change its class, race!). change their equipment.
- set the destination of dungeon.
- sell items and gain gold. (gold is corrective resouce for this version)




### 4.2 Equipment

- Each character has its own equipment slots.
- Assigns items to a character from inventory. 

## 5. EXPEDITION 

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

**First strike**
- IF a caracter has `a.first-strike`, acts before enemy action. (see Player action)

**Enemy action**
- Enemy always moves first.

- Damage: max(1 ,(Enemy damage - Party defense) x Enemy's damage amplifier x Party abilities amplifier) x number of attacks
    - following matched ranged type. 
- Current Party HP -= Calculated damage
- If currenr party HP =< 0, Defeat. 

- **Counter:** IF character has `a.counter` ability and take damage in CLOSE phase. The character attacks to enemy.

**Player action**
- Each party menber act if he has corresponding damage source in the phase. 

- Calculated damage: max(1, (Attack damage - Enemy defense) x Party abilities amplifier )
    - following matched ranged type. 

- Current enemy HP -= Calculated damage
- If enemy HP =< 0, Victory.

- **Re-attack:** IF character has `a.re-attack` ability. The character attacks to enemy.

### 6.4 Post battle


### 6.5 Outcome 

- Victory: gains experience points to a party. has a chance of gaining reward from enemies drop item. Proceeds to the next room.
- Defeat: no penalties (current version). no experience points nor item reward. Back to the base.
- Draw:no penalties (current version). no experience points nor item reward. Proceeds to the next room.

## 7. REWARD 

- Gets one ticket from 'reward_bag'.
  - If it is '1', then get one ticket from each of 'enhancement_bag', and 'superRare_bag'.
    
  - Combines them into one item.
    (ex.
    
     enhancement:1, superRare:0 -> 名工のロングソード
     enhancement:3, superRare:1 -> 世界を征する宿ったロングソード)


## 8. UI


**END OF SPECIFICATION**
