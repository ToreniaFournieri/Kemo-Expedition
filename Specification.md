# KEMO EXPEDITION v0.0.1 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- no randomness in battle.
- Tetris like randomness for enemies spawns, reward items. (a bag contians all potential rewards. 


## 2. CONSTANTS & DATA

### 2.1 Global constants
- One diety represents on one party. The diety has its own level, HP, and unique divine abilities. 
const PARTY_SCHEMA = ['number', 'diety', 'level', 'experience', 'HP', 'physical_ defense', 'magical_ defense' ]

Initial_party = [1, 'God of Restoration', 1, 0, 100, 1, 1 ]

- 'God of Restoration' // Revives character at the base automatically, no death penalty 

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
|戦士(Tank) |Incoming physical damage to party × 2/3 | +1 equipment slot, armor x1.3 |
|剣士(Swordsman) |Counter enemy CLOSE-range attack | sword x1.3 |
|忍者(Ninja) |Re-attack once when attacking | +2 equipment slots |
|侍(Samurai) |Physical damage ×2, number of attacks ÷2 | katana x1.5 |
|君主(Lord) |Physical damage x1.4 | heavy armor x1.3 |
|狩人(Marksman) | (none) | archer x1.5 |
|魔法使い(Wizard) | (none) | wand x1.5 |
|賢者(Sage) | Incoming magical damage to party × 2/3 | rod x1.5|
|盗賊(rouge) |Acts twice per phase | (none) |

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

## 3. INITIALIZATION 

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


## 7. REWARD 

## 8. UI


**END OF SPECIFICATION**