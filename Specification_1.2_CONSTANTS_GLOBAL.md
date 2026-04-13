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
- There are weighted bags (g.*_bag) that control probabilistic randomness: `t.common_reward_bag`, `t.common_enhancement_bag`, `t.uncommon_reward_bag`, `t.elite_rare_reward_bag`, `t.boss_rare_reward_bag`, `t.mythic_rare_reward_bag`, `t.enhancement_bag`, `t.superRare_bag`, `t.physical_threat_weight_bag`, `t.magical_threat_weight_bag`, `t.side_quest_bag`, and
`t.sleepiness_of_party_bag` for each party. 
  - All bags persist in save data and are not reset per battle or per expedition.
  - Bags are reset only when: explicitly reset, or automatically reset when the bag becomes empty (total_tickets == 0).
	
- Weighted Random Bag (Count-Based Ticket Rule)
  - Each bag stores counts per entry, not individual tickets.
  - Each entry is { ID, tickets }.
  - Bag iteration order is stable (e.g., ascending ID).
    - Examples:
      - `t.common_reward_bag` = { { ID: 0, tickets: 90 }, { ID: 1, tickets: 10 },  }
      - `t.superRare_bag` = { { ID: 0, tickets: 399920 }, { ID: 1, tickets: 1 }, { ID: 2, tickets: 1 }, ... , { ID: 80, tickets: 1 } }

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
| 0 | no item | 97 |
| 1 | win | 3 |  

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
| 11 | 守護の | `c.upgrade_defender`守護者強化+1, `c.physical_attack+10`物攻撃+10% |
| 12 | 前線を貫く | (戦士2アビリティ強化-未実装), `c.penet+0.04`貫通+4 |
| 13 | 執着し | `c.upgrade_counter`反撃強化+1, `c.evasion+0.010`回避+10 |
| 14 | 煌めく | (剣士2アビリティ強化-未実装), `c.magical_attack+30`魔攻撃+30%  |
| 15 | 華麗なる | `c.upgrade_re-attack`連撃強化+1, `b.mind+1`精神+1 |
| 16 | 闇駆ける | (忍者2アビリティ強化-未実装), `c.magical_attack+30`魔攻撃+30% |
| 17 | 抜刀の | `c.upgrade_iaigiri`居合斬り強化+1, `b.intelligence+1`知性+1 |
| 18 | 一太刀を制す | (侍2アビリティ強化-未実装), `c.magical_defense_multiplier_x3/5`魔防x3/5  |
| 19 | 鼓舞し | `c.upgrade_command`指揮強化+1, `c.magical_attack+10`魔攻撃+10% |
| 20 | 王道なる | (君主2アビリティ強化-未実装), `c.penet+0.08`貫通+8 |
| 21 | 狙いし | `c.upgrade_hunter`狩人強化+1, `c.magical_attack+10`魔攻撃+10%  |
| 22 | 獲物を追う | (狩人2アビリティ強化-未実装), `c.evasion+0.015`回避+15 |
| 23 | 響き渡る | `c.upgrade_resonance`共鳴強化+1, `b.vitality+1`体力+1 |
| 24 | 唱えし | (魔法使い2アビリティ強化-未実装), `c.magical_defense+10`魔防+10% |
| 25 | 障壁の | `c.upgrade_m-barrier`魔法障壁強化+1, `b.strength+1`力+1 |
| 26 | 理の | (賢者2アビリティ強化-未実装), `c.physical_defense_multiplier_x3/5`物防x3/5 |
| 27 | 風切り躱す | `c.upgrade_deflection`矢払い強化+1, `c.magical_attack+10`魔攻撃+10% |
| 28 | 影に溶ける | (盗賊2アビリティ強化-未実装), `c.physical_attack+30`物攻撃+30% |
| 29 | 節制の | `c.upgrade_null-counter`反撃無効化強化+1, `c.accuracy+0.015`命中+15 |
| 30 | 祈りし | (巡礼者2アビリティ強化-未実装), `c.physical_attack+30`物攻撃+30% |
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
| 48 | 駆け巡る | (ミュリッド2アビリティ強化-未実装), `c.accuracy+0.015`命中+15 |
| 49 | 化けた | `c.upgrade_illusion`幻化強化+1, `c.evasion+0.010`回避+10 |
| 50 | 原初の | (プロキオニア2アビリティ強化-未実装), `c.penet+0.04`貫通+4 |
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

- `t.superRare_bag_default` table

| ID | tickets | multiplier |
|-----|------|-----|
| 0  | 399920 | x1.0 |
| 1 | 1 | x2.0 |
| 2 | 1 | x2.0 |
| ... | 1 | x2.0 |
| 80 | 1 | x2.0 |

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


