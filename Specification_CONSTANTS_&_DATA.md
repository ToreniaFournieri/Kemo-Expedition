## 2. CONSTANTS & DATA

**Naming Rule**

| Prefix | Description / Definition |
|-------|-------------------------|
| `a.` | **A**bility. Unique/Strongest. If multiple abilities share the same name, only the one with the highest value (or the highest priority) is active. |
| `b.` | **B**ase Status (Core attributes) and Base status bonus |
| `c.` | **C**ategory Bonus. Only one single bonuses(c.) of the **exact** same name applies. |
| `d.` | **D**uel Status (Current combat values). the bonus is stackable. |
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

d. bonus (stackable)

| `d.` | Display |
|---|----|
|`d.accuracy-v`| 命中-v |
|`d.evasion-v` | 回避-v |
| `d.melee_NoA-v` | 近回数-v | 
| `d.ranged_NoA-v` | 遠回数-v | 
| `d.magical_NoA-v` | 魔回数-v |

- Translation

| name | Japanese | short word |
|----|-----|---|
| common | 通常 | [C] |
| uncommon | アンコモン | [U] |
| rare | レア | [R] |
| mythic | 神魔レア | [M] |

**`c.` ボーナス一覧(表示名・説明)**
- "c. ボーナス説明 (同一名ボーナスは重複無効)"
- "b. ボーナス説明 (重複有効)"

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
| `c.penet+v` | 貫通+v*100% | 敵の防御力を　v*100% 分無視する |
| `b.vitality+v` | 体+v | 基礎体力に v を加算（HP/物防に影響） |
| `b.strength+v` | 力+v | 基礎筋力に v を加算（近接火力に影響） |
| `b.intelligence+v` | 知+v | 基礎知性に v を加算（魔法火力に影響） |
| `b.mind+v` | 精+v | 基礎精神に v を加算（HP/魔防に影響） |
| `c.growth_xV` | 成長V倍 | キャラクター個人のHP基礎値及びアイテムHP増加値V倍 |
| `c.physical_attack+v` | 物攻+v% | 遠距離攻撃・近距離攻撃の最終ダメージを v% 乗算強化する |
| `c.physical_offense_multiplier_xV` | 物攻撃V倍 | 遠距離攻撃・近接攻撃がV倍 |
| `c.magical_offense_multiplier_xV` | 魔攻撃V倍 | 魔法攻撃がV倍 |
| `c.physical_defense_multiplier_xV` | 物防xV | 物理防御力がV倍(少ないほうが攻撃に強い) |
| `c.magical_defense_multiplier_xV` | 魔防xV | 魔法防御力がV倍(少ないほうが攻撃に強い) |
| `c.fire_defense_multiplier_xV` | 炎防xV |  炎属性耐性がV倍(少ないほうが攻撃に強い) |
| `c.ice_defense_multiplier_xV` | 氷防xV |  氷属性耐性がV倍(少ないほうが攻撃に強い) |
| `c.thunder_defense_multiplier_xV` | 雷防xV |  雷属性耐性がV倍(少ないほうが攻撃に強い) |
| `c.upgrade_V` | V強化+1 | アビリティ:V が1段階強化する |
| `c.antagonism` | ⚠️敵対 | 味方を攻撃するようになる |

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
| `a.defender`1 | 守護者1 | 味方全体が受ける物理ダメージを 2/3倍 にする |
| `a.defender`2 | 守護者2 | 味方全体が受ける物理ダメージを 3/5倍 にする |
| `a.defender`3 | 守護者3 | 味方全体が受ける物理ダメージを 1/2倍 にする |
| `a.counter`1 | 反撃1 | 敵の近距離攻撃を受けたとき反撃する(攻撃回数は半減) |
| `a.counter`2 | 反撃2 | 敵の近距離・中距離攻撃を受けたとき反撃する(攻撃回数は半減) |
| `a.counter`3 | 反撃3 | 敵の攻撃を受けたとき反撃する(攻撃回数は半減) |
| `a.re-attack`1 | 連撃1 | 攻撃時に 追加攻撃を1回行う(攻撃回数は半減) |
| `a.re-attack`2 | 連撃2 | 攻撃時に 追加攻撃を2回行う(攻撃回数は半減) |
| `a.re-attack`3 | 連撃3 | 攻撃時に 追加攻撃を2回行う(攻撃回数は半減しない) |
| `a.iaigiri`1 | 居合斬り1 | 物理ダメージをx2.0倍する(攻撃回数が半減する) |
| `a.iaigiri`2 | 居合斬り2 | 物理ダメージをx2.5倍する(攻撃回数を半減する) |
| `a.iaigiri`3 | 居合斬り3 | 物理ダメージをx3.0倍する(攻撃回数は半減する) |
| `a.command`1 | 指揮1 | 与える物理ダメージを 1.3倍 にする |
| `a.command`2 | 指揮2 | 与える物理ダメージを 1.6倍 にする |
| `a.command`3 | 指揮3 | 与える物理ダメージを 2.0倍 にする |
| `a.squander`1 | 浪費1 | 宴会で消費するゴールドが1.5倍になる |
| `a.squander`2 | 浪費2 | 宴会で消費するゴールドが2倍になる |
| `a.hunter`1 | 狩人1 | 列による命中率減衰を 1列ごと15%→10% に軽減する |
| `a.hunter`2 | 狩人2 | 列による命中率減衰を 1列ごと15%→7% に軽減する |
| `a.hunter`3 | 狩人3 | 列による命中率減衰を 1列ごと15%→5% に軽減する |
| `a.resonance`1| 共鳴1 | 魔法攻撃 1回毎に、全ヒットのダメージが +5% 増加する |
| `a.resonance`2 | 共鳴2 | 魔法攻撃 1回毎に、全ヒットのダメージが +8% 増加する |
| `a.resonance`3 | 共鳴3 | 魔法攻撃 1回毎に、全ヒットのダメージが +11% 増加する |
| `a.resonance`4 | 共鳴4 | 魔法攻撃 1回毎に、全ヒットのダメージが +13% 増加する |
| `a.resonance`5 | 共鳴5 | 魔法攻撃 1回毎に、全ヒットのダメージが +15% 増加する |
| `a.m-barrier`1 | 魔法障壁1 | 味方全体が受ける魔法ダメージを 2/3倍 にする |
| `a.m-barrier`2 | 魔法障壁2 | 味方全体が受ける魔法ダメージを 3/5倍 にする |
| `a.m-barrier`3 | 魔法障壁2 | 味方全体が受ける魔法ダメージを 1/2倍 にする |
| `a.deflection`1 | 矢払い1 |　敵の遠距離攻撃の命中率を 10%低下 させる |
| `a.deflection`2 | 矢払い2 |　敵の遠距離攻撃の命中率を 15%低下 させる |
| `a.first-strike`1 | 先制攻撃1 | 行動が速くなる |
| `a.first-strike`2 | 先制攻撃2 | 行動がとても速くなる |
| `a.first-strike`3 | 先制攻撃3 | 行動が極めて速くなる |
| `a.tithe`1 | 十分の一税1 | 遠征利益の +10% を寄付額に上乗せする |
| `a.tithe`2 | 十分の一税2 | 遠征利益の +15% を寄付額に上乗せする |
| `a.null-counter`1 | 反撃無効化1 | 反撃を無効化する |
| `a.null-counter`2 | 反撃無効化2 | 反撃を無効化する |
| `a.seeker`1 | 探究者1 | 魔導書の効果増加(レベル毎に0.25%) |
| `a.seeker`2 | 探究者2 | 魔導書の効果増加(レベル毎に0.35%) |
| `a.resurrect`1 | 再起1 | 自分が受けた致命ダメージをHP1残して耐える |
| `a.resurrect`2 | 再起2 | 自分が受けた致命ダメージをHP **1%** 残して耐える(1回のみ) |
| `a.rage`1 | 闘志1 | 物理/魔法攻撃倍率増大(受けたダメージ1%につき1%増) |
| `a.rage`2 | 闘志2 | 物理/魔法攻撃倍率増大(受けたダメージ1%につき1.2%増) |
| `a.re-counter`1 | 再反撃1 | 敵から反撃に対して、反撃する(攻撃回数半減) |
| `a.re-counter`2 | 再反撃2 | 敵から反撃に対して、反撃する(攻撃回数半減しない) |
| `a.momentum`1 | 気勢1 | 物理/魔法攻撃倍率1.5倍(受けたダメージ1%につき1%減) |
| `a.momentum`2 | 気勢2 | 物理/魔法攻撃倍率1.5倍(受けたダメージ1%につき0.75%減) |
| `a.cunning`1 | 狡猾1 | 自動売却額が1.2倍 |
| `a.cunning`2 | 狡猾2 | 自動売却額が1.3倍 |
| `a.bulwark`1 | 壁1 | 真後ろの味方への遠距離攻撃を肩代わりする |
| `a.bulwark`2 | 壁2 | 真後ろの味方への遠距離/近距離攻撃を肩代わりする |
| `a.cyborgization`1 | サイボーグ化1 | 命中+30、回避-20 |
| `a.cyborgization`2 | サイボーグ化2 | 命中+40、回避-15 |
| `a.covering-fire`1 | 援護射撃1 | 味方近接攻撃の命中が1回のみなら遠距離射撃(攻撃回数半減) |
| `a.covering-fire`2 | 援護射撃2 | 味方近接攻撃の命中が1回のみなら遠距離射撃(攻撃回数半減しない) |
| `a.peddler`1 | 行商1 | 移動時間が2/3になる |
| `a.peddler`2 | 行商2 | 移動時間が3/5になる |
| `a.composure`1 | 平静1 | 命中率+10%加算 |
| `a.composure`2 | 平静2 | 命中率+13%加算 |
| `a.magical-counter`1 | 魔法反撃1 | 魔法には魔法で反撃する(攻撃回数半減) |
| `a.magical-counter`2 | 魔法反撃2 | 魔法には魔法で反撃する(攻撃回数半減しない) |
| `a.focus`1 | 集中1 | 命中ボーナスの効果が1.2倍になる |
| `a.focus`2 | 集中2 | 命中ボーナスの効果が1.3倍になる |
| `a.prophecy`1 | 予言1 | 報酬抽選内容が見えるようになる |
| `a.prophecy`2 | 予言2 | 報酬抽選内容が見える、リセット出来るようになる |
| `a.stealth`1 | 隠れ蓑1 | HP24%未満の時、自身へのダメージをすべて回避する|
| `a.stealth`2 | 隠れ蓑2 | HP29%未満の時、自身へのダメージをすべて回避する|
| `a.illusion`1 | 幻化1 | 自分が受ける最初の遠距離攻撃を無効化する |
| `a.illusion`2 | 幻化2 | パーティーが受ける最初の遠距離攻撃を無効化する |


