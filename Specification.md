# KEMO EXPEDITION v0.0.1 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- no randomness in battle.
- Tetris like randomness for enemies spawns, reward items. (a bag contians all potential rewards. 


## 2. CONSTANTS & DATA

### 2.1 Global constants
- One diety represents on one party. The diety has its own level, HP, and unique divine abilities. 
const PARTY_SCHEMA = ['number', 'diety', 'level', 'experience', 'Party_HP', 'Party_physical_defense', 'Party_magical_defense' ]

Initial_party = [1, 'God of Restoration', 1, 0, 100, 1, 1 ]

- 'God of Restoration' // Revives character at the base automatically, no death penalty 

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

const CHARACTER_SCHEMA = ['id', 'race', 'role', 'name', 'ranged_attack', 'magical_attack', 'melee_attack, 'ranged_NoA', 'magical_NoA', 'melee_NoA', 'maximum_equipped_item' ]

- id: int
- role
- name: string
- vitality 
- strength 
- intelligence 
- mind
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
	- V (Vitality): contributes to Party HP
	- S (Strength): contributes to physical attack
	- I (Intelligence): contributes to magical attack
	- M (Mind): contributes to magical defense or resistance effects

- Base status values are summed across the party and converted into party-wide or individual values according to system rules.

- races:
 base status: v:vitality, s:strength i:intelligence, m:mind

|races |abilities | base status |
|-----|-----------|-----------|
|ケイナイアン(Caninian) |(no special ability) |V:10 / S:10 / I:10 / M:10|

- roles:

|roles |abilities | equipment bonuses |
|-----|-----------|---------|
|戦士(Tank) |Incoming physical damage to party × 2/3 | +1 equipment slot, `e.armor` x1.3 |
|剣士(Swordsman) |Counter enemy CLOSE-range attack | `e.sword` x1.3 |
|忍者(Ninja) |Re-attack once when attacking | +2 equipment slots |
|侍(Samurai) |Physical damage ×2, number of attacks ÷2 | `e.katana` x1.5 |
|君主(Lord) |Physical damage x1.4 | `e.gauntlet` x1.3 |
|狩人(Marksman) | (none) | `e.archery` x1.5 |
|魔法使い(Wizard) | (none) | `e.wand` x1.5 |
|賢者(Sage) | Incoming magical damage to party × 2/3 | `e.robe` x1.3|
|盗賊(rouge) |Acts twice per phase | `e.amulet` x1.3 |

- mutiplied reductions do not stack multiplicatively.


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

### 2.3 Enemy

- id: int
- rarlity: int
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
- drop_item: []

### 2.4 Items

**Item Category**

|category | name | concept |
|-----|----|-----------|
|`e.sword` | 剣 | + `melee_attack` |
|`e.katana` | 刀 | + `melee_attack`, - `melee_NoA` |
|`e.archery` | 弓具 | bow: + `ranged_attack`, arrows:  + `ranged_NoA` |
|`e.armor` | 鎧 | + `Party_physical_defense` |
|`e.gauntlet` | 籠手 | + `melee_NoA` |
|`e.wand` | ワンド | + `magical_attack` |
|`e.robe` | 法衣 | + `Party_magical_defense` |
|`e.amulet` | 護符 | + `Party_HP` |


## 3. INITIALIZATION 
- **Reward:** Put 1 win ticket(1) and 99 lose tickets(0) into 'reward_bag'. 
- **Enhancement:** Put tickets into 'enhancement_bag'.
- **Super Rare:** Put tickets into 'superRare_bag' .

- If a bag is empty or explicitly reset the bag, initialize it.

## 4. HOME

### 4.1 Level up
- Beats enemies, gains experience, then level up. 
- max_level: 29. (current version restriction)

- Party HP: 100 + 10*`level`
- Equipment slots for individual character

|level | base slots |
|-----|-----------|
|1 |1 |
|3 |2 |
|6 |3 |
|12|4 |
|16|5 |
|20|6 |
|25|7 |


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

**Enemy action**
- Enemy always moves first. 

- Damage: (Enemy damage - Party defense) x Enemy's damage amplifier x Party abilities amplifier 
    - following matched ranged type. 

- Current Party HP -= Calculated damage
- If currenr party HP =< 0, Defeat. 


**Player action**
- Each party menber act if he has corresponding damage source in the phase. 

- Damage: (Character damage - Enemy defense) x Party abilities amplifier 
    - following matched ranged type. 

- Current enemy HP -= Calculated damage
- If enemy HP =< 0, Victory. 

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
