## 1. CONSTANTS 

**1.0.1 Naming Rule**

| Prefix | Description / Definition |
|-------|-------------------------|
| `a.` | **A**bility. Unique/Strongest. If multiple abilities share the same name, only the one with the highest value (or the highest priority) is active. |
| `b.` | **B**ase Status (Core attributes) and Base status bonus |
| `c.` | **C**ategory Bonus. Only one single bonuses(c.) of the **exact** same name applies. |
| `d.` | **D**uel Status (Current combat values). the bonus is stackable. |
| `e.` | **E**lemental Offense Attribute |
| `f.` | **F**unction (Logic/Calculated value) |
| `g.` | **G**ods, religions of their beliefs  |
| `i.` | **I**tem Category |
| `p.` | **P**arty/Expedition Instance Data |
| `q.` | Side **q**uest |
| `r.` | Elemental **R**esistance Attribute |
| `s.` | Item **S**tate |
| `t.` | **T**etris like bag Randomization |
| `terrain.` | **T**errain effect |
| `x.` | E**x**pedition |

- 1.0.2 Display format:

| `x.` | Display | Example |
|---|----|----|
| `c.ranged-attack+v` | [遠攻撃+v%] | `c.ranged-attack+13` -> [遠攻撃+13%] |
| `c.magical-attack+v` | [魔攻撃+v%] | `c.magical-attack-4` -> [魔攻撃-4%] |
| `c.melee-attack+v` | [近攻撃+v%] | `c.melee-attack+3` ->  [近攻撃+3%]  |
| `c.physical-defense+v` | [物防+v%] | `c.physical-defense+5` ->  [物防+5%] |
| `c.magical-defense+v` | [魔防+v%] | `c.magical-defense-2` -> [魔防-2%]  |
| `c.physical-defense_xN` | [物防N] | `c.physical-defense_x2/3` ->  [物防x2/3] |
| `c.magical-defense_xN` | [魔防N] | `c.magical-defense-x2/3` -> [魔防x2/3]  |
| `c.ranged-NoA+v` | [遠回数+v] | `c.ranged-NoA+2` -> [遠回数+2] |
| `c.magical-NoA+v` | [魔回数+v] | `c.magical-NoA+3` -> [魔回数+3] |
| `c.melee-NoA+v` | [近回数+v] | `c.melee-NoA-1` -> [近回数-1] |
| `c.accuracy+v` | [命中+(v*1000)] | `c.accuracy+0.001` -> [命中+1] |
| `c.evasion+v` | [回避+(v*1000)] | `c.evasion-3` [回避-3]  |
| `c.deity-accuracy+v` | [天命中+(v*1000)] |  `c.deity-accuracy+0.001` -> [命中+1] |
| `c.deity-evasion+v` | [天回避+(v*1000)] |　`c.deity-evasion-3`-> [回避-3]　|
| `r.fire-v` | [炎防v%] | `r.fire-3` -> [炎防3%] |
| `r.ice-v` | [氷防v%] | `r.ice-3` -> [氷防3%] |
| `r.thunder-v` | [雷防v%] | `r.thunder-3` -> [雷防3%] |
| `r.fire_xN` | [炎防N] | `r.fire_x2/3` -> [炎防x2/3] |
| `r.ice_xN` | [氷防N] | `r.ice_x2/3` -> [氷防x2/3] |
| `r.thunder_xN` | [雷防N] | `r.thunder_x2/3` -> [雷防x2/3] |
| `e.fire_xN` | [炎攻N] | `e.fire_x2/3` -> [炎攻x2/3] |
| `e.ice_xN` | [氷攻N] | `e.ice_x2/3` -> [氷攻x2/3] |
| `e.thunder_xN` | [雷攻N] | `e.thunder_x2/3` -> [雷攻x2/3] |


- Translation

| name | Japanese | short word |
|----|-----|---|
| common | 通常 | [C] |
| uncommon | アンコモン | [U] |
| elite rare | エリートレア | [E] |
| boss rare | ボスレア | [B] |　
| mythic rare | 神魔レア | [M] |

- **1.0.3 Glossary Reveal Rule:**
  - Each glossary entry of **ability and terrain effect** has an internal `revealed` flag.
  - A glossary entry is revealed when its related ability, terrain is shown to the player for the first time.
  - Once revealed, the entry is added to the Glossary.
  - Revealed entries remain visible permanently.
  - The `revealed` flag is internally managed and persisted in save data.
  - Hidden entries are not displayed in the Glossary until their related content has been shown at least once.

 
### 1.1 CONSTANTS_GLOSSARY

#### 1.1.1 a. bonus ability
- "能. アビリティボーナス (重複なし、強化可能)"

  - In the Glossary tab, abilities should be displayed in a single line.
    - Example: "居合斬り1 物理ダメージを xN倍する(攻撃回数が半減する) (Lv1: x1.6, Lv2: x1.8, Lv3: x2.0 )"
      - "居合斬り1" part is bold black text.
      - "物理ダメージを xN倍する(攻撃回数が半減する)" part is black text
      - "(Lv1: x1.6, Lv2: x1.8, Lv3: x2.0)" part is gray text
  - In Help floating bubble text, it displays like
    - Example: "居合斬り1 物理ダメージをx1.6倍する(攻撃回数が半減する)"

- Passive ability(常時効果アビリティ):
  - Sub category: 常, 征, 反, 時 (Default: 常)
 
