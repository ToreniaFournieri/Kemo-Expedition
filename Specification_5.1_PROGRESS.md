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
  - A Chunk is a logical gameplay aggregation boundary. Rules specified to run at the end of a Chunk run only after all 12 Cycles in that Chunk complete.
- **`AFK scheduler batch`**: One time-budgeted execution slice used to keep AFK recovery responsive.
  - It is not a gameplay unit and has no fixed Cycle count.
  - One scheduler batch may process part of one Chunk, exactly one Chunk, or portions of multiple Chunks.
  - Ending or yielding a scheduler batch must not create a gameplay boundary, consume randomness, or trigger Chunk-end rules.

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
- Catch-up gameplay progression must be resolved in logical Chunks, while its execution must be divided into time-budgeted AFK scheduler batches as defined in section 5.1.1.1.
- `simulated_elapsed` = min(elapsed, 1,800 minutes)
- Process `simulated_elapsed` sequentially in chunks.
- For each chunk, resolve all completed state transitions in chronological order until no further transition is completed within that chunk.
- A scheduler yield inside a logical Chunk must preserve the exact Cycle offset and simulation state. Resuming must continue that same Chunk without repeating or skipping any gameplay event, and Chunk-end rules must wait until its twelfth Cycle completes.
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

##### 5.1.1.1 AFK Recovery Performance Requirements

AFK recovery must preserve all existing gameplay rules and deterministic behavior while avoiding prolonged main-thread blocking and unnecessary UI updates.

While AFK recovery is pending, user input remains accepted. If a user interaction targets a
state-mutating control, the scheduler pauses before starting the next AFK batch, allows the
normal UI mutation to commit, and then resumes from the persisted AFK operation cursor. AFK
simulation operations and UI mutations must not interleave within one scheduler batch.

**Functional correctness**

AFK optimization must not change the result of the simulation.

Given the same:

- initial save state;
- elapsed AFK duration;
- random-bag or RNG state;
- game-data version;
- active parties and destinations;

the optimized recovery must produce the same gameplay result as the authoritative chronological AFK simulation defined in section 5.1.1, including its completed-Cycle, logical-Chunk, and AFK-to-Online transition rules. Equivalent results include:

- battle outcomes;
- rewards and inventory changes;
- character and party HP;
- progression and Clear-Gates;
- destination advancement;
- side-quest outcomes;
- Diary records;
- automation behavior;
- final RNG or random-bag state.

Performance improvements may reduce intermediate UI updates and defer presentation work, but must not skip authoritative gameplay events.

**Main-thread execution budget**

A single AFK recovery batch must not occupy the main thread for longer than 50 milliseconds under normal supported conditions.

The preferred batch execution budget is:

- Desktop: approximately 12–20 ms.
- Mobile and lower-powered devices: approximately 8–12 ms.
- Very constrained or low-power modes: approximately 2–8 ms.

Batch size must be determined by elapsed execution time rather than by a fixed number of Cycles alone.

The scheduler should continue processing Cycles only while its current time budget remains available:

```ts
const deadline = performance.now() + batchBudgetMs;

while (hasPendingCycles() && performance.now() < deadline) {
  simulateNextCycle();
}

yieldToMainThread();
```

The 50 ms requirement applies to game-controlled main-thread work. Delays caused exclusively by browser suspension, operating-system scheduling, debugging tools, or background-tab throttling are not considered simulation batch violations.

If one indivisible simulation operation itself takes longer than 50 ms, it must be identified through profiling and considered a performance defect.

**Adaptive batching**

The implementation must not assume that a fixed Cycle count has similar cost on every device or for every party configuration.

Batch scheduling must adapt to:

- device performance;
- number of active parties;
- destination and battle complexity;
- reward volume;
- Diary processing;
- side-quest and automation activity.

A fast device may process many Cycles within one time budget. A slower device must process fewer Cycles and yield earlier.

The scheduler may use recent batch measurements to estimate the number of Cycles likely to fit within the next time budget. It must still verify elapsed time while processing.

A scheduler batch may yield between Cycles within a logical Chunk. Such a yield is execution-only: it must preserve the current Chunk index and Cycle offset, must not apply Chunk-end automation early, and must not change random-bag consumption or any other gameplay result.

**React update frequency**

Internal simulation Cycles must not each produce a React state update.

AFK progress should normally be committed to React no more than 5–10 times per second. Progress updates may be less frequent when:

- the application is in the background;
- the device is in a low-power mode;
- rendering is expensive;
- recovery progress changes too little to be visible.

The following events may cause an immediate UI update regardless of the normal progress interval:

- recovery completion;
- recovery cancellation or interruption;
- an unrecoverable simulation error;
- a durable recovery checkpoint;
- a state transition requiring user attention.

React progress updates are presentation updates. Reducing their frequency must not reduce the number of simulated gameplay events.

**Render isolation**

AFK progress changes must not cause the complete application to rerender.

Frequently changing recovery state—such as percentage, Cycles completed, and estimated time remaining—should be isolated from stable game state.

Components that are not visible or do not depend on changed data should not rerender because an AFK progress update occurred. In particular, the following areas should be checked:

- inventory;
- Diary;
- party configuration;
- equipment;
- destination selection;
- settings;
- inactive screens and dialogs.

Memoization and state splitting should be introduced only where profiling demonstrates that they reduce meaningful render work.

**Saving and persistence**

Save serialization and persistent-storage writes must not occur after every AFK batch.

Persistence should occur at controlled durable checkpoints, such as:

- after a configured time interval;
- after a configured amount of simulated progress;
- when recovery completes;
- when the application is about to be hidden, suspended, or closed;
- when an important state boundary requires durability.

