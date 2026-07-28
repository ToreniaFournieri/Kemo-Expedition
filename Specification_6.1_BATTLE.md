## 6. BATTLE

### 6.1 BATTLE
- Each encounter consists of one battle

- **Attack capabilities**
  - Each attack capability grants one action during a battle. Therefore, a character with two or more attack capabilities may act multiple times in the same battle.
  - A character has `ranged_attack` if it has either `d.ranged_attack` or `d.ranged_NoA`.
  - A character has `magical_attack` if it has either `d.magical_attack` or `d.magical_NoA`.
  - A character has `melee_attack` if it has either `d.melee_attack` or `d.melee_NoA`.

- **Attack type**
  - `d.ranged_attack` and `d.ranged_NoA` = `attack_type = ranged`
  - `d.magical_attack` and `d.magical_NoA` = `attack_type = magical`
  - `d.melee_attack` and `d.melee_NoA` = `attack_type = melee`
 
- **Attack type and relation**

|Attack type  | Damage type |number of attacks type |Defense type|
|-----|-----------|-----------|------|
| `ranged` | `d.ranged_attack` | `d.ranged_NoA` | `d.physical_defense` |
| `magical` | `d.magical_attack` | `d.magical_NoA` | `d.magical_defense` |
| `melee` | `d.melee_attack` | `d.melee_NoA` | `d.physical_defense` |
  
#### 6.1.1 Phase resolution

##### 6.1.1.1 START phase
If floor.`terrain.*`:
  - actor = terrain ([地形]),
  - text = terrain.description (Japanese)
  - Example: "[地形] 活性化 (各部屋の終了時、減少HPの2%を回復する)"
    - "()" part is gray text.

If `a.*` with phase = START:
- Note: actor = effect ([効] ), "()" part is gray text.
 
**Priority order of Timed ability resolution**
**Deity effects**
- If `Goddess of Discord` and (terrain is not `terrain.gehenna`):
  - Add `c.antagonism` to random party.
  - Exception: If candidate has `a.null-antagonism`:
    - Do not apply `c.antagonism`.
    - Log: `log.null-antagonism` + "(敵対無効化)"

- If `God of Resonance` and (terrain is not `terrain.gehenna`):
  - Upgrade `a.resonance` ability level by N.

**Terrain Effects**
- `terrain.deletion`
  - Randomly select 1 target.
  - Randomly select 1 valid ability from that target.
  - The selected ability is disabled for the rest of the battle.
   - Log: `log.terrain.deletion`
  - Exception: If the opponent has `a.unforgettable`, do not disable any ability.
    - Log: `log.unforgettable` + "(忘却無効)"

- `terrain.transcendence`
  - Increase the level of all reactive and timed abilities by +1.
  - Cap at 5.
  - Refer to: 1.1.1 @Specification_1.1_CONSTANTS_GLOSSARY.md.

- `terrain.suppression`
  - Applies only to targets that do not have `a.defiance`.
  - Decrease the level of all reactive and timed abilities by -1.
  - Floor at 1.
  - Refer to: 1.1.1 @Specification_1.1_CONSTANTS_GLOSSARY.md.

- `terrain.silence-field`
  - Skip all subsequent `actor abilities` part.
  - Exception: actor who has `a.equation-breaker`.

**Actor abilities**

- actor.`a.oblivion`
  - Randomly select 1 opponent.
  - Randomly select 1 valid ability from that opponent.
  - The selected ability is disabled for the rest of the battle.
  - Exception: If the opponent has `a.unforgettable`, do not disable any ability.
    - Log: `log.unforgettable` + "(忘却無効)"

- actor.`a.fading_memory`
  - Randomly select 1 target from all living combatants, including allies, opponents, and the actor himself.
  - Randomly select 1 valid ability from that target.
  - The selected ability is disabled for the rest of the battle.
  - Exception: If the opponent has `a.unforgettable`, do not disable any ability.
    - Log: `log.unforgettable` + "(忘却無効)"


- actor.`a.mimic`
  - Randomly select 1 opponent.
  - Randomly select 1 valid ability from that opponent (excluding `a.mimic`, `a.oblivion`, and `a.fading_memory`).
  - Actor gains the selected ability for the rest of the battle.

- actor.`a.magic-seal`
  - Log: "name の魔封！ (この場で最初に唱える魔法は無効化される)"
  - Sets `a.magic-seal` enable.

- Other abilities with `[効]`
  - If actor.`a.domain-breaker`,
    - Log: "name はNの影響を受けない"  N: name of domain (ex. "静寂領域" )


- actor.`a.command`
	- party.`f.party.offense_amplifier`(attack_type: attack_type):
	  - If (`attack_type = ranged` or `attack_type = melee`):
	    - If front_row_from_actor_member_has.`a.command`3: multiply x2.43
		- If front_row_from_actor_member_has.`a.command`2: multiply x1.35
	    - If front_row_from_actor_member_has.`a.command`1: multiply x1.2

- actor.`a.defender` or `a.m-barrier`
	- party.`f.abilities_defense_amplifier`(attack_type: attack_type):
	  - If (`attack_type = ranged` or `attack_type = melee`):
	  	- If front_row_from_actor_member_has.`a.defender`3: multiply x1/2
	  	- If front_row_from_actor_member_has.`a.defender`2: multiply x3/5
		- If front_row_from_actor_member_has.`a.defender`1: multiply x2/3

- actor.`a.m-barrier`
	- party.`f.abilities_defense_amplifier`(attack_type: attack_type):
    - If `attack_type = magical`:
	    - If front_row_from_actor_member_has.`a.m-barrier`3: multiply x1/2
	    - If front_row_from_actor_member_has.`a.m-barrier`2: multiply x3/5
	    - If front_row_from_actor_member_has.`a.m-barrier`1: multiply x2/3
     - Exception: If opponent has `a.m-barrier-breaker`, ignore this effect
       Log: "opponentは魔法障壁を打ち破り無効化した(魔法障壁破り)" instead of m-barrier log.

- Tie-breaker: Enemy > Front-row party member > Back-row party member


##### 6.1.1.2 Combat phase