| `a.` ability | label | description | Level scale |
|----|----|----|----|
| `a.iaigiri` | 居合斬り | 物理ダメージを xN倍する(攻撃回数が半減する) | Lv1: x1.6, Lv2: x1.8, Lv3: x2.0 |
| `a.hunter` | 狩人 | 列による命中率減衰を軽減する | Lv1: 15%→10%, Lv2: 15%→7%, Lv3: 15%→5% |
| `a.seeker` | 探究者 | 魔導書の効果を増加する(レベル毎にN%) | Lv1: +0.50%, Lv2: +0.75% |
| `a.cyborgization` | サイボーグ化 | 命中が増加し、回避が減少する | Lv1: 命中+30・回避-20, Lv2: 命中+40・回避-15 |
| `a.composure` | 平静 | 命中率がN%加算される | Lv1: +10%, Lv2: +13% |
| `a.arcane-stability` | 術式安定 | 魔法/物理攻撃の命中率はNを下回らない | Lv1: 55%, Lv2: 60% |
| `a.heavy-strike` | 重撃 | 物理/魔法ダメージを1.4倍する。攻撃回数を半減し(切り上げ)、減少分を貫通値に変換する(N) | Lv1: +1%/回, Lv2: +1.5%/回 |
| `a.arc-magic` | 大魔法 | 使用する魔法が大魔法になる(魔法攻撃回数が1/3倍になり、魔法ダメージがN倍になる) | Lv1: 3, Lv2: 3.6, Lv3: 4.2 |
| `a.focus` | 集中 | 命中ボーナスの効果がxN倍になる | Lv1: x1.2, Lv2: x1.3 |
| `a.colossal` | 巨人 | 自身の物理防御力が2倍になり、物理被ダメージ補正がx2.0になる | - |
| `a.upgrade-all-abilities` | 他のアビリティ強化 | 自身の他のアビリティをN段階強化する(上限レベル5) | Lv1: +1, Lv2: +2, Lv3: +3, Lv4: +4 |
| `a.melee-conversion` | 近接攻撃への変換 | 遠距離攻撃力のN%と魔法攻撃力のM%を近距離攻撃に加算する | Lv1: 30%・30%, Lv2: 40%・40% |
| `a.null-antagonism` | 敵対無効化 |　敵対の効果が自身に効かなくなる | - |
| `a.true-sight` | 真の視界 | 灰霞や霧の中でも視認できる(悪影響を受けなくなる) | - |
| `a.output-stabilizer` | 攻撃安定化 | いつでも安定して攻撃を行う(地形効果による攻撃回数の変動を受けなくなる) | - |
| `a.equation-breaker` | 式破り | 理論武装する(機械理論、静寂領域の地形効果が無効になる) | - |
| `a.unforgettable` | 不忘 | アビリティは消して忘れることがなくなる(忘却無効) | - |
| `a.null-shock` | 感電予防 | 感電しなくなる | - |
| `a.null-corrode` | 防腐 | 腐食しなくなる | - |
| `a.null-life-drain` | 吸血無効 | 吸血されることがなくなる |
| `a.null-death-touch` | 即死無効 | 接死が無効化する | - |
| `a.null-burn` | 火傷無効 | 火傷を負わなくなる | - |
| `a.null-bind` | 拘束無効 | 拘束を速やかに解くことができる | - |
| `a.domain-breaker` | 領域破り | 領域展開を無視する(これらの領域の効果の影響を受けない:必達領域、臨海領域、残響領域、静寂領域、剣戟領域、必中狙撃領域、必中魔法領域) | - |
| `a.wind-rider` | 風乗り | 風の影響を強く受ける(強風下では遠距離攻撃回数が0.50倍(より不利)、追い風では行動順判定に+2d3(より有利)) | - |
| `a.siege` | 攻城 | 要塞を容易に攻略できる(要塞防備による敵の有利な効果を無視できる) | - |
| `a.coldproof` | 寒さ耐性 | 寒さにとても強い(凍傷を無効化する) | - |
| `a.fire-protect-breaker` | 火炎守破り | 相手の炎属性反射・吸収効果を無視する(反射ダメージやダメージ吸収は発生しない) | - |
| `a.ice-protect-breaker` | 氷守破り | 相手の氷属性反射・吸収効果を無視する(反射ダメージやダメージ吸収は発生しない) | - |
| `a.thunder-protect-breaker` | 雷守破り | 相手の雷属性反射・吸収効果を無視する(反射ダメージやダメージ吸収は発生しない) | - |
| `a.m-barrier-breaker` | 魔法障壁破り | 相手の魔法障壁・魔法反射・魔法吸収効果を無視する(反射ダメージやダメージ吸収は発生しない) | - |
| `a.defender-breaker` | 守護破り | 相手の守護者の効果を無視する | - |
| `a.dryproof` | 耐乾燥 | 乾燥していても平気となる(乾燥地形効果を無効化) | - |
| `a.vine-cutter`| 小刀 | 蔓に絡まれても速やかに抜け出せるようになる(捕食蔓地形効果を無効化)  | - |
| `a.mana-ward`| 護符 | 魔力の逆流を防ぐ(水晶域・魔力侵食の地形効果を無効化) | - |
| `a.defiance` | 反発 | 抑圧に負けなくなる(抑圧地形効果を無効化)  | - |
| `a.anti-ambush` | 待ち伏せ回避 | 待ち伏せを回避するようになる(待ち伏せアビリティを無効化)   | - |
| `a.anti-overwatch`  | 監視回避 | 監視されなくなる(監視アビリティを無効化)  | - |
| `a.rage-breaker`| 士気挫き| 相手の闘志を削ぐ(闘志アビリティを無効化)  | - |
| `a.momentum-breaker`| 気勢外し | 相手の気勢を空回りさせる(気勢アビリティを無効化)  | - |
| `a.execution-null` | 処罰回避 | 処罰を逃れるようになる(エクセキューションを無効化)  | - |
| `a.pursuit` | 追い込み | 相手が逃げても追いかける(逃走・隠れ蓑アビリティを無効化)  | - |
| `a.illusion-breaker`  | 幻術破り | 相手の幻を見破る(幻化アビリティを無効化)  | - |
| `a.bulwark-breaker` | ウォールブレイカー | 壁を取り壊す(壁アビリティを無効化) | - |
| `a.base-status-cap-at-15` | 基礎ステ上限15 | 基礎ステータスは15を超えることがなくなる | - |
| `a.gravity-well` | グラビティウェル習得 | グラビティウェルを習得する。(魔法攻撃回数が20回以上の場合グラビティウェルを唱える。相手の残HPの2/5の固定ダメージ(魔法防御力無視)) | - |
| `a.armor-break` | アーマーブレイク習得 | アーマーブレイクを習得する。(魔法攻撃回数が12回以上の場合アーマーブレイクを唱える。相手の物理防御を落とす(与物理ダメージがx4/3になる)) | - |
| `a.mana-break` | マナブレイク習得 | マナブレイクを習得する。(魔法攻撃回数が10回以上の場合マナブレイクを唱える。相手の魔法防御を落とす(与魔法ダメージがx4/3になる)) | - |

- Expedition ability(遠征アビリティ):

| `a.` ability | label | description | Level scale |
|----|----|----|----|
| `a.tithe` | 十分の一税 | 遠征利益の+N%を寄付額に上乗せする | Lv1: +10%, Lv2: +15% |
| `a.squander` | 浪費 | 宴会で消費するゴールドがxN倍になる | Lv1: x1.3, Lv2: x1.5 |
| `a.prophecy` | 予言 | 報酬抽選内容を可視化し、N段階の操作が可能になる | Lv1: 可視化, Lv2: 可視化＋リセット |
| `a.cunning` | 狡猾 | 自動売却額がxN倍になる | Lv1: x1.2, Lv2: x1.3 |
| `a.peddler` | 行商 | 移動時間がxN倍になる | Lv1: x2/3, Lv2: x3/5 |

- Reactive ability(反応アビリティ):