**e. 属性攻撃(重複有効)**

- "攻撃時に属性を持つことがあります。 複数の属性を持つ武器を装備した場合は、その属性の威力増加値が高いものが優先されます。(威力増加値が等しい場合は 雷>氷>炎 の順) "

| `e.` Key | 表示 | 説明 |
|--------|------|------|
| `e.fire+v` | 火属性+v% | 攻撃が火属性🔥になり、v%威力が増加する |
| `e.ice+v` | 氷属性+v% | 攻撃が氷属性❄️になり、v%威力が増加する|
| `e.thunder+v` | 雷属性+v% | 攻撃が雷属性⚡になり、v%威力が増加する|


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

- enhancement multiplier

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

| ID | title | bonus |
|-----|---------|---------------|
| 1 | 世界を征する | `c.growth_x1.6`成長1.6倍, `c.evasion-0.005`回避-5 | 
| 2 | 天に選ばれし | `c.growth_x1.3`成長1.3倍, `c.evasion+0.010`回避+10 |
| 3 | 千里を見通す | `c.growth_x1.3`成長1.3倍, `c.accuracy+0.010`命中+10 |
| 4 | 天を穿つ | `c.growth_x1.2`成長1.2倍, `c.physical_offense_multiplier_x1.3`物攻撃1.3倍 |
| 5 | 星を詠む | `c.growth_x1.2`成長1.2倍, `c.magical_offense_multiplier_x1.3`魔攻撃1.3倍 |
| 6 | 轟きし | `c.growth_x1.2`成長1.2倍, `c.thunder_defense_multiplier_x3/5`雷防x3/5 |
| 7 | 魔を拒む | `c.growth_x1.1`成長1.1倍, `c.magical_defense_multiplier_x3/5`魔防x3/5 |
| 8 | 鉄壁な | `c.growth_x1.1`成長1.1倍, `c.physical_defense_multiplier_x3/5`物防x3/5 |
| 9 | 闘争を求めし | `c.growth_x1.1`成長1.1倍, `c.physical_attack+20`物攻撃+20% |
| 10 | 魔力が奔る | `c.growth_x1.1`成長1.1倍, `c.magical_attack+20`魔攻撃+20%  |
| 11 | 守護の | `c.upgrade_defender`守護者強化+1, `c.physical_attack+10`物攻撃+10% |
| 12 | 前線を貫く | (戦士2), `c.penet+0.04`貫通+4 |
| 13 | 執着し | `c.upgrade_counter`反撃強化+1, `c.evasion+0.010`回避+10 |
| 14 | 煌めく | (剣士2), `c.magical_attack+30`魔攻撃+30%  |
| 15 | 華麗なる | `c.upgrade_re-attack`連撃強化+1, `b.mind+1`精神+1 |
| 16 | 闇駆ける | (忍者2), `c.magical_attack+30`魔攻撃+30% |
| 17 | 抜刀の | `c.upgrade_iaigiri`居合斬り強化+1, `b.intelligence+1`知性+1 |
| 18 | 一太刀を制す | (侍2), `c.magical_defense_multiplier_x3/5`魔防x3/5  |
| 19 | 鼓舞し | `c.upgrade_command`指揮強化+1, `c.magical_attack+10`魔攻撃+10% |
| 20 | 王道なる | (君主2), `c.penet+0.08`貫通+8 |
| 21 | 狙いし | `c.upgrade_hunter`狩人強化+1, `c.magical_attack+10`魔攻撃+10%  |
| 22 | 獲物を追う | (狩人2), `c.evasion+0.015`回避+15 |
| 23 | 響き渡る | `c.upgrade_resonance`共鳴強化+1, `b.vitality+1`体力+1 |
| 24 | 唱えし | (魔法使い2), `c.magical_defense+10`魔防+10% |
| 25 | 障壁の | `c.upgrade_m-barrier`魔法障壁強化+1, `b.strength+1`力+1 |
| 26 | 理の | (賢者2), `c.physical_defense_multiplier_x3/5`物防x3/5 |
| 27 | 風切り躱す | `c.upgrade_deflection`矢払い強化+1, `c.magical_attack+10`魔攻撃+10% |
| 28 | 影に溶ける | (盗賊2), `c.physical_attack+30`物攻撃+30% |
| 29 | 節制の | `c.upgrade_null-counter`反撃無効化強化+1, `c.accuracy+0.015`命中+15 |
| 30 | 祈りし | (巡礼者2), `c.physical_attack+30`物攻撃+30% |
| 31 | 探し求めた | `c.upgrade_seeker`探究者強化+1, `c.penet+0.04`貫通+4 |
| 32 | 修復されし | `c.upgrade_resurrect`再起強化+1, `c.physical_attack+20`物攻撃+20% |
| 33 | 一気呵成 | `c.upgrade_rage`闘志強化+1,　`e.fire+0.10`炎攻撃+10% |
| 34 | 起き上がる | `c.upgrade_re-counter`再反撃強化+1, `c.magical_defense+10`魔防+10% | 
| 35 | 始まりの | `c.upgrade_momentum`気勢強化+1, `c.accuracy+0.015`命中+15 |
| 36 | 狡知を巡らす | `c.upgrade_cunning`狡猾強化+1, `c.penet+0.04`貫通+4 |
| 37 | 背を預ける | `c.upgrade_bulwark`壁強化+1, `c.penet+0.08`貫通+8 |
| 38 | 機械化し | `c.upgrade_cyborgization`サイボーグ化強化+1, `c.physical_defense+10`物防+10% |
| 39 | 先を行く | `c.upgrade_first-strike`先制攻撃強化+1, `e.thunder+0.10`雷攻撃+10% |
| 40 | 連携し | `c.upgrade_covering-fire`援護射撃強化+1, `c.magical_attack+20`魔攻撃+20% |
| 41 | 共感し | `c.upgrade_resonance`共鳴強化+1, `c.physical_attack+10`物攻撃+10% |
| 42 | 渡り歩く | `c.upgrade_peddler`行商強化+1, `c.magical_attack+10`魔攻撃+10% |
| 43 | 冷酷なる | `c.upgrade_composure`平静強化+1, `e.ice+0.10`氷攻撃+10%|
| 44 | 反射する | `c.upgrade_magical-counter`魔法反撃強化+1, `c.physical_attack+20`物攻撃+20% |
| 45 | 研ぎ澄ます | `c.upgrade_focus`集中強化+1, `c.magical_attack+20`魔攻撃+20% |
| 46 | 未来を変える | `c.upgrade_prophecy`予言強化+1, `c.physical_attack+10`物攻撃+10% |
| 47 | 影に消える | `c.upgrade_stealth`隠れ蓑強化+1, `c.evasion+0.015`回避+15 |
| 48 | 駆け巡る | (ミュリッド2), `c.accuracy+0.015`命中+15 |
| 49 | 化けた | `c.upgrade_illusion`幻化強化+1, `c.evasion+0.010`回避+10 |
| 50 | 原初の | (プロキオニア2), `c.penet+0.04`貫通+4 |
| 51 | 火焔の | `e.fire+0.30`炎攻撃+30%, `c.accuracy+0.010`命中+10 |
| 52 | 氷晶纏いし | `e.ice+0.30`氷攻撃+30%, `c.physical_defense+10`物防+10% |
| 53 | 電光帯びし | `e.thunder+0.30`雷攻撃+30%, `c.magical_defense+10`魔防+10% |
| 54 | 炎を躱す | `c.fire_defense_multiplier_x3/5`炎防x3/5, `c.evasion+0.010`回避+10 |
| 55 | 氷結砕きし | `c.ice_defense_multiplier_x3/5`氷防x3/5, `c.magical_attack+10`魔攻撃+10% |
| 56 | 電光いなす | `c.thunder_defense_multiplier_x3/5`雷防x3/5, `c.physical_attack+10`物攻撃+10% |
| 57 | 灼熱なる | `e.fire+0.20`炎攻撃+20%, `c.ice_defense_multiplier_x3/5`氷防x3/5 |
| 58 | 冷徹なる | `e.ice+0.20`氷攻撃+20%, `c.thunder_defense_multiplier_x3/5`雷防x3/5 |
| 59 | 天衝く | `e.thunder+0.20`雷攻撃+20%, `c.fire_defense_multiplier_x3/5`炎防x3/5 |
| 60 | 氷炎踊る | `c.ice_defense_multiplier_x3/5`氷防x3/5, `c.fire_defense_multiplier_x3/5`炎防x3/5 |
| 61 | 護られし | `c.armor_x1.1`鎧x1.1, `c.accuracy+0.010`命中+10 |
| 62 | 舞い踊る | `c.robe_x1.1`衣x1.1, `c.magical_defense+10`魔防+10% |
| 63 | 盾影に射る | `c.shield_x1.1`盾x1.1, `c.physical_attack+20`物攻撃+20% |
| 64 | 剣影に舞う | `c.sword_x1.1`剣x1.1, `c.evasion+0.010`回避+10 |
| 65 | 一閃に至る | `c.katana_x1.1`刀x1.1, `c.physical_defense+10`物防+10% |
| 66 | 慟哭し | `c.gauntlet_x1.1`手x1.1, `c.magical_attack+20`魔攻撃+20% |
| 67 | 矢で導く | `c.arrow_x1.1`矢x1.1, `c.magical_attack+20`魔攻撃+20% |
| 68 | 弩級の | `c.bolt_x1.1`ボx1.1, `c.physical_defense+10`物防+10% |
| 69 | 仇なす | `c.archery_x1.1`弓x1.1, `c.accuracy+0.010`命中+10 |
| 70 | 妖護りし | `c.wand_x1.1`杖x1.1, `c.magical_defense+10`魔防+10% |
| 71 | 秘められし | `c.grimoire_x1.1`書x1.1, `c.physical_defense+10`物防+10% |
| 72 | 許されぬ | `c.catalyst_x1.1`媒x1.1, `c.physical_attack+20`物攻撃+20% |
| 73 | 討ち抜く | `c.physical_offense_multiplier_x1.4`物攻撃1.4倍, `c.evasion-0.005`回避-5 | 
| 74 | 魔極めし | `c.magical_offense_multiplier_x1.4`魔攻撃1.4倍, `c.accuracy-0.005`命中-5  |
| 75 | 牙剝く | `c.physical_offense_multiplier_x1.2`物攻撃1.2倍, `c.magical_offense_multiplier_x1.2`魔攻撃1.2倍 |
| 76 | 深淵を覗く | `c.magical_attack+40`魔攻撃+40%, `c.physical_attack+10`物攻撃+10% |
| 77 | 疾風の如く | `c.physical_attack+40`物攻撃+40%, `c.evasion+0.010`回避+10 |
| 78 | 祝福されし | `c.physical_defense_multiplier_x3/5`物防x3/5, `c.magical_defense_multiplier_x3/5`魔防x3/5 |
| 79 | 災いもたらす | `c.growth_x0.9`成長0.9倍, `c.magical_offense_multiplier_x1.5`魔攻撃1.5倍 |
| 80 | 呪われし | `c.antagonism`⚠️敵対, `c.growth_x1.8`成長1.8倍 |

