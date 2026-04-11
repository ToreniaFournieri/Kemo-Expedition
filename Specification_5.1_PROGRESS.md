## 5. PROGRESS

### 5.1 PROGRESS

#### 5.1.1 Party State Machine

- Use one state per party. Every party ticks independently.

- **State list**

| State | Logic | Move to | Durration modifilier |
|-------|-------|----------|---------|
| `state.rest`  | at home | sell or feast | `God of Fortification` |
| `state.sell` | at home, Sell auto-sell items to shop owners. and officially gain items (notification of item gains at the end of sell state.). If they have no trophy nor auto-sell item, skip this state. | feast | `God of Dusk` |
| `state.feast` | at home, skip if current_profit = 0). Skipped if the party’s total HP was below 30% of Max HP at the beginning of rest state. | sound_sleep or nap_sleep or pray | `Goddess of Fertility` |
| sleep/ `state.sound_sleep`, `state.nap_sleep` | at home. skip if the party’s total HP was below 10% of Max HP at the beginning of rest state. (no draw a ticket from `t.sleepiness_of_party_bag`) | sound sleep:outfit, nap_sleep:pray |
| `state.outfit` | equipping items. skip if no sound_sleep | pray |
| `state.pray` | at home. Party members donate money to their deity. | idle or move |
| `state.idle` | at home. only when 自動周回 = OFF (idle state) | - |
| `state.move` | home → dungeon, If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3, `a.peddler`2: 3/5) | explore | `a.peddler` |
| `state.explore` | in dungeon. if HP < 30% MaxHP → retreat. At the end of this state, update this {ルピニアンの断崖踏破} part ) | return | `Goddess of Precision`, `terrain.chill`, `terrain.looping-path` |
| `state.return` | dungeon → home,If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3, `a.peddler`2: 3/5) | rest | 
| `state.reactivate` | Reactivating from AFK mode | - | - |

- **Realtime Progress**
- Debug Scaling:
  - If `x5 boost` , all durations are multiplied by **0.2**.
  - If `x20 boost` , all durations are multiplied by **0.05**.
  - This debug scaling affects to side quest time count. 


| State | Japanese label | Duration |
|-------|-------|-------|
| `state.rest` | 休息中 | heal max(100, +1% MaxHP) / 1 sec until full |
| `state.sell` | 売却中 | 15 seconds per `auto-sell` items |
| `state.feast` | 宴会中 | 90 seconds |
| `state.sound_sleep` | 熟睡中 | 120 seconds |
| `state.nap_sleep` | 仮眠中 | 30 seconds |
| `state.outfit` | 身支度中 | 60 seconds |
| `state.pray` | 祈り中 | 30 seconds |
| `state.idle` | 待機中 | - |
| `state.move` | 移動中 | 30 seconds * (1.30 - 0.02 * `x.exp_tier` )^(`x.exp_tier`) | 
| `state.explore` | 探索中 | 15 seconds per room (24 rooms in total)|
| `state.return` | 帰還中 | 90 seconds * (1.30 - 0.02 * `x.exp_tier` )^(`x.exp_tier`)  |
| `state.reactivate` | 復帰中 | - |

**Durration modifilier**
- `state.explore` state
  - If `Goddess of Precision`: duration *= 1.5
  - If floor is `terrain.chill`: duration *= 1.5
  - If floor is `terrain.looping-path`' duration *= 2.0

- sleepiness from `t.sleepiness_of_party_bag` 
  - 0 No sleep: The party skips the sleep state and continues the normal cycle.
  - 1 Nap: `state.nap_sleep` The party enters a short sleep (light rest). ( x 1/5 sleep duration)
  - 2 Sound sleep: `state.sound_sleep` The party enters a full sleep state. ( x1 sleep duration )

