## 1. CONSTANTS

### 1.2 CONSTANTS_GLOBAL

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
  - deity 
  - characters slots

**Bag Randomization:** 
- There are weighted bags (t.*_bag) that control probabilistic randomness:
- Each party has independently : `t.common_reward_bag`, `t.common_enhancement_bag`, `t.uncommon_reward_bag`, `t.elite_rare_reward_bag`, `t.boss_rare_reward_bag`, `t.mythic_rare_reward_bag`, `t.enhancement_bag`, `t.common_superRare_bag`,
`t.rare_superRare_bag`, `t.physical_threat_weight_bag`,
`t.magical_threat_weight_bag`,
`t.side_quest_bag`, and
`t.sleepiness_of_party_bag`. 
  - All bags persist in save data and are not reset per battle or per expedition.
  - Bags are reset only when: explicitly reset, or automatically reset when the bag becomes empty (total_tickets == 0).
	
- Weighted Random Bag (Count-Based Ticket Rule)
  - Each bag stores counts per entry, not individual tickets.
  - Each entry is { ID, tickets }.
  - Bag iteration order is stable (e.g., ascending ID).
    - Examples:
      - `t.common_reward_bag` = { { ID: 0, tickets: 90 }, { ID: 1, tickets: 10 },  }
      - `t.superRare_bag` = { { ID: 0, tickets: 409918 }, { ID: 1, tickets: 1 }, { ID: 2, tickets: 1 }, ... , { ID: 82, tickets: 1 } }

- `f.pop_from_weighted_bag`(bag_key: g.*)
  - Get bag by bag_key.
  - Compute total_tickets = sum(entry.tickets where tickets > 0).
  - If total_tickets == 0, reinitialize: `f.reset_weighted_bag`(bag_key: bag_key), then recompute total_tickets.
  - Roll r = random_int(1, total_tickets) (inclusive).
  - Select the entry whose cumulative ticket range contains r (stable iteration order).
  - Decrement the selected entry’s tickets -= 1
	- example: ticket Id is 0, then  { ID: 0, tickets: 90 } -> { ID: 0, tickets: 89 }
  - Return the selected ID.
 
- `f.reset_weighted_bag`(bag_key: g.*)
  - Bags reset only by either:
	- Explicit reset 
	- Automatic reset when total == 0 (bag is empty)
  - Reset: the bag is initialized from `t.(bagname)_default`.
    - example: `t.physical_threat_weight_bag` is initialized from `t.physical_threat_weight_bag_default`.

**reward list**

- `t.common_reward_bag_default` table

| ID | title | tickets |
|-----|---------|------|
| 0 | no item | 90 |
| 1 | win | 10 |  

- `t.uncommon_reward_bag_default` table
 
| ID | title | tickets |
|-----|---------|------|
| 0 | no item | 99 |
| 1 | win | 1 |

- `t.elite_rare_reward_bag_default` table
 
| ID | title | tickets |
|-----|---------|------|
| 0 | no item | 99 |
| 1 | win | 1 |

- `t.boss_rare_reward_bag_default` table
 
| ID | title | tickets |
|-----|---------|------|
| 0 | no item | 99 |
| 1 | win | 1 |

- `t.mythic_rare_reward_bag_default` table

| ID | title | tickets |
|-----|---------|------|
| 0 | no item | 49 |
| 1 | win | 1 |

**enhancement title**

- enhancement multiplier

| ID | title | multiplier |
|-----|------|------|
| 0 | (none) | x1.00 |
| 1 | 名工の | x1.33 |
| 2 | 魔性の | x1.58 |
| 3 | 宿った | x2.10 |
| 4 | 伝説の | x2.75 |
| 5 | 恐ろしい | x3.50 |
| 6 | 究極の | x5.00 |


- `t.common_enhancement_bag_default` table

| ID | title | tickets |
|-----|---------|------|
| 0 | (none) | 1390 |
| 1 | 名工の | 350 |
| 2 | 魔性の | 180 |
| 3 | 宿った | 60 |
| 4 | 伝説の | 15 |
| 5 | 恐ろしい | 4 |
| 6 | 究極の | 1 |

- `t.enhancement_bag_default` table
 