- `g.superRare_bag` table

| value | tickets | multiplier |
|-----|------|-----|
| 0  | 399920 | x1.0 |
| 1~80 | 1 | x2.0 |


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

|races | default ability　| unlock ability | unclock condition | bonus | 体,力,知,精 | memo |
|-----|-------|------|--------|--------|-----------|----------|
|ケイナイアン(Caninian) |  `a.seeker`1 | `a.resurrect`1 | 原攻略 | `c.shield_x1.3`, `c.archery_x1.1` |10,10,10,10| 🐶Dog |
|ルピニアン(Lupinian) | `a.rage`1 | `a.re-counter`1 | 崖攻略 | `c.equip_slot+1`, `c.katana_x1.3`  |10,12,8,7| 🐺Wolf |
|ヴァルピニアン(Vulpinian) | `a.momentum`1 | `a.cunning`1 | 樹攻略 |`c.equip_slot+1`, `c.sword_x1.3`, `c.grimoire_x1.2` |11,10,12,8| 🦊Fox |
|ウルサン(Ursan) | `a.bulwark`1 | `a.cyborgization`1 | 峰攻略 |`c.equip_slot+2`, `c.catalyst_x1.2` |13,11,**7**,7| 🐻Bear |
|フェリディアン(Felidian)  | `a.first-strike`1 | `a.covering-fire`1 | 茂攻略 |`c.robe_x1.3` |9,9,10,12| 😺Cat |
|マステリド(Mustelid) | `a.resonance`1 | `a.peddler`1 | 巣攻略 | `c.gauntlet_x1.3`, `c.arrow_x1.3` |10,10,9,11| 🦡Ferret |
|レポリアン(Leporian) | `a.composure`1 | `a.magical-counter`1 | 園攻略 | `c.archery_x1.3`,  `c.armor_x1.3` |9,8,11,10| 🐰Rabbit |
|セルヴィン(Cervin)  | `a.focus`1 | `a.prophecy`1 | 谷攻略 |`c.wand_x1.3`, `c.shield_x1.2` |8,7,13,10| 🦌Deer |
|ミュリッド(Murid) | `a.stealth`1 | (none) | (none) |`c.penet+0.10`, `c.bolt_x1.3`  |9,8,10,10| 🐭Mouse |
|プロキオニアン(Procyonian) | `a.illusion`1 | (none) | (none) |`c.equip_slot+1`, `c.grimoire_x1.3`  |9,8,10,6| 🦝Tanuki |