- Profit usuage:
  - At: `state.rest`:
      - `current_profit` = 0
  - At the end of `state.sell`:
      - `current_profit` = Sum of (Auto-sell items)
  - At the end of `state.feast`:
      - `current_profit` -= spending feast ( spend 33–67% of `current_profit` without `a.squander`, x1.3 spending with `a.squander`1, x1.5 spending with `a.squander`2. Not exceed current_profit )
        - Notification :
          - Without Squander: PT1は25Gお金を使った
          - With Squander: PT1 君主トムは贅沢に50G使った
  - At the end of `state.pray`:
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
  - Immediately set state to `state.move`
  - If they not gain items (not finished `state.sell`), immediately gain items and show notifications.
  - Do not refill HP; dungeon starts with current HP. No squander, donation, nor remaining profits to the global wallet. The profit vanishes (The party menders would definitely not be happy with this players emergency sortie.)
  - If party is already in `state.explore`: ignore tap
  - If party Hp is 0 (just after defeated): ignore tap and show notification log:"random party.character は疲弊しており出撃を拒否した"

- **Transition rules**
  - 自動周回ON: 休息中→宴会中(if possible)→睡眠中→祈り中→待機中→移動中→探索中→帰還中→休息中
  - 自動周回OFF: 移動中→探索中→帰還中→休息中 → 宴会中(条件付き) → 睡眠中 → 祈り中 → 待機中 (stop here)


**Time-Based Progress Handling (Online + AFK)**
- The party state machine is purely time-based: persist state and `state_started_at`, then on each update tick calculate elapsed = now - `state_started_at`.
- Catch-up simulation must be processed in chunks (chunk update).
- `simulated_elapsed` = min(elapsed, 1,800 minutes)
- Process `simulated_elapsed` sequentially in `fixed-size` chunks (CATCHUP_CHUNK_MINUTES, current default: 60 minute). Chunk duration must respect debug speed scaling. Example: in x100 debug mode, each chunk is processed as 60 / 100 = 0.6 simulated minutes.
- For each chunk, resolve all completed state transitions in chronological order until no further transition is completed within that chunk.
- 'state_started_at' must be updated only when the party state changes (at each transition boundary), never on a plain tick without transition.
- If a transition completes exactly at a chunk boundary, treat it as completed in that chunk and carry remaining time (if any) into the next state/chunk.
- Multiple state transitions within a single update tick are valid and must be applied deterministically in order.
- Limit: maximum 1,800 minutes (30 hours) per catch-up simulation in the current version; elapsed time beyond this cap is ignored for that tick.


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

#### 5.1.2 Side Quest
**Trigger Condition**
- Checked at the end of the `state.return`.
- If the party:
  - has no active loot gate condition (**excluding** God battle loot gates), and
  - has no active side quest
- then roll one ticket from `t.side_quest_bag`.

**Assignment**
- The selected side quest is assigned immediately after the `state.return` ends.
- Notification example:
  - "PT1はサイドクエスト 治療 (2時間) を受けた"

- Side quest difficulty
  - If `x.exp_id` = 4, side quest level = 2.
  - For `q.exercise`:
  - Base range: 5 ~ 15
  - Lv2 multiplier: x1.3
  - Result: 5 × 1.3 = 6.5, 15 × 1.3 = 19.5
  - Rounded range: 7 ~ 20
  - Final target: randomly select one integer from 7 to 20 (inclusive).

| ID | type | base value range(lv1) | lv2 | 1v3 | lv4 |
|--|--|---|---|---|---|
| 1 | `q.squander` | 100 ~ 400 | x1.4 | x1.8 | x2.2 |  
| 2 | `q.sleeping` | 1 ~ 4 | - | - | - |
| 3 | `q.exercise` | 5 ~ 15 | x1.3 | x1.5 | x2.0 |
| 4 | `q.embezzlement` | 25 ~ 100 | x1.4 | x1.8 | x2.2 | 
| 5 | `q.donation` | 100 ~ 500 | x1.4 | x1.8 | x2.2 | 
| 6 | `q.healing` | 5 ~ 20 | x1.3 | x1.5 | x2.0 |
| 7 | `q.AFK` | 30 ~ 120 | x1.3 | x1.5 | x2.0 |
| 8 | `q.treasure-super-rare` | 1 | - | - | - |
| 9 | `q.treasure-boss-rare` | 1 - 4 | - | - | - |
| 10 | `q.poor-kid` | 10 ~ 30 | x1.3 | x1.5 | x2.0 |
| 11 | `q.consecutive-wins` | 5 ~ 20 | x1.3 | x1.5 | x2.0 |
| 12 | `q.losers` | 1 | - | - | - |
| 13 | `q.savings` | 200 - 1,000 | x1.4 | x1.8 | x2.2 | 

