#### 5. PROGRESS

### 5.1 PROGRESS
**Definition of time scale.**
- **`Step`**: The smallest unit of progression. 
  - Steps are processed **globally**, meaning all parties update their progress simultaneously at each Step. 
  - Base duration: **15 seconds per Step**.
  - Duration modifier: **round up** after all multipliers are applied.
  - **Debug Scaling** (applies multiplicatively to Step duration):  
    - `x5 boost` → Step × **0.2** (3 seconds)  
    - `x20 boost` → Step × **0.05** (0.75 seconds)  
    - `x100 boost` → Step × **0.01** (0.15 seconds)
  - This scaling also applies to side quest time progression.
- **`Cycle`**: One complete sequence of state transitions.  
  - A Cycle always **begins at `state.rest`**.
  - A full Cycle always **ends at the end of `state.rest`**.
- **`Chunk`**: A higher-level processing unit used for bulk progression. 
  - **1 Chunk = 12 Cycles**.

#### 5.1.1 Party State Machine

- Use one state per party. Every party ticks independently.

- **State list**

| State | Logic | Move to | Durration modifilier |
|-------|-------|----------|---------|
| `state.rest`  | - | sell or feast | `God of Fortification` |
| `state.sell` | Sell auto-sell items to shop owners. and officially gain items (notification of item gains at the end of sell state.). If they have no trophy nor auto-sell item, skip this state. | `state.free_action` | `God of Dusk` |
| `state.free_action` | - | Check `t.sleepiness_of_party_bag`. If it is sound_sleep, `state.sound_sleep`, otherwise `state.pray`. | `Goddess of Fertility` |
| `state.sound_sleep` | At the end of this state, equipping items. | `state.pray` | `Goddess of Restoration` |
| `state.idle` | Only when 自動周回 = OFF (idle state) | - |
| `state.pray` | Party members donate money to their deity. | if party's cuttent HP is not 100%, `state.rest`. othetwise, `state.idle` or `state.move` |
| `state.move` | If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3 round up, `a.peddler`2: 3/5)  round up| explore | `a.peddler` |
| `state.explore` | **At the beginning of exploration, fully restore the party’s HP.** | return | `Goddess of Precision`, `terrain.chill`, `terrain.looping-path` |
| `state.return` | If party.character.`a.peddler`, reduce its duration. (`a.peddler`1: 2/3  round up, `a.peddler`2: 3/5 round up) | rest | 
| `state.reactivate` | Reactivating from AFK mode | - | - |

- **`Step Progress` behavior by state:**
  - The progress bar behavior depends on the active `state`.
  - **Continuous:** The bar fills smoothly over the duration of the current `Step`.
  - **Step-based:** The bar updates only when one `Step` is completed, without smooth in-between animation.

| State | Japanese label | Duration | Progress bar behavior |
|-------|-------|-------|-------|
| `state.rest` | 休息中 | heal max(400, +6% MaxHP) / 1 `Step` until full. | Step-based. Main progress bar is current Step / initial total Steps at state start |
| `state.sell` | 売却中 | 1 `Step` per `auto-sell` items | Step-based |
| `state.free_action` | 自由行動中 | 30 `Step`  | Continuous |
| `state.sound_sleep` | 熟睡中 | 16 `Step` | Continuous |
| `state.pray` | 祈り中 | 4 `Step` | Continuous |
| `state.idle` | 待機中 | - | - |
| `state.move` | 移動中 | (1 + `x.exp_tier` ) `Step` | Continuous |
| `state.explore` | 探索中 | 1 `Step` per room (24 rooms in total)| Step-based |
| `state.return` | 帰還中 | (5 + `x.exp_tier`) `Step` | Continuous |
| `state.reactivate` | 復帰中 | - | - |

**Duration modifier**
- `state.explore`:
  - If `Goddess of Precision`: `Step` *= 1.2 round up
  - If floor is `terrain.chill`: `Step` *= 2.0 round up
  - If floor is `terrain.looping-path`' `Step` *= 2.0 round up
- `state.move` and `state.return`
  - If colosseum, total duration is 1 `Step`.  

- sleepiness from `t.sleepiness_of_party_bag` 
  - 0 No sleep: The party skips the sleep state and continues the normal cycle.
  - 1 Nap: `state.nap_sleep` The party enters a short sleep (light rest).
  - 2 Sound sleep: `state.sound_sleep` The party enters a full sleep state.

