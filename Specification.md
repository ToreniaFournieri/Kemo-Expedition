# KEMO EXPEDITION v0.0.3 - SPECIFICATION

## 1. OVERVIEW
- Text-based, deterministic fantasy RPG
- Support Japanese language. 
- no randomness in battle.
- Tetris like randomness for enemies spawns, reward items. (a bag contians all potential rewards. 

### 1.1 World setting
-

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

-A character is defined by Race, Class and Predisposition
    - Race defines base status
	- Class defines combat behavior modifiers and equipment bonuses
	- Predisposition defines additional modifiers
	- Characters have no individual HP
	- All defensive effects ultimately modify party-wide parameters

**Base Status Parameters**
- Each character has the following base status values:
	- V (`b.vitality`): contributes to Party HP
	- S (`b.strength`): contributes to physical attack
	- I (`b.intelligence`): contributes to magical attack
	- M (`b.mind`): contributes to magical resistance effects (not used in this version)

- Base status values are summed across the party and converted into party-wide or individual values according to system rules.

- **races:**

|races | bonus | base status | memo |
|-----|-----------|-----------|------|
|ケイナイアン(Caninian) | `c.amulet_x1.3` |V:10 / S:10 / I:10 / M:10| Dog |
|ルピニアン(Lupinian) | `c.equip_slot+1`, `c.katana_x1.3`  |V:9 / S:12 / I:8 / M:7| Wolf |
|ヴァルピニアン(Vulpinian) |`c.equip_slot+1`, `c.sword_x1.3` |V:10 / S:10 / I:12 / M:8| Fox |
|ウルサン(Ursan) |`c.equip_slot+2` |V:13 / S:12 / I:5 / M:7| Bear |
|フェリディアン(Felidian) |`c.robe_x1.3` |V:9 / S:9 / I:10 / M:12| Cat |
|マステリド(Mustelid) | `c.gauntlet_x1.3` |V:10 / S:10 / I:9 / M:11| Ferret |
|レポリアン(Leporian) | `c.archery_x1.3` |V:9 / S:8 / I:11 / M:10| Rabbit |
|タルピッド(Talpid) |`c.armor_x1.3` |V:12 / S:12 / I:7 / M:7| Mole |
|セルヴィン(Cervin) |`c.wand_x1.3` |V:6 / S:7 / I:13 / M:10| Deer |
|ミュリッド(Murid) |`c.penet_x0.10`, `a.caster`: +1  |V:9 / S:8 / I:10 / M:10| Mouse |

 *base status: v:vitality(体力), s:strength(力) i:intelligence(知性), m:mind(精神)

- **predisposition:**

|predisposition | bonus |
|-----|-----------|
|頑強 (Sturdy)|`b.vitality`+2,  `c.armor_x1.1`|
|俊敏 (Agile)|`c.gauntlet_x1.2`|
|聡明 (Brilliant)|`c.wand_x1.2`|
|器用 (Dexterous)|`c.archery_x1.2`|
|騎士道 (Chivalric)|`c.sword_x1.2`|
|士魂 (Shikon)|`b.strength`+2, `c.katana_x1.1`|
|追求 (Pursuing)|`b.intelligence`+2, `c.robe_x1.1`|
|商才 (Canny)|`c.equip_slot+1`|
|忍耐(Persistent)|`b.mind`+2, `c.robe_x1.1`|

- **lineage:**

|lineage | bonus |
|-----|-----------|
|1|`c.wand_x1.2` |
|2|`c.sword_x1.2` |
||`c.katana_x1.2`|
||`c.archery_x1.2`|
||`c.armor_x1.2` |
||`c.gauntlet_x1.2`|
||`c.wand_x1.2`|
||`c.robe_x1.2`|
||`c.amulet_x1.2`|

- **classes:**

|class |class bonuses(main, sub) | abilities (main) |abilities (master) | 
|-----|-----------|---------|---------|
|戦士(Fighter) |`c.equip_slot+1`,  `c.armor_x1.4` |`a.defender`: Incoming physical damage to party × 2/3 |`a.defender`: Incoming physical damage to party × 3/5 | 
|剣士(Duelist) |`c.sword_x1.4` |`a.counter`: enemy CLOSE-range attack |`a.counter`: enemy CLOSE-range attack and MID-range | 
|忍者(Ninja) |`c.penet_x0.15` |`a.re-attack`: once when attacking |`a.re-attack`: twice when attacking | 
|侍(Samurai) |`c.katana_x1.4` |`a.iaigiri`: Physical damage ×2,  number of attacks ÷2 | `a.iaigiri`: Physical damage ×2.5,  number of attacks ÷2 |
|君主(Lord) |`c.gauntlet_x1.4`, `c.equip_slot+1` |`a.leading`: Physical damage x1.3 |`a.leading`: Physical damage x1.6 | 
|狩人(Ranger) |`c.archery_x1.4` | `a.hunter`: Retrieve 30% of the arrows at the end of battle  |`a.hunter`: Retrieve 36% of the arrows at the end of battle | 
|魔法使い(Wizard) |`c.wand_x1.4` | `a.caster`: +2 `magical_NoA`  | `a.caster`: +3 `magical_NoA`  | 
|賢者(Sage) |`c.robe_x1.4`, `c.equip_slot+2` |`a.caster`: +1 `magical_NoA`. `a.m-barrier`: Incoming magical damage to party × 2/3 | `a.caster`: +1 `magical_NoA`. `a.m-barrier`: Incoming magical damage to party × 3/5 | 
|盗賊(Rouge) |`c.unlock` additional reward chance |`a.first-strike`: Acts faster than enemy at CLOSE phase |`a.first-strike`: Acts faster than enemy at All phases | 
|巡礼者(Pilgrim) |`c.amulet_x1.4`, `c.equip_slot+1` |`a.null-counter`: Negate counter attack |`a.null-counter`: Negate counter attack | 

- If `main_class` and  `sub_class` are same class, then it turns into master class.
- `main_class` applies abilitiies and class bonuses. `sub_class` applies only class bonuses.
- Only the strongest single ability(a.) of the same name applies.
- Only one single bonuses(c.) of the same name applies. (two `c.equip_slot+2`, but only one `c.equip_slot+2` works)


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

|category | name | core concept |
|-----|----|-----------|
|`c.sword` | 剣 | + `melee_attack` |
|`c.katana` | 刀 | + `melee_attack`, - `melee_NoA` |
|`c.archery` | 弓具 | bow: + `ranged_attack`, arrows:  + `ranged_NoA` |
|`c.armor` | 鎧 | + `Party_physical_defense` |
|`c.gauntlet` | 籠手 | + `melee_NoA` |
|`c.wand` | ワンド | + `magical_attack` |
|`c.robe` | 法衣 | + `Party_magical_defense` |
|`c.amulet` | 護符 | + `Party_HP` |

- *note:* item might have multiple bonus. sword may have `Party_HP` but subtle value. 

**consumpstion of arrows**
- Arrow Stacks: * Arrow-type items have a quantity property.
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
- Beats enemies, gains experience, then level up. 
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

- c.multiplier like `c.sword_x1.3` applies only for sword item type. other item types like amulet may have +10 melee_attack bonus, but amulet's melee_attack bonus is not multiplied by `c.sword_x1.3` effect. 

- Attack damage:
  - ranged_attack: Item Bonuses x its c.multiplier
  - melee_attack: Item Bonuses x its c.multiplier x `b.strength` / 10
  - magical_attack: Item Bonuses x its c.multiplier x `b.intelligence` / 10

- Number of attacks:
  - ranged_NoA: 0 + Item Bonuses x its c.multiplier (round up) // no arrows, no shoot.
  - magical_NoA: 0 + `a.caster` bonuses // only strongest single ability applies.
  - melee_NoA: 0 + Item Bonuses x its c.multiplier (round up) //no gauntlet, no melee combat.
 
  - IF the character has `a.iaigiri`, halve these number of attacks, round up. 
 
### 3.4 Party initialization

- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 
- Party HP: 950 + (level x 50) + (Total sum of individual (Item Bonuses of HP x its c.multiplier x (`b.vitality`  + `b.mind`) / 20))
- Party defense:
  - Physical defense: (Total sum of individual (Item Bonuses of Physical defense x its c.multiplier x `b.vitality` / 10))
  - Magical defense: (Total sum of individual (Item Bonuses of Magical defense x its c.multiplier x `b.mind` / 10))


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

- If it is LONG phase and going to use arrow:
  - Check if Character has e.archery (Arrow) with quantity > 0.
  - If quantity < ranged_NoA, the character attacks with a reduced NoA equal to the remaining quantity.
  - Subtract quantity.

- Calculated damage: max(1, (Attack damage - Enemy defense x (1 - sum of (penet multiplier)) ))  x Indivisual abilities amplifier x Party abilities amplifier
  - Indivisual abilities:`a.iaigiri`
  - Party abilities: `a.leading`
  - penet multiplier: like `c.penet_x0.1` & `c.penet_x0.15` -> 0.25
  - following matched ranged type. 

- Current enemy HP -= Calculated damage
- If enemy HP =< 0, Victory.

- **Re-attack:** IF character has `a.re-attack` ability. The character attacks to enemy.

### 6.4 Post battle

-`a.hunter` Retrieve v% of the arrows which the character consumed in the battle. 


### 6.5 Outcome 

- Victory: gains experience points to a party. has a chance of gaining reward from enemies drop item. Proceeds to the next room.
- Defeat: no penalties (current version). no experience points nor item reward. Back to the base.
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
