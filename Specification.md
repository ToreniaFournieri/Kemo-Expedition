# KEMO EXPEDITION v0.2.4 - SPECIFICATION

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
| `a.` | **A**bility. Unique/Strongest. If multiple abilities share the same name, only the one with the highest value (or the highest priority) is active. |
| `b.` | **B**ase Status (Core attributes) and Base status bonus |
| `c.` | **C**ategory Bonus. Different named modifiers combine. Identical named modifiers follow the "Unique" rule. |
| `d.` | **D**uel Status (Current combat values) |
| `e.` | **E**lemental Offense Attribute |
| `f.` | **F**unction (Logic/Calculated value) |
| `g.` | Ba**g** Randomization |
| `i.` | **I**tem Category |
| `p.` | **P**arty/Expedition Instance Data |
| `r.` | Elemental **R**esistance Attribute |
| `s.` | Item **S**tate |
| `x.` | E**x**pedition |


| `c.` | Display | Example |
|---|----|----|
| `c.ranged_attack+v` | [遠攻撃+v%] | `c.ranged_attack+13` -> [遠攻撃+13%] |
| `c.magical_attack+v` | [魔攻撃+v%] | `c.magical_attack-4` -> [魔攻撃-4%] |
| `c.melee_attack+v` | [近攻撃+v%] | `c.melee_attack+3` ->  [近攻撃+3%]  |
| `c.physical_defense+v` | [物防+v%] | `c.physical_defense+5` ->  [物防+5%] |
| `c.magical_defense+v` | [魔防+v%] | `c.magical_defense-2` -> [魔防-2%]  |
| `c.ranged_NoA+v` | [遠回数+v] | `c.ranged_NoA+2` -> [遠回数+2] |
| `c.magical_NoA+v` | [魔回数+v] | `c.magical_NoA+3` -> [魔回数+3] |
| `c.melee_NoA+v` | [近回数+v] | `c.melee_NoA-1` -> [近回数-1] |
| `c.accuracy+v` | [命中+(v*1000)] | `c.accuracy+0.001` -> [命中+1] |
| `c.evasion+v` | [回避+(v*1000)] | `c.evasion-3` [回避-3]  |

- Translation

| name | Japanese | short word |
|----|-----|---|
| common | 通常 | [C] |
| uncommon | アンコモン | [U] |
| rare | レア | [R] |
| mythic | 神魔レア | [M] |

**`c.` ボーナス一覧（表示名・説明）**
- "c. ボーナス説明　(同一名ボーナスは重複無効)"
- "b. ボーナス説明(重複有効)"

| `c.` Key | 表示 | 説明 |
|--------|------|------|
| `c.melee_attack+v` | 近攻+v% | 近接攻撃の最終ダメージを v% 乗算強化する|
| `c.ranged_attack+v` | 遠攻+v% | 遠距離攻撃の最終ダメージを v% 乗算強化する |
| `c.magical_attack+v` | 魔攻+v% | 魔法攻撃の最終ダメージを v% 乗算強化する |
| `c.physical_defense+v` | 物防+v% | 物理防御の最終値を v% 乗算強化する |
| `c.magical_defense+v` | 魔防+v% | 魔法防御の最終値を v% 乗算強化する |
| `c.melee_NoA+v` | 近回数+v | 近接攻撃回数が v 回増える |
| `c.ranged_NoA+v` | 遠回数+v | 遠距離攻撃回数が v 回増える |
| `c.magical_NoA+v` | 魔回数+v | 魔法攻撃回数が v 回増える |
| `c.accuracy+v` | 命中+v*1000 | 値が多いほどより多くの攻撃が命中するようになる |
| `c.evasion+v` | 回避+v*1000 | 値が多いほどより多くの攻撃を回避するようになる |
| `c.equip_slot+v` | 装備+v | 装備スロット数が v 増える |
| `c.grit+v` | 根性+v | 近接攻撃の装備が出来るようになる。近接攻撃回数が　v 回増える |
| `c.pursuit+v` | 追撃+v | 遠距離攻撃の装備が出来るようになる。遠距離攻撃回数が　v 回増える |
| `c.caster+v` | 術者+v | 魔法攻撃の装備が出来るようになる。魔法攻撃回数が　v 回増える |
| `c.penet_+v` | 貫通+v*100% | 敵の防御力を　v*100% 分無視する |
| `b.vitality+v` | 体+v | 基礎体力に v を加算（HP/物防に影響） |
| `b.strength+v` | 力+v | 基礎筋力に v を加算（近接火力に影響） |
| `b.intelligence+v` | 知+v | 基礎知性に v を加算（魔法火力に影響） |
| `b.mind+v` | 精+v | 基礎精神に v を加算（HP/魔防に影響） |

---

**`c.` 装備カテゴリ倍率（乗算ボーナス）**

| `c.` Key | 表示 | 説明 |
|---------|------|------|
| `c.armor_x1.x` | 鎧x1.x | 鎧カテゴリ装備の効果が 1.x 倍  |
| `c.robe_x1.x` | 衣x1.x | 法衣カテゴリ装備の効果が 1.x 倍  |
| `c.shield_x1.x` | 盾x1.x | 盾カテゴリ装備の効果が 1.x 倍  |
| `c.sword_x1.x` | 剣x1.x | 剣カテゴリ装備の効果が 1.x 倍  |
| `c.katana_x1.x` | 刀x1.x | 刀カテゴリ装備の効果が 1.x 倍  |
| `c.gauntlet_x1.x` | 手x1.x | 籠手カテゴリ装備の効果が 1.x 倍  |
| `c.arrow_x1.x` | 矢x1.x | 矢カテゴリ装備の効果が 1.x 倍  |
| `c.bolt_x1.x` | ボx1.x | ボルトカテゴリ装備の効果が 1.x 倍  |
| `c.archery_x1.x` | 弓x1.x | 弓カテゴリ装備の効果が 1.x 倍  |
| `c.wand_x1.x` | 杖x1.x | 杖カテゴリ装備の効果が 1.x 倍  |
| `c.grimoire_x1.x` | 書x1.x | 魔導書カテゴリ装備の効果が 1.x 倍  |
| `c.catalyst_x1.x` | 媒x1.x | 触媒カテゴリ装備の効果が 1.x 倍  |
 

### 2.1 Global constants

**Global structure**
  - gold 
  - Inventory 

**Deity  structure**
  - name
    - Initial deity: PT1:`God of Restoration` PT2: `God of Attrition`
  - unique abulities 
  - donated gold

**Party structure**
  - party id
  - level
  - experience
  - lootGateProgress 
  - lootGateStatus
  - deity // replacing deity reset character equipment slots. 
  - characters slots

**Bag Randomization** There are `g.common_reward_bag`, `g.common_enhancement_bag`, `g.uncommon_reward_bag`, `g.rare_reward_bag`, `g.mythic_reward_bag`, `g.enhancement_bag`, `g.superRare_bag`, and `g.threat_weight_bag` which control probable randomness.


**reward list**

- `g.common_reward_bag` table

| value | title | tickets |
|-----|---------|------|
| 0 | no item | 90 |
| 1 | win | 10 |

- `g.uncommon_reward_bag` table
 
| value | title | tickets |
|-----|---------|------|
| 0 | no item | 99 |
| 1 | win | 1 |

- `g.rare_reward_bag` table
 
| value | title | tickets |
|-----|---------|------|
| 0 | no item | 99 |
| 1 | win | 1 |

- `g.mythic_reward_bag` table
 
| value | title | tickets |
|-----|---------|------|
| 0 | no item | 99 |
| 1 | win | 1 |


**enhancement title**

- enhancement multipiler

| value | title | multiplier |
|-----|------|------|
| 0 | (none) | x1.00 |
| 1 | 名工の | x1.33 |
| 2 | 魔性の | x1.58 |
| 3 | 宿った | x2.10 |
| 4 | 伝説の | x2.75 |
| 5 | 恐ろしい | x3.50 |
| 6 | 究極の | x5.00 |

- `g.common_enhancement_bag` table

| value | title | tickets |
|-----|---------|------|
| 0 | (none) | 1390 |
| 1 | 名工の | 350 |
| 2 | 魔性の | 180 |
| 3 | 宿った | 60 |
| 4 | 伝説の | 15 |
| 5 | 恐ろしい | 4 |
| 6 | 究極の | 1 |

- `g.enhancement_bag` table
 
| value | title | tickets |
|-----|---------|------|
| 0 | (none) | 5490 |
| 1 | 名工の | 350 |
| 2 | 魔性の | 180 |
| 3 | 宿った | 60 |
| 4 | 伝説の | 15 |
| 5 | 恐ろしい | 4 |
| 6 | 究極の | 1 |

**superRare title** 

- `g.superRare_bag` table

| value | title | tickets | multiplier |
|-----|---------|------|-----|
| 0  |(none) | 24995 | x1.0 |
| 1 | 世界を征する | 1 | x2.0 |
| 2 | 天に与えられし | 1 | x2.0 |
| 3 | 混沌の | 1 | x2.0 |
| 4 | 知られざる | 1 | x2.0 |
| 5 | 血に飢えし | 1 | x2.0 |

**Elemental attribute**
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
    - `b.vitality`: 体, 体力. contributes to physical defense and `d.HP`
    - `b.strength`: 力, 力. contributes to physical attack
    - `b.intelligence`: 知, 知性. contributes to magical attack
    - `b.mind`: 精, 精神. contributes to magical defense and `d.HP`

- **races(種族):**

|races | bonus | 体,力,知,精 | memo |
|-----|-------|-----------|------|
|ケイナイアン(Caninian) | `c.shield_x1.3`, `c.archery_x1.1` |10,10,10,10| 🐶Dog |
|ルピニアン(Lupinian) | `c.equip_slot+1`, `c.katana_x1.3`  |9,12,8,7| 🐺Wolf |
|ヴァルピニアン(Vulpinian) |`c.equip_slot+1`, `c.sword_x1.3`, `c.grimoire_x1.2` |10,10,12,8| 🦊Fox |
|ウルサン(Ursan) |`c.equip_slot+2`, `c.catalyst_x1.2` |13,11,6,7| 🐻Bear |
|フェリディアン(Felidian) |`c.robe_x1.3`, `a.first-strike`1: Acts faster than enemy at CLOSE phase |9,9,10,12| 😺Cat |
|マステリド(Mustelid) | `c.gauntlet_x1.3`, `c.arrow_x1.3` |10,10,9,11| 🦡Ferret |
|レポリアン(Leporian) | `c.archery_x1.3`,  `c.armor_x1.3` |9,8,11,10| 🐰Rabbit |
|セルヴィン(Cervin) |`c.wand_x1.3`, `c.shield_x1.2` |6,7,13,10| 🦌Deer |
|ミュリッド(Murid) |`c.penet_+0.10`, `c.bolt_x1.3`  |9,8,10,10| 🐭Mouse |