| `a.` ability | label | description | Level scale | trigger |
|----|----|----|----|----|
| `a.resonance` | 共鳴 | 魔法攻撃を行うたびに、全ヒットのダメージが+N%増加する | Lv1: +4%, Lv2: +7%, Lv3: +9%, Lv4: +11%, Lv5: +12% | self-state |
| `a.ambush` | 待ち伏せ | 自身の通常行動時、相手がこの戦闘でまだ行動していなければ、与ダメージがxN倍になる | Lv1: x1.3, Lv2: x1.5, Lv3: x1.6, Lv4: x1.65, Lv5: x1.68 | self-state |
| `a.overwatch` | 監視 | 自身の通常行動時、味方および相手がこの戦闘でまだ行動していなければ、与ダメージがxN倍になる | Lv1: x1.3, Lv2: x1.5, Lv3: x1.6, Lv4: x1.65, Lv5: x1.68 | self-state |
| `a.rage` | 闘志 | 受けたダメージ1%につき、物理/魔法攻撃倍率が+N%増加する | Lv1: +0.5%, Lv2: +0.6% | self-state |
| `a.momentum` | 気勢 | 物理/魔法攻撃倍率がx1.25倍になり、受けたダメージ1%につき-N%減少する。収益の一部を着服する | Lv1: -0.5%, Lv2: -0.4% | self-state |
| `a.no-offense` | 受身 | 通常行動を行わなくなる(反撃などは行う) | - | self-state |
| `a.swarm` | 群れ | 失ったHP割合に応じて、物理与ダメージがN%低下し、物理被ダメージがN%増加する | Lv1: 失ったHP1%につき0.5% | self-state |
| `a.execution` | エクセキューション | 相手の残HPがN以下である場合、与ダメージがxM倍になる | Lv1:40%・1.5, Lv2:50%・1.8 |
| `a.stealth` | 隠れ蓑 | HPがN%未満のとき、自身へのダメージをすべて回避する | Lv1: 12%, Lv2: 18% | opponent-reactive |
| `a.illusion` | 幻化 | 最初の遠距離攻撃を無効化する(対象範囲:N) | Lv1: 自身に1回, Lv2: 自身+パーティー1名の2回 | opponent-reactive |
| `a.bulwark` | 壁 | 真後ろの味方への攻撃を肩代わりする(対象:N) | Lv1: 遠距離, Lv2: 遠距離＋近距離 | intercept |
| `a.shock` | 感電 | 最初の通常近接攻撃に対して発動し、1ヒット後に攻撃を中断させる | - | interrupt |
| `a.re-attack` | 連撃 | 攻撃時に追加攻撃を行う(攻撃回数がxN倍になる) | Lv1: x0.5, Lv2: x0.7, Lv3: x1.0 | on-strike |
| `a.corrode` | 腐食 | 通常近接攻撃が3回以上命中した相手の攻撃倍率をN倍にする | Lv1: x6/7, Lv2: x5/7, Lv3: x4/7, Lv4: x3/7, Lv5: x2/7 | on-strike |
| `a.life-drain` | 吸血 | 通常近接攻撃で相手に与えたダメージのNを回復する | Lv1: 0.1%, Lv2: 0.3%, Lv3: 1%, Lv4: 3%, Lv5: 10%, Lv6: 30%, Lv7: 100% | on-strike |
| `a.death-touch` | 接死 | 通常近接攻撃の命中回数Nの確率で即死させる | Lv1: 2/256, Lv2: 3/256, Lv3: 4/256, Lv4: 5/256, Lv5: 6/256 | on-strike |
| `a.burn` | 火傷 | 近接攻撃を受けた際に、相手に命中回数x 最大HPのN%の火属性ダメージを与え返す | Lv1: 0.5%, Lv2: 0.9%, Lv3: 1.2%, Lv4: 1.4%, Lv5: 1.5% | on-strike |
| `a.bind` | 拘束 | 近接攻撃の命中回数Nの確率で行動不能にする | Lv1: 2/64, Lv2: 3/64, Lv3: 4/64, Lv4: 5/64, Lv5: 6/64 | on-strike |
| `a.counter` | 反撃 | 物理攻撃を受けたとき反撃する(攻撃回数がN倍になる) | Lv1: x0.5, Lv2: x1.0, Lv3: x2.0 | counter |
| `a.magical-counter` | 魔法反撃 | 魔法攻撃に対して反撃する(攻撃回数がN倍になる) | Lv1: x0.5, Lv2: x1.0 | counter |
| `a.resurrect` | 再起 | 致命ダメージを受けた際、HPをN残して耐える(1回のみ) | Lv1: 1, Lv2: 1% | on-defeat |
| `a.reanimate` | 即時蘇生 | HPが0になったとき、HP N%で復活する(戦闘中1回のみ) | Lv1: 20%, Lv2: 26%, Lv3: 31%, Lv4: 35%, Lv5: 38% | on-defeat |
| `a.re-counter` | 再反撃 | 反撃に対して反撃する(攻撃回数がxN倍になる) | Lv1: x0.5, Lv2: x1.0 | counter-chain |
| `a.null-counter` | 反撃無効化 | 反撃を無効化する(最大N回) | Lv1: 1回, Lv2: 2回, Lv3: 3回 | anti-counter |
| `a.covering-fire` | 援護射撃 | 味方の近接攻撃が1ヒット時に遠距離攻撃で追撃する(攻撃回数がxN倍になる) | Lv1: x0.5, Lv2: x1.0 | ally-follow-up |
| `a.requiem` | 鎮魂歌 | 即時蘇生が一度発動した相手にこの攻撃が当たった時に発動する。相手を即死させる | on-strike  |


- Timed ability(時限アビリティ):
  - Timing display translation for Help floating bubble:
    - 指定: START(開始), COMBAT(戦闘), END(終了)
    - Exampple: "指定タイミングで発動し、相手の次の攻撃回数をxN倍にする"  Lv1: COMBAT6・x5/7 -> "戦闘タイミング6で発動し、相手の次の攻撃回数をx5/7倍にする"
 

