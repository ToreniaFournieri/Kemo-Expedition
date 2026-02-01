# KEMO EXPEDITION v0.0.1 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG


## 2. CONSTANTS & DATA

### 2.1 Global constants

### 2.2 Play characters

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

### 2.4 Items

## 3. INITIALIZATION 

## 4. HOME


## 5. EXPEDITION 

## 6. COMBAT

### 6.1 Encounter Rules
- Each encounter consists of one battle
    - Each battle always has exactly three phases, executed in fixed order:
        - LONG range
        - MID range
        - CLOSE range
	- If the enemy is not defeated by the end of the CLOSE phase:
    	- Result = Draw
        - Player receives no rewards
        -Party survives but gains nothing

### 6.2 TURN ORDER
- For each phase, actions are resolved in the following order:
    - Enemy attacks
    - Player party attacks

```
LONG   : Enemy → Player
MID    : Enemy → Player
CLOSE  : Enemy → Player
```

## 7. REWARD 

## 8. UI


**END OF SPECIFICATION**