- **predisposition(性格):**

|predisposition | bonus |
|-----|-----------|
|頑強 (Sturdy)|`b.vitality+2`,  `c.armor_x1.1`|
|俊敏 (Agile)| `c.evasion+0.01` |
|聡明 (Brilliant)|`c.wand_x1.2`|
|器用 (Dexterous)|`c.accuracy+0.01`, `c.catalyst_x1.2`|
|騎士道 (Chivalric)|`c.sword_x1.2`, `c.bolt_x1.1`|
|士魂 (Shikon)|`b.strength+1`, `c.katana_x1.1`, `c.arrow_x1.2`|
|追求 (Pursuing)|`b.intelligence+2`, `c.robe_x1.1`|
|商才 (Canny)|`c.equip_slot+1`|
|忍耐(Persistent)|`b.mind+1`, `c.robe_x1.1`|

- **lineage(家系):**

|lineage | bonus |
|-----|-----------|
|鋼誓の家（House of Steel Oath）|`c.sword_x1.3` |
|戦魂の家（House of War Spirit）|`c.katana_x1.2`, `b.mind+1`|
|遠眼の家（House of Far Sight）|`c.arrow_x1.3`|
|不動の家（House of the Unmoving）|`c.armor_x1.2`, `b.vitality+1` |
|砕手の家（House of the Breaking Hand）|`c.gauntlet_x1.2`, `b.strength+1`|
|導智の家（House of Guiding Thought）|`c.wand_x1.3`|
|秘理の家（House of Hidden Principles）|`c.robe_x1.2`, `b.intelligence+1`|
|継誓の家（House of Inherited Oaths）|`c.shield_x1.2`, `b.vitality+1`|

- **classes:**

|class | main/sub bonuses | main bonus | master bonus | 
|-----|-----------|---------|---------|
|戦士(戦,Fighter) | `c.grit+1`, `c.equip_slot+1`,  `c.armor_x1.4` |`a.defender`1: Incoming physical damage to party × 2/3 |`a.defender`2: Incoming physical damage to party × 3/5 | 
|剣士(剣,Duelist) | `c.grit+1`, `c.sword_x1.4` | `a.counter`1: enemy CLOSE-range attack (`f.NoA` x 0.5)  | `a.counter`2: enemy CLOSE-range attack and MID-range (`f.NoA` x 0.5)  | 
|忍者(忍,Ninja) | `c.grit+1`, `c.penet_+0.15` | `a.re-attack`1: once when attacking (`f.NoA` x 0.5) | `a.re-attack`2: twice when attacking (`f.NoA` x 0.5) | 
|侍(侍,Samurai) | `c.grit+1`, `c.katana_x1.4` |`a.iaigiri`: Physical damage ×2,  number of attacks ÷2 | `a.iaigiri`: Physical damage ×2.5,  number of attacks ÷2 |
|君主(君,Lord) | `c.grit+1`, `c.gauntlet_x1.4`, `c.equip_slot+1` |`a.command`1: Physical damage x1.3. `a.squander`:double the gold spent on feasting. |`a.command`2: Physical damage x1.6. `a.squander`:double the gold spent on feasting. | 
|狩人(狩,Ranger) | `c.pursuit+2`, `c.arrow_x1.4` | `a.hunter`1: Reduces row-based damage decay from 15% to 10% per step. |`a.hunter`2: Reduces row-based damage decay from 15% to 7% per step. | 
|魔法使い(魔,Wizard) | `c.caster+1`, `c.wand_x1.4` | `a.resonance`1:All hits +5% damage per `d.magical_NoA`. | `a.resonance`2:All hits +8% damage per `d.magical_NoA`. | 
|賢者(賢,Sage) | `c.caster+2`, `c.robe_x1.4`, `c.grimoire_x1.2`, `c.equip_slot+2` | `a.m-barrier`1: Incoming magical damage to party × 2/3 | `a.m-barrier`2: Incoming magical damage to party × 3/5 | 
|盗賊(盗,Rogue) | `c.pursuit+1`, `c.unlock` additional reward chance |`a.first-strike`1: Acts faster than enemy at CLOSE phase |`a.first-strike`2: Acts faster than enemy at All phases | 
|巡礼者(巡,Pilgrim) | `c.caster+1`, `c.grit+1`, `c.evasion+0.02`, `c.equip_slot+1` |`a.tithe`: Adds +10% of expedition profit to donation. |`a.null-counter`: Negate counter attack. `a.tithe`: Adds +10% of expedition profit to donation. | 

- If `main_class` and  `sub_class` are same class, then it turns into master class, applies master bonus.
- `main_class` applies main/sub bonuses and main bonus. `sub_class` applies only main/sub bonuses.
- Only the strongest single ability(a.) of the same name applies.
- Only one single bonuses(c.) of the **exact** same name applies. (`c.equip_slot+2` and `c.equip_slot+1` then +3 slots. two `c.equip_slot+2`, but only one `c.equip_slot+2` works)
 (`c.armor_x1.4`, `c.armor_x1.3`, `c.armor_x1.3` =>1.4 x 1.3 = x 1.82 -> 1.8 (for display))

#### 2.2.2 Party structure 
1. Party Properties
- Player party consists of 6 characters. 
- Row Assignment: Party members occupy positions 1 through 6. Row 1 represents the front-most position (highest threat), while Row 6 represents the back-most position (lowest threat).

- All characters participate simultaneously

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

- Characters do not have individual HP. Each character contributes total HP. 

#### 2.2.3 Deity list

| God | Name  | effect (Rank 1) |
|-----|-----|----|
|`God of Restoration`| 再生の神 | At the end of every 4th room,  Heal 20% of missing HP |
|`God of Attrition`| 消耗の神 | Add `c.melee_attack+20`, `c.ranged_attack+20`, and `c.magical_attack+20` to each party member. At the end of every 4th room, reduce 5% of remaining HP.|
|`God of Fortification` | 防備の神 | Add `c.physical_defense+10`, `c.magical_defense+10` to each party member.|
|`God of Precision`| 命中の神 | Add `c.accuracy+0.020` and `c.evasion-0.005` to each party member.|
|`God of Evasion`| 回避の神 | Add `c.evasion+0.015` to each party member.|
|`God of Resonance`| 反響の神 | Upgrade all `a.resonance` values by +1 tier. Add `c.magical_defense-5`to each party member.|


### 2.3 Expedition & Enemies
- Expedition layout: The 6 `x.floor` spire. Each floor consists of 4 `x.room`s. the last room of the floor is Elite/Boss enemy battle, other rooms are Normal enemy battles.
- There are 8 `x.expedition` destinations in total. every `x.expedition` has its own tier. (1st `x.expedition` drops tier-1 items. 2nd `x.expedition` drops tier-2 items)

#### 2.3.1 Expedition
- `x.expedition` list

| `x.expediton` | short word | `x.exp_HP_mult` | `x.exp_atk_mult` | `x.exp_NoA_mult` | `x.exp_atk_amp_mult` | `x.exp_def_mult` | `x.exp_def_amp_mult` | drop item tier | lore |
|------|-----|-----|----|----|----|----|----|----|----|
| ケイナイアン平原(Caninian Plains) | 原 | x1 | x1 | x1 | x1 | x1 | x1 | 1 | The Fields of First Vows. A sun-drenched grassland dotted with wooden watchtowers. This is the training ground for all new expeditions. The atmosphere is stable, making it the perfect place to master the basics of the Sword and Grimoire under the watchful eyes of the loyal Caninian sentries. |
| ルピニアンの断崖(Lupinian Crag) | 崖 | x4 | x3 | x2 | x2 | x3 | x0.8 | 2 | The Razor-Wind Peaks. Sharp obsidian cliffs where the wind howls like a hungry wolf. The Lupinian tribes test their endurance here. |
| ヴァルピニアンの樹林帯(Vulpinian Taiga) | 樹 | x16 | x9 | x3 | x3 | x9 | x0.64 | 3 | The Forest of Veils. A dense, autumnal woodland where the trees seem to move when you blink. The Vulpinian mages use the natural spiritual mist to weave illusions. Requiring explorers to seek the protection of high-tier Robes and Wands to see through the deception. |
| ウルサンの霊峰(Ursan Peaks) | 峰 | x64 | x27 | x4 | x4 | x27 | x0.51 | 4 | The Thunder-Forge Mountains. A volcanic range where the ground shakes with the rhythmic pounding of Ursan blacksmiths. Deep in these magma-lit halls, the lost art of the Katana is guarded by those whose bodies are as hard as the stone itself. |
| フェリディアンの茂み(Felidian Grove) | 茂 | x256 | x81 | x5 | x5 | x81 | x0.41 | 5 | The Moonlit Sanctuary. An ancient, overgrown jungle where ruins of a pre-shattering civilization glow with bioluminescence. To clear this grove, one must master the Bolt—the only weapon fast enough to strike before the forest strikes back. |
| マステリドの巣穴(Mustelid Burrow) | 巣 | x1,024 | x243 | x6 | x6 | x243 | x0.33 | 6 | The Copper Labyrinth. A massive subterranean industrial hive. The air is thick with chemical steam and the clank of gears. Only those with high-tier Catalysts can neutralize the toxins found in the deepest vents. |
| レポリアンの庭園(Leporian Garden) | 園 | x4,096 | x729 | x7 | x7 | x729 | x0.26 | 7 | The High-Heaven Isles. A cluster of floating islands suspended miles above the clouds. The Leporians navigate these heights using wind currents. Only those with the "Lord's" resolve can stabilize their spirit enough to claim the Mythic Sword. |
| セルヴィンの谷(Cervin Vale) | 谷 | x16,384 | x2,187 | x8 | x8 | x729 | x0.21 | 8 | The Glass Horizon. A dimension where space and time have crystallized. The Cervin Sages reside here in total silence. Here, the final Grimoire and Katana await the one who can transcend mortality. |

