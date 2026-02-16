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

**`a.*` Ability List (Japanese)**

| `a.` ability | 表示 | 説明 |
|----|----|----|
| `a.defender`2 | 守護者1 | 味方全体が受ける物理ダメージを **2/3倍** にする |
| `a.defender`1 | 守護者2 | 味方全体が受ける物理ダメージを **3/5倍** にする |
| `a.counter`1 | 反撃1 | 敵の**近距離攻撃**を受けたとき反撃する(攻撃回数は半減) |
| `a.counter`2 | 反撃2 | 敵の**近距離・中距離攻撃**を受けたとき反撃する(攻撃回数は半減) |
| `a.re-attack`1 | 連撃1 | 攻撃時に **追加攻撃を1回**行う(攻撃回数は半減) |
| `a.re-attack`2 | 連撃2 | 攻撃時に **追加攻撃を2回**行う(攻撃回数は半減) |
| `a.iaigiri`1 | 居合斬り1 | 物理ダメージをx2.0倍する。攻撃回数が半減する |
| `a.iaigiri`2 | 居合斬り2 | 物理ダメージをx2.5倍する。攻撃回数を半減する |
| `a.command`1 | 指揮1 | 与える物理ダメージを **1.3倍** にする |
| `a.command`2 | 指揮2 | 与える物理ダメージを **1.6倍** にする |
| `a.squander` | 浪費 | 宴会で消費するゴールドが **2倍** になる |
| `a.hunter1` | 狩人1 | 列による命中率減衰を **1列ごと15%→10%** に軽減する |
| `a.hunter2` | 狩人2 | 列による命中率減衰を **1列ごと15%→7%** に軽減する |
| `a.resonance`1| 共鳴1 | 魔法攻撃 1回毎に、全ヒットのダメージが **+5%** 増加する |
| `a.resonance`2 | 共鳴2 | 魔法攻撃 1回毎に、全ヒットのダメージが **+8%** 増加する |
| `a.resonance`3 | 共鳴3 | 魔法攻撃 1回毎に、全ヒットのダメージが **+11%** 増加する |
| `a.resonance`4 | 共鳴4 | 魔法攻撃 1回毎に、全ヒットのダメージが **+13%** 増加する |
| `a.resonance`5 | 共鳴5 | 魔法攻撃 1回毎に、全ヒットのダメージが **+15%** 増加する |
| `a.m-barrier`1 | 魔法障壁1 | 味方全体が受ける魔法ダメージを **2/3倍** にする |
| `a.m-barrier`2 | 魔法障壁2 | 味方全体が受ける魔法ダメージを **3/5倍** にする |
| `a.deflection` | 矢払い |　敵の遠距離攻撃の命中率を **10%低下** させる |
| `a.first-strike`1 | 先制攻撃1 | 行動が速くなる |
| `a.first-strike`2 | 先制攻撃2 | 行動がとても速くなる |
| `a.tithe` | 十分の一税 | 遠征利益の **+10%** を寄付額に上乗せする |
| `a.null-counter` | 反撃無効化 | 反撃を無効化する |

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
|フェリディアン(Felidian) |`c.robe_x1.3`, `a.first-strike`1 |9,9,10,12| 😺Cat |
|マステリド(Mustelid) | `c.gauntlet_x1.3`, `c.arrow_x1.3` |10,10,9,11| 🦡Ferret |
|レポリアン(Leporian) | `c.archery_x1.3`,  `c.armor_x1.3` |9,8,11,10| 🐰Rabbit |
|セルヴィン(Cervin) |`c.wand_x1.3`, `c.shield_x1.2` |6,7,13,10| 🦌Deer |
|ミュリッド(Murid) |`c.penet_+0.10`, `c.bolt_x1.3`  |9,8,10,10| 🐭Mouse |


- **predisposition(性格):**

|predisposition | short word | bonus |
|-----|---|-----------|
|頑強 (Sturdy)| 頑 |`b.vitality+2`,  `c.armor_x1.1`|
|俊敏 (Agile)| 俊 | `c.evasion+0.01` |
|聡明 (Brilliant)| 聡 |`c.wand_x1.2`|
|器用 (Dexterous)|　器  |`c.accuracy+0.01`, `c.catalyst_x1.2`|
|騎士道 (Chivalric)| 騎 |`c.sword_x1.2`, `c.bolt_x1.1`|
|士魂 (Shikon)| 士 |`b.strength+1`, `c.katana_x1.1`, `c.arrow_x1.2`|
|追求 (Pursuing)| 追 |`b.intelligence+2`, `c.robe_x1.1`|
|商才 (Canny)| 商 |`c.equip_slot+1`|
|忍耐(Persistent)| 耐 |`b.mind+1`, `c.robe_x1.1`|