| ability_id | label | description | level_scale | phase | priority |
|----|----|----|----|----|----|
| `a.oblivion` | 忘却 | 無作為に選んだ相手のアビリティ1つを、この戦闘中無効化する | - | START | 9 |
| `a.fading_memory` | 薄れる記憶 | 敵味方問わず無作為に選んだ相手のアビリティ1つを、この戦闘中無効化する | - | START | 8 |
| `a.mimic` | 模倣 | 相手のアビリティ1つを無作為に指定し、その効果を発動する | - | START | 8 |
| `a.defender` | 守護者 | 自身より後列の味方への物理ダメージをxN倍にする | Lv1: x2/3, Lv2: x3/5, Lv3: x1/2 | START | 7 |
| `a.command` | 指揮 | 自身より後列の味方が与える物理ダメージをxN倍にする | Lv1: x1.4, Lv2: x1.5, Lv3: x1.6 | START | 7 |
| `a.m-barrier` | 魔法障壁 | 自身より後列の味方への魔法ダメージをxN倍にする | Lv1: x2/3, Lv2: x3/5, Lv3: x1/2 | START | 7 |
| `a.ice-absorb` | 氷結吸収 | 自身が受ける予定の通常攻撃の氷属性ダメージを無効化し、N吸収して回復する | Lv1: 1/10, Lv2: 3/10, Lv3: 5/10, Lv4: 7/10, Lv5: 100% | START | 6 |
| `a.fire-absorb` | 火炎吸収 | 自身が受ける予定の通常攻撃の火属性ダメージを無効化し、N吸収して回復する | Lv1: 1/10, Lv2: 3/10, Lv3: 5/10, Lv4: 7/10, Lv5: 100% | START | 6 |
| `a.thunder-absorb` | 雷撃吸収 | 自身が受ける予定の通常攻撃の雷属性ダメージを無効化し、N吸収して回復する | Lv1: 1/10, Lv2: 3/10, Lv3: 5/10, Lv4: 7/10, Lv5: 100% | START | 6 |
| `a.magical-absorb` | 魔法吸収 | 自身が受ける予定の通常攻撃の魔法ダメージを無効化し、N吸収して回復する | Lv1: 1/10, Lv2: 3/10, Lv3: 5/10, Lv4: 7/10, Lv5: 100% | START | 6 |
| `a.ice-null` | 氷結無効 | 自身が受ける予定の通常攻撃の氷属性ダメージを無効化する | - | START | 5 |
| `a.fire-null` | 火炎無効 | 自身が受ける予定の通常攻撃の火属性ダメージを無効化する | - | START | 5 |
| `a.thunder-null` | 雷撃無効 | 自身が受ける予定の通常攻撃の雷属性ダメージを無効化する | - | START | 5 |
| `a.magical-null` | 魔法無効 | 自身が受ける予定の通常攻撃の魔法ダメージを無効化する | - | START | 5 |
| `a.ranged-null` | 遠距離無効 | 自身が受ける予定の遠距離攻撃のダメージを無効化する | - | START | 5 |
| `a.melee-null` | 近接無効 | 自身が受ける予定の近接攻撃のダメージを無効化する | - | START | 5 |
| `a.ice-reflect` | 氷結反射 | 自身が受ける予定の通常攻撃の氷属性ダメージのNを反射して相手に与える(自身は残りを受ける) | Lv1: 反射5%・被弾95%, Lv2: 反射10%・被弾90%, Lv3: 反射20%・被弾80%, Lv4: 反射35%・被弾65%, Lv5: 反射50%・被弾50% | START | 4 |
| `a.fire-reflect` | 火炎反射 | 自身が受ける予定の通常攻撃の火属性ダメージのNを反射して相手に与える(自身は残りを受ける) | Lv1: 反射5%・被弾95%, Lv2: 反射10%・被弾90%, Lv3: 反射20%・被弾80%, Lv4: 反射35%・被弾65%, Lv5: 反射50%・被弾50%  | START | 4 |
| `a.thunder-reflect` | 雷撃反射 | 自身が受ける予定の通常攻撃の雷属性ダメージのNを反射して相手に与える(自身は残りを受ける) | Lv1: 反射5%・被弾95%, Lv2: 反射10%・被弾90%, Lv3: 反射20%・被弾80%, Lv4: 反射35%・被弾65%, Lv5: 反射50%・被弾50% | START | 4 |
| `a.magical-reflect` | 魔法反射 | 自身が受ける予定の通常攻撃の魔法ダメージのNを反射して相手に与える(自身は残りを受ける) | Lv1: 反射5%・被弾95%, Lv2: 反射10%・被弾90%, Lv3: 反射20%・被弾80%, Lv4: 反射35%・被弾65%, Lv5: 反射50%・被弾50%  | START | 4 |
| `a.ranged-reflect` | 矢返し | 自身が受ける予定の遠距離攻撃ダメージをNに分散する | Lv1: 反射5%・被弾95%, Lv2: 反射10%・被弾90%, Lv3: 反射20%・被弾80%, Lv4: 反射35%・被弾65%, Lv5: 反射50%・被弾50% | START | 4 |
| `a.melee-reflect` | 打ち返し | 自身が受ける予定の近接攻撃ダメージのNを反射して相手に与える(自身は残りを受ける) | Lv1: 反射5%・被弾95%, Lv2: 反射10%・被弾90%, Lv3: 反射20%・被弾80%, Lv4: 反射35%・被弾65%, Lv5: 反射50%・被弾50% | START | 4 |
| `a.deflection` | 矢払い | 敵の遠距離攻撃の命中率をN%低下させる | Lv1: -10%, Lv2: -15% | START | 3 |
| `a.mutual-magic-amplify` | 魔法増幅 | 双方の魔法ダメージをxN倍にする | Lv1: x1.3, Lv2: x1.5, Lv3: x1.6, Lv4: x1.65, Lv5: x1.68 | START | 3 |
| `a.mutual-magic-restraint` | 魔法抑制 | 双方の魔法ダメージをxN倍にする | Lv1: x0.77, Lv2: x0.67, Lv3: x0.63, Lv4: x0.61, Lv5: x0.59 | START | 3 |
| `a.mutual-physical-amplify` | 物理増幅 | 双方の物理ダメージをxN倍にする | Lv1: x1.3, Lv2: x1.5, Lv3: x1.6, Lv4: x1.65, Lv5: x1.68 | START | 3 |
| `a.mutual-physical-restraint` | 物理抑制 | 双方の物理ダメージをxN倍にする | Lv1: x0.77, Lv2: x0.67, Lv3: x0.63, Lv4: x0.61, Lv5: x0.59 | START | 3 |
| `a.magic-seal` | 魔封 | 最初の魔法を無力化する(相手・自身・味方を含む) | - | START | 3 |
| `a.first-strike` | 先制攻撃 | 行動がN速くなる | Lv1: 少し(+1~3), Lv2: とても(+2~6), Lv3: 極めて(+3~9) | START | 3 |
| `a.boost` | 加速 | 自身の行動順をN増加させる | Lv1: 1, Lv2: 2, Lv3: 3 | START | 3 |
| `a.slow` | 鈍足 | 自身の行動順をN低下させる | Lv1: -1, Lv2: -2, Lv3: -3 | START | 3 |
| `a.frostbite` | 凍傷 | 相手の行動順をN低下させる | Lv1: -1 | START | 3 |
| `a.howl` | 遠吠え | 指定タイミングで、相手がまだ一度も行動していない時に発動する。相手の次の攻撃回数をxN倍にする | Lv1: COMBAT8・x5/7, Lv2: COMBAT8・x4/7, Lv3: COMBAT8・x3/7, Lv4: COMBAT8・x2/7, Lv5: COMBAT8・x1/7 | COMBAT | 2 |
| `a.ranged-confusion` | 遠距離混乱 | 指定タイミングで発動し、相手一人の未行動の遠距離行動をNの確率で敵対状態にする | Lv1: COMBAT7・1/32, Lv2: COMBAT7・3/32, Lv3: COMBAT8・3/32, Lv4: COMBAT8・5/32, Lv5: COMBAT8・7/32 | COMBAT | 2 |
| `a.magic-confusion` | 魔法混乱 | 指定タイミングで発動し、相手一人の未行動の魔法行動をNの確率で敵対状態にする | Lv1: COMBAT4・1/32, Lv2: COMBAT4・3/32, Lv3: COMBAT5・3/32, Lv4: COMBAT5・5/32, Lv5: COMBAT5・7/32 | COMBAT | 2 |
| `a.melee-confusion` | 近接混乱 | 指定タイミングで発動し、相手一人の未行動の近接行動をNの確率で敵対状態にする | Lv1: COMBAT1・1/32, Lv2: COMBAT1・3/32, Lv3: COMBAT2・3/32, Lv4: COMBAT2・5/32, Lv5: COMBAT2・7/32 | COMBAT | 2 |
| `a.unstable-core` | 不安定 | 指定タイミングで発動し、残HPのN%の自傷ダメージを受ける | Lv1: COMBAT4/COMBAT0・30%, Lv2: COMBAT4/COMBAT0・24%, Lv3: COMBAT4/COMBAT0・19%, Lv4: COMBAT4/COMBAT0・15%, Lv5: COMBAT4/COMBAT0・12% | COMBAT | 3 |
| `a.soul-reap` | 魂奪 | 指定タイミングで発動し、相手のHPがN%未満なら即死させる(回避・復活不可) | Lv1: COMBAT2・10%, Lv2: COMBAT2・14%, Lv3: COMBAT2・17%, Lv4: COMBAT2・19%, Lv5: COMBAT2・20% | COMBAT | 3 |
| `a.regeneration` | 再生 | 指定タイミングで発動し、この戦闘で失ったHPのN%を回復する | Lv1: COMBAT3・10%, Lv2: COMBAT3・15%, Lv3: COMBAT3・19%, Lv4: COMBAT3・22%, Lv5: COMBAT3・24% | COMBAT | 3 |
| `a.flying` | 飛行 | 指定タイミングで発動し、自身の回避を+Nする | Lv1: COMBAT3・40, Lv2: COMBAT3・45, Lv3: COMBAT3・50 | COMBAT | 3 |
| `a.predator-sense` | 捕食 | 指定タイミングで発動し、相手のHPがN%未満なら命中+40する | Lv1: COMBAT4・30%, Lv2: COMBAT4・38%, Lv3: COMBAT4・44%, Lv4: COMBAT4・48%, Lv5: COMBAT4・50% | COMBAT | 3 |
| `a.decompose` | 分解 | 指定タイミングで発動し、相手の物理防御力をxN倍にする | Lv1: COMBAT2・x6/7, Lv2: COMBAT2・x5/7, Lv3: COMBAT2・x4/7, Lv4: COMBAT2・x3/7, Lv5: COMBAT2・x2/7 | COMBAT | 2 |
| `a.self-destruct` | 自爆 | 指定タイミングで発動し、自爆して相手に残ダメージのNを与える | Lv1: COMBAT2・1/10, Lv2: COMBAT2・3/10, Lv3: COMBAT2・5/10, Lv4: COMBAT2・7/10, Lv5: COMBAT2・100% | COMBAT | 2 |
| `a.free` | 逃走 | 指定タイミングで発動し、戦闘から逃走する(戦闘は引分になる) | Lv1: COMBAT1, Lv2: COMBAT2, Lv3: COMBAT3, Lv4: COMBAT4, Lv5: COMBAT5 | COMBAT | 1 |
| `a.auriferous` | 含金 | 自身が受けた攻撃回数の累計が10回に達するごとに、ドロップ抽選チケット数を+1する | - | END | 5 |
| `a.first-aid` | 応急措置 | 各エリート戦後に、自身のHP増加基礎値とアイテムHP増加値のN%を回復する | Lv1: 2%, Lv2: 3%, Lv3: 4%, Lv4: 5%, Lv5: 6%  | END | 4 |