- **Enemy entity distribution** for each `x.expediton`

| Entity Type | Unique Count | Mapping | Drop Quality | Memo |
|-----|-----|-----|-----|----|
| Normal |30 | 5 per Floor Pool (Pools 1–6) | 3 Common, 2 Uncommon |  They provide consistent Uncommon drops and thematic flavor.|
| Elite | 5 | 1 per Floor ( `x.floor` 1–5, `x.room` 4) | 2 Rare, 1 Uncommon, 2 Common | Floor-end guardians serving as "Mechanical Gates." They drop Rare items and test specific build capabilities. |
| Boss | 1 | `x.floor` 6, `x.room` 4 (Final) | 2 ~ 3 Mythic , 1 ~ 2 Rare, 1 Common (5 in total) | A "Total Power" check and the exclusive source of Mythic rewards. |

- `x.expedition` layout overview:

| `x.floor` | `x.room` | `x.room_type` | `x.floor_HP_mult` | `x.floor_atk_mult` | `x.floor_NoA_mult` | `x.floor_atk_amp_mult` | `x.floor_def_mult` | `x.exp_def_amp_mult` | `x.Spawn_pool`, drops | `x.key_concept` |
|----|----|----|-----|-----|-----|-----|-----|-----|-----|-----|
| 1 | 1-3 | `x.battle_Normal` | x1.0 | x1.0 | x1.0 | x1.0 | x1.0 | x1.0 | pool_1 | easy farming |
| 1 | 4 | `x.battle_Elite` | x1.50 | x1.50 | x1.0 | x1.0 | x1.5 | x1.0 | fixed Elite. rare  `i.sword`, `i.armor` | Class:Rogue. Checks if you have equipped items properly. |
| 2 | 1-3 | `x.battle_Normal` | x1.25 | x1.20 | x1.0 | x1.0 | x1.20 | x0.97 | pool_2 | |
| 2 | 4 | `x.battle_Elite` | x1.85 | x1.80 | x1.0 | x1.0 | x1.80 | x0.97 | fixed Elite. rare  `i.shield`, `i.robe` | Class:Fighter. Checks if you have equipped enough offensive items. |
| 3 | 1-3 | `x.battle_Normal` | x1.56 | x1.44 | x1.0 | x1.0 | x1.44 | x0.94 | pool_3  |  |
| 3 | 4 | `x.battle_Elite` | x2.34 | x2.16 | x1.0 | x1.0 | x2.16 | x0.94 | fixed Elite. rare  `i.arrow`, `i.bolt`, `i.archery` | Class:Ranger. Check if you have enough physical defensive items. |
| 4 | 1-3 | `x.battle_Normal` | x2.95 | x1.72 | x1.0 | x1.0 | x1.72 | x0.92 | pool_4 | |
| 4 | 4 | `x.battle_Elite` | x4.43 | x2.58 | x1.0 | x1.0 | x2.58 | x0.92 | fixed Elite. rare  `i.armor`, `i.katana` | Class:Duelist. Checks if you have archery or magic items. (kill it before his melee attacks) |
| 5 | 1-3 | `x.battle_Normal` | x2.44 | x2.07 | x1.0 | x1.0 | x2.07 | x0.89 | pool_5  | |
| 5 | 4 | `x.battle_Elite` | x4.04 | x3.11 | x1.0 | x1.0 | x3.11 | x0.89 | fixed Elite. rare  `i.wand`, `i.grimoire`, `i.catalyst` | Class:Mage. Checks if you have equipped enough magical defensive items.  |
| 6 | 1-3 | `x.battle_Normal` | x3.05 | x2.49 | x1.0 | x1.0 | x2.49 | x0.86 | pool_6 | |
| 6 | 4 | `x.battle_Boss` | x6.10 | x5.00 | x1.0 | x1.0 | x5.0 | x0.86 | fixed Boss. mythic (see bellows) | Checks if you have enough tital power. |

- each pool has enemies with unique item drops. (*note:* common items are not specifically mentioned but are dropped.)
  
| `x.Spawn_pool` | enemy class/drop 1 | enemy class/drop 2 | enemy class/drop 3 | enemy class/drop 4 | enemy class/drop 5 |
|---|---|---|---|---|---|
| pool_1 | E01:Fighter/ uncommon `i.sword`, `i.gauntlet` | E02:Ranger/ uncommon `i.arrow`, `i.archery` | E03:Wizard/ uncommon `i.wand`, `i.catalyst` | E04:Pilgrim/ uncommon `i.sword`, `i.wand` | E05:Rogue/ uncommon `i.bolt`, `i.shield ` |
| pool_2 | E06:Ninja/ uncommon `i.katana`, `i.armor` | E07:Samurai/ uncommon `i.katana`, `i.bolt` | E08:Sage/ uncommon `i.grimoire`, `i.robe` | E09:Duelist/ uncommon `i.sword`, `i.arrow` | E10:Lord/ uncommon `i.shield `, `i.robe` |
| pool_3 | E11:Fighter/ uncommon `i.sword`, `i.gauntlet` | E12:Ranger/ uncommon `i.arrow`, `i.archery` | E13:Wizard/ uncommon `i.wand`, `i.catalyst` | E14:Lord/ uncommon `i.shield `, `i.robe` | E15:Samurai/ uncommon `i.katana`, `i.bolt` |
| pool_4 | E16:Ninja/ uncommon `i.katana`, `i.armor` | E17:Rogue/ uncommon `i.bolt`, `i.shield `| E18:Sage/ uncommon `i.grimoire`, `i.robe` | E19:Duelist/ uncommon `i.sword`, `i.arrow` | E20:Pilgrim/ uncommon `i.sword`, `i.wand` |
| pool_5 | E21:Fighter/ uncommon `i.sword`, `i.gauntlet` | E22:Ranger/ uncommon `i.arrow`, `i.archery` | E23:Wizard/ uncommon `i.wand`, `i.catalyst` | E24:Lord/ uncommon `i.shield `, `i.robe` | E25:Samurai/ uncommon `i.katana`, `i.bolt` |
| pool_6 | E26:Ninja/ uncommon `i.katana`, `i.armor` | E27:Rogue/ uncommon `i.bolt`, `i.shield `| E28:Sage/ uncommon `i.grimoire`, `i.robe` | E29:Duelist/ uncommon `i.sword`, `i.arrow` | E30:Pilgrim/ uncommon `i.sword`, `i.wand` |

- Boss:

| `x.expedition` Tier | Boss concept | Class | Boss drop mythic item types |
|---|---------|------|---|
| 1 | | Fighter | `i.sword` , `i.grimoire` |
| 2 | | Ranger  | `i.armor` , `i.arrow` |
| 3 | | Wizard | `i.wand`,`i.robe` |
| 4 | | Samurai | `i.katana` , `i.shield `| 
| 5 | | Ranger | `i.bolt`,  `i.archery` |
| 6 | | Sage | `i.armor`, `i.catalyst` |
| 7 | | Lord | `i.sword` , `i.wand` |
| 8 | Superior existence | Ninjya | `i.katana`, `i.bolt`, `i.grimoire`  |



#### 2.3.2 Enemy structure (in battle)
- id: int
- type: string.  Normal/Elite/Boss
- x.Spawn_tier
- x.Spawn_pool //only for type.Normal. others (Elite/Boss) set 0.
- name: string
- class
- `d.HP`
- `a.ability`
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
- `d.experience` // Enemy experience is added directly to party experience.
- drop_item

**Enemy Master Specification**
- This document defines the base data structure and dynamic scaling laws for all entities encountered during an expedition.

1. The Core Principle: "Static Master, Dynamic Reality"
All enemies are stored with Master Values (Tier 1, Room 1 equivalent). Their actual threat level is calculated only upon spawning by applying the environmental pressure of the current Expedition and Floor.

2. Status Scaling FormulasThe final combat value final is derived from the Master Value base using the following multipliers.

**Enemy master data structure**
- id: int
- type: string.  Normal/Elite/Boss
- x.Spawn_tier
- x.Spawn_pool //only for type.Normal. others (Elite/Boss) set 0.
- name: string
- class
- drop_items

*note:* There are no duel(`d.`, `f.`, `e`, or `r`) related status in the master data. because these data is calculated by the formula.


**Enemy status mutipliers**
- `d.HP` : master value x `x.exp_HP_mult` x `x.floor_HP_mult`
- `f.attack` :  master value x `x.exp_atk_mult` x `x.floor_atk_mult`
- `f.NoA` :  master value x `x.exp_NoA_mult` x `x.floor_NoA_mult`
- `f.offense_amplifier` :  master value x `x.exp_atk_amp_mult` x `x.floor_atk_amp_mult`
- `f.defense` :  master value x `x.exp_def_mult`  x `x.floor_def_mult` 
- `f.defense_amplifier` : 1.0 x `x.exp_def_amp_mult` x `x.exp_def_amp_mult`
- `f.elemental_offense_attribute` :  not scale
- `f.elemental_resistance_attribute` : not scale
- `f.penet_multiplier`: not scale
- `d.experience`: master value x `x.exp_mult` x (If Elite, 2.0. Else if Boss, 5.0. Else 1.0)

#### 2.3.3 Base data structure (enemy)