- note: 未来視はパーティ単位で管理する方針に　神聖局で、セルヴィンがいる場合に表示可能、またコストを払ってリセットも可能に(詳細は今後検討)



- **predisposition(性格):**

|predisposition | short word | bonus |
|-----|---|-----------|
|頑強 (Sturdy)| 頑 |`b.vitality+2`,  `c.armor_x1.1`|
|俊敏 (Agile)| 俊 | `c.evasion+0.01` |
|聡明 (Brilliant)| 聡 |`c.wand_x1.2`|
|器用 (Dexterous)| 器 |`c.accuracy+0.01`, `c.catalyst_x1.2`|
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
|忍者(忍,Ninja) | `c.grit+1`, `c.penet+0.15` | `a.re-attack`1: once when attacking (`f.NoA` x 0.5) | `a.re-attack`2: twice when attacking (`f.NoA` x 0.5) | 
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
    - `f.elemental_offense_attribute`  
		- Has only one type of `none`, `e.fire`, `e.ice`, or `e.thunder`
      	- Has its multiplier like x1.15
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

| God | Name  | effect (Rank 1) | 説明　|
|-----|-----|----|---|
|`God of Restoration`| 再生の神 | At the end of every 4th room,  Heal 20% of missing HP | |
|`God of Attrition`| 消耗の神 | Add `c.melee_attack+20`, `c.ranged_attack+20`, and `c.magical_attack+20` to each party member. At the end of every 4th room, reduce 5% of remaining HP.| |
|`God of Fortification` | 防備の神 | Add `c.physical_defense+10`, `c.magical_defense+10` to each party member.| |
|`God of Precision`| 命中の神 | Add `c.accuracy+0.020` and `c.evasion-0.005` to each party member.| |
|`God of Evasion`| 回避の神 | Add `c.evasion+0.015` to each party member.| |
|`God of Resonance`| 共鳴の神 | Upgrade all `a.resonance` values by +1 tier. Add `c.magical_defense-5`to each party member.| 全員の共鳴を1段階強化し、[魔防-5%](魔法攻撃に弱くなります) |


