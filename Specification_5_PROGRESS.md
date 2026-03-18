## 5. PROGRESS 

### 5.1 Party State Machine

- Use one state per party. Every party ticks independently.

- **State list**

| State | Logic | Move to | Durration modifilier |
|-------|-------|----------|---------|
| rest(休息中)  | at home | sell or feast | `God of Fortification` |
| sell(売却中) | at home, Sell auto-sell items to shop owners. and officially gain items (notification of item gains at the end of sell state.). If they have no trophy nor auto-sell item, skip this state. | feast | `God of Dusk` |
| feast(宴会中) | at home, skip if current_profit = 0). Skipped if the party’s total HP was below 30% of Max HP at the beginning of rest state. | sound_sleep or nap_sleep or pray | `Goddess of Fertility` |
| sleep/ sound_sleep(熟睡中), nap_sleep(仮眠中) | at home. skip if the party’s total HP was below 10% of Max HP at the beginning of rest state. (no draw a ticket from `t.sleepiness_of_party_bag`) | sound sleep:outfit, nap_sleep:pray |
| outfit(身支度中) | equipping items. skip if no sound_sleep | pray |
| pray(祈り中) | at home. Party members donate money to their deity. | idle or move |
| idle(待機中) | at home. only when 自動周回 = OFF (idle state) | - |
| move(移動中) | home → dungeon, If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3, `a.peddler`2: 3/5) | explore | `a.peddler` |
| explore(探索中) | in dungeon. if HP < 30% MaxHP → retreat. At the end of this state, update this {ルピニアンの断崖踏破} part ) | return | `Goddess of Precision` |
| return(帰還中) | dungeon → home,If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3, `a.peddler`2: 3/5) | rest | 
| reactivate(復帰中) | Reactivating from AFK mode | - | - |

- **Realtime Progress**
- Debug Scaling:
  - If `x5 boost` , all durations are multiplied by **0.2**.
  - If `x20 boost` , all durations are multiplied by **0.05**.


| State | Duration |
|-------|-------|
| rest(休息中)  | heal max(100, +1% MaxHP) / 2 sec until full |
| sell(売却中) | 5 seconds per `auto-sell` items |
| feast(宴会中) | 90 seconds |
| sound_sleep(熟睡中) | 120 seconds |
| nap_sleep(仮眠中) | x 1/5 of sound sleep |
| outfit(身支度中) | 60 seconds |
| pray(祈り中) | 30 seconds |
| move(移動中) | 10 seconds * (1.30 - 0.02 * `x.exp_tier` )^(`x.exp_tier`) | 
| explore(探索中) | 5 seconds per room (24 rooms in total)|
| return(帰還中) | 30 seconds * (1.30 - 0.02 * `x.exp_tier` )^(`x.exp_tier`)  |

- sleepiness from `t.sleepiness_of_party_bag` 
  - 0 No sleep: The party skips the sleep state and continues the normal cycle.
  - 1 Nap: The party enters a short sleep (light rest). ( x 1/5 sleep duration)
  - 2 Sound sleep: The party enters a full sleep state. ( x1 sleep duration )



- Profit usuage:
  - At: rest(休息中):
      - `current_profit` = 0
  - At the end of sell(売却中):
      - `current_profit` = Sum of (Auto-sell items)
  - At the end of feast(宴会中):
      - `current_profit` -= spending feast ( spend 33–67% of `current_profit` without `a.squander`, x1.3 spending with `a.squander`1, x1.5 spending with `a.squander`2. Not exceed current_profit )
        - Notification :
          - Without Squander: PT1は25Gお金を使った
          - With Squander: PT1 君主トムは贅沢に50G使った
  - At the end of pray(祈り中):
      - `current_profit` -= donattion ( 10–33% of `current_profit` without `a.tithe`, if party has `a.tithe`2, Adds +15% , else if party has `a.tithe`1, Adds +10, if deity = none, donation is 0. )
      - `current_profit` -= embezzlement (if `God of Cunning`, +50% of `current_profit`. if partymember.`a.momentum`, +10% of `current_profit`. Else if, 0%)
        -  Notification:
          - deity = none: PT1は 43Gを貯金した
          - Without Tithe: PT1は10G神に捧げ、30Gを貯金した
          - With Tithe: PT1 巡礼者ブラザは祈りと共に12G神に捧げて、28Gを貯金した
          - Without Gold: (no notification).
          - If `God of Cunning`, add (21Gを着服した).   ex:PT1は10G神に捧げ、20Gを貯金した (20Gを着服した)
      - `savings` = `current_profit`, `current_profit` = 0
  - If Pressing 出撃/神魔戦 button (and it is Available for sortie )
      - `current_profit` -= embezzlement ( 100% of `current_profit`)
        - Notification:
          - Without embezzlement: PT1は神の緊急動員に憤りながらも出撃した
          - With embezzlement: PT1は神の緊急動員に憤り、49Gを持ち逃げして出撃した