- **lineage(家系):**

|lineage | short word | bonus |
|-----|---|-----------|
|鋼誓の家（House of Steel Oath）| 鋼 |`c.sword_x1.3` |
|戦魂の家（House of War Spirit）| 魂 |`c.katana_x1.2`, `b.mind+1`|
|遠眼の家（House of Far Sight）| 眼 |`c.arrow_x1.3`|
|不動の家（House of the Unmoving）| 不 |`c.armor_x1.2`, `b.vitality+1` |
|砕手の家（House of the Breaking Hand）| 砕 |`c.gauntlet_x1.2`, `b.strength+1`|
|導智の家（House of Guiding Thought）| 導 |`c.wand_x1.3`|
|秘理の家（House of Hidden Principles）| 秘 |`c.robe_x1.2`, `b.intelligence+1`|
|継誓の家（House of Inherited Oaths）| 継 |`c.shield_x1.2`, `b.vitality+1`|

- **classes:**

|class | main/sub bonuses | main bonus | master bonus | 
|-----|-----------|---------|---------|
|戦士(戦,Fighter) | `c.grit+1`, `c.equip_slot+1`,  `c.armor_x1.4` |`a.defender`1: Incoming physical damage to party × 2/3 |`a.defender`2: Incoming physical damage to party × 3/5 | 
|剣士(剣,Duelist) | `c.grit+1`, `c.sword_x1.4` | `a.counter`1: enemy CLOSE-range attack (`f.NoA` x 0.5)  | `a.counter`2: enemy CLOSE-range attack and MID-range (`f.NoA` x 0.5)  | 
|忍者(忍,Ninja) | `c.grit+1`, `c.penet_+0.15` | `a.re-attack`1: once when attacking (`f.NoA` x 0.5) | `a.re-attack`2: twice when attacking (`f.NoA` x 0.5) | 
|侍(侍,Samurai) | `c.grit+1`, `c.katana_x1.4` |`a.iaigiri`1: Physical damage ×2,  number of attacks ÷2 | `a.iaigiri`2: Physical damage ×2.5,  number of attacks ÷2 |
|君主(君,Lord) | `c.grit+1`, `c.gauntlet_x1.4`, `c.equip_slot+1` |`a.command`1: Physical damage x1.3. `a.squander`:double the gold spent on feasting. |`a.command`2: Physical damage x1.6. `a.squander`:double the gold spent on feasting. | 
|狩人(狩,Ranger) | `c.pursuit+2`, `c.arrow_x1.4` | `a.hunter`1: Reduces row-based damage decay from 15% to 10% per step. |`a.hunter`2: Reduces row-based damage decay from 15% to 7% per step. | 
|魔法使い(魔,Wizard) | `c.caster+1`, `c.wand_x1.4` | `a.resonance`1:All hits +5% damage per `d.magical_NoA`. | `a.resonance`2:All hits +8% damage per `d.magical_NoA`. | 
|賢者(賢,Sage) | `c.caster+2`, `c.robe_x1.4`, `c.grimoire_x1.2`, `c.equip_slot+2` | `a.m-barrier`1: Incoming magical damage to party × 2/3 | `a.m-barrier`2: Incoming magical damage to party × 3/5 | 
|盗賊(盗,Rogue) | `c.pursuit+1`, `c.unlock` additional reward chance |`a.deflection`: During LONG phase only, opponent ranged attacks suffer −10 percentage points to hit chance. `a.first-strike`1 |`a.deflection`: During LONG phase only, opponent ranged attacks suffer −10 percentage points to hit chance. `a.first-strike`2. | 
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
|`God of Resonance`| 共鳴の神 | Upgrade all `a.resonance` values by +1 tier. Add `c.magical_defense-5`to each party member.|


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

