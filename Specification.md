# KEMO EXPEDITION v0.0.1 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG


## 2. CONSTANTS & DATA

### 2.1 Global constants

- level: int
- experience: int
- party_HP
- party_physical_defense
- party_magical_defense

### 2.2 Play characters

- id: int
- rarlity: int
- role
- name: string
- ranged_attack
- magical_attack
- melee_attack
- ranged_NoA
- magical_NoA
- melee_NoA
- equipped_item: []

Note: Individual character has no level or hp. 

#### 2.2.1 Character 

- roles:

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

NoA: number of attacks

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