#### 1.1.2 b. bonus
- "基. 基礎値ボーナス (重複有効)"

| `b.` Key | 表示 | 説明 |
|--------|------|------|
| `b.vitality+v` | 体+v | 基礎体力に v を加算（HP/物防に影響） |
| `b.strength+v` | 力+v | 基礎筋力に v を加算（近接火力に影響） |
| `b.intelligence+v` | 知+v | 基礎知性に v を加算（魔法火力に影響） |
| `b.mind+v` | 精+v | 基礎精神に v を加算（HP/魔防に影響） |

#### 1.1.3 c. bonus
- "固. 固定ボーナス (同一名ボーナスは重複無効)"

| `c.` Key | 表示 | 説明 |
|--------|------|------|
| `c.melee-attack+v` | [近攻+v%] | 近接攻撃の最終ダメージを v% 乗算強化する|
| `c.ranged-attack+v` | [遠攻+v%] | 遠距離攻撃の最終ダメージを v% 乗算強化する |
| `c.magical-attack+v` | [魔攻+v%] | 魔法攻撃の最終ダメージを v% 乗算強化する |
| `c.physical-defense+v` | [物防+v%] | 物理防御の最終値を v% 乗算強化する |
| `c.magical-defense+v` | [魔防+v%] | 魔法防御の最終値を v% 乗算強化する |
| `c.melee-NoA+v` | [近回数+v] | 近接攻撃回数が v 回増える |
| `c.ranged-NoA+v` | [遠回数+v] | 遠距離攻撃回数が v 回増える |
| `c.magical-NoA+v` | [魔回数+v] | 魔法攻撃回数が v 回増える |
| `c.accuracy+v` | [命中+v] | 値が多いほどより多くの攻撃が命中するようになる |
| `c.evasion+v` | [回避+v] | 値が多いほどより多くの攻撃を回避するようになる |
| `c.equip-slot+v` | [装備+v] | 装備スロット数が v 増える |
| `c.equip_melee` | [近接装備] | 近接攻撃の装備が出来るようになる |
| `c.equip_ranged` | [遠距離装備] | 遠距離攻撃の装備が出来るようになる |
| `c.equip_magic` | [魔法装備] | 魔法攻撃の装備が出来るようになる |
| `c.penet+v` | [貫通+v] | 敵の防御力を v% 分無視する |
| `c.growth_xV` | [成長V倍] | キャラクター個人のHP基礎値及びアイテムHP増加値V倍 |
| `c.physical-attack+v` | [物攻+v%] | 遠距離攻撃・近距離攻撃の最終ダメージを v% 乗算強化する |
| `c.physical-offense-multiplier_xV` | [物攻撃V倍] | 遠距離攻撃・近接攻撃倍率がV倍 |
| `c.magical-offense-multiplier_xV` | [魔攻撃V倍] | 魔法攻撃倍率がV倍 |
| `c.physical-defense-multiplier_xV` | [物防xV] | 物理防御倍率がV倍(少ないほうが攻撃に強い) |
| `c.magical-defense-multiplier_xV` | [魔防xV] | 魔法防御倍率がV倍(少ないほうが攻撃に強い) |
| `c.fire-defense-multiplier_xV` | [炎防xV] |  炎属性耐性がV倍(少ないほうが攻撃に強い) |
| `c.ice-defense-multiplier_xV` | [氷防xV] |  氷属性耐性がV倍(少ないほうが攻撃に強い) |
| `c.thunder-defense-multiplier_xV` | [雷防xV] |  雷属性耐性がV倍(少ないほうが攻撃に強い) |
| `c.upgrade_V` | [V強化+1] | アビリティ:V を1段階強化する |
| `c.antagonism` | [⚠️敵対] | 味方を攻撃するようになる |
| `c.armor_x1.x` | [鎧x1.x] | 鎧カテゴリ装備の効果が 1.x 倍  |
| `c.robe_x1.x` | [衣x1.x]| 法衣カテゴリ装備の効果が 1.x 倍  |
| `c.shield_x1.x` | [盾x1.x] | 盾カテゴリ装備の効果が 1.x 倍  |
| `c.sword_x1.x` | [剣x1.x] | 剣カテゴリ装備の効果が 1.x 倍  |
| `c.katana_x1.x` | [刀x1.x] | 刀カテゴリ装備の効果が 1.x 倍  |
| `c.gauntlet_x1.x` | [手x1.x] | 籠手カテゴリ装備の効果が 1.x 倍  |
| `c.arrow_x1.x` | [矢x1.x] | 矢カテゴリ装備の効果が 1.x 倍  |
| `c.bolt_x1.x` | [ボx1.x] | ボルトカテゴリ装備の効果が 1.x 倍  |
| `c.archery_x1.x` | [弓x1.x] | 弓カテゴリ装備の効果が 1.x 倍  |
| `c.wand_x1.x` | [杖x1.x] | 杖カテゴリ装備の効果が 1.x 倍  |
| `c.grimoire_x1.x` | [書x1.x] | 魔導書カテゴリ装備の効果が 1.x 倍  |
| `c.catalyst_x1.x` | [媒x1.x] | 触媒カテゴリ装備の効果が 1.x 倍  |
| `c.unlock-(race)-ability` | [(race icon)解放] | (race icon, race name)のもう一つのアビリティ(unlock ability name)が解放される　|
| `c.deity-physical-attack_xV` | [天物攻xV] | 遠距離攻撃・近接攻撃のダメージを V倍する |
| `c.deity-magical-attack_xV` | [天魔攻xV] | 魔法攻撃のダメージを V倍する |
| `c.deity-physical-defense_x2/3` | [天物防2/3] | 物理防御倍率が2/3倍(少ないほうが攻撃に強い)  |
| `c.deity-pysical-defense_xV` | [天物防xV] | 物理防御倍率がV倍(少ないほうが攻撃に強い) |
| `c.deity-magical-defense_x2/3` | [天魔防2/3] | 魔法防御倍率が2/3倍(少ないほうが攻撃に強い) |
| `c.deity-magical-defense_xV` | [天魔防xV] | 魔法防御倍率がV倍(少ないほうが攻撃に強い) |
| `c.deity-move-first+1` | [天速度+1] | 行動速度の決定値に+1する(より早くなる) |
| `c.deity-accuracy+v` | [天命中+v] |  値が多いほどより多くの攻撃が命中するようになる |
| `c.deity-evasion+v` | [天回避+v] |　値が多いほどより多くの攻撃を回避するようになる　|


#### 1.1.4 d. bonus
- "増. 増加ボーナス説明 (重複有効)"

