## 5. EXPEDITION 
- Persistence through an expedition:`d.HP`.
- auto-sell profit amp:
  - If party.character.`a.cunning`, multiplier x1.2.
  - If party.character.`a.cunning`, multiplier x1.3.

### 5.1 "Loot-Gate" progression system
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


### 5.2 Logs
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