| ID | title | tickets |
|-----|---------|------|
| 0 | (none) | 5490 |
| 1 | 名工の | 350 |
| 2 | 魔性の | 180 |
| 3 | 宿った | 60 |
| 4 | 伝説の | 15 |
| 5 | 恐ろしい | 4 |
| 6 | 究極の | 1 |

- `t.side_quest_bag` ticket distribution
  - If MAX_ID = 12:
  - ID 0 (none): 99 × MAX_ID tickets → 99 × 12 = 1,188 tickets
  - ID 1–12: 1 ticket each
  - Total tickets: 1,188 + 12 = 1,200 tickets

- `t.sleepiness_of_party_bag` 
  - Each party maintains its own persistent bag. 
  - At the start of a rest cycle, draw 1 ticket from the bag to determine the party’s sleep state.

| sleepiness | ticket |
|-|-|
| 0 | 9 |
| 1 | 2 |
| 2 | 1 |

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
| 11 | 執着し | `c.upgrade_counter`反撃強化+1, `c.evasion+0.010`回避+10 |
| 12 | 煌めく | (剣士2アビリティ強化-未実装), `c.magical_attack+30`魔攻撃+30%  |
| 13 | 抜刀の | `c.upgrade_iaigiri`居合斬り強化+1, `b.intelligence+1`知性+1 |
| 14 | 一太刀を制す | (侍2アビリティ強化-未実装), `c.magical_defense_multiplier_x3/5`魔防x3/5  |
| 15 | 華麗なる | `c.upgrade_re-attack`連撃強化+1, `b.mind+1`精神+1 |
| 16 | 健美な | (剣聖2アビリティ強化-未実装), `c.accuracy+0.015`命中+15 |
| 17 | 狙いし | `c.upgrade_hunter`狩人強化+1, `c.magical_attack+10`魔攻撃+10%  |
| 18 | 獲物を追う | (狩人2アビリティ強化-未実装), `c.evasion+0.015`回避+15 |
| 19 | 一撃必殺 | `c.upgrade_heavy-strike`重撃強化+1, `c.magical_offense_multiplier_x1.1`魔攻撃1.1倍  |
| 20 | 獲物を追う | (弩手2アビリティ強化-未実装), c.penet+0.06`貫通+6 |
| 21 | 虚を突きし | `c.upgrade_first-strike`先制攻撃強化+1, `c.magical_attack+20`魔攻撃+20% |
| 22 | 闇駆ける | (忍者2アビリティ強化-未実装), `c.magical_attack+30`魔攻撃+30% |
| 23 | 響き渡る | `c.upgrade_resonance`共鳴強化+1, `b.vitality+1`体力+1 |
| 24 | 唱えし | (魔法使い2アビリティ強化-未実装), `c.magical_defense+10`魔防+10% |
| 25 | 偉大なる | `c.upgrade_arc-magic`大魔法強化+1, `b.strength+1`力+1 |
| 26 | 理の | (賢者2アビリティ強化-未実装), `c.physical_defense_multiplier_x3/5`物防x3/5 |
| 27 | 精錬されし | `c.upgrade_arcane-stability`	術式安定強化+1, `b.vitality+1`体力+1 |
| 28 | 変換された| (錬金術2アビリティ強化-未実装), `c.physical_attack+20`物攻撃+20%  |
| 29 | 守護の | `c.upgrade_defender`守護者強化+1, `c.physical_attack+10`物攻撃+10% |
| 30 | 前線を貫く | (防人2アビリティ強化-未実装), `c.penet+0.04`貫通+4 |
| 31 | 障壁の | `c.upgrade_m-barrier`魔法障壁強化+1, `b.strength+1`力+1 |
| 32 | 祈りし | (巡礼者2アビリティ強化-未実装), `c.physical_attack+30`物攻撃+30% |
| 33 | 鼓舞し | `c.upgrade_command`指揮強化+1, `c.magical_attack+10`魔攻撃+10% |
| 34 | 王道なる | (君主2アビリティ強化-未実装), `c.penet+0.08`貫通+8 |
| 35 | 一気呵成 | `c.upgrade_rage`闘志強化+1,　`e.fire+0.10`炎攻撃+10% |
| 36 | 起き上がる | `c.upgrade_re-counter`再反撃強化+1, `c.magical_defense+10`魔防+10% | 
| 37 | 始まりの | `c.upgrade_momentum`気勢強化+1, `c.accuracy+0.015`命中+15 |
| 38 | 狡知を巡らす | `c.upgrade_cunning`狡猾強化+1, `c.penet+0.04`貫通+4 |
| 39 | 先を行く | `c.upgrade_first-strike`先制攻撃強化+1, `e.thunder+0.10`雷攻撃+10% |
| 40 | 連携し | `c.upgrade_covering-fire`援護射撃強化+1, `c.magical_attack+20`魔攻撃+20% |
| 41 | 探し求めた | `c.upgrade_seeker`探究者強化+1, `c.penet+0.04`貫通+4 |
| 42 | 修復されし | `c.upgrade_resurrect`再起強化+1, `c.physical_attack+20`物攻撃+20% |
| 43 | 背を預ける | `c.upgrade_bulwark`壁強化+1, `c.penet+0.08`貫通+8 |
| 44 | 機械化し | `c.upgrade_cyborgization`サイボーグ化強化+1, `c.physical_defense+10`物防+10% |
| 45 | 共感し | `c.upgrade_resonance`共鳴強化+1, `c.physical_attack+10`物攻撃+10% |
| 46 | 化けた | `c.upgrade_illusion`幻化強化+1, `c.evasion+0.010`回避+10 |
| 47 | 冷酷なる | `c.upgrade_composure`平静強化+1, `e.ice+0.10`氷攻撃+10%|
| 48 | 反射する | `c.upgrade_magical-counter`魔法反撃強化+1, `c.physical_attack+20`物攻撃+20% |
| 49 | 研ぎ澄ます | `c.upgrade_focus`集中強化+1, `c.magical_attack+20`魔攻撃+20% |
| 50 | 未来を変える | `c.upgrade_prophecy`予言強化+1, `c.physical_attack+10`物攻撃+10% |
| 51 | 影に消える | `c.upgrade_stealth`隠れ蓑強化+1, `c.evasion+0.015`回避+15 |
| 52 | 駆け巡る | (ミュリッド2アビリティ強化-未実装), `c.accuracy+0.015`命中+15 |
| 53 | 火焔の | `e.fire+0.30`炎攻撃+30%, `c.accuracy+0.010`命中+10 |
| 54 | 氷晶纏いし | `e.ice+0.30`氷攻撃+30%, `c.physical_defense+10`物防+10% |
| 55 | 電光帯びし | `e.thunder+0.30`雷攻撃+30%, `c.magical_defense+10`魔防+10% |
| 56 | 炎を躱す | `c.fire_defense_multiplier_x3/5`炎防x3/5, `c.evasion+0.010`回避+10 |
| 57 | 氷結砕きし | `c.ice_defense_multiplier_x3/5`氷防x3/5, `c.magical_attack+10`魔攻撃+10% |
| 58 | 電光いなす | `c.thunder_defense_multiplier_x3/5`雷防x3/5, `c.physical_attack+10`物攻撃+10% |
| 59 | 灼熱なる | `e.fire+0.20`炎攻撃+20%, `c.ice_defense_multiplier_x3/5`氷防x3/5 |
| 60 | 冷徹なる | `e.ice+0.20`氷攻撃+20%, `c.thunder_defense_multiplier_x3/5`雷防x3/5 |
| 61 | 天衝く | `e.thunder+0.20`雷攻撃+20%, `c.fire_defense_multiplier_x3/5`炎防x3/5 |
| 62 | 氷炎踊る | `c.ice_defense_multiplier_x3/5`氷防x3/5, `c.fire_defense_multiplier_x3/5`炎防x3/5 |
| 63 | 護られし | `c.armor_x1.1`鎧x1.1, `c.accuracy+0.010`命中+10 |
| 64 | 舞い踊る | `c.robe_x1.1`衣x1.1, `c.magical_defense+10`魔防+10% |
| 65 | 盾影に射る | `c.shield_x1.1`盾x1.1, `c.physical_attack+20`物攻撃+20% |
| 66 | 剣影に舞う | `c.sword_x1.1`剣x1.1, `c.evasion+0.010`回避+10 |
| 67 | 一閃に至る | `c.katana_x1.1`刀x1.1, `c.physical_defense+10`物防+10% |
| 68 | 慟哭し | `c.gauntlet_x1.1`手x1.1, `c.magical_attack+20`魔攻撃+20% |
| 69 | 矢で導く | `c.arrow_x1.1`矢x1.1, `c.magical_attack+20`魔攻撃+20% |
| 70 | 弩級の | `c.bolt_x1.1`ボx1.1, `c.physical_defense+10`物防+10% |
| 71 | 仇なす | `c.archery_x1.1`弓x1.1, `c.accuracy+0.010`命中+10 |
| 72 | 妖護りし | `c.wand_x1.1`杖x1.1, `c.magical_defense+10`魔防+10% |
| 73 | 秘められし | `c.grimoire_x1.1`書x1.1, `c.physical_defense+10`物防+10% |
| 74 | 許されぬ | `c.catalyst_x1.1`媒x1.1, `c.physical_attack+20`物攻撃+20% |
| 75 | 討ち抜く | `c.physical_offense_multiplier_x1.4`物攻撃1.4倍, `c.evasion-0.005`回避-5 | 
| 76 | 魔極めし | `c.magical_offense_multiplier_x1.4`魔攻撃1.4倍, `c.accuracy-0.005`命中-5  |
| 77 | 牙剝く | `c.physical_offense_multiplier_x1.2`物攻撃1.2倍, `c.magical_offense_multiplier_x1.2`魔攻撃1.2倍 |
| 78 | 深淵を覗く | `c.magical_attack+40`魔攻撃+40%, `c.physical_attack+10`物攻撃+10% |
| 79 | 疾風の如く | `c.physical_attack+40`物攻撃+40%, `c.evasion+0.010`回避+10 |
| 80 | 祝福されし | `c.physical_defense_multiplier_x3/5`物防x3/5, `c.magical_defense_multiplier_x3/5`魔防x3/5 |
| 81 | 災いもたらす | `c.growth_x0.9`成長0.9倍, `c.magical_offense_multiplier_x1.5`魔攻撃1.5倍 |
| 82 | 呪われし | `c.antagonism`⚠️敵対, `c.growth_x1.8`成長1.8倍 |

- `t.common_superRare_bag_default` table

| ID | tickets |
|-----|------|
| 0  | 409918 |
| 1 | 1 |
| 2 | 1 |
| ... | 1 |
| 82 | 1 |

- `t.rare_superRare_bag_default` table

| ID | tickets |
|-----|------|
| 0  | 40918 |
| 1 | 1 |
| 2 | 1 |
| ... | 1 |
| 82 | 1 |

**Threat weight**
- `t.physical_threat_weight_bag_default`
  - ID = row

| ID | tickets |
|---|----|
| 1 | 16 |
| 2 | 8 |
| 3 | 4 |
| 4 | 2 |
| 5 | 1 |
| 6 | 1 |

- `t.magical_threat_weight_bag_default` 

| ID | tickets |
|---|----|
| 1 | 2 |
| 2 | 2 |
| 3 | 2 |
| 4 | 2 |
| 5 | 2 |
| 6 | 2 |


**Elemental attribute**
  - `elemental_offense_attribute` : `e.none`, `e.fire`, `e.thunder`, `e.ice` // Offensive
  - `elemental_resistance_attribute` : `r.none`, `r.fire`, `r.thunder`, `r.ice` // Defensive

#### 1.2.2 Loading message
-Randomly select one entry from LOADING_MESSAGE each time the loading screen is displayed.

| LOADING_MESSAGE |
|-|
| ケモは長い夢を見る |
| ライカは再興の為なら何でもする |
| ランスロットは地位より信念を選ぶ |
| パーシヴァルは真実よりも果実を望む |
| レナードは人を信じない。シャチは別 |
| オルカは地上を歩きたい |
| ルナは奇跡を信じない |
| ノクスは宝石の心が盗めない |
| ミシュカは祖国に帰りたい |
| プチーツァは故郷を元に戻したい |
| フィンはまるい石が好き |
| マーレは普通のふりをする |