### 2.3 Expedition & Enemies
- Expedition layout: The 6 `x.floor` spire. Each floor consists of 4 `x.room`s. the last room of the floor is Elite/Boss enemy battle, other rooms are Normal enemy battles.
- There are 8 `x.expedition` destinations in total. every `x.expedition` has its own tier. (1st `x.expedition` drops tier-1 items. 2nd `x.expedition` drops tier-2 items)

#### 2.3.1 Expedition
- `x.expedition` list

| `x.expediton` | short word | `x.exp_HP_mult` | `x.exp_atk_mult` | `x.exp_NoA_mult` | `x.exp_atk_amp_mult` | `x.exp_def_mult` | `x.exp_def_amp_mult` | drop item tier | lore |
|------|-----|-----|----|----|----|----|----|----|----|
| ケイナイアン平原(Caninian Plains) | 原 | x1 | x1 | x1 | x1 | x1 | x1 | 1 | The Fields of First Vows. A sun-drenched grassland dotted with wooden watchtowers. This is the training ground for all new expeditions. The atmosphere is stable, making it the perfect place to master the basics of the Sword and Grimoire under the watchful eyes of the loyal Caninian sentries. |
| ルピニアンの断崖(Lupinian Crag) | 崖 | x4 | x2 | x2 | x1.5 | x2 | x0.8 | 2 | The Razor-Wind Peaks. Sharp obsidian cliffs where the wind howls like a hungry wolf. The Lupinian tribes test their endurance here. |
| ヴァルピニアンの樹林帯(Vulpinian Taiga) | 樹 | x16 | x4 | x3 | x1.9 | x4 | x0.64 | 3 | The Forest of Veils. A dense, autumnal woodland where the trees seem to move when you blink. The Vulpinian mages use the natural spiritual mist to weave illusions. Requiring explorers to seek the protection of high-tier Robes and Wands to see through the deception. |
| ウルサンの霊峰(Ursan Peaks) | 峰 | x64 | x8 | x4 | x2.2 | x8 | x0.51 | 4 | The Thunder-Forge Mountains. A volcanic range where the ground shakes with the rhythmic pounding of Ursan blacksmiths. Deep in these magma-lit halls, the lost art of the Katana is guarded by those whose bodies are as hard as the stone itself. |
| フェリディアンの茂み(Felidian Grove) | 茂 | x256 | x16 | x5 | x2.4 | x16 | x0.41 | 5 | The Moonlit Sanctuary. An ancient, overgrown jungle where ruins of a pre-shattering civilization glow with bioluminescence. To clear this grove, one must master the Bolt—the only weapon fast enough to strike before the forest strikes back. |
| マステリドの巣穴(Mustelid Burrow) | 巣 | x1,024 | x32 | x6 | x2.5 | x32 | x0.33 | 6 | The Copper Labyrinth. A massive subterranean industrial hive. The air is thick with chemical steam and the clank of gears. Only those with high-tier Catalysts can neutralize the toxins found in the deepest vents. |
| レポリアンの庭園(Leporian Garden) | 園 | x4,096 | x64 | x7 | x2.6 | x64 | x0.26 | 7 | The High-Heaven Isles. A cluster of floating islands suspended miles above the clouds. The Leporians navigate these heights using wind currents. Only those with the "Lord's" resolve can stabilize their spirit enough to claim the Mythic Sword. |
| セルヴィンの谷(Cervin Vale) | 谷 | x16,384 | x128 | x8 | x2.7 | x128 | x0.21 | 8 | The Glass Horizon. A dimension where space and time have crystallized. The Cervin Sages reside here in total silence. Here, the final Grimoire and Katana await the one who can transcend mortality. |