- Player taps 出撃
  - If party is in return / idle / rest / sell / feast / sound_sleep / nap_sleep / pray state:
  - Immediately set state to move state
  - If they not gain items (not finished 売却中 state), immediately gain items and show notifications.
  - Do not refill HP; dungeon starts with current HP. No squander, donation, nor remaining profits to the global wallet. The profit vanishes (The party menders would definitely not be happy with this players emergency sortie.)
  - If party is already in explore state: ignore tap
  - If party Hp is 0 (just after defeated): ignore tap and show notification log:"random party.character は疲弊しており出撃を拒否した"


- **Transition rules**
  - 自動周回ON: 休息中→宴会中(if possible)→睡眠中→祈り中→待機中→移動中→探索中→帰還中→休息中
  - 自動周回OFF: 移動中→探索中→帰還中→休息中 → 宴会中(条件付き) → 睡眠中 → 祈り中 → 待機中 (stop here)


**Time-Based Progress Handling (Online + AFK)**
- The state machine is purely time-based: persist `state` and `state_started_at`, and on each update tick compute progress from `now - state_started_at`, applying any completed transitions to reach the latest state.
- Update `state_started_at` **only when the party state changes** (on every state transition).
- Limit: maximum 1,800 minutes (30 hours) per catch-up simulation (current version).

**Notification**
- Format: 踏破N回/帰還Y回/引分Z回/撤退M回/敗北X回 寄付金額: vG, 貯金額:　vG
  - Key and label:Clear(踏破) / Turned_Back(帰還) / Draw_Retreat(引分) / Wounded_Retreat(撤退) / Defeat(敗北)
    - Turned_back: Cannot continue because a requirement (loot gate conditiojn) isn’t met and must return home
    - Draw_Retreat: the last room outcome is Draw
    - Wonded_Retreat: Victory but If the party.`d.HP` <= 30% of max HP, back to home with trophies. (excpetion: the Final Boss room) 
- If the value is 0, not display its text (if all zero, then no notification)

```
Exapmle:
PT1: 踏破10回/敗北1回 寄付金額: 10G, 貯金額:　30G
PT2: 踏破1回 寄付金額: 10G, 貯金額:　30G
PT3: 貯金額: 10G
```

### 5.2 Side Quest
**Trigger Condition**
- Checked at the end of the **帰還中 (Returning)** state.
- If the party:
  - has **no active loot gate condition** (including God battle loot gates), and
  - has **no active side quest**
- then roll one ticket from `t.side_quest_bag`.

**Assignment**
- The selected side quest is assigned immediately after the **Returning** state ends.
- Notification example:
  - "PT1はサイドクエスト 治療 (2時間) を受けた"

**AFK handling**
- Respect this side quest progress while AFK mode.

**Cancellation**
- If a **神魔戦 (God Battle)** begins, the current side quest is **cancelled**.
- State whether cancellation applies to all quest types equally and no side quest for the party.

**Reward**
- On completion, the party receives **1 Jewel**.
- The Jewel’s Rank is randomly selected between 1 and `x.exp_tier`, based on the expedition tier at the time the side quest was generated.


### 5.3 Expedition
- Persistence through an expedition:`d.HP`.
- auto-sell profit amp:
  - If party.character.`a.cunning`, multiplier x1.2.
  - If party.character.`a.cunning`, multiplier x1.3.