| Role | `d.HP` | `a.ability` | `c.accuracy` | `c.evasion` | `d.ranged_attack` | `d.ranged_NoA` | `d.magical_attack` | `d.magical_NoA` | `d.melee_attack` | `d.melee_NoA` | `d.ranged_attack_amplifier` | `d.magical_attack_amplifier` | `d.melee_attack_amplifier` | `d.physical_defense` | `d.magical_defense` | `e.fire` | `e.ice` | `e.thunder` | `r.fire` | `r.ice` |`r.thunder` | `d.experience` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fighter | 75 | (none) | 0.00| 0.02 | 0 | 0 | 0 | 0 | 16 | 2 | x1.0 | x1.0 | x1.0 | 16 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Duelist | 50 | `a.counter`1 | 0.01 | 0.01 | 0 | 0 | 0 | 0 | 20 | 4 | x1.0 | x1.0 | x1.2 | 10 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Ninja | 47 | `a.re-attack`1 | 0.00 | 0.04 | 10 | 2 | 0 | 0 | 14 | 2 | x1.1 | x1.0 | x1.1 | 10 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 14 |
| Samurai | 40 | (none) | -0.05 | -0.01 | 0 | 0 | 0 | 0 | 40 | 2 | x1.0 | x1.0 | x1.3 | 8 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 12 |
| Lord | 60 | (none) | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 18 | 4 | x1.0 | x1.0 | x1.1 | 14 | 14 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 20 |
| Ranger | 38 | (none) | 0.03 | 0.01 | 14 | 4 | 0 | 0 | 0 | 0 | x1.2 | x1.0 | x1.0 | 8 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 12 |
| Wizard | 32 | (none) | 0.00 | 0.00 |0 | 0 | 20 | 2 | 0 | 0 | x1.0 | x1.2 | x1.0 | 6 | 14 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Sage | 38 | (none) | 0.00 | 0.00 |0 | 0 | 10 | 4 | 0 | 0 | x1.0 | x1.2 | x1.0 | 8 | 20 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Rogue | 30 | (none) | 0.06 | 0.06 | 10 | 4 | 0 | 0 | 10 | 4 | x1.0 | x1.2 | x1.0 | 8 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 8 |
| Pilgrim | 66 | `a.null-counter` | 0.00 | 0.02 | 0 | 0 | 10 | 2 | 16 | 2 | x1.0 | x1.2 | x1.2 | 12 | 12 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 16 |


### 2.4 Items

#### 2.4.1 Item category 

|category | name | short name| core concept |
|-----|----|----|-----------|
|`i.armor` | 鎧 | 鎧 | + `d.physical_defense` |
|`i.robe` | 法衣 | 衣 | + `d.magical_defense` |
|`i.shield ` | 盾 | 盾 | + `d.HP` |
|`i.sword` | 剣 | 剣 | + `d.melee_attack` |
|`i.katana` | 刀 | 刀 | + `d.melee_attack`, - `melee_NoA` |
|`i.gauntlet` | 籠手 | 手 | + `d.melee_NoA` |
|`i.arrow` | 矢 | 矢 | + `d.ranged_attack` |
|`i.bolt` | ボルト | ボ | + `d.ranged_attack`, - `d.ranged_NoA`  |
|`i.archery` | 弓 | 弓 | + `d.ranged_NoA` |
|`i.wand` | ワンド | 杖 | + `d.magical_attack` |
|`i.grimoire` | 魔導書 | 書 | + `d.magical_attack`, - `d.magical_NoA`  |
|`i.catalyst` | 触媒 | 媒 | + `d.magical_NoA`  |

- *note:* item might have multiple bonus. sword may have `d.HP` but subtle value.

#### 2.4.2 Item list

|Tier| base_power | multiplier for　鎧, 衣, 剣, 矢, 杖 | plus for 盾 | base_power (NoA) for 手, 弓, 媒 | fixed NoA for 手, 弓, 媒 |penalty for 刀, ボ, 書| 
|----|------------|--------|-----------|--------|--------|-------|
| 1 | 12 | `c.target_status+0.13` | `c.evasion+0.013` | 0.8 | `c.N_NoA+1` | `c.evasion-0.001`, `c.N_NoA-1.0` |
| 2 | 18 | `c.target_status+0.12` | `c.evasion+0.012` | 0.7 | `c.N_NoA+2` | `c.evasion-0.002`, `c.N_NoA-1.2` |
| 3 | 27 | `c.target_status+0.11` | `c.evasion+0.011` | 0.6 | `c.N_NoA+3` | `c.evasion-0.003`, `c.N_NoA-1.4` |
| 4 | 41 | `c.target_status+0.09` | `c.evasion+0.009` | 0.5 | `c.N_NoA+4` | `c.evasion-0.004`, `c.N_NoA-1.6` |
| 5 | 61 | `c.target_status+0.08` | `c.evasion+0.008` | 0.4 | `c.N_NoA+5` | `c.evasion-0.005`, `c.N_NoA-1.8` |
| 6 | 91 | `c.target_status+0.07` | `c.evasion+0.007` | 0.3 | `c.N_NoA+6` | `c.evasion-0.006`, `c.N_NoA-2.0` |
| 7 | 137 | `c.target_status+0.06` | `c.evasion+0.006` | 0.2 | `c.N_NoA+7` | `c.evasion-0.007`, `c.N_NoA-2.2` |
| 8 | 205 | `c.target_status+0.05` | `c.evasion+0.005` | 0.1 | `c.N_NoA+8` | `c.evasion-0.008`, `c.N_NoA-2.4` |
| 9 | - | `c.target_status+0.04` | `c.evasion+0.004` | - | `c.N_NoA+9` | - |
| 10 | - | `c.target_status+0.03` | `c.evasion+0.003` | - | `c.N_NoA+10` | - |

-　Tier 9 and 10 are Multiplier-Only Tiers. (Unccommon/Rare item upgared reference)

| Item type | base_power/Scale for | base c.multiplier for | subtle_power`d.`, `e.`, and `c.` bonus|
|------|--------|------|------|
|`i.armor` | `d.physical_defense` | `c.physical_defense+v` | additional `d.physical_defense`, `d.HP`, `d.magical_defense`, `b.vitality+1`  |
|`i.robe` |  `d.magical_defense`  | `c.magical_defense+v` | `b.mind+1`, `d.HP`, `c.evasion+0.01` |
|`i.shield ` | `d.HP` | `c.evasion+v` | `d.physical_defense`, `d.melee_attack`, `b.vitality+1` |
|`i.sword` | `d.melee_attack` | `c.melee_attack+v` | `c.accuracy+0.01`, `b.strength+1`, `e.fire`, `d.physical_defense` ,`d.HP` |
|`i.katana` | `d.melee_attack` | `c.melee_attack+V`, `c.evasion-v`, `c.melee_NoA-v` | additional `d.melee_attack`, `c.penet_+0.01`, `c.penet_+0.02`, `b.mind+1` |
|`i.gauntlet` | `d.melee_NoA` | `c.melee_NoA+v` | additional `d.melee_NoA`, `d.physical_defense`, `b.strength+1` |
|`i.arrow` | `d.ranged_attack` | `c.ranged_attack+v` | additional `d.ranged_attack`, `e.fire`, `e.ice` |
|`i.bolt` | `d.ranged_attack` | `c.ranged_attack+v`, `c.evasion-v`, `c.ranged_NoA-v` | additional `d.ranged_attack`, `e.thunder`,`b.strength+1` |
|`i.archery` | `d.ranged_NoA` | `c.ranged_NoA+v` | `c.accuracy+0.01`, `c.accuracy+0.02`, `d.evasion`, `d.HP`, `b.strength+1`|
|`i.wand` | `d.magical_attack` | `c.magical_attack+v` | additional `d.magical_attack`, `d.magical_defense`, `b.intelligence+1` |
|`i.grimoire` | `d.magical_attack` | `c.magical_attack+v`, `c.evasion-v`, `c.magical_NoA-v` | additional `d.magical_attack`, `b.mind+1`, `d.magical_defense` |
|`i.catalyst` | `d.magical_NoA` | `c.magical_NoA+v` | additional `d.magical_NoA`, `e.fire`, `e.ice`, `e.thunder`, `b.intelligence+1` |


**rarelity.amplifier of base_power**

| Item type | common | uncommon | rare | mythic |
|------|--------|--------|--------|--------|
|`i.armor` | x1.0 | x1.2 | x1.44 | x1.73 |
|`i.robe` | x1.0 | x1.2 | x1.44 | x1.73 |
|`i.shield ` | x1.0 | x1.2 | x1.44 | x1.73 |
|`i.sword` | x1.0 | x1.2 | x1.44 | x1.73 |
|`i.katana` | x2.0 | x2.4 | x2.9 | x3.46 |
|`i.gauntlet` | x1.0 | x1.2 | x1.44 | x1.73 |
|`i.arrow` | x0.67 | x0.80 | x0.95 | x1.16 |
|`i.bolt` | x1.33  | x1.60 | x1.92 | x2.30 |
|`i.archery` | x1.0 | x1.2 | x1.44 | x1.73 |
|`i.wand` | x0.5 | x0.6 | x0.72 | x0.86 |
|`i.grimoire` | x1.0 | x1.2 | x1.44 | x1.73 |
|`i.catalyst` | x1.0 | x1.2 | x1.44 | x1.73 |

**Rarelity base**
| Rarelity | Features |
|------|--------|
| common | base_power x rarelity.amplifier, and base c.multiplier |
| uncommon | base_power x rarelity.amplifier + **one subtle_power`d.` or `c.` bonus**, base c.multiplier +1 tier upgrade(ecept penalty) |
| rare | base_power x rarelity.amplifier + **two** subtle_power`d.`, **`e.`**, or `c.` bonus, base c.multiplier +2 tier upgrade(ecept penalty) |
| mythic | base_power x rarelity.amplifier + **three** subtle_power`d.`, `e.`, or `c.` bonus, one **`b.` bonus**, but **no base c.multiplier** |

*Note:* subtle_power: x0.20 ~ x0.34 of base_power value.

- example of basic item:
```
Tier 1 common `i.sword`: `d.melee_attack` +12, `c.physical_attack+0.13`
Tier 1 rare `i.sword`: `d.melee_attack` +17, `d.melee_defense` + 5, `d.HP` +4 , `c.physical_attack+0.13`
Tier 2 common `i.shield`: `d.HP` +18, `c.evasion+0.012`
Tier 3 common `i.gauntlet`: `d.melee_NoA` +0.6, `c.N_NoA+3`
Tier 4 common `i.katana`: `d.melee_attack` +82, `c.evasion-0.004`, `c_melee_NoA-1.6`
Tier 5 common `i.arrow`: `d.ranged_attack` +41, `c.ranged_attack+0.08`

```
#### 2.4.3 Item variation 

**Item Variation Hierarchy**
- Common (12 variations per tier): 1 standard version of every item type.
- Uncommon (24 variations per tier): 2 specialized versions of every item type.
- Rare ( 12 variations per tier): 1 version of every item type. 
- Mythic (2~3 variations per tier)

#### 2.4.4 Item stacking
- Items are stacked based on their unique combination of (superRare title, enhancement title, and base item ID). The default `max_stack` is 99.
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