Progress-only React updates must not trigger complete save serialization.

A checkpoint must contain enough information to resume recovery without:

- duplicating rewards;
- skipping Cycles;
- duplicating Diary entries;
- changing RNG or random-bag order;
- losing already committed progress.

When a checkpoint occurs inside a logical Chunk, it must persist the pending AFK backlog, current Chunk index and Cycle offset, authoritative simulation state, timing anchors, and RNG or random-bag state required to resume at the exact next gameplay operation. The visible `state.reactivate` progress bar may reset after refresh as defined above, but that presentation reset must not reset or alter the authoritative recovery position.

The application should avoid writing identical serialized state repeatedly.

**Responsiveness**

The application must remain interactive during AFK recovery.

While recovery is active:

- visible screens must remain scrollable;
- navigation and non-mutating controls must respond;
- progress indicators must continue updating;
- cancellation or interruption controls must remain usable, if provided;
- accessibility interaction must remain functional;
- animations should not freeze for prolonged periods.

Gameplay mutations must not interleave with AFK simulation. A state-mutating action may execute only after recovery completes or after an explicit cancellation or interruption has reached and durably persisted a deterministic recovery boundary.

Repeated frame or event-loop delays of 50 ms or longer should be treated as a performance warning. Delays of 100 ms or longer caused by the game should be treated as a performance defect.

Moving simulation to a renderer-owned Web Worker is recommended if time-budgeted main-thread execution cannot provide acceptable responsiveness. The renderer must remain the authoritative owner of game state and persistence: worker results must be validated and committed through the renderer, and the worker must not access persistent storage directly.

**Performance scaling**

Recovery cost should scale approximately linearly with:

```text
recovered Cycles × active parties
```

Doubling the recovered Cycle count should produce approximately twice the simulation work when other conditions are equal. Doubling the active party count should also produce approximately proportional work.

Significantly super-linear scaling must be investigated. Possible causes include:

- repeatedly scanning an expanding Diary;
- repeatedly sorting the complete inventory;
- cloning increasingly large state collections;
- recalculating unchanged party statistics;
- processing previous results again;
- serializing the entire save after each batch.

Performance tests should record both total recovery time and normalized time per Cycle-party.

**Ten-hour recovery target**

A representative ten-hour AFK recovery must complete in seconds rather than minutes on supported reference hardware.

The representative test must define:

- hardware or device class;
- browser or application build;
- production build configuration;
- number of active parties;
- representative inventory size;
- representative Diary size;
- destinations and battle complexity;
- side-quest and automation configuration.

Until device-specific targets are established, the acceptance requirement is:

```text
Total recovery duration < 60 seconds
```

The preferred target should be substantially lower and established from measured production-build results.

This requirement does not permit the simulation to omit events or produce a different final state.

**Required profiling metrics**

Development profiling must be capable of reporting:

- total AFK recovery duration;
- recovered Cycles;
- active parties;
- total Cycle-party operations;
- average time per Cycle;
- average time per Cycle-party;
- maximum batch duration;
- number of batches;
- React commit count;
- total React render duration;
- maximum React commit duration;
- save serialization count and duration;
- persistent-storage write count and duration;
- maximum observed frame or event-loop delay.

Where practical, simulation time should be divided into:

- expedition and battle resolution;
- rewards and inventory;
- HP and party state;
- Diary finalization;
- destination advancement;
- side quests;
- automation;
- state copying and finalization.

Profiling must aggregate measurements in memory. It must not emit console output or browser performance entries for every individual Cycle, because the profiling mechanism itself could materially slow recovery.

**Benchmark scenarios**

At minimum, performance testing should cover:

1. One active party with one hour of recovery.
2. All supported parties with one hour of recovery.
3. All supported parties with ten hours of recovery.
4. All supported parties at the maximum allowed AFK duration of 1,800 minutes (30 hours).
5. A nearly full inventory.
6. A large retained Diary.
7. Active side quests and automatic destination changes.
8. Frequent battle failures or party defeats.

Each benchmark must use a fixed initial save and deterministic RNG state. After a warm-up run, the scenario should be measured multiple times using a production build.

Reports should include:

- median total duration;
- slowest total duration;
- average time per Cycle-party;
- longest batch;
- React commit count;
- longest React commit;
- largest event-loop or frame delay.

**Correctness verification**

Every optimized benchmark must be compared with the existing authoritative implementation.

The comparison should verify the complete meaningful final state, including:

- currencies;
- inventory;
- party and character state;
- progression;
- destination state;
- side quests;
- Diary outcomes;
- statistics;
- RNG or random-bag state;
- remaining AFK backlog.

Performance work must not be accepted if it improves speed but changes deterministic results.

**Recommended implementation order**

1. Add development-only AFK timing and React commit instrumentation.
2. Create deterministic benchmark saves.
3. Establish baseline results for one-hour, ten-hour, and maximum-duration recovery.
4. Separate internal simulation progress from React-visible progress.
5. Replace fixed Cycle-count batches with time-budgeted batches.
6. Prevent save serialization and writes from running per batch.
7. Reduce unnecessary rerenders and expensive effects.
8. Profile simulation phases and reduce excessive allocations.
9. Move the isolated simulator to a Web Worker if main-thread responsiveness remains inadequate.
10. Run deterministic equivalence tests and record final benchmark results.


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
- Deadline checks are performed once at the end of each logical Chunk, not at an AFK scheduler yield.

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
* When the expedition meets the Clear-Gate condition, the locked-area text changes to indicate that the gate has been cleared::
連続攻略成功 9回 で 1F-4 解放達成（次回から先に進める）

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