- **Enemy entity distribution** for each `x.expediton`

| Entity Type | Unique Count | Mapping | Drop Quality | Memo |
|-----|-----|-----|-----|----|
| Normal |30 | 5 per Floor Pool (Pools 1–6) | 3 Common, 2 Uncommon |  They provide consistent Uncommon drops and thematic flavor.|
| Elite | 5 | 1 per Floor ( `x.floor` 1–5, `x.room` 4) | 2 ~ 3 Rare, 1 Uncommon, 2 ~ 1 Common | Floor-end guardians serving as "Mechanical Gates." They drop Rare items and test specific build capabilities. |
| Boss | 1 | `x.floor` 6, `x.room` 4 (Final) | 2 ~ 3 Mythic , 1 ~ 2 Rare, 1 Common (5 in total) | A "Total Power" check and the exclusive source of Mythic rewards. |

- `x.expedition` layout overview:

| `x.floor` | `x.room` | `x.room_type` | `x.floor_HP_mult` | `x.floor_atk_mult` | `x.floor_NoA_mult` | `x.floor_atk_amp_mult` | `x.floor_def_mult` | `x.floor_def_amp_mult` | `x.Spawn_pool`, drops | `x.key_concept` |
|----|----|----|-----|-----|-----|-----|-----|-----|-----|-----|
| 1 | 1-3 | `x.battle_Normal` | x1.0 | x1.0 | x1.0 | x1.00 | x1.0 | x1.0 | pool_1 | easy farming |
| 1 | 4 | `x.battle_Elite` | x1.50 | x1.23 | x1.0 | x1.05 | x1.23 | x1.0 | fixed Elite. rare  `i.sword`, `i.armor` | Class:Rogue. Checks if you have equipped items properly. |
| 2 | 1-3 | `x.battle_Normal` | x1.25 | x1.10 | x1.0 | x1.02 | x1.10 | x0.97 | pool_2 | |
| 2 | 4 | `x.battle_Elite` | x1.85 | x1.34 | x1.0 | x1.09 | x1.34 | x0.97 | fixed Elite. rare  `i.shield`, `i.robe` | Class:Fighter. Checks if you have equipped enough offensive items. |
| 3 | 1-3 | `x.battle_Normal` | x1.56 | x1.20 | x1.0 | x1.04 | x1.20 | x0.94 | pool_3  |  |
| 3 | 4 | `x.battle_Elite` | x2.34 | x1.47 | x1.0 | x1.12 | x1.47 | x0.94 | fixed Elite. rare  `i.arrow`, `i.bolt`, `i.archery` | Class:Ranger. Check if you have enough physical defensive items. |
| 4 | 1-3 | `x.battle_Normal` | x1.95 | x1.32 | x1.0 | x1.06 | x1.32 | x0.92 | pool_4 | |
| 4 | 4 | `x.battle_Elite` | x3.43 | x1.61 | x1.0 | x1.14 | x1.61 | x0.92 | fixed Elite. rare  `i.gauntlet`, `i.katana` | Class:Duelist. Checks if you have archery or magic items. (kill it before his melee attacks) |
| 5 | 1-3 | `x.battle_Normal` | x2.44 | x1.44 | x1.0 | x1.07 | x1.44 | x0.89 | pool_5  | |
| 5 | 4 | `x.battle_Elite` | x4.04 | x1.76 | x1.0 | x1.15 | x1.76 | x0.89 | fixed Elite. rare  `i.wand`, `i.grimoire`, `i.catalyst` | Class:Mage. Checks if you have equipped enough magical defensive items.  |
| 6 | 1-3 | `x.battle_Normal` | x3.05 | x1.58 | x1.0 | x1.08 | x1.58 | x0.86 | pool_6 | |
| 6 | 4 | `x.battle_Boss` | x6.10 | x2.24 | x1.0 | x1.20 | x2.24 | x0.86 | fixed Boss. mythic (see bellows) | Checks if you have enough tital power. |

