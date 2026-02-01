# KEMO EXPEDITION v0.0.1 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG


## 2. CONSTANTS & DATA

### 2.1 Global constants
- One diety represents on one party. The diety has its own level, HP, and unique divine abilities. 
const PARTY_SCHEMA = ['number', 'diety', 'level', 'experience', 'HP', 'physical_ defense', 'magical_ defense' ]

Initial_party = [1, 'God of Restoration', 1, 0, 100, 1, 1 ]

- 'God of Restoration' // Revives character at the base automatically, no death penalty 

### 2.2 Play characters
- The diety creates character and assigns 6 Characters to its party. The characters can change its race, role and name at will. 

const CHARACTER_SCHEMA = ['id', 'race', 'role', 'name', 'ranged_attack', 'magical_attack', 'melee_attack, 'ranged_NoA', 'magical_NoA', 'melee_NoA', 'equipped_item' ]

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
- equipped_item: []

*Note:*
- Individual character has no level, hp, nor defensive parameters
- NoA: number of attacks

#### 2.2.1 Character 

- races:
 base status: v:vitality, s:strength i:intelligence, m:mind

|races |abilities | base status |
|-----|-----------|-----------|
|ケイナイアン(Caninian) |(no special ability) |v:10, s:10, i:10, m:10|

- roles:

|roles |abilities | equipment bonuses |
|-----|-----------|---------|
|戦士(Tank) |reduces incoming physical damage multiplied by x2/3 | +1 item slot, armor x1.3 |
|剣士(Swordsman) |counter an opponent melee attack| sword x1.3 |
|忍者(Ninja) |reattack. | +2 item slots |
|侍(Samurai) |double physical damage, halve number of attacks. | katana x1.5 |
|君主(Lord) |deals physical damage multiplied by x1.4 | heavy armor x1.3 |
|狩人(Marksman) | (none) | archer x1.5 |
|魔法使い(Wizard) | | wand x1.5 |
|賢者(Sage) | reduces incoming magical damage multiplied by x2/3 | rod x1.5|
|盗賊(rouge) |moves twice | (none) |

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

- Damage: (Enemy damage - Party defense) x Enemy's damage amplifier
    - following matched ranged type. 

- Current Party HP -= Calculated damage
- If currenr party HP =< 0, Defeat. 


**Player action**
- Each party menber act if he has corresponding damage source in the phase. 

- Damage: (Character damage - Enemy defense) x Character damage amplifier
    - following matched ranged type. 

- Current enemy HP -= Calculated damage
- If enemy HP =< 0, Victory. 

### 6.4 Post battle


### 6.5 Outcome 


## 7. REWARD 

## 8. UI


**END OF SPECIFICATION**