| `d.` | Display | 説明 |
|---|----|---|
| `d.ranged-attack` | 遠攻+v | 遠距離攻撃力に加算。敵の物理防御力を超えるとダメージを与えられる |
| `d.melee-attack` | 近攻+v | 近接攻撃力に加算。敵の物理防御力を超えるとダメージを与えられる |
| `d.magical-attack` | 魔攻+v | 魔法攻撃力加算。敵の魔法防御力を超えるとダメージが与えられる |
| `d.ranged-NoA+v` | 遠回数+v | 遠距離攻撃の攻撃回数が増加する |
| `d.magical-NoA+v` | 魔回数+v | 魔法攻撃の攻撃回数が増加する |
| `d.melee-NoA+v` | 近回数+v | 近接攻撃の攻撃回数が増加する |
| `d.ranged-offense-amplifier`| 遠距離攻撃倍率 | 遠距離攻撃で与えるダメージの倍率。(遠距離攻撃力- 敵の物理防御力)にこの倍率が掛かる |
| `d.magical-offense-amplifier`| 魔法攻撃倍率 | 魔法攻撃で与えるダメージの倍率。(魔法攻撃力- 敵の魔法防御力)にこの倍率が掛かる |
| `d.melee-offense-amplifier`| 近接攻撃倍率 | 近接攻撃で与えるダメージの倍率。(近接攻撃力- 敵の物理防御力)にこの倍率が掛かる |
| `d.physical-defense` | 物防+v | 物理防御力に加算。敵の遠距離攻撃力/近接攻撃力からこの値分引いた値がダメージの基準 |
| `d.magical-defense` | 魔防+v | 魔法防御力に加算。敵の魔法攻撃力からこの値分引いた値がダメージの基準   |
| `d.physical-defense-amplifier`| 物理耐性 | 物理耐性値が低かれば低いほど遠距離攻撃/近接攻撃のダメージを受けなくなる。(近接攻撃力- 敵の物理防御力)にこの倍数が掛かる |
| `d.magical-defense-amplifier`| 魔法耐性 | 魔法耐性値が低かれば低いほど魔法攻撃のダメージを受けなくなる。(魔法攻撃力- 敵の魔法防御力)にこの倍数が掛かる  |
| `d.physical-accuracy` | 物理命中率 | 初回の攻撃の命中率。隊列が後方になると命中率が下がる(1列ごとに15%ずつ減少)。隊列を組まない敵は常に100%となる。 |
| `d.magical-accuracy` | 魔法命中率 | 基本、隊列に影響なく100%となる。初回の攻撃は必ず命中する |
| `d.accuracy-v` | 命中+v | 命中の減衰率に加算。 命中の値が高いほど、複数の攻撃回数の際の命中回数が上振れする(減衰x0.90で20回攻撃では命中回数平均8.8回,減衰x0.92で20回攻撃では命中回数平均10.5回(命中+20時)) |
| `d.evasion-v` | 回避+v | 敵の命中の減衰率を減算。回避の値が高いほど、敵の複数攻撃回数の際の被弾回数が減少する(減衰x0.90で20回攻撃では命中回数平均8.8回,減衰x0.88で20回攻撃では命中回数平均7.5回(回避+20時)) |
| `d.accuracy-potency` | 命中減衰 | 命中率の減衰率を強化し、多段命中時の後続ヒットが外れやすくなる |
| `d.elemental-offense-attribute`| 攻撃属性 | 攻撃属性は、炎属性、氷属性、雷属性、無属性から成り立つ。最も属性の倍率が高い属性1つが攻撃属性として採用される。その属性倍率が与えるダメージに掛かる |
| `d.elemental-defense-attribute`| 属性耐性 | 敵の属性攻撃に対しての耐性。この耐性値が低ければ低いほどその属性攻撃に対して受けるダメージが減る |
| `e.fire+v` | 火属性+v% | 攻撃が火属性🔥になり、v%威力が増加する |
| `e.ice+v` | 氷属性+v% | 攻撃が氷属性❄️になり、v%威力が増加する|
| `e.thunder+v` | 雷属性+v% | 攻撃が雷属性⚡になり、v%威力が増加する|

#### 1.1.6 f. function
- "機. 機能 ゲームの仕組み"

| `f.` Key | 表示 | 説明 |
|--------|------|------|
| `f.physical-targeting` | 物理ターゲッティング | 遠距離/近接攻撃の攻撃対象選択する。\n隊列5に物理攻撃を3回以上狙われる可能性は、敵が32回攻撃では決して発生しない。\n| 隊列 | 可能性 |\n|---|----|\n| 1 | 16 |\n| 2 | 8 |\n| 3 | 4 |\n| 4 | 2 |\n| 5 | 1 |\n| 6 | 1 | |
| `f.magical-targeting` | 魔法ターゲッティング | 魔法攻撃は隊列に依存せずに対象を選択する。\n| 隊列 | 可能性 |\n|---|----|\n| 1 | 2 |\n| 2 | 2 |\n| 3 | 2 |\n| 4 | 2 |\n| 5 | 2 |\n| 6 | 2 | |
| `f.damage-calculation` | ダメージ計算 | ダメージは`攻撃力-防御力(貫通減算) × 各種倍率`で計算される。各種倍率とは属性倍率、耐性倍率、共鳴、怒り、勢い、パーティ補正などである。 |
| `f.hit-detection` | 命中減衰 | 多段の後続ヒットほど命中率が減衰する。行動単位で計算され、通常攻撃・連撃・反撃系で減衰は引き継がれない。\n|隊列| 通常 | 狩人1 | 狩人2 | 狩人3 |\n|---|---|---|---|---|\n|1| 1.00 | 1.00 | 1.00 | 1.00 |\n|2| 0.85 | 0.90 | 0.93 | 0.95 |\n|3| 0.72 | 0.81 | 0.86 | 0.90 |\n|4| 0.61 | 0.73 | 0.80 | 0.86 |\n|5| 0.52 | 0.66 | 0.75 | 0.81 |\n|6| 0.44 | 0.59 | 0.70 | 0.77 | |
| `f.counter` | 反撃 | 近接攻撃被弾後、即時反撃する。反撃無効化で無効化する。壁アビリティの身代わり効果を無視する。 |
| `f.re-counter` | 再反撃 | 反撃に対して再反撃する。反撃無効化で無効化する。 |
| `f.re-attack` | 連撃 | 攻撃後に追加攻撃を行う。同一対象へ追撃する。壁アビリティの身代わり効果を無視する。 |
| `f.magical-counter` | 魔法反撃 | 魔法攻撃に対して即時反撃する。 |
| `f.covering-fire` | 援護射撃 | 味方行動に連動して追撃する。遠距離攻撃可能な味方が即時射撃する。 |
| `f.reward` | 報酬計算 | 戦闘結果に応じてアイテムの追加抽選の有無を算出する。通常2枚。神の加護により+1枚。 |
| `f.common-enhancement`| コモンアイテムの通常称号| コモンアイテムで通常称号が付与する可能性。\n| 通常称号 | 可能性 |\n|---------|------|\n| (なし) | 1390 |\n| 名工の | 350 |\n| 魔性の | 180 |\n| 宿った | 60 |\n| 伝説の | 15 |\n| 恐ろしい | 4 |\n| 究極の | 1 ||
| `f.enhancement`| | \n| 希少アイテムの通常称号 | アンコモン、エリートレア、ボスレア、神魔レアで通常称号が付与する可能性。可能性 |\n|---------|------|\n| (なし) | 5490 |\n| 名工の | 350 |\n| 魔性の | 180 |\n| 宿った | 60 |\n| 伝説の | 15 |\n| 恐ろしい | 4 |\n| 究極の | 1 ||
| `f.enhancement-scaling`| 通常称号の性能向上 | 通常称号の段階に応じた基礎性能補正。\n| 通常称号 | 増加倍率 |\n|-----|------|\n| (なし) | x1.00 |\n| 名工の | x1.33 |\n| 魔性の | x1.58 |\n| 宿った | x2.10 |\n| 伝説の | x2.75 |\n| 恐ろしい | x3.50 |\n| 究極の | x5.00 | |
| `f.rarity-scaling`| レアリティの性能向上 | レアリティの段階に応じた基礎性能補正。\n| レアリティ | 増加倍率 |\n|------|--------|\n| コモン | x1.0 |\n| アンコモン | x1.2 |\n| エリートレア | x1.6 |\n| ボスレア | x2.4 |\n| 神魔レア | x3.6 | |
| `f.super-rare-scaling`| 超レアの性能向上 | 超レア称号が付くと、さらにその基礎性能が2倍される。また、それぞれ独自のボーナスが付与される。 |
| `f.donation`| 寄付金額 | 祈りフェーズの終わりに、信仰する神に売却益を寄付をすることがある。寄付金額に応じて信仰は強化される。 \n| ランク | 寄付金額 |\n|-------|----------|\n| 1 | 1,000 |\n| 2 | 2,800 |\n| 3 | 7,560 |\n| 4 | 19,656 |\n| 5 | 49,140 |\n| 6 | 117,936 |\n| 7 | 271,253 |\n| 8 | 596,757 |\n| 9 | 1,253,190 |\n| 10 | 2,506,380 ||
 | `f.equipment-slots` | 装備枠増加 | レベルアップに応じて装備枠が増える。