- each pool has enemies with unique item drops. (*note:* common items are not specifically mentioned but are dropped.)
  
| `x.Spawn_pool` | enemy class/drop 1 | enemy class/drop 2 | enemy class/drop 3 | enemy class/drop 4 | enemy class/drop 5 |
|---|---|---|---|---|---|
| pool_1 | E01:Fighter/ uncommon `i.sword`1, `i.gauntlet`1 | E02:Ranger/ uncommon `i.arrow1`, `i.archery`1 | E03:Wizard/ uncommon `i.wand`1, `i.catalyst`1 | E04:Pilgrim/ uncommon `i.sword`1, `i.wand`1 | E05:Rogue/ uncommon `i.bolt`1, `i.shield`1 |
| pool_2 | E06:Ninja/ uncommon `i.katana`1, `i.armor`1 | E07:Samurai/ uncommon `i.katana`1, `i.bolt`1 | E08:Sage/ uncommon `i.grimoire`1, `i.robe`1 | E09:Duelist/ uncommon `i.sword`, `i.arrow` | E10:Lord/ uncommon `i.shield `, `i.robe` |
| pool_3 | E11:Fighter/ uncommon `i.sword`1, `i.gauntlet`1 | E12:Ranger/ uncommon `i.arrow`1, `i.archery`1 | E13:Wizard/ uncommon `i.wand`1, `i.catalyst`1 | E14:Lord/ uncommon `i.shield`1, `i.robe`1 | E15:Samurai/ uncommon `i.katana`1, `i.bolt`1 |
| pool_4 | E16:Ninja/ uncommon `i.katana`2, `i.armor`2 | E17:Rogue/ uncommon `i.bolt`2, `i.shield`2 | E18:Sage/ uncommon `i.grimoire`2, `i.robe`2 | E19:Duelist/ uncommon `i.sword`2, `i.arrow`2 | E20:Pilgrim/ uncommon `i.sword`2 , `i.wand`2 |
| pool_5 | E21:Fighter/ uncommon `i.sword`2, `i.gauntlet`2 | E22:Ranger/ uncommon `i.arrow`2, `i.archery`2 | E23:Wizard/ uncommon `i.wand`2, `i.catalyst`2 | E24:Lord/ uncommon `i.shield`2, `i.robe`2 | E25:Samurai/ uncommon `i.katana`2, `i.bolt`2 |
| pool_6 | E26:Ninja/ uncommon `i.katana`2, `i.armor`2 | E27:Rogue/ uncommon `i.bolt`2, `i.shield`2 | E28:Sage/ uncommon `i.grimoire`2, `i.robe`2 | E29:Duelist/ uncommon `i.sword`2, `i.arrow`2 | E30:Pilgrim/ uncommon `i.sword`2, `i.wand`2 |

 - `i.item_type`variant

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
| Fighter | 63 | (none) | 0.00| 0.02 | 0 | 0 | 0 | 0 | 32 | 2 | x1.0 | x1.0 | x1.0 | 13 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Duelist | 50 | `a.counter`1 | 0.01 | 0.01 | 0 | 0 | 0 | 0 | 40 | 4 | x1.0 | x1.0 | x1.2 | 10 | 10 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Ninja | 46 | `a.re-attack`1 | 0.00 | 0.04 | 0 | 0 | 0 | 0 | 48 | 4 | x1.0 | x1.0 | x1.2 | 9 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 14 |
| Samurai | 40 | (none) | -0.05 | -0.01 | 0 | 0 | 0 | 0 | 75 | 1 | x1.0 | x1.0 | x1.3 | 8 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 12 |
| Lord | 58 | (none) | 0.00 | 0.00 | 0 | 0 | 0 | 0 | 32 | 4 | x1.0 | x1.0 | x1.1 | 12 | 12 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 20 |
| Ranger | 44 | (none) | 0.03 | 0.01 | 28 | 4 | 0 | 0 | 0 | 0 | x1.2 | x1.0 | x1.0 | 9 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 12 |
| Wizard | 27 | (none) | 0.00 | -0.015 |0 | 0 | 40 | 2 | 0 | 0 | x1.0 | x1.2 | x1.0 | 4 | 12 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Sage | 47 | (none) | 0.00 | 0.00 |0 | 0 | 20 | 4 | 0 | 0 | x1.0 | x1.2 | x1.0 | 9 | 13 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 10 |
| Rogue | 40 | `a.deflection`, `a.first-strike`1 | 0.06 | 0.06 | 20 | 4 | 0 | 0 | 20 | 4 | x1.2 | x1.0 | x1.0 | 8 | 8 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 8 |
| Pilgrim | 62 | `a.null-counter` | 0.00 | 0.02 | 0 | 0 | 20 | 2 | 32 | 2 | x1.0 | x1.2 | x1.2 | 11 | 11 | (none) | (none) | (none) | x1.0 | x1.0 | x1.0 | 16 |


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