| `x.exp_id` | lv |
|---|----|
| 1 | 1 |
| 2 | 1 |
| 3 | 2 |
| 4 | 2 |
| 5 | 3 |
| 6 | 3 |
| 7 | 4 |
| 8 | 4 |



**AFK handling**
- Side quest progress continues during AFK (`state.reactivate`).
- Side quest respects speed modifiers (sleep 40 minutes -> use emulated time speed)
- Deadline timing respects speed modifiers (e.g., Debug mode).
- Deadline checks are performed once at the end of each chunk.

**Cancellation**
- If a **神魔戦 (God Battle)** begins, the current side quest is **cancelled**.
- State whether cancellation applies to all quest types equally and no side quest for the party.

**Expiration**
- A side quest expires if its deadline passes before its completion conditions are met.
- Notification example:
  - "PT1はサイドクエスト 横領 を達成できなかった"

**Reward**
- On completion, the party receives **1 Jewel**.
- The Jewel’s Rank is randomly selected between 1 and `x.exp_tier`, based on the expedition tier at the time the side quest was generated.


#### 5.1.3 Expedition
- Persistence through an expedition:`d.HP`.
- auto-sell profit amp:
  - If party.character.`a.cunning`, multiplier x1.2.
  - If party.character.`a.cunning`, multiplier x1.3.

##### 5.1.3.1 "Loot-Gate" progression system
- If the party fails to meet the entry requirements, the expedition ends before the Gate Room and they are returned to Home.

| title | Gate `x.floor`,`x.room` | condition | text example |
|----|----|----|----|
| Entering | 1,1 | defeat the boss from previous expedition ( `x.expedition` -1 ), except for the first expedition. | ボス撃破 でヴァルンの樹林帯 開放 |
| 1st Elite gate | 1,4 | correct 3 uncommon items from this `x.expedition` | アンコモンアイテム 0/3で 1F-4解放 |
| 2nd Elite gate | 2,4 | correct 9 uncommon items from this `x.expedition`  | アンコモンアイテム 0/9で 2F-4解放 |
| 3rd Elite gate | 3,4 | correct 18 uncommon items from this x.expedition` | アンコモンアイテム 0/18で 3F-4解放 | |
| 4th Elite gate | 4,4 | correct 30 uncommon items from this `x.expedition`  | アンコモンアイテム 0/30で 4F-4解放 | |
| 5th Elite gate | 5,4 | correct 45 uncommon items from this `x.expedition`  | アンコモンアイテム 0/45で 5F-4解放 | |
| Boss gate | 6,4 | correct 3 elite rare items from this `x.expedition` | エリートレアアイテム 0/3で ボス戦解放 | |
| Gods battle gate | - | Collect at least 3 Boss Rare items from dungeons, and defeat the dungeon boss at least once (lifetime, party-wide)) | ボスレアアイテム 1/3 で神魔キョウエン戦 |
| Side quest gate | - | it depends on side quest `q.` condition | |

##### 5.1.3.2 Unlock party
- Party unlock condition: Defeating corresponding gods.
  - max 6 parties.

**Unlock Party**

| Condition | Unlock party |
|-----|-----|
| Defeating: `Seiran` | 2nd party |
| Defeating: `Garv` | 3rd party |
| Defeating: `Kyōen` | 4th party |
| Defeating: `Miora` | 5th party |
| Defeating: `Dolvar` | 6th party |