|レベル | 装備枠 |
|-----|-----------|
| 1 | 1 |
| 3 | 2 |
| 6 | 3 |
| 10 | 4 |
| 14 | 5 |
| 19 | 6 |
| 24 | 7 |
| 30 | 8 |
| 36 | 9 |
| 43 | 10 |
| 50 | 11 |
| 57 | 12 |
| 65 | 13 |
| 73 | 14 |
| 81 | 15 |
| 90 | 16 |
| 99 | 17 | |
| `f.afk-emulation-efficiency` | 放置効率 | 放置時間が長くなるとパーティメンバはサボり出す。
| 放置時間 | 効率  |
| ------: | ---: |
|    0–9h |   x1 |
|   9–18h | x2/3 |
|  18–30h | x1/2 |
|  30–48h | x1/3 |
|  48–72h | x1/4 |
| 72–108h | x1/6 |
|108–162h | x1/9 |
 |


#### 1.1.7 g. gods, religions
- "信. 神、信仰"

| `g.` Key | 表示 | 効果説明 | Lore |
|--------|------|------|----|
| `Goddess of Restoration` | 再生の女神 | 効果:4部屋毎に減少HPの20+α%を回復する。睡眠時間2倍。氷属性に弱い(1.5倍ダメージ増) | 生とは、繰り返される修正である。 |
| `God of Attrition` | 消耗の神 | 効果:全員に物理攻撃倍率1.20+α倍。4部屋毎に残りHPの5%を失う。 | カジェルで戦え。カジェルが無くなれば、爪で戦え。爪が無くなれば、牙で戦え。 |
| `God of Cunning` | 狡猾の神 | 効果:全員に魔法防御倍率2/3倍。貯金額0.50+α倍(着服する)。 | 真実は力ではない。信じさせることが力である。 |
| `God of Fortification` | 防備の神 | 効果:全員に物理防御倍率2/3倍。休息時間2倍。雷属性に弱い(1.5倍ダメージ増) | 平和を望むならば、戦に備えよ。 |
| `Goddess of Fertility` | 豊穣の女神 | 効果:全員に天速度+1(行動速度が速くなる)。自由行動時間1.2倍。火属性に弱い(1.5倍ダメージ増) | 肥沃な土壌は、多くの穀肉を求むる。 |
| `God of Resonance` | 共鳴の神 | 効果:全員の共鳴を1+α段階強化。共鳴は魔法攻撃だけでなく、遠距離攻撃にも適用。魔法防御倍率1.10倍、HP0.90+α倍。 | 語られぬ神は消える。響かぬ名は滅びる。|
| `Goddess of Precision` | 精密の女神 | 効果:全員の命中+15+α、回避-5。探索時間1.2倍。 | 失敗の先には成功がある。 |
| `God of Fate` | 運命の神 | 効果:未来改変。祈り時間2倍。 | 未来を知る者はそれを変えてしまう。 |
| `God of Dusk` | 黄昏の神 | 効果:全員の回避+15+α、魔法防御倍率1.10倍。売却時間2倍 | 光と闇の境界で、最も多くの嘘が生まれる。 |
| `Goddess of Mirage` | 幻影の女神 | 効果:全員に魔法攻撃倍率1.2+α倍、物理防御倍率1.10倍。 | 真実と幻想に違いはない。違いは込められた願いのみ。 |
| `God of Oblivion` | 忘却されし神 | 効果:戦闘開始時、ランダムな1名が薄れる記憶を得る。ランクが2上がるごとに、超レア報酬抽選回数が+1される。(現在:+N)| 神の存在には、ただ一人の真なる信徒で足りる。 |
| `Goddess of Discord` | 不和の神 | 効果:戦闘開始時、ランダムな1名を⚠️敵対させる。ランクが1上がるごとに、報酬抽選回数が+1される。(現在:+N)| 調和は停滞である。混沌こそ昇華の源。 |

- **next-rank donation amount for gods**
  - n is rank
　- Donation(1) = 1,000 G, Donation(n) = (3.0 - 0.1 * n) * Donation(n-1) (round off)
  - max rank is 10.

#### 1.1.8 m. magic
- "魔. 魔法攻撃 (装備によって唱える魔法の種類が変わる)"

| Key | style | element | spell(詠唱魔法) | 効果 |
|-|-|-|-|-|
| `m.arcane-arrows` | `multi-hit` | `e.none` | アルカナアロー | 無属性の基本魔法攻撃 |
| `m.fire-lance` | `multi-hit` | `e.fire` < 1.5 | ファイアランス | 火属性基本魔法(火属性50%未満) |
| `m.frost-needles` | `multi-hit` | `e.ice` < 1.5 | フロストニードル | 氷属性基本魔法(氷属性50%未満) |
| `m.thunder-bolts` | `multi-hit` | `e.thunder` < 1.5 | サンダーボルト | 雷属性基本魔法(雷属性50%未満) |
| `m.hellfire-volley` | `multi-hit` | `e.fire` >= 1.5 | ヘルファイア | 火属性上位魔法(火属性50%以上) |
| `m.blizzard` | `multi-hit` | `e.ice` >= 1.5 | ブリザード | 氷属性上位魔法(氷属性50%以上) |
| `m.lightning-barrage` | `multi-hit` | `e.thunder` >= 1.5 | ライトニングバラージ | 雷属性上位魔法(雷属性50%以上) |
| `m.astral-flare` | `arc-magic` | `e.none` | アストラルフレア | 無属性大魔法 |
| `m.pyroclasm` | `arc-magic` | `e.fire`  | パイロクラスム | 火属性大魔法 |
| `m.glacial-burst` | `arc-magic` | `e.ice`  | グレイシャルバースト | 氷属性大魔法 |
| `m.tempest-nova` | `arc-magic` | `e.thunder` | テンペストノヴァ | 雷属性大魔法 |
| `m.gravity-well` | `percentage-damage` | `e.none` | グラビティウェル | 魔法攻撃回数が20回以上の場合発動。相手の残HPの2/5の固定ダメージ(魔法防御力無視) |
| `m.gravity-well` | `percentage-damage` | `e.none` | グラビティウェル | 魔法攻撃回数が20回以上の場合発動。相手の残HPの2/5の固定ダメージ(魔法防御力無視) |
| `m.armor-break` | `debuff` | `e.none` | アーマーブレイク | 相手の物理防御を落とす(与物理ダメージがx4/3になる) |
| `m.mana-break` | `debuff` | `e.none` | マナブレイク | 相手の魔法防御を落とす(与魔法ダメージがx4/3になる) |


#### 1.1.9 q. side quest
- "求. サイドクエスト (条件達成すると報酬として結晶が手に入る)"