| `x.floor` | `x.room` | `x.room_type` | `x.floor_HP_mult` | `x.floor_atk_mult` | `x.floor_NoA_mult` | `x.floor_atk_amp_mult` | `x.floor_def_mult` | `x.floor_def_amp_mult` | `x.Spawn_pool`, drops | `x.key_concept` |
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
- `f.defense_amplifier` : 1.0 x `x.exp_def_amp_mult` x `x.floor_def_amp_mult`  //for physical and magical defense
- `f.elemental_offense_attribute` :  not scale
- `f.elemental_resistance_attribute` : not scale
- `f.penet_multiplier`: not scale
- `d.experience`: master value x `x.exp_mult` x (If Elite, 2.0. Else if Boss, 5.0. Else 1.0)

#### 2.3.3 Base data structure (enemy)

| Class | `d.HP` | `a.ability` | `c.accuracy` | `c.evasion` | `d.ranged_attack` | `d.ranged_NoA` | `d.magical_attack` | `d.magical_NoA` | `d.melee_attack` | `d.melee_NoA` | `d.ranged_attack_amplifier` | `d.magical_attack_amplifier` | `d.melee_attack_amplifier` | `d.physical_defense` | `d.magical_defense` | `e.fire` | `e.ice` | `e.thunder` | `r.fire` | `r.ice` |`r.thunder` | `d.experience` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Fighter | 75 | (none) | 0.00| 0.02 | 0 | 0 | 0 | 0 | 16 | 2 | x1.0 | x1.0 | x1.0 | 16 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Duelist | 50 | `a.counter`1 | 0.01 | 0.01 | 0 | 0 | 0 | 0 | 20 | 4 | x1.0 | x1.0 | x1.2 | 10 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Ninja | 47 | `a.re-attack`1 | 0.00 | 0.04 | 10 | 2 | 0 | 0 | 14 | 2 | x1.1 | x1.0 | x1.1 | 10 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 14 |
| Samurai | 40 | (none) | -0.05 | -0.01 | 0 | 0 | 0 | 0 | 40 | 2 | x1.0 | x1.0 | x1.3 | 8 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 12 |
| Lord | 60 | (none) | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 18 | 4 | x1.0 | x1.0 | x1.1 | 14 | 14 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 20 |
| Ranger | 38 | (none) | 0.03 | 0.01 | 14 | 4 | 0 | 0 | 0 | 0 | x1.2 | x1.0 | x1.0 | 8 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 12 |
| Wizard | 32 | (none) | 0.00 | 0.00 |0 | 0 | 20 | 2 | 0 | 0 | x1.0 | x1.2 | x1.0 | 6 | 14 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Sage | 38 | (none) | 0.00 | 0.00 |0 | 0 | 10 | 4 | 0 | 0 | x1.0 | x1.2 | x1.0 | 8 | 20 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Rogue | 30 | `a.deflection`, `a.first-strike`1 | 0.06 | 0.06 | 10 | 4 | 0 | 0 | 10 | 4 | x1.2 | x1.0 | x1.0 | 8 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 8 |
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


**type.amplifier of base_power**

| Item type | `type_amplifier` |
|------|--------|
|`i.armor` | x1.0 |
|`i.robe` | x1.0 |
|`i.shield` | x1.0 |
|`i.sword` | x1.2 |
|`i.katana` | x2.4 |
|`i.gauntlet` | x1.0 |
|`i.arrow` | x0.67 |
|`i.bolt` | x1.33  |
|`i.archery` | x1.0 | 
|`i.wand` | x0.5 |
|`i.grimoire` | x1.0 |
|`i.catalyst` | x1.0 |

**rarelity.amplifier of base_power**

| Rarelity | `rarelity.amplifier` |
|------|--------|
| common | x1.0 |
| uncommon | x1.2 |
| rare | x3.0 |
| mythic | x6.0 |

**Rarelity base**
| Rarelity | Features |
|------|--------|
| common | base_power x `type_amplifier` x rarelity.amplifier, and base c.multiplier |
| uncommon | base_power x `type_amplifier` x rarelity.amplifier + **one subtle_power`d.` or `c.` bonus**, base c.multiplier +1 tier upgrade(ecept penalty) |
| rare | base_power x `type_amplifier` x rarelity.amplifier + **two** subtle_power`d.`, **`e.`**, or `c.` bonus, base c.multiplier +2 tier upgrade(ecept penalty) |
| mythic | base_power x `type_amplifier` x rarelity.amplifier + **three** subtle_power`d.`, `e.`, or `c.` bonus, one **`b.` bonus**, but **no base c.multiplier** |

*Note:* subtle_power: x0.20 ~ x0.34 of base_power x `type_amplifier` x rarelity.amplifier value.

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