- **Profit usuage:**
- At: `state.rest`:
  - `current_profit` = 0
- At the end of `state.sell`:
  - `current_profit` = Sum of (Auto-sell items)
- At the end of `state.free_action`:
  - `current_profit` -= spending feast ( spend 20% ~ 40% of `current_profit` without `a.squander`, x1.3 spending with `a.squander`1, x1.5 spending with `a.squander`2. Not exceed current_profit )

  - Notification :
    - Without Squander: PT1は25Gお金を使った
    - With Squander: PT1 君主トムは贅沢に50G使った
- At the end of `state.pray`:
  - `current_profit` -= donattion ( 10–33% of `current_profit` without `a.tithe`, if party has `a.tithe`2, Adds +15% , else if party has `a.tithe`1, Adds +10, if deity = none, donation is 0. )
  - `current_profit` -= embezzlement (if `God of Cunning`, +50% of `current_profit`. if partymember.`a.momentum`, +10% of `current_profit`. Else if, 0%)
  - Notification:
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

- Player taps 出撃 / 神魔戦
  - If the button is available for sortie, consume 1 Instant Expedition Charge stock.
  - Immediately process one full Cycle and finish at the beginning of `state.rest`.
  - If they have not gained items (not finished `state.sell`), immediately gain items and show notifications before the new Cycle is processed.
  - Remaining current profit is treated as emergency embezzlement and vanishes from party profit. No squander, donation, nor remaining profits are moved to the global wallet for the interrupted Cycle.
  - If party Hp is 0 (just after defeated): ignore tap and show notification log:"random party.character は疲弊しており出撃を拒否した"

- **Transition rules**
  - 自動周回ON: `state.rest`→`state.free_action`→`state.sound_sleep` (optional)→`state.pray`→`state.move`→`state.explore`→`state.return`→`state.rest`
  - 自動周回OFF: `state.rest`→`state.free_action`→`state.sound_sleep` (optional)→`state.pray`→`state.idle`
  - Immediate 出撃 / 神魔戦: consume 1 stock, process `state.move`→`state.explore`→`state.return` immediately, and leave the runtime at the beginning of `state.rest`.


**Time-Based Progress Handling (Online + AFK)**
- The party state machine is purely `Step`-based: persist state and `state_started_at`, then on each update tick calculate elapsed = `current_step` - `state_started_at`.
- Catch-up simulation must be processed in chunks (chunk update).
- `simulated_elapsed` = min(elapsed, 1,800 minutes)
- Process `simulated_elapsed` sequentially in chunks.
- For each chunk, resolve all completed state transitions in chronological order until no further transition is completed within that chunk.
- 'state_started_at' must be updated only when the party state changes (at each transition boundary), never on a plain tick without transition.
- If a transition completes exactly at a chunk boundary, treat it as completed in that chunk and carry remaining time (if any) into the next state/chunk.
- Multiple state transitions within a single update tick are valid and must be applied deterministically in order.
- Limit: maximum 1,800 minutes (30 hours) per catch-up simulation in the current version; elapsed time beyond this cap is ignored for that tick.

**AFK → Online Transition Handling**
- **Simplified AFK emulation:**
  - During `state.reactivate`, AFK progress is processed as completed expedition-cycle chunks only.
  - Do not preserve an in-progress state from the moment the player went AFK.
  - Only the last expedition-cycle of AFK mode preserve mid-`Step` or partial-state progress. 
- **Online resume state:**
  - If HP < MaxHP at the moment AFK recovery completes, set the party to `state.rest` from the start of that state.
  - Otherwise, if 自動周回 = ON, set the party to `state.move` from the start of that state.
  - Otherwise, set the party to `state.idle`.
- **Refresh Handling**
  - On page refresh, AFK emulation must automatically continue and resume from the latest saved pending AFK backlog.
  - The main progress of `state.reactivate` is reset on refresh.
  - After refresh, the `state.reactivate` progress bar starts again from 0 and resumes counting from the beginning.


**Notification**
- Format: 踏破N回/帰還Y回/引分Z回/撤退M回/敗北X回 寄付金額: vG, 貯金額:　vG
  - Key and label:Clear(踏破) / Turned_Back(帰還) / Draw_Retreat(引分) / Wounded_Retreat(撤退) / Defeat(敗北)
    - Turned_Back: The party successfully returns without clearing the complete dungeon, including return at the selected depth limit or because the next Clear-Gate is still locked. This outcome increments the current consecutive-success count.
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
  - has no active Clear-Gate condition (**excluding** the Gods Battle gate), and
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