| ID | type | Short text | Display text format | deadline | logic | for Glossary Title | for Glossary content |
|--|--|---|---|---|---|---|---|
| 0 | (none) | |  | | | | |
| 1 | `q.squander` | 散財(XXXG) | 宴会で XXXG 浪費する(0%, XXXG)　(神魔戦で中止) | 250 ~ 1,000 G | 16 hours | | 散財 | 宴会で浪費する(神魔戦で中止) |
| 2 | `q.sleeping` | 安眠(X回) | X回寝る(0%, X回)　(神魔戦で中止) | 12 hours | | 安眠 | 寝る(神魔戦で中止) |
| 3 | `q.exercise` | 運動(XX分) | X分歩く(0%, XX分)　(神魔戦で中止) | 16 hours | count the time of 移動中 and 帰還中 state | 運動 | 歩く(神魔戦で中止) |
| 4 | `q.embezzlement` | 横領(XXXG) | XXXG着服する(60%, XXXG)　(神魔戦で中止) | 16 hours | | 横領 | 着服する(神魔戦で中止) | 
| 5 | `q.donation` | 寄付(XXXG) | 200G寄付する(10%, XXXG)　(神魔戦で中止) | 12 hours | | 寄付 | 寄付する(神魔戦で中止) | 
| 6 | `q.healing` | 治療(X分) | X分治療を受ける (10%, XX分)　(神魔戦で中止) | 16 hours | count the time of rest state | 治療 | 治療を受ける(神魔戦で中止) |
| 7 | `q.AFK` | 放置(X分) | X分神から見放されている (10%, XX分)　(神魔戦で中止) | - | | 放置 | 神から見放されている(神魔戦で中止) |
| 8 | `q.treasure-super-rare` | 超レア獲得 | 超レアを獲得する(0%)　(神魔戦で中止) | 24 hours | | 超レア獲得 | 超レアを獲得する(神魔戦で中止) |
| 9 | `q.treasure-boss-rare` | ボスレアXX個獲得 | ボスレアを XX個獲得する(0%, X個)　(神魔戦で中止) | 16 hours | | ボスレア獲得 | ボスレアを獲得する(神魔戦で中止)  | 
| 10 | `q.poor-kid` | 空振り(XX回) | XX回アイテム獲得空振り(0%, X個)　(神魔戦で中止) | 9 hours | | アイテム獲得空振り | アイテム獲得空振り(自動売却を除いたアイテムの有無で判定)(神魔戦で中止) |
| 11 | `q.consecutive-wins` | 連続踏破(XX連続) | XX連続して踏破する(30%, XX連)　(神魔戦で中止) | 16 hours | reset to 0 if defeat/retreat/non-victory condition | 連続踏破 | 連続して踏破する(神魔戦で中止) |
| 12 | `q.losers` | 敗北 | 敗北する(0%)　(神魔戦で中止) | 9 hours | |  敗北 | 敗北する(神魔戦で中止) |
| 13 | `q.savings` | 貯金(XXXG) | 1,000G貯金する(10%, XXXG)　(神魔戦で中止) | 16 hours | | 貯金 | 貯金する(神魔戦で中止)　|

#### 1.1.10 t. terrain effects
- "地. 地形効果"

| Terrain effect | Japanese | description (Japanese) |
|---|---|---|
| `terrain.rejuvenation` | 活性化 | 各部屋の終了時、減少HPの2%を回復する |
| `terrain.abundant` | 豊富 | 各部屋の終了時、最大HPの2%を回復する |
| `terrain.rotwood` | 腐敗 | すべての回復能力は無効化される |
| `terrain.decay` | 崩壊 | 戦闘終了時、最大HPの2%のダメージを受ける |
| `terrain.leakage` | 漏電 | 各部屋の終了時、現在HPの3%に等しい雷属性ダメージを受ける |
| `terrain.exposure` | 露出 | 双方の物理被ダメージが1.3倍になる |
| `terrain.dark-field` | 闇域 | 双方の物理ダメージが1.45倍になる |
| `terrain.light-field` | 光域 | 双方の魔法ダメージが1.45倍になる |
| `terrain.sanctuary` | 聖域 | 双方の魔法ダメージが0.67倍になる |
| `terrain.frenzy` | 狂騒 | 双方の被ダメージが1.25倍になる |
| `terrain.fortified` | 要塞防備 | 敵が受ける物理・魔法の被ダメージが0.75倍になる |
| `terrain.rough-waves` | 荒波 | 近接攻撃回数が0.75倍になる |
| `terrain.heavy-wind` | 強風 | 遠距離攻撃回数が0.75倍になる |
| `terrain.burrow` | 地下穴 | 遠距離攻撃回数が0.50倍になる |
| `terrain.low-gravity` | 低重力 | すべての攻撃回数が1.3倍になる |
| `terrain.gravity` | 重力場 | すべての攻撃回数が0.7倍になる |
| `terrain.limestone-cave` | 鍾乳洞 | 魔法攻撃回数・近接攻撃回数が1.5倍になる |
| `terrain.tailwind` | 追い風 | パーティメンバーの行動速度が少し早まる（行動順判定に+1d3） |
| `terrain.enemy-high-ground` | 敵高所優位 | 敵の行動速度が少し早まる（行動順判定に+1d3） |
| `terrain.ash-haze` | 灰霞 | すべての先制攻撃を無効化する |
| `terrain.machine-logic` | 機械論理 | 行動順を変化させるすべての効果は無効化される(先制攻撃・鈍足など) |
| `terrain.fog` | 濃霧 | すべての遠距離攻撃の命中が-25される |
| `terrain.sunny-beach` | 陽だまりの浜辺 | 双方の遠距離攻撃の命中+20 |
| `terrain.spell-domain` | 必中魔法領域 | 双方の魔法攻撃はすべて必中する |
| `terrain.sniper-domain` | 必中狙撃領域 | 双方の遠距離攻撃はすべて必中する |
| `terrain.duelist-domain` | 剣戟領域 | 双方の近接攻撃はすべて必中する |
| `terrain.vine-snare` | 捕食蔓 | 攻撃を行うたび、その攻撃者は現在HPの1%のダメージを受ける |
| `terrain.crystal-zone` | 水晶域 | 魔法攻撃を使用したとき、攻撃者は与えたダメージの5%の反動ダメージを受ける |
| `terrain.conduction` | 導電 | 雷属性攻撃を行うと、攻撃者は与えたダメージの5%の雷属性ダメージを受ける |
| `terrain.mana-burn` | 魔力侵食 | 魔法攻撃を行うたび、使用者は最大HPの2%のダメージを受ける |
| `terrain.predation` | 捕食本能 | HPが50%未満の対象への物理ダメージが1.3倍になる |
| `terrain.sacred-judgement` | 神罰 | この戦闘で最初に行動した対象に現在HPの5%の雷属性攻撃が下る |
| `terrain.thunderstorm` | 雷雨 | 双方に雷威力x3/2(雷威力が上がる)を付与する |
| `terrain.dry` | 乾燥 | 氷属性ダメージがx0.5になる |
| `terrain.echo-domain` | 残響領域 | 同一戦闘中に使用された属性攻撃1回につき、その属性攻撃の効果が+10%される |
| `terrain.chain-lightning` | 連鎖雷撃 | 雷属性攻撃が命中した場合、ランダムな別対象に30%威力で追加ヒットする |
| `terrain.heatwave` | 熱波 | 各部屋の終了時、現在HPの5%に等しいダメージを受ける |
| `terrain.chill` | 冷気 | 部屋の継続時間が2倍になる |
| `terrain.looping-path` | 迷いの森 | 部屋の継続時間が2倍になる |
| `terrain.floor-domain` | 必達領域 | 命中1発あたりの最終ダメージは対象の最大HPの1%を下回らない |
| `terrain.cap-domain` | 臨界領域 | 命中1発あたりの最終ダメージは対象の最大HPの5%を超えない |
| `terrain.deletion` | 削除 | 戦闘開始時、双方のいずれかの対象のアビリティ1つを忘却させる |
| `terrain.silence-field` | 静寂領域 | すべての[効]アビリティは発動しない |
| `terrain.transcendence` | 超越 | 双方の反応・時限アビリティレベルが+1される(レベル上限5) |
| `terrain.suppression` | 抑圧 | 双方の反応・時限アビリティレベルが-1される(レベル下限1) |
| `terrain.gehenna` | ゲヘナ | 神々の恩恵を受けることがなくなる |