#### 2.4.4 Item master definitions
- id
- item_category
- tier
- rarelity
- subtle_power (`d.`)
- bonus (`c.`)
- elemental offensive bonus (`e.`)
- elemental resistance bonus (`r.`)
- base status bonus (`d.`)

*note:*
- There are no base duel(`d.`) related status in the master data. because these data is calculated by the formula. Only subtle_power is defined in this master.
- If an item's base_power is `d.HP` = 12 and subtle_power is `d.HP` = 10, then, this item has one `d.HP` = 22 status.
  

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
  },
  "ロングソード": {
    "count": 0,
    "state": "notown"
  }
}
```

**Item master data structure**

## 3. INITIALIZATION 

### 3.1 Randomness initialization
- **Reward:**
  - Populate `g.common_reward_bag` with tickets according to the `g.common_reward_bag` table.
  - Populate `g.uncommon_reward_bag` with tickets according to the `g.uncommon_reward_bag` table.
  - Populate `g.rare_reward_bag` with tickets according to the `g.rare_reward_bag` table.
  - Populate `g.mythic_reward_bag` with tickets according to the `g.mythic_reward_bag` table.

- **Enhancement:**
  - Populate `g.common_enhancement_bag` with tickets according to the `g.common_enhancement_bag` table.
  - Populate `g.enhancement_bag` with tickets according to the `g.enhancement_bag` table.

- **Super Rare:**
  - Populate `g.superRare_bag` with tickets according to the `g.superRare_bag` table.

- **Threat weight:** 
  - Populate `g.physical_threat_weight_bag` with tickets: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2,2,2, 3,3,3,3, 4,4, 5, 6]. 
  - Populate `g.magical_threat_weight_bag` with tickets: [1,2,3,4,5,6]. 

- If a bag is empty or explicitly reset the bag, initialize it.

### 3.2 Initial setup
- Initial setup (or reset condition)

- Party initial condition.
  1. "ケモ", Caninian, 戦(君), Sturdy, House of the Unmoving
  2. "ゴン", Vulpinian, 剣(侍), Chivalric, House of War Spirit
  3. "イタチ", Murid, 忍(盗), Persistent, House of the Breaking Hand
  4. "ロップ", Leporian, 狩(賢), Dexterous, House of Far Sight
  5. "ラス", Felidian, 賢(巡), Pursuing, House of Hidden Principles
  6. "セルヴァ", Cervin, 魔(魔), Canny, House of Guiding Thought

- Party initial inventory.
  - 3 Tier-1 common items of each item type.

- Party initial state.
  - level: 1
  - experience: 0
  - Gold: 200G
  - Auto-sell: none
  - state: 待機中


### 3.3 Character initialization

#### 3.3.1 Level and slots
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

#### 3.3.2 Multiplier and Functions

- c.multiplier like `c.sword_x1.3` applies only for sword item type. other item types like shield may have +10 melee_attack bonus, but shield's melee_attack bonus is not multiplied by `c.sword_x1.3` effect. 

- character.`f.attack`:
  - `d.ranged_attack`= Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier
  - `d.melee_attack`= Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier x `b.strength` / 10
  - `d.magical_attack`= Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier x `b.intelligence` / 10

- character.`f.NoA`: // NoA 0 = No Action.
  - `d.ranged_NoA` = 0 + `c.pursuit+v` bonuses + Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier + `c.ranged_NoA+v` (round up) 
  - `d.magical_NoA`= 0 + `c.caster+v` bonuses + Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier + `c.magical_NoA+v` (round up) 
  - `d.melee_NoA`= 0 + `c.grit+v` bonuses + Item Bonuses x enhancement multiplier x super rare multiplier x its c.multiplier + `c.melee_NoA+v` (round up) 
    - IF the character has `a.iaigiri`, halve these number of attacks, round up. 
  - *note: `c.ranged_NoA+v`, `c.magical_NoA+v`, `c.melee_NoA+v`  Only one single bonuses(c.) of the **exact** same name applies.  


- character.`f.offense_amplifier` (phase: )
  - If phase is CLOSE,
    - If character.`a.iaigiri`, return v x sum of ( `c.melee_attack+v` )
  - Else return 1.0 x  sum of (`c.melee_attack+v` or `c.ranged_attack+v` or `c.magical_attack+v` )

- character.`f.defense_amplifier` (phase: )
  - return max(0.01, 1.00 - sum of (`c.physical_defense+v` or `c.magical_defense+v` ))


- character.`f.accuracy_amplifier` (phase: )
  - If phase is LONG,  return: `d.accuracy_potency`.
  - If phase is MID, return: 1.0 (Fixed value)
  - If phase is CLOSE, return `d.accuracy_potency`.

- character.`f.elemental_offense_attribute`
  - Default is 1. If the damage type has `elemental_offense_attribute`, multiply x V. (ex. fire arrow has `e.fire` and its value is 1.2, multiply 1.2 )
 
- character.`f.penet_multiplier`
  -If character.`c.penet`, add them. (ex. `c.penet_+0.10` & `c.penet_+0.15` -> 0.25)

- character .`f.defense` (phase: phase):
  - If phase is LONG or CLOSE:
  	- `d.physical_defense`: Item Bonuses of Physical defense x enhancement multiplier x super rare multiplier x its c.multiplier x `b.vitality` / 10
  - If phase is MID:
  	- `d.magical_defense`: Item Bonuses of Magical defense x enhancement multiplier x super rare multiplier x its c.multiplier x `b.mind` / 10

#### 3.3.3 Mathematical Precision & Display Rules
- Internal Calculation: All multipliers and final status values are calculated using floating-point precision (e.g., 1.4 * 1.3 = 1.82) to ensure accuracy across multiple stacked bonuses.
- Display Rule (Rounding): For UI and logs, values are rounded to one decimal place (e.g., 1.82 → 1.8).
- Integer Rule: Final damage values and HP values are always floored to the nearest integer for display, though internal logic may retain decimals until the final step.
 
### 3.4 Party initialization
- c.multiplier like `c.amulet_x1.3` applies only for individual character's equipments. 
- Party.`d.HP`: 100 + (Total sum of individual ((Item Bonuses of HP x enhancement multiplier x super rare multiplier x its c.multiplier + level x `b.vitality` ) x (`b.vitality`  + `b.mind`) / 20))

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

## 4. Party State Machine

- Use one state per party. Every party ticks independently.

- **State list**
  - 休息中: at home, heal +1% MaxHP / sec until full
  - 宴会中: at home, spend 33–67% of previous expedition profit (auto-sell gold), duration 5 sec (skip if profit = 0). if party has `a.squander` ability, double the gold spent on feasting (but not exceed its max profit).  Notification : Without Squander: PT1は25Gお金を使った/With Squander: PT1 君主トムは贅沢に50G使った
  - 睡眠中: at home. Duration 10 sec
  - 祈り中: at home, donate 10–33% of previous expedition profit, if party has `a.tithe`, Adds +10% of expedition profit to donation. remaining profits to global gold wallet. duration 5 sec (if profit = 0 → donate 0G, but still pray). The deity earns that amount of gold (keep record internally, later vision it may use this gold for something). Notification: Without Tithe: PT1は10G神に捧げ、30Gを貯金した/With Tithe: PT1 巡礼者ブラザは祈りと共に12G神に捧げて、28Gを貯金した/ Without Gold: (no notification)
  - 待機中: at home, only when 自動周回 = OFF (idle state)
  - 移動中: home → dungeon, duration 5 sec
  - 探索中: in dungeon, advance 1 room / sec, update HP per room; if HP < 30% MaxHP → retreat. At the end of this state, update this {ルピニアンの断崖踏破} part )
  - 帰還中: dungeon → home, duration 5 sec. Back to 休息中

- Player taps 出撃/一斉出撃
  - If party is in 待機中 / 休息中 / 宴会中 / 祈り中:
  - Immediately set state to 移動中
  - Do not refill HP; dungeon starts with current HP. No squander, donation, nor remaining profits to the global wallet. The profit vanishes (The party menders would definitely not be happy with this players emergency sortie.)
  - If party is already in 移動中 / 探索中 / 帰還中: ignore tap


- **Transition rules**
  - 自動周回ON: 休息中→宴会中(if possible)→睡眠中→祈り中→待機中→移動中→探索中→帰還中→休息中
  - 自動周回OFF: 移動中→探索中→帰還中→休息中 → 宴会中(条件付き) → 睡眠中 → 祈り中 → 待機中 (stop here)


### 4.1 Time-Based Progress Handling (Online + AFK)
- The state machine is purely time-based: persist `state` and `state_started_at`, and on each update tick compute progress from `now - state_started_at`, applying any completed transitions to reach the latest state.
- Update `state_started_at` **only when the party state changes** (on every state transition).
- Limit: maximum 60 minutes per catch-up simulation (current version).

**Notification**
- Format: 踏破N回/撤退M回/敗北X回 寄付金額: vG, 貯金額:　vG
- If the value is 0, not display its text (if all zero, then no notification)

```
Exapmle:
PT1: 踏破10回/敗北1回 寄付金額: 10G, 貯金額:　30G
PT2: 踏破1回 寄付金額: 10G, 貯金額:　30G
PT3: 貯金額: 10G
```

## 5. EXPEDITION 
- Persistence through an expedition:`d.HP`.

### 5.1 "Loot-Gate" progression system
- If the party fails to meet the entry requirements, the expedition ends before the Gate Room and they are returned to Home.

| title | Gate `x.floor`,`x.room` | uncommon items from `x.room` |
|----|----|----|
| Entering | 1,1 | correct 1 mythic item from previous expedition ( `x.expedition` -1 ), expect for the first expedition. |
| 1st Elite gate | 1,4 | correct 3 uncommon items from this `x.expedition` |
| 2nd Elite gate | 2,4 | correct 9 uncommon items from this `x.expedition`  |
| 3rd Elite gate | 3,4 | correct 18 uncommon items from this `x.expedition` |
| 4th Elite gate | 4,4 | correct 30 uncommon items from this `x.expedition`  |
| 5th Elite gate | 5,4 | correct 45 uncommon items from this `x.expedition`  |
| Boss gate | 6,4 | correct 3 rare items from this `x.expedition` |


### 5.2 Logs
- `f.quick_summary`:
  - `p.outcome_of_expedition`: 
    - 踏破: victory and complete the whole dungeons 
    - 帰還: victory but not fulfill loot-gate condition 
    - 撤退: draw 
    - 敗北: defeat
  - `p.remaining_HP`: remaining party HP/ max party HP : `340/ 1000`
  - `p.reached_room` / `p.number_of_rooms` : 4/6
  - `p.gained_experience`: ex. +234
  - `p.auto-sell_profit`: Amount of Auto-sell items. ex. 1,224G
  - `p.retrieving_trophies`: Shows items by comma-separated.
    - [C] [U] for Black color, [R] for Blue color, [M] for Dark Orange.
    - With Super Rare titled item, override to BOLD Dark orenge.

```
結果: `p.dungeon_name`   残HP: `p.remaining_HP`   `p.outcome_of_expedition`
▼
EXP: `p.gained_experience` | 自動売却額: `p.auto-sell_profit`
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
X: `p.enemy_name` | `p.outcome_of_room` |  ▼
獲得: `p.reward_from_room`.
```

```
1F-2: 泥まみれキノコ妖 引分▼
獲得:伝説の火打ち石の触媒
(Column 1) 自HP 273 /1,000 [Party HP bar here: Rermaining HP(Blue)/healed HP (Green)  /Taken damage(Dark orange) / max_HP]
(Column 2) 敵HP 20 /320 [Enemy HP bar here: Rermaining HP(Blue) / max_HP]
```

- `f.battle_logs`
  - icon: 
  - `elemental_offense_attribute` -> `e.fire`:🔥, `e.thunder`:⚡, `e.ice`:❄️
  - If there is no elemental attribute (`e.none`), LONG phase:🏹, MID phase:🪄 ,CLOSE phase:⚔

```
戦闘ログ:
[距離] 敵が　対象　に行動名！(N/M回) (icon 数値 in dark orange)
[距離] 味方:行動主 の行動名！(N/M回) (icon 数値　in Blue)