**Speed & Turn Order (Rolling Dice Rule)**
- At the start of the COMBAT phase, create all eligible normal-action entries.
- An actor creates one normal-action entry for each attack capability it possesses.
- At the start of the `COMBAT` phase, determine one initiative value for every eligible normal action. Each action uses the base roll corresponding to its `attack_type`. Resolve all timed abilities and normal actions from timing 49 down to timing 0.
- After an action entry is resolved or skipped, mark that action entry as acted.
- An actor is considered to have acted in the battle after at least one of its normal-action entries has been resolved or skipped.

- **Base-roll** determined by attack type.
  - `ranged_attack`, `base-roll` is 5d3. (5-15)
  - `magical_attack`, `base-roll` is  3d3. (3-9)
  - `melee_attack`, `base-roll` is  1d3. (1-3)
- **Initiative roll**
  - Cap at 49. 
  - If actor has `a.first-strike`:
      - If terrain = `terrain.machine-logic` and actor does not have `a.equation-breaker` : roll **`base-roll`**
      - Else if terrain = `terrain.ash-haze` and actor does not have `a.true-sight`: roll **`base-roll`**
      - Else if `a.first-strike`3: Roll **`base-roll` +3d3**
      - Else if `a.first-strike`2: Roll **`base-roll` +2d3**
      - Else if `a.first-strike`1: Roll **`base-roll` +1d3**
      - Otherwise: roll **`base-roll`**