### 5.3.1 "Loot-Gate" progression system
- If the party fails to meet the entry requirements, the expedition ends before the Gate Room and they are returned to Home.

| title | Gate `x.floor`,`x.room` | condition |
|----|----|----|
| Entering | 1,1 | correct 1 boss rare item from previous expedition ( `x.expedition` -1 ), expect for the first expedition. |
| 1st Elite gate | 1,4 | correct 3 uncommon items from this `x.expedition` |
| 2nd Elite gate | 2,4 | correct 9 uncommon items from this `x.expedition`  |
| 3rd Elite gate | 3,4 | correct 18 uncommon items from this `x.expedition` |
| 4th Elite gate | 4,4 | correct 30 uncommon items from this `x.expedition`  |
| 5th Elite gate | 5,4 | correct 45 uncommon items from this `x.expedition`  |
| Boss gate | 6,4 | correct 3 elite rare items from this `x.expedition` |
| Gods battle gate | - | collect 10 Boss rare items in dungeons to unlock Gods Battle |
| Side quest gate | - | it depends on side quest `q.` condition |


### 5.3.2 Logs
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
  - As defalut, expands the latest room. 
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
left-alinged                                           right-aligned
[距離<roll result>] 敵が　対象　に行動名！(N/M回)    (icon 数値 in dark orange)
[距離<roll result>] 味方:行動主 の行動名！(N/M回)    (icon 数値　in Blue)

[効] イタチの 矢払い！ (敵の遠距離攻撃の命中率を10%低下)
[効] ウルフの 守護者！　(後列にいる味方への物理ダメージ × 2/3)
[効] ベアの 指揮！ (後列にいる味方の物理攻撃力 × 1.3)
[効] ラビの 魔法障壁！ (後列にいる味方への魔法ダメージ × 2/3)
[効] 不和の神の効果！ ([⚠️敵対]ゴンが仲違いした)
[効] name の氷結反射！ (自身が受ける予定の氷属性ダメージを反射(3/10))
[効] name の火炎反射！ (自身が受ける予定の炎属性ダメージを反射(3/10))
[効] name の魔法反射！ (自身が受ける予定の魔法ダメージを反射(1/10))
[効] name の凍傷！ (相手の行動を少し遅らせる)
[効] name の魔法増幅！ (双方魔法ダメージ1.3倍)
[効] name の魔法抑制！ (双方魔法ダメージ0.8倍)
[効] name の物理増幅！ (双方物理ダメージ1.4倍)
[効] name の物理抑制！ (双方物理ダメージ0.8倍)
[効] name が opponent の abilityアビリティを忘却の彼方に消し去った！
[効] name の魔封！ (この場で最初に唱える魔法は無効化される)
[効] name が opponent の ability を模倣した！

(遠距離攻撃フェーズ)
[2] ロップ の攻撃！(1/2回)          (🏹 7)
(魔法攻撃フェーズ)
[3] 敵がアルカナアローを唱えた！(5/6回, 共鳴+25%)
[-] ゴン に命中！(2/2回)            (🪄 16)
[-] セルヴァ に命中！(3/4回)         (🪄 16)
[1] セルヴァ がフロストニードルを唱えた！(3/3回, 共鳴+33%)     (❄️ 6)

[2] ロップ の氷属性攻撃は反射された！ (10/17回) (❄️ 8,832 →反射 2,944)

(近接攻撃フェーズ)
[2] ケモ の攻撃！(1/1回)             (⚔ 11)
[2] ゴン の攻撃！(1/1回)             (⚔ 71)
(space)
[末] 再生の神の効果！(HP回復+25)
[末] 消耗の神の効果！(HP消耗-10)
[末] イタチの解錠 石板の盾 を獲得した！(自動売却対象: 10G)
[末] 探索深度に到達した為帰還します
```

- note: [効] text always at the beginning of battle log (before the "(遠距離攻撃フェーズ)" part)
- note: [末] text always at the end of battle log (after the "(近接攻撃フェーズ)" part)