[効] ウルフの 守護者！　(パーティへの物理ダメージ × 2/3)
[効] ベアの 指揮！ (パーティ攻撃力 × 1.3)
[効] ラビの 魔法障壁！ (パーティへの魔法ダメージ × 2/3)

[遠] ミミ の攻撃！(3/4回)              (🏹 120)
[魔] セルヴァ の魔法攻撃！(2/2回)         (🪄 100)
[近] 敵が キツネ丸 に攻撃！(2/2回)       (⚔ 36)
[近] 敵が ミミ に攻撃したが外れた！(0/1回)
[近] キツネ丸 のカウンター！(2/4回)        (⚔ 367)
[近] キツネ丸 の攻撃！(5/7回)             (⚔ 190)
[近] レオン の攻撃は外れた！(0/3回)

[末] 再生の神の効果！(HP回復+25)
[末] 消耗の神の効果！(HP消耗-10)
[末] イタチの解錠 石板の盾 を獲得した！(自動売却対象: 10G)
```

## 6. BATTLE

### 6.1 Encounter Rules
- Each encounter consists of one battle

### 6.2 Function of battle

**Battle Phase**

|Phase |Damage type |number of attacks type |Defense type|
|-----|-----------|-----------|-----------|
|LONG |`d.ranged_attack` |`d.ranged_NoA` | `d.physical_defense` |
|MID |`d.magical_attack` |`d.magical_NoA` | `d.magical_defense` |
|CLOSE |`d.melee_attack` |`d.melee_NoA` | `d.physical_defense` |

- After the CLOSE phase, the battle is over. Party needs to beat enemy within these three phases.


**functions of attack**

- `f.resonance_amplifier`(actor: ,hit: )
  	If actor.`a.resonance`1, return 1.0 + (0.05 x (n - 1))   
  	If actor.`a.resonance`2, return 1.0 + (0.08 x (n - 1))
  	If actor.`a.resonance`3, return 1.0 + (0.11 x (n - 1))
    Else, return 1.0.

- `f.damage_calculation`: (actor: , opponent: , phase: )
	max(1, (actor.`f.attack` - opponent.`f.defense` x (1 - actor.`f.penet_multiplier`) ) x actor.`f.offense_amplifier` x actor.`f.elemental_offense_attribute` x opponent.`f.elemental_resistance_attribute` x opponent.`f.defense_amplifier` x party.`f.party.offense_amplifier` x `f.resonance_amplifier`)

  - note: If actor: enemy, party.`f.party.offense_amplifier` = 1.0

**Row-based modifier** 
- Targeting selects a character only to determine defense, row potency, abilities (counter). All damage resolved against a character is applied to `d.HP`.
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

- `d.accuracy_potency` 
  - A global accuracy modifier applied to a unit’s final output based on their current row position.
  - Row-based modifiers apply only to player characters. Enemies are treated as having fixed potency (1.0).
  - Row-based `d.accuracy_potency` is applied only during LONG and CLOSE phases.
  - MID phase ignores row-based accuracy potency, so has fixed potency (1.0).

- **`d.accuracy_potency`**

|row | normal | `a.hunter`1 | `a.hunter`2 |
|---|---|---|---|
|1| 1.00 | 1.00 | 1.00 |
|2| 0.85 | 0.90 | 0.93 |
|3| 0.72 | 0.81 | 0.86 |
|4| 0.61 | 0.73 | 0.80 |
|5| 0.52 | 0.66 | 0.75 |
|6| 0.44 | 0.59 | 0.70 |


- `f.hit_detection`(actor: , opponent: ,Nth_hit: )
  - For all pahse, LONG, MID, CLOSE. 
  - decay_of_accuracy: clamp(0.86, 0.90 + actor.`c.accuracy+v` - opponent.`c.evasion+v`, 0.98)
  - chance = `d.accuracy_potency` x (decay_of_accuracy)^(Nth_hit)
    - Note: Nth_hit starts at 1 for the first strike.
  - Roll: Return Random(0, 1.0) <= chance


### 6.3 Turn resolution 
- For each phase, actions are resolved in the following order:
    - Enemy attacks
    - Player party attacks

**First strike**
- IF character.`a.first-strike`, the character acts before enemy action. (using `f.damage_calculation`)

**Enemy action**
- Enemy always moves first.
- `f.NoA` times, get `f.targeting` -> target character
  	- If `f.hit_detection`(actor: , opponent: ,Nth_hit: the current hit index), current party.`d.HP` -= `f.damage_calculation` (actor: enemy , opponent: character, phase: phase)
- If currenr party.`d.HP` =< 0, Defeat. 

- *Note:* Nth_hit is global for all enemy attacks in the phase (not per-target)

- **Counter:** IF character.`a.counter` and take damage in CLOSE phase, the character attacks to enemy. (using `f.hit_detection` and `f.damage_calculation`, and character.`f.NoA` x 0.5, round up)
    - Counter triggers immediately after damage resolution, regardless of turn order modifiers.

**Player action**
- Each party member act if he has corresponding damage source in the phase. 

- `f.NoA` times -> enemy
	- If `f.hit_detection`(actor: , opponent: ,Nth_hit: the current hit index), current enemy.`d.HP` -= `f.damage_calculation` (actor: character, opponent: enemy, phase: phase)
- If enemy.`d.HP` =< 0, Victory.

- **Re-attack:** IF character.`a.re-attack`, the character attacks to enemy.  (using `f.hit_detection`, `f.damage_calculation`, and character.`f.NoA` x 0.5, round up)

### 6.4 Post battle


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
- *Defeat*: no penalties (current version). gains `d.experience` points, but no item reward. Back to home without trophies. 
- *Victory*: gains `d.experience` points to a party. has a chance of gaining reward from enemies drop item. Check the conditions bellow.
  - If the party.`d.HP` <= 30% of max HP, back to home with trophies.
  - Normal Rooms (`x.room`:1–2): Proceed to the next `x.room`.
  - Gate Rooms (`x.room`: 3 check): At the end of Room 3, the "Loot-Gate" check occurs. If passed, proceed to `x.room`:4 (Elite/Boss).
  - Elite Rooms (`x.floor`:1-5, `x.room`:4): If `God of Restoration`, **Heal 20% of missing HP** (show the log). IF `God of Attrition`,  **reduce 5% of remaining HP** (show the log).  Proceed to the next floor: `x.floor` +1 , `x.room`:1.
  - Final Boss Room (`x.floor`:6, `x.room`:4): Expedition Clear! Return Home with all trophies.

- *Draw*:no penalties (current version). no `d.experience` points nor item reward at this room. Back to home with trophies of previous rooms.


## 7. REWARD 

- For every item listed in the enemy's potential drop items,
  - If the item is common,
    - Get one ticket from `g.common_reward_bag`. Two with `c.unlock`.
	- If `g.reward_bag`.value = '1', then get one ticket from `g.common_enhancement_bag`.
    - If `g.enhancement_bag`.value >= 1, then get one ticket from `g.superRare_bag`.
  - If the item is uncommon,
    - Gets one ticket from `g.uncommon_reward_bag`. Two with `c.unlock`.
    - If `g.uncommon_reward_bag`.value = '1', then get one ticket from `g.enhancement_bag`.
    - If `g.enhancement_bag`.value >= 1, then get one ticket from `g.superRare_bag`.
  - If the item is rare,
    - Gets one ticket from `g.rare_reward_bag`. Two with `c.unlock`.
    - If `g.rare_reward_bag`.value = '1', then get one ticket from `g.enhancement_bag`.
    - If `g.enhancement_bag`.value >= 1, then get one ticket from `g.superRare_bag`.
  - If the item is mythic,
    - Gets one ticket from `g.mythic_reward_bag`. Two with `c.unlock`.
    - If `g.rare_mythic_bag`.value = '1', then get one ticket from `g.enhancement_bag`.
    - If `g.enhancement_bag`.value >= 1, then get one ticket from `g.superRare_bag`.

  - Combines them into one item.

```
 enhancement:0 -> ロングソード
 enhancement:1, superRare:0 -> 名工のロングソード,
 enhancement:3, superRare:1 -> 世界を征する宿ったロングソード)