- **Modifications**
  - If party.`Goddess of Fertility` and terrain not in {`terrain.machine-logic`, `terrain.gehenna` }: +1
  - If actor.`a.slow`N and terrain != `terrain.machine-logic`: −N (minimum 1)
  - If actor.`a.boost`N and terrain != `terrain.machine-logic`: +N
  - If opponent.`a.frostbite`1 and (actor doesn't have `a.coldproof`) and terrain != `terrain.machine-logic`: -1 (minimum 1)

  - **Terrain effects**
    - If `terrain.tailwind` and (actor doesn't has `a.wind-rider`) and (actor is a party member): +**1d3**,
    - If `terrain.enemy-high-ground` and actor is an enemy: +**1d3**,

- Actions are resolved in descending order of roll result.
- **Tie-breaker action order**
  - Resolve in the following order:
    1. Triggered abilities
    2. Enemy moves
    3. Front-row party member moves
    4. Back-row party member moves
   
**Order by priority**
- The single COMBAT phase is resolved from timing 49 down to timing 0. (0 might be used for `Trigger`)
- At each timing:
  1. Resolve triggered abilities
  2. Resolve enemy actions
  3. Party member actions, ordered by attack type: ranged → magical → melee.
  4. Within the same attack type, resolve party members from Front Row to Back Row.

| Battle-log phase label | timing | action order | Display format |
|--|--:|--|--|
| START | 9 | Trigger | [効] |
| START | 8 | Trigger | [効] |
| ... | ... | ... | ... |
| START | 0 | Trigger | [効] |
| COMBAT | 49 | Trigger | [49] |
| COMBAT | 49 | Enemy | [49] |
| COMBAT | 49 | Party member (Front-row → Back-row) | [49] |
| COMBAT | 48 | Trigger | [48] |
| COMBAT | 48 | Enemy | [48] |
| COMBAT | 48 | Party member (Front-row → Back-row) | [48] |
| ... | ... | ... | ... |
| COMBAT | 1 | Trigger | [1] |
| COMBAT | 1 | Enemy | [1] |
| COMBAT | 1 | Party member (Front-row → Back-row) | [1] |
| COMBAT | 0 | Trigger | [0] |
| END | 9 | Trigger |  [末] |
| END | 8 | Trigger | [末] |
| ... | ... | ... | ... |
| END | 0 | Trigger |  [末] |

##### 6.1.1.3 END phase
- Note: actor = effect ([末] ), "()" part is gray text.
- If `Goddess of Restoration` and (terrain is not `terrain.gehenna`):
  - "再生の女神の祝福！ (HP回復+585)"
- If `God of Attrition` and (terrain is not `terrain.gehenna`):
  - "消耗の神への代償！ (HP消耗-1,234)"
- `c.unlock`, reward log
- Item got:
  - "制御ロッド を獲得した！ (自動売却対象: 9G)"
- Item got with `c.unlock`:
  - "イタチの解錠 石板の盾 を獲得した！(自動売却対象: 10G)"

#### 6.1.2 Timed Abilities
- For each actor:
  - Activate each ability whose timing matches the current timing, provided all other activation conditions are satisfied.
- Resolve activation order using tie-breaker:
  - Enemy > Front-row party member > Back-row party member
- Activate abilities in the above order.
- Log format:
  - actor: `triggered`  note: not `effect`
  - "[2] name が遠吠えをした！ (相手の次の攻撃回数5/7)"
    - Text `()` part is displayed in gray.
    - "2" is triggered ability timing.

- **confusion**
  - Triggered by `a.*-confusion`
  - Randomly select 1 eligible opponent.
  - Apply `c.antagonism` to the selected target.
    - Exception: If candidate has `a.null-antagonism`:
      - Do not apply `c.antagonism`.
      - Log: `log.null-antagonism` + "(敵対無効化)"

  - Eligible target
    - Target has a normal-action entry whose `attack_type` matches the confusion ability (`ranged`, `magical`, or `melee`) and that entry has **not yet been resolved or skipped in the COMBAT phase**.
  - On activation, roll N/D to apply confusion to a random eligible target.
  - Log:  `log.confusion`
 
- **Unstable core**
  - Triggered by `a.unstable-core`
  - actor.`d.HP` -= (N x 0.01) x actor.remaining_HP / actor.max_HP
  - Log: `log.unstable-core` + "(残HP N%の自傷ダメージ)"  Gray text
  - Damage: (XXX)  Left-Aligned, Sub color for damage part

- **Soul reap**
  - Triggered by `a.soul-reap`
  - If opponent.`d.HP` < (N x 0.01) x opponent.max_HP, opponent.`d.HP` = 0.
  - Log: `log.soul-reap` + "(HP N％未満で即死)"

- **Predator sense**
  - Triggered by `a.predator-sense`
  - If opponent.`d.HP` < (N x 0.01) x opponent.max_HP, add actor `c.accuracy+0.040`.
  - Log: `log.predator-sense` + "(HP N%未満で命中+40)"
 
- **Regeneration**
  - Triggered by `a.regeneration`
  - actor.`d.HP` = min(actor.max_HP, actor.HP + (N x 0.01) x actor.damage_taken_in_this_battle)
  - Log: `log.regeneration`
    - Heal: (✚ XXX)  Left-Aligned, gray text

- **Decompose**
  - Triggered by `a.decompose`
  - Use `f.targeting` (`attack_type = melee`) for choosing target.
  - target.`d.defense` = N/D x target.`d.defense`
  - Log: `log.decompose` + "(target.name の 防御力 XXX → YYY)"   gray text

- **Self destruct**
  - Triggered by `a.self-destruct`
  - Use `f.targeting` (`attack_type = melee`) for choosing target.
  - opponent.`d.HP` -= N/D x ( actor.remaining_HP - opponent.`d.physical_defense` ) x opponent.`f.defense_amplifier`
  - actor.`d.HP` = 0.
  - Log: `log.self-destruct`

- **free**
  - Triggered by `a.free` and (opponent members don't have `a.pursuit`)
  - this battle is Draw.
  - Log: `log.free`
  - Triggered by `a.free` and opponent member has `a.pursuit`, 
  - this battle continues. 
  - Log: `log.pursuit`

- **Flying**
  - Triggered by `a.flying`
  - actor.evasion += N 
  - Log: `log.flying` + (飛行:回避+N)

 
#### 6.1.3 Actor normal move

##### 6.1.3.1 Actor action
- Check:
  - If (`attack_type = magical` and `a.magic-seal` is valid, and actor.`f.damage_calculation` > 0 ), Disable the actor's move. log "name がフロストニードルを唱えたがかき消された！". Then disable the `a.magic-seal`.
  - When an actor takes an action, if one or more opponents have active `a.howl`, clear `a.howl` on every opponent (not just a single target).
  - If opponent.`a.howl` is active: Apply actor.`f.NoA` × N, Then disable opponent.`a.howl`. log: "[2] name が遠吠えをした！ (相手の次の攻撃回数5/7)"
  - If actor.`incapacitated`:
    - just display log:`log.incapacitated` instead of normal move.
  - If actor.`a.no-offense`:
    - Skip the actor's normal action.
    - No action log is displayed.

- `f.NoA` times, get `f.targeting` -> opponent. 
	- If `f.hit_detection`(actor: , opponent: , Nth_hit: the current hit index), current party.
	- Check the following conditions in this order:
  	  01. If actor.`e.ice` and opponent.`a.ice-absorb`
	  02. If actor.`e.fire` and opponent.`a.fire-absorb`
	  03. If actor.`e.thunder` and opponent.`a.thunder-absorb`
	  04. If `attack_type = magical` and opponent.`a.magical-absorb`         
	  05. If actor.`e.ice` and opponent.`a.ice-null`
	  06. If actor.`e.fire` and opponent.`a.fire-null`
	  07. If actor.`e.thunder` and opponent.`a.thunder-null`
	  08. If `attack_type = ranged` and opponent.`a.ranged-null`
	  09. If `attack_type = magical` and opponent.`a.magical-null`
      10. If `attack_type = melee` and opponent.`a.melee-null`
      11. If actor.`e.ice` and opponent.`a.ice-reflect`
	  12. If actor.`e.fire` and opponent.`a.fire-reflect`
	  13. If actor.`e.thunder` and opponent.`a.thunder-reflect`
	  14. If `attack_type = ranged` and opponent.`a.ranged-reflect`
	  15. If `attack_type = magical` and opponent.`a.magical-reflect`
      16. If `attack_type = melee` and opponent.`a.melee-reflect`
	  - If multiple conditions are true at the same time, resolve only the first matched condition in the order above.
  - **interrupt**
  - Shock resolve
    - If opponent.`a.shock` is enable:
      - If successful hits > 1, set successful hits = 1.
      - Disable opponent.`a.shock`.
      - Log: `log.shock` + (感電:攻撃中断)
      - Exception: If actor has `a.null-shock`, Do not apply shock effect, but diable opponent.`a.shock`.
        Log: `log.null-shock` + (感電予防:攻撃継続)
    
	- **intercept**
	- Reflect resolve
	  - Reflect damage: actor.`d.HP` -= `f.damage_calculation` x reflect damage amplifier x actor.f.defense_amplifier x actor.f.elemental_resistance_attribute.
	  - Dealt damage: opponent.`d.HP` -= `f.damage_calculation` x ( 1 - reflect damage amplifier).
	  - log "ロップ の氷属性攻撃は反射された！　(2/4回)  (❄️ {Dealt damage}, 反射 {Reflect damage})" or
	  - log "セルヴァ がフロストニードルを唱えたが反射された！　(3/3回, 共鳴+33%)  (❄️ {Dealt damage}, 反射 {Reflect damage})"
      - **Exception**
        - Skip Reflect resolution if any of the following is true:
	      - actor has `a.fire-protect-breaker` and opponent has `a.fire-reflect`
	      - actor has `a.ice-protect-breaker` and opponent has `a.ice-reflect`
	      - actor has `a.thunder-protect-breaker` and opponent has `a.thunder-reflect`
	      - actor has `a.m-barrier-breaker` and opponent has `a.magical-reflect`

	- Absorb resolve
	  - Absorbed damage: opponent.`d.HP` += `f.damage_calculation` x absorb damage amplifier.
	  - log "ロップ の氷属性攻撃は吸収された！　(2/4回)  (❄️ 吸収 {Absorbed damage})" or
      - log "ラス がサンダーボルトを唱えたが吸収された！(11/43回) (❄️ 吸収 {Absorbed damage})"
        - IF opponent is enemy, "(❄️ 吸収 {Absorbed damage})" part is accent color. If opponent is party member, it is sub color.
      - **Exception**
        - Skip Absorb resolution if any of the following is true:
	      - actor has `a.fire-protect-breaker` and opponent has `a.fire-absorb`
	      - actor has `a.ice-protect-breaker` and opponent has `a.ice-absorb`
	      - actor has `a.thunder-protect-breaker` and opponent has `a.thunder-absorb`
	      - actor has `a.m-barrier-breaker` and opponent has `a.magical-absorb`

	- Null resolve
	  - log "ロップ の氷属性攻撃は無効化された！　(2/4回)  (❄️ 0)" 
   - Else `d.HP` -= `f.damage_calculation` (actor: enemy , opponent: character, attack_type: attack_type)

	- **self-inflicted damage**
      - If `terrain.vine-snare` and (actor doesn't have `a.vine-cutter`): actor.`d.HP` -= 0.01 x actor.current_HP
        - Log: `log.terrain.vine-snare` + (N) :right-aligned 
      - If `terrain.crystal-zone` and (`attack_type = magical`) and (actor doesn't have `a.mana-ward`): actor.`d.HP` -= 0.05 x actor.total_damage
        - Log: `log.terrain.crystal-zone` + (N) :right-aligned 
      - If `terrain.conduction` and actor.`e.thunder`:  actor.`d.HP` -= (0.05 x actor.total_damage ) of `e.thunder`
        - Log: `log.terrain.conduction` + (⚡ N)  :right-aligned 
      - If `terrain.mana-burn` and (`attack_type = magical`) and (actor doesn't have `a.mana-ward`): actor.`d.HP` -= 0.02 x actor.max_HP
        - Log: `log.terrain.mana-burn` + (N) :right-aligned 
      - If `terrain.sacred-judgement` and is first actor of the battle:  actor.`d.HP` -= (0.05 x (ctor.current_HP) of `e.thunder`
        - Log: `log.terrain.sacred-judgement` + (N) :right-aligned


**on-defeat**
- If current opponent.`d.HP` =< 0, if opponent.`a.resurrect`:
  - Lv1: heal = 1
  - Lv2: heal = 1% of (opponent.max_HP)
  - opponent.`d.HP` = heal
  - Disable `a.resurrect`
  - log `log.resurrect` + (再起 ✚ heal)
- If current opponent .`d.HP` =< 0 and opponent.`a.reanimate`:
  - heal = opponent.max_HP x (N / 100)
  - opponent.`d.HP` = heal
  - Disable `a.reanimate`.
  - log `log.reanimate` + (即時蘇生 ✚ heal)
- Else: opponent is defeated. 

**opponent-reactive**
- If (`attack_type = ranged`) and (opponent.`a.illusion`1) and (the `a.illusion` is enable) and (actor doesn't have `a.illusion-breaker`), treats all incoming attack as miss hits, disable the `a.illusion` for this battle. Log: `log.illusion‘
- If (`attack_type = ranged`) and (opponent.party.character.`a.illusion`2) and (the `a.illusion` is enable) and (actor doesn't have `a.illusion-breaker`), treats all incoming attack as miss hits, disable the `a.illusion` for this battle. Log: `log.illusion‘.
- If (`attack_type = ranged`) and (opponent.`a.illusion`) and (the `a.illusion` is enable) and (actor has `a.illusion-breaker`), disable the `a.illusion` for this battle. Log: `log.illusion-breaker`

##### 6.1.3.2 Reactive ability
- Priority: On-strike > Counter > Ally-follow-up

**On-strike**
  - If actor.`a.re-attack`: (using f.hit_detection, f.damage_calculation)
   	- `a.re-attack`: One attack and actor.`f.NoA` x N, round up

  - If actor.`a.corrode`:
    - If total successful melee hits >= 3:
      - Apply: target.`f.offense_amplifier` *= N
      - Log: `log.corrode` + "(腐食:相手の攻撃倍率がN倍)"
      - Exception: If actor has `a.null-corrode`, do not apply corrode.
        - Log: `log.null-corrode` + (防腐)

  - If actor.`a.life-drain`:
       - Heal actor:
       - heal += dealt_damage × N
       - Log: `log.life-drain` + "(吸血: 与ダメージのN倍回復: ✚heal)"
      - Exception: If actor has `a.null-life-drain`, do not apply life-drain.
        - Log: `log.null-life-drain` + (吸血無効)

  - If actor.`a.death-touch`:
    - Roll death check:
      - death_probability = opponent.(total successful hit) x N
      - If success → target is instantly defeated.
      - Log: `log.death-touch` + "(接死:有効 death_probabilityの確率で即死)"
      - Exception: If actor has `a.null-death-touch`, do not apply death-touch.
        - Log: `log.null-death-touch` + (即死無効)

  - If opponent.`a.burn`:
    - actor.`d.HP` -= actor.max_hp x actor.hit_count × (N / 100) x actor.`r.fire`
    - Log: `log.burn` + "(火傷)"           "(🔥 XXX)" (left-aligned, same as damage log)
    - Exception: If actor has `a.null-burn`, do not apply burn.
    　　- Log: `log.null-burn` + (火傷無効)
    
  - If actor.`a.bind`:
    - Roll bind check:
       - If success → apply `incapacitated` status.
    - Log: `log.bind` + "(拘束:行動不能)"
    - Exception: If actor has `a.bind`, do not apply `incapacitated` status.
    　　- Log: `log.null-bind` + (拘束無効)
      
  - If actor.`a.requiem` and (opponent.`a.reanimate` has used) and actor hit at least once to the opponent:
    - Set opponent HP to 0. 
    - Log: `log.requiem` + "(鎮魂歌)"
    - Exception: If actor has `a.requiem`, do not apply requiem.
    　　- Log: `log.null-requiem` + (鎮魂無効)

**Counter**
- If opponent.`a.counter` 
  - `f.counter`(actor:actor , opponent:opponent ,attack_type: )
- If opponent.`a.magical-counter` and (`attack_type = magical`), `f.magical-counter`(actor:opponent, opponent:actor ,attack_type: )
- **counter-chain**
  - If opponent.`a.re-counter`, `f.re-counter`(actor:opponent , opponent:actor ,attack_type: )


**Ally-follow-up**
- If actor.`a.covering-fire` and the actor's successful hit is only one and (`attack_type = melee`), `f.covering-fire`(actor:covering fire actor.party.character , opponent:opponent)
  - *Note:*  Nth_hit is per action based (not per-target)

- If actor.`e.thunder` and (terrain is `terrain.chain-lightning`):
  - Target:
    - Party member → Enemy: Enemy
    - Enemy → Party member: Onother party member
  - target.`d.HP` -= 0.30 x actor.total_damage of `e.thunder`
  - Log: `log.terrain.chain-lightning` + (⚡ N) :right-aligned


#### 6.1.4 Function of battle

##### 6.1.4.1 Function of attack

**functions of NoA**
- `f.NoA`
  - `f.NoA` = `f.NoA` x `f.terrain_NoA_amplifier`
    - If actor has `a.output-stabilizer`: 1.0
    - Else if `terrain.rough-waves` and (`attack_type = melee`): 0.75
    - Else if `terrain.heavy-wind` and (actor doesn't has `a.wind-rider`) and (`attack_type = ranged`): 0.75
    - Else if `terrain.heavy-wind` and (actor **has** `a.wind-rider`) and (`attack_type = ranged`): 0.50
    - Else if `terrain.burrow` and (`attack_type = ranged`): 0.50
    - Else if `terrain.low-gravity`: 1.3
    - Else if `terrain.gravity`: 0.7
    - Else if `terrain.limestone-cave` and (`attack_type = magical` or `attack_type = melee`): 1.5

**functions of attack**
- `f.resonance_amplifier`(actor: ,successful hit: n )
  - If (`attack_type = magical`) or (`attack_type = ranged` and party.`God of Resonance` and (terrain is not `terrain.gehenna`)),
  	- If actor.`a.resonance`1, return 1.0 + (0.05 x (n - 1))   
  	- If actor.`a.resonance`2, return 1.0 + (0.08 x (n - 1))
  	- If actor.`a.resonance`3, return 1.0 + (0.11 x (n - 1))
  	- If actor.`a.resonance`4, return 1.0 + (0.13 x (n - 1))
  	- If actor.`a.resonance`5, return 1.0 + (0.15 x (n - 1))
    Else, return 1.0.

- `f.damage_calculation`: (actor: , opponent: , attack_type: )
  - max(1, (actor.`f.attack` - opponent.`f.defense` x (1 - actor.`f.penet_multiplier`) )
  - x actor.`f.offense_amplifier`
  - x actor.`f.elemental_offense_attribute`
  - x opponent.`f.elemental_resistance_attribute`
  - x opponent.`f.defense_amplifier`
  - x party.`f.party.offense_amplifier`
  - x `f.resonance_amplifier`
  - x `f.rage_amplifier`
  - x `f.momentum_amplifier`
  - x `f.ambush_amplifier`
  - x `f.overwatch_amplifier`
  - x `f.execution_amplifier`
  - x `f.mutual_amplifier`
  - x opponent.`f.swarm.amplifier`
  - x actor.`f.swarm.amplifier`
  - x `f.terrain_amplifier`
  - x `f.elemental_offense_attribute_amplifier`
  - )
 
  - **Override**
  - If `terrain.floor-domain`: final `f.damage_calculation` = max(1% of opponent.max_HP, `f.damage_calculation`)
    - Exception: If actor has `a.domain-breaker`, this effect is ignored.
  - If `terrain.cap-domain` :final `f.damage_calculation` = min(5% of opponent.max_HP, `f.damage_calculation`)
    - Exception: If actor has `a.domain-breaker`, this effect is ignored.

- `f.rage_amplifier`:
  - If actor has `a.rage`1 and (opponent doesn't have `a.rage-breaker`), return min(2.0, 1.0 + 0.5 x (1 - (actor.current_HP / actor.max_HP)))
  - If actor has `a.rage`2 and (opponent doesn't have `a.rage-breaker`), return min(2.0, 1.0 + 0.6 x (1 - (actor.current_HP / actor.max_HP)))
    - Log: add "闘志+N%" to attack log.
- `f.momentum_amplifier`:
  - If actor has `a.momentum`1 and (opponent doesn't have `a.momentum-breaker`), return 1.25 - (1 - (actor.current_HP / actor.max_HP)) x 0.5
  - If actor has `a.momentum`2 and (opponent doesn't have `a.momentum-breaker`), return 1.25 - (1 - (actor.current_HP / actor.max_HP)) x 0.4
    - Log: add "気勢+N%" to attack log
- `f.ambush_amplifier`
  - If actor has `a.ambush`, and (opponent has not acted yet in this battle) and (opponent doesn't have `a.anti-ambush`), return N.
  - Otherwise, return x1.0.
  - Log: add "待ち伏せ:xN" to the attack log.
- `f.overwatch_amplifier`
  - If actor has `a.overwatch`, and (opponent and other party members have not acted yet in this battle) and (opponent doesn't have `a.anti-overwatch`), return N.
  - Otherwise, return x1.0.
  - Log: add "監視:xN" to the attack log.
- `f.execution_amplifier`
  - If actor has `a.execution`, and (opponent.current_HP / opponent.max_HP x 100 <= N) and (opponent doesn't have `a.execution-null`), return M.
  - Otherwise, return x1.0.
  - Log: add "エクセキューション:xM" to the attack log.
    
- `f.swarm.amplifier`:
	- N = 1.0
	- If actor has `a.swarm`, N *=  1 - (1 - (actor.current_HP / actor.max_HP)) x 0.5
	- If opponent has `a.swarm`, N *=  1 +  (1 - (opponent.current_HP / opponent.max_HP)) x 0.5
	- return N

	- Log: add "群れ-N%" to attack log like:
	  - "[2] 敵の攻撃！(1/2回, 威力-N%)"  (actor.`a.swarm`)
	  - "[3] カスミ の攻撃！(6/16回, 相手被ダメN%増) "  (opponent.`a.swarm`)

- `f.terrain_amplifier`
  - If `terrain.exposure` and (`attack_type = ranged` or `attack_type = melee`): 1.3
  - If `terrain.dark-field` and (`attack_type = ranged` or `attack_type = melee`): 1.45
  - If `terrain.frenzy`: 1.25
  - If `terrain.light-field` and (`attack_type = magical`): 1.45
  - If `terrain.sanctuary` and (`attack_type = magical`): 0.67
  - If `terrain.fortified` and (actor does't have `a.siege`) and (opponent is enemy): 0.75

-  `f.elemental_offense_attribute_amplifier`
  - If `terrain.thunderstorm` and actor.`e.thunder`: x 3/2
  - If `terrain.dry` and actor.`e.ice` and (actor doesn't have `a.dryproof`): x 0.5
  - If `terrain.echo-domain` and actor.`e.X`: 1.0 + 0.1 x (1 - (number of X in this battle from both side))
    - Exception: If actor has `a.domain-breaker`, this effect is not applied. 
    - If result is > 1.0, 
	  - log: add "残響+N%" to attack log like:
      - "[6] ラス がサンダーボルトを唱えた！(8/43回, 共鳴+40%, 残響+20%)"

- note: If actor: enemy, party.`f.party.offense_amplifier` = 1.0
- `f.mutual_amplifier`:
	- If (`attack_type = magical` and (actor or opponent) has `a.mutual-magic-amplify`), return n
	- If (`attack_type = magical` and (actor or opponent) has `a.mutual-magic-restraint`), return n
	- If (`attack_type = ranged` or `attack_type = melee`) and (actor or opponent) has `a.mutual-physical-amplify`, return n
	- If (`attack_type = ranged` or `attack_type = melee`) and (actor or opponent) has `a.mutual-physical-restraint`, return n
	
	- If opponent.`a.stealth`1 and (opponent.current_HP / opponent.max_HP) <= 0.24 and (actor doesn't have `a.glamour-breaker`), damage is set to 0. Log:"name は物陰に隠れて攻撃をやり過ごせたのだ！"
	- If opponent.`a.stealth`2 and (opponent.current_HP / opponent.max_HP) <= 0.29 and (actor doesn't have `a.glamour-breaker`), damage is set to 0. Log:"name は物陰に隠れて攻撃をやり過ごせたのだ！"
	- note: This is only for party member ability. enemy have this `a.stealth` ability, then Log:"enemy は神隠れした。もう攻撃はこれ以上あたらない！"

##### 6.1.4.2 Function of targeting

**Row-based modifier** 
- Targeting selects a character only to determine defense, row potency, abilities (counter). All damage resolved against a character is applied to `d.HP`.
  - The threat weight table defines how many tickets of each row index are placed into `t.threat_weight_bag`.

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

- `t.physical_threat_weight_bag` and `t.magical_threat_weight_bag`  Threat Weight (Passive Targeting) 
  - A numerical value assigned to a unit based on their row position that determines the size of their "slice" in the enemy's targeting pool.

**Targeting**
- `f.targeting`:
  - If actor.`c.antagonism`, target is opposite. (character -> character. enemy -> enemy)
  - If`attack_type = ranged` or `attack_type = melee`, Gets one ticket from `t.physical_threat_weight_bag`.
    - `a.bulwark`1 or `a.bulwark`2 redirect 
	  if {(`a.bulwark`1 and `attack_type = ranged`) or (`a.bulwark`2 and (`attack_type = ranged` or `attack_type = melee`))} and (enemy doesn't have `a.bulwark-breaker`):
	      front_character = party.unit_in_front_of(t)    // the unit directly ahead of selected character (one row closer to enemy)
	      if front_character != null and front_character.has(a.bulwark):
	          return front_character
  - If `attack_type = magical`, Gets one ticket from `t.magical_threat_weight_bag`. 
    - Bag contains numbers [1,2,3,4,5,6]
    - The drawn number corresponds to row index (1–6).
    - The character currently occupying that row is selected as the target.

- `d.accuracy_potency` 
  - A global accuracy modifier applied to a unit’s hit chance based on their current row position.
  - Row-based modifiers apply only to player characters. Enemies are treated as having fixed potency (1.0).
  - Row-based `d.accuracy_potency` is applied only (`attack_type = ranged` or `attack_type = melee`).
  - `attack_type = magical` ignores row-based accuracy potency, so has fixed potency (1.0).

- **`d.accuracy_potency`**
  - If character.`a.composure`1, min(1, `d.accuracy_potency` + 0.10)
  - If character.`a.composure`2, min(1, `d.accuracy_potency` + 0.13)

|row | normal | `a.hunter`1 | `a.hunter`2 | `a.hunter`3 |
|---|---|---|---|---|
|1| 1.00 | 1.00 | 1.00 | 1.00 |
|2| 0.85 | 0.90 | 0.93 | 0.95 |
|3| 0.72 | 0.81 | 0.86 | 0.90 |
|4| 0.61 | 0.73 | 0.80 | 0.86 |
|5| 0.52 | 0.66 | 0.75 | 0.81 |
|6| 0.44 | 0.59 | 0.70 | 0.77 |

**Hit Detection**
- `f.hit_detection`(actor: , opponent: ,Nth_hit: )
  - **Ability**
    - Applies to all attack type  (`attack_type = ranged` and `attack_type = magical` and `attack_type = melee`).
    - If actor.`a.focus`1, actor.`f.c_accuracy+v` =  actor.`c.accuracy+v` x 1.2 (rounding up to the 3rd decimal ex. 0.003 x 1.2 = 0.0036 → 0.004)
    - If actor.`a.focus`2, actor.`f.c_accuracy+v` =  actor.`c.accuracy+v` x 1.3 (rounding up to the 3rd decimal)
  - **Terrain effect**
    - If `terrain.fog` and (actor does not have `a.true-sight`) and (`attack_type = ranged`): actor.`f.c_accuracy+v` -= 25
    - If `terrain.sunny-beach` and (`attack_type = ranged`): actor.`f.c_accuracy+v` += 20
  - decay_of_accuracy: clamp(0.86, 0.90 + actor.`f.c_accuracy+v` - opponent.`c.evasion+v`, 0.98)
  - baseChance = actor.d.accuracy_potency
  - If opponent has `a.deflection`2 AND `attack_type = ranged`: baseChance -= 0.15. Else if opponent has `a.deflection`1 AND `attack_type = ranged`: baseChance -= 0.10
  - chance = clamp(0.0, baseChance, 1.0) x (decay ^ (Nth_hit - 1))
    - Note: Nth_hit starts at 1 for the first strike.
    - Note: Nth_hit counts individually and not share with normal attack, re-attack and counter. (Nth_hit is reset per attack sequence)
  - **Override of terrain effect**
    - If {`terrain.sniper-domain` and (`attack_type = ranged`)} or {`terrain.spell-domain` and (`attack_type = magical`)} or {`terrain.duelist-domain` and (`attack_type = melee`)}: All hits are treated as successful.
      - Exception: If actor has `a.domain-breaker`, these effects are ignored.
    - If override condition is met: return true (skip calculation below)
  - Roll: Return Random(0, 1.0) <= chance

  - **Override of ability effect**
    - If actor.`a.arcane-stability`: max(N /100 , calculated chance)

##### 6.1.4.3 Function of Reactive ability

- **`f.counter`(actor: , opponent: ,attack_type: ) :** IF (opponent or party members have not available `a.null-counter`) and (actor.`a.counter`, `attack_type = ranged` or `attack_type = melee`) , the actor attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`)
  - Attack resolution:
    - If `attack_type = ranged` : Execute a ranged attack.
    - If `attack_type = melee` : Execute a melee attack.
  - Failure condition:
    - If actor does not have a valid attack capability for that `attack_type`, the counteraction is skipped.
  - Calculation:
	- `a.counter`1: actor.`f.NoA` x 0.5, round up
    - `a.counter`2: actor.`f.NoA` x 1.0, round up
    - `a.counter`3: actor.`f.NoA` x 1.5, round up
    - Counter triggers immediately after damage resolution, regardless of turn order modifiers.
    - IF actor.`a.counter` and (opponent or opponent.party.character have available `a.null-counter`), displays log like : “巡礼者ブラザの反撃無効化により、二枚爪の黒豹のカウンターは防がれた！”. Reduce null-counter counter. (note: `a.null-counter`1 can disable once in battle,  `a.null-counter`2 can disable twice in battle, `a.null-counter`3 can disable three times in battle. if the null-counter is 0, the `a.null-counter` is disable in this battle. )
    - *note:* if opponent is character, then check party.`a.null-counter`. if at least one party member has available `a.null-counter`, nagete the counter attack.

- **`f.re-counter`(actor: , opponent: ,attack_type: ) :** IF actor.`a.re-counter` and (opponent or opponent.party.character have not `a.null-counter`), the actor attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`)
  	- `a.re-counter`1:   actor.`f.NoA` x 0.5, round up
  	- `a.re-counter`2:   actor.`f.NoA` x 1.0
    - Re Counter triggers immediately after damage resolution, regardless of turn order modifiers.

- **`f.covering-fire`(actor: , opponent: ) :** IF actor.`a.covering-fire` and actor can ranged attack, the actor ranged attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`)
  	- `a.covering-fire`1:   actor.`f.NoA` x 0.5, round up
  	- `a.covering-fire`2:   actor.`f.NoA` x 1.0
    - covering fire triggers immediately after damage resolution, regardless of turn order modifiers.

- **`f.magical-counter`(actor: , opponent: ,attack_type: ) :** IF actor.`a.magical-counter` and actor can magical attack, the actor magic attacks to opponent. (using `f.hit_detection` and `f.damage_calculation`, and actor.`f.NoA` x 0.5, round up)
  	- `a.magical-counter`1:   actor.`f.NoA` x 0.5, round up
  	- `a.magical-counter`2:   actor.`f.NoA` x 1.0
    - Magical counter triggers immediately after damage resolution, regardless of turn order modifiers.

#### 6.1.5 Outcome 

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
  - Elite Rooms (`x.floor`:1-5, `x.room`:4)
    - If `God of Restoration` and (Terrain is not `terrain.rotwood`): **Heal 20% of missing HP**
      - Log: "再生の女神の祝福！" + "(HP回復+N)"
      - If `God of Restoration` and `log.terrain.rotwood`: Log: `log.terrain.rotwood` 
    - IF `God of Attrition`: **reduce 5% of remaining HP**
      - Log: "消耗の神への代償！" + "(HP消耗-N)"
  　- If party member has `a.first-aid`:　**Heal N% of the party member's `d.HP`** (not party.`d.HP`)
      - Log: `log.first-aid` + "(HP回復+N)"
  - Normal and Elite rooms
    - If `terrain.rejuvenation`: Heal 2% of **missing HP**
	  - Log: `log.terrain.rejuvenation` + "(HP回復+N)"
    - If `terrain.abundant`:  Heal 2% of **max_HP**
      - Log: `log.terrain.abundant`
    - If `terrain.decay`:  reduce 2% of **max_HP**
      - Log: `log.terrain.decay` + "(HP減少-N)"
    - If `terrain.leakage`: `e.thunder` 3% of **current HP** to random party member (his/her `r.thunder` is applied)).
      - Log: `log.terrain.leakage` + "(HP減少 ⚡-N)"
    - If `terrain.heatwave`: reduce 5% of **current HP**
      - Log: `log.terrain.heatwave` + "(HP減少-N)"
    - If the party.`d.HP` <= 30% of max HP, back to home with trophies.   -> `Wonded_Retreat`

  - Normal Rooms (`x.room`:1–2): Proceed to the next `x.room`.
  - Gate Rooms (`x.room`: 3 check): At the end of Room 3, the "Loot-Gate" check occurs. If passed, proceed to `x.room`:4 (Elite/Boss).
  - Elite Rooms (`x.floor`:1-5, `x.room`:4): Proceed to the next floor: `x.floor` +1 , `x.room`:1.
  - Final Boss Room (`x.floor`:6, `x.room`:4): Expedition Clear! Return Home with all trophies.


- *Draw*:no penalties (current version). no `d.experience` points nor item reward at this room. Back to home with trophies of previous rooms.

#### 6.1.6 REWARD 
- Ticket calculation:
  - Base: **2**
  - +1 if `c.unlock`
  - +1 if (terrain is not terrain.gehenna) and {Goddess of Discord}
  - +N from `Difficulty Offset` (Additional Item Chance Tickets)
  - +N from `a.auriferous`
	- `a.auriferous`
	  - N = floor(total hits received `enemyHitsReceived` / 10)
	  - Multi-hit attacks count as multiple hits
	  - Evaluated at END phase
      - Log: `log.auriferous` + (累計X回→ +N回抽選回数増加)

- For every item listed in the enemy's potential drop items,
  - Chance: 1
  - Note: M from `Difficulty Offset` and (God of Oblivion) (Additional Super Rare Chance Tickets)
  - If the item is common,
    - Draw tickets from `t.common_reward_bag` equal to the total ticket count.
	- If `t.reward_bag`.value = '1', then get one ticket from `t.common_enhancement_bag`.
    - If `t.enhancement_bag`.value >= 2, then get one + M ticket from `t.common_superRare_bag`.
  - If the item is uncommon,
    - Draw tickets from `t.uncommon_reward_bag` equal to the total ticket count.
    - If `t.uncommon_reward_bag`.value = '1', then get one ticket from `t.enhancement_bag`.
    - If `t.enhancement_bag`.value >= 1, then get one + M  ticket from `t.rare_superRare_bag`.
  - If the item is elite rare or boss rare,
    - Draw tickets from `t.rare_reward_bag`  equal to the total ticket count.
    - If `t.rare_reward_bag`.value = '1', then get one ticket from `t.enhancement_bag`.
    - If `t.enhancement_bag`.value >= 1, then get one + M  ticket from `t.rare_superRare_bag`.
  - If the item is mythic,
    - Draw tickets from `t.mythic_reward_bag` equal to the total ticket count.
    - If `t.rare_mythic_bag`.value = '1', then get one ticket from `t.enhancement_bag`.
    - If `t.enhancement_bag`.value >= 1, then get one + M ticket from `t.rare_superRare_bag`.

  - Combines them into one item.

```
 enhancement:0 -> ロングソード
 enhancement:1, superRare:0 -> 名工のロングソード,
 enhancement:3, superRare:1 -> 世界を征する宿ったロングソード)
```


#### 6.1.7 Logs
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
X: `p.enemy_name` (race, mainClass/subClass) | `p.outcome_of_room` |  ▼
獲得: `p.reward_from_room`.

note: If mainClass == subClass: (race, mainClass+M) : example: (合,侍M)

```

```
1F-2: キメラ斬撃個体(合,侍/君) 引分▼
獲得:伝説の火打ち石の触媒
(Column 1) 自HP 273 /1,000 [Party HP bar here: Rermaining HP(Blue)/healed HP (Green)  /Taken damage(Dark orange) / max_HP]
(Column 2) 敵HP 20 /320 [Enemy HP bar here: Rermaining HP(Blue) / max_HP]

- Background image:
  - Display on the right side of the pane.
  - Continue displaying the chibi image when the battle-log pane is expanded/open.
  - Load the image from: `/public/chibi/C_E_{enemy_ID}.png`
  - If the image file does not exist, do not display any image.

```

- `f.battle_logs`
  - icon: 
  - `elemental_offense_attribute` -> `e.fire`:🔥, `e.thunder`:⚡, `e.ice`:❄️
  - If there is no elemental attribute (`e.none`), `attack_type = ranged` :🏹, `attack_type = magical`:🪄 ,`attack_type = melee`:⚔

**Normal Attack Log — Additional Effects**
- Append effect bonuses inside the parentheses of the action log.
- Format:
  - "[{index}] {actor} が {action} を行った！({hit_count}, {effect_list})"
  - `{effect_list}` is a comma-separated list of active modifiers.
- Example:
  - "[3] 敵がアルカナアローを唱えた！(5/6回, 共鳴+12%, 闘志+8%)"

| effect | add format |
|--|--|
| `a.resonance` | 共鳴+N% |
| `a.rage` | 闘志+N% |
| `a.momentum` | 気勢+N% |
| `a.ambush` | 待ち伏せ+N% |
| `terrain.echo-domain` | 残響+N% |


- floor_name: the Japanese floor name defined in **Expedition Floor Concepts**.

```
floor_name 戦闘ログ:
left-alinged                                           right-aligned
[<roll result>] 敵が　対象　に行動名！(N/M回)    (icon 数値 in dark orange)
[<roll result>] 味方:行動主 の行動名！(N/M回)    (icon 数値　in Blue)

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
[効] name が opponent の abilityアビリティを模倣した！

(戦闘フェーズ)
[12] ロップ の攻撃！(1/2回)          (🏹 7)
[7] 敵がアルカナアローを唱えた！(5/6回, 共鳴+25%)
[-] ゴン に命中！(2/2回)            (🪄 16)
[-] セルヴァ に命中！(3/4回)         (🪄 16)
[5] セルヴァ がフロストニードルを唱えた！(3/3回, 共鳴+33%)     (❄️ 6)
[5] ロップ の氷属性攻撃は反射された！ (10/17回) (❄️ 8,832 →反射 2,944)
[2] ケモ の攻撃！(1/1回)             (⚔ 11)
[2] ゴン の攻撃！(1/1回)             (⚔ 71)
(space)
[末] 再生の神の効果！(HP回復+25)
[末] 消耗の神の効果！(HP消耗-10)
[末] イタチの解錠 石板の盾 を獲得した！(自動売却対象: 10G)
[末] 探索深度に到達した為帰還します
```

- note: [効] text always at the beginning of battle log 
- note: [末] text always at the end of battle log 
- **Item Retrieval Logic:**
  - Items are stacked by (superRare, enhancement, and base item) and has state
  - *State:`s.sold` Auto-Sell:* If a dropped item matches a rule with state:`s.sold`, it is sold immediately (not added to inventory, gain Gold)
  - *State:`s.owned` Existing Items:* If the item is already in the inventory, increment the item count
  - *State:(no record) New Items:* If no record for the item exists, the system generates the item and sets it to state:`s.owned`

**Chibi images for each character name**
- When a log entry contains a character name or an enemy name (including entries prefixed with 敵), display a chibi image immediately before the name.
  - For unique party member: Load the image from: `/public/chibi/C_Unique_{English_name}.png`
    - For `{English_name}`, refer to `@Specification_8.2_UI_PARTY.md` → `8.2.2 Party member details`.
    - Example: C_Unique_Finn.png
  - For party member: Load the image from: `/public/chibi/C_{party_ID}_{race}_{gender}.png`
    - Example: C_1_Felidian_Female.png
  - For enemy: Load the image from: `/public/chibi/C_E_{enemy_ID}.png`

- The chibi image should be rendered inline with the text.
- The image height should match the current font size of the log text.
- Preserve the image's aspect ratio when scaling.
- If the specified image file does not exist, omit the image and display only the text.

**Enemy image**
- If enemy.image_path exists, enable background image rendering
  - load the image from `public/enemy/E_<Enemy_ID>.png`. (Ex. enemy ID is 1051, then use `public/enemy/E_1051.png` )
  - If the corresponding .png file does not exist, do not render an image.
- Render the enemy image as a background image of the panel.
- Do not stretch; preserve original aspect ratio.
- Image size is fixed and does not scale with content.
- Responsive sizing:
  - The image width adapts smoothly to the viewport width.
  - If the page width is 500px or wider, set the image width to 120% of the panel width.
  - If the page width is 400px or narrower, set the image width to 170% of the panel width.
  - Between 400px and 500px, interpolate linearly between 170% → 120%.
- In dark mode: not invert the image.
- Apply mask above the image to ensure text readability.
- The image remains static relative to the panel (does not move with internal content changes).