##### 5.1.3.1 "Clear-Gate" progression system specification

* Each progression gate requires **X consecutive successful runs** to unlock. (`Clear`, `Return` outcome)
* If the party fails a run (`Draw`, `Retreat`, `Defeat`), the current consecutive-success count is reset to 0.
* Canonical outcome mapping: `Return` = `Turned_Back`, `Draw` = `Draw_Retreat`, and `Retreat` = `Wounded_Retreat`.
* Evaluate the streak once at the end of each normal expedition. `Clear` or `Turned_Back` increments the next locked Clear-Gate by 1; `Draw_Retreat`, `Wounded_Retreat`, or `Defeat` resets that gate's count to 0.
* Reaching the required count permanently unlocks that gate. Previously unlocked gates never relock. If the party reaches a still-locked gate during the run that completes its required count, that run ends as `Turned_Back` and the newly unlocked route is available from the next run.

**Examples**

| title            | Gate `x.floor`,`x.room` | condition                                                                                           | text example         |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------------------------- | -------------------- |
| Entering         | 1,1                     | Defeat the boss from the previous expedition (`x.expedition - 1`), except for the first expedition. | ボス撃破でヴァルンの樹林帯 開放     |
| 1st Elite gate   | 1,4                     | Complete 9 consecutive successful runs | 連続攻略成功 9回 で 1F-4解放 |
| 2nd Elite gate   | 2,4                     | Complete 8 consecutive successful runs | 連続攻略成功 8回 で 2F-4解放 |
| 3rd Elite gate   | 3,4                     | Complete 7 consecutive successful runs | 連続攻略成功 7回 で 3F-4解放 |
| 4th Elite gate   | 4,4                     | Complete 6 consecutive successful runs | 連続攻略成功 6回 で 4F-4解放 |
| 5th Elite gate   | 5,4                     | Complete 5 consecutive successful runs | 連続攻略成功 5回 で 5F-4解放 |
| Boss gate        | 6,4                     | Complete 4 consecutive successful runs | 連続攻略成功 4回 で ボス戦解放  |
| Gods battle gate | -                       | Defeat the dungeon boss at least once and satisfy the Gods Battle-specific condition.               | ボスを撃破せよ              |
| Side quest gate  | -                       | Depends on the side quest `q.` condition. |             |



##### 5.1.3.2 Unlock party
- Party unlock condition: Defeating corresponding boss.
  - max 6 parties.

**Unlock Party**

| Condition | Unlock party | text for unlock PT | when this text visible |
|-----|-----|-----|-----|
| Defeating: `x.expedition`= 3 Boss | 2rd party | (未開放)ヴァルンの海洋踏破で開放 | Displayed for any Party after `x.expedition` = 3 is unlocked, until the 2nd Party is unlocked |
| Defeating: `x.expedition`= 4 Boss | 3th party | (未開放)フェリディ砂漠踏破で開放 | Displayed for any Party after `x.expedition` = 4 is unlocked, until the 3rd Party is unlocked |
| Defeating: `x.expedition`= 5 Boss | 4th party | (未開放)ウルサンの炎嶺踏破で開放 | Displayed for any Party after `x.expedition` = 5 is unlocked, until the 4th Party is unlocked |
| Defeating: `x.expedition`= 6 Boss | 5th party | (未開放)プロキオン巣穴踏破で開放 | Displayed for any Party after `x.expedition` = 6 is unlocked, until the 5th Party is unlocked | 
| Defeating: `x.expedition`= 7 Boss | 6nd party | (未開放)レポリアンの月宮踏破で開放 | Displayed for any Party after `x.expedition` = 7 is unlocked, until the 6th Party is unlocked |


### 5.1.4 Save and load

- If loading saved state fails, display a popup warning message: "ロードに失敗しました。この画面をスクリーンショットし、開発者へ報告してください"
- Include the error log details in the popup.
- If saved data cannot be loaded successfully:
- Do not automatically start the game using incomplete or partially corrupted progress data.
- Do not overwrite or save the current runtime state.
- Preserve the existing saved data to prevent accidental data loss.