|Tier| base_power | multiplier for　鎧, 衣, 剣, 矢, 杖 | plus for 盾 | base_power (NoA) for 手, 弓, 媒 | fixed NoA for 手, 弓, 媒 |penalty for 刀, ボ, 書| elemental v |
|----|------------|--------|-----------|--------|--------|-------|----|
| 1 | 12 | `c.target_status+0.13` | `c.evasion+0.013` | 0.8 | `c.N_NoA+1` | `d.evasion-0.001`, `d.N_NoA-1.0` | `e.element+0.15` |
| 2 | 18 | `c.target_status+0.12` | `c.evasion+0.012` | 0.7 | `c.N_NoA+2` | `d.evasion-0.002`, `d.N_NoA-1.2` | `e.element+0.14` |
| 3 | 27 | `c.target_status+0.11` | `c.evasion+0.011` | 0.6 | `c.N_NoA+3` | `d.evasion-0.003`, `d.N_NoA-1.4` | `e.element+0.13` |
| 4 | 41 | `c.target_status+0.09` | `c.evasion+0.009` | 0.5 | `c.N_NoA+4` | `d.evasion-0.004`, `d.N_NoA-1.6` | `e.element+0.12` |
| 5 | 61 | `c.target_status+0.08` | `c.evasion+0.008` | 0.4 | `c.N_NoA+5` | `d.evasion-0.005`, `d.N_NoA-1.8` | `e.element+0.11` |
| 6 | 91 | `c.target_status+0.07` | `c.evasion+0.007` | 0.3 | `c.N_NoA+6` | `d.evasion-0.006`, `d.N_NoA-2.0` | `e.element+0.09` |
| 7 | 137 | `c.target_status+0.06` | `c.evasion+0.006` | 0.2 | `c.N_NoA+7` | `d.evasion-0.007`, `d.N_NoA-2.2` | `e.element+0.08` |
| 8 | 205 | `c.target_status+0.05` | `c.evasion+0.005` | 0.1 | `c.N_NoA+8` | `d.evasion-0.008`, `d.N_NoA-2.4` | `e.element+0.07` |
| 9 | - | `c.target_status+0.04` | `c.evasion+0.004` | 0.1 | `c.N_NoA+9` | - | `e.element+0.06` |
| 10 | - | `c.target_status+0.03` | `c.evasion+0.003` | 0.1 | `c.N_NoA+10` | - | `e.element+0.05` |

-　Tier 9 and 10 are Multiplier-Only Tiers. (Unccommon/Rare item upgared reference)

| Item type | base_power/Scale for | base c.multiplier for | subtle_power`d.`, `e.`, and `c.` bonus|
|------|--------|------|------|
|`i.armor` | `d.physical_defense` | `c.physical_defense+v` | additional `d.physical_defense`, `d.HP`, `d.magical_defense`, `b.vitality+1`  |
|`i.robe` |  `d.magical_defense`  | `c.magical_defense+v` | `b.mind+1`, `d.HP`, `c.evasion+0.01` |
|`i.shield ` | `d.HP` | `c.evasion+v` | `d.physical_defense`, `d.melee_attack`, `b.vitality+1` |
|`i.sword` | `d.melee_attack` | `c.melee_attack+v` | `c.accuracy+0.01`, `b.strength+1`, `e.fire`, `d.physical_defense` ,`d.HP` |
|`i.katana` | `d.melee_attack` | `c.melee_attack+V`, `d.evasion-v`, `d.melee_NoA-v` | additional `d.melee_attack`, `c.penet+0.01`, `c.penet+0.02`, `b.mind+1` |
|`i.gauntlet` | `d.melee_NoA` | `c.melee_NoA+v` | additional `d.melee_NoA`, `d.physical_defense`, `b.strength+1` |
|`i.arrow` | `d.ranged_attack` | `c.ranged_attack+v` | additional `d.ranged_attack`, `e.fire+v`, `e.ice+v`, `e.thunder+v` |
|`i.bolt` | `d.ranged_attack` | `c.ranged_attack+v`, `d.evasion-v`, `d.ranged_NoA-v` | additional `d.ranged_attack`, `e.thunder`,`b.strength+1` |
|`i.archery` | `d.ranged_NoA` | `c.ranged_NoA+v` | `c.accuracy+0.00v`,  `c.evasion+0.00v`, `d.HP`, `b.strength+1`|
|`i.wand` | `d.magical_attack` | `c.magical_attack+v` | additional `d.magical_attack`, `d.magical_defense`, `b.intelligence+1` |
|`i.grimoire` | `d.magical_attack` | `c.magical_attack+v`, `d.evasion-v`, `d.magical_NoA-v` | additional `d.magical_attack`, `b.mind+1`, `d.magical_defense` |
|`i.catalyst` | `d.magical_NoA` | `c.magical_NoA+v` | additional `d.magical_NoA`, `e.fire+v`, `e.ice+v`, `e.thunder+V`, `b.intelligence+1` |


**type.amplifier of base_power**

| Item type | `type_amplifier` |
|------|--------|
|`i.armor` | x1.0 |
|`i.robe` | x1.0 |
|`i.shield` | x1.0 |
|`i.sword` | x1.2 |
|`i.katana` | x1.8 |
|`i.gauntlet` | x1.0 |
|`i.arrow` | x0.67 |
|`i.bolt` | x1.00 |
|`i.archery` | x1.0 | 
|`i.wand` | x0.5 |
|`i.grimoire` | x0.75 |
|`i.catalyst` | x1.0 |

**rarelity.amplifier of base_power**

| Rarelity | `rarelity.amplifier` |
|------|--------|
| common | x1.0 |
| uncommon | x1.2 |
| rare | x1.6 |
| mythic | x2.4 |

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
Tier 4 common `i.katana`: `d.melee_attack` +82, `d.evasion-0.004`, `c_melee_NoA-1.6`
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