```

- **Item Retrieval Logic:**
  - Items are stacked by (superRare, enhancement, and base item) and has state
  - *State:`s.sold` Auto-Sell:* If a dropped item matches a rule with state:`s.sold`, it is sold immediately (not added to inventory, gain Gold)
  - *State:`s.owned` Existing Items:* If the item is already in the inventory, increment the item count
  - *State:(no record) New Items:* If no record for the item exists, the system generates the item and sets it to state:`s.owned`

## 8. UI

- Platform: Web-based (React + TypeScript + Tailwind)
  - Style: Compact, simple, iOS-like
  - Navigation: Minimal scene transitions, tab-centered
- Interaction philosophy:
  - Fast feedback
  - No modal spam
  - Most actions resolve immediately
  
- **Color Scheme**
- Base colors
  - Text: Black
  - Pane / card background: Gray
  - Page background: White
- Sub color (~30%)
  - Blue (information, selection, links)
- Accent color (~5%)
  - Dark Orange (important actions, warnings, highlights)

### 8.1 Notification Logic & Display
**Visual & Overlay (Toast)**
- Position: bottom and left side
- Layout:
  	- Flex-col-reverse (Newest notifications appear at the bottom, pushing older ones up).
  	- Dynamic Width: The box size must shrink or grow to fit the length of the text precisely (with padding).
- Text and color:
    - [C] [U] for Black color, [R] for Blue color, [M] for Dark Orange. White translucent background, no border color.
    - With Super Rare titled item, override to BOLD Dark orenge. White translucent background, no border color.
- Behavior: Auto-dismiss after 5000ms. Manual dismiss **all of notification** on onClick. Status update dismisses previous status changes notification. (display only latest status changes)

**Notification Logic**
- Item Drops
	- When an item drops (exclude auto-sell items), it triggers the notification with Normal style. If the item is Super Rare, The style switchs to Rare style.
    - displays party number like. ex: "PT1:名工の銅の籠手を入手"
	- Logic: 伝説のショートソード triggers the rareStyle.
  	- Animation: animate-bounce (once) + animate-pulse (continuous).

- Status Changes
	- When equipping/unequipping, it compares the old value to the new value.
    - Multi-line Trigger: If an equipment change affects multiple stats, each stat change generates its own notification block. Same clculatuon and display logic of status.  
		- Positive Change: 物防 24 → 52 (Normal style, Bold text)
		- Negative Change: 近攻 120 → 84 (Normal style, Normal weight text)


### 8.2 Header
- Always fixed at the top.
- Displays:
  - Game title + version + (env)
    - env label by URL subpath const getEnvLabel = () => {
  const p = window.location.pathname; // e.g. "/Kemo-Expedition/dev/..."
  if (p.includes("/dev/")) return "開発環境";
  if (p.includes("/qa/")) return "αテスト";
  return "";  };
  - Use this specification's version
```
(Left-aligned)             (Right-aligned)
ケモの冒険　v0.2.3 (αテスト)        200G
```
- Tab header (primary navigation):
  - Party
  - Expedition
  - Inventory
  - Diary
  - Divine Bureau

- Header is always visible; tabs never cause full page reload.

### 8.3 Party tab
#### 8.3.1 Displays

- List of party
  - Potentially there are 6 parties.
```
  PT1    PT2    PT3    PT4    PT5     PT6
```
- Name of deity. Editable, but not duplication. If one deity already assgined to another PT, the deity is not selectable.

```
(Left-Aligned)                         (Right-Aligned)
再生の神 (Level: 29, Experience 123450/ 123456)    [編集]
```
 
- List of party members
    	For each character: Icon, main Class (Sub calass).
```
🐶
戦(剣)
```

- Current status, abilities, bonuses

#### 8.3.2 Party member details
- Name, race, main class (sub class), predisposition, lineage, status, bonuses (c., aggregated), ability (a. )
- Status:

- If character has `c.grit+v`, displays 
近接攻撃:98 x 4回(x1.00)
- if character has  `c.pursuit+v`, displays 遠距離攻撃:`d.ranged_attack` x `d.ranged_NoA`回(x`f.offense_amplifier`(phase: LONG)).
  - ex. 遠距離攻撃:25 x 6回(x1.13)
- if character has `c.grit+v` or `c.pursuit+v`, displays 物理命中率: `d.accuracy_potency`　x 100 % (減衰: x (0.90 + `c.accuracy+v`)).  (ex. has `c.accuracy+0.02` and `c.accuracy+0.01`, then 0.90 + 0.02 + 0.01 -> 0.93 )
  - ex. 物理命中率: 72% (減衰: x0.90)
- If character has `c.caster+v`, displays 魔法攻撃:`d.magical_attack` x `d.magical_NoA`回(x`f.offense_amplifier`(phase: MID)). and 魔法命中率: 100 % (減衰: x (0.90 + `c.accuracy+v`)).  (ex. has `c.accuracy+0.02` and `c.accuracy+0.01`, then 0.90 + 0.02 + 0.01 -> 0.93 )
  - ex. 魔法攻撃:36 x 3回(x1.26)
  - ex. 魔法命中率: 100% (減衰: x0.90)

- Accuracy is internally calculated using the unified stats c.accuracy and c.evasion for all attack types.
- Physical Accuracy and Magical Accuracy are separated for display purposes only, based on battle phase rules.
- The MID phase ignores row-based d.accuracy_potency and is treated as fixed potency 1.00.

- *UI Formatting Note:* When displaying aggregated c.multipliers (e.g., 鎧 x1.8), always round the internal product to the first decimal place for a cleaner interface. 


```
レオン                      [編集]
🐶 ケイナイアン / 戦士(師範) / 頑強 / 不動の家
[体力:13] [力:10] [知性:10] [精神:10]
—————
Left-aligned            Right-aligned
近接攻撃:98 x 4回(x1.00)     属性:無(x1.0)
物理命中率: 85% (減衰: x0.90)     物防:108 (71%)
                              魔防:56 (83%)
                              回避:+4
—————
ボーナス: 護x1.3, 弓x1.1, 鎧x1.8, 装備+1, 根性+1, 体+3
特殊能力:
守護者: パーティへの物理ダメージ × 3/5
```

#### 8.3.3 Character Edit Mode (selected member):
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

#### 8.3.4 Equipment management
**1. Interaction Rules:**
- **Auto-Equip:** - If there is an empty slot and the player taps an item in the inventory, that item is automatically equipped to the first available slot.
- **Replace (Single-Tap):** - Tapping an item already in a Character Slot "selects" it. Tapping an item in the inventory while a slot is selected replaces the current item with the new one.
- **Remove (Double-Tap):** - Double-tapping an item in a Character Slot removes it and returns it to the inventory.
- **Remove (Single-tap):** - Single-tap an **equipped item in inventory** and returns it to be unequipped item in inventory.
- Status updates in real time

**2. Equipment Sort logic:**
- Order: Descending order by Priority.
- Priority:
    1. Item category: 鎧>衣>盾>剣>刀>手>矢>ボ>弓>杖>書>媒 
    2. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
    3. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
    4. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.

**2. Inventory Pane:**
  - Always visible on the same screen at the bottom.
  - Stacked by item variant
  - Filter button by rarelity (right-aligned): 全て表示, 通常のみ, アンコモンのみ, レアのみ, 神魔レアのみ : [ALL] [C] [U] [R] [M] |超レア: ON/OFF
    - IF player selects [M],  　　神魔レアのみ: [ALL] [C] [U] [R] **[M]** 
    - 超レア[ON/OFF] default: OFF, if ON, filter superRare >= 1.
  - Inventory includes item category tabs:
    - Displays [耐久:鎧,衣,盾] for all character
    - If character has `c.grit+v`, displays [近距離攻撃:剣,刀,手]
    - If character has `c.pursuit+v`,
displays [遠距離攻撃:矢,ボ,弓]
    - If character has `c.caster+v`, displays [魔法攻撃:杖,書,媒]

    - Default: 鎧 or previously selected category of each character 
    - Each box has two lines:
      - First line, small and gray letters: 耐久
      - Second line, current design: 鎧,衣,盾
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
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x2 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```

↓(Taps "名工のショートソード" to equip it)

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x2 [C] 近攻+22
名工のショートソード x3 [C] 近攻+10
🐶名工のショートソード x1 [C] 近攻+10
```

↓(Taps "🐶名工のショートソード" to unequip it)

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x2 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```

↓(Taps "伝説のショートソード" to equip it)

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x1 [C] 近攻+22
🐶伝説のショートソード　x1 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```

↓(Taps "伝説のショートソード" again to equip it)

```
宿ったロングソード x2 [C] 近攻+31
🐶伝説のショートソード　x2 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```

↓(Taps "🐶伝説のショートソード" to unequip it)

```
宿ったロングソード x2 [C] 近攻+31
伝説のショートソード　x1 [C] 近攻+22
🐶伝説のショートソード　x1 [C] 近攻+22
名工のショートソード x4 [C] 近攻+10
```   

#### 8.4 Expedition
- If 自動周回 is ON, it repeats repart to the dungeon **every 5 seconds** (for this version). Default is OFF.

```
          (Right-Aligned)
           [一斉出撃] 自動周回 ON/OFF

PT1ルピニアンの断崖踏破▼
(column 1)      (Column 2)
HP (HP bar, blue)    移動中(state progress bar)
ルピニアンの断崖(pull down list)  出撃
次の目標: ルピニアンの断崖の神魔レアアイテム 0/1 でヴァルピニアンの樹林帯 開放
Lv: 29 | 再生の神 | +2,856EXP | +134G

PT2...
```
- Per party:
  - Currently selected dungeon with Loot-Gate conditions (ex. 2nd Elite Gate is locked: 2/6 Floor 2 Uncommons collected.)
  - List of available dungeons with Loot-Gate conditions
  - Expedition behavior:
    - Expedition resolves immediately
    - No loading scenes
  - Show latest `f.quick_summary`.
    - Tapping the quick summary shows a `f.list_of_rooms`.
    - Tapping a room opens the `f.battle_logs`.
  - 次の目標: show next Loot-Gate condition. 

#### 8.5 Inventory
- Behavior:
  - Notification pops up when acquiring a new item
  - Newly acquired items are shown in bold
  - Once displayed, text returns to normal
- Item list:
  - Stacked by item variant
  - Shows state:`s.owned` items
  - Filter button by rarelity (right-aligned): 全て表示, 通常のみ, アンコモンのみ, レアのみ, 神魔レアのみ: [ALL] [C] [U] [R] [M] |超レア: ON/OFF
    - IF player selects [M],   神魔レアのみ: [ALL] [C] [U] [R] **[M]** 
    - 超レア[ON/OFF] default: OFF, if ON, filter superRare >= 1.
  - Inventory includes item category tabs:
    - [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒].
    - Default: 鎧 or previously selected category. 
    - Each box has two lines:
      - First line, small and gray letters: 耐久
      - Second line, current design: 鎧,衣,盾
    - Only items matching the selected category are shown (filter)
  - **Inventory Sort Logic (within category):**
	- **Order:** Descending order by Priority.
	- **Priority:**
	   1. Base Item ID: Higher-tier base items (e.g., Mythril Sword > Iron Sword) appear first.
	   2. Super Rare Title: Items with Super Rare titles are prioritized within their base item ID.
	   3. Enhancement Tier: Among the same Item ID, higher enhancements (e.g., 究極の > 伝説の) appear higher.
  - Item Row: The name, count, and status are left-aligned, while the sell all button is right-aligned on the same line 
    - ex. 名工のロングソード x3 | 近攻+19     [全売却 39G]
  - Sell all button(全売却): Sells all item, with a warning message, and Changes item state from `s.owned` to `s.sold`
  - Inventory pane shows at least 10 items
- Actions:
  - Sell item stacks
  - Sold items disappear immediately

- **Auto-sold list** (Collapsed by default; tap to expand)
  - Sort and filter settings also apply to this list (displaying items with the state:`s.sold`)
  - Item Row: The name, count, and status are left-aligned, while the Unlock button is right-aligned on the same line
    - ex. 名工のロングソード x3 | 近攻+19     [解除]
  - Unlock button(解除): Changes item state from `s.sold` to `s.notown`

#### 8.6 Diary
- When a party was defeated, got mythic item, and acquiring super rare item, the diary updates. 
- It keeps 10 battle logs. First, it is collapsed and expand to see the detail. (Same as 結果 log in expedition. )
- Top record is latest (default position) and bottom is older logs. 

- Setting. 
```
日誌記録設定                 ▼

超レア通知 (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
神魔レア通知  (pull down list)全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default: 全て)
レア通知 (pull down list) 全て, 名工以上, 魔性以上, 宿った以上, 伝説以上, 恐ろしい以上, 究極, なし (Default:恐ろしい以上)
敗北通知 あり/なし
```

- Title of dirary 
```
(Left-Aligned)         (Right-aligned)
line1: [PT2]神魔レア(秘奥真理の書) 獲得      ▼
line2 gray text: ケイナイアン平原      02/12 20:28
(Left-Aligned)         (Right-aligned)
line 1: [PT1] 敗北の記録           ▼
line  gray text2: ヴァルピニアンの樹林帯      02/12 20:28
```


  
#### 8.7 Divine Bureau (神聖局)


**1.Donation box (寄付箱)**
- Display donated amount of gold of each god.


- Donation Scaling (Divine Bureau)
  - For each god g:
  - Let D_g be total donated gold to god g.
  - Convert donation to tier T_g using thresholds. 
  - Use effectiveTier = min(T_g, 10).
  - displayRank = tierIndex + 1
  - thresholds: [0, 500, 1200, 2200, 3600, 5500, 8000, 11000, 14500, 18500, 23000]

- God scaling:
  - Restoration:
    heal_missing_pct = clamp(0.20 + 0.005*effectiveTier, 0.20, 0.30)
    trigger_every_rooms = 4
  
  - Attrition:
    attack_bonus = 20 + 0.5*effectiveTier
    hp_loss_pct = max(0.05 - 0.001*effectiveTier, 0.03)
    trigger_every_rooms = 4
  
  - Fortification:
    physical_def_bonus = clamp(10 + 0.2*effectiveTier, 10, 20)
    magical_def_bonus  = clamp(10 + 0.2*effectiveTier, 10, 20)
  
  - Precision:
    accuracy_bonus = clamp(0.020 + 0.0005*effectiveTier, 0.020, 0.035)
    evasion_penalty = clamp(-0.005 - 0.0002*effectiveTier, -0.010, -0.005)
  
  - Evasion:
    evasion_bonus = clamp(0.015 + 0.0006*effectiveTier, 0.015, 0.030)
  
  - Resonance:
    resonance_upgrade_tiers = 1 + floor(effectiveTier/5)
    magical_def_penalty = clamp(-5 + 1*effectiveTier, -5, 0)


```
(Left-aligned)      (Right-aligned)
再生の神(ランク3)      1,203G (次のランク 2,200G)
消耗の神(ランク2)         545G (次のランク 2,200G)
防備の神(ランク1)         0G (次のランク　500G)
...

```


**2. Clairvoyance (未来視)**
- Displays belows 

**Normal reward (通常報酬)**
  - common_reward_bag (通常報酬 抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り counts
  -	common_enhancement_bag (称号付与 抽選確率): 
    - 通常称号抽選: remaining / total counts
    - 名工の残り counts / initial counts
    - 魔性の残り counts / initial counts
   	- 宿った残り counts / initial counts
    - 伝説の残り counts / initial counts
    - 恐ろしい残り counts / initial counts
    - 究極の残り counts / initial counts
- Button (通常報酬初期化): Initialize `g.common_reward_bag` and `g.common_enhancement_bag` 

**Unieque reward (固有報酬)**
  - uncommon reward_bag (アンコモン抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  - rare reward_bag (レア抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  - mythic reward_bag (神魔レア抽選抽選確率):  
    - 報酬抽選: remaining / total counts 
    - 当たり残り remaining
  -	enhancement_bag (称号付与 抽選確率): 
    - 通常称号抽選: remaining / total counts
    - 名工の残り remaining / initial counts
    - 魔性の残り remaining / initial counts
   	- 宿った残り remaining / initial counts
    - 伝説の残り remaining / initial counts
    - 恐ろしい残り remaining / initial counts
    - 究極の残り remaining / initial counts
- Button (固有報酬初期化): Initialize `g.common_reward_bag`, `g.uncommon_reward_bag`, `g.rare_reward_bag`, `g.mythic_reward_bag`  and `g.enhancement_bag` 

**Super rare reward (超レア報酬)**
  - superRare_bag (称号超レア称号付与 抽選確率):
    - 超レア称号抽選: remaining / total counts
    - 超レア残り remaining / initial counts
- Button (超レア報酬初期化): Initialize `g.superRare_bag` 

**3. Item Comedium (アイテム図鑑)**
- The Item Compendium acts as a global reference for all items within the game. Unlike the Inventory, it displays the base potential of every item, regardless of ownership status.
- View Settings:
  - Visibility: Shows all items in the database (including undiscovered items).
  - Standardized Stats: Displays item data at base level (Enhancement = 0, SuperRare = 0).
  - Filter button by rarelity (right-aligned): 全て表示, 通常のみ, アンコモンのみ, レアのみ, 神魔レアのみ: [ALL] [C] [U] [R] [M]
  	- IF player selects [M],   神魔レアのみ: [ALL] [C] [U] [R] **[M]** 
- Item category tabs: (same as Inventory tab's item list)
  - [耐久:鎧,衣,盾],[近距離攻撃:剣,刀,手],[遠距離攻撃:矢,ボ,弓],[魔法攻撃:杖,書,媒].
  - Default: 鎧 or previously selected category of each character 
- UI Behavior:
  - Items are listed in a Collapsed View by default.
  - Interaction: Tap an item name to expand the detailed status panel.


**4. Bestiary (敵キャラクター図鑑)**
- A comprehensive record of all threats encountered (or to be encountered) during expeditions.
- Expedition category tabs: 原, 崖, 樹, 峰, 茂, 巣, 園, 谷
  - Each letter represents for corresponding expedition. And tap to show the enemy list of it. 

- Categorize by floor (`x.Spawn_pool`) and is reverse order of rooms (Boss first, then floor6 Normal enemies, floor 5 elite and floor 5 normal enemies…

- Enemy name: List of specific enemies found within that expedition.
  - Default: Collapsed.
- UI Behavior:
  - Interaction:
    - Tap Enemy name, Opens detailed enemy status (same logic as battle). Including drop items.
    - If enemy has no attack values, not show the corresponding values. 

```
(column 1)              (column 2)
ID: 5005                クラス: 戦士
HP: 312                 経験値: 88    
遠距離攻撃: 33 x 2回 (x1.00) 属性: 雷 (x1.2)
近接攻撃: 35 x 6回 (x1.00)  物理防御: 10 (83%)
物理命中率: 100% (減衰: x0.90) 魔法防御: 8 (80%)
魔法攻撃: 117 x 4回 (x1.00)
魔法命中率: 100% (減衰: x0.90)

(column 1)              (column 2)
ID: 5015                クラス: 魔法使い
HP: 312                 経験値: 88    
魔法攻撃: 117 x 4回 (x1.00)   属性: 雷 (x1.2)
魔法命中率: 100% (減衰: x0.90)  物理防御: 10 (83%)
                        魔法防御: 8 (80%)

```


**4. Game Reset**
  - Full reset option
  - Warning required before execution


## 9. Environment

**Branch:** `main` → `/dev/`, `qa` → `/qa/`.
**Environment:** `/dev/` = 開発機, `/qa/` = αテスト; display the environment label in the version line.
**Save Data Isolation:** Save data must be namespaced per environment (`/dev/` and `/qa/`) and never shared between them.



## 10. CHANGELOG

|Version  |Changes                                                                               |
|---------|--------------------------------------------------------------------------------------|
| **0.2.4** | Party State Machine update, AFK mode.  |
| 0.2.3 | Accuracy update. Magic is now respect `f.hit_detection`. |
| 0.2.2| Game balance modified, Enemy status mutipliers update, 2.3.3 Base data structure (enemy) update |
| 0.2.1 | Update:8.7 Divine Bureau, 1. Clairvoyance (add total counts at Normal reward ), Adding 2. Item Comedium and 3. Bestiary |
| 0.2.0 | Big update: 2.1 Global constants (change randamness upgrade), 2.3 Expedition & Enemies, 2.4 Items, 3. INITIALIZATION, 5.1 "Loot-Gate" progression system, 6.5 Outcome  7. REWARD (change the logic), 8.4 Expedition, 8.7 Divine Bureau (setting)  |
| 0.1.4 |                                                                |
    
**END OF SPECIFICATION**
